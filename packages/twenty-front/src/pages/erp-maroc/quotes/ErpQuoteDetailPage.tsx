import { ErpMarocError } from '@/erp-maroc/api/erpMarocError';
import { ErpConfirmDialog } from '@/erp-maroc/components/ErpConfirmDialog';
import { ErpPageShell } from '@/erp-maroc/components/ErpPageShell';
import { ErpStatusBadge } from '@/erp-maroc/components/ErpStatusBadge';
import { useErpMarocContext } from '@/erp-maroc/context/useErpMarocContext';
import { erpMarocPaths } from '@/erp-maroc/navigation/erpMarocPaths';
import {
  ErpQuoteDetailContent,
  formatQuoteCivilDate,
  getQuoteStatusAppearance,
} from '@/erp-maroc/quotes/ErpQuoteDetailContent';
import { getQuoteCommandPolicy } from '@/erp-maroc/quotes/quoteCommandPolicy';
import { formatMadCents } from '@/erp-maroc/utils/money';
import { styled } from '@linaria/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { generatePath, useNavigate, useParams } from 'react-router-dom';
import {
  erpInvoiceSchema,
  erpQuoteSchema,
  erpTierListSchema,
  type ErpInvoice,
  type ErpQuote,
  type ErpTier,
} from 'twenty-shared/erp-maroc';
import { Button } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';

type QuoteAction = 'send' | 'accept' | 'reject' | 'convert';
type ReconciliationPhase = 'refreshing' | 'failed' | 'needs-ack';

type Reconciliation = {
  action: QuoteAction;
  phase: ReconciliationPhase;
  message: string;
};

