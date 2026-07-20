import {
  ErpOperationalTable,
  type ErpOperationalTableColumn,
} from '@/erp-maroc/components/ErpOperationalTable';
import {
  downloadBase64Content,
  ErpWorkspaceSummaryItem,
  StyledErpWorkspaceContent,
  StyledErpWorkspaceField,
  StyledErpWorkspaceFormGrid,
  StyledErpWorkspaceInlineActions,
  StyledErpWorkspaceInput,
  StyledErpWorkspacePanel,
  StyledErpWorkspacePanelTitle,
  StyledErpWorkspaceSelect,
  StyledErpWorkspaceSummary,
  StyledErpWorkspaceTextarea,
  StyledErpWorkspaceToolbar,
} from '@/erp-maroc/components/ErpComplianceUi';
import { ErpPageShell } from '@/erp-maroc/components/ErpPageShell';
import { useErpMarocContext } from '@/erp-maroc/context/useErpMarocContext';
import { formatMadCents } from '@/erp-maroc/utils/money';
import { useSnackBar } from '@/ui/feedback/snack-bar-manager/hooks/useSnackBar';
import { useEffect, useMemo, useState } from 'react';
import {
  erpExerciseListSchema,
  erpRegulatoryFileSchema,
  erpRegulatoryListSchema,
  erpRegulatoryObjectSchema,
  type ErpExercise,
} from 'twenty-shared/erp-maroc';
import {
  IconCheck,
  IconDownload,
  IconRefresh,
  IconTrash,
} from 'twenty-ui/display';
import { Button } from 'twenty-ui/input';

type LiasseField = {
  key: string;
  label: string;
  type: 'text' | 'date' | 'amount' | 'integer' | 'percentage';
  required?: boolean;
};

type LiasseDefinition = {
  code: string;
  label: string;
  category: string;
  mode: 'COMPUTED' | 'MANUAL' | 'MIXED';
  fields: LiasseField[];
};

type LiasseRow = {
  id: string | null;
  rowCode: string;
  label: string;
  position: number;
  source: 'COMPUTED' | 'MANUAL';
  values: Record<string, unknown>;
  notes: string | null;
};

type LiasseTable = {
  definition: LiasseDefinition;
  rows: LiasseRow[];
};

type RegulatorySubmission = {
  id: string;
  kind: string;
  periodKey: string;
  filename: string;
  validationStatus: string;
  externalReference?: string | null;
};

const tableCodes = [
  ...Array.from({ length: 20 }, (_, index) => `T${index + 1}`),
  'STOCK',
];

const cellValue = (row: LiasseRow, definition: LiasseDefinition | undefined) =>
  Object.entries(row.values)
    .filter(([, value]) => value !== null && value !== '')
    .map(([key, value]) => {
      const field = definition?.fields.find(
        (candidate) => candidate.key === key,
      );
      if (field?.type === 'amount' && typeof value === 'number') {
        return formatMadCents(value);
      }
      if (field?.type === 'percentage' && typeof value === 'number') {
        return `${(value / 100).toLocaleString('fr-MA')} %`;
      }
      return String(value);
    })
    .join(' · ');

