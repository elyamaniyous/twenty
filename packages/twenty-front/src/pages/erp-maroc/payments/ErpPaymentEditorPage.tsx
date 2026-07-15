import { ErpPageShell } from '@/erp-maroc/components/ErpPageShell';
import { useErpMarocContext } from '@/erp-maroc/context/useErpMarocContext';
import { ErpMarocError } from '@/erp-maroc/api/erpMarocError';
import type { ErpMarocRequiredMutationIntent } from '@/erp-maroc/api/erpMarocClient';
import { ErpPaymentEditorForm } from '@/erp-maroc/payments/ErpPaymentEditorForm';
import {
  buildSuggestedAllocations,
  isAllocationComplete,
} from '@/erp-maroc/payments/paymentAllocation';
import { getPaymentCommandPolicy } from '@/erp-maroc/payments/paymentCommandPolicy';
import {
  parsePaymentForm,
  type PaymentFormError,
  type PaymentFormValues,
} from '@/erp-maroc/payments/paymentFormSchema';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  erpEligibleInvoicePageSchema,
  erpPaymentSchema,
  type ErpEligibleInvoicePage,
  type ErpPayment,
} from 'twenty-shared/erp-maroc';

const isAmbiguousMutationError = (error: unknown) =>
  !(error instanceof ErpMarocError) ||
  error.statusCode === 409 ||
  error.statusCode === 408 ||
  error.statusCode >= 500;

const isSelectedInvoiceEligible = (
  invoiceId: string | undefined,
  eligiblePage: ErpEligibleInvoicePage,
) =>
  invoiceId === undefined ||
  eligiblePage.items.some((invoice) => invoice.id === invoiceId);

