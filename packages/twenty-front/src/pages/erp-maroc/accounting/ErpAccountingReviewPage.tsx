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
import { formatMadCents } from '@/erp-maroc/utils/money';
import { styled } from '@linaria/react';
import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  erpAccountingReviewAccountSchema,
  erpAccountingReviewDossierSchema,
  erpAccountingReviewExportSchema,
  erpAccountingReviewTaskSchema,
  erpExerciseListSchema,
  type ErpAccountingReviewAccount,
  type ErpAccountingReviewDossier,
  type ErpAccountingReviewTask,
  type ErpExercise,
} from 'twenty-shared/erp-maroc';
import {
  IconCheck,
  IconDownload,
  IconPencil,
  IconRefresh,
  IconX,
} from 'twenty-ui/display';
import { Button } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';

type View = 'cycles' | 'accounts' | 'blockers';
type LoadState = 'loading' | 'ready' | 'error';
type Editor =
  | { kind: 'task'; value: ErpAccountingReviewTask }
  | { kind: 'account'; value: ErpAccountingReviewAccount }
  | null;

type AccountRow = ErpAccountingReviewAccount & {
  cycleLabel: string;
};

const statusAppearance: Record<
  ErpAccountingReviewTask['status'],
  { label: string; tone: ErpStatusTone }
> = {
  TODO: { label: 'À faire', tone: 'neutral' },
  IN_PROGRESS: { label: 'En cours', tone: 'info' },
  READY_FOR_REVIEW: { label: 'À valider', tone: 'warning' },
  DONE: { label: 'Validé', tone: 'success' },
  REJECTED: { label: 'Rejeté', tone: 'danger' },
  NOT_APPLICABLE: { label: 'Non applicable', tone: 'neutral' },
};

const controlCss = `
  background: ${themeCssVariables.background.primary};
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.sm};
  box-sizing: border-box;
  color: ${themeCssVariables.font.color.primary};
  font: inherit;
  min-width: 0;
`;

const StyledToolbar = styled.div`
  align-items: center;
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  flex: 0 0 auto;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[2]};
  justify-content: space-between;
  min-height: 44px;
  padding: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[3]};
`;

const StyledToolbarGroup = styled.div`
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[2]};
`;

const StyledSelect = styled.select`
  ${controlCss}
  height: 32px;
  padding: 0 ${themeCssVariables.spacing[2]};
`;

const StyledInput = styled.input`
  ${controlCss}
  height: 32px;
  padding: 0 ${themeCssVariables.spacing[2]};
`;

const StyledTextarea = styled.textarea`
  ${controlCss}
  min-height: 72px;
  padding: ${themeCssVariables.spacing[2]};
  resize: vertical;
`;

const StyledTabs = styled.div`
  align-items: center;
  display: flex;
  gap: ${themeCssVariables.spacing[1]};
`;

const StyledTab = styled.button<{ active: boolean }>`
  background: ${({ active }) =>
    active
      ? themeCssVariables.background.quaternary
      : themeCssVariables.background.transparent.light};
  border: 0;
  border-radius: ${themeCssVariables.border.radius.sm};
  color: ${({ active }) =>
    active
      ? themeCssVariables.font.color.primary
      : themeCssVariables.font.color.secondary};
  cursor: pointer;
  font-size: ${themeCssVariables.font.size.sm};
  font-weight: ${({ active }) =>
    active
      ? themeCssVariables.font.weight.semiBold
      : themeCssVariables.font.weight.regular};
  height: 30px;
  padding: 0 ${themeCssVariables.spacing[2]};
`;

const StyledMetrics = styled.section`
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: grid;
  flex: 0 0 auto;
  grid-template-columns: repeat(4, minmax(140px, 1fr));
  overflow-x: auto;
`;

const StyledMetric = styled.div`
  border-right: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[1]};
  min-width: 140px;
  padding: ${themeCssVariables.spacing[3]};

  &:last-child {
    border-right: 0;
  }
`;

const StyledMetricLabel = styled.span`
  color: ${themeCssVariables.font.color.secondary};
  font-size: ${themeCssVariables.font.size.sm};
`;

