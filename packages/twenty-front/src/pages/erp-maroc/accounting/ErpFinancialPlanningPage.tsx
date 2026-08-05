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
  formatMadCents,
  parseMadDecimalToCents,
  parseMadDecimalToTransportNumber,
} from '@/erp-maroc/utils/money';
import { styled } from '@linaria/react';
import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  erpAccountingEntryPageSchema,
  erpAccountingEntrySchema,
  erpAnalyticAllocationSchema,
  erpAnalyticAxisListSchema,
  erpAnalyticAxisSchema,
  erpBudgetListSchema,
  erpBudgetSchema,
  erpBudgetVarianceSchema,
  erpExchangeRateListSchema,
  erpExchangeRateSchema,
  erpExerciseListSchema,
  erpRecurringInvoiceListSchema,
  erpRecurringInvoiceRunSchema,
  erpRecurringInvoiceSchema,
  erpTierListSchema,
  type ErpAccountingEntry,
  type ErpAnalyticAxis,
  type ErpBudget,
  type ErpExchangeRate,
  type ErpExercise,
  type ErpRecurringInvoice,
  type ErpTier,
} from 'twenty-shared/erp-maroc';
import { IconCheck, IconPlus, IconRefresh, IconTrash } from 'twenty-ui/display';
import { Button } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';

type View = 'budgets' | 'analytics' | 'recurring' | 'currencies';
type LoadState = 'loading' | 'ready' | 'error';
type AxisSectionDraft = { key: string; code: string; label: string };
type BudgetLineDraft = {
  key: string;
  accountCode: string;
  periodNumber: string;
  amount: string;
  sectionId: string;
};
type InvoiceLineDraft = {
  key: string;
  description: string;
  quantity: string;
  unitPriceHt: string;
  tvaRate: string;
};
type BudgetVariance = ReturnType<typeof erpBudgetVarianceSchema.parse>;

const views: Array<{ key: View; label: string }> = [
  { key: 'budgets', label: 'Budgets' },
  { key: 'analytics', label: 'Analytique' },
  { key: 'recurring', label: 'Factures récurrentes' },
  { key: 'currencies', label: 'Devises' },
];

const isView = (value: string | null): value is View =>
  views.some((view) => view.key === value);

const today = () => new Date().toISOString().slice(0, 10);
const makeSection = (): AxisSectionDraft => ({
  key: crypto.randomUUID(),
  code: '',
  label: '',
});
const makeBudgetLine = (): BudgetLineDraft => ({
  key: crypto.randomUUID(),
  accountCode: '',
  periodNumber: '1',
  amount: '',
  sectionId: '',
});
const makeInvoiceLine = (): InvoiceLineDraft => ({
  key: crypto.randomUUID(),
  description: '',
  quantity: '1',
  unitPriceHt: '',
  tvaRate: '20',
});

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
  width: 100%;
`;

const StyledTabs = styled.div`
  align-items: center;
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  flex: 0 0 auto;
  gap: ${themeCssVariables.spacing[1]};
  min-height: 42px;
  overflow-x: auto;
  padding: 0 ${themeCssVariables.spacing[3]};
`;

const StyledTab = styled.button<{ active: boolean }>`
  background: transparent;
  border: 0;
  border-bottom: 2px solid
    ${({ active }) => (active ? themeCssVariables.color.blue : 'transparent')};
  color: ${({ active }) =>
    active
      ? themeCssVariables.font.color.primary
      : themeCssVariables.font.color.secondary};
  cursor: pointer;
  font: inherit;
  font-size: ${themeCssVariables.font.size.sm};
  height: 42px;
  letter-spacing: 0;
  padding: 0 ${themeCssVariables.spacing[2]};
  white-space: nowrap;
`;

const StyledNotice = styled.div<{ danger: boolean }>`
  background: ${({ danger }) =>
    danger
      ? themeCssVariables.tag.background.red
      : themeCssVariables.tag.background.green};
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  color: ${({ danger }) =>
    danger ? themeCssVariables.tag.text.red : themeCssVariables.tag.text.green};
  font-size: ${themeCssVariables.font.size.sm};
  padding: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[4]};
`;

const StyledWorkspace = styled.div`
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
`;

const StyledForm = styled.form`
  border-bottom: 1px solid ${themeCssVariables.border.color.medium};
  display: flex;
  flex: 0 0 auto;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[2]};
  padding: ${themeCssVariables.spacing[3]} ${themeCssVariables.spacing[4]};
`;

const StyledFormGrid = styled.div`
  display: grid;
  gap: ${themeCssVariables.spacing[2]};
  grid-template-columns: repeat(4, minmax(140px, 1fr));

  @media (max-width: 900px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 560px) {
    grid-template-columns: 1fr;
  }
`;

const StyledFormTitle = styled.h2`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.md};
  font-weight: ${themeCssVariables.font.weight.semiBold};
  letter-spacing: 0;
  margin: 0;
`;

const StyledField = styled.label`
  color: ${themeCssVariables.font.color.secondary};
  display: flex;
  flex-direction: column;
  font-size: ${themeCssVariables.font.size.sm};
  gap: ${themeCssVariables.spacing[1]};
  min-width: 0;
`;

const StyledInput = styled.input`
  ${controlCss}
`;
const StyledSelect = styled.select`
  ${controlCss}
`;

const StyledLineGroup = styled.div`
  border: 1px solid ${themeCssVariables.border.color.light};
  border-radius: ${themeCssVariables.border.radius.sm};
  display: flex;
  flex-direction: column;
