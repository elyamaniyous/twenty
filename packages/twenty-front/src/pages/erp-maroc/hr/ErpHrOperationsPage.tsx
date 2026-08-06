import {
  ErpOperationalTable,
  type ErpOperationalTableColumn,
} from '@/erp-maroc/components/ErpOperationalTable';
import { type ErpMarocRequest } from '@/erp-maroc/api/erpMarocClient';
import { ErpPageShell } from '@/erp-maroc/components/ErpPageShell';
import {
  ErpStatusBadge,
  type ErpStatusTone,
} from '@/erp-maroc/components/ErpStatusBadge';
import { useErpMarocContext } from '@/erp-maroc/context/useErpMarocContext';
import { styled } from '@linaria/react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  erpEmployeeListSchema,
  erpHrAlertRunSchema,
  erpHrAnalyticsSchema,
  erpHrCampaignListSchema,
  erpHrCampaignSchema,
  erpPayrollBankBatchListSchema,
  erpPayrollBankBatchSchema,
  erpPayrollBankCandidateListSchema,
  erpPayrollBankFileSchema,
  erpPayrollBankLineSchema,
  erpPayrollDeductionListSchema,
  erpPayrollDeductionSchema,
  erpPayrollIrExportSchema,
  erpPayslipListSchema,
  erpPayslipSchema,
  erpRegulatoryFileSchema,
  erpTimeClockConnectorListSchema,
  erpTimeClockConnectorSchema,
  erpTimeClockSyncRunSchema,
  erpWorkforceBudgetListSchema,
  erpWorkforceBudgetSchema,
  erpWorkforceBudgetVarianceSchema,
  type ErpEmployee,
  type ErpHrAnalytics,
  type ErpHrCampaign,
  type ErpPayrollBankBatch,
  type ErpPayrollBankLine,
  type ErpPayrollDeduction,
  type ErpPayslip,
  type ErpTimeClockConnector,
  type ErpWorkforceBudget,
} from 'twenty-shared/erp-maroc';
import {
  IconBell,
  IconCheck,
  IconDownload,
  IconMail,
  IconPlus,
  IconRefresh,
} from 'twenty-ui/display';
import { Button } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';
import { type z } from 'zod';

type View =
  | 'dashboard'
  | 'deductions'
  | 'payments'
  | 'budgets'
  | 'timeclocks'
  | 'campaigns';
type LoadState = 'loading' | 'ready' | 'error';
type BankCandidate = {
  id: string;
  transactionDate: string;
  description: string;
  reference: string | null;
  debitCents: number;
  scoreBasisPoints: number;
  reasons: string[];
};

const currentPeriod = () => new Date().toISOString().slice(0, 7);
const currentYear = () => new Date().getUTCFullYear();
const payrollPeriodBounds = (periodKey: string) => {
  const [year, month] = periodKey.split('-').map(Number);
  const periodEnd = new Date(Date.UTC(year, month, 0))
    .toISOString()
    .slice(0, 10);

  return { periodStart: `${periodKey}-01`, periodEnd };
};
const money = (cents: number) =>
  new Intl.NumberFormat('fr-MA', { style: 'currency', currency: 'MAD' }).format(
    cents / 100,
  );
const percent = (basisPoints: number) => `${(basisPoints / 100).toFixed(1)} %`;
const employeeName = (employee?: ErpEmployee) =>
  employee ? `${employee.firstName} ${employee.lastName}` : '—';

const downloadBase64 = (file: {
  filename: string;
  contentType: string;
  contentBase64: string;
}) => {
  const bytes = Uint8Array.from(window.atob(file.contentBase64), (character) =>
    character.charCodeAt(0),
  );
  const url = URL.createObjectURL(
    new Blob([bytes], { type: file.contentType }),
  );
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = file.filename;
  anchor.click();
  URL.revokeObjectURL(url);
};

const downloadText = (file: {
  filename: string;
  contentType: string;
  content?: string;
}) => {
  if (file.content === undefined) return;
  const url = URL.createObjectURL(
    new Blob([file.content], { type: file.contentType }),
  );
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = file.filename;
  anchor.click();
  URL.revokeObjectURL(url);
};

const statusTone = (status: string): ErpStatusTone => {
  if (
    ['ACTIVE', 'APPROVED', 'COMPLETED', 'MATCHED', 'RECONCILED'].includes(
      status,
    )
  )
    return 'success';
  if (['FAILED', 'ERROR', 'CANCELLED', 'REJECTED'].includes(status))
    return 'danger';
  if (
    ['PENDING', 'SCHEDULED', 'PARTIAL', 'PARTIALLY_RECONCILED'].includes(status)
  )
    return 'warning';
  if (['RUNNING', 'GENERATED'].includes(status)) return 'info';
  return 'neutral';
};

const StyledToolbar = styled.div`
  align-items: center;
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  flex: 0 0 auto;
  gap: ${themeCssVariables.spacing[2]};
  justify-content: space-between;
  min-height: 44px;
  overflow-x: auto;
  padding: 0 ${themeCssVariables.spacing[3]};
`;

const StyledTabs = styled.div`
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
  font: inherit;
  font-size: ${themeCssVariables.font.size.sm};
  height: 30px;
  padding: 0 ${themeCssVariables.spacing[2]};
  white-space: nowrap;
`;

const StyledFilters = styled.div`
  align-items: center;
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
`;

const StyledInput = styled.input`
  background: ${themeCssVariables.background.primary};
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.sm};
  box-sizing: border-box;
  color: ${themeCssVariables.font.color.primary};
  font: inherit;
  font-size: ${themeCssVariables.font.size.sm};
  height: 30px;
  min-width: 0;
  padding: 0 ${themeCssVariables.spacing[2]};
  width: 100%;
`;

const StyledSelect = styled.select`
  background: ${themeCssVariables.background.primary};
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.sm};
  color: ${themeCssVariables.font.color.primary};
  font: inherit;
  font-size: ${themeCssVariables.font.size.sm};
  height: 30px;
  min-width: 0;
  padding: 0 ${themeCssVariables.spacing[2]};
  width: 100%;
`;

const StyledTextarea = styled.textarea`
  background: ${themeCssVariables.background.primary};
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.sm};
  box-sizing: border-box;
  color: ${themeCssVariables.font.color.primary};
  font: inherit;
  font-size: ${themeCssVariables.font.size.sm};
  min-height: 72px;
  padding: ${themeCssVariables.spacing[2]};
  resize: vertical;
  width: 100%;
`;

