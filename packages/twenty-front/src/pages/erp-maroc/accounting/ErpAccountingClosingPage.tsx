import { ErpConfirmDialog } from '@/erp-maroc/components/ErpConfirmDialog';
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
  type ChangeEvent,
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  erpAccountingPeriodSchema,
  erpAccountingReviewTaskListSchema,
  erpAccountingReviewTaskSchema,
  erpExerciseClosingResultSchema,
  erpExerciseListSchema,
  erpExerciseSchema,
  erpFecExportSchema,
  erpFecImportResultSchema,
  erpFinancialStatementsSchema,
  erpLiasseDeleteResultSchema,
  erpLiasseExportSchema,
  erpLiasseRowSchema,
  erpLiasseTableDetailSchema,
  erpLiasseTableSummaryListSchema,
  erpLiasseValidationSchema,
  erpRegulatorySubmissionListSchema,
  erpRegulatorySubmissionSchema,
  type ErpAccountingPeriod,
  type ErpAccountingReviewTask,
  type ErpExercise,
  type ErpFinancialStatements,
  type ErpLiasseFieldDefinition,
  type ErpLiasseRow,
  type ErpLiasseTableDetail,
  type ErpLiasseTableSummary,
  type ErpLiasseValidation,
  type ErpRegulatorySubmission,
} from 'twenty-shared/erp-maroc';
import {
  IconCheck,
  IconFileText,
  IconLock,
  IconPlus,
  IconRefresh,
  IconUpload,
  IconX,
} from 'twenty-ui/display';
import { Button } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';

type View = 'periods' | 'review' | 'statements' | 'liasse';
type ConfirmAction =
  | { kind: 'close-period'; period: ErpAccountingPeriod }
  | { kind: 'close-exercise'; exercise: ErpExercise }
  | { kind: 'delete-liasse-row'; tableCode: string; row: ErpLiasseRow }
  | null;

type LiasseRowEditor = {
  existing: boolean;
  rowCode: string;
  label: string;
  position: string;
  notes: string;
  values: Record<string, string>;
};

const exerciseAppearance: Record<
  ErpExercise['status'],
  { label: string; tone: ErpStatusTone }
> = {
  OPEN: { label: 'Ouvert', tone: 'info' },
  CLOSING: { label: 'En clôture', tone: 'warning' },
  CLOSED: { label: 'Clôturé', tone: 'success' },
};

const taskAppearance: Record<
  ErpAccountingReviewTask['status'],
  { label: string; tone: ErpStatusTone }
> = {
  TODO: { label: 'À faire', tone: 'neutral' },
  IN_PROGRESS: { label: 'En cours', tone: 'info' },
  DONE: { label: 'Terminé', tone: 'success' },
  NOT_APPLICABLE: { label: 'Non applicable', tone: 'warning' },
};

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

const controlCss = `
  background: ${themeCssVariables.background.primary};
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.sm};
  box-sizing: border-box;
  color: ${themeCssVariables.font.color.primary};
  font: inherit;
  height: 32px;
  min-width: 0;
  padding: 0 ${themeCssVariables.spacing[2]};
`;

const StyledSelect = styled.select`
  ${controlCss}
`;
const StyledInput = styled.input`
  ${controlCss}
`;

const StyledTextarea = styled.textarea`
  ${controlCss}
  height: 70px;
  padding-block: ${themeCssVariables.spacing[2]};
  resize: vertical;
`;

const StyledHiddenInput = styled.input`
  display: none;
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
  grid-template-columns: repeat(4, minmax(130px, 1fr));
  overflow-x: auto;
`;

const StyledMetric = styled.div`
  border-right: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[1]};
  min-width: 130px;
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

const StyledCreateForm = styled.form`
  align-items: center;
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: grid;
  gap: ${themeCssVariables.spacing[2]};
  grid-template-columns: 100px 150px 150px 36px 36px;
  padding: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[3]};

  @media (max-width: 760px) {
    grid-template-columns: 1fr 1fr;
  }
`;

const StyledEditor = styled.form`
  border-bottom: 1px solid ${themeCssVariables.border.color.medium};
  display: grid;
  gap: ${themeCssVariables.spacing[2]};
  grid-template-columns: 180px minmax(220px, 1fr) minmax(220px, 1fr) auto;
  padding: ${themeCssVariables.spacing[3]};

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`;

const StyledLiasseEditor = styled.form`
  border-bottom: 1px solid ${themeCssVariables.border.color.medium};
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[3]};
  padding: ${themeCssVariables.spacing[3]};
`;

const StyledLiasseFields = styled.div`
  display: grid;
  gap: ${themeCssVariables.spacing[2]};
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
`;

const StyledField = styled.label`
  color: ${themeCssVariables.font.color.secondary};
  display: flex;
  flex-direction: column;
  font-size: ${themeCssVariables.font.size.sm};
  gap: ${themeCssVariables.spacing[1]};
  min-width: 0;
`;

const StyledValidationPanel = styled.section`
  border-bottom: 1px solid ${themeCssVariables.border.color.medium};
  display: flex;
  flex: 0 0 auto;
  flex-direction: column;
`;

const StyledValidationSummary = styled.div`
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[3]};
  min-height: 40px;
  padding: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[3]};
`;

const StyledValidationIssues = styled.div`
  border-top: 1px solid ${themeCssVariables.border.color.light};
  display: grid;
  max-height: 180px;
  overflow-y: auto;
`;

const StyledValidationIssue = styled.button<{ danger: boolean }>`
  background: ${themeCssVariables.background.primary};
  border: 0;
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  color: ${({ danger }) =>
    danger
      ? themeCssVariables.tag.text.red
      : themeCssVariables.font.color.secondary};
  cursor: ${({ disabled }) => (disabled ? 'default' : 'pointer')};
  font: inherit;
  font-size: ${themeCssVariables.font.size.sm};
  min-height: 34px;
  padding: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[3]};
  text-align: left;

  &:last-child {
    border-bottom: 0;
  }
`;

const StyledContent = styled.div`
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
`;

const StyledStatementGrid = styled.section`
  display: grid;
  gap: 1px;
  grid-template-columns: repeat(2, minmax(260px, 1fr));
  overflow: auto;
  padding: ${themeCssVariables.spacing[3]};

  @media (max-width: 760px) {
    grid-template-columns: 1fr;
  }
`;

const StyledStatement = styled.div`
  border: 1px solid ${themeCssVariables.border.color.light};
  border-radius: ${themeCssVariables.border.radius.sm};
  display: grid;
  gap: ${themeCssVariables.spacing[2]};
  grid-template-columns: 1fr auto;
  padding: ${themeCssVariables.spacing[3]};

  span {
    color: ${themeCssVariables.font.color.secondary};
  }

  strong {
    color: ${themeCssVariables.font.color.primary};
    letter-spacing: 0;
    text-align: right;
  }