type ErpQuoteDetailPageProps = {
  quoteId?: string;
  onEdit?: (quoteId: string) => void;
  onConverted?: (invoice: ErpInvoice) => void;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const ACTION_COPY: Record<
  QuoteAction,
  {
    button: string;
    title: string;
    message: string;
    expectedStatus?: ErpQuote['status'];
  }
> = {
  send: {
    button: 'Envoyer',
    title: 'Envoyer le devis',
    message: 'Confirmer le passage de ce devis au statut Envoyé.',
    expectedStatus: 'SENT',
  },
  accept: {
    button: 'Accepter',
    title: 'Accepter le devis',
    message: 'Confirmer l’acceptation de ce devis.',
    expectedStatus: 'ACCEPTED',
  },
  reject: {
    button: 'Rejeter',
    title: 'Rejeter le devis',
    message: 'Confirmer le rejet de ce devis.',
    expectedStatus: 'REJECTED',
  },
  convert: {
    button: 'Convertir en facture',
    title: 'Convertir le devis en facture',
    message: 'Créer une facture à partir de ce devis accepté.',
  },
};

const StyledActions = styled.div`
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[2]};
`;

const StyledAlert = styled.div`
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  color: ${themeCssVariables.font.color.secondary};
  font-size: ${themeCssVariables.font.size.sm};
  padding: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[4]};
`;

const getMutationMessage = (error: unknown) => {
  if (error instanceof ErpMarocError && error.statusCode === 409)
    return 'Conflit ERP';
  if (error instanceof ErpMarocError && error.statusCode === 429)
    return 'Limitation ERP';
  return 'État à vérifier';
};

const isReconciliationRequired = (error: unknown) =>
  !(error instanceof ErpMarocError) ||
  error.statusCode === 409 ||
  error.statusCode === 429 ||
  error.statusCode >= 500;

export const ErpQuoteDetailPage = ({
  quoteId: quoteIdProp,
  onEdit,
  onConverted,
}: ErpQuoteDetailPageProps) => {
  const { client, context } = useErpMarocContext();
  const navigate = useNavigate();
  const { id: routeQuoteId } = useParams<{ id: string }>();
  const resolvedQuoteId = quoteIdProp ?? routeQuoteId;
  const quoteId =
    resolvedQuoteId !== undefined && UUID_PATTERN.test(resolvedQuoteId)
      ? resolvedQuoteId
      : null;
  const [quote, setQuote] = useState<ErpQuote | null>(null);
  const [tiers, setTiers] = useState<ErpTier[]>([]);
  const [loadState, setLoadState] = useState<
    'loading' | 'ready' | 'error' | 'not-found'
  >('loading');
  const [loadGeneration, setLoadGeneration] = useState(0);
  const [confirmedAction, setConfirmedAction] = useState<QuoteAction | null>(
    null,
  );
  const [isMutating, setIsMutating] = useState(false);
  const [reconciliation, setReconciliation] = useState<Reconciliation | null>(
    null,
  );
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  // The synchronous lock prevents two clicks before React can disable the button.
  // oxlint-disable-next-line twenty/no-state-useref
  const mutationLock = useRef(false);
  // The in-flight reconciliation read is explicitly cancelled on navigation.
  // oxlint-disable-next-line twenty/no-state-useref
  const reconciliationAbortControllerRef = useRef<AbortController | null>(null);
  // oxlint-disable-next-line twenty/no-state-useref
  const isMountedRef = useRef(true);

  const hasSalesPermission = () =>
    context?.capabilities.manageSalesDocuments === true;

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      reconciliationAbortControllerRef.current?.abort();
    };
  }, []);

  const navigateToInvoice = useCallback(
    (invoiceId: string) => {
      void navigate(
        generatePath(erpMarocPaths.invoiceDetail, { id: invoiceId }),
      );
    },
    [navigate],
  );

  useEffect(() => {
    if (quoteId === null) {
      return;
    }

    const abortController = new AbortController();
    let isCurrent = true;
    setLoadState('loading');

    Promise.all([
      client.request({
        method: 'GET',
        path: `/quotes/${quoteId}`,
        schema: erpQuoteSchema,
        signal: abortController.signal,
      }),
      client.request({
        method: 'GET',
        path: '/tiers',
        schema: erpTierListSchema,
        signal: abortController.signal,
      }),
    ])
      .then(([loadedQuote, loadedTiers]) => {
        if (!isCurrent || abortController.signal.aborted) return;
        setQuote(loadedQuote);
        setTiers(loadedTiers);
        setLoadState('ready');
      })
      .catch((error: unknown) => {
        if (!isCurrent || abortController.signal.aborted) return;
        setLoadState(
          error instanceof ErpMarocError && error.statusCode === 404
            ? 'not-found'
            : 'error',
        );
      });

    return () => {
      isCurrent = false;
      abortController.abort();
    };
  }, [client, loadGeneration, quoteId]);

  const policy = useMemo(
    () =>
      quote === null || context === null
        ? null
        : getQuoteCommandPolicy({
            role: context.role,
            manageSalesDocuments:
              context.capabilities.manageSalesDocuments === true,
            status: quote.status,
            lineCount: quote.lines.length,
            convertedInvoiceId: quote.convertedInvoiceId,
          }),
    [context, quote],
  );

  const customerName =
    tiers.find(({ id }) => id === quote?.tierId)?.name ?? 'Client non résolu';

  const completeAction = useCallback(() => {
    mutationLock.current = false;
    setIsMutating(false);
    setConfirmedAction(null);
    setReconciliation(null);
  }, []);

  const handleConverted = useCallback(
    (invoice: ErpInvoice) => {
      completeAction();
      if (onConverted !== undefined) onConverted(invoice);
      else navigateToInvoice(invoice.id);
    },
    [completeAction, navigateToInvoice, onConverted],
  );

  const reconcile = useCallback(
    async (action: QuoteAction, message: string) => {
      if (quoteId === null) {
        return;
      }

      reconciliationAbortControllerRef.current?.abort();
      const abortController = new AbortController();
      reconciliationAbortControllerRef.current = abortController;
      setReconciliation({ action, phase: 'refreshing', message });
      try {
        const refreshed = await client.request({
          method: 'GET',
          path: `/quotes/${quoteId}`,
          schema: erpQuoteSchema,
          signal: abortController.signal,
        });
        if (!isMountedRef.current || abortController.signal.aborted) return;
        setQuote(refreshed);
        const expectedStatus = ACTION_COPY[action].expectedStatus;

        if (action === 'convert') {
          if (
            refreshed.status === 'CONVERTED' &&
            refreshed.convertedInvoiceId !== null
          ) {
            completeAction();
            navigateToInvoice(refreshed.convertedInvoiceId);
            return;
          }
        } else if (refreshed.status === expectedStatus) {
          setActionMessage(message);
          completeAction();
          return;
        }

        setIsMutating(false);
        setReconciliation({ action, phase: 'needs-ack', message });
      } catch {
        if (!isMountedRef.current || abortController.signal.aborted) return;
        setIsMutating(false);
        setReconciliation({
          action,
          phase: 'failed',
          message: 'Échec de vérification',
        });
      } finally {
        if (reconciliationAbortControllerRef.current === abortController) {
          reconciliationAbortControllerRef.current = null;
        }
      }
    },
    [client, completeAction, navigateToInvoice, quoteId],
  );

  const runAction = async (action: QuoteAction) => {
    const currentQuote = quote;
    if (
      mutationLock.current ||
      !hasSalesPermission() ||
      currentQuote === null ||
      quoteId === null
    )
      return;

    const currentPolicy = getQuoteCommandPolicy({
      role: context?.role ?? 'COMMERCIAL',
      manageSalesDocuments: hasSalesPermission(),
      status: currentQuote.status,
      lineCount: currentQuote.lines.length,
      convertedInvoiceId: currentQuote.convertedInvoiceId,
    });
    if (!currentPolicy[action]) return;

    mutationLock.current = true;
    setIsMutating(true);
    setActionMessage(null);

    const isConversion = action === 'convert';
    const intent = client.createMutationIntent(
      {
        method: 'POST',
        path: isConversion
          ? `/invoices/from-quote/${quoteId}`
          : `/quotes/${quoteId}/${action}`,
        schema: isConversion ? erpInvoiceSchema : erpQuoteSchema,
      },
      { idempotency: 'forbidden' },
    );

    try {
      const result = await intent.execute();
      if (isConversion) {
        handleConverted(result as ErpInvoice);
        return;
      }

      const updatedQuote = result as ErpQuote;
      const expectedStatus = ACTION_COPY[action].expectedStatus;
      if (updatedQuote.status !== expectedStatus) {
        await reconcile(action, 'État à vérifier');
        return;
      }
      setQuote(updatedQuote);
      setActionMessage(
        action === 'send'
          ? 'Devis marqué comme envoyé'
          : action === 'accept'
            ? 'Devis accepté'
            : 'Devis rejeté',
      );
      completeAction();
    } catch (error: unknown) {
      if (isReconciliationRequired(error)) {
        await reconcile(action, getMutationMessage(error));
        return;
      }

      mutationLock.current = false;
      setIsMutating(false);
      setConfirmedAction(null);
      setActionMessage(
        action === 'send'
          ? 'Impossible d’envoyer le devis'
          : action === 'accept'
            ? 'Impossible d’accepter le devis'
            : action === 'reject'
              ? 'Impossible de rejeter le devis'
              : 'Impossible de convertir le devis',
      );
    }
  };

  const acknowledgeReconciliation = () => {
    mutationLock.current = false;
    setConfirmedAction(null);
    setReconciliation(null);
  };

  const retryReconciliation = () => {
    const action = reconciliation?.action ?? confirmedAction;
    if (action !== null) void reconcile(action, 'État à vérifier');
  };

  if (quoteId === null) {
    return (
      <ErpPageShell
        title="Devis"
        state="empty"
        emptyLabel="Devis introuvable"
      />
    );
  }

  if (loadState === 'loading') {
    return (
      <ErpPageShell
        title="Devis"
        state="loading"
        loadingLabel="Chargement du devis"
      />
    );
  }

  if (loadState === 'error') {
    return (
      <ErpPageShell
        title="Devis"
        state="error"
        errorLabel="Impossible de charger le devis"
        retryLabel="Réessayer"
        onRetry={() => setLoadGeneration((value) => value + 1)}
      />
    );
  }

  if (loadState === 'not-found' || quote === null) {
    return (
      <ErpPageShell
        title="Devis"
        state="empty"
        emptyLabel="Devis introuvable"
      />
    );
  }

  const appearance = getQuoteStatusAppearance(quote.status);
  const dialogCopy =
    confirmedAction === null ? null : ACTION_COPY[confirmedAction];
  const dialogTitle =
    reconciliation?.phase === 'failed'
      ? 'Échec de vérification'
      : reconciliation?.phase === 'needs-ack'
        ? 'Vérification requise'
        : (dialogCopy?.title ?? 'Confirmer');
  const dialogMessage =
    reconciliation === null
      ? (dialogCopy?.message ?? '')
      : `${reconciliation.message}. Commande confirmée : ${dialogCopy?.button ?? ''}.`;

  return (
    <ErpPageShell
      title={quote.number}
      description={`${customerName} · Émission ${formatQuoteCivilDate(
        quote.issueDate,
      )} · Validité ${formatQuoteCivilDate(
        quote.validUntil,
      )} · ${formatMadCents(quote.totalTtcCents)} TTC`}
      actions={
        policy === null ? null : (
          <StyledActions>
            <ErpStatusBadge label={appearance.label} tone={appearance.tone} />
            {policy.edit ? (
              <Button
                title="Modifier"
                ariaLabel="Modifier"
                variant="secondary"
                onClick={() => {
                  if (!hasSalesPermission()) return;
                  if (onEdit !== undefined) onEdit(quote.id);
                  else
                    void navigate(
                      generatePath(erpMarocPaths.quoteEdit, { id: quote.id }),
                    );
                }}
              />
            ) : null}
            {(['send', 'accept', 'reject', 'convert'] as const).map((action) =>
              policy[action] ? (
                <Button
                  key={action}
                  title={ACTION_COPY[action].button}
                  ariaLabel={ACTION_COPY[action].button}
                  accent={action === 'reject' ? 'danger' : 'blue'}
                  disabled={mutationLock.current}
                  onClick={() => {
                    if (!hasSalesPermission() || mutationLock.current) return;
                    setActionMessage(null);
                    setConfirmedAction(action);
                  }}
                />
              ) : null,
            )}
          </StyledActions>
        )
      }
    >
      {actionMessage === null ? null : (
        <StyledAlert role="alert">{actionMessage}</StyledAlert>
      )}
      <ErpQuoteDetailContent quote={quote} customerName={customerName} />
      <ErpConfirmDialog
        isOpen={confirmedAction !== null}
        title={dialogTitle}
        message={dialogMessage}
        confirmLabel={
          reconciliation?.phase === 'failed'
            ? 'Relancer la vérification'
            : reconciliation?.phase === 'needs-ack'
              ? 'J’ai vérifié'
              : dialogCopy?.button
        }
        destructive={confirmedAction === 'reject'}
        confirmDisabled={reconciliation?.phase === 'refreshing'}
        isConfirming={isMutating || reconciliation?.phase === 'refreshing'}
        onCancel={() => {
          if (mutationLock.current) return;
          setConfirmedAction(null);
        }}
        onConfirm={() => {
          if (reconciliation?.phase === 'failed') retryReconciliation();
          else if (reconciliation?.phase === 'needs-ack')
            acknowledgeReconciliation();
          else if (confirmedAction !== null) void runAction(confirmedAction);
        }}
      />
    </ErpPageShell>
  );
};
