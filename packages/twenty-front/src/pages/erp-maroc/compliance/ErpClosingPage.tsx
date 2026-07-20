import {
  ErpOperationalTable,
  type ErpOperationalTableColumn,
} from '@/erp-maroc/components/ErpOperationalTable';
import {
  downloadTextContent,
  StyledErpWorkspaceContent,
  StyledErpWorkspaceField,
  StyledErpWorkspaceFormGrid,
  StyledErpWorkspaceInlineActions,
  StyledErpWorkspaceInput,
  StyledErpWorkspacePanel,
  StyledErpWorkspacePanelTitle,
  StyledErpWorkspaceSelect,
  StyledErpWorkspaceSummary,
  ErpWorkspaceSummaryItem,
  StyledErpWorkspaceTabs,
  StyledErpWorkspaceToolbar,
} from '@/erp-maroc/components/ErpComplianceUi';
import { ErpPageShell } from '@/erp-maroc/components/ErpPageShell';
import { useErpMarocContext } from '@/erp-maroc/context/useErpMarocContext';
import { formatMadCents } from '@/erp-maroc/utils/money';
import { useSnackBar } from '@/ui/feedback/snack-bar-manager/hooks/useSnackBar';
import { useEffect, useState } from 'react';
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
  type ErpAccountingPeriod,
  type ErpAccountingReviewTask,
  type ErpExercise,
  type ErpFinancialStatements,
} from 'twenty-shared/erp-maroc';
import {
  IconCheck,
  IconDownload,
  IconLock,
  IconRefresh,
} from 'twenty-ui/display';
import { Button, TabButton } from 'twenty-ui/input';

type View = 'exercises' | 'review' | 'statements' | 'fec';

const todayYear = Number(
  new Date().toLocaleDateString('en-CA', {
    timeZone: 'Africa/Casablanca',
    year: 'numeric',
  }),
);