export const ErpPaymentEditorPage = () => {
  const { client, context } = useErpMarocContext();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [errors, setErrors] = useState<PaymentFormError[]>([]);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createMutationRetryIntent, setCreateMutationRetryIntent] =
    useState<ErpMarocRequiredMutationIntent<ErpPayment> | null>(null);
  const [allocationMutationRetryIntent, setAllocationMutationRetryIntent] =
    useState<ErpMarocRequiredMutationIntent<ErpPayment> | null>(null);
  const [eligiblePage, setEligiblePage] = useState<{
    invoiceId: string | undefined;
    page: ErpEligibleInvoicePage;
  } | null>(null);
  const [pendingPayment, setPendingPayment] = useState<Pick<
    ErpPayment,
    'id' | 'amountCents'
  > | null>(null);
  const invoiceId = searchParams.get('invoiceId') ?? undefined;
  const currentEligiblePage =
    eligiblePage !== null && eligiblePage.invoiceId === invoiceId
      ? eligiblePage.page
      : null;
  const eligibleLoadVersionRef = useRef(0);
  const paymentCommandPolicy =
    context === null
      ? null
      : getPaymentCommandPolicy({
          role: context.role,
          capabilities: context.capabilities,
          kind: 'RECEIPT',
          status: 'PENDING_ALLOCATION',
          isOwnPayment: true,
        });
  const canCreatePendingPayment = paymentCommandPolicy?.create === true;
  const canAllocatePendingPayment = paymentCommandPolicy?.allocate === true;

  const loadEligibleInvoices = useCallback(
    async (paymentId: string) => {
      let page = await client.request({
        method: 'GET',
        path: `/payments/${paymentId}/eligible-invoices`,
        schema: erpEligibleInvoicePageSchema,
      });
      const eligibleInvoices = [...page.items];
      const cursors = new Set<string>();

      while (page.nextCursor !== null) {
        if (cursors.has(page.nextCursor)) {
          throw new Error('Repeated eligible invoice cursor');
        }

        cursors.add(page.nextCursor);
        page = await client.request({
          method: 'GET',
          path: `/payments/${paymentId}/eligible-invoices`,
          query: { cursor: page.nextCursor },
          schema: erpEligibleInvoicePageSchema,
        });
        eligibleInvoices.push(...page.items);
      }

      return { items: eligibleInvoices, nextCursor: null };
    },
    [client],
  );

  useEffect(() => {
    const paymentId = pendingPayment?.id;
    const targetInvoiceId = invoiceId;
    const loadVersion = ++eligibleLoadVersionRef.current;
    let isActive = true;

    if (paymentId === undefined) return;

    setEligiblePage(null);
    setSubmissionError(null);
    setIsSubmitting(true);

    const load = async () => {
      try {
        const page = await loadEligibleInvoices(paymentId);
        if (!isActive) return;

        setEligiblePage({ invoiceId: targetInvoiceId, page });
        if (!isSelectedInvoiceEligible(targetInvoiceId, page)) {
          setSubmissionError(
            "La facture sélectionnée n'est plus éligible à la ventilation.",
          );
        }
      } catch {
        if (isActive) {
          setSubmissionError('Impossible de charger les factures éligibles.');
        }
      } finally {
        if (isActive && eligibleLoadVersionRef.current === loadVersion) {
          setIsSubmitting(false);
        }
      }
    };

    void load();

    return () => {
      isActive = false;
    };
  }, [invoiceId, loadEligibleInvoices, pendingPayment?.id]);

  const reconcileAmbiguousPaymentAllocation = async (paymentId: string) => {
    try {
      const payment = await client.request({
        method: 'GET',
        path: `/payments/${paymentId}`,
        schema: erpPaymentSchema,
      });

      if (payment.status === 'POSTED') {
        navigate(`/erp-maroc/payments/${payment.id}`);
        return true;
      }
    } catch {
      // Preserve the idempotent retry when reconciliation cannot be confirmed.
    }

    return false;
  };

  const handleCreatedPayment = (created: ErpPayment) => {
    if (created.status !== 'PENDING_ALLOCATION') {
      setSubmissionError('Le règlement ne peut pas être ventilé.');
      return;
    }

    setPendingPayment({
      id: created.id,
      amountCents: created.amountCents,
    });
  };

  const handleSubmit = async (values: PaymentFormValues) => {
    if (
      !canCreatePendingPayment ||
      isSubmitting ||
      pendingPayment !== null ||
      createMutationRetryIntent !== null
    )
      return;

    const parsed = parsePaymentForm({
      societeId: context?.societeId ?? '',
      values,
    });

    if (parsed.status === 'invalid') {
      setErrors(parsed.errors);
      setSubmissionError(null);
      return;
    }

    setErrors([]);
    setSubmissionError(null);
    setEligiblePage(null);
    setPendingPayment(null);
    setIsSubmitting(true);
    let intent: ErpMarocRequiredMutationIntent<ErpPayment> | null = null;

    try {
      intent = client.createMutationIntent(
        {
          method: 'POST',
          path: '/payments',
          schema: erpPaymentSchema,
          body: parsed.payload,
        },
        { idempotency: 'required' },
      );
      const created = await intent.execute();
      handleCreatedPayment(created);
    } catch (error) {
      if (intent !== null && isAmbiguousMutationError(error)) {
        setCreateMutationRetryIntent(intent);
        setSubmissionError('La création du règlement doit être réessayée.');
        return;
      }

      setSubmissionError('Impossible de créer le règlement.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRetryPaymentCreation = async () => {
    if (isSubmitting || createMutationRetryIntent === null) return;

    setSubmissionError(null);
    setIsSubmitting(true);

    try {
      const created = await createMutationRetryIntent.retry();
      setCreateMutationRetryIntent(null);
      handleCreatedPayment(created);
    } catch (error) {
      if (!isAmbiguousMutationError(error)) {
        setCreateMutationRetryIntent(null);
        setSubmissionError('Impossible de créer le règlement.');
        return;
      }

      setSubmissionError('La création du règlement doit être réessayée.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRetryEligibleInvoiceLoading = async () => {
    if (isSubmitting || pendingPayment === null) return;

    const target = {
      paymentId: pendingPayment.id,
      invoiceId,
      loadVersion: eligibleLoadVersionRef.current,
    };
    const isCurrentTarget = () =>
      eligibleLoadVersionRef.current === target.loadVersion;

    setEligiblePage(null);
    setSubmissionError(null);
    setIsSubmitting(true);

    try {
      const page = await loadEligibleInvoices(target.paymentId);
      if (!isCurrentTarget()) return;

      setEligiblePage({ invoiceId: target.invoiceId, page });
      if (!isSelectedInvoiceEligible(target.invoiceId, page)) {
        setSubmissionError(
          "La facture sélectionnée n'est plus éligible à la ventilation.",
        );
      }
    } catch {
      if (isCurrentTarget()) {
        setSubmissionError('Impossible de charger les factures éligibles.');
      }
    } finally {
      if (isCurrentTarget()) {
        setIsSubmitting(false);
      }
    }
  };

  const handleAllocate = async () => {
    if (
      !canAllocatePendingPayment ||
      isSubmitting ||
      allocationMutationRetryIntent !== null
    )
      return;

    if (pendingPayment === null || currentEligiblePage === null) {
      setSubmissionError('La ventilation du règlement est impossible.');
      return;
    }

    if (!isSelectedInvoiceEligible(invoiceId, currentEligiblePage)) {
      setSubmissionError(
        "La facture sélectionnée n'est plus éligible à la ventilation.",
      );
      return;
    }

    const paymentId = pendingPayment.id;

    const allocations = buildSuggestedAllocations(
      pendingPayment.amountCents,
      currentEligiblePage.items,
    );

    if (
      !isAllocationComplete(
        pendingPayment.amountCents,
        allocations,
        currentEligiblePage.items,
      )
    ) {
      setSubmissionError('La ventilation du règlement est impossible.');
      return;
    }

    setSubmissionError(null);
    setIsSubmitting(true);
    let intent: ErpMarocRequiredMutationIntent<ErpPayment> | null = null;

    try {
      intent = client.createMutationIntent(
        {
          method: 'POST',
          path: `/payments/${paymentId}/allocate`,
          schema: erpPaymentSchema,
          body: { allocations },
        },
        { idempotency: 'required' },
      );
      const allocated = await intent.execute();
      if (allocated.status === 'POSTED') {
        setEligiblePage(null);
        setPendingPayment(null);
        return;
      }

      setSubmissionError("Le règlement n'a pas été comptabilisé.");
    } catch (error) {
      if (intent !== null && isAmbiguousMutationError(error)) {
        if (await reconcileAmbiguousPaymentAllocation(paymentId)) {
          return;
        }

        setAllocationMutationRetryIntent(intent);
        setSubmissionError('La ventilation du règlement doit être réessayée.');
        return;
      }

      setSubmissionError('Impossible de ventiler le règlement.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRetryPaymentAllocation = async () => {
    if (isSubmitting || allocationMutationRetryIntent === null) return;

    setSubmissionError(null);
    setIsSubmitting(true);

    try {
      const allocated = await allocationMutationRetryIntent.retry();
      setAllocationMutationRetryIntent(null);
      if (allocated.status === 'POSTED') {
        setEligiblePage(null);
        setPendingPayment(null);
        return;
      }

      setSubmissionError("Le règlement n'a pas été comptabilisé.");
    } catch (error) {
      if (!isAmbiguousMutationError(error)) {
        setAllocationMutationRetryIntent(null);
        setSubmissionError('Impossible de ventiler le règlement.');
        return;
      }

      if (
        pendingPayment !== null &&
        (await reconcileAmbiguousPaymentAllocation(pendingPayment.id))
      ) {
        return;
      }

      setSubmissionError('La ventilation du règlement doit être réessayée.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ErpPageShell title="Nouveau règlement">
      <ErpPaymentEditorForm
        invoiceId={invoiceId}
        disabled={
          !canCreatePendingPayment ||
          isSubmitting ||
          pendingPayment !== null ||
          createMutationRetryIntent !== null
        }
        errors={errors}
        submissionError={submissionError}
        onSubmit={handleSubmit}
      />
      {createMutationRetryIntent !== null && (
        <button
          type="button"
          disabled={isSubmitting}
          onClick={handleRetryPaymentCreation}
        >
          Réessayer la création du règlement
        </button>
      )}
      {currentEligiblePage !== null &&
        isSelectedInvoiceEligible(invoiceId, currentEligiblePage) &&
        canAllocatePendingPayment &&
        allocationMutationRetryIntent === null && (
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleAllocate}
          >
            Ventiler le règlement
          </button>
        )}
      {allocationMutationRetryIntent !== null && (
        <button
          type="button"
          disabled={isSubmitting}
          onClick={handleRetryPaymentAllocation}
        >
          Réessayer la ventilation du règlement
        </button>
      )}
      {pendingPayment !== null && currentEligiblePage === null && (
        <button
          type="button"
          disabled={isSubmitting}
          onClick={handleRetryEligibleInvoiceLoading}
        >
          Réessayer le chargement des factures
        </button>
      )}
    </ErpPageShell>
  );
};