const StyledMetricValue = styled.strong`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.xl};
  letter-spacing: 0;
`;

const StyledNotice = styled.div<{ danger: boolean }>`
  background: ${({ danger }) =>
    danger
      ? themeCssVariables.tag.background.red
      : themeCssVariables.tag.background.green};
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  color: ${({ danger }) =>
    danger ? themeCssVariables.tag.text.red : themeCssVariables.tag.text.green};
  flex: 0 0 auto;
  font-size: ${themeCssVariables.font.size.sm};
  padding: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[3]};
`;

const StyledEditor = styled.form`
  border-bottom: 1px solid ${themeCssVariables.border.color.medium};
  display: grid;
  gap: ${themeCssVariables.spacing[2]};
  grid-template-columns:
    180px 220px 170px minmax(220px, 1fr) minmax(220px, 1fr)
    auto;
  padding: ${themeCssVariables.spacing[3]};

  @media (max-width: 1100px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

const StyledField = styled.label`
  color: ${themeCssVariables.font.color.secondary};
  display: flex;
  flex-direction: column;
  font-size: ${themeCssVariables.font.size.sm};
  gap: ${themeCssVariables.spacing[1]};
  min-width: 0;
`;

const StyledEditorActions = styled.div`
  align-items: flex-end;
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[1]};
`;

const StyledRowActions = styled.div`
  align-items: center;
  display: flex;
  gap: ${themeCssVariables.spacing[1]};
