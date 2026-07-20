import {
  ErpOperationalTable,
  type ErpOperationalTableColumn,
} from '@/erp-maroc/components/ErpOperationalTable';
import {
  downloadTextContent,
  StyledErpWorkspaceContent,
  StyledErpWorkspaceField,
  StyledErpWorkspaceInlineActions,
  StyledErpWorkspaceInput,
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
  erpExerciseListSchema,
  erpFileExportSchema,
  erpFiscalDeadlineListSchema,
  erpFiscalDeadlineSchema,
  erpTaxDeclarationListSchema,
  erpTaxDeclarationSchema,
  type ErpExercise,
  type ErpFiscalDeadline,
  type ErpTaxDeclaration,
} from 'twenty-shared/erp-maroc';
import { IconCheck, IconDownload, IconRefresh } from 'twenty-ui/display';
import { Button, TabButton } from 'twenty-ui/input';

type View = 'declarations' | 'calendar';

const currentMonth = () =>
  new Date().toLocaleDateString('en-CA', {
    timeZone: 'Africa/Casablanca',
    year: 'numeric',
    month: '2-digit',
  });

const monthBounds = (periodKey: string) => {
  const [year, month] = periodKey.split('-').map(Number);
  const end = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
  return { start: `${periodKey}-01`, end };
};

const nextDeclarationStatus = (
  status: ErpTaxDeclaration['status'],
): 'REVIEWED' | 'FILED' | 'PAID' | null => {
  if (status === 'DRAFT') return 'REVIEWED';
  if (status === 'REVIEWED') return 'FILED';
  if (status === 'FILED') return 'PAID';
  return null;
};

const nextStatusLabel = (status: ReturnType<typeof nextDeclarationStatus>) => {
  if (status === 'REVIEWED') return 'Valider le contrôle';
  if (status === 'FILED') return 'Marquer déposée';
  if (status === 'PAID') return 'Marquer payée';
  return '';
};