`;

const downloadTextFile = (
  filename: string,
  contentType: string,
  content: string,
) => {
  const url = URL.createObjectURL(new Blob([content], { type: contentType }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
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

const liasseValueToInput = (
  field: ErpLiasseFieldDefinition,
  value: string | number | null | undefined,
): string => {
  if (value === null || value === undefined) return '';
  if (typeof value !== 'number') return value;
  if (field.type === 'amount' || field.type === 'percentage') {
    return String(value / 100);
  }
  return String(value);
};

const liasseInputToValue = (
  field: ErpLiasseFieldDefinition,
  value: string,
): string | number | null => {
  const normalized = value.trim();
  if (normalized === '') return null;
  if (field.type === 'text' || field.type === 'date') return normalized;
  const numericValue = Number(normalized);
  return field.type === 'amount' || field.type === 'percentage'
    ? Math.round(numericValue * 100)
    : Math.round(numericValue);
};

const formatLiasseRowValues = (
  row: ErpLiasseRow,
  fields: ErpLiasseFieldDefinition[],
) =>
  fields
    .map((field) => {
      const value = row.values[field.key];
      if (value === null || value === undefined || value === '') return null;
      const displayValue =
        field.type === 'amount' && typeof value === 'number'
          ? formatMadCents(value)
          : field.type === 'percentage' && typeof value === 'number'
            ? `${value / 100} %`
            : String(value);
      return `${field.label}: ${displayValue}`;
    })
    .filter((value): value is string => value !== null)
    .join(' · ');

export const ErpAccountingClosingPage = () => {
  const { client, context } = useErpMarocContext();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [exercises, setExercises] = useState<ErpExercise[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [view, setView] = useState<View>('periods');
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [statements, setStatements] = useState<ErpFinancialStatements | null>(
    null,
  );
  const [liasseTables, setLiasseTables] = useState<ErpLiasseTableSummary[]>([]);
  const [liasseValidation, setLiasseValidation] =
    useState<ErpLiasseValidation | null>(null);
  const [liasseDetail, setLiasseDetail] = useState<ErpLiasseTableDetail | null>(
    null,
  );
  const [liasseDetailState, setLiasseDetailState] = useState<
    'ready' | 'loading'
  >('ready');
  const [liasseRowEditor, setLiasseRowEditor] =
    useState<LiasseRowEditor | null>(null);
  const [submissions, setSubmissions] = useState<ErpRegulatorySubmission[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageDanger, setMessageDanger] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [createYear, setCreateYear] = useState(
    String(new Date().getFullYear()),
  );
  const [createStart, setCreateStart] = useState(
    `${new Date().getFullYear()}-01-01`,
  );
  const [createEnd, setCreateEnd] = useState(
    `${new Date().getFullYear()}-12-31`,
  );
  const [taskEditor, setTaskEditor] = useState<ErpAccountingReviewTask | null>(
    null,
  );
  const [taskStatus, setTaskStatus] =
    useState<ErpAccountingReviewTask['status']>('TODO');
  const [taskNotes, setTaskNotes] = useState('');
  const [taskEvidence, setTaskEvidence] = useState('');
  const [submissionEditor, setSubmissionEditor] =
    useState<ErpRegulatorySubmission | null>(null);
  const [submissionAccepted, setSubmissionAccepted] = useState(true);
  const [submissionReference, setSubmissionReference] = useState('');
  const [submissionReason, setSubmissionReason] = useState('');
  const [reopenPeriod, setReopenPeriod] = useState<ErpAccountingPeriod | null>(
    null,
  );
  const [reopenReason, setReopenReason] = useState('');
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);

  const canAdmin = context?.role === 'OWNER' || context?.role === 'ADMIN';
  const canAccount = canAdmin || context?.role === 'COMPTABLE';

  const selectedExercise =
    exercises.find((exercise) => exercise.id === selectedId) ?? null;
  const periods = selectedExercise?.accountingPeriods ?? [];
  const tasks = selectedExercise?.accountingReviewTasks ?? [];
  const closedPeriods = periods.filter(
    (period) => period.status === 'CLOSED',
  ).length;
  const completedTasks = tasks.filter(
    (task) => task.status === 'DONE' || task.status === 'NOT_APPLICABLE',
  ).length;
  const readyLiasseTables = liasseTables.filter(
    (table) => table.isReady,
  ).length;
  const exerciseSubmissions = submissions.filter(
    (submission) => submission.exerciceId === selectedId,
  );
  const canCloseExercise =
    selectedExercise?.status === 'OPEN' &&
    periods.length > 0 &&
    closedPeriods === periods.length &&
    tasks.length > 0 &&
    completedTasks === tasks.length &&
    liasseValidation?.valid === true;

  const notify = useCallback((text: string, danger = false) => {
    setMessage(text);
    setMessageDanger(danger);
  }, []);

  const load = useCallback(async () => {
    setState('loading');
    try {
      const nextExercises = await client.request({
        method: 'GET',
        path: '/accounting-compliance/exercises',
        schema: erpExerciseListSchema,
      });
      setExercises(nextExercises);
      setSelectedId((current) =>
        nextExercises.some((exercise) => exercise.id === current)
          ? current
          : (nextExercises[0]?.id ?? ''),
      );
      setState('ready');
    } catch {
      setState('error');
    }
  }, [client]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (selectedId === '') {
      setStatements(null);
      setLiasseTables([]);
      setLiasseValidation(null);
      setLiasseDetail(null);
      setLiasseRowEditor(null);
      setSubmissions([]);
      return;
    }
    setLiasseDetail(null);
    setLiasseRowEditor(null);
    setLiasseValidation(null);
    let active = true;
    void Promise.allSettled([
      client.request({
        method: 'GET',
        path: `/accounting-compliance/exercises/${selectedId}/statements`,
        schema: erpFinancialStatementsSchema,
      }),
      client.request({
        method: 'GET',
        path: `/liasse/exercises/${selectedId}/tables`,
        schema: erpLiasseTableSummaryListSchema,
      }),
      client.request({
        method: 'GET',
        path: `/liasse/exercises/${selectedId}/validation`,
        schema: erpLiasseValidationSchema,
      }),
      client.request({
        method: 'GET',
        path: '/liasse/submissions',
        schema: erpRegulatorySubmissionListSchema,
      }),
    ]).then(
      ([statementResult, tableResult, validationResult, submissionResult]) => {
        if (!active) return;
        setStatements(
          statementResult.status === 'fulfilled' ? statementResult.value : null,
        );
        setLiasseTables(
          tableResult.status === 'fulfilled' ? tableResult.value : [],
        );
        setLiasseValidation(
          validationResult.status === 'fulfilled'
            ? validationResult.value
            : null,
        );
        setSubmissions(
          submissionResult.status === 'fulfilled' ? submissionResult.value : [],
        );
      },
    );
    return () => {
      active = false;
    };
  }, [client, selectedId]);

  const createExercise = async (event: FormEvent) => {
    event.preventDefault();
    if (busy || !canAdmin) return;
    setBusy(true);
    try {
      const intent = client.createMutationIntent(
        {
          method: 'POST',
          path: '/accounting-compliance/exercises',
          schema: erpExerciseSchema,
          body: {
            annee: Number(createYear),
            dateDebut: createStart,
            dateFin: createEnd,
          },
        },
        { idempotency: 'required' },
      );
      const created = await intent.execute();
      setSelectedId(created.id);
      setShowCreate(false);
      notify(`Exercice ${created.annee} créé.`);
      await load();
    } catch {
      notify("Impossible de créer l'exercice.", true);
    } finally {
      setBusy(false);
    }
  };

  const initializeReview = async () => {
    if (selectedExercise === null || busy || !canAccount) return;
    setBusy(true);
    try {
      const intent = client.createMutationIntent(
        {
          method: 'POST',
          path: `/accounting-compliance/exercises/${selectedExercise.id}/review`,
          schema: erpAccountingReviewTaskListSchema,
          body: {},
        },
        { idempotency: 'required' },
      );
      await intent.execute();
      notify('Checklist de révision initialisée.');
      await load();
    } catch {
      notify("Impossible d'initialiser la révision.", true);
    } finally {
      setBusy(false);
    }
  };

  const saveTask = async (event: FormEvent) => {
    event.preventDefault();
    if (taskEditor === null || busy || !canAccount) return;
    setBusy(true);
    try {
      const intent = client.createMutationIntent(
        {
          method: 'PATCH',
          path: `/accounting-compliance/review-tasks/${taskEditor.id}`,
          schema: erpAccountingReviewTaskSchema,
          body: {
            status: taskStatus,
            notes: taskNotes.trim() || null,
            evidence: taskEvidence.trim()
              ? { reference: taskEvidence.trim() }
              : null,
          },
        },
        { idempotency: 'required' },
      );
      await intent.execute();
      setTaskEditor(null);
      notify('Contrôle de révision mis à jour.');
      await load();
    } catch {
      notify('Impossible de mettre à jour ce contrôle.', true);
    } finally {
      setBusy(false);
    }
  };

  const executeConfirmedAction = async () => {
    if (confirmAction === null || busy) return;
    setBusy(true);
    try {
      if (confirmAction.kind === 'close-period') {
        const intent = client.createMutationIntent(
          {
            method: 'POST',
            path: `/accounting-compliance/periods/${confirmAction.period.id}/close`,
            schema: erpAccountingPeriodSchema,
            body: {},
          },
          { idempotency: 'required' },
        );
        await intent.execute();
        notify(`Période ${confirmAction.period.periodNumber} clôturée.`);
      } else if (confirmAction.kind === 'close-exercise') {
        const intent = client.createMutationIntent(
          {
            method: 'POST',
            path: `/accounting-compliance/exercises/${confirmAction.exercise.id}/close`,
            schema: erpExerciseClosingResultSchema,
            body: {},
          },
          { idempotency: 'required' },
        );
        const result = await intent.execute();
        notify(
          `Exercice ${result.closedExercise.annee} clôturé et exercice ${result.nextExercise.annee} créé.`,
        );
      } else {
        const intent = client.createMutationIntent(
          {
            method: 'DELETE',
            path: `/liasse/exercises/${selectedId}/tables/${confirmAction.tableCode}/rows/${confirmAction.row.rowCode}`,
            schema: erpLiasseDeleteResultSchema,
          },
          { idempotency: 'required' },
        );
        await intent.execute();
        const [detail, tables, validation] = await Promise.all([
          client.request({
            method: 'GET',
            path: `/liasse/exercises/${selectedId}/tables/${confirmAction.tableCode}`,
            schema: erpLiasseTableDetailSchema,
          }),
          client.request({
            method: 'GET',
            path: `/liasse/exercises/${selectedId}/tables`,
            schema: erpLiasseTableSummaryListSchema,
          }),
          client.request({
            method: 'GET',
            path: `/liasse/exercises/${selectedId}/validation`,
            schema: erpLiasseValidationSchema,
          }),
        ]);
        setLiasseDetail(detail);
        setLiasseTables(tables);
        setLiasseValidation(validation);
        setLiasseRowEditor(null);
        notify(`Ligne ${confirmAction.row.rowCode} supprimée.`);
      }
      setConfirmAction(null);
      if (confirmAction.kind !== 'delete-liasse-row') await load();
    } catch {
      notify(
        confirmAction.kind === 'delete-liasse-row'
          ? 'Impossible de supprimer cette ligne de liasse.'
          : 'La clôture a été refusée. Vérifiez les brouillons et contrôles.',
        true,
      );
    } finally {
      setBusy(false);
    }
  };

  const submitReopen = async (event: FormEvent) => {
    event.preventDefault();
    if (
      reopenPeriod === null ||
      reopenReason.trim().length < 3 ||
      busy ||
      !canAdmin
    ) {
      return;
    }
    setBusy(true);
    try {
      const intent = client.createMutationIntent(
        {
          method: 'POST',
          path: `/accounting-compliance/periods/${reopenPeriod.id}/reopen`,
          schema: erpAccountingPeriodSchema,
          body: { reason: reopenReason.trim() },
        },
        { idempotency: 'required' },
      );
      await intent.execute();
      setReopenPeriod(null);
      setReopenReason('');
      notify(`Période ${reopenPeriod.periodNumber} réouverte.`);
      await load();
    } catch {
      notify('Impossible de réouvrir cette période.', true);
    } finally {
      setBusy(false);
    }
  };

  const exportFec = async () => {
    if (selectedExercise === null || busy) return;
    setBusy(true);
    try {
      const file = await client.request({
        method: 'GET',
        path: `/accounting-compliance/exercises/${selectedExercise.id}/fec`,
        schema: erpFecExportSchema,
      });
      downloadTextFile(file.filename, file.contentType, file.content);
      notify(`FEC généré : ${file.entries} écritures, ${file.lines} lignes.`);
    } catch {
      notify("Impossible de générer l'export FEC.", true);
    } finally {
      setBusy(false);
    }
  };

  const importFec = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (
      file === undefined ||
      selectedExercise === null ||
      busy ||
      !canAccount
    ) {
      return;
    }
    setBusy(true);
    try {
      const content = await file.text();
      const intent = client.createMutationIntent(
        {
          method: 'POST',
          path: '/accounting-compliance/fec/import',
          schema: erpFecImportResultSchema,
          body: { exerciceId: selectedExercise.id, content },
        },
        { idempotency: 'required' },
      );
      const result = await intent.execute();
      notify(
        `FEC importé en brouillon : ${result.importedEntries} écritures, ${result.skippedEntries} déjà présentes.`,
      );
      await load();
    } catch {
      notify("L'import FEC a échoué. Vérifiez le format et les dates.", true);
    } finally {
      setBusy(false);
    }
  };

  const exportLiasse = async () => {
    if (selectedExercise === null || busy || liasseValidation?.valid !== true) {
      return;
    }
    setBusy(true);
    try {
      const file = await client.request({
        method: 'GET',
        path: `/liasse/exercises/${selectedExercise.id}/export`,
        query: { format: 'xlsx' },
        schema: erpLiasseExportSchema,
      });
      downloadBase64File(file.filename, file.contentType, file.contentBase64);
      notify(
        file.validation.valid
          ? `Liasse PCGM exportée. ${file.validation.warnings.length} avertissement(s).`
          : `Liasse générée avec ${file.validation.errors.length} erreur(s) de validation.`,
        !file.validation.valid,
      );
      const nextSubmissions = await client.request({
        method: 'GET',
        path: '/liasse/submissions',
        schema: erpRegulatorySubmissionListSchema,
      });
      setSubmissions(nextSubmissions);
    } catch {
      notify('Impossible de générer la liasse PCGM.', true);
    } finally {
      setBusy(false);
    }
  };

  const refreshLiasseValidation = async () => {
    if (selectedExercise === null || busy) return;
    setBusy(true);
    try {
      const validation = await client.request({
        method: 'GET',
        path: `/liasse/exercises/${selectedExercise.id}/validation`,
        schema: erpLiasseValidationSchema,
      });
      setLiasseValidation(validation);
      notify(
        validation.valid
          ? `Contrôle terminé : ${validation.warnings.length} avertissement(s).`
          : `Contrôle terminé : ${validation.errors.length} erreur(s) bloquante(s).`,
        !validation.valid,
      );
    } catch {
      notify('Impossible de contrôler la liasse.', true);
    } finally {
      setBusy(false);
    }
  };

  const loadLiasseTable = useCallback(
    async (tableCode: string) => {
      if (selectedId === '') return;
      setLiasseDetailState('loading');
      setLiasseRowEditor(null);
      try {
        const detail = await client.request({
          method: 'GET',
          path: `/liasse/exercises/${selectedId}/tables/${tableCode}`,
          schema: erpLiasseTableDetailSchema,
        });
        setLiasseDetail(detail);
        setLiasseDetailState('ready');
      } catch {
        setLiasseDetailState('ready');
        notify(`Impossible d'ouvrir le tableau ${tableCode}.`, true);
      }
    },
    [client, notify, selectedId],
  );

  const openLiasseRowEditor = useCallback(
    (row?: ErpLiasseRow) => {
      if (
        liasseDetail === null ||
        liasseDetail.definition.mode === 'COMPUTED'
      ) {
        return;
      }
      const values = Object.fromEntries(
        liasseDetail.definition.fields.map((field) => [
          field.key,
          liasseValueToInput(field, row?.values[field.key]),
        ]),
      );
      const nextPosition =
        liasseDetail.rows.reduce(
          (maximum, current) => Math.max(maximum, current.position),
          0,
        ) + 10;
      setLiasseRowEditor({
        existing: row !== undefined,
        rowCode:
          row?.rowCode ??
          `LIGNE_${String(
            liasseDetail.rows.filter((current) => current.id !== null).length +
              1,
          ).padStart(2, '0')}`,
        label: row?.label ?? '',
        position: String(row?.position ?? nextPosition),
        notes: row?.notes ?? '',
        values,
      });
    },
    [liasseDetail],
  );

  const saveLiasseRow = async (event: FormEvent) => {
    event.preventDefault();
    if (
      liasseDetail === null ||
      liasseRowEditor === null ||
      selectedExercise?.status !== 'OPEN' ||
      !canAccount ||
      busy
    ) {
      return;
    }
    const numericValueIsInvalid = liasseDetail.definition.fields.some(
      (field) =>
        field.type !== 'text' &&
        field.type !== 'date' &&
        liasseRowEditor.values[field.key]?.trim() !== '' &&
        !Number.isFinite(Number(liasseRowEditor.values[field.key])),
    );
    if (numericValueIsInvalid) {
      notify('Une valeur numérique de la ligne est invalide.', true);
      return;
    }
    setBusy(true);
    try {
      const tableCode = liasseDetail.definition.code;
      const intent = client.createMutationIntent(
        {
          method: 'PUT',
          path: `/liasse/exercises/${selectedExercise.id}/tables/${tableCode}/rows/${liasseRowEditor.rowCode}`,
          schema: erpLiasseRowSchema,
          body: {
            label: liasseRowEditor.label.trim(),
            position: Number(liasseRowEditor.position),
            values: Object.fromEntries(
              liasseDetail.definition.fields.map((field) => [
                field.key,
                liasseInputToValue(
                  field,
                  liasseRowEditor.values[field.key] ?? '',
                ),
              ]),
            ),
            notes: liasseRowEditor.notes.trim() || null,
          },
        },
        { idempotency: 'required' },
      );
      await intent.execute();
      const [detail, tables, validation] = await Promise.all([
        client.request({
          method: 'GET',
          path: `/liasse/exercises/${selectedExercise.id}/tables/${tableCode}`,
          schema: erpLiasseTableDetailSchema,
        }),
        client.request({
          method: 'GET',
          path: `/liasse/exercises/${selectedExercise.id}/tables`,
          schema: erpLiasseTableSummaryListSchema,
        }),
        client.request({
          method: 'GET',
          path: `/liasse/exercises/${selectedExercise.id}/validation`,
          schema: erpLiasseValidationSchema,
        }),
      ]);
      setLiasseDetail(detail);
      setLiasseTables(tables);
      setLiasseValidation(validation);
      setLiasseRowEditor(null);
      notify(`Ligne ${liasseRowEditor.rowCode} enregistrée.`);
    } catch {
      notify('Impossible d’enregistrer cette ligne de liasse.', true);
    } finally {
      setBusy(false);
    }
  };

  const saveExternalValidation = async (event: FormEvent) => {
    event.preventDefault();
    if (
      submissionEditor === null ||
      busy ||
      !canAdmin ||
      (submissionAccepted && submissionReference.trim() === '') ||
      (!submissionAccepted && submissionReason.trim() === '')
    ) {
      return;
    }
    setBusy(true);
    try {
      const intent = client.createMutationIntent(
        {
          method: 'PATCH',
          path: `/liasse/submissions/${submissionEditor.id}/external-validation`,
          schema: erpRegulatorySubmissionSchema,
          body: {
            accepted: submissionAccepted,
            externalReference: submissionReference.trim() || null,
            rejectionReason: submissionAccepted
              ? null
              : submissionReason.trim(),
          },
        },
        { idempotency: 'required' },
      );
      await intent.execute();
      setSubmissionEditor(null);
      const nextSubmissions = await client.request({
        method: 'GET',
        path: '/liasse/submissions',
        schema: erpRegulatorySubmissionListSchema,
      });
      setSubmissions(nextSubmissions);
      notify('Validation externe enregistrée avec sa référence.');
    } catch {
      notify("Impossible d'enregistrer la validation externe.", true);
    } finally {
      setBusy(false);
    }
  };

  const openTask = (task: ErpAccountingReviewTask) => {
    setTaskEditor(task);
    setTaskStatus(task.status);
    setTaskNotes(task.notes ?? '');
    setTaskEvidence(evidenceReference(task.evidence));
  };

  const periodColumns = useMemo<
    ErpOperationalTableColumn<ErpAccountingPeriod>[]
  >(
    () => [
      {
        key: 'period',
        header: 'Période',
        width: '100px',
        render: (period) => String(period.periodNumber).padStart(2, '0'),
      },
      {
        key: 'dates',
        header: 'Intervalle',
        width: '260px',
        render: (period) => `${period.startDate} → ${period.endDate}`,
      },
      {
        key: 'status',
        header: 'Statut',
        width: '130px',
        render: (period) => (
          <ErpStatusBadge
            label={period.status === 'CLOSED' ? 'Clôturée' : 'Ouverte'}
            tone={period.status === 'CLOSED' ? 'success' : 'info'}
          />
        ),
      },
      {
        key: 'history',
        header: 'Dernière action',
        width: '220px',
        render: (period) =>
          period.reopenReason ?? period.closedAt ?? 'Aucune clôture',
      },
      {
        key: 'action',
        header: '',
        width: '110px',
        render: (period) =>
          period.status === 'OPEN' ? (
            <Button
              title="Clôturer"
              ariaLabel={`Clôturer la période ${period.periodNumber}`}
              Icon={IconLock}
              variant="secondary"
              disabled={
                !canAccount || busy || selectedExercise?.status !== 'OPEN'
              }
              onClick={() => setConfirmAction({ kind: 'close-period', period })}
            />
          ) : (
            <Button
              title="Réouvrir"
              ariaLabel={`Réouvrir la période ${period.periodNumber}`}
              Icon={IconRefresh}
              variant="secondary"
              disabled={
                !canAdmin || busy || selectedExercise?.status !== 'OPEN'
              }
              onClick={() => {
                setReopenPeriod(period);
                setReopenReason('');
              }}
            />
          ),
      },
    ],
    [busy, canAccount, canAdmin, selectedExercise?.status],
  );

  const taskColumns = useMemo<
    ErpOperationalTableColumn<ErpAccountingReviewTask>[]
  >(
    () => [
      {
        key: 'category',
        header: 'Catégorie',
        width: '180px',
        render: (task) => task.category,
      },
      {
        key: 'task',
        header: 'Contrôle',
        width: '400px',
        render: (task) => task.label,
      },
      {
        key: 'status',
        header: 'Statut',
        width: '150px',
        render: (task) => (
          <ErpStatusBadge
            label={taskAppearance[task.status].label}
            tone={taskAppearance[task.status].tone}
          />
        ),
      },
      {
        key: 'notes',
        header: 'Note / preuve',
        width: '260px',
        render: (task) =>
          task.notes ?? (evidenceReference(task.evidence) || '—'),
      },
      {
        key: 'action',
        header: '',
        width: '100px',
        render: (task) => (
          <Button
            title="Traiter"
            ariaLabel={`Traiter ${task.label}`}
            Icon={IconCheck}
            variant="secondary"
            disabled={
              !canAccount || busy || selectedExercise?.status !== 'OPEN'
            }
            onClick={() => openTask(task)}
          />
        ),
      },
    ],
    [busy, canAccount, selectedExercise?.status],
  );

  const liasseColumns = useMemo<
    ErpOperationalTableColumn<ErpLiasseTableSummary>[]
  >(
    () => [
      {
        key: 'code',
        header: 'Tableau',
        width: '90px',
        render: (table) => table.code,
      },
      {
        key: 'label',
        header: 'Libellé PCGM',
        width: '360px',
        render: (table) => table.label,
      },
      {
        key: 'category',
        header: 'Catégorie',
        width: '140px',
        render: (table) => table.category,
      },
      {
        key: 'mode',
        header: 'Alimentation',
        width: '150px',
        render: (table) =>
          table.mode === 'COMPUTED'
            ? 'Automatique'
            : table.mode === 'MIXED'
              ? 'Mixte'
              : 'Manuelle',
      },
      {
        key: 'rows',
        header: 'Lignes manuelles',
        width: '140px',
        align: 'right',
        render: (table) => table.manualRows,
      },
      {
        key: 'status',
        header: 'Statut',
        width: '130px',
        render: (table) => (
          <ErpStatusBadge
            label={table.isReady ? 'Prêt' : 'À compléter'}
            tone={table.isReady ? 'success' : 'warning'}
          />
        ),
      },
      {
        key: 'action',
        header: '',
        width: '100px',
        render: (table) => (
          <Button
            title="Ouvrir"
            ariaLabel={`Ouvrir le tableau ${table.code}`}
            Icon={IconFileText}
            variant="secondary"
            disabled={liasseDetailState === 'loading'}
            onClick={() => void loadLiasseTable(table.code)}
          />
        ),
      },
    ],
    [liasseDetailState, loadLiasseTable],
  );

  const liasseRowColumns = useMemo<ErpOperationalTableColumn<ErpLiasseRow>[]>(
    () => [
      {
        key: 'code',
        header: 'Code',
        width: '140px',
        render: (row) => row.rowCode,
      },
      {
        key: 'label',
        header: 'Libellé',
        width: '280px',
        render: (row) => row.label,
      },
      {
        key: 'source',
        header: 'Source',
        width: '120px',
        render: (row) =>
          row.source === 'COMPUTED'
            ? 'Comptabilité'
            : row.source === 'IMPORTED'
              ? 'Import'
              : 'Manuelle',
      },
      {
        key: 'values',
        header: "Données de l'annexe",
        width: '480px',
        render: (row) =>
          liasseDetail === null
            ? '—'
            : formatLiasseRowValues(row, liasseDetail.definition.fields) || '—',
      },
      {
        key: 'notes',
        header: 'Notes',
        width: '220px',
        render: (row) => row.notes ?? '—',
      },
      {
        key: 'action',
        header: '',
        width: '150px',
        render: (row) =>
          row.id === null ? null : (
            <StyledToolbarGroup>
              <Button
                title="Modifier"
                ariaLabel={`Modifier la ligne ${row.rowCode}`}
                Icon={IconCheck}
                variant="secondary"
                disabled={
                  !canAccount || busy || selectedExercise?.status !== 'OPEN'
                }
                onClick={() => openLiasseRowEditor(row)}
              />
              <Button
                title="Supprimer"
                ariaLabel={`Supprimer la ligne ${row.rowCode}`}
                Icon={IconX}
                variant="secondary"
                disabled={
                  !canAccount || busy || selectedExercise?.status !== 'OPEN'
                }
                onClick={() =>
                  setConfirmAction({
                    kind: 'delete-liasse-row',
                    tableCode: liasseDetail?.definition.code ?? '',
                    row,
                  })
                }
              />
            </StyledToolbarGroup>
          ),
      },
    ],
    [
      busy,
      canAccount,
      liasseDetail,
      openLiasseRowEditor,
      selectedExercise?.status,
    ],
  );

  const submissionColumns = useMemo<
    ErpOperationalTableColumn<ErpRegulatorySubmission>[]
  >(
    () => [
      {
        key: 'date',
        header: 'Génération',
        width: '190px',
        render: (submission) => submission.generatedAt,
      },
      {
        key: 'file',
        header: 'Fichier',
        width: '280px',
        render: (submission) => submission.filename,
      },
      {
        key: 'version',
        header: 'Version',
        width: '100px',
        render: (submission) => submission.formatVersion,
      },
      {
        key: 'status',
        header: 'Validation',
        width: '190px',
        render: (submission) => (
          <ErpStatusBadge
            label={
              submission.validationStatus === 'EXTERNALLY_ACCEPTED'
                ? 'Acceptée extérieurement'
                : submission.validationStatus === 'INTERNALLY_VALIDATED'
                  ? 'Validée en interne'
                  : submission.validationStatus === 'REJECTED'
                    ? 'Rejetée'
                    : 'Générée'
            }
            tone={
              submission.validationStatus === 'EXTERNALLY_ACCEPTED'
                ? 'success'
                : submission.validationStatus === 'REJECTED'
                  ? 'danger'
                  : submission.validationStatus === 'INTERNALLY_VALIDATED'
                    ? 'info'
                    : 'neutral'
            }
          />
        ),
      },
      {
        key: 'reference',
        header: 'Référence externe',
        width: '220px',
        render: (submission) => submission.externalReference ?? '—',
      },
      {
        key: 'action',
        header: '',
        width: '100px',
        render: (submission) => (
          <Button
            title="Traiter"
            ariaLabel={`Enregistrer la validation externe de ${submission.filename}`}
            Icon={IconCheck}
            variant="secondary"
            disabled={
              !canAdmin ||
              busy ||
              submission.validationStatus === 'EXTERNALLY_ACCEPTED'
            }
            onClick={() => {
              setSubmissionEditor(submission);
              setSubmissionAccepted(true);
              setSubmissionReference(submission.externalReference ?? '');
              setSubmissionReason(submission.rejectionReason ?? '');
            }}
          />
        ),
      },
    ],
    [busy, canAdmin],
  );

  const confirmTitle =
    confirmAction?.kind === 'close-exercise'
      ? "Clôturer définitivement l'exercice"
      : confirmAction?.kind === 'delete-liasse-row'
        ? 'Supprimer la ligne de liasse'
        : 'Clôturer la période';
  const confirmMessage =
    confirmAction?.kind === 'close-exercise'
      ? 'Cette opération génère les écritures de clôture et les à-nouveaux du prochain exercice.'
      : confirmAction?.kind === 'delete-liasse-row'
        ? `La ligne ${confirmAction.row.rowCode} sera définitivement supprimée du tableau ${confirmAction.tableCode}.`
        : 'Les écritures validées de cette période seront verrouillées.';

  return (
    <ErpPageShell
      title="Clôture comptable"
      description="Exercices, révision, états PCGM et FEC"
      state={state}
      loadingLabel="Chargement des exercices"
      errorLabel="Impossible de charger le cockpit de clôture"
      onRetry={() => void load()}
      actions={
        <StyledToolbarGroup>
          <StyledHiddenInput
            ref={fileInputRef}
            type="file"
            accept=".txt,.tsv,text/plain,text/tab-separated-values"
            onChange={(event) => void importFec(event)}
          />
          <Button
            title="Importer FEC"
            ariaLabel="Importer un fichier FEC"
            Icon={IconUpload}
            variant="secondary"
            disabled={
              !canAccount || busy || selectedExercise?.status !== 'OPEN'
            }
            onClick={() => fileInputRef.current?.click()}
          />
          <Button
            title="Exporter FEC"
            ariaLabel="Exporter le FEC"
            Icon={IconFileText}
            variant="secondary"
            disabled={busy || selectedExercise === null}
            onClick={() => void exportFec()}
          />
          <Button
            title="Exporter la liasse"
            ariaLabel="Exporter la liasse PCGM T1 à T20"
            Icon={IconFileText}
            variant="secondary"
            disabled={
              busy ||
              selectedExercise === null ||
              liasseValidation?.valid !== true
            }
            onClick={() => void exportLiasse()}
          />
          <Button
            title="Nouvel exercice"
            ariaLabel="Créer un exercice comptable"
            Icon={IconPlus}
            accent="blue"
            disabled={!canAdmin || busy}
            onClick={() => setShowCreate((value) => !value)}
          />
        </StyledToolbarGroup>
      }
    >
      {message === null ? null : (
        <StyledNotice danger={messageDanger}>{message}</StyledNotice>
      )}
      {showCreate ? (
        <StyledCreateForm onSubmit={createExercise}>
          <StyledInput
            aria-label="Année de l'exercice"
            inputMode="numeric"
            value={createYear}
            onChange={(event) => setCreateYear(event.target.value)}
          />
          <StyledInput
            aria-label="Début de l'exercice"
            type="date"
            value={createStart}
            onChange={(event) => setCreateStart(event.target.value)}
          />
          <StyledInput
            aria-label="Fin de l'exercice"
            type="date"
            value={createEnd}
            onChange={(event) => setCreateEnd(event.target.value)}
          />
          <Button
            type="submit"
            title="Créer"
            ariaLabel="Créer l'exercice"
            Icon={IconCheck}
            accent="blue"
            disabled={busy}
          />
          <Button
            type="button"
            title="Annuler"
            ariaLabel="Annuler la création"
            Icon={IconX}
            variant="secondary"
            disabled={busy}
            onClick={() => setShowCreate(false)}
          />
        </StyledCreateForm>
      ) : null}
      <StyledToolbar>
        <StyledToolbarGroup>
          <StyledSelect
            aria-label="Exercice comptable"
            value={selectedId}
            onChange={(event) => setSelectedId(event.target.value)}
          >
            {exercises.map((exercise) => (
              <option key={exercise.id} value={exercise.id}>
                {exercise.annee} · {exercise.dateDebut} → {exercise.dateFin}
              </option>
            ))}
          </StyledSelect>
          {selectedExercise === null ? null : (
            <ErpStatusBadge
              label={exerciseAppearance[selectedExercise.status].label}
              tone={exerciseAppearance[selectedExercise.status].tone}
            />
          )}
        </StyledToolbarGroup>
        <StyledTabs role="tablist" aria-label="Vues de clôture">
          {(
            [
              ['periods', 'Périodes'],
              ['review', 'Révision'],
              ['statements', 'États financiers'],
              ['liasse', 'Liasse T1–T20'],
            ] as const
          ).map(([key, label]) => (
            <StyledTab
              key={key}
              type="button"
              role="tab"
              active={view === key}
              aria-selected={view === key}
              onClick={() => setView(key)}
            >
              {label}
            </StyledTab>
          ))}
        </StyledTabs>
      </StyledToolbar>
      <StyledMetrics>
        <StyledMetric>
          <StyledMetricLabel>Périodes clôturées</StyledMetricLabel>
          <StyledMetricValue>
            {closedPeriods}/{periods.length}
          </StyledMetricValue>
        </StyledMetric>
        <StyledMetric>
          <StyledMetricLabel>Contrôles terminés</StyledMetricLabel>
          <StyledMetricValue>
            {completedTasks}/{tasks.length}
          </StyledMetricValue>
        </StyledMetric>
        <StyledMetric>
          <StyledMetricLabel>Résultat net</StyledMetricLabel>
          <StyledMetricValue>
            {statements === null
              ? '—'
              : formatMadCents(statements.cpc.netResultCents)}
          </StyledMetricValue>
        </StyledMetric>
        <StyledMetric>
          <StyledMetricLabel>Équilibre du bilan</StyledMetricLabel>
          <StyledMetricValue>
            {statements === null
              ? '—'
              : statements.bilan.isBalanced
                ? 'Conforme'
                : 'Écart'}
          </StyledMetricValue>
        </StyledMetric>
      </StyledMetrics>
      <StyledContent>
        {view === 'periods' ? (
          <>
            {reopenPeriod === null ? null : (
              <StyledEditor onSubmit={submitReopen}>
                <strong>Période {reopenPeriod.periodNumber}</strong>
                <StyledInput
                  aria-label="Motif de réouverture"
                  placeholder="Motif obligatoire"
                  value={reopenReason}
                  onChange={(event) => setReopenReason(event.target.value)}
                />
                <span />
                <StyledToolbarGroup>
                  <Button
                    type="submit"
                    title="Confirmer"
                    ariaLabel="Confirmer la réouverture"
                    Icon={IconRefresh}
                    accent="blue"
                    disabled={busy || reopenReason.trim().length < 3}
                  />
                  <Button
                    type="button"
                    title="Annuler"
                    ariaLabel="Annuler la réouverture"
                    Icon={IconX}
                    variant="secondary"
                    disabled={busy}
                    onClick={() => setReopenPeriod(null)}
                  />
                </StyledToolbarGroup>
              </StyledEditor>
            )}
            <ErpOperationalTable
              ariaLabel="Périodes comptables"
              columns={periodColumns}
              rows={periods}
              getRowKey={(period) => period.id}
              emptyLabel="Aucune période comptable"
            />
          </>
        ) : view === 'review' ? (
          <>
            {taskEditor === null ? null : (
              <StyledEditor onSubmit={saveTask}>
                <StyledSelect
                  aria-label="Statut du contrôle"
                  value={taskStatus}
                  onChange={(event) =>
                    setTaskStatus(
                      event.target.value as ErpAccountingReviewTask['status'],
                    )
                  }
                >
                  {Object.entries(taskAppearance).map(
                    ([status, appearance]) => (
                      <option key={status} value={status}>
                        {appearance.label}
                      </option>
                    ),
                  )}
                </StyledSelect>
                <StyledTextarea
                  aria-label="Notes de révision"
                  placeholder="Conclusion du contrôle"
                  value={taskNotes}
                  onChange={(event) => setTaskNotes(event.target.value)}
                />
                <StyledTextarea
                  aria-label="Référence du justificatif"
                  placeholder="Référence ou lien du justificatif"
                  value={taskEvidence}
                  onChange={(event) => setTaskEvidence(event.target.value)}
                />
                <StyledToolbarGroup>
                  <Button
                    type="submit"
                    title="Enregistrer"
                    ariaLabel="Enregistrer le contrôle"
                    Icon={IconCheck}
                    accent="blue"
                    disabled={busy}
                  />
                  <Button
                    type="button"
                    title="Annuler"
                    ariaLabel="Annuler la modification"
                    Icon={IconX}
                    variant="secondary"
                    disabled={busy}
                    onClick={() => setTaskEditor(null)}
                  />
                </StyledToolbarGroup>
              </StyledEditor>
            )}
            {tasks.length === 0 && canAccount ? (
              <StyledToolbar>
                <span>La checklist de révision n'est pas initialisée.</span>
                <Button
                  title="Initialiser"
                  ariaLabel="Initialiser la checklist de révision"
                  Icon={IconPlus}
                  accent="blue"
                  disabled={busy}
                  onClick={() => void initializeReview()}
                />
              </StyledToolbar>
            ) : null}
            <ErpOperationalTable
              ariaLabel="Checklist de révision"
              columns={taskColumns}
              rows={tasks}
              getRowKey={(task) => task.id}
              emptyLabel="Aucun contrôle de révision"
            />
          </>
        ) : view === 'liasse' ? (
          <>
            {liasseDetail === null ? (
              <>
                <StyledToolbar>
                  <span>
                    {readyLiasseTables}/{liasseTables.length} tableaux prêts ·{' '}
                    {exerciseSubmissions.length} soumission(s)
                  </span>
                  <StyledToolbarGroup>
                    <Button
                      title="Contrôler"
                      ariaLabel="Contrôler la cohérence de la liasse"
                      Icon={IconCheck}
                      variant="secondary"
                      disabled={busy || selectedExercise === null}
                      onClick={() => void refreshLiasseValidation()}
                    />
                    <Button
                      title="Générer XLSX"
                      ariaLabel="Générer la liasse PCGM au format XLSX"
                      Icon={IconFileText}
                      accent="blue"
                      disabled={
                        busy ||
                        selectedExercise === null ||
                        liasseValidation?.valid !== true
                      }
                      onClick={() => void exportLiasse()}
                    />
                  </StyledToolbarGroup>
                </StyledToolbar>
                {liasseValidation === null ? (
                  <StyledNotice danger={true}>
                    Le contrôle pré-clôture n'est pas disponible. Relancez le
                    contrôle avant l'export.
                  </StyledNotice>
                ) : (
                  <StyledValidationPanel>
                    <StyledValidationSummary>
                      <ErpStatusBadge
                        label={
                          liasseValidation.valid
                            ? 'Contrôle conforme'
                            : 'Export bloqué'
                        }
                        tone={liasseValidation.valid ? 'success' : 'danger'}
                      />
                      <span>
                        {liasseValidation.summary.readyTables}/
                        {liasseValidation.summary.tables} tableaux prêts ·{' '}
                        {liasseValidation.summary.rowsChecked} lignes contrôlées
                        · {liasseValidation.summary.errors} erreur(s) ·{' '}
                        {liasseValidation.summary.warnings} avertissement(s)
                      </span>
                    </StyledValidationSummary>
                    {liasseValidation.errors.length === 0 &&
                    liasseValidation.warnings.length === 0 ? null : (
                      <StyledValidationIssues>
                        {[
                          ...liasseValidation.errors.map((issue) => ({
                            ...issue,
                            danger: true,
                          })),
                          ...liasseValidation.warnings.map((issue) => ({
                            ...issue,
                            danger: false,
                          })),
                        ].map((issue, index) => (
                          <StyledValidationIssue
                            key={`${issue.code}-${issue.tableCode}-${issue.rowCode}-${index}`}
                            type="button"
                            danger={issue.danger}
                            disabled={issue.tableCode === null}
                            onClick={() =>
                              issue.tableCode === null
                                ? undefined
                                : void loadLiasseTable(issue.tableCode)
                            }
                          >
                            {issue.danger ? 'Erreur' : 'Avertissement'} ·{' '}
                            {issue.tableCode === null
                              ? ''
                              : `${issue.tableCode}${
                                  issue.rowCode === null
                                    ? ''
                                    : ` / ${issue.rowCode}`
                                } · `}
                            {issue.message}
                          </StyledValidationIssue>
                        ))}
                      </StyledValidationIssues>
                    )}
                  </StyledValidationPanel>
                )}
                <ErpOperationalTable
                  ariaLabel="Tableaux de la liasse PCGM"
                  columns={liasseColumns}
                  rows={liasseTables}
                  state={liasseDetailState}
                  loadingLabel="Ouverture du tableau"
                  getRowKey={(table) => table.code}
                  emptyLabel="Aucun tableau de liasse disponible"
                />
              </>
            ) : (
              <>
                <StyledToolbar>
                  <StyledToolbarGroup>
                    <Button
                      title="Retour"
                      ariaLabel="Retour aux tableaux de la liasse"
                      Icon={IconRefresh}
                      variant="secondary"
                      disabled={busy}
                      onClick={() => {
                        setLiasseDetail(null);
                        setLiasseRowEditor(null);
                      }}
                    />
                    <strong>
                      {liasseDetail.definition.code} ·{' '}
                      {liasseDetail.definition.label}
                    </strong>
                    <ErpStatusBadge
                      label={
                        liasseDetail.definition.mode === 'COMPUTED'
                          ? 'Automatique'
                          : liasseDetail.definition.mode === 'MIXED'
                            ? 'Mixte'
                            : 'Manuelle'
                      }
                      tone={
                        liasseDetail.definition.mode === 'COMPUTED'
                          ? 'success'
                          : 'info'
                      }
                    />
                  </StyledToolbarGroup>
                  {liasseDetail.definition.mode === 'COMPUTED' ? null : (
                    <Button
                      title="Ajouter une ligne"
                      ariaLabel={`Ajouter une ligne au tableau ${liasseDetail.definition.code}`}
                      Icon={IconPlus}
                      accent="blue"
                      disabled={
                        !canAccount ||
                        busy ||
                        selectedExercise?.status !== 'OPEN'
                      }
                      onClick={() => openLiasseRowEditor()}
                    />
                  )}
                </StyledToolbar>
                {liasseRowEditor === null ? null : (
                  <StyledLiasseEditor onSubmit={saveLiasseRow}>
                    <StyledLiasseFields>
                      <StyledField>
                        Code de ligne
                        <StyledInput
                          aria-label="Code de la ligne"
                          required
                          disabled={liasseRowEditor.existing}
                          value={liasseRowEditor.rowCode}
                          onChange={(event) =>
                            setLiasseRowEditor((current) =>
                              current === null
                                ? null
                                : {
                                    ...current,
                                    rowCode: event.target.value
                                      .toUpperCase()
                                      .replace(/[^A-Z0-9_-]/g, '')
                                      .slice(0, 80),
                                  },
                            )
                          }
                        />
                      </StyledField>
                      <StyledField>
                        Libellé
                        <StyledInput
                          aria-label="Libellé de la ligne"
                          required
                          value={liasseRowEditor.label}
                          onChange={(event) =>
                            setLiasseRowEditor((current) =>
                              current === null
                                ? null
                                : { ...current, label: event.target.value },
                            )
                          }
                        />
                      </StyledField>
                      <StyledField>
                        Ordre
                        <StyledInput
                          aria-label="Ordre de la ligne"
                          type="number"
                          min="0"
                          max="10000"
                          required
                          value={liasseRowEditor.position}
                          onChange={(event) =>
                            setLiasseRowEditor((current) =>
                              current === null
                                ? null
                                : { ...current, position: event.target.value },
                            )
                          }
                        />
                      </StyledField>
                      {liasseDetail.definition.fields.map((field) => (
                        <StyledField key={field.key}>
                          {field.label}
                          <StyledInput
                            aria-label={field.label}
                            type={
                              field.type === 'date'
                                ? 'date'
                                : field.type === 'text'
                                  ? 'text'
                                  : 'number'
                            }
                            step={
                              field.type === 'amount' ||
                              field.type === 'percentage'
                                ? '0.01'
                                : '1'
                            }
                            min={
                              field.type === 'percentage' ||
                              field.type === 'integer'
                                ? '0'
                                : undefined
                            }
                            max={
                              field.type === 'percentage' ? '100' : undefined
                            }
                            required={field.required === true}
                            value={liasseRowEditor.values[field.key] ?? ''}
                            onChange={(event) =>
                              setLiasseRowEditor((current) =>
                                current === null
                                  ? null
                                  : {
                                      ...current,
                                      values: {
                                        ...current.values,
                                        [field.key]: event.target.value,
                                      },
                                    },
                              )
                            }
                          />
                        </StyledField>
                      ))}
                    </StyledLiasseFields>
                    <StyledTextarea
                      aria-label="Notes de la ligne"
                      placeholder="Notes ou référence du justificatif"
                      value={liasseRowEditor.notes}
                      onChange={(event) =>
                        setLiasseRowEditor((current) =>
                          current === null
                            ? null
                            : { ...current, notes: event.target.value },
                        )
                      }
                    />
                    <StyledToolbarGroup>
                      <Button
                        type="submit"
                        title="Enregistrer"
                        ariaLabel="Enregistrer la ligne de liasse"
                        Icon={IconCheck}
                        accent="blue"
                        disabled={busy}
                      />
                      <Button
                        type="button"
                        title="Annuler"
                        ariaLabel="Annuler la saisie de la ligne"
                        Icon={IconX}
                        variant="secondary"
                        disabled={busy}
                        onClick={() => setLiasseRowEditor(null)}
                      />
                    </StyledToolbarGroup>
                  </StyledLiasseEditor>
                )}
                <ErpOperationalTable
                  ariaLabel={`Lignes du tableau ${liasseDetail.definition.code}`}
                  columns={liasseRowColumns}
                  rows={liasseDetail.rows}
                  getRowKey={(row) => `${row.source}-${row.rowCode}`}
                  emptyLabel="Aucune ligne dans ce tableau"
                />
              </>
            )}
            {liasseDetail !== null ||
            exerciseSubmissions.length === 0 ? null : (
              <>
                <StyledToolbar>
                  <strong>Historique réglementaire</strong>
                </StyledToolbar>
                {submissionEditor === null ? null : (
                  <StyledEditor onSubmit={saveExternalValidation}>
                    <StyledSelect
                      aria-label="Décision externe"
                      value={submissionAccepted ? 'accepted' : 'rejected'}
                      onChange={(event) =>
                        setSubmissionAccepted(event.target.value === 'accepted')
                      }
                    >
                      <option value="accepted">Acceptée</option>
                      <option value="rejected">Rejetée</option>
                    </StyledSelect>
                    <StyledInput
                      aria-label="Référence externe"
                      placeholder="Référence DGI ou cabinet"
                      value={submissionReference}
                      onChange={(event) =>
                        setSubmissionReference(event.target.value)
                      }
                    />
                    <StyledInput
                      aria-label="Motif de rejet"
                      placeholder="Motif si rejetée"
                      value={submissionReason}
                      onChange={(event) =>
                        setSubmissionReason(event.target.value)
                      }
                      disabled={submissionAccepted}
                    />
                    <StyledToolbarGroup>
                      <Button
                        type="submit"
                        title="Enregistrer"
                        ariaLabel="Enregistrer la validation externe"
                        Icon={IconCheck}
                        accent="blue"
                        disabled={
                          busy ||
                          (submissionAccepted &&
                            submissionReference.trim() === '') ||
                          (!submissionAccepted &&
                            submissionReason.trim() === '')
                        }
                      />
                      <Button
                        type="button"
                        title="Annuler"
                        ariaLabel="Annuler la validation externe"
                        Icon={IconX}
                        variant="secondary"
                        disabled={busy}
                        onClick={() => setSubmissionEditor(null)}
                      />
                    </StyledToolbarGroup>
                  </StyledEditor>
                )}
                <ErpOperationalTable
                  ariaLabel="Soumissions réglementaires"
                  columns={submissionColumns}
                  rows={exerciseSubmissions}
                  getRowKey={(submission) => submission.id}
                />
              </>
            )}
          </>
        ) : statements === null ? (
          <StyledNotice danger={true}>
            Les états financiers ne peuvent pas être calculés pour cet exercice.
          </StyledNotice>
        ) : (
          <StyledStatementGrid>
            <StyledStatement>
              <span>Total actif</span>
              <strong>
                {formatMadCents(statements.bilan.assets.totalCents)}
              </strong>
              <span>Total passif</span>
              <strong>
                {formatMadCents(statements.bilan.liabilities.totalCents)}
              </strong>
              <span>Écart</span>
              <strong>
                {formatMadCents(statements.bilan.differenceCents)}
              </strong>
            </StyledStatement>
            <StyledStatement>
              <span>Produits d'exploitation</span>
              <strong>
                {formatMadCents(statements.cpc.operating.revenueCents)}
              </strong>
              <span>Charges d'exploitation</span>
              <strong>
                {formatMadCents(statements.cpc.operating.expensesCents)}
              </strong>
              <span>Résultat net</span>
              <strong>{formatMadCents(statements.cpc.netResultCents)}</strong>
            </StyledStatement>
            <StyledStatement>
              <span>Valeur ajoutée</span>
              <strong>{formatMadCents(statements.esg.valueAddedCents)}</strong>
              <span>Excédent brut d'exploitation</span>
              <strong>
                {formatMadCents(statements.esg.grossOperatingSurplusCents)}
              </strong>
              <span>Résultat ESG</span>
              <strong>{formatMadCents(statements.esg.netResultCents)}</strong>
            </StyledStatement>
            <StyledStatement>
              <span>Capacité d'autofinancement</span>
              <strong>
                {formatMadCents(
                  statements.financing.selfFinancingCapacityCents,
                )}
              </strong>
              <span>Variation nette de trésorerie</span>
              <strong>
                {formatMadCents(statements.financing.netTreasuryChangeCents)}
              </strong>
              <span>Référentiel</span>
              <strong>PCGM · MAD</strong>
            </StyledStatement>
          </StyledStatementGrid>
        )}
      </StyledContent>
      {selectedExercise !== null && canAccount ? (
        <StyledToolbar>
          <span>
            {canCloseExercise
              ? "L'exercice est prêt pour la clôture définitive."
              : 'Terminez les périodes, la révision et le contrôle de la liasse avant la clôture annuelle.'}
          </span>
          <Button
            title="Clôturer l'exercice"
            ariaLabel="Clôturer définitivement l'exercice"
            Icon={IconLock}
            accent="blue"
            disabled={!canCloseExercise || busy}
            onClick={() =>
              setConfirmAction({
                kind: 'close-exercise',
                exercise: selectedExercise,
              })
            }
          />
        </StyledToolbar>
      ) : null}
      <ErpConfirmDialog
        isOpen={confirmAction !== null}
        title={confirmTitle}
        message={confirmMessage}
        confirmLabel={
          confirmAction?.kind === 'delete-liasse-row'
            ? 'Supprimer la ligne'
            : 'Confirmer la clôture'
        }
        destructive={
          confirmAction?.kind === 'close-exercise' ||
          confirmAction?.kind === 'delete-liasse-row'
        }
        isConfirming={busy}
        onCancel={() => setConfirmAction(null)}
        onConfirm={() => void executeConfirmedAction()}
      />
    </ErpPageShell>
  );
};