export const ErpLiassePage = () => {
  const { client } = useErpMarocContext();
  const { enqueueErrorSnackBar, enqueueSuccessSnackBar } = useSnackBar();
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [generation, setGeneration] = useState(0);
  const [exercises, setExercises] = useState<ErpExercise[]>([]);
  const [definitions, setDefinitions] = useState<LiasseDefinition[]>([]);
  const [submissions, setSubmissions] = useState<RegulatorySubmission[]>([]);
  const [exerciseId, setExerciseId] = useState('');
  const [tableCode, setTableCode] = useState('T1');
  const [table, setTable] = useState<LiasseTable | null>(null);
  const [rowCode, setRowCode] = useState('LIGNE_1');
  const [rowLabel, setRowLabel] = useState('');
  const [rowNotes, setRowNotes] = useState('');
  const [rowValues, setRowValues] = useState<Record<string, string>>({});
  const [externalReference, setExternalReference] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const refresh = () => setGeneration((value) => value + 1);

  useEffect(() => {
    const abortController = new AbortController();
    setState('loading');
    Promise.all([
      client.request({
        method: 'GET',
        path: '/accounting-compliance/exercises',
        schema: erpExerciseListSchema,
        signal: abortController.signal,
      }),
      client.request({
        method: 'GET',
        path: '/liasse/definitions',
        schema: erpRegulatoryListSchema,
        signal: abortController.signal,
      }),
      client.request({
        method: 'GET',
        path: '/liasse/submissions',
        schema: erpRegulatoryListSchema,
        signal: abortController.signal,
      }),
    ])
      .then(([loadedExercises, loadedDefinitions, loadedSubmissions]) => {
        if (abortController.signal.aborted) return;
        setExercises(loadedExercises);
        setDefinitions(loadedDefinitions as unknown as LiasseDefinition[]);
        setSubmissions(loadedSubmissions as unknown as RegulatorySubmission[]);
        setExerciseId(
          (current) =>
            current ||
            loadedExercises.find((item) => item.status === 'OPEN')?.id ||
            loadedExercises[0]?.id ||
            '',
        );
        setState('ready');
      })
      .catch(() => {
        if (!abortController.signal.aborted) setState('error');
      });
    return () => abortController.abort();
  }, [client, generation]);

  useEffect(() => {
    if (exerciseId === '') return;
    const abortController = new AbortController();
    client
      .request({
        method: 'GET',
        path: `/liasse/exercises/${exerciseId}/tables/${tableCode}`,
        schema: erpRegulatoryObjectSchema,
        signal: abortController.signal,
      })
      .then((loaded) => {
        if (!abortController.signal.aborted) {
          setTable(loaded as unknown as LiasseTable);
          setRowValues({});
        }
      })
      .catch(() => {
        if (!abortController.signal.aborted) setTable(null);
      });
    return () => abortController.abort();
  }, [client, exerciseId, generation, tableCode]);

  const definition = useMemo(
    () =>
      definitions.find((item) => item.code === tableCode) ?? table?.definition,
    [definitions, table, tableCode],
  );

  const saveRow = async () => {
    if (!definition || exerciseId === '' || rowLabel.trim() === '') return;
    const normalizedCode = rowCode
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9_-]/g, '_');
    if (normalizedCode === '') return;
    setBusyId('row');
    try {
      const values = Object.fromEntries(
        definition.fields.map((field) => {
          const value = rowValues[field.key] ?? '';
          return [
            field.key,
            field.type === 'text' || field.type === 'date'
              ? value
              : value === ''
                ? null
                : Math.round(
                    Number(value) *
                      (field.type === 'amount' || field.type === 'percentage'
                        ? 100
                        : 1),
                  ),
          ];
        }),
      );
      await client
        .createMutationIntent(
          {
            method: 'PUT',
            path: `/liasse/exercises/${exerciseId}/tables/${tableCode}/rows/${normalizedCode}`,
            schema: erpRegulatoryObjectSchema,
            body: {
              label: rowLabel.trim(),
              position: table?.rows.length ?? 0,
              values,
              notes: rowNotes.trim() || null,
            },
          },
          { idempotency: 'forbidden' },
        )
        .execute();
      setRowLabel('');
      setRowNotes('');
      setRowValues({});
      enqueueSuccessSnackBar({ message: 'Ligne de liasse enregistrée' });
      refresh();
    } catch {
      enqueueErrorSnackBar({ message: 'Enregistrement impossible' });
    } finally {
      setBusyId(null);
    }
  };

  const deleteRow = async (row: LiasseRow) => {
    if (!window.confirm(`Supprimer la ligne ${row.rowCode} ?`)) return;
    setBusyId(row.rowCode);
    try {
      await client
        .createMutationIntent(
          {
            method: 'DELETE',
            path: `/liasse/exercises/${exerciseId}/tables/${tableCode}/rows/${row.rowCode}`,
            schema: erpRegulatoryObjectSchema,
          },
          { idempotency: 'forbidden' },
        )
        .execute();
      refresh();
    } catch {
      enqueueErrorSnackBar({ message: 'Suppression impossible' });
    } finally {
      setBusyId(null);
    }
  };

  const exportPackage = async (format: 'xlsx' | 'json') => {
    if (exerciseId === '') return;
    setBusyId(`export-${format}`);
    try {
      const file = await client.request({
        method: 'GET',
        path: `/liasse/exercises/${exerciseId}/export`,
        query: { format },
        schema: erpRegulatoryFileSchema,
      });
      if (!file.contentBase64) throw new Error('Missing content');
      downloadBase64Content(
        file.filename,
        file.contentBase64,
        file.contentType,
      );
      enqueueSuccessSnackBar({
        message: 'Liasse générée, validation externe encore requise',
      });
      refresh();
    } catch {
      enqueueErrorSnackBar({ message: 'Export de la liasse impossible' });
    } finally {
      setBusyId(null);
    }
  };

  const validateSubmission = async (
    submission: RegulatorySubmission,
    status: 'EXTERNALLY_ACCEPTED' | 'EXTERNALLY_REJECTED',
  ) => {
    if (externalReference.trim() === '') {
      enqueueErrorSnackBar({ message: 'Saisissez la référence externe' });
      return;
    }
    setBusyId(submission.id);
    try {
      await client
        .createMutationIntent(
          {
            method: 'PATCH',
            path: `/liasse/submissions/${submission.id}/external-validation`,
            schema: erpRegulatoryObjectSchema,
            body: {
              accepted: status === 'EXTERNALLY_ACCEPTED',
              externalReference:
                status === 'EXTERNALLY_ACCEPTED'
                  ? externalReference.trim()
                  : null,
              rejectionReason:
                status === 'EXTERNALLY_REJECTED'
                  ? externalReference.trim()
                  : null,
            },
          },
          { idempotency: 'forbidden' },
        )
        .execute();
      enqueueSuccessSnackBar({ message: 'Validation externe enregistrée' });
      refresh();
    } catch {
      enqueueErrorSnackBar({ message: 'Validation impossible' });
    } finally {
      setBusyId(null);
    }
  };

  const columns: ErpOperationalTableColumn<LiasseRow>[] = [
    {
      key: 'code',
      header: 'Code',
      width: '130px',
      render: (row) => row.rowCode,
    },
    {
      key: 'label',
      header: 'Libellé',
      width: '360px',
      render: (row) => row.label,
    },
    {
      key: 'source',
      header: 'Source',
      width: '110px',
      render: (row) => row.source,
    },
    {
      key: 'value',
      header: 'Valeur',
      width: '260px',
      align: 'right',
      render: (row) => cellValue(row, definition),
    },
    {
      key: 'actions',
      header: '',
      width: '80px',
      align: 'center',
      render: (row) =>
        row.source === 'MANUAL' ? (
          <Button
            title="Supprimer"
            ariaLabel={`Supprimer ${row.rowCode}`}
            Icon={IconTrash}
            variant="secondary"
            disabled={busyId !== null}
            onClick={() => void deleteRow(row)}
          />
        ) : null,
    },
  ];

  return (
    <ErpPageShell
      title="Liasse fiscale PCGM"
      description="Tableaux T1 à T20, annexes et dossier réglementaire"
      state={state}
      onRetry={refresh}
      actions={
        <Button
          title="Actualiser"
          ariaLabel="Actualiser la liasse"
          Icon={IconRefresh}
          variant="secondary"
          onClick={refresh}
        />
      }
    >
      <StyledErpWorkspaceToolbar>
        <StyledErpWorkspaceField>
          Exercice
          <StyledErpWorkspaceSelect
            value={exerciseId}
            onChange={(event) => setExerciseId(event.target.value)}
          >
            {exercises.map((exercise) => (
              <option key={exercise.id} value={exercise.id}>
                {exercise.annee}
              </option>
            ))}
          </StyledErpWorkspaceSelect>
        </StyledErpWorkspaceField>
        <StyledErpWorkspaceField>
          Tableau
          <StyledErpWorkspaceSelect
            value={tableCode}
            onChange={(event) => setTableCode(event.target.value)}
          >
            {tableCodes.map((code) => {
              const item = definitions.find(
                (candidate) => candidate.code === code,
              );
              return (
                <option key={code} value={code}>
                  {code} · {item?.label ?? code}
                </option>
              );
            })}
          </StyledErpWorkspaceSelect>
        </StyledErpWorkspaceField>
        <Button
          title="Exporter XLSX"
          ariaLabel="Exporter la liasse XLSX"
          Icon={IconDownload}
          variant="secondary"
          disabled={busyId !== null}
          onClick={() => void exportPackage('xlsx')}
        />
        <Button
          title="Exporter JSON"
          ariaLabel="Exporter la liasse JSON"
          Icon={IconDownload}
          variant="secondary"
          disabled={busyId !== null}
          onClick={() => void exportPackage('json')}
        />
      </StyledErpWorkspaceToolbar>
      <StyledErpWorkspaceSummary>
        <ErpWorkspaceSummaryItem label="Tableau" value={tableCode} />
        <ErpWorkspaceSummaryItem label="Mode" value={definition?.mode ?? '—'} />
        <ErpWorkspaceSummaryItem
          label="Lignes"
          value={table?.rows.length ?? 0}
        />
        <ErpWorkspaceSummaryItem
          label="Soumissions"
          value={submissions.length}
        />
      </StyledErpWorkspaceSummary>
      <StyledErpWorkspaceContent>
        {definition?.mode !== 'COMPUTED' ? (
          <StyledErpWorkspacePanel>
            <StyledErpWorkspacePanelTitle>
              Nouvelle ligne manuelle
            </StyledErpWorkspacePanelTitle>
            <StyledErpWorkspaceFormGrid>
              <StyledErpWorkspaceField>
                Code
                <StyledErpWorkspaceInput
                  value={rowCode}
                  onChange={(event) => setRowCode(event.target.value)}
                />
              </StyledErpWorkspaceField>
              <StyledErpWorkspaceField>
                Libellé
                <StyledErpWorkspaceInput
                  value={rowLabel}
                  onChange={(event) => setRowLabel(event.target.value)}
                />
              </StyledErpWorkspaceField>
              {definition?.fields.map((field) => (
                <StyledErpWorkspaceField key={field.key}>
                  {field.label}
                  <StyledErpWorkspaceInput
                    type={
                      field.type === 'date'
                        ? 'date'
                        : field.type === 'text'
                          ? 'text'
                          : 'number'
                    }
                    step={
                      field.type === 'amount' || field.type === 'percentage'
                        ? '0.01'
                        : '1'
                    }
                    value={rowValues[field.key] ?? ''}
                    onChange={(event) =>
                      setRowValues((current) => ({
                        ...current,
                        [field.key]: event.target.value,
                      }))
                    }
                  />
                </StyledErpWorkspaceField>
              ))}
              <StyledErpWorkspaceField>
                Notes
                <StyledErpWorkspaceTextarea
                  value={rowNotes}
                  onChange={(event) => setRowNotes(event.target.value)}
                />
              </StyledErpWorkspaceField>
              <Button
                title="Enregistrer"
                ariaLabel="Enregistrer la ligne"
                Icon={IconCheck}
                variant="primary"
                disabled={busyId !== null || rowLabel.trim() === ''}
                onClick={() => void saveRow()}
              />
            </StyledErpWorkspaceFormGrid>
          </StyledErpWorkspacePanel>
        ) : null}
        <StyledErpWorkspacePanel>
          <StyledErpWorkspacePanelTitle>
            {definition?.label ?? tableCode}
          </StyledErpWorkspacePanelTitle>
          <ErpOperationalTable
            ariaLabel="Lignes de la liasse"
            columns={columns}
            rows={table?.rows ?? []}
            getRowKey={(row) => row.rowCode}
            emptyLabel="Aucune ligne dans ce tableau"
          />
        </StyledErpWorkspacePanel>
        <StyledErpWorkspacePanel>
          <StyledErpWorkspacePanelTitle>
            Validation réglementaire externe
          </StyledErpWorkspacePanelTitle>
          <StyledErpWorkspaceFormGrid>
            <StyledErpWorkspaceField>
              Référence DGI ou expert-comptable
              <StyledErpWorkspaceInput
                value={externalReference}
                onChange={(event) => setExternalReference(event.target.value)}
              />
            </StyledErpWorkspaceField>
            {submissions.slice(0, 5).map((submission) => (
              <StyledErpWorkspaceInlineActions key={submission.id}>
                <span>
                  {submission.kind} · {submission.periodKey} ·{' '}
                  {submission.validationStatus}
                </span>
                <Button
                  title="Accepté"
                  ariaLabel={`Marquer ${submission.filename} accepté`}
                  Icon={IconCheck}
                  variant="secondary"
                  disabled={busyId !== null}
                  onClick={() =>
                    void validateSubmission(submission, 'EXTERNALLY_ACCEPTED')
                  }
                />
                <Button
                  title="Rejeté"
                  ariaLabel={`Marquer ${submission.filename} rejeté`}
                  Icon={IconTrash}
                  variant="secondary"
                  disabled={busyId !== null}
                  onClick={() =>
                    void validateSubmission(submission, 'EXTERNALLY_REJECTED')
                  }
                />
              </StyledErpWorkspaceInlineActions>
            ))}
          </StyledErpWorkspaceFormGrid>
        </StyledErpWorkspacePanel>
      </StyledErpWorkspaceContent>
    </ErpPageShell>
  );
};