export const ErpFiscalPage = () => {
  const { client, context } = useErpMarocContext();
  const { enqueueErrorSnackBar, enqueueSuccessSnackBar } = useSnackBar();
  const [view, setView] = useState<View>('declarations');
  const [declarations, setDeclarations] = useState<ErpTaxDeclaration[]>([]);
  const [deadlines, setDeadlines] = useState<ErpFiscalDeadline[]>([]);
  const [exercises, setExercises] = useState<ErpExercise[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [generation, setGeneration] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [periodKey, setPeriodKey] = useState(currentMonth);
  const [prorataPercent, setProrataPercent] = useState('100');
  const [exerciseId, setExerciseId] = useState('');
  const [filingReference, setFilingReference] = useState('');
  const canManage = context?.role !== 'COMMERCIAL';

  useEffect(() => {
    const abortController = new AbortController();
    setState('loading');
    Promise.all([
      client.request({
        method: 'GET',
        path: '/fiscal/declarations',
        schema: erpTaxDeclarationListSchema,
        signal: abortController.signal,
      }),
      client.request({
        method: 'GET',
        path: '/fiscal/deadlines',
        schema: erpFiscalDeadlineListSchema,
        signal: abortController.signal,
      }),
      client.request({
        method: 'GET',
        path: '/accounting-compliance/exercises',
        schema: erpExerciseListSchema,
        signal: abortController.signal,
      }),
    ])
      .then(([loadedDeclarations, loadedDeadlines, loadedExercises]) => {
        if (abortController.signal.aborted) return;
        setDeclarations(loadedDeclarations);
        setDeadlines(loadedDeadlines);
        setExercises(loadedExercises);
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

  const refresh = () => setGeneration((value) => value + 1);

  const calculateTva = async () => {
    const prorata = Number(prorataPercent);
    if (
      !/^\d{4}-(?:0[1-9]|1[0-2])$/.test(periodKey) ||
      prorata < 0 ||
      prorata > 100
    ) {
      enqueueErrorSnackBar({ message: 'Période ou prorata invalide' });
      return;
    }
    const bounds = monthBounds(periodKey);
    setBusyId('tva');
    try {
      await client
        .createMutationIntent(
          {
            method: 'POST',
            path: '/fiscal/tva/calculate',
            schema: erpTaxDeclarationSchema,
            body: {
              periodKey,
              periodStart: bounds.start,
              periodEnd: bounds.end,
              prorataBasisPoints: Math.round(prorata * 100),
            },
          },
          { idempotency: 'forbidden' },
        )
        .execute();
      enqueueSuccessSnackBar({ message: 'Déclaration TVA recalculée' });
      refresh();
    } catch {
      enqueueErrorSnackBar({ message: 'Calcul TVA impossible' });
    } finally {
      setBusyId(null);
    }
  };

  const calculateIs = async () => {
    if (exerciseId === '') return;
    setBusyId('is');
    try {
      await client
        .createMutationIntent(
          {
            method: 'POST',
            path: '/fiscal/is/calculate',
            schema: erpTaxDeclarationSchema,
            body: { exerciceId: exerciseId },
          },
          { idempotency: 'forbidden' },
        )
        .execute();
      enqueueSuccessSnackBar({ message: 'IS et acomptes recalculés' });
      refresh();
    } catch {
      enqueueErrorSnackBar({ message: 'Calcul IS impossible' });
    } finally {
      setBusyId(null);
    }
  };

  const transition = async (declaration: ErpTaxDeclaration) => {
    const status = nextDeclarationStatus(declaration.status);
    if (status === null) return;
    if (status === 'FILED' && filingReference.trim() === '') {
      enqueueErrorSnackBar({
        message: 'La référence de dépôt est obligatoire',
      });
      return;
    }
    setBusyId(declaration.id);
    try {
      await client
        .createMutationIntent(
          {
            method: 'PATCH',
            path: `/fiscal/declarations/${declaration.id}/status`,
            schema: erpTaxDeclarationSchema,
            body: {
              status,
              ...(status === 'FILED'
                ? { filingReference: filingReference.trim() }
                : {}),
            },
          },
          { idempotency: 'forbidden' },
        )
        .execute();
      enqueueSuccessSnackBar({ message: 'Statut fiscal mis à jour' });
      refresh();
    } catch {
      enqueueErrorSnackBar({ message: 'Mise à jour fiscale impossible' });
    } finally {
      setBusyId(null);
    }
  };

  const exportSimpl = async (declaration: ErpTaxDeclaration) => {
    setBusyId(declaration.id);
    try {
      const file = await client.request({
        method: 'GET',
        path: `/fiscal/declarations/${declaration.id}/simpl`,
        schema: erpFileExportSchema,
      });
      downloadTextContent(file.filename, file.content, file.contentType);
    } catch {
      enqueueErrorSnackBar({
        message:
          'Export SIMPL indisponible. Vérifiez ICE et identifiant fiscal.',
      });
    } finally {
      setBusyId(null);
    }
  };

  const seedCalendar = async () => {
    const year = periodKey.slice(0, 4);
    setBusyId('calendar');
    try {
      await client
        .createMutationIntent(
          {
            method: 'POST',
            path: '/fiscal/deadlines/seed',
            query: { year },
            schema: erpFiscalDeadlineListSchema,
          },
          { idempotency: 'forbidden' },
        )
        .execute();
      enqueueSuccessSnackBar({ message: 'Calendrier fiscal généré' });
      refresh();
    } catch {
      enqueueErrorSnackBar({ message: 'Calendrier fiscal indisponible' });
    } finally {
      setBusyId(null);
    }
  };

  const completeDeadline = async (deadline: ErpFiscalDeadline) => {
    setBusyId(deadline.id);
    try {
      await client
        .createMutationIntent(
          {
            method: 'PATCH',
            path: `/fiscal/deadlines/${deadline.id}/complete`,
            schema: erpFiscalDeadlineSchema,
            body: {},
          },
          { idempotency: 'forbidden' },
        )
        .execute();
      refresh();
    } catch {
      enqueueErrorSnackBar({ message: "L'échéance n'a pas pu être clôturée" });
    } finally {
      setBusyId(null);
    }
  };

  const declarationColumns: ErpOperationalTableColumn<ErpTaxDeclaration>[] = [
    {
      key: 'type',
      header: 'Impôt',
      width: '80px',
      render: (row) => row.type,
    },
    {
      key: 'period',
      header: 'Période',
      width: '120px',
      render: (row) => row.periodKey,
    },
    {
      key: 'status',
      header: 'Statut',
      width: '120px',
      render: (row) => row.status,
    },
    {
      key: 'base',
      header: 'Base',
      width: '140px',
      align: 'right',
      render: (row) => formatMadCents(row.taxableBaseCents),
    },
    {
      key: 'collected',
      header: 'TVA collectée',
      width: '150px',
      align: 'right',
      render: (row) => formatMadCents(row.collectedTaxCents),
    },
    {
      key: 'deductible',
      header: 'TVA déductible',
      width: '150px',
      align: 'right',
      render: (row) => formatMadCents(row.deductibleTaxCents),
    },
    {
      key: 'due',
      header: 'À payer',
      width: '140px',
      align: 'right',
      render: (row) => formatMadCents(row.taxDueCents),
    },
    {
      key: 'actions',
      header: 'Actions',
      width: '300px',
      render: (row) => {
        const next = nextDeclarationStatus(row.status);
        return (
          <StyledErpWorkspaceInlineActions>
            {next === null || !canManage ? null : (
              <Button
                title={nextStatusLabel(next)}
                ariaLabel={nextStatusLabel(next)}
                Icon={IconCheck}
                variant="secondary"
                disabled={busyId !== null}
                onClick={() => void transition(row)}
              />
            )}
            {row.type === 'TVA' ? (
              <Button
                title="XML SIMPL"
                ariaLabel="Télécharger XML SIMPL"
                Icon={IconDownload}
                variant="secondary"
                disabled={busyId !== null}
                onClick={() => void exportSimpl(row)}
              />
            ) : null}
          </StyledErpWorkspaceInlineActions>
        );
      },
    },
  ];

  const deadlineColumns: ErpOperationalTableColumn<ErpFiscalDeadline>[] = [
    {
      key: 'due',
      header: 'Échéance',
      width: '120px',
      render: (row) => row.dueDate,
    },
    {
      key: 'category',
      header: 'Catégorie',
      width: '130px',
      render: (row) => row.category,
    },
    {
      key: 'label',
      header: 'Obligation',
      width: '320px',
      render: (row) => row.label,
    },
    {
      key: 'period',
      header: 'Période',
      width: '120px',
      render: (row) => row.periodKey,
    },
    {
      key: 'status',
      header: 'État',
      width: '120px',
      render: (row) => (row.completedAt ? 'Terminée' : 'À faire'),
    },
    {
      key: 'actions',
      header: 'Action',
      width: '180px',
      render: (row) =>
        row.completedAt || !canManage ? null : (
          <Button
            title="Terminer"
            ariaLabel="Marquer l'échéance terminée"
            Icon={IconCheck}
            variant="secondary"
            disabled={busyId !== null}
            onClick={() => void completeDeadline(row)}
          />
        ),
    },
  ];

  const openDeadlines = deadlines.filter(
    (deadline) => deadline.completedAt === null,
  ).length;
  const taxDue = declarations.reduce(
    (sum, declaration) => sum + declaration.taxDueCents,
    0,
  );

  return (
    <ErpPageShell
      title="Fiscalité marocaine"
      description="TVA, IS, échéances et télédéclaration SIMPL"
      actions={
        <Button
          title="Actualiser"
          ariaLabel="Actualiser la fiscalité"
          Icon={IconRefresh}
          variant="secondary"
          onClick={refresh}
        />
      }
      state={state}
      loadingLabel="Chargement des obligations fiscales"
      errorLabel="Impossible de charger la fiscalité"
      onRetry={refresh}
    >
      <StyledErpWorkspaceTabs>
        <TabButton
          id="fiscal-declarations"
          title="Déclarations"
          active={view === 'declarations'}
          onClick={() => setView('declarations')}
        />
        <TabButton
          id="fiscal-calendar"
          title="Calendrier"
          active={view === 'calendar'}
          onClick={() => setView('calendar')}
        />
      </StyledErpWorkspaceTabs>
      <StyledErpWorkspaceSummary>
        <ErpWorkspaceSummaryItem
          label="Déclarations"
          value={declarations.length}
        />
        <ErpWorkspaceSummaryItem
          label="Impôts à payer"
          value={formatMadCents(taxDue)}
        />
        <ErpWorkspaceSummaryItem
          label="Échéances ouvertes"
          value={openDeadlines}
        />
      </StyledErpWorkspaceSummary>
      <StyledErpWorkspaceToolbar>
        <StyledErpWorkspaceField>
          Période
          <StyledErpWorkspaceInput
            type="month"
            value={periodKey}
            onChange={(event) => setPeriodKey(event.target.value)}
          />
        </StyledErpWorkspaceField>
        {view === 'declarations' ? (
          <>
            <StyledErpWorkspaceField>
              Prorata TVA (%)
              <StyledErpWorkspaceInput
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={prorataPercent}
                onChange={(event) => setProrataPercent(event.target.value)}
              />
            </StyledErpWorkspaceField>
            <Button
              title="Calculer TVA"
              ariaLabel="Calculer la TVA"
              variant="primary"
              disabled={!canManage || busyId !== null}
              onClick={() => void calculateTva()}
            />
            <StyledErpWorkspaceField>
              Exercice IS
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
            <Button
              title="Calculer IS"
              ariaLabel="Calculer l'IS"
              variant="secondary"
              disabled={!canManage || busyId !== null || exerciseId === ''}
              onClick={() => void calculateIs()}
            />
            <StyledErpWorkspaceField>
              Référence de dépôt
              <StyledErpWorkspaceInput
                value={filingReference}
                onChange={(event) => setFilingReference(event.target.value)}
              />
            </StyledErpWorkspaceField>
          </>
        ) : (
          <Button
            title="Générer l'année"
            ariaLabel="Générer le calendrier fiscal"
            variant="primary"
            disabled={!canManage || busyId !== null}
            onClick={() => void seedCalendar()}
          />
        )}
      </StyledErpWorkspaceToolbar>
      <StyledErpWorkspaceContent>
        {view === 'declarations' ? (
          <ErpOperationalTable
            ariaLabel="Déclarations fiscales"
            columns={declarationColumns}
            rows={declarations}
            getRowKey={(row) => row.id}
            emptyLabel="Aucune déclaration calculée"
          />
        ) : (
          <ErpOperationalTable
            ariaLabel="Calendrier fiscal"
            columns={deadlineColumns}
            rows={deadlines}
            getRowKey={(row) => row.id}
            emptyLabel="Calendrier fiscal non généré"
          />
        )}
      </StyledErpWorkspaceContent>
    </ErpPageShell>
  );
};
