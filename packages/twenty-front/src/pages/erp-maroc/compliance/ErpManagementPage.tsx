import {
  ErpOperationalTable,
  type ErpOperationalTableColumn,
} from '@/erp-maroc/components/ErpOperationalTable';
import {
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
  erpAccountingAnomalyListSchema,
  erpAccountingAnomalySchema,
  erpAnalyticAllocationSchema,
  erpAnalyticAxisListSchema,
  erpAnalyticAxisSchema,
  erpAnomalyScanResultSchema,
  erpBudgetListSchema,
  erpBudgetSchema,
  erpBudgetVarianceSchema,
  erpEmployeeListSchema,
  erpExchangeRateListSchema,
  erpExchangeRateSchema,
  erpExerciseListSchema,
  erpExpenseNoteListSchema,
  erpExpenseNoteSchema,
  erpPortalAccessListSchema,
  erpPortalAccessSchema,
  erpRecurringInvoiceListSchema,
  erpRecurringInvoiceRunSchema,
  erpRecurringInvoiceSchema,
  erpTierListSchema,
  type ErpAccountingAnomaly,
  type ErpAnalyticAxis,
  type ErpBudget,
  type ErpEmployee,
  type ErpExchangeRate,
  type ErpExercise,
  type ErpExpenseNote,
  type ErpPortalAccess,
  type ErpRecurringInvoice,
  type ErpTier,
} from 'twenty-shared/erp-maroc';
import { IconCheck, IconRefresh } from 'twenty-ui/display';
import { Button, TabButton } from 'twenty-ui/input';

type View = 'expenses' | 'analytics' | 'automation' | 'controls';

const today = () =>
  new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Casablanca' });

