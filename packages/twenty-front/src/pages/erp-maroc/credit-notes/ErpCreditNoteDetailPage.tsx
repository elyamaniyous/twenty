import { ErpMarocError } from '@/erp-maroc/api/erpMarocError';
import type { ErpMarocRequiredMutationIntent } from '@/erp-maroc/api/erpMarocClient';
import { ErpConfirmDialog } from '@/erp-maroc/components/ErpConfirmDialog';
import { ErpPageShell } from '@/erp-maroc/components/ErpPageShell';
import { useErpMarocContext } from '@/erp-maroc/context/useErpMarocContext';
import { ErpCreditNoteDetailContent } from '@/erp-maroc/credit-notes/ErpCreditNoteDetailContent';
import { clampCreditAllocation } from '@/erp-maroc/credit-notes/creditAllocation';
import { getCreditNoteCommandPolicy } from '@/erp-maroc/credit-notes/creditNoteCommandPolicy';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  erpCreditNoteSchema,
  erpEligibleInvoicePageSchema,
  type ErpCreditNote,
  type ErpEligibleInvoice,
} from 'twenty-shared/erp-maroc';

type Action = 'validate' | 'cancel' | 'allocate';

const isAmbiguousError = (error: unknown) =>
  !(error instanceof ErpMarocError) ||
  error.statusCode === 408 ||
  error.statusCode === 409 ||
  error.statusCode >= 500;

const actionLabel = (action: Action) => {
  if (action === 'validate') return "valider l'avoir";
  if (action === 'cancel') return "annuler l'avoir";
  return "ventiler l'avoir";
};

const retryLabelFor = (action: Action) => {
  if (action === 'validate') return "Réessayer la validation de l'avoir";
  if (action === 'cancel') return "Réessayer l'annulation de l'avoir";
  return "Réessayer la ventilation de l'avoir";
};

