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
import { styled } from '@linaria/react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  attendanceAssignmentSchema,
  attendancePeriodListSchema,
  attendancePeriodSchema,
  attendancePolicyListSchema,
  attendancePolicySchema,
  attendanceRecordListSchema,
  attendanceRecordSchema,
  erpEmployeeListSchema,
  erpPayslipListSchema,
  erpPayslipSchema,
  type AttendancePeriod,
  type AttendancePolicy,
  type AttendanceRecord,
  type ErpEmployee,
  type ErpPayslip,
} from 'twenty-shared/erp-maroc';
import {
  IconCheck,
  IconClock,
  IconPlus,
  IconRefresh,
  IconSend,
  IconX,
} from 'twenty-ui/display';
import { Button } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';

type View = 'records' | 'periods' | 'payroll' | 'policies';
type LoadState = 'loading' | 'ready' | 'error';

const nowPeriodKey = () => new Date().toISOString().slice(0, 7);

const monthBounds = (periodKey: string) => {
  const [year, month] = periodKey.split('-').map(Number);
  return {
    start: `${periodKey}-01`,
    end: new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10),
  };
};

const minutesToClock = (minutes: number | null) => {
  if (minutes === null) return '—';
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
};

const clockToMinutes = (value: string) => {
  if (!value) return null;
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
};

const formatDuration = (minutes: number) =>
  `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, '0')}`;

const formatMoney = (cents: number) =>
  new Intl.NumberFormat('fr-MA', {
    style: 'currency',
    currency: 'MAD',
  }).format(cents / 100);

const employeeName = (employee?: ErpEmployee) =>
  employee ? `${employee.firstName} ${employee.lastName}` : '—';

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

const StyledControl = styled.input`
  background: ${themeCssVariables.background.primary};
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.sm};
  box-sizing: border-box;
  color: ${themeCssVariables.font.color.primary};
  font: inherit;
  font-size: ${themeCssVariables.font.size.sm};
  height: 30px;
  min-width: 120px;
  padding: 0 ${themeCssVariables.spacing[2]};
`;

const StyledSelect = styled.select`
  background: ${themeCssVariables.background.primary};
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.sm};
  color: ${themeCssVariables.font.color.primary};
  font: inherit;
  font-size: ${themeCssVariables.font.size.sm};
  height: 30px;
  min-width: 160px;
  padding: 0 ${themeCssVariables.spacing[2]};
`;

const StyledForm = styled.form`
  align-items: end;
  background: ${themeCssVariables.background.secondary};
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: grid;
  flex: 0 0 auto;
  gap: ${themeCssVariables.spacing[2]};
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
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

const StyledMetrics = styled.div`
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
  font-size: ${themeCssVariables.font.size.lg};
  letter-spacing: 0;
`;

const StyledRowActions = styled.div`
  align-items: center;
  display: flex;
  gap: ${themeCssVariables.spacing[1]};
  justify-content: flex-end;
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

const StyledNotice = styled.div<{ danger: boolean }>`
  background: ${({ danger }) =>
    danger
      ? themeCssVariables.tag.background.red
      : themeCssVariables.tag.background.green};
  color: ${({ danger }) =>
    danger ? themeCssVariables.tag.text.red : themeCssVariables.tag.text.green};
  font-size: ${themeCssVariables.font.size.sm};
  padding: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[3]};
`;

const statusBadge = (status: string) => {
  const values: Record<string, { label: string; tone: ErpStatusTone }> = {
    DRAFT: { label: 'Brouillon', tone: 'neutral' },
    SUBMITTED: { label: 'À valider', tone: 'warning' },
    APPROVED: { label: 'Approuvé', tone: 'success' },
    REJECTED: { label: 'Rejeté', tone: 'danger' },
    OPEN: { label: 'Ouverte', tone: 'info' },
    LOCKED: { label: 'Verrouillée', tone: 'neutral' },
    VALIDATED: { label: 'Validé', tone: 'success' },
    PAID: { label: 'Payé', tone: 'success' },
    CANCELLED: { label: 'Annulé', tone: 'danger' },
  };
  const value = values[status] ?? { label: status, tone: 'neutral' as const };
  return <ErpStatusBadge label={value.label} tone={value.tone} />;
};

