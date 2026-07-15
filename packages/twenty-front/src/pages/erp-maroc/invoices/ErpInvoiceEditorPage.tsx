import { ErpMarocError } from '@/erp-maroc/api/erpMarocError';
import { ErpConfirmDialog } from '@/erp-maroc/components/ErpConfirmDialog';
import { ErpPageShell } from '@/erp-maroc/components/ErpPageShell';
import { useErpMarocContext } from '@/erp-maroc/context/useErpMarocContext';
import { ErpInvoiceEditorForm } from '@/erp-maroc/invoices/ErpInvoiceEditorForm';
import {
  createEmptyInvoiceEditorValues,
  mapInvoiceToEditorValues,
  type InvoiceEditorFormValues,
} from '@/erp-maroc/invoices/invoiceEditorForm';
import {
  parseInvoiceForm,
  type InvoiceFormError,
} from '@/erp-maroc/invoices/invoiceFormSchema';
import { useQuoteUnsavedChangesGuard } from '@/erp-maroc/quotes/useQuoteUnsavedChangesGuard';
import { styled } from '@linaria/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import {
  erpInvoiceSchema,
  erpTierListSchema,
  type ErpInvoice,
  type ErpTier,
} from 'twenty-shared/erp-maroc';
import { Button } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';

const StyledBlocked = styled.div`
  align-items: flex-start;
  color: ${themeCssVariables.font.color.secondary};
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[3]};
  padding: ${themeCssVariables.spacing[4]};
`;

const StyledBackLink = styled(Link)`
  color: ${themeCssVariables.color.blue};
`;

const StyledPanel = styled.div`
  background: ${themeCssVariables.background.secondary};
  border: 1px solid ${themeCssVariables.border.color.medium};
  color: ${themeCssVariables.font.color.primary};
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[2]};
  grid-column: 1 / -1;
  padding: ${themeCssVariables.spacing[3]};
`;

const StyledCreationPanel = styled(StyledPanel)`
  border-color: ${themeCssVariables.border.color.danger};
`;

const StyledPanelActions = styled.div`
  display: flex;
  justify-content: flex-start;
`;

