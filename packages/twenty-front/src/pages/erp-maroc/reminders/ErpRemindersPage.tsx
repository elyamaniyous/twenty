import type { ErpMarocRequiredMutationIntent } from '@/erp-maroc/api/erpMarocClient';
import { ErpConfirmDialog } from '@/erp-maroc/components/ErpConfirmDialog';
import { ErpFormDrawer } from '@/erp-maroc/components/ErpFormDrawer';
import {
  ErpOperationalTable,
  type ErpOperationalTableColumn,
} from '@/erp-maroc/components/ErpOperationalTable';
import { ErpPageShell } from '@/erp-maroc/components/ErpPageShell';
import {
  ErpStatusBadge,
  type ErpStatusTone,
} from '@/erp-maroc/components/ErpStatusBadge';
import { useErpMarocContext } from '@/erp-maroc/context/useErpMarocContext';
import {
  getReminderCommandPolicy,
  getReminderMutationMessage,
} from '@/erp-maroc/reminders/reminderCommandPolicy';
import {
  createReminderScanRunner,
  type ReminderScanRunner,
  type ReminderScanSnapshot,
} from '@/erp-maroc/reminders/runReminderScan';
import { formatMadCents } from '@/erp-maroc/utils/money';
import {
  canonicalizeErpQueryState,
  updateErpQueryState,
} from '@/erp-maroc/utils/queryState';
import { styled } from '@linaria/react';
import { useEffect, useMemo, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import {
  erpReminderLevelSchema,
  erpReminderPageSchema,
  erpReminderSchema,
  erpReminderStatusSchema,
  type ErpReminder,
  type ErpReminderPage,
} from 'twenty-shared/erp-maroc';
import {
  IconCheck,
  IconEye,
  IconPlayerPlay,
  IconRefresh,
  IconX,
} from 'twenty-ui/display';
import { Button } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';

type ListState = 'loading' | 'ready' | 'error';
type ReminderMutation = 'approve' | 'cancel';

const EMPTY_PAGE: ErpReminderPage = { items: [], nextCursor: null };

const STATUS_APPEARANCE: Record<
  ErpReminder['status'],
  { label: string; tone: ErpStatusTone }
> = {
  PROPOSED: { label: 'À approuver', tone: 'warning' },
  APPROVED: { label: 'Approuvée', tone: 'info' },
  PROCESSING: { label: 'En cours d’envoi', tone: 'info' },
  SENT: { label: 'Envoyée', tone: 'success' },
  CANCELLED: { label: 'Annulée', tone: 'neutral' },
  SUPERSEDED: { label: 'Obsolète', tone: 'neutral' },
  FAILED: { label: 'Échec', tone: 'danger' },
  RECONCILIATION_REQUIRED: {
    label: 'Réconciliation requise',
    tone: 'danger',
  },
};

const LEVEL_LABELS: Record<ErpReminder['level'], string> = {
  LEVEL_1: '1er rappel',
  LEVEL_2: '2e rappel',
  LEVEL_3: 'Mise en demeure',
};

const StyledToolbar = styled.div`
  align-items: center;
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  flex: 0 0 auto;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[2]};
  padding: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[3]};
`;

const StyledFilter = styled.label`
  align-items: center;
  color: ${themeCssVariables.font.color.secondary};
  display: flex;
  font-size: ${themeCssVariables.font.size.sm};
  gap: ${themeCssVariables.spacing[1]};
`;

const StyledSelect = styled.select`
  background: ${themeCssVariables.background.primary};
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.sm};
  color: ${themeCssVariables.font.color.primary};
  height: 32px;
  padding: 0 ${themeCssVariables.spacing[2]};
`;

const StyledPagination = styled.div`
  align-items: center;
  border-top: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  flex: 0 0 auto;
  gap: ${themeCssVariables.spacing[2]};
  justify-content: flex-end;
  padding: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[3]};
`;

const StyledScanStatus = styled.div`
  align-items: center;
  background: ${themeCssVariables.background.secondary};
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  color: ${themeCssVariables.font.color.secondary};
  display: flex;
  flex: 0 0 auto;
  font-size: ${themeCssVariables.font.size.sm};
  gap: ${themeCssVariables.spacing[2]};
  justify-content: space-between;
  min-height: 36px;
  padding: 0 ${themeCssVariables.spacing[3]};
`;

const StyledDrawerBody = styled.div`
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[4]};
  min-height: 0;
  overflow-y: auto;
  padding: ${themeCssVariables.spacing[4]};
`;

const StyledDetailList = styled.dl`
  display: grid;
  gap: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[3]};
  grid-template-columns: minmax(120px, 160px) minmax(0, 1fr);
  margin: 0;

  dt {
    color: ${themeCssVariables.font.color.secondary};
    font-size: ${themeCssVariables.font.size.sm};
  }

  dd {
    color: ${themeCssVariables.font.color.primary};
    margin: 0;
    overflow-wrap: anywhere;
  }
`;

const StyledMessage = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[2]};

  h3 {
    font-size: ${themeCssVariables.font.size.md};
    letter-spacing: 0;
    margin: 0;
  }

  p {
    line-height: 20px;
    margin: 0;
    white-space: pre-wrap;
  }