`;

const StyledLine = styled.div<{ columns: number }>`
  align-items: end;
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: grid;
  gap: ${themeCssVariables.spacing[2]};
  grid-template-columns:
    repeat(${({ columns }) => columns - 1}, minmax(110px, 1fr))
    32px;
  padding: ${themeCssVariables.spacing[2]};

  &:last-child {
    border-bottom: 0;
  }

  @media (max-width: 760px) {
    grid-template-columns: 1fr 1fr;
  }
`;

const StyledActions = styled.div`
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[2]};
  justify-content: flex-end;
`;

const StyledTableArea = styled.div`
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-height: 220px;
  overflow: hidden;
`;

const StyledVariance = styled.section`
  border-bottom: 1px solid ${themeCssVariables.border.color.medium};
  display: flex;
  flex: 0 0 auto;
  flex-direction: column;
  max-height: 260px;

  h2 {
    font-size: ${themeCssVariables.font.size.md};
    letter-spacing: 0;
    margin: 0;
    padding: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[4]};
  }
`;

const StyledInlineActions = styled.div`
  align-items: center;
  display: flex;
  gap: ${themeCssVariables.spacing[1]};
`;

const statusTone = (status: string): ErpStatusTone => {
  if (status === 'APPROVED' || status === 'ACTIVE') return 'success';
  if (status === 'DRAFT') return 'warning';
  return 'neutral';
};

export const ErpFinancialPlanningPage = () => {
  const { client, context } = useErpMarocContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const viewParam = searchParams.get('view');
  const view: View = isView(viewParam) ? viewParam : 'budgets';
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [generation, setGeneration] = useState(0);
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<{
    message: string;
    danger: boolean;
  } | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [axes, setAxes] = useState<ErpAnalyticAxis[]>([]);
  const [budgets, setBudgets] = useState<ErpBudget[]>([]);
  const [recurringInvoices, setRecurringInvoices] = useState<
    ErpRecurringInvoice[]
  >([]);
  const [exchangeRates, setExchangeRates] = useState<ErpExchangeRate[]>([]);
  const [exercises, setExercises] = useState<ErpExercise[]>([]);
  const [tiers, setTiers] = useState<ErpTier[]>([]);
  const [entries, setEntries] = useState<ErpAccountingEntry[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<ErpAccountingEntry | null>(
    null,
  );
  const [variance, setVariance] = useState<{
    budget: ErpBudget;
    rows: BudgetVariance;
  } | null>(null);

  const [axisCode, setAxisCode] = useState('');
  const [axisLabel, setAxisLabel] = useState('');
  const [axisSections, setAxisSections] = useState([makeSection()]);
  const [allocationEntryId, setAllocationEntryId] = useState('');
  const [allocationLineId, setAllocationLineId] = useState('');
  const [allocationSectionId, setAllocationSectionId] = useState('');
  const [allocationPercentage, setAllocationPercentage] = useState('100');
  const [budgetCode, setBudgetCode] = useState('');
  const [budgetLabel, setBudgetLabel] = useState('');
  const [budgetExerciseId, setBudgetExerciseId] = useState('');
  const [budgetLines, setBudgetLines] = useState([makeBudgetLine()]);
  const [recurringTierId, setRecurringTierId] = useState('');
  const [recurringLabel, setRecurringLabel] = useState('');
  const [frequencyMonths, setFrequencyMonths] = useState('1');
  const [nextRunDate, setNextRunDate] = useState(today());
  const [endDate, setEndDate] = useState('');
  const [paymentDelayDays, setPaymentDelayDays] = useState('30');
  const [invoiceLines, setInvoiceLines] = useState([makeInvoiceLine()]);
  const [quoteCurrency, setQuoteCurrency] = useState('EUR');
  const [rate, setRate] = useState('');
  const [effectiveDate, setEffectiveDate] = useState(today());
  const [rateSource, setRateSource] = useState('Bank Al-Maghrib');
  const canManage =
    context !== null && ['OWNER', 'ADMIN', 'COMPTABLE'].includes(context.role);

  const load = useCallback(() => {
    let active = true;
    setLoadState('loading');
    void Promise.all([
      client.request({
        method: 'GET',
        path: '/operations/analytics',
        schema: erpAnalyticAxisListSchema,
      }),
      client.request({
        method: 'GET',
        path: '/operations/budgets',
        schema: erpBudgetListSchema,
      }),
      client.request({
        method: 'GET',
        path: '/operations/recurring-invoices',
        schema: erpRecurringInvoiceListSchema,
      }),
      client.request({
        method: 'GET',
        path: '/operations/exchange-rates',
        schema: erpExchangeRateListSchema,
      }),
      client.request({
        method: 'GET',
        path: '/accounting-compliance/exercises',
        schema: erpExerciseListSchema,
      }),
      client.request({
        method: 'GET',
        path: '/tiers',
        schema: erpTierListSchema,
      }),
      client.request({
        method: 'GET',
        path: '/accounting/entries',
        query: { limit: '100' },
        schema: erpAccountingEntryPageSchema,
      }),
    ])
      .then(
        ([
          nextAxes,
          nextBudgets,
          nextRecurring,
          nextRates,
          nextExercises,
          nextTiers,
          nextEntries,
        ]) => {
          if (!active) return;
          setAxes(nextAxes);
          setBudgets(nextBudgets);
          setRecurringInvoices(nextRecurring);
          setExchangeRates(nextRates);
          setExercises(nextExercises);
          setTiers(nextTiers);
          setEntries(nextEntries.items);
          setBudgetExerciseId(
            (current) =>
              current ||
              nextExercises.find((exercise) => exercise.status === 'OPEN')
                ?.id ||
              nextExercises[0]?.id ||
              '',
          );
          setRecurringTierId(
            (current) =>
              current ||
              nextTiers.find(
                (tier) => tier.isActive && tier.type !== 'FOURNISSEUR',
              )?.id ||
              '',
          );
          setAllocationEntryId(
            (current) => current || nextEntries.items[0]?.id || '',
          );
          setLoadState('ready');
        },
      )
      .catch(() => {
        if (active) setLoadState('error');
      });
    return () => {
      active = false;
    };
  }, [client]);

  useEffect(() => load(), [generation, load]);

  useEffect(() => {
    if (!allocationEntryId) {
      setSelectedEntry(null);
      setAllocationLineId('');
      return;
    }
    let active = true;
    void client
      .request({
        method: 'GET',
        path: `/accounting/entries/${allocationEntryId}`,
        schema: erpAccountingEntrySchema,
      })
      .then((result) => {
        if (!active) return;
        setSelectedEntry(result);
        setAllocationLineId(result.lines?.[0]?.id ?? '');
      })
      .catch(() => {
        if (!active) return;
        setSelectedEntry(null);
        setAllocationLineId('');
        setNotice({
          message: "Impossible de charger les lignes de l'écriture.",
          danger: true,
        });
      });
    return () => {
      active = false;
    };
  }, [allocationEntryId, client]);

  const refresh = () => setGeneration((value) => value + 1);
  const selectView = (nextView: View) => {
    setSearchParams({ view: nextView });
    setShowForm(false);
    setVariance(null);
    setNotice(null);
  };

  const executeMutation = async <T,>(options: {
    path: string;
    method?: 'POST' | 'PATCH';
    body?: unknown;
    schema: Parameters<typeof client.createMutationIntent>[0]['schema'];
    success: string;
  }): Promise<T | null> => {
    if (pending) return null;
    setPending(true);
    setNotice(null);
    try {
      const intent = client.createMutationIntent({
        method: options.method ?? 'POST',
        path: options.path,
        body: options.body,
        schema: options.schema,
      });
      const result = (await intent.execute()) as T;
      setNotice({ message: options.success, danger: false });
      refresh();
      return result;
    } catch {
      setNotice({
        message: "L'opération a échoué. Vérifiez les données puis réessayez.",
        danger: true,
      });
      return null;
    } finally {
      setPending(false);
    }
  };

  const createAxis = async (event: FormEvent) => {
    event.preventDefault();
    const sections = axisSections.filter(
      (section) => section.code.trim() && section.label.trim(),
    );
    if (!axisCode.trim() || !axisLabel.trim() || sections.length === 0) {
      setNotice({
        message: 'Un code, un libellé et au moins une section sont requis.',
        danger: true,
      });
      return;
    }
    const created = await executeMutation<ErpAnalyticAxis>({
      path: '/operations/analytics',
      body: {
        code: axisCode.trim(),
        label: axisLabel.trim(),
        sections: sections.map(({ code, label }) => ({ code, label })),
      },
      schema: erpAnalyticAxisSchema,
      success: 'Axe analytique créé.',
    });
    if (created) {
      setAxisCode('');
      setAxisLabel('');
      setAxisSections([makeSection()]);
      setShowForm(false);
    }
  };

  const createAllocation = async (event: FormEvent) => {
    event.preventDefault();
    const percentage = Number(allocationPercentage.replace(',', '.'));
    const percentageBasisPoints = Math.round(percentage * 100);
    if (
      !allocationLineId ||
      !allocationSectionId ||
      !Number.isFinite(percentage) ||
      percentageBasisPoints < 1 ||
      percentageBasisPoints > 10_000
    ) {
      setNotice({
        message:
          'Sélectionnez une ligne, une section et un taux de 0,01 à 100 %.',
        danger: true,
      });
      return;
    }
    const created = await executeMutation({
      path: '/operations/analytics/allocations',
      body: {
        entryLineId: allocationLineId,
        sectionId: allocationSectionId,
        percentageBasisPoints,
      },
      schema: erpAnalyticAllocationSchema,
      success: 'Imputation analytique enregistrée.',
    });
    if (created) setAllocationPercentage('100');
  };

  const createBudget = async (event: FormEvent) => {
    event.preventDefault();
    try {
      const lines = budgetLines.map((line) => ({
        accountCode: line.accountCode.trim(),
        periodNumber: Number(line.periodNumber),
        amountCents: parseMadDecimalToCents(line.amount, {
          allowNegative: true,
        }),
        sectionId: line.sectionId || null,
      }));
      if (
        !budgetCode.trim() ||
        !budgetLabel.trim() ||
        !budgetExerciseId ||
        lines.some(
          (line) =>
            !line.accountCode ||
            !Number.isInteger(line.periodNumber) ||
            line.periodNumber < 1 ||
            line.periodNumber > 24,
        )
      ) {
        throw new Error('invalid');
      }
      const created = await executeMutation<ErpBudget>({
        path: '/operations/budgets',
        body: {
          exerciceId: budgetExerciseId,
          code: budgetCode.trim(),
          label: budgetLabel.trim(),
          lines,
        },
        schema: erpBudgetSchema,
        success: 'Budget créé en brouillon.',
      });
      if (created) {
        setBudgetCode('');
        setBudgetLabel('');
        setBudgetLines([makeBudgetLine()]);
        setShowForm(false);
      }
    } catch {
      setNotice({
        message: 'Complétez les lignes avec des montants MAD valides.',
        danger: true,
      });
    }
  };

  const createRecurringInvoice = async (event: FormEvent) => {
    event.preventDefault();
    try {
      const lines = invoiceLines.map((line) => ({
        description: line.description.trim(),
        unit: 'unité',
        quantity: Number(line.quantity),
        unitPriceHt: parseMadDecimalToTransportNumber(line.unitPriceHt),
        tvaRate: Number(line.tvaRate),
      }));
      if (
        !recurringTierId ||
        !recurringLabel.trim() ||
        !Number.isInteger(Number(frequencyMonths)) ||
        !Number.isInteger(Number(paymentDelayDays)) ||
        lines.some(
          (line) =>
            !line.description ||
            !Number.isFinite(line.quantity) ||
            line.quantity <= 0 ||
            !Number.isInteger(line.tvaRate),
        )
      ) {
        throw new Error('invalid');
      }
      const created = await executeMutation<ErpRecurringInvoice>({
        path: '/operations/recurring-invoices',
        body: {
          tierId: recurringTierId,
          label: recurringLabel.trim(),
          frequencyMonths: Number(frequencyMonths),
          nextRunDate,
          endDate: endDate || null,
          paymentDelayDays: Number(paymentDelayDays),
          lines,
        },
        schema: erpRecurringInvoiceSchema,
        success: 'Facturation récurrente activée.',
      });
      if (created) {
        setRecurringLabel('');
        setInvoiceLines([makeInvoiceLine()]);
        setShowForm(false);
      }
    } catch {
      setNotice({
        message: 'Vérifiez le client, les dates et les lignes de facture.',
        danger: true,
      });
    }
  };

  const createExchangeRate = async (event: FormEvent) => {
    event.preventDefault();
    const numericRate = Number(rate.replace(',', '.'));
    if (
      quoteCurrency.trim().length !== 3 ||
      quoteCurrency.toUpperCase() === 'MAD' ||
      !Number.isFinite(numericRate) ||
      numericRate <= 0 ||
      !rateSource.trim()
    ) {
      setNotice({
        message: 'Le taux et sa source sont obligatoires.',
        danger: true,
      });
      return;
    }
    const created = await executeMutation<ErpExchangeRate>({
      path: '/operations/exchange-rates',
      body: {
        quoteCurrency: quoteCurrency.toUpperCase(),
        rate: numericRate,
        effectiveDate,
        source: rateSource.trim(),
      },
      schema: erpExchangeRateSchema,
      success: 'Taux de change enregistré.',
    });
    if (created) {
      setRate('');
      setShowForm(false);
    }
  };

  const approveBudget = async (budget: ErpBudget) => {
    await executeMutation<ErpBudget>({
      path: `/operations/budgets/${budget.id}/approve`,
      schema: erpBudgetSchema,
      success: `Budget ${budget.code} approuvé.`,
    });
  };

  const loadVariance = async (budget: ErpBudget) => {
    setPending(true);
    setNotice(null);
    try {
      const rows = await client.request({
        method: 'GET',
        path: `/operations/budgets/${budget.id}/variance`,
        schema: erpBudgetVarianceSchema,
      });
      setVariance({ budget, rows });
    } catch {
      setNotice({
        message: "Impossible de calculer l'écart budgétaire.",
        danger: true,
      });
    } finally {
      setPending(false);
    }
  };

  const runRecurring = async () => {
    const result = await executeMutation<
      ReturnType<typeof erpRecurringInvoiceRunSchema.parse>
    >({
      path: '/operations/recurring-invoices/run',
      schema: erpRecurringInvoiceRunSchema,
      success: 'Échéances de facturation traitées.',
    });
    if (result) {
      setNotice({
        message: `${result.generated} facture(s) générée(s).`,
        danger: false,
      });
    }
  };

  const setRecurringStatus = async (item: ErpRecurringInvoice) => {
    const nextStatus = item.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    await executeMutation<ErpRecurringInvoice>({
      method: 'PATCH',
      path: `/operations/recurring-invoices/${item.id}/status`,
      body: { status: nextStatus },
      schema: erpRecurringInvoiceSchema,
      success:
        nextStatus === 'ACTIVE'
          ? 'Facturation récurrente reprise.'
          : 'Facturation récurrente suspendue.',
    });
  };

  const sections = useMemo(
    () =>
      axes.flatMap((axis) =>
        axis.sections.map((section) => ({ axis, section })),
      ),
    [axes],
  );
  const tierById = useMemo(
    () => new Map(tiers.map((tier) => [tier.id, tier])),
    [tiers],
  );
  const exerciseById = useMemo(
    () => new Map(exercises.map((exercise) => [exercise.id, exercise])),
    [exercises],
  );

  const budgetColumns = useMemo<ErpOperationalTableColumn<ErpBudget>[]>(
    () => [
      {
        key: 'code',
        header: 'Code',
        width: '110px',
        render: (item) => item.code,
      },
      {
        key: 'label',
        header: 'Budget',
        width: '260px',
        render: (item) => item.label,
      },
      {
        key: 'exercise',
        header: 'Exercice',
        width: '100px',
        render: (item) => exerciseById.get(item.exerciceId)?.annee ?? '—',
      },
      {
        key: 'amount',
        header: 'Montant',
        width: '150px',
        align: 'right',
        render: (item) =>
          formatMadCents(
            ((item.lines ?? []) as Array<{ amountCents: number }>).reduce(
              (sum, line) => sum + line.amountCents,
              0,
            ),
          ),
      },
      {
        key: 'status',
        header: 'Statut',
        width: '120px',
        render: (item) => (
          <ErpStatusBadge
            label={
              item.status === 'DRAFT'
                ? 'Brouillon'
                : item.status === 'APPROVED'
                  ? 'Approuvé'
                  : 'Clôturé'
            }
            tone={statusTone(item.status)}
          />
        ),
      },
      {
        key: 'actions',
        header: 'Actions',
        width: '250px',
        render: (item) => (
          <StyledInlineActions>
            <Button
              title="Écarts"
              ariaLabel={`Voir les écarts de ${item.code}`}
              variant="secondary"
              onClick={() => void loadVariance(item)}
              disabled={pending}
            />
            {item.status === 'DRAFT' && canManage ? (
              <Button
                title="Approuver"
                ariaLabel={`Approuver ${item.code}`}
                Icon={IconCheck}
                variant="secondary"
                onClick={() => void approveBudget(item)}
                disabled={pending}
              />
            ) : null}
          </StyledInlineActions>
        ),
      },
    ],
    [canManage, exerciseById, pending],
  );

  const analyticColumns = useMemo<ErpOperationalTableColumn<ErpAnalyticAxis>[]>(
    () => [
      {
        key: 'code',
        header: 'Axe',
        width: '120px',
        render: (item) => item.code,
      },
      {
        key: 'label',
        header: 'Libellé',
        width: '260px',
        render: (item) => item.label,
      },
      {
        key: 'sections',
        header: 'Sections',
        width: '480px',
        render: (item) =>
          item.sections
            .map((section) => `${section.code} · ${section.label}`)
            .join(' | '),
      },
      {
        key: 'status',
        header: 'Statut',
        width: '110px',
        render: (item) => (
          <ErpStatusBadge
            label={item.isActive ? 'Actif' : 'Inactif'}
            tone={item.isActive ? 'success' : 'neutral'}
          />
        ),
      },
    ],
    [],
  );

  const recurringColumns = useMemo<
    ErpOperationalTableColumn<ErpRecurringInvoice>[]
  >(
    () => [
      {
        key: 'label',
        header: 'Modèle',
        width: '260px',
        render: (item) => item.label,
      },
      {
        key: 'customer',
        header: 'Client',
        width: '220px',
        render: (item) => tierById.get(item.tierId)?.name ?? 'Client inconnu',
      },
      {
        key: 'frequency',
        header: 'Fréquence',
        width: '130px',
        render: (item) =>
          item.frequencyMonths === 1
            ? 'Mensuelle'
            : `Tous les ${item.frequencyMonths} mois`,
      },
      {
        key: 'next',
        header: 'Prochaine émission',
        width: '150px',
        render: (item) => item.nextRunDate,
      },
      {
        key: 'end',
        header: 'Fin',
        width: '120px',
        render: (item) => item.endDate ?? 'Sans limite',
      },
      {
        key: 'status',
        header: 'Statut',
        width: '110px',
        render: (item) => (
          <ErpStatusBadge
            label={
              item.status === 'ACTIVE'
                ? 'Active'
                : item.status === 'PAUSED'
                  ? 'Suspendue'
                  : 'Terminée'
            }
            tone={statusTone(item.status)}
          />
        ),
      },
      {
        key: 'actions',
        header: 'Actions',
        width: '140px',
        render: (item) =>
          item.status === 'ENDED' || !canManage ? null : (
            <Button
              title={item.status === 'ACTIVE' ? 'Suspendre' : 'Reprendre'}
              ariaLabel={`${item.status === 'ACTIVE' ? 'Suspendre' : 'Reprendre'} ${item.label}`}
              variant="secondary"
              onClick={() => void setRecurringStatus(item)}
              disabled={pending}
            />
          ),
      },
    ],
    [canManage, pending, tierById],
  );

  const rateColumns = useMemo<ErpOperationalTableColumn<ErpExchangeRate>[]>(
    () => [
      {
        key: 'pair',
        header: 'Paire',
        width: '150px',
        render: (item) => `${item.baseCurrency} / ${item.quoteCurrency}`,
      },
      {
        key: 'rate',
        header: 'Taux',
        width: '160px',
        align: 'right',
        render: (item) =>
          Number(item.rate).toLocaleString('fr-MA', {
            maximumFractionDigits: 6,
          }),
      },
      {
        key: 'date',
        header: "Date d'effet",
        width: '150px',
        render: (item) => item.effectiveDate,
      },
      {
        key: 'source',
        header: 'Source',
        width: '320px',
        render: (item) => item.source,
      },
    ],
    [],
  );

  const varianceColumns = useMemo<
    ErpOperationalTableColumn<BudgetVariance[number]>[]
  >(
    () => [
      {
        key: 'account',
        header: 'Compte',
        width: '130px',
        render: (item) => item.accountCode,
      },
      {
        key: 'budget',
        header: 'Budget',
        width: '160px',
        align: 'right',
        render: (item) => formatMadCents(item.budgetCents),
      },
      {
        key: 'actual',
        header: 'Réalisé',
        width: '160px',
        align: 'right',
        render: (item) => formatMadCents(item.actualCents),
      },
      {
        key: 'variance',
        header: 'Écart',
        width: '160px',
        align: 'right',
        render: (item) => formatMadCents(item.varianceCents),
      },
    ],
    [],
  );

  const renderAxisForm = () => (
    <>
      <StyledForm onSubmit={createAxis}>
        <StyledFormTitle>Nouvel axe analytique</StyledFormTitle>
        <StyledFormGrid>
          <StyledField>
            Code de l'axe
            <StyledInput
              value={axisCode}
              onChange={(event) => setAxisCode(event.target.value)}
              placeholder="AGENCE"
            />
          </StyledField>
          <StyledField>
            Libellé
            <StyledInput
              value={axisLabel}
              onChange={(event) => setAxisLabel(event.target.value)}
              placeholder="Agence commerciale"
            />
          </StyledField>
        </StyledFormGrid>
        <StyledLineGroup>
          {axisSections.map((section) => (
            <StyledLine key={section.key} columns={3}>
              <StyledField>
                Code section
                <StyledInput
                  value={section.code}
                  onChange={(event) =>
                    setAxisSections((items) =>
                      items.map((item) =>
                        item.key === section.key
                          ? { ...item, code: event.target.value }
                          : item,
                      ),
                    )
                  }
                  placeholder="CASA"
                />
              </StyledField>
              <StyledField>
                Libellé section
                <StyledInput
                  value={section.label}
                  onChange={(event) =>
                    setAxisSections((items) =>
                      items.map((item) =>
                        item.key === section.key
                          ? { ...item, label: event.target.value }
                          : item,
                      ),
                    )
                  }
                  placeholder="Casablanca"
                />
              </StyledField>
              <Button
                title="Supprimer"
                ariaLabel="Supprimer la section"
                Icon={IconTrash}
                variant="tertiary"
                onClick={() =>
                  setAxisSections((items) =>
                    items.length === 1
                      ? items
                      : items.filter((item) => item.key !== section.key),
                  )
                }
              />
            </StyledLine>
          ))}
        </StyledLineGroup>
        <StyledActions>
          <Button
            title="Ajouter une section"
            ariaLabel="Ajouter une section"
            Icon={IconPlus}
            variant="secondary"
            onClick={() =>
              setAxisSections((items) => [...items, makeSection()])
            }
          />
          <Button
            type="submit"
            title="Créer l'axe"
            ariaLabel="Créer l'axe analytique"
            Icon={IconCheck}
            variant="primary"
            disabled={pending}
          />
        </StyledActions>
      </StyledForm>
      <StyledForm onSubmit={createAllocation}>
        <StyledFormTitle>Imputer une ligne comptable</StyledFormTitle>
        <StyledFormGrid>
          <StyledField>
            Écriture
            <StyledSelect
              value={allocationEntryId}
              onChange={(event) => setAllocationEntryId(event.target.value)}
            >
              <option value="">Sélectionner</option>
              {entries.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.entryDate} · {entry.journalCode} · {entry.label}
                </option>
              ))}
            </StyledSelect>
          </StyledField>
          <StyledField>
            Ligne comptable
            <StyledSelect
              value={allocationLineId}
              onChange={(event) => setAllocationLineId(event.target.value)}
            >
              <option value="">Sélectionner</option>
              {(selectedEntry?.lines ?? []).map((line) => (
                <option key={line.id} value={line.id}>
                  {line.accountCode} · {line.label} ·{' '}
                  {formatMadCents(Math.max(line.debitCents, line.creditCents))}
                </option>
              ))}
            </StyledSelect>
          </StyledField>
          <StyledField>
            Section
            <StyledSelect
              value={allocationSectionId}
              onChange={(event) => setAllocationSectionId(event.target.value)}
            >
              <option value="">Sélectionner</option>
              {sections.map(({ axis, section }) => (
                <option key={section.id} value={section.id}>
                  {axis.code} · {section.code} · {section.label}
                </option>
              ))}
            </StyledSelect>
          </StyledField>
          <StyledField>
            Pourcentage
            <StyledInput
              inputMode="decimal"
              value={allocationPercentage}
              onChange={(event) => setAllocationPercentage(event.target.value)}
              placeholder="100"
            />
          </StyledField>
        </StyledFormGrid>
        <StyledActions>
          <Button
            type="submit"
            title="Enregistrer l'imputation"
            ariaLabel="Enregistrer l'imputation analytique"
            Icon={IconCheck}
            variant="primary"
            disabled={pending || selectedEntry === null}
          />
        </StyledActions>
      </StyledForm>
    </>
  );

  const renderBudgetForm = () => (
    <StyledForm onSubmit={createBudget}>
      <StyledFormGrid>
        <StyledField>
          Code
          <StyledInput
            value={budgetCode}
            onChange={(event) => setBudgetCode(event.target.value)}
            placeholder="BUD-2027"
          />
        </StyledField>
        <StyledField>
          Libellé
          <StyledInput
            value={budgetLabel}
            onChange={(event) => setBudgetLabel(event.target.value)}
            placeholder="Budget annuel 2027"
          />
        </StyledField>
        <StyledField>
          Exercice
          <StyledSelect
            value={budgetExerciseId}
            onChange={(event) => setBudgetExerciseId(event.target.value)}
          >
            {exercises.map((exercise) => (
              <option key={exercise.id} value={exercise.id}>
                {exercise.annee} · {exercise.status}
              </option>
            ))}
          </StyledSelect>
        </StyledField>
      </StyledFormGrid>
      <StyledLineGroup>
        {budgetLines.map((line) => (
          <StyledLine key={line.key} columns={5}>
            <StyledField>
              Compte
              <StyledInput
                value={line.accountCode}
                onChange={(event) =>
                  setBudgetLines((items) =>
                    items.map((item) =>
                      item.key === line.key
                        ? { ...item, accountCode: event.target.value }
                        : item,
                    ),
                  )
                }
                placeholder="7111"
              />
            </StyledField>
            <StyledField>
              Période
              <StyledInput
                type="number"
                min="1"
                max="24"
                value={line.periodNumber}
                onChange={(event) =>
                  setBudgetLines((items) =>
                    items.map((item) =>
                      item.key === line.key
                        ? { ...item, periodNumber: event.target.value }
                        : item,
                    ),
                  )
                }
              />
            </StyledField>
            <StyledField>
              Montant MAD
              <StyledInput
                value={line.amount}
                onChange={(event) =>
                  setBudgetLines((items) =>
                    items.map((item) =>
                      item.key === line.key
                        ? { ...item, amount: event.target.value }
                        : item,
                    ),
                  )
                }
                placeholder="100000,00"
              />
            </StyledField>
            <StyledField>
              Section analytique
              <StyledSelect
                value={line.sectionId}
                onChange={(event) =>
                  setBudgetLines((items) =>
                    items.map((item) =>
                      item.key === line.key
                        ? { ...item, sectionId: event.target.value }
                        : item,
                    ),
                  )
                }
              >
                <option value="">Aucune</option>
                {sections.map(({ axis, section }) => (
                  <option key={section.id} value={section.id}>
                    {axis.code} · {section.code}
                  </option>
                ))}
              </StyledSelect>
            </StyledField>
            <Button
              title="Supprimer"
              ariaLabel="Supprimer la ligne budgétaire"
              Icon={IconTrash}
              variant="tertiary"
              onClick={() =>
                setBudgetLines((items) =>
                  items.length === 1
                    ? items
                    : items.filter((item) => item.key !== line.key),
                )
              }
            />
          </StyledLine>
        ))}
      </StyledLineGroup>
      <StyledActions>
        <Button
          title="Ajouter une ligne"
          ariaLabel="Ajouter une ligne budgétaire"
          Icon={IconPlus}
          variant="secondary"
          onClick={() =>
            setBudgetLines((items) => [...items, makeBudgetLine()])
          }
        />
        <Button
          type="submit"
          title="Créer le budget"
          ariaLabel="Créer le budget"
          Icon={IconCheck}
          variant="primary"
          disabled={pending}
        />
      </StyledActions>
    </StyledForm>
  );

  const renderRecurringForm = () => (
    <StyledForm onSubmit={createRecurringInvoice}>
      <StyledFormGrid>
        <StyledField>
          Client
          <StyledSelect
            value={recurringTierId}
            onChange={(event) => setRecurringTierId(event.target.value)}
          >
            <option value="">Sélectionner</option>
            {tiers
              .filter((tier) => tier.isActive && tier.type !== 'FOURNISSEUR')
              .map((tier) => (
                <option key={tier.id} value={tier.id}>
                  {tier.name}
                </option>
              ))}
          </StyledSelect>
        </StyledField>
        <StyledField>
          Libellé
          <StyledInput
            value={recurringLabel}
            onChange={(event) => setRecurringLabel(event.target.value)}
            placeholder="Abonnement mensuel"
          />
        </StyledField>
        <StyledField>
          Fréquence en mois
          <StyledInput
            type="number"
            min="1"
            max="24"
            value={frequencyMonths}
            onChange={(event) => setFrequencyMonths(event.target.value)}
          />
        </StyledField>
        <StyledField>
          Délai de paiement
          <StyledInput
            type="number"
            min="0"
            max="365"
            value={paymentDelayDays}
            onChange={(event) => setPaymentDelayDays(event.target.value)}
          />
        </StyledField>
        <StyledField>
          Prochaine émission
          <StyledInput
            type="date"
            value={nextRunDate}
            onChange={(event) => setNextRunDate(event.target.value)}
          />
        </StyledField>
        <StyledField>
          Date de fin
          <StyledInput
            type="date"
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
          />
        </StyledField>
      </StyledFormGrid>
      <StyledLineGroup>
        {invoiceLines.map((line) => (
          <StyledLine key={line.key} columns={5}>
            <StyledField>
              Description
              <StyledInput
                value={line.description}
                onChange={(event) =>
                  setInvoiceLines((items) =>
                    items.map((item) =>
                      item.key === line.key
                        ? { ...item, description: event.target.value }
                        : item,
                    ),
                  )
                }
                placeholder="Prestation"
              />
            </StyledField>
            <StyledField>
              Quantité
              <StyledInput
                type="number"
                min="0.01"
                step="0.01"
                value={line.quantity}
                onChange={(event) =>
                  setInvoiceLines((items) =>
                    items.map((item) =>
                      item.key === line.key
                        ? { ...item, quantity: event.target.value }
                        : item,
                    ),
                  )
                }
              />
            </StyledField>
            <StyledField>
              Prix HT MAD
              <StyledInput
                value={line.unitPriceHt}
                onChange={(event) =>
                  setInvoiceLines((items) =>
                    items.map((item) =>
                      item.key === line.key
                        ? { ...item, unitPriceHt: event.target.value }
                        : item,
                    ),
                  )
                }
                placeholder="1500,00"
              />
            </StyledField>
            <StyledField>
              TVA %
              <StyledInput
                type="number"
                min="0"
                max="100"
                value={line.tvaRate}
                onChange={(event) =>
                  setInvoiceLines((items) =>
                    items.map((item) =>
                      item.key === line.key
                        ? { ...item, tvaRate: event.target.value }
                        : item,
                    ),
                  )
                }
              />
            </StyledField>
            <Button
              title="Supprimer"
              ariaLabel="Supprimer la ligne de facture"
              Icon={IconTrash}
              variant="tertiary"
              onClick={() =>
                setInvoiceLines((items) =>
                  items.length === 1
                    ? items
                    : items.filter((item) => item.key !== line.key),
                )
              }
            />
          </StyledLine>
        ))}
      </StyledLineGroup>
      <StyledActions>
        <Button
          title="Ajouter une ligne"
          ariaLabel="Ajouter une ligne de facture"
          Icon={IconPlus}
          variant="secondary"
          onClick={() =>
            setInvoiceLines((items) => [...items, makeInvoiceLine()])
          }
        />
        <Button
          type="submit"
          title="Activer"
          ariaLabel="Activer la facturation récurrente"
          Icon={IconCheck}
          variant="primary"
          disabled={pending}
        />
      </StyledActions>
    </StyledForm>
  );

  const renderRateForm = () => (
    <StyledForm onSubmit={createExchangeRate}>
      <StyledFormGrid>
        <StyledField>
          Devise cotée
          <StyledInput
            maxLength={3}
            value={quoteCurrency}
            onChange={(event) =>
              setQuoteCurrency(event.target.value.toUpperCase())
            }
            placeholder="EUR"
          />
        </StyledField>
        <StyledField>
          Taux pour 1 MAD
          <StyledInput
            inputMode="decimal"
            value={rate}
            onChange={(event) => setRate(event.target.value)}
            placeholder="0,092"
          />
        </StyledField>
        <StyledField>
          Date d'effet
          <StyledInput
            type="date"
            value={effectiveDate}
            onChange={(event) => setEffectiveDate(event.target.value)}
          />
        </StyledField>
        <StyledField>
          Source
          <StyledInput
            value={rateSource}
            onChange={(event) => setRateSource(event.target.value)}
          />
        </StyledField>
      </StyledFormGrid>
      <StyledActions>
        <Button
          type="submit"
          title="Enregistrer le taux"
          ariaLabel="Enregistrer le taux"
          Icon={IconCheck}
          variant="primary"
          disabled={pending}
        />
      </StyledActions>
    </StyledForm>
  );

  const pageActions = (
    <>
      {view === 'recurring' ? (
        <Button
          title="Générer les échéances"
          ariaLabel="Générer les factures arrivées à échéance"
          Icon={IconRefresh}
          variant="secondary"
          onClick={() => void runRecurring()}
          disabled={pending}
        />
      ) : null}
      {canManage ? (
        <Button
          title={showForm ? 'Fermer' : 'Nouveau'}
          ariaLabel={showForm ? 'Fermer le formulaire' : 'Créer'}
          Icon={showForm ? undefined : IconPlus}
          variant="primary"
          onClick={() => setShowForm((value) => !value)}
        />
      ) : null}
    </>
  );

  return (
    <ErpPageShell
      title="Pilotage financier"
      description="Budgets, axes analytiques, facturation récurrente et taux de change"
      actions={pageActions}
      state={loadState}
      loadingLabel="Chargement du pilotage financier…"
      errorLabel="Impossible de charger les données financières."
      onRetry={refresh}
    >
      <StyledWorkspace>
        <StyledTabs role="tablist" aria-label="Vues du pilotage financier">
          {views.map((item) => (
            <StyledTab
              key={item.key}
              type="button"
              role="tab"
              active={view === item.key}
              aria-selected={view === item.key}
              onClick={() => selectView(item.key)}
            >
              {item.label}
            </StyledTab>
          ))}
        </StyledTabs>
        {notice ? (
          <StyledNotice
            danger={notice.danger}
            role={notice.danger ? 'alert' : 'status'}
          >
            {notice.message}
          </StyledNotice>
        ) : null}
        {showForm && view === 'budgets' ? renderBudgetForm() : null}
        {showForm && view === 'analytics' ? renderAxisForm() : null}
        {showForm && view === 'recurring' ? renderRecurringForm() : null}
        {showForm && view === 'currencies' ? renderRateForm() : null}
        {variance && view === 'budgets' ? (
          <StyledVariance>
            <h2>
              Écarts · {variance.budget.code} · {variance.budget.label}
            </h2>
            <ErpOperationalTable
              ariaLabel="Écarts budgétaires"
              columns={varianceColumns}
              rows={variance.rows}
              getRowKey={(row) => row.accountCode}
              emptyLabel="Aucun mouvement pour ce budget"
            />
          </StyledVariance>
        ) : null}
        <StyledTableArea>
          {view === 'budgets' ? (
            <ErpOperationalTable
              ariaLabel="Budgets"
              columns={budgetColumns}
              rows={budgets}
              getRowKey={(row) => row.id}
              emptyLabel="Aucun budget"
            />
          ) : null}
          {view === 'analytics' ? (
            <ErpOperationalTable
              ariaLabel="Axes analytiques"
              columns={analyticColumns}
              rows={axes}
              getRowKey={(row) => row.id}
              emptyLabel="Aucun axe analytique"
            />
          ) : null}
          {view === 'recurring' ? (
            <ErpOperationalTable
              ariaLabel="Factures récurrentes"
              columns={recurringColumns}
              rows={recurringInvoices}
              getRowKey={(row) => row.id}
              emptyLabel="Aucune facturation récurrente"
            />
          ) : null}
          {view === 'currencies' ? (
            <ErpOperationalTable
              ariaLabel="Taux de change"
              columns={rateColumns}
              rows={exchangeRates}
              getRowKey={(row) => row.id}
              emptyLabel="Aucun taux de change"
            />
          ) : null}
        </StyledTableArea>
      </StyledWorkspace>
    </ErpPageShell>
  );
};