export const ErpTimeAttendancePage = () => {
  const { client } = useErpMarocContext();
  const [view, setView] = useState<View>('records');
  const [periodKey, setPeriodKey] = useState(nowPeriodKey);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [busy, setBusy] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageDanger, setMessageDanger] = useState(false);
  const [employees, setEmployees] = useState<ErpEmployee[]>([]);
  const [policies, setPolicies] = useState<AttendancePolicy[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [periods, setPeriods] = useState<AttendancePeriod[]>([]);
  const [payslips, setPayslips] = useState<ErpPayslip[]>([]);

  const [recordForm, setRecordForm] = useState({
    employeeId: '',
    attendanceDate: new Date().toISOString().slice(0, 10),
    dayType: '',
    clockIn: '09:00',
    clockOut: '18:00',
    breakMinutes: '60',
    overtimeBand: '25',
  });
  const [policyForm, setPolicyForm] = useState({
    code: 'STD',
    name: 'Horaire standard',
    start: '09:00',
    dailyMinutes: '480',
    monthlyMinutes: '11460',
    tolerance: '10',
  });
  const [assignmentForm, setAssignmentForm] = useState({
    employeeId: '',
    policyId: '',
    effectiveFrom: `${periodKey}-01`,
  });

  const bounds = useMemo(() => monthBounds(periodKey), [periodKey]);

  const load = useCallback(async () => {
    setLoadState('loading');
    try {
      const [
        nextEmployees,
        nextPolicies,
        nextRecords,
        nextPeriods,
        nextPayslips,
      ] = await Promise.all([
        client.request({
          method: 'GET',
          path: '/payroll/employees',
          schema: erpEmployeeListSchema,
        }),
        client.request({
          method: 'GET',
          path: '/attendance/policies',
          schema: attendancePolicyListSchema,
        }),
        client.request({
          method: 'GET',
          path: '/attendance/records',
          query: { from: bounds.start, to: bounds.end },
          schema: attendanceRecordListSchema,
        }),
        client.request({
          method: 'GET',
          path: '/attendance/periods',
          query: { periodKey },
          schema: attendancePeriodListSchema,
        }),
        client.request({
          method: 'GET',
          path: '/payroll/payslips',
          query: { periodKey },
          schema: erpPayslipListSchema,
        }),
      ]);
      setEmployees(nextEmployees);
      setPolicies(nextPolicies);
      setRecords(nextRecords);
      setPeriods(nextPeriods);
      setPayslips(nextPayslips);
      setSelectedEmployeeId((current) => current || nextEmployees[0]?.id || '');
      setRecordForm((current) => ({
        ...current,
        employeeId: current.employeeId || nextEmployees[0]?.id || '',
      }));
      setAssignmentForm((current) => ({
        ...current,
        employeeId: current.employeeId || nextEmployees[0]?.id || '',
        policyId: current.policyId || nextPolicies[0]?.id || '',
      }));
      setLoadState('ready');
    } catch {
      setLoadState('error');
    }
  }, [bounds.end, bounds.start, client, periodKey]);

  useEffect(() => {
    void load();
  }, [load]);

  const mutate = async <T,>(operation: () => Promise<T>, success: string) => {
    setBusy(true);
    setMessage(null);
    try {
      await operation();
      setMessageDanger(false);
      setMessage(success);
      await load();
    } catch {
      setMessageDanger(true);
      setMessage(
        "L'opération n'a pas abouti. Vérifiez les données et l'état de validation.",
      );
    } finally {
      setBusy(false);
    }
  };

  const execute = (
    request: Parameters<typeof client.createMutationIntent>[0],
  ) =>
    client.createMutationIntent(request, { idempotency: 'required' }).execute();

  const saveRecord = (event: React.FormEvent) => {
    event.preventDefault();
    void mutate(
      () =>
        execute({
          method: 'POST',
          path: '/attendance/records',
          schema: attendanceRecordSchema,
          body: {
            employeeId: recordForm.employeeId,
            attendanceDate: recordForm.attendanceDate,
            ...(recordForm.dayType ? { dayType: recordForm.dayType } : {}),
            clockInMinutes: clockToMinutes(recordForm.clockIn),
            clockOutMinutes: clockToMinutes(recordForm.clockOut),
            breakMinutes: Number(recordForm.breakMinutes),
            overtimeBand: recordForm.overtimeBand,
            source: 'MANUAL',
          },
        }),
      'Pointage enregistré.',
    );
  };

  const savePolicy = (event: React.FormEvent) => {
    event.preventDefault();
    void mutate(
      () =>
        execute({
          method: 'POST',
          path: '/attendance/policies',
          schema: attendancePolicySchema,
          body: {
            code: policyForm.code,
            name: policyForm.name,
            scheduledStartMinutes: clockToMinutes(policyForm.start),
            dailyMinutes: Number(policyForm.dailyMinutes),
            monthlyMinutes: Number(policyForm.monthlyMinutes),
            lateToleranceMinutes: Number(policyForm.tolerance),
          },
        }),
      'Politique horaire créée.',
    );
  };

  const saveAssignment = (event: React.FormEvent) => {
    event.preventDefault();
    void mutate(
      () =>
        execute({
          method: 'POST',
          path: '/attendance/assignments',
          schema: attendanceAssignmentSchema,
          body: assignmentForm,
        }),
      'Politique affectée au salarié.',
    );
  };

  const recordAction = (
    record: AttendanceRecord,
    action: 'submit' | 'approve' | 'reject',
  ) => {
    const request =
      action === 'submit'
        ? {
            method: 'POST' as const,
            path: `/attendance/records/${record.id}/submit`,
            schema: attendanceRecordSchema,
          }
        : {
            method: 'POST' as const,
            path: `/attendance/records/${record.id}/decision`,
            schema: attendanceRecordSchema,
            body: {
              decision: action === 'approve' ? 'APPROVED' : 'REJECTED',
              ...(action === 'reject'
                ? { reason: 'À corriger par le salarié' }
                : {}),
            },
          };
    void mutate(
      () => execute(request),
      action === 'approve'
        ? 'Pointage approuvé.'
        : action === 'reject'
          ? 'Pointage rejeté.'
          : 'Pointage soumis.',
    );
  };

  const recompute = () => {
    if (!selectedEmployeeId) return;
    void mutate(
      () =>
        execute({
          method: 'POST',
          path: '/attendance/periods/recompute',
          schema: attendancePeriodSchema,
          body: { employeeId: selectedEmployeeId, periodKey },
        }),
      'Période recalculée.',
    );
  };

  const approvePeriod = (period: AttendancePeriod) =>
    void mutate(
      () =>
        execute({
          method: 'POST',
          path: `/attendance/periods/${period.id}/approve`,
          schema: attendancePeriodSchema,
        }),
      'Période approuvée pour la paie.',
    );

  const generatePayslip = () => {
    if (!selectedEmployeeId) return;
    const selectedPeriod = periods.find(
      (period) =>
        period.employeeId === selectedEmployeeId &&
        ['APPROVED', 'LOCKED'].includes(period.status),
    );
    void mutate(
      () =>
        execute({
          method: 'POST',
          path: '/payroll/payslips/generate',
          schema: erpPayslipSchema,
          body: {
            employeeId: selectedEmployeeId,
            periodKey,
            periodStart: bounds.start,
            periodEnd: bounds.end,
            ...(selectedPeriod
              ? { attendancePeriodId: selectedPeriod.id }
              : {}),
          },
        }),
      'Bulletin généré.',
    );
  };

  const payslipAction = (payslip: ErpPayslip, action: 'validate' | 'pay') =>
    void mutate(
      () =>
        execute({
          method: 'POST',
          path: `/payroll/payslips/${payslip.id}/${action}`,
          schema: erpPayslipSchema,
        }),
      action === 'validate'
        ? 'Bulletin validé et période verrouillée.'
        : 'Bulletin marqué payé.',
    );

  const metrics = useMemo(
    () => ({
      pending: records.filter((record) => record.status === 'SUBMITTED').length,
      anomalies: records.filter((record) => record.anomalyCodes.length > 0)
        .length,
      approvedPeriods: periods.filter((period) =>
        ['APPROVED', 'LOCKED'].includes(period.status),
      ).length,
      payrollTotal: payslips.reduce(
        (total, payslip) => total + payslip.netSalaryCents,
        0,
      ),
    }),
    [payslips, periods, records],
  );

  const recordColumns: ErpOperationalTableColumn<AttendanceRecord>[] = [
    {
      key: 'date',
      header: 'Date',
      width: '110px',
      render: (row) => row.attendanceDate,
    },
    {
      key: 'employee',
      header: 'Salarié',
      width: '190px',
      render: (row) => employeeName(row.employee),
    },
    {
      key: 'clock',
      header: 'Entrée / sortie',
      width: '150px',
      render: (row) =>
        `${minutesToClock(row.clockInMinutes)} · ${minutesToClock(row.clockOutMinutes)}`,
    },
    {
      key: 'worked',
      header: 'Travaillé',
      width: '100px',
      align: 'right',
      render: (row) => formatDuration(row.workedMinutes),
    },
    {
      key: 'variance',
      header: 'Retard / absence',
      width: '140px',
      align: 'right',
      render: (row) => `${row.lateMinutes} / ${row.absenceMinutes} min`,
    },
    {
      key: 'status',
      header: 'Statut',
      width: '110px',
      render: (row) => statusBadge(row.status),
    },
    {
      key: 'actions',
      header: '',
      width: '230px',
      align: 'right',
      render: (row) => (
        <StyledRowActions>
          <StyledAction
            disabled={busy || !['DRAFT', 'REJECTED'].includes(row.status)}
            onClick={() => recordAction(row, 'submit')}
            title="Soumettre"
          >
            <IconSend size={16} />
            Soumettre
          </StyledAction>
          <StyledAction
            disabled={busy || row.status !== 'SUBMITTED'}
            onClick={() => recordAction(row, 'approve')}
            title="Approuver"
          >
            <IconCheck size={16} />
          </StyledAction>
          <StyledAction
            disabled={busy || row.status !== 'SUBMITTED'}
            onClick={() => recordAction(row, 'reject')}
            title="Rejeter"
          >
            <IconX size={16} />
          </StyledAction>
        </StyledRowActions>
      ),
    },
  ];

  const periodColumns: ErpOperationalTableColumn<AttendancePeriod>[] = [
    {
      key: 'employee',
      header: 'Salarié',
      width: '200px',
      render: (row) => employeeName(row.employee),
    },
    {
      key: 'worked',
      header: 'Travaillé',
      width: '110px',
      align: 'right',
      render: (row) => formatDuration(row.workedMinutes),
    },
    {
      key: 'overtime',
      header: 'Heures sup.',
      width: '120px',
      align: 'right',
      render: (row) =>
        formatDuration(
          row.overtime25Minutes +
            row.overtime50Minutes +
            row.overtime100Minutes,
        ),
    },
    {
      key: 'variables',
      header: 'Variable nette',
      width: '150px',
      align: 'right',
      render: (row) =>
        formatMoney(
          row.overtime25PayCents +
            row.overtime50PayCents +
            row.overtime100PayCents -
            row.absenceDeductionCents -
            row.lateDeductionCents,
        ),
    },
    {
      key: 'unresolved',
      header: 'À traiter',
      width: '90px',
      align: 'right',
      render: (row) => row.unresolvedCount,
    },
    {
      key: 'status',
      header: 'Statut',
      width: '110px',
      render: (row) => statusBadge(row.status),
    },
    {
      key: 'actions',
      header: '',
      width: '130px',
      align: 'right',
      render: (row) => (
        <StyledAction
          disabled={busy || row.status !== 'OPEN' || row.unresolvedCount > 0}
          onClick={() => approvePeriod(row)}
        >
          <IconCheck size={16} />
          Approuver
        </StyledAction>
      ),
    },
  ];

  const payslipColumns: ErpOperationalTableColumn<ErpPayslip>[] = [
    {
      key: 'employee',
      header: 'Salarié',
      width: '210px',
      render: (row) => employeeName(row.employee),
    },
    {
      key: 'gross',
      header: 'Brut',
      width: '120px',
      align: 'right',
      render: (row) => formatMoney(row.grossSalaryCents),
    },
    {
      key: 'net',
      header: 'Net à payer',
      width: '130px',
      align: 'right',
      render: (row) => formatMoney(row.netSalaryCents),
    },
    {
      key: 'cost',
      header: 'Coût employeur',
      width: '140px',
      align: 'right',
      render: (row) => formatMoney(row.employerCostCents),
    },
    {
      key: 'status',
      header: 'Statut',
      width: '110px',
      render: (row) => statusBadge(row.status),
    },
    {
      key: 'actions',
      header: '',
      width: '220px',
      align: 'right',
      render: (row) => (
        <StyledRowActions>
          <StyledAction
            disabled={busy || row.status !== 'DRAFT'}
            onClick={() => payslipAction(row, 'validate')}
          >
            <IconCheck size={16} />
            Valider
          </StyledAction>
          <StyledAction
            disabled={busy || row.status !== 'VALIDATED'}
            onClick={() => payslipAction(row, 'pay')}
          >
            Payer
          </StyledAction>
        </StyledRowActions>
      ),
    },
  ];

  const policyColumns: ErpOperationalTableColumn<AttendancePolicy>[] = [
    { key: 'code', header: 'Code', width: '90px', render: (row) => row.code },
    {
      key: 'name',
      header: 'Politique',
      width: '220px',
      render: (row) => row.name,
    },
    {
      key: 'hours',
      header: 'Horaire',
      width: '170px',
      render: (row) =>
        `${minutesToClock(row.scheduledStartMinutes)} · ${formatDuration(row.dailyMinutes)}`,
    },
    {
      key: 'monthly',
      header: 'Base mensuelle',
      width: '130px',
      align: 'right',
      render: (row) => formatDuration(row.monthlyMinutes),
    },
    {
      key: 'rates',
      header: 'HS 25 / 50 / 100',
      width: '160px',
      align: 'right',
      render: (row) =>
        `${row.overtime25RateBasisPoints / 100}% · ${row.overtime50RateBasisPoints / 100}% · ${row.overtime100RateBasisPoints / 100}%`,
    },
    {
      key: 'active',
      header: 'Statut',
      width: '100px',
      render: (row) => (
        <ErpStatusBadge
          label={row.isActive ? 'Active' : 'Inactive'}
          tone={row.isActive ? 'success' : 'neutral'}
        />
      ),
    },
  ];

  const actions = (
    <>
      {view === 'records' || view === 'policies' ? (
        <Button
          title={view === 'records' ? 'Nouveau pointage' : 'Nouvelle politique'}
          ariaLabel={
            view === 'records' ? 'Nouveau pointage' : 'Nouvelle politique'
          }
          Icon={IconPlus}
          variant="secondary"
          disabled={busy}
          onClick={() => setShowForm((value) => !value)}
        />
      ) : null}
      <Button
        title="Actualiser"
        ariaLabel="Actualiser"
        Icon={IconRefresh}
        variant="secondary"
        disabled={busy}
        onClick={() => void load()}
      />
    </>
  );

  return (
    <ErpPageShell
      title="Temps & paie"
      description="Pointages, validation mensuelle et bulletins"
      actions={actions}
      state={loadState}
      onRetry={() => void load()}
    >
      <StyledToolbar>
        <StyledTabs>
          {(['records', 'periods', 'payroll', 'policies'] as View[]).map(
            (item) => (
              <StyledTab
                key={item}
                active={view === item}
                onClick={() => {
                  setView(item);
                  setShowForm(false);
                }}
              >
                {
                  {
                    records: 'Pointages',
                    periods: 'Périodes',
                    payroll: 'Paie',
                    policies: 'Politiques',
                  }[item]
                }
              </StyledTab>
            ),
          )}
        </StyledTabs>
        <StyledFilters>
          <StyledControl
            aria-label="Mois de paie"
            type="month"
            value={periodKey}
            onChange={(event) => setPeriodKey(event.target.value)}
          />
          {(view === 'periods' || view === 'payroll') && (
            <StyledSelect
              aria-label="Salarié"
              value={selectedEmployeeId}
              onChange={(event) => setSelectedEmployeeId(event.target.value)}
            >
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employeeName(employee)}
                </option>
              ))}
            </StyledSelect>
          )}
          {view === 'periods' ? (
            <Button
              title="Recalculer"
              ariaLabel="Recalculer la période"
              Icon={IconRefresh}
              variant="secondary"
              disabled={busy || !selectedEmployeeId}
              onClick={recompute}
            />
          ) : null}
          {view === 'payroll' ? (
            <Button
              title="Générer"
              ariaLabel="Générer le bulletin"
              Icon={IconPlus}
              variant="primary"
              disabled={busy || !selectedEmployeeId}
              onClick={generatePayslip}
            />
          ) : null}
        </StyledFilters>
      </StyledToolbar>
      {message ? (
        <StyledNotice danger={messageDanger}>{message}</StyledNotice>
      ) : null}
      <StyledMetrics>
        <StyledMetric>
          <StyledMetricLabel>Pointages à valider</StyledMetricLabel>
          <StyledMetricValue>{metrics.pending}</StyledMetricValue>
        </StyledMetric>
        <StyledMetric>
          <StyledMetricLabel>Anomalies du mois</StyledMetricLabel>
          <StyledMetricValue>{metrics.anomalies}</StyledMetricValue>
        </StyledMetric>
        <StyledMetric>
          <StyledMetricLabel>Périodes prêtes</StyledMetricLabel>
          <StyledMetricValue>{metrics.approvedPeriods}</StyledMetricValue>
        </StyledMetric>
        <StyledMetric>
          <StyledMetricLabel>Net paie du mois</StyledMetricLabel>
          <StyledMetricValue>
            {formatMoney(metrics.payrollTotal)}
          </StyledMetricValue>
        </StyledMetric>
      </StyledMetrics>
      {view === 'records' && showForm ? (
        <StyledForm onSubmit={saveRecord}>
          <StyledField>
            Salarié
            <StyledSelect
              value={recordForm.employeeId}
              onChange={(event) =>
                setRecordForm({ ...recordForm, employeeId: event.target.value })
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
            Date
            <StyledControl
              type="date"
              value={recordForm.attendanceDate}
              onChange={(event) =>
                setRecordForm({
                  ...recordForm,
                  attendanceDate: event.target.value,
                })
              }
            />
          </StyledField>
          <StyledField>
            Type
            <StyledSelect
              value={recordForm.dayType}
              onChange={(event) =>
                setRecordForm({ ...recordForm, dayType: event.target.value })
              }
            >
              <option value="WORKDAY">Jour travaillé</option>
              <option value="">Selon planning / congé</option>
              <option value="WEEKEND">Week-end</option>
              <option value="PUBLIC_HOLIDAY">Jour férié</option>
              <option value="PAID_LEAVE">Congé payé</option>
              <option value="UNPAID_LEAVE">Congé sans solde</option>
            </StyledSelect>
          </StyledField>
          <StyledField>
            Entrée
            <StyledControl
              type="time"
              value={recordForm.clockIn}
              onChange={(event) =>
                setRecordForm({ ...recordForm, clockIn: event.target.value })
              }
            />
          </StyledField>
          <StyledField>
            Sortie
            <StyledControl
              type="time"
              value={recordForm.clockOut}
              onChange={(event) =>
                setRecordForm({ ...recordForm, clockOut: event.target.value })
              }
            />
          </StyledField>
          <StyledField>
            Pause (min)
            <StyledControl
              type="number"
              min="0"
              value={recordForm.breakMinutes}
              onChange={(event) =>
                setRecordForm({
                  ...recordForm,
                  breakMinutes: event.target.value,
                })
              }
            />
          </StyledField>
          <Button
            title="Enregistrer"
            ariaLabel="Enregistrer le pointage"
            Icon={IconClock}
            variant="primary"
            disabled={busy || !recordForm.employeeId}
            type="submit"
          />
        </StyledForm>
      ) : null}
      {view === 'policies' && showForm ? (
        <>
          <StyledForm onSubmit={savePolicy}>
            <StyledField>
              Code
              <StyledControl
                value={policyForm.code}
                onChange={(event) =>
                  setPolicyForm({ ...policyForm, code: event.target.value })
                }
              />
            </StyledField>
            <StyledField>
              Nom
              <StyledControl
                value={policyForm.name}
                onChange={(event) =>
                  setPolicyForm({ ...policyForm, name: event.target.value })
                }
              />
            </StyledField>
            <StyledField>
              Début
              <StyledControl
                type="time"
                value={policyForm.start}
                onChange={(event) =>
                  setPolicyForm({ ...policyForm, start: event.target.value })
                }
              />
            </StyledField>
            <StyledField>
              Minutes / jour
              <StyledControl
                type="number"
                value={policyForm.dailyMinutes}
                onChange={(event) =>
                  setPolicyForm({
                    ...policyForm,
                    dailyMinutes: event.target.value,
                  })
                }
              />
            </StyledField>
            <StyledField>
              Minutes / mois
              <StyledControl
                type="number"
                value={policyForm.monthlyMinutes}
                onChange={(event) =>
                  setPolicyForm({
                    ...policyForm,
                    monthlyMinutes: event.target.value,
                  })
                }
              />
            </StyledField>
            <StyledField>
              Tolérance retard
              <StyledControl
                type="number"
                value={policyForm.tolerance}
                onChange={(event) =>
                  setPolicyForm({
                    ...policyForm,
                    tolerance: event.target.value,
                  })
                }
              />
            </StyledField>
            <Button
              title="Créer"
              ariaLabel="Créer la politique"
              Icon={IconPlus}
              variant="primary"
              disabled={busy}
              type="submit"
            />
          </StyledForm>
          <StyledForm onSubmit={saveAssignment}>
            <StyledField>
              Salarié
              <StyledSelect
                value={assignmentForm.employeeId}
                onChange={(event) =>
                  setAssignmentForm({
                    ...assignmentForm,
                    employeeId: event.target.value,
                  })
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
              Politique
              <StyledSelect
                value={assignmentForm.policyId}
                onChange={(event) =>
                  setAssignmentForm({
                    ...assignmentForm,
                    policyId: event.target.value,
                  })
                }
              >
                {policies.map((policy) => (
                  <option key={policy.id} value={policy.id}>
                    {policy.name}
                  </option>
                ))}
              </StyledSelect>
            </StyledField>
            <StyledField>
              À partir du
              <StyledControl
                type="date"
                value={assignmentForm.effectiveFrom}
                onChange={(event) =>
                  setAssignmentForm({
                    ...assignmentForm,
                    effectiveFrom: event.target.value,
                  })
                }
              />
            </StyledField>
            <Button
              title="Affecter"
              ariaLabel="Affecter la politique"
              Icon={IconCheck}
              variant="secondary"
              disabled={
                busy || !assignmentForm.employeeId || !assignmentForm.policyId
              }
              type="submit"
            />
          </StyledForm>
        </>
      ) : null}
      {view === 'records' ? (
        <ErpOperationalTable
          ariaLabel="Pointages"
          columns={recordColumns}
          rows={records}
          getRowKey={(row) => row.id}
          emptyLabel="Aucun pointage sur ce mois"
        />
      ) : null}
      {view === 'periods' ? (
        <ErpOperationalTable
          ariaLabel="Périodes de présence"
          columns={periodColumns}
          rows={periods}
          getRowKey={(row) => row.id}
          emptyLabel="Recalculez une période salarié"
        />
      ) : null}
      {view === 'payroll' ? (
        <ErpOperationalTable
          ariaLabel="Bulletins de paie"
          columns={payslipColumns}
          rows={payslips}
          getRowKey={(row) => row.id}
          emptyLabel="Aucun bulletin sur ce mois"
        />
      ) : null}
      {view === 'policies' ? (
        <ErpOperationalTable
          ariaLabel="Politiques horaires"
          columns={policyColumns}
          rows={policies}
          getRowKey={(row) => row.id}
          emptyLabel="Créez la première politique horaire"
        />
      ) : null}
    </ErpPageShell>
  );
};