export const ErpManagementPage = () => {
  const { client, context } = useErpMarocContext();
  const { enqueueErrorSnackBar, enqueueSuccessSnackBar } = useSnackBar();
  const [view, setView] = useState<View>('expenses');
  const [expenses, setExpenses] = useState<ErpExpenseNote[]>([]);
  const [analytics, setAnalytics] = useState<ErpAnalyticAxis[]>([]);
  const [budgets, setBudgets] = useState<ErpBudget[]>([]);
  const [recurring, setRecurring] = useState<ErpRecurringInvoice[]>([]);
  const [rates, setRates] = useState<ErpExchangeRate[]>([]);
  const [portals, setPortals] = useState<ErpPortalAccess[]>([]);
  const [anomalies, setAnomalies] = useState<ErpAccountingAnomaly[]>([]);
  const [exercises, setExercises] = useState<ErpExercise[]>([]);
  const [tiers, setTiers] = useState<ErpTier[]>([]);
  const [employees, setEmployees] = useState<ErpEmployee[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [generation, setGeneration] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [employeeId, setEmployeeId] = useState('');
  const [expenseTitle, setExpenseTitle] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('Déplacement');
  const [expenseMad, setExpenseMad] = useState('');
  const [expenseTva, setExpenseTva] = useState('20');
  const [expenseDate, setExpenseDate] = useState(today);

  const [axisCode, setAxisCode] = useState('ACTIVITE');
  const [axisLabel, setAxisLabel] = useState('Activité');
  const [sectionCode, setSectionCode] = useState('GENERAL');
  const [sectionLabel, setSectionLabel] = useState('Général');
  const [entryLineId, setEntryLineId] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [allocationPercent, setAllocationPercent] = useState('100');

  const [exerciseId, setExerciseId] = useState('');
  const [budgetCode, setBudgetCode] = useState('BUDGET');
  const [budgetLabel, setBudgetLabel] = useState('Budget annuel');
  const [budgetAccount, setBudgetAccount] = useState('6122');
  const [budgetAmountMad, setBudgetAmountMad] = useState('');

  const [tierId, setTierId] = useState('');
  const [recurringLabel, setRecurringLabel] = useState('Abonnement mensuel');
  const [recurringDescription, setRecurringDescription] =
    useState('Service récurrent');
  const [recurringPriceMad, setRecurringPriceMad] = useState('');
  const [nextRunDate, setNextRunDate] = useState(today);

  const [currency, setCurrency] = useState('EUR');
  const [exchangeRate, setExchangeRate] = useState('');
  const [twentyUserId, setTwentyUserId] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState(
    'Contrôle effectué et justification archivée',
  );
  const canManage = context?.role !== 'COMMERCIAL';

  useEffect(() => {
    const abortController = new AbortController();
    setState('loading');
    Promise.all([
      client.request({
        method: 'GET',
        path: '/operations/expense-notes',
        schema: erpExpenseNoteListSchema,
        signal: abortController.signal,
      }),
      client.request({
        method: 'GET',
        path: '/operations/analytics',
        schema: erpAnalyticAxisListSchema,
        signal: abortController.signal,
      }),
      client.request({
        method: 'GET',
        path: '/operations/budgets',
        schema: erpBudgetListSchema,
        signal: abortController.signal,
      }),
      client.request({
        method: 'GET',
        path: '/operations/recurring-invoices',
        schema: erpRecurringInvoiceListSchema,
        signal: abortController.signal,
      }),
      client.request({
        method: 'GET',
        path: '/operations/exchange-rates',
        schema: erpExchangeRateListSchema,
        signal: abortController.signal,
      }),
      client.request({
        method: 'GET',
        path: '/operations/portal-access',
        schema: erpPortalAccessListSchema,
        signal: abortController.signal,
      }),
      client.request({
        method: 'GET',
        path: '/operations/anomalies',
        schema: erpAccountingAnomalyListSchema,
        signal: abortController.signal,
      }),
      client.request({
        method: 'GET',
        path: '/accounting-compliance/exercises',
        schema: erpExerciseListSchema,
        signal: abortController.signal,
      }),
      client.request({
        method: 'GET',
        path: '/tiers',
        schema: erpTierListSchema,
        signal: abortController.signal,
      }),
      client.request({
        method: 'GET',
        path: '/payroll/employees',
        schema: erpEmployeeListSchema,
        signal: abortController.signal,
      }),
    ])
      .then(
        ([
          loadedExpenses,
          loadedAnalytics,
          loadedBudgets,
          loadedRecurring,
          loadedRates,
          loadedPortals,
          loadedAnomalies,
          loadedExercises,
          loadedTiers,
          loadedEmployees,
        ]) => {
          if (abortController.signal.aborted) return;
          setExpenses(loadedExpenses);
          setAnalytics(loadedAnalytics);
          setBudgets(loadedBudgets);
          setRecurring(loadedRecurring);
          setRates(loadedRates);
          setPortals(loadedPortals);
          setAnomalies(loadedAnomalies);
          setExercises(loadedExercises);
          setTiers(loadedTiers);
          setEmployees(loadedEmployees);
          setExerciseId(
            (current) =>
              current ||
              loadedExercises.find((item) => item.status === 'OPEN')?.id ||
              loadedExercises[0]?.id ||
              '',
          );
          setTierId(
            (current) =>
              current ||
              loadedTiers.find((item) => item.type !== 'FOURNISSEUR')?.id ||
              '',
          );
          setEmployeeId(
            (current) =>
              current ||
              loadedEmployees.find((item) => item.status === 'ACTIVE')?.id ||
              '',
          );
          setSectionId(
            (current) =>
              current ||
              loadedAnalytics.flatMap((axis) => axis.sections)[0]?.id ||
              '',
          );
          setState('ready');
        },
      )
      .catch(() => {
        if (!abortController.signal.aborted) setState('error');
      });
    return () => abortController.abort();
  }, [client, generation]);

  const refresh = () => setGeneration((value) => value + 1);
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
      enqueueErrorSnackBar({ message: 'Opération de gestion impossible' });
    } finally {
      setBusyId(null);
    }
  };

  const createExpense = () => {
    const amountHtCents = Math.round(Number(expenseMad) * 100);
    if (
      !expenseTitle.trim() ||
      !Number.isSafeInteger(amountHtCents) ||
      amountHtCents <= 0
    )
      return;
    return mutate(
      'expense-create',
      () =>
        client
          .createMutationIntent(
            {
              method: 'POST',
              path: '/operations/expense-notes',
              schema: erpExpenseNoteSchema,
              body: {
                employeeId: employeeId || null,
                title: expenseTitle.trim(),
                expenseDate,
                lines: [
                  {
                    description: expenseTitle.trim(),
                    category: expenseCategory.trim(),
                    amountHtCents,
                    tvaRate: Number(expenseTva),
                  },
                ],
              },
            },
            { idempotency: 'forbidden' },
          )
          .execute(),
      'Note de frais créée',
    );
  };

  const expenseAction = (
    expense: ErpExpenseNote,
    status?: 'APPROVED' | 'REJECTED',
  ) =>
    mutate(
      expense.id,
      () =>
        client
          .createMutationIntent(
            {
              method: status ? 'PATCH' : 'POST',
              path: status
                ? `/operations/expense-notes/${expense.id}/decision`
                : `/operations/expense-notes/${expense.id}/submit`,
              schema: erpExpenseNoteSchema,
              ...(status
                ? {
                    body: {
                      status,
                      ...(status === 'REJECTED'
                        ? { reason: 'Rejet de contrôle' }
                        : {}),
                    },
                  }
                : {}),
            },
            { idempotency: 'forbidden' },
          )
          .execute(),
      status === 'APPROVED'
        ? 'Note approuvée et comptabilisée'
        : status === 'REJECTED'
          ? 'Note rejetée'
          : 'Note soumise',
    );

  const createAxis = () =>
    mutate(
      'axis-create',
      () =>
        client
          .createMutationIntent(
            {
              method: 'POST',
              path: '/operations/analytics',
              schema: erpAnalyticAxisSchema,
              body: {
                code: axisCode,
                label: axisLabel,
                sections: [{ code: sectionCode, label: sectionLabel }],
              },
            },
            { idempotency: 'forbidden' },
          )
          .execute(),
      'Axe analytique créé',
    );

  const allocate = () =>
    mutate(
      'allocation',
      () =>
        client
          .createMutationIntent(
            {
              method: 'POST',
              path: '/operations/analytics/allocations',
              schema: erpAnalyticAllocationSchema,
              body: {
                entryLineId,
                sectionId,
                percentageBasisPoints: Math.round(
                  Number(allocationPercent) * 100,
                ),
              },
            },
            { idempotency: 'forbidden' },
          )
          .execute(),
      'Ventilation analytique enregistrée',
    );

  const createBudget = () => {
    const amountCents = Math.round(Number(budgetAmountMad) * 100);
    if (!exerciseId || !Number.isSafeInteger(amountCents)) return;
    return mutate(
      'budget-create',
      () =>
        client
          .createMutationIntent(
            {
              method: 'POST',
              path: '/operations/budgets',
              schema: erpBudgetSchema,
              body: {
                exerciceId: exerciseId,
                code: budgetCode,
                label: budgetLabel,
                lines: [
                  { accountCode: budgetAccount, periodNumber: 1, amountCents },
                ],
              },
            },
            { idempotency: 'forbidden' },
          )
          .execute(),
      'Budget créé',
    );
  };

  const approveBudget = (budget: ErpBudget) =>
    mutate(
      budget.id,
      () =>
        client
          .createMutationIntent(
            {
              method: 'POST',
              path: `/operations/budgets/${budget.id}/approve`,
              schema: erpBudgetSchema,
            },
            { idempotency: 'forbidden' },
          )
          .execute(),
      'Budget approuvé',
    );

  const showVariance = async (budget: ErpBudget) => {
    setBusyId(budget.id);
    try {
      const rows = await client.request({
        method: 'GET',
        path: `/operations/budgets/${budget.id}/variance`,
        schema: erpBudgetVarianceSchema,
      });
      const variance = rows.reduce((sum, row) => sum + row.varianceCents, 0);
      enqueueSuccessSnackBar({
        message: `Écart cumulé: ${formatMadCents(variance)}`,
      });
    } catch {
      enqueueErrorSnackBar({ message: 'Calcul des écarts impossible' });
    } finally {
      setBusyId(null);
    }
  };

  const createRecurring = () => {
    const unitPriceHt = Number(recurringPriceMad);
    if (!tierId || !Number.isFinite(unitPriceHt) || unitPriceHt < 0) return;
    return mutate(
      'recurring-create',
      () =>
        client
          .createMutationIntent(
            {
              method: 'POST',
              path: '/operations/recurring-invoices',
              schema: erpRecurringInvoiceSchema,
              body: {
                tierId,
                label: recurringLabel,
                frequencyMonths: 1,
                nextRunDate,
                lines: [
                  {
                    description: recurringDescription,
                    unit: 'forfait',
                    quantity: 1,
                    unitPriceHt,
                    tvaRate: 20,
                  },
                ],
              },
            },
            { idempotency: 'forbidden' },
          )
          .execute(),
      'Facturation récurrente créée',
    );
  };

  const runRecurring = () =>
    mutate(
      'recurring-run',
      () =>
        client
          .createMutationIntent(
            {
              method: 'POST',
              path: '/operations/recurring-invoices/run',
              query: { asOf: today() },
              schema: erpRecurringInvoiceRunSchema,
            },
            { idempotency: 'forbidden' },
          )
          .execute(),
      'Échéances récurrentes générées',
    );

  const createRate = () =>
    mutate(
      'rate-create',
      () =>
        client
          .createMutationIntent(
            {
              method: 'POST',
              path: '/operations/exchange-rates',
              schema: erpExchangeRateSchema,
              body: {
                quoteCurrency: currency,
                rate: exchangeRate,
                effectiveDate: today(),
                source: 'Saisie Zowka',
              },
            },
            { idempotency: 'forbidden' },
          )
          .execute(),
      'Taux de change enregistré',
    );

  const grantPortal = () =>
    mutate(
      'portal-create',
      () =>
        client
          .createMutationIntent(
            {
              method: 'POST',
              path: '/operations/portal-access',
              schema: erpPortalAccessSchema,
              body: {
                tierId,
                twentyUserId,
                canViewInvoices: true,
                canViewDocuments: true,
                canSubmitDocuments: true,
              },
            },
            { idempotency: 'forbidden' },
          )
          .execute(),
      'Accès portail accordé',
    );

  const revokePortal = (access: ErpPortalAccess) =>
    mutate(
      access.id,
      () =>
        client
          .createMutationIntent(
            {
              method: 'POST',
              path: `/operations/portal-access/${access.id}/revoke`,
              schema: erpPortalAccessSchema,
            },
            { idempotency: 'forbidden' },
          )
          .execute(),
      'Accès portail révoqué',
    );

  const scanAnomalies = () =>
    mutate(
      'anomaly-scan',
      () =>
        client
          .createMutationIntent(
            {
              method: 'POST',
              path: '/operations/anomalies/scan',
              schema: erpAnomalyScanResultSchema,
            },
            { idempotency: 'forbidden' },
          )
          .execute(),
      'Contrôle des anomalies terminé',
    );

  const resolveAnomaly = (anomaly: ErpAccountingAnomaly) =>
    mutate(
      anomaly.id,
      () =>
        client
          .createMutationIntent(
            {
              method: 'POST',
              path: `/operations/anomalies/${anomaly.id}/resolve`,
              schema: erpAccountingAnomalySchema,
              body: { notes: resolutionNotes },
            },
            { idempotency: 'forbidden' },
          )
          .execute(),
      'Anomalie résolue',
    );

  const expenseColumns: ErpOperationalTableColumn<ErpExpenseNote>[] = [
    {
      key: 'number',
      header: 'N°',
      width: '140px',
      render: (row) => row.number,
    },
    {
      key: 'title',
      header: 'Note de frais',
      width: '280px',
      render: (row) => row.title,
    },
    {
      key: 'date',
      header: 'Date',
      width: '120px',
      render: (row) => row.expenseDate,
    },
    {
      key: 'amount',
      header: 'TTC',
      width: '140px',
      align: 'right',
      render: (row) => formatMadCents(row.totalTtcCents),
    },
    {
      key: 'status',
      header: 'Statut',
      width: '120px',
      render: (row) => row.status,
    },
    {
      key: 'actions',
      header: 'Actions',
      width: '280px',
      render: (row) =>
        canManage ? (
          <StyledErpWorkspaceInlineActions>
            {row.status === 'DRAFT' ? (
              <Button
                title="Soumettre"
                ariaLabel="Soumettre la note"
                variant="secondary"
                disabled={busyId !== null}
                onClick={() => void expenseAction(row)}
              />
            ) : null}
            {row.status === 'SUBMITTED' ? (
              <>
                <Button
                  title="Approuver"
                  ariaLabel="Approuver la note"
                  Icon={IconCheck}
                  variant="secondary"
                  disabled={busyId !== null}
                  onClick={() => void expenseAction(row, 'APPROVED')}
                />
                <Button
                  title="Rejeter"
                  ariaLabel="Rejeter la note"
                  variant="secondary"
                  disabled={busyId !== null}
                  onClick={() => void expenseAction(row, 'REJECTED')}
                />
              </>
            ) : null}
          </StyledErpWorkspaceInlineActions>
        ) : null,
    },
  ];

  const budgetColumns: ErpOperationalTableColumn<ErpBudget>[] = [
    {
      key: 'code',
      header: 'Code',
      width: '120px',
      render: (row) => row.code,
    },
    {
      key: 'label',
      header: 'Budget',
      width: '260px',
      render: (row) => row.label,
    },
    {
      key: 'status',
      header: 'Statut',
      width: '120px',
      render: (row) => row.status,
    },
    {
      key: 'actions',
      header: 'Actions',
      width: '260px',
      render: (row) => (
        <StyledErpWorkspaceInlineActions>
          {row.status === 'DRAFT' && canManage ? (
            <Button
              title="Approuver"
              ariaLabel="Approuver le budget"
              Icon={IconCheck}
              variant="secondary"
              disabled={busyId !== null}
              onClick={() => void approveBudget(row)}
            />
          ) : null}
          <Button
            title="Écarts"
            ariaLabel="Calculer les écarts"
            variant="secondary"
            disabled={busyId !== null}
            onClick={() => void showVariance(row)}
          />
        </StyledErpWorkspaceInlineActions>
      ),
    },
  ];

  const anomalyColumns: ErpOperationalTableColumn<ErpAccountingAnomaly>[] = [
    {
      key: 'severity',
      header: 'Sévérité',
      width: '110px',
      render: (row) => row.severity,
    },
    {
      key: 'title',
      header: 'Anomalie',
      width: '260px',
      render: (row) => row.title,
    },
    {
      key: 'explanation',
      header: 'Explication',
      width: '360px',
      render: (row) => row.explanation,
    },
    {
      key: 'status',
      header: 'Statut',
      width: '110px',
      render: (row) => row.status,
    },
    {
      key: 'action',
      header: 'Action',
      width: '160px',
      render: (row) =>
        row.status === 'OPEN' && canManage ? (
          <Button
            title="Résoudre"
            ariaLabel="Résoudre l'anomalie"
            Icon={IconCheck}
            variant="secondary"
            disabled={busyId !== null}
            onClick={() => void resolveAnomaly(row)}
          />
        ) : null,
    },
  ];

  const openAnomalies = anomalies.filter(
    (anomaly) => anomaly.status === 'OPEN',
  ).length;

  return (
    <ErpPageShell
      title="Pilotage et automatisation"
      description="Frais, budgets, analytique, récurrence, devises, portail et contrôles IA"
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
      loadingLabel="Chargement du pilotage"
      errorLabel="Impossible de charger le pilotage"
      onRetry={refresh}
    >
      <StyledErpWorkspaceTabs role="tablist" aria-label="Pilotage ERP">
        <TabButton
          id="management-expenses"
          title="Notes de frais"
          active={view === 'expenses'}
          onClick={() => setView('expenses')}
        />
        <TabButton
          id="management-analytics"
          title="Budgets & analytique"
          active={view === 'analytics'}
          onClick={() => setView('analytics')}
        />
        <TabButton
          id="management-automation"
          title="Récurrence & devises"
          active={view === 'automation'}
          onClick={() => setView('automation')}
        />
        <TabButton
          id="management-controls"
          title="Portail & anomalies"
          active={view === 'controls'}
          onClick={() => setView('controls')}
        />
      </StyledErpWorkspaceTabs>
      <StyledErpWorkspaceSummary>
        <ErpWorkspaceSummaryItem
          label="Notes à approuver"
          value={expenses.filter((item) => item.status === 'SUBMITTED').length}
        />
        <ErpWorkspaceSummaryItem label="Budgets" value={budgets.length} />
        <ErpWorkspaceSummaryItem
          label="Facturations actives"
          value={recurring.filter((item) => item.status === 'ACTIVE').length}
        />
        <ErpWorkspaceSummaryItem
          label="Anomalies ouvertes"
          value={openAnomalies}
        />
      </StyledErpWorkspaceSummary>
      <StyledErpWorkspaceToolbar>
        {view === 'automation' ? (
          <Button
            title="Exécuter les échéances"
            ariaLabel="Exécuter la facturation récurrente"
            variant="primary"
            disabled={!canManage || busyId !== null}
            onClick={() => void runRecurring()}
          />
        ) : null}
        {view === 'controls' ? (
          <Button
            title="Scanner les écritures"
            ariaLabel="Scanner les anomalies comptables"
            variant="primary"
            disabled={!canManage || busyId !== null}
            onClick={() => void scanAnomalies()}
          />
        ) : null}
      </StyledErpWorkspaceToolbar>
      <StyledErpWorkspaceContent>
        {view === 'expenses' ? (
          <>
            <StyledErpWorkspacePanel>
              <StyledErpWorkspacePanelTitle>
                Nouvelle note de frais
              </StyledErpWorkspacePanelTitle>
              <StyledErpWorkspaceFormGrid>
                <StyledErpWorkspaceField>
                  Salarié
                  <StyledErpWorkspaceSelect
                    value={employeeId}
                    onChange={(event) => setEmployeeId(event.target.value)}
                  >
                    <option value="">Sans salarié</option>
                    {employees.map((employee) => (
                      <option key={employee.id} value={employee.id}>
                        {employee.lastName} {employee.firstName}
                      </option>
                    ))}
                  </StyledErpWorkspaceSelect>
                </StyledErpWorkspaceField>
                <StyledErpWorkspaceField>
                  Objet
                  <StyledErpWorkspaceInput
                    value={expenseTitle}
                    onChange={(event) => setExpenseTitle(event.target.value)}
                  />
                </StyledErpWorkspaceField>
                <StyledErpWorkspaceField>
                  Catégorie
                  <StyledErpWorkspaceInput
                    value={expenseCategory}
                    onChange={(event) => setExpenseCategory(event.target.value)}
                  />
                </StyledErpWorkspaceField>
                <StyledErpWorkspaceField>
                  Montant HT (MAD)
                  <StyledErpWorkspaceInput
                    type="number"
                    min="0"
                    step="0.01"
                    value={expenseMad}
                    onChange={(event) => setExpenseMad(event.target.value)}
                  />
                </StyledErpWorkspaceField>
                <StyledErpWorkspaceField>
                  TVA
                  <StyledErpWorkspaceSelect
                    value={expenseTva}
                    onChange={(event) => setExpenseTva(event.target.value)}
                  >
                    {['0', '7', '10', '14', '20'].map((rate) => (
                      <option key={rate} value={rate}>
                        {rate} %
                      </option>
                    ))}
                  </StyledErpWorkspaceSelect>
                </StyledErpWorkspaceField>
                <StyledErpWorkspaceField>
                  Date
                  <StyledErpWorkspaceInput
                    type="date"
                    value={expenseDate}
                    onChange={(event) => setExpenseDate(event.target.value)}
                  />
                </StyledErpWorkspaceField>
                <Button
                  title="Créer"
                  ariaLabel="Créer la note de frais"
                  variant="primary"
                  disabled={!canManage || busyId !== null}
                  onClick={() => void createExpense()}
                />
              </StyledErpWorkspaceFormGrid>
            </StyledErpWorkspacePanel>
            <ErpOperationalTable
              ariaLabel="Notes de frais"
              columns={expenseColumns}
              rows={expenses}
              getRowKey={(row) => row.id}
              emptyLabel="Aucune note de frais"
            />
          </>
        ) : null}
        {view === 'analytics' ? (
          <>
            <StyledErpWorkspacePanel>
              <StyledErpWorkspacePanelTitle>
                Axes et ventilations analytiques
              </StyledErpWorkspacePanelTitle>
              <StyledErpWorkspaceFormGrid>
                <StyledErpWorkspaceField>
                  Code axe
                  <StyledErpWorkspaceInput
                    value={axisCode}
                    onChange={(event) => setAxisCode(event.target.value)}
                  />
                </StyledErpWorkspaceField>
                <StyledErpWorkspaceField>
                  Libellé axe
                  <StyledErpWorkspaceInput
                    value={axisLabel}
                    onChange={(event) => setAxisLabel(event.target.value)}
                  />
                </StyledErpWorkspaceField>
                <StyledErpWorkspaceField>
                  Code section
                  <StyledErpWorkspaceInput
                    value={sectionCode}
                    onChange={(event) => setSectionCode(event.target.value)}
                  />
                </StyledErpWorkspaceField>
                <StyledErpWorkspaceField>
                  Libellé section
                  <StyledErpWorkspaceInput
                    value={sectionLabel}
                    onChange={(event) => setSectionLabel(event.target.value)}
                  />
                </StyledErpWorkspaceField>
                <Button
                  title="Créer l'axe"
                  ariaLabel="Créer l'axe analytique"
                  variant="secondary"
                  disabled={!canManage || busyId !== null}
                  onClick={() => void createAxis()}
                />
                <StyledErpWorkspaceField>
                  Ligne comptable (UUID)
                  <StyledErpWorkspaceInput
                    value={entryLineId}
                    onChange={(event) => setEntryLineId(event.target.value)}
                  />
                </StyledErpWorkspaceField>
                <StyledErpWorkspaceField>
                  Section
                  <StyledErpWorkspaceSelect
                    value={sectionId}
                    onChange={(event) => setSectionId(event.target.value)}
                  >
                    {analytics.flatMap((axis) =>
                      axis.sections.map((section) => (
                        <option key={section.id} value={section.id}>
                          {axis.code} · {section.label}
                        </option>
                      )),
                    )}
                  </StyledErpWorkspaceSelect>
                </StyledErpWorkspaceField>
                <StyledErpWorkspaceField>
                  Ventilation (%)
                  <StyledErpWorkspaceInput
                    type="number"
                    min="0.01"
                    max="100"
                    step="0.01"
                    value={allocationPercent}
                    onChange={(event) =>
                      setAllocationPercent(event.target.value)
                    }
                  />
                </StyledErpWorkspaceField>
                <Button
                  title="Ventiler"
                  ariaLabel="Ventiler la ligne comptable"
                  variant="secondary"
                  disabled={
                    !canManage || !entryLineId || !sectionId || busyId !== null
                  }
                  onClick={() => void allocate()}
                />
              </StyledErpWorkspaceFormGrid>
            </StyledErpWorkspacePanel>
            <StyledErpWorkspacePanel>
              <StyledErpWorkspacePanelTitle>
                Nouveau budget
              </StyledErpWorkspacePanelTitle>
              <StyledErpWorkspaceFormGrid>
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
                  Code
                  <StyledErpWorkspaceInput
                    value={budgetCode}
                    onChange={(event) => setBudgetCode(event.target.value)}
                  />
                </StyledErpWorkspaceField>
                <StyledErpWorkspaceField>
                  Libellé
                  <StyledErpWorkspaceInput
                    value={budgetLabel}
                    onChange={(event) => setBudgetLabel(event.target.value)}
                  />
                </StyledErpWorkspaceField>
                <StyledErpWorkspaceField>
                  Compte PCGM
                  <StyledErpWorkspaceInput
                    value={budgetAccount}
                    onChange={(event) => setBudgetAccount(event.target.value)}
                  />
                </StyledErpWorkspaceField>
                <StyledErpWorkspaceField>
                  Montant période 1 (MAD)
                  <StyledErpWorkspaceInput
                    type="number"
                    step="0.01"
                    value={budgetAmountMad}
                    onChange={(event) => setBudgetAmountMad(event.target.value)}
                  />
                </StyledErpWorkspaceField>
                <Button
                  title="Créer le budget"
                  ariaLabel="Créer le budget"
                  variant="primary"
                  disabled={!canManage || busyId !== null}
                  onClick={() => void createBudget()}
                />
              </StyledErpWorkspaceFormGrid>
            </StyledErpWorkspacePanel>
            <ErpOperationalTable
              ariaLabel="Budgets"
              columns={budgetColumns}
              rows={budgets}
              getRowKey={(row) => row.id}
              emptyLabel="Aucun budget"
            />
          </>
        ) : null}
        {view === 'automation' ? (
          <>
            <StyledErpWorkspacePanel>
              <StyledErpWorkspacePanelTitle>
                Nouvelle facturation récurrente
              </StyledErpWorkspacePanelTitle>
              <StyledErpWorkspaceFormGrid>
                <StyledErpWorkspaceField>
                  Client
                  <StyledErpWorkspaceSelect
                    value={tierId}
                    onChange={(event) => setTierId(event.target.value)}
                  >
                    {tiers
                      .filter((tier) => tier.type !== 'FOURNISSEUR')
                      .map((tier) => (
                        <option key={tier.id} value={tier.id}>
                          {tier.name}
                        </option>
                      ))}
                  </StyledErpWorkspaceSelect>
                </StyledErpWorkspaceField>
                <StyledErpWorkspaceField>
                  Libellé
                  <StyledErpWorkspaceInput
                    value={recurringLabel}
                    onChange={(event) => setRecurringLabel(event.target.value)}
                  />
                </StyledErpWorkspaceField>
                <StyledErpWorkspaceField>
                  Description
                  <StyledErpWorkspaceInput
                    value={recurringDescription}
                    onChange={(event) =>
                      setRecurringDescription(event.target.value)
                    }
                  />
                </StyledErpWorkspaceField>
                <StyledErpWorkspaceField>
                  Prix HT (MAD)
                  <StyledErpWorkspaceInput
                    type="number"
                    min="0"
                    step="0.01"
                    value={recurringPriceMad}
                    onChange={(event) =>
                      setRecurringPriceMad(event.target.value)
                    }
                  />
                </StyledErpWorkspaceField>
                <StyledErpWorkspaceField>
                  Prochaine échéance
                  <StyledErpWorkspaceInput
                    type="date"
                    value={nextRunDate}
                    onChange={(event) => setNextRunDate(event.target.value)}
                  />
                </StyledErpWorkspaceField>
                <Button
                  title="Créer la récurrence"
                  ariaLabel="Créer la facturation récurrente"
                  variant="primary"
                  disabled={!canManage || busyId !== null}
                  onClick={() => void createRecurring()}
                />
              </StyledErpWorkspaceFormGrid>
            </StyledErpWorkspacePanel>
            <StyledErpWorkspacePanel>
              <StyledErpWorkspacePanelTitle>
                Taux de change
              </StyledErpWorkspacePanelTitle>
              <StyledErpWorkspaceFormGrid>
                <StyledErpWorkspaceField>
                  Devise
                  <StyledErpWorkspaceInput
                    maxLength={3}
                    value={currency}
                    onChange={(event) =>
                      setCurrency(event.target.value.toUpperCase())
                    }
                  />
                </StyledErpWorkspaceField>
                <StyledErpWorkspaceField>
                  Taux pour 1 MAD
                  <StyledErpWorkspaceInput
                    type="number"
                    min="0"
                    step="0.00000001"
                    value={exchangeRate}
                    onChange={(event) => setExchangeRate(event.target.value)}
                  />
                </StyledErpWorkspaceField>
                <Button
                  title="Enregistrer le taux"
                  ariaLabel="Enregistrer le taux de change"
                  variant="secondary"
                  disabled={!canManage || busyId !== null}
                  onClick={() => void createRate()}
                />
              </StyledErpWorkspaceFormGrid>
            </StyledErpWorkspacePanel>
            <StyledErpWorkspaceSummary>
              <ErpWorkspaceSummaryItem
                label="Récurrences"
                value={recurring.length}
              />
              <ErpWorkspaceSummaryItem
                label="Taux enregistrés"
                value={rates.length}
              />
            </StyledErpWorkspaceSummary>
          </>
        ) : null}
        {view === 'controls' ? (
          <>
            <StyledErpWorkspacePanel>
              <StyledErpWorkspacePanelTitle>
                Accès portail client / cabinet
              </StyledErpWorkspacePanelTitle>
              <StyledErpWorkspaceFormGrid>
                <StyledErpWorkspaceField>
                  Tiers
                  <StyledErpWorkspaceSelect
                    value={tierId}
                    onChange={(event) => setTierId(event.target.value)}
                  >
                    {tiers.map((tier) => (
                      <option key={tier.id} value={tier.id}>
                        {tier.name}
                      </option>
                    ))}
                  </StyledErpWorkspaceSelect>
                </StyledErpWorkspaceField>
                <StyledErpWorkspaceField>
                  Utilisateur Twenty
                  <StyledErpWorkspaceInput
                    value={twentyUserId}
                    onChange={(event) => setTwentyUserId(event.target.value)}
                  />
                </StyledErpWorkspaceField>
                <Button
                  title="Accorder l'accès"
                  ariaLabel="Accorder l'accès portail"
                  variant="primary"
                  disabled={
                    !canManage ||
                    !tierId ||
                    !twentyUserId.trim() ||
                    busyId !== null
                  }
                  onClick={() => void grantPortal()}
                />
              </StyledErpWorkspaceFormGrid>
              {portals.map((access) => (
                <StyledErpWorkspaceToolbar key={access.id}>
                  <span>
                    {access.twentyUserId} · {access.status}
                  </span>
                  {access.status === 'ACTIVE' ? (
                    <Button
                      title="Révoquer"
                      ariaLabel="Révoquer l'accès portail"
                      variant="secondary"
                      disabled={!canManage || busyId !== null}
                      onClick={() => void revokePortal(access)}
                    />
                  ) : null}
                </StyledErpWorkspaceToolbar>
              ))}
            </StyledErpWorkspacePanel>
            <StyledErpWorkspacePanel>
              <StyledErpWorkspacePanelTitle>
                Contrôle des anomalies comptables
              </StyledErpWorkspacePanelTitle>
              <StyledErpWorkspaceFormGrid>
                <StyledErpWorkspaceField>
                  Note de résolution
                  <StyledErpWorkspaceInput
                    value={resolutionNotes}
                    onChange={(event) => setResolutionNotes(event.target.value)}
                  />
                </StyledErpWorkspaceField>
              </StyledErpWorkspaceFormGrid>
              <ErpOperationalTable
                ariaLabel="Anomalies comptables"
                columns={anomalyColumns}
                rows={anomalies}
                getRowKey={(row) => row.id}
                emptyLabel="Aucune anomalie détectée"
              />
            </StyledErpWorkspacePanel>
          </>
        ) : null}
      </StyledErpWorkspaceContent>
    </ErpPageShell>
  );
};