type ReconciliationReason = 'conflict' | 'rateLimit' | 'uncertain';
type ReconciliationState = {
  status: 'refreshing' | 'failed' | 'ready';
  reason: ReconciliationReason;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const messages: Record<ReconciliationReason, string> = {
  conflict: 'Conflit de facture détecté.',
  rateLimit: 'Limitation ERP Maroc.',
  uncertain: 'État de la facture à vérifier.',
};

const classifyReconciliationReason = (
  error: unknown,
): ReconciliationReason | null => {
  if (!(error instanceof ErpMarocError)) return 'uncertain';
  if (error.statusCode === 409) return 'conflict';
  if (error.statusCode === 429) return 'rateLimit';
  if (error.statusCode >= 500) return 'uncertain';
  return null;
};

const ReconciliationPanel = ({
  reconciliation,
  onRetry,
  onAcknowledge,
}: {
  reconciliation: ReconciliationState;
  onRetry: () => void;
  onAcknowledge: () => void;
}) => (
  <StyledPanel role={reconciliation.status === 'failed' ? 'alert' : 'status'}>
    <strong>
      {reconciliation.status === 'refreshing'
        ? 'Vérification de la facture en cours.'
        : reconciliation.status === 'failed'
          ? 'Vérification de la facture impossible.'
          : 'Vérification de la facture terminée.'}
    </strong>
    <span>{messages[reconciliation.reason]}</span>
    {reconciliation.status === 'failed' ? (
      <StyledPanelActions>
        <Button
          type="button"
          title="Réessayer la vérification"
          ariaLabel="Réessayer la vérification"
          variant="secondary"
          onClick={onRetry}
        />
      </StyledPanelActions>
    ) : null}
    {reconciliation.status === 'ready' ? (
      <StyledPanelActions>
        <Button
          type="button"
          title="J'ai vérifié"
          ariaLabel="J'ai vérifié"
          variant="secondary"
          onClick={onAcknowledge}
        />
      </StyledPanelActions>
    ) : null}
  </StyledPanel>
);

const CreationUncertaintyPanel = ({ onReturn }: { onReturn: () => void }) => (
  <StyledCreationPanel role="alert">
    <strong>Création à vérifier</strong>
    <span>
      La réponse de création est incertaine. La facture n'est pas recréée afin
      d'éviter un doublon.
    </span>
    <StyledPanelActions>
      <Button
        type="button"
        title="Retour aux factures"
        ariaLabel="Retour aux factures"
        variant="secondary"
        onClick={onReturn}
      />
    </StyledPanelActions>
  </StyledCreationPanel>
);

type ErpInvoiceEditorPageProps = {
  invoiceId?: string;
  now?: Date;
  onSaved?: (invoice: ErpInvoice) => void;
};

export const ErpInvoiceEditorPage = ({
  invoiceId,
  now,
  onSaved,
}: ErpInvoiceEditorPageProps) => {
  const { client, context } = useErpMarocContext();
  const navigate = useNavigate();
  const [initialNow] = useState(() => now ?? new Date());
  const form = useForm<InvoiceEditorFormValues>({
    defaultValues: createEmptyInvoiceEditorValues(initialNow),
  });
  const [tiers, setTiers] = useState<ErpTier[]>([]);
  const [invoice, setInvoice] = useState<ErpInvoice | null>(null);
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>(
    'loading',
  );
  const [loadGeneration, setLoadGeneration] = useState(0);
  const [formErrors, setFormErrors] = useState<InvoiceFormError[]>([]);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [reconciliation, setReconciliation] =
    useState<ReconciliationState | null>(null);
  const [manualCreationRequiresReview, setManualCreationRequiresReview] =
    useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // The lock must close before React can render a disabled submit button.
  // oxlint-disable-next-line twenty/no-state-useref
  const mutationLock = useRef(false);
  // The lock must also close before React can render reconciliation UI.
  // oxlint-disable-next-line twenty/no-state-useref
  const reconciliationLock = useRef(false);
  const mode = invoiceId === undefined ? 'create' : 'edit';
  const hasMalformedInvoiceId =
    invoiceId !== undefined && !UUID_PATTERN.test(invoiceId);
  const canManageSalesDocuments =
    context?.capabilities.manageSalesDocuments === true;
  const hasSalesPermission = () =>
    context?.capabilities.manageSalesDocuments === true;

  useEffect(() => {
    if (hasMalformedInvoiceId) return;

    const abortController = new AbortController();
    let current = true;
    setLoadState('loading');
    const tiersRequest = client.request({
      method: 'GET',
      path: '/tiers',
      schema: erpTierListSchema,
      signal: abortController.signal,
    });
    const invoiceRequest =
      invoiceId === undefined
        ? Promise.resolve(null)
        : client.request({
            method: 'GET',
            path: `/invoices/${invoiceId}`,
            schema: erpInvoiceSchema,
            signal: abortController.signal,
          });

    Promise.all([tiersRequest, invoiceRequest])
      .then(([loadedTiers, loadedInvoice]) => {
        if (!current || abortController.signal.aborted) return;
        setTiers(loadedTiers);
        setInvoice(loadedInvoice);
        if (loadedInvoice === null) {
          const defaults = createEmptyInvoiceEditorValues(
            initialNow,
            loadedTiers[0]?.paymentDelayDays ?? 30,
          );
          form.reset({ ...defaults, tierId: loadedTiers[0]?.id ?? '' });
        } else if (loadedInvoice.status === 'DRAFT') {
          form.reset(mapInvoiceToEditorValues(loadedInvoice));
        }
        setLoadState('ready');
      })
      .catch(() => {
        if (!current || abortController.signal.aborted) return;
        setLoadState('error');
      });

    return () => {
      current = false;
      abortController.abort();
    };
  }, [
    client,
    form,
    hasMalformedInvoiceId,
    initialNow,
    invoiceId,
    loadGeneration,
  ]);

  const runReconciliationRead = useCallback(
    async (reason: ReconciliationReason) => {
      if (invoiceId === undefined) return;
      reconciliationLock.current = true;
      setReconciliation({ status: 'refreshing', reason });

      try {
        const refreshedInvoice = await client.request({
          method: 'GET',
          path: `/invoices/${invoiceId}`,
          schema: erpInvoiceSchema,
        });
        setInvoice(refreshedInvoice);
        setReconciliation({ status: 'ready', reason });
      } catch {
        setReconciliation({ status: 'failed', reason });
      }
    },
    [client, invoiceId],
  );

  const acknowledgeReconciliation = useCallback(() => {
    reconciliationLock.current = false;
    setReconciliation(null);
    setSaveError(null);
  }, []);

  const retryReconciliation = useCallback(() => {
    if (reconciliation?.status === 'failed') {
      void runReconciliationRead(reconciliation.reason);
    }
  }, [reconciliation, runReconciliationRead]);

  const navigationGuard = useQuoteUnsavedChangesGuard({
    shouldBlock: form.formState.isDirty,
    isNavigationLocked: reconciliation !== null,
  });

  const handleSubmit = async (values: InvoiceEditorFormValues) => {
    if (
      mutationLock.current ||
      reconciliationLock.current ||
      manualCreationRequiresReview ||
      !hasSalesPermission() ||
      (mode === 'edit' && invoice?.status !== 'DRAFT')
    ) {
      return;
    }

    const parsed =
      mode === 'create'
        ? parseInvoiceForm({
            mode: 'direct-create',
            societeId: context?.societeId ?? '',
            values,
          })
        : parseInvoiceForm({ mode: 'draft-edit', values });
    if (parsed.status === 'invalid') {
      setFormErrors(parsed.errors);
      return;
    }

    mutationLock.current = true;
    setIsSubmitting(true);
    setFormErrors([]);
    setSaveError(null);
    let savedInvoice: ErpInvoice | null = null;

    try {
      const intent = client.createMutationIntent(
        {
          method: mode === 'create' ? 'POST' : 'PATCH',
          path: mode === 'create' ? '/invoices' : `/invoices/${invoiceId}`,
          schema: erpInvoiceSchema,
          body: parsed.payload,
        },
        { idempotency: 'forbidden' },
      );
      savedInvoice = await intent.execute();
      setInvoice(savedInvoice);
      form.reset(mapInvoiceToEditorValues(savedInvoice));
    } catch (error) {
      const reason = classifyReconciliationReason(error);
      if (reason === null) {
        setSaveError("Impossible d'enregistrer la facture.");
        return;
      }

      setSaveError(null);
      if (mode === 'create') {
        setManualCreationRequiresReview(true);
      } else {
        await runReconciliationRead(reason);
      }
    } finally {
      mutationLock.current = false;
      setIsSubmitting(false);
    }

    if (savedInvoice !== null) {
      navigationGuard.runWithBypass(() => {
        if (onSaved !== undefined) {
          onSaved(savedInvoice);
          return;
        }
        void navigate(`/erp-maroc/invoices/${savedInvoice.id}`);
      });
    }
  };

  const title = mode === 'create' ? 'Nouvelle facture' : 'Modifier la facture';

  if (hasMalformedInvoiceId) {
    return (
      <ErpPageShell
        title="Factures"
        state="empty"
        emptyLabel="Facture introuvable"
      />
    );
  }
  if (!canManageSalesDocuments) {
    return (
      <ErpPageShell title={title}>
        <StyledBlocked>
          Vous n'avez pas la permission de gérer les factures.
        </StyledBlocked>
      </ErpPageShell>
    );
  }
  if (loadState !== 'ready') {
    return (
      <ErpPageShell
        title={title}
        state={loadState}
        loadingLabel="Chargement de la facture"
        errorLabel="Impossible de charger la facture"
        retryLabel="Réessayer"
        onRetry={() => setLoadGeneration((value) => value + 1)}
      />
    );
  }
  if (invoice !== null && invoice.status !== 'DRAFT') {
    return (
      <ErpPageShell title={title}>
        <StyledBlocked>
          <span>Cette facture ne peut plus être modifiée.</span>
          <StyledBackLink
            to={`/erp-maroc/invoices/${invoice.id}`}
            onClick={() => navigationGuard.runWithBypass(() => undefined)}
          >
            Retour à la facture
          </StyledBackLink>
        </StyledBlocked>
      </ErpPageShell>
    );
  }

  return (
    <ErpPageShell title={title} description="Devise MAD">
      <ErpInvoiceEditorForm
        form={form}
        tiers={tiers}
        mode={mode}
        disabled={isSubmitting}
        saveDisabled={reconciliation !== null || manualCreationRequiresReview}
        isSubmitting={isSubmitting}
        errors={formErrors}
        saveError={saveError}
        reconciliationSlot={
          reconciliation !== null ? (
            <ReconciliationPanel
              reconciliation={reconciliation}
              onRetry={retryReconciliation}
              onAcknowledge={acknowledgeReconciliation}
            />
          ) : manualCreationRequiresReview ? (
            <CreationUncertaintyPanel
              onReturn={() => {
                navigationGuard.runWithBypass(() => {
                  void navigate('/erp-maroc/invoices');
                });
              }}
            />
          ) : null
        }
        onSubmit={handleSubmit}
      />
      <ErpConfirmDialog
        isOpen={navigationGuard.isBlocked}
        title="Quitter cette facture ?"
        message="Les modifications non enregistrées seront perdues."
        cancelLabel="Rester"
        confirmLabel="Quitter"
        destructive
        confirmDisabled={navigationGuard.confirmDisabled}
        onCancel={navigationGuard.cancelNavigation}
        onConfirm={navigationGuard.confirmNavigation}
      />
    </ErpPageShell>
  );
};