export const ErpCreditNoteDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const { client, context } = useErpMarocContext();
  const [creditNote, setCreditNote] = useState<ErpCreditNote | null>(null);
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>(
    'loading',
  );
  const [eligibleInvoices, setEligibleInvoices] = useState<
    ErpEligibleInvoice[]
  >([]);
  const [allocations, setAllocations] = useState<Record<string, string>>({});
  const [dialogAction, setDialogAction] = useState<Action | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [retryIntent, setRetryIntent] =
    useState<ErpMarocRequiredMutationIntent<ErpCreditNote> | null>(null);
  const [retryAction, setRetryAction] = useState<Action | null>(null);

  useEffect(() => {
    setRetryIntent(null);
    setRetryAction(null);
    setActionError(null);
    setDialogAction(null);
    setEligibleInvoices([]);
    setAllocations({});

    if (id === undefined) {
      setCreditNote(null);
      setLoadState('error');
      return;
    }

    let active = true;
    setLoadState('loading');
    void client
      .request({
        method: 'GET',
        path: `/credit-notes/${id}`,
        schema: erpCreditNoteSchema,
      })
      .then((result) => {
        if (!active) return;
        setCreditNote(result);
        setLoadState('ready');
      })
      .catch(() => {
        if (active) setLoadState('error');
      });

    return () => {
      active = false;
    };
  }, [client, id]);

  const policy = useMemo(() => {
    if (creditNote === null || context === null) return null;

    return getCreditNoteCommandPolicy({
      role: context.role,
      capabilities: context.capabilities,
      status: creditNote.status,
      lineCount: creditNote.lines.length,
      availableCreditCents: creditNote.availableCreditCents,
    });
  }, [context, creditNote]);

  useEffect(() => {
    if (creditNote === null || policy?.allocate !== true) return;

    let active = true;
    void client
      .request({
        method: 'GET',
        path: `/credit-notes/${creditNote.id}/eligible-invoices`,
        schema: erpEligibleInvoicePageSchema,
      })
      .then((page) => {
        if (active) setEligibleInvoices(page.items);
      });

    return () => {
      active = false;
    };
  }, [client, creditNote, policy?.allocate]);

  const updateAllocation = (invoice: ErpEligibleInvoice, value: string) => {
    if (creditNote === null) return;
    const requested = /^\d+$/.test(value) ? Number(value) : 0;
    const otherAllocated = Object.entries(allocations).reduce(
      (total, [invoiceId, amount]) =>
        invoiceId === invoice.id || !/^\d+$/.test(amount)
          ? total
          : total + Number(amount),
      0,
    );
    const amountCents = clampCreditAllocation(
      Math.max(0, creditNote.availableCreditCents - otherAllocated),
      invoice.outstandingCents,
      requested,
    );
    setAllocations((current) => ({
      ...current,
      [invoice.id]: String(amountCents),
    }));
  };

  const executeAction = async (action: Action) => {
    if (creditNote === null || isSubmitting) return;

    const allocationItems = eligibleInvoices.flatMap((invoice) => {
      const amount = allocations[invoice.id] ?? '0';
      return /^\d+$/.test(amount) && Number(amount) > 0
        ? [{ invoiceId: invoice.id, amountCents: Number(amount) }]
        : [];
    });
    const request =
      action === 'validate'
        ? {
            method: 'POST' as const,
            path: `/credit-notes/${creditNote.id}/validate`,
            schema: erpCreditNoteSchema,
            body: { creditNoteId: creditNote.id },
          }
        : action === 'cancel'
          ? {
              method: 'POST' as const,
              path: `/credit-notes/${creditNote.id}/cancel`,
              schema: erpCreditNoteSchema,
              body: {
                creditNoteId: creditNote.id,
                reason: 'Annulation du brouillon depuis le CRM.',
              },
            }
          : {
              method: 'POST' as const,
              path: `/credit-notes/${creditNote.id}/allocate`,
              schema: erpCreditNoteSchema,
              body: {
                creditNoteId: creditNote.id,
                allocations: allocationItems,
              },
            };
    const intent = client.createMutationIntent(request, {
      idempotency: 'required',
    });

    setIsSubmitting(true);
    setActionError(null);
    try {
      setCreditNote(await intent.execute());
      setDialogAction(null);
      setRetryIntent(null);
      setRetryAction(null);
    } catch (error) {
      if (isAmbiguousError(error)) {
        setRetryIntent(intent);
        setRetryAction(action);
      }
      setActionError(`Impossible de ${actionLabel(action)}.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const retry = async () => {
    if (retryIntent === null || retryAction === null || isSubmitting) return;
    setIsSubmitting(true);
    setActionError(null);
    try {
      setCreditNote(await retryIntent.retry());
      setRetryIntent(null);
      setRetryAction(null);
      setDialogAction(null);
    } catch (error) {
      if (!isAmbiguousError(error)) {
        setRetryIntent(null);
        setRetryAction(null);
      }
      setActionError(`Impossible de ${actionLabel(retryAction)}.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loadState === 'loading') {
    return (
      <ErpPageShell
        title="Avoir"
        state="loading"
        loadingLabel="Chargement de l'avoir"
      />
    );
  }
  if (loadState === 'error' || creditNote === null) {
    return (
      <ErpPageShell
        title="Avoir"
        state="error"
        errorLabel="Impossible de charger l'avoir"
      />
    );
  }

  const activeAction = retryAction ?? dialogAction;
  const isRetrying = retryIntent !== null && retryAction !== null;
  const retryLabel = activeAction === null ? null : retryLabelFor(activeAction);

  return (
    <ErpPageShell
      title="Avoir"
      actions={
        <>
          {policy?.validate ? (
            <button type="button" onClick={() => setDialogAction('validate')}>
              Valider l'avoir
            </button>
          ) : null}
          {policy?.cancelDraft ? (
            <button type="button" onClick={() => setDialogAction('cancel')}>
              Annuler l'avoir
            </button>
          ) : null}
          {policy?.allocate ? (
            <button type="button" onClick={() => setDialogAction('allocate')}>
              Ventiler l'avoir
            </button>
          ) : null}
        </>
      }
    >
      {actionError === null ? null : <div role="alert">{actionError}</div>}
      <ErpCreditNoteDetailContent creditNote={creditNote} />
      {policy?.allocate ? (
        <section aria-label="Ventilation du crédit">
          {eligibleInvoices.map((invoice) => (
            <div key={invoice.id}>
              <label htmlFor={`credit-note-allocation-${invoice.id}`}>
                {`Montant à ventiler - ${invoice.number ?? invoice.id}`}
              </label>
              <input
                id={`credit-note-allocation-${invoice.id}`}
                inputMode="numeric"
                value={allocations[invoice.id] ?? ''}
                onChange={(event) =>
                  updateAllocation(invoice, event.target.value)
                }
              />
            </div>
          ))}
        </section>
      ) : null}
      <ErpConfirmDialog
        isOpen={activeAction !== null}
        title={isRetrying ? retryLabel! : actionLabel(activeAction!)}
        message="Confirmer cette opération comptable."
        confirmLabel={isRetrying ? retryLabel! : 'Confirmer'}
        cancelLabel="Annuler"
        isConfirming={isSubmitting}
        destructive={activeAction === 'cancel'}
        onCancel={() => {
          setDialogAction(null);
          setRetryIntent(null);
          setRetryAction(null);
          setActionError(null);
        }}
        onConfirm={() =>
          void (isRetrying ? retry() : executeAction(activeAction!))
        }
      />
    </ErpPageShell>
  );
};