export const ErpClosingPage = () => {
  const { client, context } = useErpMarocContext();
  const { enqueueErrorSnackBar, enqueueSuccessSnackBar } = useSnackBar();
  const [view, setView] = useState<View>('exercises');
  const [exercises, setExercises] = useState<ErpExercise[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [statements, setStatements] = useState<ErpFinancialStatements | null>(
    null,
  );
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [generation, setGeneration] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [year, setYear] = useState(String(todayYear));
  const [startDate, setStartDate] = useState(`${todayYear}-01-01`);
  const [endDate, setEndDate] = useState(`${todayYear}-12-31`);
  const [reopenReason, setReopenReason] = useState(
    'Correction comptable documentée',
  );
  const canManage = context?.role !== 'COMMERCIAL';
  const canReopen = context?.role === 'OWNER' || context?.role === 'ADMIN';

  useEffect(() => {
    const abortController = new AbortController();
    setState('loading');
    void client
      .request({
        method: 'GET',
        path: '/accounting-compliance/exercises',
        schema: erpExerciseListSchema,
        signal: abortController.signal,
      })
      .then((loaded) => {
        if (abortController.signal.aborted) return;
        setExercises(loaded);
        setSelectedId((current) => current || loaded[0]?.id || '');
        setState('ready');
      })
      .catch(() => {
        if (!abortController.signal.aborted) setState('error');
      });
    return () => abortController.abort();
  }, [client, generation]);

  const selected =
    exercises.find((exercise) => exercise.id === selectedId) ?? null;
  const refresh = () => setGeneration((value) => value + 1);

  useEffect(() => {
    if (view !== 'statements' || selectedId === '') return;
    let active = true;
    setStatements(null);
    void client
      .request({
        method: 'GET',
        path: `/accounting-compliance/exercises/${selectedId}/statements`,
        schema: erpFinancialStatementsSchema,
      })
      .then((loaded) => {
        if (active) setStatements(loaded);
      })
      .catch(() => {
        if (active)
          enqueueErrorSnackBar({ message: 'États financiers indisponibles' });
      });
    return () => {
      active = false;
    };
  }, [client, enqueueErrorSnackBar, selectedId, view]);

  const mutate = async (
    id: string,
    action: () => Promise<unknown>,
    success: string,
  ) => {
    setBusyId(id);
    try {
      await action();
      enqueueSuccessSnackBar({ message: success });
      refresh();
    } catch {
      enqueueErrorSnackBar({ message: "L'opération comptable a échoué" });
    } finally {
      setBusyId(null);
    }
  };

  const createExercise = () =>
    mutate(
      'create',
      () =>
        client
          .createMutationIntent(
            {
              method: 'POST',
              path: '/accounting-compliance/exercises',
              schema: erpExerciseSchema,
              body: {
                annee: Number(year),
                dateDebut: startDate,
                dateFin: endDate,
              },
            },
            { idempotency: 'forbidden' },
          )
          .execute(),
      'Exercice et périodes créés',
    );

  const initializeReview = () => {
    if (!selected) return;
    return mutate(
      selected.id,
      () =>
        client
          .createMutationIntent(
            {
              method: 'POST',
              path: `/accounting-compliance/exercises/${selected.id}/review`,
              schema: erpAccountingReviewTaskListSchema,
            },
            { idempotency: 'forbidden' },
          )
          .execute(),
      'Dossier de révision initialisé',
    );
  };

  const updateReview = (
    task: ErpAccountingReviewTask,
    status: ErpAccountingReviewTask['status'],
  ) =>
    mutate(
      task.id,
      () =>
        client
          .createMutationIntent(
            {
              method: 'PATCH',
              path: `/accounting-compliance/review-tasks/${task.id}`,
              schema: erpAccountingReviewTaskSchema,
              body: { status },
            },
            { idempotency: 'forbidden' },
          )
          .execute(),
      'Révision mise à jour',
    );

  const closePeriod = (period: ErpAccountingPeriod) =>
    mutate(
      period.id,
      () =>
        client
          .createMutationIntent(
            {
              method: 'POST',
              path: `/accounting-compliance/periods/${period.id}/close`,
              schema: erpAccountingPeriodSchema,
            },
            { idempotency: 'forbidden' },
          )
          .execute(),
      'Période fermée et écritures verrouillées',
    );

  const reopenPeriod = (period: ErpAccountingPeriod) => {
    if (reopenReason.trim() === '') {
      enqueueErrorSnackBar({
        message: 'Le motif de réouverture est obligatoire',
      });
      return;
    }
    return mutate(
      period.id,
      () =>
        client
          .createMutationIntent(
            {
              method: 'POST',
              path: `/accounting-compliance/periods/${period.id}/reopen`,
              schema: erpAccountingPeriodSchema,
              body: { reason: reopenReason.trim() },
            },
            { idempotency: 'forbidden' },
          )
          .execute(),
      'Période rouverte avec piste d’audit',
    );
  };

  const closeExercise = () => {
    if (
      !selected ||
      !window.confirm(
        `Clôturer définitivement l'exercice ${selected.annee} et générer les à-nouveaux ?`,
      )
    )
      return;
    return mutate(
      selected.id,
      () =>
        client
          .createMutationIntent(
            {
              method: 'POST',
              path: `/accounting-compliance/exercises/${selected.id}/close`,
              schema: erpExerciseClosingResultSchema,
            },
            { idempotency: 'forbidden' },
          )
          .execute(),
      'Exercice clôturé et à-nouveaux générés',
    );
  };

  const exportFec = async () => {
    if (!selected) return;
    setBusyId('fec-export');
    try {
      const file = await client.request({
        method: 'GET',
        path: `/accounting-compliance/exercises/${selected.id}/fec`,
        schema: erpFecExportSchema,
      });
      downloadTextContent(file.filename, file.content, file.contentType);
    } catch {
      enqueueErrorSnackBar({ message: 'Export FEC impossible' });
    } finally {
      setBusyId(null);
    }
  };

  const importFec = async (file: File | undefined) => {
    if (!file || !selected) return;
    setBusyId('fec-import');
    try {
      const result = await client
        .createMutationIntent(
          {
            method: 'POST',
            path: '/accounting-compliance/fec/import',
            schema: erpFecImportResultSchema,
            body: { exerciceId: selected.id, content: await file.text() },
          },
          { idempotency: 'forbidden' },
        )
        .execute();
      enqueueSuccessSnackBar({
        message: `${result.importedEntries} écritures FEC importées en brouillon`,
      });
      refresh();
    } catch {
      enqueueErrorSnackBar({ message: 'Import FEC rejeté' });
    } finally {
      setBusyId(null);
    }
  };

  const exerciseColumns: ErpOperationalTableColumn<ErpExercise>[] = [
    {
      key: 'year',
      header: 'Exercice',
      width: '100px',
      render: (row) => row.annee,
    },
    {
      key: 'start',
      header: 'Début',
      width: '120px',
      render: (row) => row.dateDebut,
    },
    {
      key: 'end',
      header: 'Fin',
      width: '120px',
      render: (row) => row.dateFin,
    },
    {
      key: 'status',
      header: 'Statut',
      width: '120px',
      render: (row) => row.status,
    },
    {
      key: 'periods',
      header: 'Périodes fermées',
      width: '160px',
      render: (row) =>
        `${row.accountingPeriods?.filter((period) => period.status === 'CLOSED').length ?? 0}/${row.accountingPeriods?.length ?? 0}`,
    },
    {
      key: 'review',
      header: 'Révision terminée',
      width: '160px',
      render: (row) =>
        `${row.accountingReviewTasks?.filter((task) => task.status === 'DONE' || task.status === 'NOT_APPLICABLE').length ?? 0}/${row.accountingReviewTasks?.length ?? 0}`,
    },
    {
      key: 'select',
      header: 'Action',
      width: '150px',
      render: (row) => (
        <Button
          title="Ouvrir"
          ariaLabel={`Ouvrir l'exercice ${row.annee}`}
          variant={row.id === selectedId ? 'primary' : 'secondary'}
          onClick={() => setSelectedId(row.id)}
        />
      ),
    },
  ];

  const periodColumns: ErpOperationalTableColumn<ErpAccountingPeriod>[] = [
    {
      key: 'number',
      header: 'Période',
      width: '100px',
      render: (row) => row.periodNumber,
    },
    {
      key: 'start',
      header: 'Début',
      width: '120px',
      render: (row) => row.startDate,
    },
    {
      key: 'end',
      header: 'Fin',
      width: '120px',
      render: (row) => row.endDate,
    },
    {
      key: 'status',
      header: 'Statut',
      width: '120px',
      render: (row) => row.status,
    },
    {
      key: 'action',
      header: 'Action',
      width: '220px',
      render: (row) => (
        <StyledErpWorkspaceInlineActions>
          {row.status === 'OPEN' ? (
            <Button
              title="Fermer"
              ariaLabel="Fermer la période"
              Icon={IconLock}
              variant="secondary"
              disabled={!canManage || busyId !== null}
              onClick={() => void closePeriod(row)}
            />
          ) : canReopen ? (
            <Button
              title="Rouvrir"
              ariaLabel="Rouvrir la période"
              variant="secondary"
              disabled={busyId !== null}
              onClick={() => void reopenPeriod(row)}
            />
          ) : null}
        </StyledErpWorkspaceInlineActions>
      ),
    },
  ];

  const reviewColumns: ErpOperationalTableColumn<ErpAccountingReviewTask>[] = [
    {
      key: 'category',
      header: 'Cycle',
      width: '160px',
      render: (row) => row.category,
    },
    {
      key: 'label',
      header: 'Contrôle',
      width: '360px',
      render: (row) => row.label,
    },
    {
      key: 'status',
      header: 'Statut',
      width: '180px',
      render: (row) => (
        <StyledErpWorkspaceSelect
          value={row.status}
          disabled={!canManage || busyId !== null}
          onChange={(event) =>
            void updateReview(
              row,
              event.target.value as ErpAccountingReviewTask['status'],
            )
          }
        >
          <option value="TODO">À faire</option>
          <option value="IN_PROGRESS">En cours</option>
          <option value="DONE">Terminé</option>
          <option value="NOT_APPLICABLE">Non applicable</option>
        </StyledErpWorkspaceSelect>
      ),
    },
  ];

  return (
    <ErpPageShell
      title="Clôture et états financiers"
      description="Exercices, verrouillage, révision, PCGM, liasse et FEC"
      actions={
        <Button
          title="Actualiser"
          ariaLabel="Actualiser"
          Icon={IconRefresh}
          variant="secondary"
          onClick={refresh}
        />
      }
      state={state}
      loadingLabel="Chargement des exercices"
      errorLabel="Impossible de charger la clôture comptable"
      onRetry={refresh}
    >
      <StyledErpWorkspaceTabs role="tablist" aria-label="Clôture comptable">
        <TabButton
          id="closing-exercises"
          title="Exercices"
          active={view === 'exercises'}
          onClick={() => setView('exercises')}
        />
        <TabButton
          id="closing-review"
          title="Révision"
          active={view === 'review'}
          onClick={() => setView('review')}
        />
        <TabButton
          id="closing-statements"
          title="États financiers"
          active={view === 'statements'}
          onClick={() => setView('statements')}
        />
        <TabButton
          id="closing-fec"
          title="FEC"
          active={view === 'fec'}
          onClick={() => setView('fec')}
        />
      </StyledErpWorkspaceTabs>
      <StyledErpWorkspaceToolbar>
        <StyledErpWorkspaceField>
          Exercice actif
          <StyledErpWorkspaceSelect
            value={selectedId}
            onChange={(event) => setSelectedId(event.target.value)}
          >
            {exercises.map((exercise) => (
              <option key={exercise.id} value={exercise.id}>
                {exercise.annee} · {exercise.status}
              </option>
            ))}
          </StyledErpWorkspaceSelect>
        </StyledErpWorkspaceField>
        {view === 'review' ? (
          <Button
            title="Initialiser les contrôles"
            ariaLabel="Initialiser les contrôles de révision"
            Icon={IconCheck}
            variant="secondary"
            disabled={!canManage || !selected || busyId !== null}
            onClick={() => void initializeReview()}
          />
        ) : null}
        {view === 'exercises' && selected?.status === 'OPEN' ? (
          <Button
            title="Clôturer l'exercice"
            ariaLabel="Clôturer l'exercice"
            Icon={IconLock}
            variant="secondary"
            disabled={!canManage || busyId !== null}
            onClick={() => void closeExercise()}
          />
        ) : null}
        {view === 'fec' ? (
          <Button
            title="Exporter FEC"
            ariaLabel="Exporter le FEC"
            Icon={IconDownload}
            variant="secondary"
            disabled={!selected || busyId !== null}
            onClick={() => void exportFec()}
          />
        ) : null}
      </StyledErpWorkspaceToolbar>
      <StyledErpWorkspaceContent>
        {view === 'exercises' ? (
          <>
            <StyledErpWorkspacePanel>
              <StyledErpWorkspacePanelTitle>
                Nouvel exercice
              </StyledErpWorkspacePanelTitle>
              <StyledErpWorkspaceFormGrid>
                <StyledErpWorkspaceField>
                  Année
                  <StyledErpWorkspaceInput
                    type="number"
                    value={year}
                    onChange={(event) => setYear(event.target.value)}
                  />
                </StyledErpWorkspaceField>
                <StyledErpWorkspaceField>
                  Date de début
                  <StyledErpWorkspaceInput
                    type="date"
                    value={startDate}
                    onChange={(event) => setStartDate(event.target.value)}
                  />
                </StyledErpWorkspaceField>
                <StyledErpWorkspaceField>
                  Date de fin
                  <StyledErpWorkspaceInput
                    type="date"
                    value={endDate}
                    onChange={(event) => setEndDate(event.target.value)}
                  />
                </StyledErpWorkspaceField>
                <Button
                  title="Créer"
                  ariaLabel="Créer l'exercice"
                  variant="primary"
                  disabled={!canManage || busyId !== null}
                  onClick={() => void createExercise()}
                />
              </StyledErpWorkspaceFormGrid>
            </StyledErpWorkspacePanel>
            <ErpOperationalTable
              ariaLabel="Exercices comptables"
              columns={exerciseColumns}
              rows={exercises}
              getRowKey={(row) => row.id}
              emptyLabel="Aucun exercice"
            />
            {selected ? (
              <StyledErpWorkspacePanel>
                <StyledErpWorkspacePanelTitle>
                  Périodes de {selected.annee}
                </StyledErpWorkspacePanelTitle>
                {canReopen ? (
                  <StyledErpWorkspaceFormGrid>
                    <StyledErpWorkspaceField>
                      Motif de réouverture
                      <StyledErpWorkspaceInput
                        value={reopenReason}
                        onChange={(event) =>
                          setReopenReason(event.target.value)
                        }
                      />
                    </StyledErpWorkspaceField>
                  </StyledErpWorkspaceFormGrid>
                ) : null}
                <ErpOperationalTable
                  ariaLabel="Périodes comptables"
                  columns={periodColumns}
                  rows={selected.accountingPeriods ?? []}
                  getRowKey={(row) => row.id}
                  emptyLabel="Aucune période"
                />
              </StyledErpWorkspacePanel>
            ) : null}
          </>
        ) : null}
        {view === 'review' ? (
          <ErpOperationalTable
            ariaLabel="Dossier de révision"
            columns={reviewColumns}
            rows={selected?.accountingReviewTasks ?? []}
            getRowKey={(row) => row.id}
            emptyLabel="Initialisez le dossier de révision"
          />
        ) : null}
        {view === 'statements' ? (
          statements === null ? (
            <StyledErpWorkspacePanelTitle>
              Calcul des états financiers...
            </StyledErpWorkspacePanelTitle>
          ) : (
            <>
              <StyledErpWorkspaceSummary>
                <ErpWorkspaceSummaryItem
                  label="Total actif"
                  value={formatMadCents(statements.bilan.assets.totalCents)}
                />
                <ErpWorkspaceSummaryItem
                  label="Total passif"
                  value={formatMadCents(
                    statements.bilan.liabilities.totalCents,
                  )}
                />
                <ErpWorkspaceSummaryItem
                  label="Résultat net"
                  value={formatMadCents(statements.cpc.netResultCents)}
                />
                <ErpWorkspaceSummaryItem
                  label="Valeur ajoutée"
                  value={formatMadCents(statements.esg.valueAddedCents)}
                />
                <ErpWorkspaceSummaryItem
                  label="CAF"
                  value={formatMadCents(
                    statements.financing.selfFinancingCapacityCents,
                  )}
                />
                <ErpWorkspaceSummaryItem
                  label="Équilibre bilan"
                  value={
                    statements.bilan.isBalanced
                      ? 'Conforme'
                      : formatMadCents(statements.bilan.differenceCents)
                  }
                />
              </StyledErpWorkspaceSummary>
              <StyledErpWorkspacePanel>
                <StyledErpWorkspacePanelTitle>
                  Bilan PCGM, CPC, ESG, tableau de financement et annexes
                  calculés pour {statements.exercise.year}
                </StyledErpWorkspacePanelTitle>
              </StyledErpWorkspacePanel>
            </>
          )
        ) : null}
        {view === 'fec' ? (
          <StyledErpWorkspacePanel>
            <StyledErpWorkspacePanelTitle>
              Import / export FEC
            </StyledErpWorkspacePanelTitle>
            <StyledErpWorkspaceFormGrid>
              <StyledErpWorkspaceField>
                Fichier FEC à importer
                <StyledErpWorkspaceInput
                  type="file"
                  accept=".txt,.csv,.tsv"
                  disabled={!canManage || !selected || busyId !== null}
                  onChange={(event) => void importFec(event.target.files?.[0])}
                />
              </StyledErpWorkspaceField>
            </StyledErpWorkspaceFormGrid>
          </StyledErpWorkspacePanel>
        ) : null}
      </StyledErpWorkspaceContent>
    </ErpPageShell>
  );
};
