import { ErpMarocError } from '@/erp-maroc/api/erpMarocError';
import { ErpConfirmDialog } from '@/erp-maroc/components/ErpConfirmDialog';
import { ErpPageShell } from '@/erp-maroc/components/ErpPageShell';
import { useErpMarocContext } from '@/erp-maroc/context/useErpMarocContext';
import { erpMarocPaths } from '@/erp-maroc/navigation/erpMarocPaths';
import { ErpQuoteEditorForm } from '@/erp-maroc/quotes/ErpQuoteEditorForm';
import {
  createEmptyQuoteEditorValues,
  mapQuoteToEditorValues,
  type QuoteEditorFormValues,
} from '@/erp-maroc/quotes/quoteEditorForm';
import {
  parseQuoteForm,
  type QuoteFormError,
} from '@/erp-maroc/quotes/quoteFormSchema';
import { useQuoteUnsavedChangesGuard } from '@/erp-maroc/quotes/useQuoteUnsavedChangesGuard';
import { styled } from '@linaria/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { generatePath, Link, useNavigate, useParams } from 'react-router-dom';
import {
  erpQuoteListSchema,
  erpQuoteSchema,
  erpTierListSchema,
  type ErpQuote,
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

const StyledReconciliationPanel = styled.div`
  background: ${themeCssVariables.background.secondary};
  border: 1px solid ${themeCssVariables.border.color.medium};
  color: ${themeCssVariables.font.color.primary};
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[2]};
  grid-column: 1 / -1;
  padding: ${themeCssVariables.spacing[3]};
`;

const StyledReconciliationTitle = styled.strong`
  font-size: ${themeCssVariables.font.size.md};
`;

const StyledReconciliationMessage = styled.span`
  color: ${themeCssVariables.font.color.secondary};
`;

const StyledReconciliationActions = styled.div`
  display: flex;
  justify-content: flex-start;
`;

const StyledCreationUncertaintyPanel = styled(StyledReconciliationPanel)`
  border-color: ${themeCssVariables.border.color.danger};
`;

type ReconciliationReason = 'conflict' | 'rateLimit' | 'uncertain';

type ReconciliationState = {
  status: 'refreshing' | 'failed' | 'ready';
  reason: ReconciliationReason;
};

const reconciliationMessages: Record<ReconciliationReason, string> = {
  conflict: 'Conflit de devis détecté.',
  rateLimit: 'Limitation ERP Maroc.',
  uncertain: 'État du devis à vérifier.',
};

const reconciliationTitles: Record<ReconciliationState['status'], string> = {
  refreshing: 'Vérification du devis en cours.',
  failed: 'Vérification du devis impossible.',
  ready: 'Vérification du devis terminée.',
};

const classifyReconciliationReason = (
  error: unknown,
): ReconciliationReason | null => {
  if (!(error instanceof ErpMarocError)) {
    return 'uncertain';
  }

  if (error.statusCode === 409) {
    return 'conflict';
  }

  if (error.statusCode === 429) {
    return 'rateLimit';
  }

  if (error.statusCode >= 500) {
    return 'uncertain';
  }

  return null;
};

const ErpQuoteReconciliationPanel = ({
  reconciliation,
  onRetry,
  onAcknowledge,
}: {
  reconciliation: ReconciliationState;
  onRetry: () => void;
  onAcknowledge: () => void;
}) => (
  <StyledReconciliationPanel
    role={reconciliation.status === 'failed' ? 'alert' : 'status'}
  >
    <StyledReconciliationTitle>
      {reconciliationTitles[reconciliation.status]}
    </StyledReconciliationTitle>
    <StyledReconciliationMessage>
      {reconciliationMessages[reconciliation.reason]}
    </StyledReconciliationMessage>
    {reconciliation.status === 'failed' ? (
      <StyledReconciliationActions>
        <Button
          type="button"
          title="Réessayer la vérification"
          ariaLabel="Réessayer la vérification"
          variant="secondary"
          onClick={onRetry}
        />
      </StyledReconciliationActions>
    ) : null}
    {reconciliation.status === 'ready' ? (
      <StyledReconciliationActions>
        <Button
          type="button"
          title="J'ai vérifié"
          ariaLabel="J'ai vérifié"
          variant="secondary"
          onClick={onAcknowledge}
        />
      </StyledReconciliationActions>
    ) : null}
  </StyledReconciliationPanel>
);

const ErpQuoteCreationUncertaintyPanel = ({
  onReturnToQuotes,
}: {
  onReturnToQuotes: () => void;
}) => (
  <StyledCreationUncertaintyPanel role="alert">
    <StyledReconciliationTitle>Création à vérifier</StyledReconciliationTitle>
    <StyledReconciliationMessage>
      La réponse de création est incertaine. Le devis n'est pas recréé afin
      d'éviter un doublon.
    </StyledReconciliationMessage>
    <StyledReconciliationActions>
      <Button
        type="button"
        title="Retour aux devis"
        ariaLabel="Retour aux devis"
        variant="secondary"
        onClick={onReturnToQuotes}
      />
    </StyledReconciliationActions>
  </StyledCreationUncertaintyPanel>
);

type ErpQuoteEditorPageProps = {
  quoteId?: string;
  now?: Date;
  onSaved?: (quote: ErpQuote) => void;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const ErpQuoteEditorPage = ({
  quoteId: quoteIdProp,
  now,
  onSaved,
}: ErpQuoteEditorPageProps) => {
  const { client, context } = useErpMarocContext();
  const navigate = useNavigate();
  const { id: routeQuoteId } = useParams<{ id: string }>();
  const quoteId = quoteIdProp ?? routeQuoteId;
  const hasMalformedQuoteId =
    quoteId !== undefined && !UUID_PATTERN.test(quoteId);
  const mode = quoteId === undefined ? 'create' : 'edit';
  const [initialNow] = useState(() => now ?? new Date());
  const form = useForm<QuoteEditorFormValues>({
    defaultValues: createEmptyQuoteEditorValues(initialNow),
  });
  const [tiers, setTiers] = useState<ErpTier[]>([]);
  const [quote, setQuote] = useState<ErpQuote | null>(null);
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>(
    'loading',
  );
  const [loadGeneration, setLoadGeneration] = useState(0);
  const [formErrors, setFormErrors] = useState<QuoteFormError[]>([]);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [reconciliation, setReconciliation] =
    useState<ReconciliationState | null>(null);
  const [manualCreationRequiresReview, setManualCreationRequiresReview] =
    useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // The lock must close before React can render a disabled submit button.
  // oxlint-disable-next-line twenty/no-state-useref
  const mutationLock = useRef(false);
  // The reconciliation lock must also close before React can disable submit.
  // oxlint-disable-next-line twenty/no-state-useref
  const reconciliationLock = useRef(false);

  const canManageSalesDocuments =
    context?.capabilities.manageSalesDocuments === true;
  const hasSalesPermission = () =>
    context?.capabilities.manageSalesDocuments === true;

  useEffect(() => {
    if (hasMalformedQuoteId) {
      return;
    }

    const abortController = new AbortController();
    let isCurrent = true;
    setLoadState('loading');

    const tiersRequest = client.request({
      method: 'GET',
      path: '/tiers',
      schema: erpTierListSchema,
      signal: abortController.signal,
    });
    const quoteRequest =
      quoteId === undefined
        ? Promise.resolve(null)
        : client.request({
            method: 'GET',
            path: `/quotes/${quoteId}`,
            schema: erpQuoteSchema,
            signal: abortController.signal,
          });

    Promise.all([tiersRequest, quoteRequest])
      .then(([loadedTiers, loadedQuote]) => {
        if (!isCurrent || abortController.signal.aborted) return;
        setTiers(loadedTiers);
        setQuote(loadedQuote);
        if (loadedQuote === null) {
          const defaults = createEmptyQuoteEditorValues(initialNow);
          form.reset({
            ...defaults,
            tierId: loadedTiers[0]?.id ?? '',
          });
        } else if (loadedQuote.status === 'DRAFT') {
          form.reset(mapQuoteToEditorValues(loadedQuote));
        }
        setLoadState('ready');
      })
      .catch(() => {
        if (!isCurrent || abortController.signal.aborted) return;
        setLoadState('error');
      });

    return () => {
      isCurrent = false;
      abortController.abort();
    };
  }, [client, form, hasMalformedQuoteId, initialNow, loadGeneration, quoteId]);

  const runReconciliationRead = useCallback(
    async (reason: ReconciliationReason) => {
      reconciliationLock.current = true;
      setReconciliation({ status: 'refreshing', reason });

      try {
        if (mode === 'create') {
          await client.request({
            method: 'GET',
            path: '/quotes',
            schema: erpQuoteListSchema,
          });
        } else {
          const refreshedQuote = await client.request({
            method: 'GET',
            path: `/quotes/${quoteId}`,
            schema: erpQuoteSchema,
          });
          setQuote(refreshedQuote);
        }

        setReconciliation({ status: 'ready', reason });
      } catch {
        setReconciliation({ status: 'failed', reason });
      }
    },
    [client, mode, quoteId],
  );

  const acknowledgeReconciliation = useCallback(() => {
    reconciliationLock.current = false;
    setReconciliation(null);
    setSaveError(null);
  }, []);

  const retryReconciliation = useCallback(() => {
    if (reconciliation === null || reconciliation.status === 'refreshing') {
      return;
    }

    void runReconciliationRead(reconciliation.reason);
  }, [reconciliation, runReconciliationRead]);

  const navigationGuard = useQuoteUnsavedChangesGuard({
    shouldBlock: form.formState.isDirty,
    isNavigationLocked: reconciliation !== null,
  });

  const handleSubmit = async (values: QuoteEditorFormValues) => {
    if (
      mutationLock.current ||
      reconciliationLock.current ||
      manualCreationRequiresReview ||
      !hasSalesPermission() ||
      (mode === 'edit' && quote?.status !== 'DRAFT')
    ) {
      return;
    }

    const parsed =
      mode === 'create'
        ? parseQuoteForm({
            mode: 'manual-create',
            societeId: context?.societeId ?? '',
            values,
          })
        : parseQuoteForm({
            mode: 'draft-edit',
            source:
              quote?.twentyOpportunityId === null ? 'manual' : 'opportunity',
            values,
          });

    if (parsed.status === 'invalid') {
      setFormErrors(parsed.errors);
      return;
    }

    mutationLock.current = true;
    setIsSubmitting(true);
    setFormErrors([]);
    setSaveError(null);
    let savedQuote: ErpQuote | null = null;

    try {
      const intent = client.createMutationIntent(
        {
          method: mode === 'create' ? 'POST' : 'PATCH',
          path: mode === 'create' ? '/quotes' : `/quotes/${quoteId}`,
          schema: erpQuoteSchema,
          body: parsed.payload,
        },
        { idempotency: 'forbidden' },
      );
      savedQuote = await intent.execute();
      form.reset(mapQuoteToEditorValues(savedQuote));
    } catch (error) {
      const reconciliationReason = classifyReconciliationReason(error);

      if (reconciliationReason === null) {
        setSaveError("Impossible d'enregistrer le devis.");
        return;
      }

      setSaveError(null);
      if (mode === 'create') {
        setManualCreationRequiresReview(true);
      }
      await runReconciliationRead(reconciliationReason);
    } finally {
      mutationLock.current = false;
      setIsSubmitting(false);
    }

    if (savedQuote !== null) {
      navigationGuard.runWithBypass(() => {
        if (onSaved !== undefined) {
          onSaved(savedQuote);
          return;
        }

        void navigate(
          generatePath(erpMarocPaths.quoteDetail, { id: savedQuote.id }),
        );
      });
    }
  };

  const title = mode === 'create' ? 'Nouveau devis' : 'Modifier le devis';

  if (hasMalformedQuoteId) {
    return (
      <ErpPageShell
        title="Devis"
        state="empty"
        emptyLabel="Devis introuvable"
      />
    );
  }

  if (!canManageSalesDocuments) {
    return (
      <ErpPageShell title={title}>
        <StyledBlocked>
          Vous n'avez pas la permission de gérer les devis.
        </StyledBlocked>
      </ErpPageShell>
    );
  }

  if (loadState !== 'ready') {
    return (
      <ErpPageShell
        title={title}
        state={loadState}
        loadingLabel="Chargement du devis"
        errorLabel="Impossible de charger le devis"
        retryLabel="Réessayer"
        onRetry={() => setLoadGeneration((current) => current + 1)}
      />
    );
  }

  if (quote !== null && quote.status !== 'DRAFT') {
    return (
      <ErpPageShell title={title}>
        <StyledBlocked>
          <span>Ce devis ne peut plus être modifié.</span>
          <StyledBackLink
            to={generatePath(erpMarocPaths.quoteDetail, { id: quote.id })}
          >
            Retour au devis
          </StyledBackLink>
        </StyledBlocked>
      </ErpPageShell>
    );
  }

  return (
    <ErpPageShell title={title} description="Devise MAD">
      <ErpQuoteEditorForm
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
            <ErpQuoteReconciliationPanel
              reconciliation={reconciliation}
              onRetry={retryReconciliation}
              onAcknowledge={acknowledgeReconciliation}
            />
          ) : manualCreationRequiresReview ? (
            <ErpQuoteCreationUncertaintyPanel
              onReturnToQuotes={() => {
                navigationGuard.runWithBypass(() => {
                  void navigate(erpMarocPaths.quotes);
                });
              }}
            />
          ) : null
        }
        onSubmit={handleSubmit}
      />
      <ErpConfirmDialog
        isOpen={navigationGuard.isBlocked}
        title="Quitter ce devis ?"
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