`;

const StyledNotice = styled.div<{ tone: 'info' | 'danger' }>`
  background: ${({ tone }) =>
    tone === 'danger'
      ? themeCssVariables.tag.background.red
      : themeCssVariables.tag.background.blue};
  border-radius: ${themeCssVariables.border.radius.sm};
  color: ${({ tone }) =>
    tone === 'danger'
      ? themeCssVariables.tag.text.red
      : themeCssVariables.tag.text.blue};
  font-size: ${themeCssVariables.font.size.sm};
  line-height: 20px;
  padding: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[3]};
`;

const StyledDrawerActions = styled.div`
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
`;

const scanSummary = (snapshot: ReminderScanSnapshot) => {
  const created = snapshot.counters.created;
  const createdLabel = `${created} ${created === 1 ? 'relance créée' : 'relances créées'}`;

  if (snapshot.status === 'running') {
    return snapshot.stopRequested
      ? `Arrêt demandé après la page en cours · ${createdLabel}`
      : `Analyse en cours · ${snapshot.completedPages} page(s) terminée(s)`;
  }
  if (snapshot.status === 'completed') return createdLabel;
  if (snapshot.status === 'stopped') {
    return `Analyse arrêtée · ${createdLabel}`;
  }
  if (snapshot.status === 'error') return 'Analyse interrompue';

  return null;
};

export const ErpRemindersPage = () => {
  const { client, context } = useErpMarocContext();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [page, setPage] = useState<ErpReminderPage>(EMPTY_PAGE);
  const [listState, setListState] = useState<ListState>('loading');
  const [requestGeneration, setRequestGeneration] = useState(0);
  const [cursorHistory, setCursorHistory] = useState<Array<string | null>>([]);
  const [selectedReminder, setSelectedReminder] = useState<ErpReminder | null>(
    null,
  );
  const [confirmAction, setConfirmAction] = useState<ReminderMutation | null>(
    null,
  );
  const [isMutating, setIsMutating] = useState(false);
  const [mutationMessage, setMutationMessage] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState(false);
  const [mutationIntent, setMutationIntent] = useState<{
    action: ReminderMutation;
    intent: ErpMarocRequiredMutationIntent<ErpReminder>;
  } | null>(null);
  const [scanRunner, setScanRunner] = useState<ReminderScanRunner | null>(null);
  const [scanSnapshot, setScanSnapshot] = useState<ReminderScanSnapshot | null>(
    null,
  );
  const canonicalSearchParams = useMemo(
    () => canonicalizeErpQueryState('reminders', searchParams),
    [searchParams],
  );
  const cursor = canonicalSearchParams.get('cursor');
  const canManageReminders =
    context?.capabilities.manageReminders === true &&
    context.features.reminderManagement === true;
  const reminderDelivery = context?.features.reminderDelivery === true;

  const columns = useMemo<ErpOperationalTableColumn<ErpReminder>[]>(
    () => [
      {
        key: 'invoice',
        header: 'Facture',
        width: '180px',
        render: (row) => row.invoiceNumber,
      },
      {
        key: 'recipient',
        header: 'Destinataire',
        width: '240px',
        render: (row) => row.recipient ?? 'Adresse manquante',
      },
      {
        key: 'dueDate',
        header: 'Échéance',
        width: '130px',
        render: (row) => row.dueDate,
      },
      {
        key: 'level',
        header: 'Niveau',
        width: '150px',
        render: (row) => LEVEL_LABELS[row.level],
      },
      {
        key: 'outstanding',
        header: 'Reste dû',
        width: '150px',
        align: 'right',
        render: (row) => formatMadCents(row.outstandingCents),
      },
      {
        key: 'status',
        header: 'Statut',
        width: '190px',
        render: (row) => {
          const appearance = STATUS_APPEARANCE[row.status];
          return (
            <ErpStatusBadge label={appearance.label} tone={appearance.tone} />
          );
        },
      },
      {
        key: 'version',
        header: 'Version',
        width: '90px',
        align: 'right',
        render: (row) => `v${row.contentVersion}`,
      },
      {
        key: 'lastError',
        header: 'Dernier incident',
        width: '240px',
        render: (row) => row.lastError ?? '—',
      },
      {
        key: 'actions',
        header: 'Actions',
        width: '80px',
        align: 'right',
        render: (row) => (
          <Button
            title={`Ouvrir ${row.invoiceNumber}`}
            ariaLabel={`Ouvrir ${row.invoiceNumber}`}
            Icon={IconEye}
            variant="tertiary"
            onClick={() => {
              setMutationMessage(null);
              setMutationError(false);
              setSelectedReminder(row);
            }}
          />
        ),
      },
    ],
    [],
  );

  const updateFilters = (changes: Record<string, string | null>) => {
    const nextSearchParams = updateErpQueryState(
      'reminders',
      canonicalSearchParams,
      changes,
    );
    const shouldResetHistory = ['status', 'level', 'limit'].some(
      (key) => canonicalSearchParams.get(key) !== nextSearchParams.get(key),
    );

    if (shouldResetHistory) setCursorHistory([]);
    setSearchParams(nextSearchParams);
  };

  useEffect(() => {
    if (
      location.pathname === '/erp-maroc/reminders' &&
      searchParams.toString() !== canonicalSearchParams.toString()
    ) {
      setSearchParams(canonicalSearchParams, { replace: true });
    }
  }, [canonicalSearchParams, location.pathname, searchParams, setSearchParams]);

  useEffect(() => {
    let isMounted = true;
    setListState('loading');

    void client
      .request({
        method: 'GET',
        path: '/reminders',
        query:
          canonicalSearchParams.size === 0
            ? undefined
            : Object.fromEntries(canonicalSearchParams),
        schema: erpReminderPageSchema,
      })
      .then((nextPage) => {
        if (!isMounted) return;
        setPage(nextPage);
        setListState('ready');
      })
      .catch(() => {
        if (!isMounted) return;
        setListState('error');
      });

    return () => {
      isMounted = false;
    };
  }, [canonicalSearchParams, client, requestGeneration]);

  const refreshAfterScan = (runner: ReminderScanRunner) => {
    const status = runner.getSnapshot().status;
    if (status === 'completed' || status === 'stopped') {
      setRequestGeneration((generation) => generation + 1);
    }
  };

  const startScan = () => {
    if (!canManageReminders || scanSnapshot?.status === 'running') return;

    const runner = createReminderScanRunner({
      client,
      onChange: setScanSnapshot,
    });
    setScanRunner(runner);
    void runner.start().then(() => refreshAfterScan(runner));
  };

  const retryScanPage = () => {
    const runner = scanRunner;
    if (runner === null) return;

    void runner.retryPage().then(() => refreshAfterScan(runner));
  };

  const applyMutationResult = (
    action: ReminderMutation,
    previous: ErpReminder,
    result: ErpReminder,
  ) => {
    setPage((current) => ({
      ...current,
      items: current.items.map((item) =>
        item.id === result.id ? result : item,
      ),
    }));
    setSelectedReminder(result);
    setMutationMessage(
      getReminderMutationMessage({
        action,
        resultStatus: result.status,
        previousVersion: previous.contentVersion,
        resultVersion: result.contentVersion,
      }),
    );
  };

  const executeMutation = async (action: ReminderMutation, retry: boolean) => {
    if (selectedReminder === null) return;

    let pending = mutationIntent;
    if (!retry || pending === null || pending.action !== action) {
      pending = {
        action,
        intent: client.createMutationIntent({
          method: 'POST',
          path: `/reminders/${selectedReminder.id}/${action}`,
          schema: erpReminderSchema,
        }),
      };
      setMutationIntent(pending);
    }

    setIsMutating(true);
    setMutationError(false);
    try {
      const result = await (retry
        ? pending.intent.retry()
        : pending.intent.execute());
      applyMutationResult(action, selectedReminder, result);
      setMutationIntent(null);
      setConfirmAction(null);
    } catch {
      setMutationError(true);
      setConfirmAction(null);
    } finally {
      setIsMutating(false);
    }
  };

  const selectedPolicy =
    selectedReminder === null
      ? { canApprove: false, canCancel: false }
      : getReminderCommandPolicy({
          status: selectedReminder.status,
          nextAttemptAt: selectedReminder.nextAttemptAt,
          canManageReminders,
          reminderDelivery,
        });
  const selectedStatus =
    selectedReminder === null
      ? null
      : STATUS_APPEARANCE[selectedReminder.status];
  const summary = scanSnapshot === null ? null : scanSummary(scanSnapshot);

  const goToNextPage = () => {
    if (page.nextCursor === null || listState !== 'ready') return;
    setCursorHistory((history) => [...history, cursor]);
    setSearchParams(
      updateErpQueryState('reminders', canonicalSearchParams, {
        cursor: page.nextCursor,
      }),
    );
  };

  const goToPreviousPage = () => {
    const previousCursor = cursorHistory.at(-1);
    if (previousCursor === undefined || listState !== 'ready') return;
    setCursorHistory((history) => history.slice(0, -1));
    setSearchParams(
      updateErpQueryState('reminders', canonicalSearchParams, {
        cursor: previousCursor,
      }),
    );
  };

  return (
    <ErpPageShell
      title="Relances"
      description="Suivi et validation humaine des relances clients"
      actions={
        canManageReminders ? (
          <Button
            title="Analyser les impayés"
            ariaLabel="Analyser les impayés"
            Icon={IconPlayerPlay}
            accent="blue"
            disabled={scanSnapshot?.status === 'running'}
            onClick={startScan}
          />
        ) : null
      }
    >
      <StyledToolbar>
        <StyledFilter>
          Statut
          <StyledSelect
            aria-label="Statut des relances"
            value={canonicalSearchParams.get('status') ?? 'all'}
            disabled={listState === 'loading'}
            onChange={(event) =>
              updateFilters({
                status:
                  event.target.value === 'all' ? null : event.target.value,
              })
            }
          >
            <option value="all">Tous</option>
            {erpReminderStatusSchema.options.map((status) => (
              <option key={status} value={status}>
                {STATUS_APPEARANCE[status].label}
              </option>
            ))}
          </StyledSelect>
        </StyledFilter>
        <StyledFilter>
          Niveau
          <StyledSelect
            aria-label="Niveau des relances"
            value={canonicalSearchParams.get('level') ?? 'all'}
            disabled={listState === 'loading'}
            onChange={(event) =>
              updateFilters({
                level: event.target.value === 'all' ? null : event.target.value,
              })
            }
          >
            <option value="all">Tous</option>
            {erpReminderLevelSchema.options.map((level) => (
              <option key={level} value={level}>
                {LEVEL_LABELS[level]}
              </option>
            ))}
          </StyledSelect>
        </StyledFilter>
        <StyledFilter>
          Par page
          <StyledSelect
            aria-label="Relances par page"
            value={canonicalSearchParams.get('limit') ?? '50'}
            disabled={listState === 'loading'}
            onChange={(event) =>
              updateFilters({
                limit: event.target.value === '50' ? null : event.target.value,
              })
            }
          >
            <option value="25">25</option>
            <option value="50">50</option>
            <option value="100">100</option>
          </StyledSelect>
        </StyledFilter>
      </StyledToolbar>
      {summary === null ? null : (
        <StyledScanStatus role="status" aria-live="polite">
          <span>{summary}</span>
          {scanSnapshot?.status === 'running' ? (
            <Button
              title="Arrêter après cette page"
              ariaLabel="Arrêter après cette page"
              Icon={IconX}
              variant="secondary"
              disabled={scanSnapshot.stopRequested}
              onClick={() => scanRunner?.stop()}
            />
          ) : scanSnapshot?.status === 'error' ? (
            <Button
              title="Réessayer cette page"
              ariaLabel="Réessayer cette page"
              Icon={IconRefresh}
              variant="secondary"
              onClick={retryScanPage}
            />
          ) : null}
        </StyledScanStatus>
      )}
      <ErpOperationalTable
        ariaLabel="Relances"
        columns={columns}
        rows={page.items}
        getRowKey={(row) => row.id}
        state={listState}
        loadingLabel="Chargement des relances"
        emptyLabel="Aucune relance sur la page chargée"
        errorLabel="Impossible de charger les relances"
        retryLabel="Réessayer"
        onRetry={() => setRequestGeneration((generation) => generation + 1)}
      />
      <StyledPagination>
        <Button
          title="Page précédente"
          ariaLabel="Page précédente"
          Icon={IconRefresh}
          variant="secondary"
          disabled={listState !== 'ready' || cursorHistory.length === 0}
          onClick={goToPreviousPage}
        />
        <Button
          title="Page suivante"
          ariaLabel="Page suivante"
          Icon={IconRefresh}
          variant="secondary"
          disabled={listState !== 'ready' || page.nextCursor === null}
          onClick={goToNextPage}
        />
      </StyledPagination>

      <ErpFormDrawer
        isOpen={selectedReminder !== null}
        title={selectedReminder?.invoiceNumber ?? 'Relance'}
        description="Contenu figé au moment de la proposition"
        isBusy={isMutating}
        onClose={() => {
          setSelectedReminder(null);
          setMutationMessage(null);
          setMutationError(false);
          setMutationIntent(null);
        }}
        footer={
          selectedReminder === null ? undefined : (
            <StyledDrawerActions>
              {selectedPolicy.canCancel ? (
                <Button
                  title="Annuler la relance"
                  ariaLabel="Annuler la relance"
                  Icon={IconX}
                  accent="danger"
                  disabled={isMutating}
                  onClick={() => setConfirmAction('cancel')}
                />
              ) : null}
              {selectedPolicy.canApprove ? (
                <Button
                  title="Approuver"
                  ariaLabel="Approuver"
                  Icon={IconCheck}
                  accent="blue"
                  disabled={isMutating}
                  onClick={() => setConfirmAction('approve')}
                />
              ) : null}
            </StyledDrawerActions>
          )
        }
      >
        {selectedReminder === null ? null : (
          <StyledDrawerBody>
            {selectedReminder.status === 'RECONCILIATION_REQUIRED' ? (
              <StyledNotice tone="danger">
                Réconciliation opérateur requise
              </StyledNotice>
            ) : null}
            {mutationMessage === null ? null : (
              <StyledNotice tone="info">{mutationMessage}</StyledNotice>
            )}
            {mutationError ? (
              <StyledNotice tone="danger">
                L’opération n’a pas pu être confirmée.
                <Button
                  title="Réessayer l’opération"
                  ariaLabel="Réessayer l’opération"
                  Icon={IconRefresh}
                  variant="secondary"
                  disabled={isMutating}
                  onClick={() => {
                    const pending = mutationIntent;
                    if (pending !== null) {
                      void executeMutation(pending.action, true);
                    }
                  }}
                />
              </StyledNotice>
            ) : null}
            <StyledDetailList>
              <dt>Statut d’envoi</dt>
              <dd>{selectedStatus?.label}</dd>
              <dt>Destinataire</dt>
              <dd>{selectedReminder.recipient ?? 'Adresse manquante'}</dd>
              <dt>Échéance</dt>
              <dd>{selectedReminder.dueDate}</dd>
              <dt>Niveau</dt>
              <dd>{LEVEL_LABELS[selectedReminder.level]}</dd>
              <dt>Reste dû</dt>
              <dd>{formatMadCents(selectedReminder.outstandingCents)}</dd>
              <dt>Total facture</dt>
              <dd>{formatMadCents(selectedReminder.totalTtcCents)}</dd>
              <dt>Version du contenu</dt>
              <dd>v{selectedReminder.contentVersion}</dd>
              <dt>Mode de paiement</dt>
              <dd>{selectedReminder.paymentMethod ?? 'Non précisé'}</dd>
              <dt>Référence paiement</dt>
              <dd>{selectedReminder.paymentReference ?? 'Non précisée'}</dd>
              <dt>Tentatives</dt>
              <dd>{selectedReminder.attempts}</dd>
              <dt>Proposée le</dt>
              <dd>{selectedReminder.proposedAt}</dd>
              <dt>Approuvée le</dt>
              <dd>{selectedReminder.approvedAt ?? '—'}</dd>
              <dt>Envoyée le</dt>
              <dd>{selectedReminder.sentAt ?? '—'}</dd>
              <dt>Dernier incident</dt>
              <dd>{selectedReminder.lastError ?? '—'}</dd>
            </StyledDetailList>
            <StyledMessage>
              <h3>{selectedReminder.subject}</h3>
              <p>{selectedReminder.body}</p>
            </StyledMessage>
          </StyledDrawerBody>
        )}
      </ErpFormDrawer>

      <ErpConfirmDialog
        isOpen={confirmAction !== null}
        title={
          confirmAction === 'approve'
            ? 'Approuver cette relance'
            : 'Annuler cette relance'
        }
        message={
          confirmAction === 'approve'
            ? 'La relance sera placée dans la file d’envoi email.'
            : 'Cette relance ne sera pas envoyée.'
        }
        confirmLabel={confirmAction === 'approve' ? 'Approuver' : 'Annuler'}
        destructive={confirmAction === 'cancel'}
        isConfirming={isMutating}
        onCancel={() => setConfirmAction(null)}
        onConfirm={() => {
          if (confirmAction !== null) {
            void executeMutation(confirmAction, false);
          }
        }}
      />
    </ErpPageShell>
  );
};