const StyledForm = styled.form`
  align-items: end;
  background: ${themeCssVariables.background.secondary};
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: grid;
  flex: 0 0 auto;
  gap: ${themeCssVariables.spacing[2]};
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  padding: ${themeCssVariables.spacing[3]};
`;

const StyledField = styled.label`
  color: ${themeCssVariables.font.color.secondary};
  display: flex;
  flex-direction: column;
  font-size: ${themeCssVariables.font.size.sm};
  gap: ${themeCssVariables.spacing[1]};
  min-width: 0;
`;

const StyledWideField = styled(StyledField)`
  grid-column: span 2;
`;

const StyledMetrics = styled.div`
  display: grid;
  flex: 1 1 auto;
  grid-template-columns: repeat(4, minmax(150px, 1fr));
  overflow: auto;
`;

const StyledMetric = styled.div`
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  border-right: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[2]};
  min-height: 92px;
  padding: ${themeCssVariables.spacing[4]};
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

const StyledMessage = styled.div<{ danger: boolean }>`
  background: ${({ danger }) =>
    danger
      ? themeCssVariables.tag.background.red
      : themeCssVariables.tag.background.green};
  color: ${({ danger }) =>
    danger ? themeCssVariables.tag.text.red : themeCssVariables.tag.text.green};
  font-size: ${themeCssVariables.font.size.sm};
  padding: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[3]};
`;

const StyledAction = styled.button`
  align-items: center;
  background: transparent;
  border: 0;
  color: ${themeCssVariables.color.blue};
  cursor: pointer;
  display: inline-flex;
  font: inherit;
  font-size: ${themeCssVariables.font.size.sm};
  gap: ${themeCssVariables.spacing[1]};
  padding: ${themeCssVariables.spacing[1]};

  &:disabled {
    color: ${themeCssVariables.font.color.extraLight};
    cursor: default;
  }
`;

const StyledSplit = styled.div`
  display: grid;
  flex: 1 1 auto;
  grid-template-columns: minmax(0, 3fr) minmax(320px, 2fr);
  min-height: 0;
  overflow: hidden;
`;

const StyledCandidatePanel = styled.aside`
  border-left: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: auto;
`;

const StyledPanelTitle = styled.h2`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.md};
  font-weight: ${themeCssVariables.font.weight.semiBold};
  letter-spacing: 0;
  margin: 0;
  padding: ${themeCssVariables.spacing[3]};