`;

const evidenceReference = (evidence: unknown): string => {
  if (
    evidence !== null &&
    typeof evidence === 'object' &&
    'reference' in evidence &&
    typeof evidence.reference === 'string'
  ) {
    return evidence.reference;
  }
  return '';
};

const downloadBase64File = (
  filename: string,
  contentType: string,
  contentBase64: string,
) => {
  const binary = window.atob(contentBase64);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  const url = URL.createObjectURL(new Blob([bytes], { type: contentType }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};

export const ErpAccountingReviewPage = () => {
  const { client, context } = useErpMarocContext();
  const [exercises, setExercises] = useState<ErpExercise[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [dossier, setDossier] = useState<ErpAccountingReviewDossier | null>(
    null,
  );
  const [view, setView] = useState<View>('cycles');
  const [state, setState] = useState<LoadState>('loading');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageDanger, setMessageDanger] = useState(false);
  const [editor, setEditor] = useState<Editor>(null);
  const [editorStatus, setEditorStatus] =
    useState<ErpAccountingReviewTask['status']>('TODO');
  const [editorAssignee, setEditorAssignee] = useState('');
  const [editorDueDate, setEditorDueDate] = useState('');
  const [editorNotes, setEditorNotes] = useState('');
  const [editorEvidence, setEditorEvidence] = useState('');

  const canAccount =
    context?.role === 'OWNER' ||
    context?.role === 'ADMIN' ||
    context?.role === 'COMPTABLE';
  const canEdit = canAccount && dossier?.exercise.status === 'OPEN';

  const notify = useCallback((text: string, danger = false) => {
    setMessage(text);
    setMessageDanger(danger);
  }, []);

  const loadDossier = useCallback(
    async (exerciseId: string) => {
      if (exerciseId === '') return;
      setState('loading');
      try {
        const nextDossier = await client.request({
          method: 'GET',
          path: `/accounting-compliance/exercises/${exerciseId}/review-dossier`,
          schema: erpAccountingReviewDossierSchema,
        });
        setDossier(nextDossier);
        setState('ready');
      } catch {
        setState('error');
      }
    },
    [client],
  );

  const load = useCallback(async () => {
    setState('loading');
    try {
      const nextExercises = await client.request({
        method: 'GET',
        path: '/accounting-compliance/exercises',
        schema: erpExerciseListSchema,
      });
      setExercises(nextExercises);
      const nextSelectedId = nextExercises.some(
        (exercise) => exercise.id === selectedId,
      )
        ? selectedId
        : (nextExercises[0]?.id ?? '');
      setSelectedId(nextSelectedId);
      if (nextSelectedId === '') {
        setDossier(null);
        setState('ready');
      } else {
        await loadDossier(nextSelectedId);
      }
    } catch {
      setState('error');
    }
  }, [client, loadDossier, selectedId]);

  useEffect(() => {
    void load();
  }, [load]);

  const accountRows = useMemo<AccountRow[]>(
    () =>
      dossier?.tasks.flatMap((task) =>
        (task.accounts ?? []).map((account) => ({
          ...account,
          cycleLabel: task.label,
        })),
      ) ?? [],
    [dossier],
  );
  const assigneeLabels = useMemo(
    () =>
      new Map(
        dossier?.assignees.map((assignee) => [
          assignee.twentyUserId,
          assignee.email ?? assignee.twentyUserId,
        ]) ?? [],
      ),
    [dossier?.assignees],
  );

  const openEditor = (
    kind: 'task' | 'account',
    value: ErpAccountingReviewTask | ErpAccountingReviewAccount,
  ) => {
    setEditor(
      kind === 'task'
        ? { kind, value: value as ErpAccountingReviewTask }
        : { kind, value: value as ErpAccountingReviewAccount },
    );
    setEditorStatus(value.status);
    setEditorAssignee(value.assignedToTwentyUserId ?? '');
    setEditorDueDate(value.dueDate ?? '');
    setEditorNotes(value.notes ?? '');
    setEditorEvidence(evidenceReference(value.evidence));
  };

  const refresh = async () => {
    if (selectedId === '' || busy || !canEdit) return;
    setBusy(true);
    try {
      const intent = client.createMutationIntent(
        {
          method: 'POST',
          path: `/accounting-compliance/exercises/${selectedId}/review-refresh`,
          schema: erpAccountingReviewDossierSchema,
          body: {},
        },
        { idempotency: 'required' },
      );
      setDossier(await intent.execute());
      setEditor(null);
      notify('Soldes et cycles de révision actualisés.');
    } catch {
      notify("Impossible d'actualiser le dossier de révision.", true);
    } finally {
      setBusy(false);
    }
  };

  const saveEditor = async (event: FormEvent) => {
    event.preventDefault();
    if (editor === null || busy || !canEdit) return;
    setBusy(true);
    try {
      const commonBody = {
        status: editorStatus,
        assignedToTwentyUserId: editorAssignee.trim() || null,
        dueDate: editorDueDate || null,
        notes: editorNotes.trim() || null,
        evidence: editorEvidence.trim()
          ? { reference: editorEvidence.trim() }
          : null,
      };
      if (editor.kind === 'task') {
        const intent = client.createMutationIntent(
          {
            method: 'PATCH',
            path: `/accounting-compliance/review-tasks/${editor.value.id}`,
            schema: erpAccountingReviewTaskSchema,
            body: { ...commonBody, isCritical: editor.value.isCritical },
          },
          { idempotency: 'required' },
        );
        await intent.execute();
      } else {
        const intent = client.createMutationIntent(
          {
            method: 'PATCH',
            path: `/accounting-compliance/review-accounts/${editor.value.id}`,
            schema: erpAccountingReviewAccountSchema,
            body: commonBody,
          },
          { idempotency: 'required' },
        );
        await intent.execute();
      }
      setEditor(null);
      notify('Contrôle de révision enregistré.');
      await loadDossier(selectedId);
    } catch {
      notify("Impossible d'enregistrer ce contrôle.", true);
    } finally {
      setBusy(false);
    }
  };

  const decideTask = async (decision: 'APPROVE' | 'REJECT') => {
    if (editor?.kind !== 'task' || busy || !canEdit) return;
    setBusy(true);
    try {
      const intent = client.createMutationIntent(
        {
          method: 'POST',
          path: `/accounting-compliance/review-tasks/${editor.value.id}/decision`,
          schema: erpAccountingReviewTaskSchema,
          body: {
            decision,
            reason: editorNotes.trim() || null,
          },
        },
        { idempotency: 'required' },
      );
      await intent.execute();
      setEditor(null);
      notify(decision === 'APPROVE' ? 'Cycle validé.' : 'Cycle rejeté.');
      await loadDossier(selectedId);
    } catch {
      notify(
        decision === 'APPROVE'
          ? 'Tous les comptes du cycle doivent être justifiés.'
          : 'Un motif de rejet est obligatoire.',
        true,
      );
    } finally {
      setBusy(false);
    }
  };

  const exportDossier = async (format: 'pdf' | 'xlsx') => {
    if (selectedId === '' || busy) return;
    setBusy(true);
    try {
      const file = await client.request({
        method: 'GET',
        path: `/accounting-compliance/exercises/${selectedId}/review-export?format=${format}`,
        schema: erpAccountingReviewExportSchema,
      });
      downloadBase64File(file.filename, file.contentType, file.contentBase64);
      notify(`Export ${format.toUpperCase()} généré.`);
    } catch {
      notify("Impossible de générer l'export.", true);
    } finally {
      setBusy(false);
    }
  };

  const taskColumns = useMemo<
    ErpOperationalTableColumn<ErpAccountingReviewTask>[]
  >(
    () => [
      {
        key: 'cycle',
        header: 'Cycle',
        width: '280px',
        render: (task) => `${task.code} · ${task.label}`,
      },
      {
        key: 'status',
        header: 'Statut',
        width: '150px',
        render: (task) => <ErpStatusBadge {...statusAppearance[task.status]} />,
      },
      {
        key: 'accounts',
        header: 'Comptes',
        width: '100px',
        align: 'right',
        render: (task) => String(task.accounts?.length ?? 0),
      },
      {
        key: 'assignee',
        header: 'Responsable',
        width: '210px',
        render: (task) =>
          task.assignedToTwentyUserId === null
            ? '—'
            : (assigneeLabels.get(task.assignedToTwentyUserId) ??
              task.assignedToTwentyUserId),
      },
      {
        key: 'dueDate',
        header: 'Échéance',
        width: '130px',
        render: (task) => task.dueDate ?? '—',
      },
      {
        key: 'critical',
        header: 'Clôture',
        width: '110px',
        render: (task) => (task.isCritical ? 'Bloquant' : 'Suivi'),
      },
      {
        key: 'actions',
        header: 'Actions',
        width: '90px',
        render: (task) => (
          <StyledRowActions>
            <Button
              title="Ouvrir le cycle"
              ariaLabel={`Ouvrir le cycle ${task.label}`}
              Icon={IconPencil}
              variant="secondary"
              disabled={!canEdit || busy}
              onClick={() => openEditor('task', task)}
            />
          </StyledRowActions>
        ),
      },
    ],
    [assigneeLabels, busy, canEdit],
  );

  const accountColumns = useMemo<ErpOperationalTableColumn<AccountRow>[]>(
    () => [
      {
        key: 'account',
        header: 'Compte',
        width: '130px',
        render: (account) => account.accountCode,
      },
      {
        key: 'label',
        header: 'Libellé',
        width: '280px',
        render: (account) => account.accountLabel,
      },
      {
        key: 'cycle',
        header: 'Cycle',
        width: '200px',
        render: (account) => account.cycleLabel,
      },
      {
        key: 'balance',
        header: 'Solde',
        width: '150px',
        align: 'right',
        render: (account) => formatMadCents(account.balanceCents),
      },
      {
        key: 'status',
        header: 'Statut',
        width: '150px',
        render: (account) => (
          <ErpStatusBadge {...statusAppearance[account.status]} />
        ),
      },
      {
        key: 'assignee',
        header: 'Responsable',
        width: '210px',
        render: (account) =>
          account.assignedToTwentyUserId === null
            ? '—'
            : (assigneeLabels.get(account.assignedToTwentyUserId) ??
              account.assignedToTwentyUserId),
      },
      {
        key: 'dueDate',
        header: 'Échéance',
        width: '130px',
        render: (account) => account.dueDate ?? '—',
      },
      {
        key: 'actions',
        header: 'Actions',
        width: '90px',
        render: (account) => (
          <StyledRowActions>
            <Button
              title="Justifier le compte"
              ariaLabel={`Justifier le compte ${account.accountCode}`}
              Icon={IconPencil}
              variant="secondary"
              disabled={!canEdit || busy}
              onClick={() => openEditor('account', account)}
            />
          </StyledRowActions>
        ),
      },
    ],
    [assigneeLabels, busy, canEdit],
  );

  const blockerColumns = useMemo<
    ErpOperationalTableColumn<ErpAccountingReviewDossier['blockers'][number]>[]
  >(
    () => [
      {
        key: 'type',
        header: 'Type',
        width: '140px',
        render: (blocker) =>
          blocker.type === 'TASK' ? 'Cycle critique' : 'Compte',
      },
      {
        key: 'label',
        header: 'Point bloquant',
        width: '520px',
        render: (blocker) => blocker.label,
      },
    ],
    [],
  );

  const pageState =
    state === 'loading'
      ? 'loading'
      : state === 'error'
        ? 'error'
        : exercises.length === 0
          ? 'empty'
          : 'ready';

  return (
    <ErpPageShell
      title="Dossier de révision comptable"
      description="Justification des comptes, validation des cycles et contrôle de clôture"
      state={pageState}
      loadingLabel="Chargement du dossier de révision"
      emptyLabel="Aucun exercice comptable disponible"
      errorLabel="Impossible de charger le dossier de révision"
      onRetry={() => void load()}
      actions={
        <StyledToolbarGroup>
          <Button
            title="Exporter en Excel"
            ariaLabel="Exporter le dossier de révision en Excel"
            Icon={IconDownload}
            variant="secondary"
            disabled={busy || dossier === null}
            onClick={() => void exportDossier('xlsx')}
          />
          <Button
            title="Exporter en PDF"
            ariaLabel="Exporter le dossier de révision en PDF"
            Icon={IconDownload}
            variant="secondary"
            disabled={busy || dossier === null}
            onClick={() => void exportDossier('pdf')}
          />
          <Button
            title="Actualiser les soldes"
            ariaLabel="Actualiser les soldes du dossier de révision"
            Icon={IconRefresh}
            accent="blue"
            disabled={busy || !canEdit || selectedId === ''}
            onClick={() => void refresh()}
          />
        </StyledToolbarGroup>
      }
    >
      <StyledToolbar>
        <StyledToolbarGroup>
          <StyledSelect
            aria-label="Exercice comptable"
            value={selectedId}
            onChange={(event) => {
              const id = event.target.value;
              setSelectedId(id);
              setEditor(null);
              void loadDossier(id);
            }}
          >
            {exercises.map((exercise) => (
              <option key={exercise.id} value={exercise.id}>
                Exercice {exercise.annee} · {exercise.status}
              </option>
            ))}
          </StyledSelect>
          <StyledTabs role="tablist" aria-label="Vues de révision">
            {(
              [
                ['cycles', 'Cycles'],
                ['accounts', 'Comptes'],
                ['blockers', 'Bloquants'],
              ] as const
            ).map(([value, label]) => (
              <StyledTab
                key={value}
                type="button"
                role="tab"
                active={view === value}
                aria-selected={view === value}
                onClick={() => setView(value)}
              >
                {label}
              </StyledTab>
            ))}
          </StyledTabs>
        </StyledToolbarGroup>
        {dossier === null ? null : (
          <ErpStatusBadge
            label={
              dossier.summary.canClose ? 'Prêt à clôturer' : 'Révision requise'
            }
            tone={dossier.summary.canClose ? 'success' : 'warning'}
          />
        )}
      </StyledToolbar>

      {message === null ? null : (
        <StyledNotice danger={messageDanger}>{message}</StyledNotice>
      )}

      {dossier === null ? null : (
        <StyledMetrics>
          <StyledMetric>
            <StyledMetricLabel>Progression</StyledMetricLabel>
            <StyledMetricValue>
              {dossier.summary.progressBasisPoints / 100} %
            </StyledMetricValue>
          </StyledMetric>
          <StyledMetric>
            <StyledMetricLabel>Cycles validés</StyledMetricLabel>
            <StyledMetricValue>
              {dossier.summary.tasksApproved}/{dossier.summary.tasksTotal}
            </StyledMetricValue>
          </StyledMetric>
          <StyledMetric>
            <StyledMetricLabel>Comptes justifiés</StyledMetricLabel>
            <StyledMetricValue>
              {dossier.summary.accountsApproved}/{dossier.summary.accountsTotal}
            </StyledMetricValue>
          </StyledMetric>
          <StyledMetric>
            <StyledMetricLabel>Points bloquants</StyledMetricLabel>
            <StyledMetricValue>{dossier.summary.blockers}</StyledMetricValue>
          </StyledMetric>
        </StyledMetrics>
      )}

      {editor === null ? null : (
        <StyledEditor onSubmit={(event) => void saveEditor(event)}>
          <StyledField>
            Statut
            <StyledSelect
              value={editorStatus}
              onChange={(event) =>
                setEditorStatus(
                  event.target.value as ErpAccountingReviewTask['status'],
                )
              }
            >
              <option value="TODO">À faire</option>
              <option value="IN_PROGRESS">En cours</option>
              <option value="READY_FOR_REVIEW">À valider</option>
              <option value="DONE" disabled={editor.kind === 'task'}>
                Validé
              </option>
              <option value="REJECTED">Rejeté</option>
              <option value="NOT_APPLICABLE">Non applicable</option>
            </StyledSelect>
          </StyledField>
          <StyledField>
            Responsable
            <StyledSelect
              value={editorAssignee}
              onChange={(event) => setEditorAssignee(event.target.value)}
            >
              <option value="">Non affecté</option>
              {dossier?.assignees.map((assignee) => (
                <option
                  key={assignee.twentyUserId}
                  value={assignee.twentyUserId}
                >
                  {assignee.email ?? assignee.twentyUserId} · {assignee.role}
                </option>
              ))}
            </StyledSelect>
          </StyledField>
          <StyledField>
            Échéance
            <StyledInput
              type="date"
              value={editorDueDate}
              onChange={(event) => setEditorDueDate(event.target.value)}
            />
          </StyledField>
          <StyledField>
            Justification
            <StyledTextarea
              value={editorNotes}
              maxLength={4000}
              onChange={(event) => setEditorNotes(event.target.value)}
            />
          </StyledField>
          <StyledField>
            Pièce ou référence
            <StyledTextarea
              value={editorEvidence}
              maxLength={1000}
              placeholder="Document, URL ou référence interne"
              onChange={(event) => setEditorEvidence(event.target.value)}
            />
          </StyledField>
          <StyledEditorActions>
            <Button
              type="submit"
              title="Enregistrer"
              ariaLabel="Enregistrer le contrôle"
              Icon={IconCheck}
              accent="blue"
              disabled={busy}
            />
            {editor.kind === 'task' ? (
              <>
                <Button
                  title="Valider le cycle"
                  ariaLabel="Valider le cycle de révision"
                  Icon={IconCheck}
                  variant="secondary"
                  disabled={busy}
                  onClick={() => void decideTask('APPROVE')}
                />
                <Button
                  title="Rejeter le cycle"
                  ariaLabel="Rejeter le cycle de révision"
                  Icon={IconX}
                  accent="danger"
                  disabled={busy}
                  onClick={() => void decideTask('REJECT')}
                />
              </>
            ) : null}
            <Button
              title="Fermer"
              ariaLabel="Fermer l'éditeur"
              Icon={IconX}
              variant="secondary"
              disabled={busy}
              onClick={() => setEditor(null)}
            />
          </StyledEditorActions>
        </StyledEditor>
      )}

      {dossier === null ? null : view === 'cycles' ? (
        <ErpOperationalTable
          ariaLabel="Cycles de révision comptable"
          columns={taskColumns}
          rows={dossier.tasks}
          getRowKey={(task) => task.id}
          emptyLabel="Actualisez les soldes pour initialiser les cycles"
        />
      ) : view === 'accounts' ? (
        <ErpOperationalTable
          ariaLabel="Comptes à justifier"
          columns={accountColumns}
          rows={accountRows}
          getRowKey={(account) => account.id}
          emptyLabel="Aucun compte mouvementé sur cet exercice"
        />
      ) : (
        <ErpOperationalTable
          ariaLabel="Points bloquant la clôture"
          columns={blockerColumns}
          rows={dossier.blockers}
          getRowKey={(blocker) => `${blocker.type}-${blocker.id}`}
          emptyLabel="Aucun point bloquant"
        />
      )}
    </ErpPageShell>
  );
};