`;

export const ErpHrOperationsPage = () => {
  const { client } = useErpMarocContext();
  const [view, setView] = useState<View>('dashboard');
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [danger, setDanger] = useState(false);
  const [periodKey, setPeriodKey] = useState(currentPeriod);
  const [year, setYear] = useState(currentYear);
  const [employees, setEmployees] = useState<ErpEmployee[]>([]);
  const [analytics, setAnalytics] = useState<ErpHrAnalytics | null>(null);
  const [deductions, setDeductions] = useState<ErpPayrollDeduction[]>([]);
  const [batches, setBatches] = useState<ErpPayrollBankBatch[]>([]);
  const [payslips, setPayslips] = useState<ErpPayslip[]>([]);
  const [budgets, setBudgets] = useState<ErpWorkforceBudget[]>([]);
  const [connectors, setConnectors] = useState<ErpTimeClockConnector[]>([]);
  const [campaigns, setCampaigns] = useState<ErpHrCampaign[]>([]);
  const [candidates, setCandidates] = useState<BankCandidate[]>([]);
  const [selectedBankLine, setSelectedBankLine] =
    useState<ErpPayrollBankLine | null>(null);

  const [deductionForm, setDeductionForm] = useState({
    employeeId: '',
    type: 'LOAN',
    reference: '',
    label: '',
    principalMad: '',
    installmentMad: '',
    effectiveFrom: `${periodKey}-01`,
  });
  const [batchForm, setBatchForm] = useState({
    debitAccountRib: '',
    executionDate: new Date().toISOString().slice(0, 10),
  });
  const [payrollForm, setPayrollForm] = useState({
    employeeId: '',
    runType: 'REGULAR',
    runSequence: '1',
    baseSalaryMad: '',
    effectiveChangeDate: '',
    baseSalaryBeforeMad: '',
    baseSalaryAfterMad: '',
    correctionForPayslipId: '',
    otherDeductionsMad: '',
  });
  const [budgetForm, setBudgetForm] = useState({
    name: `Budget RH ${year}`,
    department: 'Non affecte',
    month: '1',
    headcount: '0',
    grossMad: '0',
    employerCostMad: '0',
    recruitments: '0',
  });
  const [connectorForm, setConnectorForm] = useState({
    name: '',
    type: 'CSV_WEBHOOK',
    externalSystem: '',
    endpointUrl: '',
  });
  const [syncPayload, setSyncPayload] = useState(
    '[{"employeeNumber":"","attendanceDate":"","clockIn":"09:00","clockOut":"18:00","breakMinutes":60}]',
  );
  const [campaignForm, setCampaignForm] = useState({
    name: '',
    subject: '',
    message: '',
    audience: 'ACTIVE_EMPLOYEES',
    department: '',
  });

  const execute = <TSchema extends z.ZodType>(
    request: Omit<ErpMarocRequest<TSchema>, 'idempotencyKey'>,
  ) =>
    client.createMutationIntent(request, { idempotency: 'required' }).execute();

  const load = useCallback(async () => {
    setLoadState('loading');
    try {
      const [
        nextEmployees,
        nextAnalytics,
        nextDeductions,
        nextBatches,
        nextPayslips,
        nextBudgets,
        nextConnectors,
        nextCampaigns,
      ] = await Promise.all([
        client.request({
          method: 'GET',
          path: '/payroll/employees',
          schema: erpEmployeeListSchema,
        }),
        client.request({
          method: 'GET',
          path: '/hr-operations/analytics',
          schema: erpHrAnalyticsSchema,
        }),
        client.request({
          method: 'GET',
          path: '/payroll-operations/deductions',
          schema: erpPayrollDeductionListSchema,
        }),
        client.request({
          method: 'GET',
          path: '/payroll-operations/bank-batches',
          query: { periodKey },
          schema: erpPayrollBankBatchListSchema,
        }),
        client.request({
          method: 'GET',
          path: '/payroll/payslips',
          query: { periodKey },
          schema: erpPayslipListSchema,
        }),
        client.request({
          method: 'GET',
          path: '/hr-operations/budgets',
          query: { year: String(year) },
          schema: erpWorkforceBudgetListSchema,
        }),
        client.request({
          method: 'GET',
          path: '/hr-operations/time-clock-connectors',
          schema: erpTimeClockConnectorListSchema,
        }),
        client.request({
          method: 'GET',
          path: '/hr-operations/campaigns',
          schema: erpHrCampaignListSchema,
        }),
      ]);
      setEmployees(nextEmployees);
      setAnalytics(nextAnalytics);
      setDeductions(nextDeductions);
      setBatches(nextBatches);
      setPayslips(nextPayslips);
      setBudgets(nextBudgets);
      setConnectors(nextConnectors);
      setCampaigns(nextCampaigns);
      setDeductionForm((current) => ({
        ...current,
        employeeId: current.employeeId || nextEmployees[0]?.id || '',
      }));
      setPayrollForm((current) => ({
        ...current,
        employeeId: current.employeeId || nextEmployees[0]?.id || '',
      }));
      setLoadState('ready');
    } catch {
      setLoadState('error');
    }
  }, [client, periodKey, year]);

  useEffect(() => {
    void load();
  }, [load]);

  const mutate = async <T,>(operation: () => Promise<T>, success: string) => {
    setBusy(true);
    setMessage(null);
    try {
      const result = await operation();
      setDanger(false);
      setMessage(success);
      await load();
      return result;
    } catch {
      setDanger(true);
      setMessage(
        "L'opération n'a pas abouti. Vérifiez les données et le statut du dossier.",
      );
      return null;
    } finally {
      setBusy(false);
    }
  };

  const saveDeduction = (event: React.FormEvent) => {
    event.preventDefault();
    void mutate(
      () =>
        execute({
          method: 'POST',
          path: '/payroll-operations/deductions',
          schema: erpPayrollDeductionSchema,
          body: {
            employeeId: deductionForm.employeeId,
            type: deductionForm.type,
            reference: deductionForm.reference,
            label: deductionForm.label,
            principalCents: Math.round(
              Number(deductionForm.principalMad) * 100,
            ),
            installmentCents: Math.round(
              Number(deductionForm.installmentMad) * 100,
            ),
            effectiveFrom: deductionForm.effectiveFrom,
          },
        }),
      'Retenue enregistrée.',
    );
  };

  const updateDeduction = (row: ErpPayrollDeduction, status: string) =>
    void mutate(
      () =>
        execute({
          method: 'PATCH',
          path: `/payroll-operations/deductions/${row.id}`,
          schema: erpPayrollDeductionSchema,
          body: { status },
        }),
      'Statut de la retenue mis à jour.',
    );

  const createBatch = (event: React.FormEvent) => {
    event.preventDefault();
    void mutate(
      () =>
        execute({
          method: 'POST',
          path: '/payroll-operations/bank-batches',
          schema: erpPayrollBankBatchSchema,
          body: { periodKey, ...batchForm },
        }),
      'Lot de virements créé.',
    );
  };

  const generateAdvancedPayslip = (event: React.FormEvent) => {
    event.preventDefault();
    const { periodStart, periodEnd } = payrollPeriodBounds(periodKey);
    const hasMidPeriodChange = Boolean(payrollForm.effectiveChangeDate);
    const optionalCents = (value: string) =>
      value === '' ? undefined : Math.round(Number(value) * 100);

    void mutate(
      () =>
        execute({
          method: 'POST',
          path: '/payroll/payslips/generate',
          schema: erpPayslipSchema,
          body: {
            employeeId: payrollForm.employeeId,
            periodKey,
            periodStart,
            periodEnd,
            runType: payrollForm.runType,
            runSequence: Number(payrollForm.runSequence),
            ...(!hasMidPeriodChange && payrollForm.baseSalaryMad !== ''
              ? { baseSalaryCents: optionalCents(payrollForm.baseSalaryMad) }
              : {}),
            ...(hasMidPeriodChange
              ? {
                  effectiveChangeDate: payrollForm.effectiveChangeDate,
                  baseSalaryBeforeCents: optionalCents(
                    payrollForm.baseSalaryBeforeMad,
                  ),
                  baseSalaryAfterCents: optionalCents(
                    payrollForm.baseSalaryAfterMad,
                  ),
                }
              : {}),
            ...(payrollForm.runType === 'RETROACTIVE'
              ? {
                  correctionForPayslipId: payrollForm.correctionForPayslipId,
                }
              : {}),
            ...(payrollForm.otherDeductionsMad !== ''
              ? {
                  otherDeductionsCents: optionalCents(
                    payrollForm.otherDeductionsMad,
                  ),
                }
              : {}),
          },
        }),
      'Bulletin avancé généré en brouillon.',
    );
  };

  const generateBatch = async (batch: ErpPayrollBankBatch) => {
    const file = await mutate(
      () =>
        execute({
          method: 'POST',
          path: `/payroll-operations/bank-batches/${batch.id}/generate`,
          schema: erpPayrollBankFileSchema,
        }),
      'Fichier bancaire généré.',
    );
    if (file) downloadBase64(file);
  };

  const exportIr = async () => {
    setBusy(true);
    try {
      const file = await client.request({
        method: 'GET',
        path: '/payroll-operations/ir/export',
        query: { periodKey },
        schema: erpPayrollIrExportSchema,
      });
      downloadBase64(file);
      setDanger(false);
      setMessage(
        'Export IR généré et enregistré dans les soumissions réglementaires.',
      );
    } catch {
      setDanger(true);
      setMessage("L'export IR n'a pas abouti.");
    } finally {
      setBusy(false);
    }
  };

  const exportCnssBds = async (format: 'xml' | 'txt') => {
    setBusy(true);
    try {
      const file = await client.request({
        method: 'GET',
        path: '/payroll/cnss/bds',
        query: { periodKey, format },
        schema: erpRegulatoryFileSchema,
      });
      downloadText(file);
      setDanger(false);
      setMessage(
        `Export DAMANCOM/BDS ${format.toUpperCase()} généré. Validation externe CNSS à confirmer.`,
      );
    } catch {
      setDanger(true);
      setMessage("L'export DAMANCOM/BDS n'a pas abouti.");
    } finally {
      setBusy(false);
    }
  };

  const findCandidates = async (line: ErpPayrollBankLine) => {
    setBusy(true);
    try {
      const rows = await client.request({
        method: 'GET',
        path: `/payroll-operations/bank-lines/${line.id}/reconciliation-candidates`,
        schema: erpPayrollBankCandidateListSchema,
      });
      setSelectedBankLine(line);
      setCandidates(rows);
    } catch {
      setDanger(true);
      setMessage('Impossible de charger les mouvements bancaires candidats.');
    } finally {
      setBusy(false);
    }
  };

  const reconcile = (candidate: BankCandidate) => {
    if (!selectedBankLine) return;
    void mutate(
      () =>
        execute({
          method: 'POST',
          path: `/payroll-operations/bank-lines/${selectedBankLine.id}/reconcile`,
          schema: erpPayrollBankLineSchema,
          body: { bankStatementLineId: candidate.id },
        }),
      'Salaire rapproché avec la banque et bulletin marqué payé.',
    ).then(() => {
      setCandidates([]);
      setSelectedBankLine(null);
    });
  };

  const createBudget = (event: React.FormEvent) => {
    event.preventDefault();
    void mutate(
      () =>
        execute({
          method: 'POST',
          path: '/hr-operations/budgets',
          schema: erpWorkforceBudgetSchema,
          body: {
            year,
            name: budgetForm.name,
            lines: [
              {
                department: budgetForm.department,
                month: Number(budgetForm.month),
                plannedHeadcount: Number(budgetForm.headcount),
                plannedGrossCents: Math.round(
                  Number(budgetForm.grossMad) * 100,
                ),
                plannedEmployerCostCents: Math.round(
                  Number(budgetForm.employerCostMad) * 100,
                ),
                plannedRecruitments: Number(budgetForm.recruitments),
              },
            ],
          },
        }),
      'Budget RH créé.',
    );
  };

  const approveBudget = (budget: ErpWorkforceBudget) =>
    void mutate(
      () =>
        execute({
          method: 'POST',
          path: `/hr-operations/budgets/${budget.id}/approve`,
          schema: erpWorkforceBudgetSchema,
        }),
      'Budget RH approuvé.',
    );

  const showVariance = async (budget: ErpWorkforceBudget) => {
    setBusy(true);
    try {
      const variance = await client.request({
        method: 'GET',
        path: `/hr-operations/budgets/${budget.id}/variance`,
        schema: erpWorkforceBudgetVarianceSchema,
      });
      const total = variance.rows.reduce(
        (sum, row) => sum + row.employerCostVarianceCents,
        0,
      );
      setDanger(total > 0);
      setMessage(`Écart de masse salariale : ${money(total)}.`);
    } catch {
      setDanger(true);
      setMessage("Le calcul d'écart n'a pas abouti.");
    } finally {
      setBusy(false);
    }
  };

  const createConnector = (event: React.FormEvent) => {
    event.preventDefault();
    void mutate(
      () =>
        execute({
          method: 'POST',
          path: '/hr-operations/time-clock-connectors',
          schema: erpTimeClockConnectorSchema,
          body: connectorForm,
        }),
      'Connecteur de badgeuse créé.',
    );
  };

  const syncConnector = (connector: ErpTimeClockConnector) => {
    let records: unknown;
    try {
      records = JSON.parse(syncPayload);
    } catch {
      setDanger(true);
      setMessage('Le lot de pointages JSON est invalide.');
      return;
    }
    void mutate(
      () =>
        execute({
          method: 'POST',
          path: `/hr-operations/time-clock-connectors/${connector.id}/sync`,
          schema: erpTimeClockSyncRunSchema,
          body: { sourceReference: `UI-${Date.now()}`, records },
        }),
      'Synchronisation de badgeuse terminée.',
    );
  };

  const createCampaign = (event: React.FormEvent) => {
    event.preventDefault();
    void mutate(
      () =>
        execute({
          method: 'POST',
          path: '/hr-operations/campaigns',
          schema: erpHrCampaignSchema,
          body: {
            name: campaignForm.name,
            subject: campaignForm.subject,
            message: campaignForm.message,
            audience: campaignForm.audience,
            audienceFilter:
              campaignForm.audience === 'DEPARTMENT'
                ? { department: campaignForm.department }
                : {},
          },
        }),
      'Campagne RH créée.',
    );
  };

  const launchCampaign = (campaign: ErpHrCampaign) =>
    void mutate(
      () =>
        execute({
          method: 'POST',
          path: `/hr-operations/campaigns/${campaign.id}/launch`,
          schema: erpHrCampaignSchema,
        }),
      'Campagne RH envoyée via Brevo.',
    );

  const runAlerts = () =>
    void mutate(
      () =>
        execute({
          method: 'POST',
          path: '/hr-operations/alerts/run',
          query: { days: '30' },
          schema: erpHrAlertRunSchema,
        }),
      'Alertes RH traitées.',
    );

  const deductionColumns: ErpOperationalTableColumn<ErpPayrollDeduction>[] = [
    {
      key: 'employee',
      header: 'Salarié',
      width: '190px',
      render: (row) => employeeName(row.employee),
    },
    {
      key: 'type',
      header: 'Nature',
      width: '150px',
      render: (row) => row.type,
    },
    {
      key: 'reference',
      header: 'Référence',
      width: '130px',
      render: (row) => row.reference,
    },
    {
      key: 'remaining',
      header: 'Restant',
      width: '120px',
      align: 'right',
      render: (row) => money(row.remainingCents),
    },
    {
      key: 'installment',
      header: 'Échéance',
      width: '120px',
      align: 'right',
      render: (row) => money(row.installmentCents),
    },
    {
      key: 'status',
      header: 'Statut',
      width: '110px',
      render: (row) => (
        <ErpStatusBadge label={row.status} tone={statusTone(row.status)} />
      ),
    },
    {
      key: 'actions',
      header: '',
      width: '180px',
      align: 'right',
      render: (row) => (
        <>
          <StyledAction
            disabled={busy || ['SETTLED', 'CANCELLED'].includes(row.status)}
            onClick={() =>
              updateDeduction(
                row,
                row.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE',
              )
            }
          >
            {row.status === 'ACTIVE' ? 'Suspendre' : 'Activer'}
          </StyledAction>
          <StyledAction
            disabled={busy || ['SETTLED', 'CANCELLED'].includes(row.status)}
            onClick={() => updateDeduction(row, 'CANCELLED')}
          >
            Annuler
          </StyledAction>
        </>
      ),
    },
  ];

  const batchLines = useMemo(
    () => batches.flatMap((batch) => batch.lines ?? []),
    [batches],
  );
  const batchColumns: ErpOperationalTableColumn<ErpPayrollBankBatch>[] = [
    {
      key: 'number',
      header: 'Lot',
      width: '190px',
      render: (row) => row.batchNumber,
    },
    {
      key: 'date',
      header: 'Exécution',
      width: '110px',
      render: (row) => row.executionDate,
    },
    {
      key: 'lines',
      header: 'Salaires',
      width: '90px',
      align: 'right',
      render: (row) => row.lines?.length ?? 0,
    },
    {
      key: 'amount',
      header: 'Montant',
      width: '140px',
      align: 'right',
      render: (row) => money(row.totalAmountCents),
    },
    {
      key: 'status',
      header: 'Statut',
      width: '160px',
      render: (row) => (
        <ErpStatusBadge label={row.status} tone={statusTone(row.status)} />
      ),
    },
    {
      key: 'actions',
      header: '',
      width: '120px',
      align: 'right',
      render: (row) => (
        <StyledAction
          disabled={busy || !['DRAFT', 'GENERATED'].includes(row.status)}
          onClick={() => void generateBatch(row)}
        >
          <IconDownload size={16} />
          Fichier
        </StyledAction>
      ),
    },
  ];
  const bankLineColumns: ErpOperationalTableColumn<ErpPayrollBankLine>[] = [
    {
      key: 'employee',
      header: 'Bénéficiaire',
      width: '210px',
      render: (row) => row.beneficiaryName,
    },
    {
      key: 'reference',
      header: 'Référence',
      width: '200px',
      render: (row) => row.reference,
    },
    {
      key: 'amount',
      header: 'Net',
      width: '120px',
      align: 'right',
      render: (row) => money(row.amountCents),
    },
    {
      key: 'status',
      header: 'Statut',
      width: '110px',
      render: (row) => (
        <ErpStatusBadge label={row.status} tone={statusTone(row.status)} />
      ),
    },
    {
      key: 'actions',
      header: '',
      width: '120px',
      align: 'right',
      render: (row) => (
        <StyledAction
          disabled={busy || row.status !== 'PENDING'}
          onClick={() => void findCandidates(row)}
        >
          Rapprocher
        </StyledAction>
      ),
    },
  ];
  const candidateColumns: ErpOperationalTableColumn<BankCandidate>[] = [
    {
      key: 'date',
      header: 'Date',
      width: '100px',
      render: (row) => row.transactionDate,
    },
    {
      key: 'label',
      header: 'Libellé',
      width: '190px',
      render: (row) => row.description,
    },
    {
      key: 'score',
      header: 'Score',
      width: '80px',
      align: 'right',
      render: (row) => percent(row.scoreBasisPoints),
    },
    {
      key: 'action',
      header: '',
      width: '100px',
      align: 'right',
      render: (row) => (
        <StyledAction disabled={busy} onClick={() => reconcile(row)}>
          <IconCheck size={16} />
          Lettrer
        </StyledAction>
      ),
    },
  ];
  const budgetColumns: ErpOperationalTableColumn<ErpWorkforceBudget>[] = [
    {
      key: 'name',
      header: 'Budget',
      width: '220px',
      render: (row) => row.name,
    },
    { key: 'year', header: 'Année', width: '80px', render: (row) => row.year },
    {
      key: 'lines',
      header: 'Lignes',
      width: '80px',
      align: 'right',
      render: (row) => row.lines?.length ?? 0,
    },
    {
      key: 'amount',
      header: 'Masse planifiée',
      width: '150px',
      align: 'right',
      render: (row) =>
        money(
          (row.lines ?? []).reduce(
            (sum, line) => sum + line.plannedEmployerCostCents,
            0,
          ),
        ),
    },
    {
      key: 'status',
      header: 'Statut',
      width: '110px',
      render: (row) => (
        <ErpStatusBadge label={row.status} tone={statusTone(row.status)} />
      ),
    },
    {
      key: 'actions',
      header: '',
      width: '180px',
      align: 'right',
      render: (row) => (
        <>
          <StyledAction
            disabled={busy || row.status !== 'DRAFT'}
            onClick={() => approveBudget(row)}
          >
            Approuver
          </StyledAction>
          <StyledAction disabled={busy} onClick={() => void showVariance(row)}>
            Écarts
          </StyledAction>
        </>
      ),
    },
  ];
  const connectorColumns: ErpOperationalTableColumn<ErpTimeClockConnector>[] = [
    {
      key: 'name',
      header: 'Connecteur',
      width: '190px',
      render: (row) => row.name,
    },
    {
      key: 'system',
      header: 'Système',
      width: '170px',
      render: (row) => row.externalSystem,
    },
    { key: 'type', header: 'Type', width: '130px', render: (row) => row.type },
    {
      key: 'sync',
      header: 'Dernière synchro',
      width: '170px',
      render: (row) =>
        row.lastSyncAt ? new Date(row.lastSyncAt).toLocaleString('fr-MA') : '—',
    },
    {
      key: 'status',
      header: 'Statut',
      width: '100px',
      render: (row) => (
        <ErpStatusBadge label={row.status} tone={statusTone(row.status)} />
      ),
    },
    {
      key: 'action',
      header: '',
      width: '120px',
      align: 'right',
      render: (row) => (
        <StyledAction
          disabled={busy || row.status !== 'ACTIVE'}
          onClick={() => syncConnector(row)}
        >
          <IconRefresh size={16} />
          Synchroniser
        </StyledAction>
      ),
    },
  ];
  const campaignColumns: ErpOperationalTableColumn<ErpHrCampaign>[] = [
    {
      key: 'name',
      header: 'Campagne',
      width: '210px',
      render: (row) => row.name,
    },
    {
      key: 'subject',
      header: 'Objet',
      width: '240px',
      render: (row) => row.subject,
    },
    {
      key: 'audience',
      header: 'Audience',
      width: '150px',
      render: (row) => row.audience,
    },
    {
      key: 'recipients',
      header: 'Destinataires',
      width: '110px',
      align: 'right',
      render: (row) => row.recipients?.length ?? 0,
    },
    {
      key: 'status',
      header: 'Statut',
      width: '110px',
      render: (row) => (
        <ErpStatusBadge label={row.status} tone={statusTone(row.status)} />
      ),
    },
    {
      key: 'action',
      header: '',
      width: '110px',
      align: 'right',
      render: (row) => (
        <StyledAction
          disabled={busy || !['DRAFT', 'SCHEDULED'].includes(row.status)}
          onClick={() => launchCampaign(row)}
        >
          <IconMail size={16} />
          Envoyer
        </StyledAction>
      ),
    },
  ];

  const tabs: Array<{ id: View; label: string }> = [
    { id: 'dashboard', label: 'Indicateurs' },
    { id: 'deductions', label: 'Retenues' },
    { id: 'payments', label: 'Virements' },
    { id: 'budgets', label: 'Budgets' },
    { id: 'timeclocks', label: 'Badgeuses' },
    { id: 'campaigns', label: 'Campagnes' },
  ];

  return (
    <ErpPageShell
      title="Pilotage RH"
      description="Paie avancée, banque, budgets, indicateurs et automatisations"
      state={loadState}
      onRetry={() => void load()}
      actions={
        <Button
          title="Actualiser"
          ariaLabel="Actualiser"
          Icon={IconRefresh}
          variant="secondary"
          disabled={busy}
          onClick={() => void load()}
        />
      }
    >
      <StyledToolbar>
        <StyledTabs>
          {tabs.map((tab) => (
            <StyledTab
              key={tab.id}
              active={view === tab.id}
              onClick={() => setView(tab.id)}
            >
              {tab.label}
            </StyledTab>
          ))}
        </StyledTabs>
        <StyledFilters>
          {view === 'payments' ? (
            <StyledInput
              aria-label="Période de paie"
              type="month"
              value={periodKey}
              onChange={(event) => setPeriodKey(event.target.value)}
            />
          ) : null}
          {view === 'budgets' ? (
            <StyledInput
              aria-label="Année budgétaire"
              type="number"
              value={year}
              onChange={(event) => setYear(Number(event.target.value))}
            />
          ) : null}
        </StyledFilters>
      </StyledToolbar>
      {message ? (
        <StyledMessage danger={danger}>{message}</StyledMessage>
      ) : null}

      {view === 'dashboard' && analytics ? (
        <StyledMetrics>
          <StyledMetric>
            <StyledMetricLabel>Effectif observé</StyledMetricLabel>
            <StyledMetricValue>
              {analytics.workforce.averageHeadcountApproximation}
            </StyledMetricValue>
          </StyledMetric>
          <StyledMetric>
            <StyledMetricLabel>Turnover</StyledMetricLabel>
            <StyledMetricValue>
              {percent(analytics.workforce.turnoverBasisPoints)}
            </StyledMetricValue>
          </StyledMetric>
          <StyledMetric>
            <StyledMetricLabel>Absentéisme</StyledMetricLabel>
            <StyledMetricValue>
              {percent(analytics.attendance.absenteeismBasisPoints)}
            </StyledMetricValue>
          </StyledMetric>
          <StyledMetric>
            <StyledMetricLabel>Retards</StyledMetricLabel>
            <StyledMetricValue>
              {Math.round(analytics.attendance.lateMinutes / 60)} h
            </StyledMetricValue>
          </StyledMetric>
          <StyledMetric>
            <StyledMetricLabel>Candidatures</StyledMetricLabel>
            <StyledMetricValue>
              {analytics.recruitment.applications}
            </StyledMetricValue>
          </StyledMetric>
          <StyledMetric>
            <StyledMetricLabel>Conversion recrutement</StyledMetricLabel>
            <StyledMetricValue>
              {percent(analytics.recruitment.conversionBasisPoints)}
            </StyledMetricValue>
          </StyledMetric>
          <StyledMetric>
            <StyledMetricLabel>Formation terminée</StyledMetricLabel>
            <StyledMetricValue>
              {percent(analytics.training.completionBasisPoints)}
            </StyledMetricValue>
          </StyledMetric>
          <StyledMetric>
            <StyledMetricLabel>Masse salariale</StyledMetricLabel>
            <StyledMetricValue>
              {money(analytics.payroll.employerCostCents)}
            </StyledMetricValue>
          </StyledMetric>
        </StyledMetrics>
      ) : null}

      {view === 'deductions' ? (
        <>
          <StyledForm onSubmit={saveDeduction}>
            <StyledField>
              Salarié
              <StyledSelect
                required
                value={deductionForm.employeeId}
                onChange={(event) =>
                  setDeductionForm((value) => ({
                    ...value,
                    employeeId: event.target.value,
                  }))
                }
              >
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employeeName(employee)}
                  </option>
                ))}
              </StyledSelect>
            </StyledField>
            <StyledField>
              Nature
              <StyledSelect
                value={deductionForm.type}
                onChange={(event) =>
                  setDeductionForm((value) => ({
                    ...value,
                    type: event.target.value,
                  }))
                }
              >
                <option value="LOAN">Prêt</option>
                <option value="ADVANCE">Avance</option>
                <option value="MUTUAL_INSURANCE">Mutuelle</option>
                <option value="SUPPLEMENTARY_RETIREMENT">
                  Retraite complémentaire
                </option>
                <option value="GARNISHMENT">Saisie</option>
                <option value="OTHER">Autre</option>
              </StyledSelect>
            </StyledField>
            <StyledField>
              Référence
              <StyledInput
                required
                value={deductionForm.reference}
                onChange={(event) =>
                  setDeductionForm((value) => ({
                    ...value,
                    reference: event.target.value,
                  }))
                }
              />
            </StyledField>
            <StyledField>
              Libellé
              <StyledInput
                required
                value={deductionForm.label}
                onChange={(event) =>
                  setDeductionForm((value) => ({
                    ...value,
                    label: event.target.value,
                  }))
                }
              />
            </StyledField>
            <StyledField>
              Principal MAD
              <StyledInput
                required
                min="0.01"
                step="0.01"
                type="number"
                value={deductionForm.principalMad}
                onChange={(event) =>
                  setDeductionForm((value) => ({
                    ...value,
                    principalMad: event.target.value,
                  }))
                }
              />
            </StyledField>
            <StyledField>
              Échéance MAD
              <StyledInput
                required
                min="0.01"
                step="0.01"
                type="number"
                value={deductionForm.installmentMad}
                onChange={(event) =>
                  setDeductionForm((value) => ({
                    ...value,
                    installmentMad: event.target.value,
                  }))
                }
              />
            </StyledField>
            <StyledField>
              Début
              <StyledInput
                required
                type="date"
                value={deductionForm.effectiveFrom}
                onChange={(event) =>
                  setDeductionForm((value) => ({
                    ...value,
                    effectiveFrom: event.target.value,
                  }))
                }
              />
            </StyledField>
            <Button
              type="submit"
              title="Ajouter"
              ariaLabel="Ajouter une retenue"
              Icon={IconPlus}
              variant="primary"
              disabled={busy}
            />
          </StyledForm>
          <ErpOperationalTable
            ariaLabel="Retenues de paie"
            columns={deductionColumns}
            rows={deductions}
            getRowKey={(row) => row.id}
          />
        </>
      ) : null}

      {view === 'payments' ? (
        <>
          <StyledPanelTitle>Paie avancée</StyledPanelTitle>
          <StyledForm onSubmit={generateAdvancedPayslip}>
            <StyledField>
              Salarié
              <StyledSelect
                required
                value={payrollForm.employeeId}
                onChange={(event) =>
                  setPayrollForm((value) => ({
                    ...value,
                    employeeId: event.target.value,
                  }))
                }
              >
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employeeName(employee)}
                  </option>
                ))}
              </StyledSelect>
            </StyledField>
            <StyledField>
              Cycle
              <StyledSelect
                value={payrollForm.runType}
                onChange={(event) =>
                  setPayrollForm((value) => ({
                    ...value,
                    runType: event.target.value,
                    correctionForPayslipId:
                      event.target.value === 'RETROACTIVE'
                        ? value.correctionForPayslipId
                        : '',
                  }))
                }
              >
                <option value="REGULAR">Paie régulière</option>
                <option value="OFF_CYCLE">Hors cycle</option>
                <option value="RETROACTIVE">Rétroactive</option>
              </StyledSelect>
            </StyledField>
            <StyledField>
              Séquence
              <StyledInput
                required
                min="1"
                max="99"
                type="number"
                value={payrollForm.runSequence}
                onChange={(event) =>
                  setPayrollForm((value) => ({
                    ...value,
                    runSequence: event.target.value,
                  }))
                }
              />
            </StyledField>
            {payrollForm.runType === 'RETROACTIVE' ? (
              <StyledField>
                Bulletin corrigé
                <StyledSelect
                  required
                  value={payrollForm.correctionForPayslipId}
                  onChange={(event) =>
                    setPayrollForm((value) => ({
                      ...value,
                      correctionForPayslipId: event.target.value,
                    }))
                  }
                >
                  <option value="">Sélectionner</option>
                  {payslips
                    .filter(
                      (payslip) =>
                        payslip.employeeId === payrollForm.employeeId &&
                        ['VALIDATED', 'PAID'].includes(payslip.status),
                    )
                    .map((payslip) => (
                      <option key={payslip.id} value={payslip.id}>
                        {payslip.periodKey} · {payslip.runType} ·{' '}
                        {money(payslip.netSalaryCents)}
                      </option>
                    ))}
                </StyledSelect>
              </StyledField>
            ) : (
              <StyledField>
                Salaire exceptionnel MAD
                <StyledInput
                  min="0"
                  step="0.01"
                  type="number"
                  value={payrollForm.baseSalaryMad}
                  onChange={(event) =>
                    setPayrollForm((value) => ({
                      ...value,
                      baseSalaryMad: event.target.value,
                    }))
                  }
                />
              </StyledField>
            )}
            <StyledField>
              Changement au
              <StyledInput
                min={`${periodKey}-01`}
                max={payrollPeriodBounds(periodKey).periodEnd}
                type="date"
                value={payrollForm.effectiveChangeDate}
                onChange={(event) =>
                  setPayrollForm((value) => ({
                    ...value,
                    effectiveChangeDate: event.target.value,
                  }))
                }
              />
            </StyledField>
            {payrollForm.effectiveChangeDate ? (
              <>
                <StyledField>
                  Salaire avant MAD
                  <StyledInput
                    required
                    min="0"
                    step="0.01"
                    type="number"
                    value={payrollForm.baseSalaryBeforeMad}
                    onChange={(event) =>
                      setPayrollForm((value) => ({
                        ...value,
                        baseSalaryBeforeMad: event.target.value,
                      }))
                    }
                  />
                </StyledField>
                <StyledField>
                  Salaire après MAD
                  <StyledInput
                    required
                    min="0"
                    step="0.01"
                    type="number"
                    value={payrollForm.baseSalaryAfterMad}
                    onChange={(event) =>
                      setPayrollForm((value) => ({
                        ...value,
                        baseSalaryAfterMad: event.target.value,
                      }))
                    }
                  />
                </StyledField>
              </>
            ) : null}
            <StyledField>
              Autres retenues MAD
              <StyledInput
                min="0"
                step="0.01"
                type="number"
                value={payrollForm.otherDeductionsMad}
                onChange={(event) =>
                  setPayrollForm((value) => ({
                    ...value,
                    otherDeductionsMad: event.target.value,
                  }))
                }
              />
            </StyledField>
            <Button
              type="submit"
              title="Générer"
              ariaLabel="Générer la paie avancée"
              Icon={IconPlus}
              variant="primary"
              disabled={busy || !payrollForm.employeeId}
            />
          </StyledForm>
          <StyledPanelTitle>Virements et exports</StyledPanelTitle>
          <StyledForm onSubmit={createBatch}>
            <StyledField>
              Compte débité (RIB)
              <StyledInput
                required
                maxLength={24}
                value={batchForm.debitAccountRib}
                onChange={(event) =>
                  setBatchForm((value) => ({
                    ...value,
                    debitAccountRib: event.target.value,
                  }))
                }
              />
            </StyledField>
            <StyledField>
              Date d’exécution
              <StyledInput
                required
                type="date"
                value={batchForm.executionDate}
                onChange={(event) =>
                  setBatchForm((value) => ({
                    ...value,
                    executionDate: event.target.value,
                  }))
                }
              />
            </StyledField>
            <Button
              type="submit"
              title="Créer le lot"
              ariaLabel="Créer le lot"
              Icon={IconPlus}
              variant="primary"
              disabled={busy}
            />
            <Button
              title="Exporter IR"
              ariaLabel="Exporter IR"
              Icon={IconDownload}
              variant="secondary"
              disabled={busy}
              onClick={() => void exportIr()}
            />
            <Button
              title="BDS XML"
              ariaLabel="Exporter DAMANCOM BDS XML"
              Icon={IconDownload}
              variant="secondary"
              disabled={busy}
              onClick={() => void exportCnssBds('xml')}
            />
            <Button
              title="BDS TXT"
              ariaLabel="Exporter DAMANCOM BDS TXT"
              Icon={IconDownload}
              variant="secondary"
              disabled={busy}
              onClick={() => void exportCnssBds('txt')}
            />
          </StyledForm>
          <ErpOperationalTable
            ariaLabel="Lots de virements"
            columns={batchColumns}
            rows={batches}
            getRowKey={(row) => row.id}
          />
          <StyledSplit>
            <ErpOperationalTable
              ariaLabel="Salaires à rapprocher"
              columns={bankLineColumns}
              rows={batchLines}
              getRowKey={(row) => row.id}
            />
            <StyledCandidatePanel>
              <StyledPanelTitle>Mouvements candidats</StyledPanelTitle>
              <ErpOperationalTable
                ariaLabel="Candidats bancaires"
                columns={candidateColumns}
                rows={candidates}
                getRowKey={(row) => row.id}
              />
            </StyledCandidatePanel>
          </StyledSplit>
        </>
      ) : null}

      {view === 'budgets' ? (
        <>
          <StyledForm onSubmit={createBudget}>
            <StyledField>
              Budget
              <StyledInput
                required
                value={budgetForm.name}
                onChange={(event) =>
                  setBudgetForm((value) => ({
                    ...value,
                    name: event.target.value,
                  }))
                }
              />
            </StyledField>
            <StyledField>
              Département
              <StyledInput
                required
                value={budgetForm.department}
                onChange={(event) =>
                  setBudgetForm((value) => ({
                    ...value,
                    department: event.target.value,
                  }))
                }
              />
            </StyledField>
            <StyledField>
              Mois
              <StyledInput
                required
                min="1"
                max="12"
                type="number"
                value={budgetForm.month}
                onChange={(event) =>
                  setBudgetForm((value) => ({
                    ...value,
                    month: event.target.value,
                  }))
                }
              />
            </StyledField>
            <StyledField>
              Effectif
              <StyledInput
                required
                min="0"
                type="number"
                value={budgetForm.headcount}
                onChange={(event) =>
                  setBudgetForm((value) => ({
                    ...value,
                    headcount: event.target.value,
                  }))
                }
              />
            </StyledField>
            <StyledField>
              Brut MAD
              <StyledInput
                required
                min="0"
                step="0.01"
                type="number"
                value={budgetForm.grossMad}
                onChange={(event) =>
                  setBudgetForm((value) => ({
                    ...value,
                    grossMad: event.target.value,
                  }))
                }
              />
            </StyledField>
            <StyledField>
              Coût employeur MAD
              <StyledInput
                required
                min="0"
                step="0.01"
                type="number"
                value={budgetForm.employerCostMad}
                onChange={(event) =>
                  setBudgetForm((value) => ({
                    ...value,
                    employerCostMad: event.target.value,
                  }))
                }
              />
            </StyledField>
            <StyledField>
              Recrutements
              <StyledInput
                required
                min="0"
                type="number"
                value={budgetForm.recruitments}
                onChange={(event) =>
                  setBudgetForm((value) => ({
                    ...value,
                    recruitments: event.target.value,
                  }))
                }
              />
            </StyledField>
            <Button
              type="submit"
              title="Créer"
              ariaLabel="Créer le budget"
              Icon={IconPlus}
              variant="primary"
              disabled={busy}
            />
          </StyledForm>
          <ErpOperationalTable
            ariaLabel="Budgets RH"
            columns={budgetColumns}
            rows={budgets}
            getRowKey={(row) => row.id}
          />
        </>
      ) : null}

      {view === 'timeclocks' ? (
        <>
          <StyledForm onSubmit={createConnector}>
            <StyledField>
              Nom
              <StyledInput
                required
                value={connectorForm.name}
                onChange={(event) =>
                  setConnectorForm((value) => ({
                    ...value,
                    name: event.target.value,
                  }))
                }
              />
            </StyledField>
            <StyledField>
              Type
              <StyledSelect
                value={connectorForm.type}
                onChange={(event) =>
                  setConnectorForm((value) => ({
                    ...value,
                    type: event.target.value,
                  }))
                }
              >
                <option value="CSV_WEBHOOK">Webhook / lot</option>
                <option value="REST_API">API REST</option>
              </StyledSelect>
            </StyledField>
            <StyledField>
              Système
              <StyledInput
                required
                value={connectorForm.externalSystem}
                onChange={(event) =>
                  setConnectorForm((value) => ({
                    ...value,
                    externalSystem: event.target.value,
                  }))
                }
              />
            </StyledField>
            <StyledField>
              Endpoint
              <StyledInput
                value={connectorForm.endpointUrl}
                onChange={(event) =>
                  setConnectorForm((value) => ({
                    ...value,
                    endpointUrl: event.target.value,
                  }))
                }
              />
            </StyledField>
            <Button
              type="submit"
              title="Ajouter"
              ariaLabel="Ajouter le connecteur"
              Icon={IconPlus}
              variant="primary"
              disabled={busy}
            />
            <StyledWideField>
              Lot de pointages
              <StyledTextarea
                value={syncPayload}
                onChange={(event) => setSyncPayload(event.target.value)}
              />
            </StyledWideField>
          </StyledForm>
          <ErpOperationalTable
            ariaLabel="Connecteurs de badgeuse"
            columns={connectorColumns}
            rows={connectors}
            getRowKey={(row) => row.id}
          />
        </>
      ) : null}

      {view === 'campaigns' ? (
        <>
          <StyledForm onSubmit={createCampaign}>
            <StyledField>
              Campagne
              <StyledInput
                required
                value={campaignForm.name}
                onChange={(event) =>
                  setCampaignForm((value) => ({
                    ...value,
                    name: event.target.value,
                  }))
                }
              />
            </StyledField>
            <StyledField>
              Objet
              <StyledInput
                required
                value={campaignForm.subject}
                onChange={(event) =>
                  setCampaignForm((value) => ({
                    ...value,
                    subject: event.target.value,
                  }))
                }
              />
            </StyledField>
            <StyledField>
              Audience
              <StyledSelect
                value={campaignForm.audience}
                onChange={(event) =>
                  setCampaignForm((value) => ({
                    ...value,
                    audience: event.target.value,
                  }))
                }
              >
                <option value="ACTIVE_EMPLOYEES">Salariés actifs</option>
                <option value="ALL">Tous les salariés</option>
                <option value="DEPARTMENT">Département</option>
              </StyledSelect>
            </StyledField>
            {campaignForm.audience === 'DEPARTMENT' ? (
              <StyledField>
                Département
                <StyledInput
                  required
                  value={campaignForm.department}
                  onChange={(event) =>
                    setCampaignForm((value) => ({
                      ...value,
                      department: event.target.value,
                    }))
                  }
                />
              </StyledField>
            ) : null}
            <StyledWideField>
              Message
              <StyledTextarea
                required
                value={campaignForm.message}
                onChange={(event) =>
                  setCampaignForm((value) => ({
                    ...value,
                    message: event.target.value,
                  }))
                }
              />
            </StyledWideField>
            <Button
              type="submit"
              title="Créer"
              ariaLabel="Créer la campagne"
              Icon={IconPlus}
              variant="primary"
              disabled={busy}
            />
            <Button
              title="Alertes 30 jours"
              ariaLabel="Lancer les alertes RH"
              Icon={IconBell}
              variant="secondary"
              disabled={busy}
              onClick={runAlerts}
            />
          </StyledForm>
          <ErpOperationalTable
            ariaLabel="Campagnes RH"
            columns={campaignColumns}
            rows={campaigns}
            getRowKey={(row) => row.id}
          />
        </>
      ) : null}
    </ErpPageShell>
  );
};
