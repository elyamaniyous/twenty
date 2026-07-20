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
  erpCnssExportSchema,
  erpEmployeeListSchema,
  erpEmployeeSchema,
  erpEmployeeTerminationResultSchema,
  erpLeaveRequestListSchema,
  erpLeaveRequestSchema,
  erpPayslipListSchema,
  erpPayslipSchema,
  type ErpEmployee,
  type ErpLeaveRequest,
  type ErpPayslip,
} from 'twenty-shared/erp-maroc';
import { IconCheck, IconDownload, IconRefresh } from 'twenty-ui/display';
import { Button, TabButton } from 'twenty-ui/input';

type View = 'employees' | 'payslips' | 'leaves';

const currentPeriod = () =>
  new Date().toLocaleDateString('en-CA', {
    timeZone: 'Africa/Casablanca',
    year: 'numeric',
    month: '2-digit',
  });

const today = () =>
  new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Casablanca' });

const periodBounds = (periodKey: string) => {
  const [year, month] = periodKey.split('-').map(Number);
  return {
    start: `${periodKey}-01`,
    end: new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10),
  };
};

export const ErpPayrollPage = () => {
  const { client, context } = useErpMarocContext();
  const { enqueueErrorSnackBar, enqueueSuccessSnackBar } = useSnackBar();
  const [view, setView] = useState<View>('employees');
  const [employees, setEmployees] = useState<ErpEmployee[]>([]);
  const [payslips, setPayslips] = useState<ErpPayslip[]>([]);
  const [leaves, setLeaves] = useState<ErpLeaveRequest[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [generation, setGeneration] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [periodKey, setPeriodKey] = useState(currentPeriod);
  const [employeeId, setEmployeeId] = useState('');
  const [terminationDate, setTerminationDate] = useState(today);

  const [employeeNumber, setEmployeeNumber] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [contractType, setContractType] =
    useState<ErpEmployee['contractType']>('CDI');
  const [hireDate, setHireDate] = useState(today);
  const [baseSalaryMad, setBaseSalaryMad] = useState('');
  const [cin, setCin] = useState('');
  const [cnssNumber, setCnssNumber] = useState('');

  const [allowancesMad, setAllowancesMad] = useState('0');
  const [leaveType, setLeaveType] = useState<ErpLeaveRequest['type']>('ANNUAL');
  const [leaveStart, setLeaveStart] = useState(today);
  const [leaveEnd, setLeaveEnd] = useState(today);
  const [workingDays, setWorkingDays] = useState('1');
  const canManage = context?.role !== 'COMMERCIAL';

  useEffect(() => {
    const abortController = new AbortController();
    setState('loading');
    Promise.all([
      client.request({
        method: 'GET',
        path: '/payroll/employees',
        schema: erpEmployeeListSchema,
        signal: abortController.signal,
      }),
      client.request({
        method: 'GET',
        path: '/payroll/payslips',
        query: periodKey ? { periodKey } : undefined,
        schema: erpPayslipListSchema,
        signal: abortController.signal,
      }),
      client.request({
        method: 'GET',
        path: '/payroll/leaves',
        schema: erpLeaveRequestListSchema,
        signal: abortController.signal,
      }),
    ])
      .then(([loadedEmployees, loadedPayslips, loadedLeaves]) => {
        if (abortController.signal.aborted) return;
        setEmployees(loadedEmployees);
        setPayslips(loadedPayslips);
        setLeaves(loadedLeaves);
        setEmployeeId(
          (current) =>
            current ||
            loadedEmployees.find((item) => item.status === 'ACTIVE')?.id ||
            '',
        );
        setState('ready');
      })
      .catch(() => {
        if (!abortController.signal.aborted) setState('error');
      });
    return () => abortController.abort();
  }, [client, generation, periodKey]);

  const refresh = () => setGeneration((value) => value + 1);
  const activeEmployees = employees.filter(
    (employee) => employee.status === 'ACTIVE',
  );

  const runMutation = async (
    id: string,
    action: () => Promise<unknown>,
    successMessage: string,
  ) => {
    setBusyId(id);
    try {
      await action();
      enqueueSuccessSnackBar({ message: successMessage });
      refresh();
    } catch {
      enqueueErrorSnackBar({ message: 'Opération de paie impossible' });
    } finally {
      setBusyId(null);
    }
  };

  const createEmployee = () => {
    const salaryCents = Math.round(Number(baseSalaryMad) * 100);
    if (
      !employeeNumber.trim() ||
      !firstName.trim() ||
      !lastName.trim() ||
      !jobTitle.trim() ||
      !Number.isSafeInteger(salaryCents) ||
      salaryCents < 0
    ) {
      enqueueErrorSnackBar({
        message: 'Complétez les informations obligatoires du salarié',
      });
      return;
    }
    return runMutation(
      'employee-create',
      () =>
        client
          .createMutationIntent(
            {
              method: 'POST',
              path: '/payroll/employees',
              schema: erpEmployeeSchema,
              body: {
                employeeNumber: employeeNumber.trim(),
                firstName: firstName.trim(),
                lastName: lastName.trim(),
                jobTitle: jobTitle.trim(),
                contractType,
                hireDate,
                baseSalaryCents: salaryCents,
                cin: cin.trim() || null,
                cnssNumber: cnssNumber.trim() || null,
              },
            },
            { idempotency: 'forbidden' },
          )
          .execute(),
      'Salarié créé',
    );
  };

  const terminateEmployee = (employee: ErpEmployee) => {
    if (
      !window.confirm(
        `Calculer le solde de tout compte et sortir ${employee.firstName} ${employee.lastName} ?`,
      )
    )
      return;
    return runMutation(
      employee.id,
      () =>
        client
          .createMutationIntent(
            {
              method: 'POST',
              path: `/payroll/employees/${employee.id}/terminate`,
              schema: erpEmployeeTerminationResultSchema,
              body: { terminationDate },
            },
            { idempotency: 'forbidden' },
          )
          .execute(),
      'Salarié sorti et STC calculé',
    );
  };

  const generatePayslip = () => {
    if (!employeeId || !/^\d{4}-(?:0[1-9]|1[0-2])$/.test(periodKey)) return;
    const bounds = periodBounds(periodKey);
    const allowancesCents = Math.round(Number(allowancesMad) * 100);
    return runMutation(
      'payslip-generate',
      () =>
        client
          .createMutationIntent(
            {
              method: 'POST',
              path: '/payroll/payslips/generate',
              schema: erpPayslipSchema,
              body: {
                employeeId,
                periodKey,
                periodStart: bounds.start,
                periodEnd: bounds.end,
                taxableAllowancesCents: Number.isSafeInteger(allowancesCents)
                  ? allowancesCents
                  : 0,
              },
            },
            { idempotency: 'forbidden' },
          )
          .execute(),
      'Bulletin calculé',
    );
  };

  const payslipAction = (payslip: ErpPayslip) => {
    const action = payslip.status === 'DRAFT' ? 'validate' : 'pay';
    return runMutation(
      payslip.id,
      () =>
        client
          .createMutationIntent(
            {
              method: 'POST',
              path: `/payroll/payslips/${payslip.id}/${action}`,
              schema: erpPayslipSchema,
            },
            { idempotency: 'forbidden' },
          )
          .execute(),
      action === 'validate'
        ? 'Bulletin validé et écriture générée'
        : 'Bulletin marqué payé',
    );
  };

  const createLeave = () => {
    if (!employeeId || Number(workingDays) <= 0) return;
    return runMutation(
      'leave-create',
      () =>
        client
          .createMutationIntent(
            {
              method: 'POST',
              path: '/payroll/leaves',
              schema: erpLeaveRequestSchema,
              body: {
                employeeId,
                type: leaveType,
                startDate: leaveStart,
                endDate: leaveEnd,
                workingDays: Number(workingDays),
              },
            },
            { idempotency: 'forbidden' },
          )
          .execute(),
      'Demande de congé créée',
    );
  };

  const decideLeave = (
    leave: ErpLeaveRequest,
    status: 'APPROVED' | 'REJECTED',
  ) =>
    runMutation(
      leave.id,
      () =>
        client
          .createMutationIntent(
            {
              method: 'PATCH',
              path: `/payroll/leaves/${leave.id}/decision`,
              schema: erpLeaveRequestSchema,
              body: { status },
            },
            { idempotency: 'forbidden' },
          )
          .execute(),
      status === 'APPROVED' ? 'Congé approuvé' : 'Congé rejeté',
    );

  const exportCnss = async () => {
    setBusyId('cnss');
    try {
      const file = await client.request({
        method: 'GET',
        path: '/payroll/cnss/export',
        query: { periodKey },
        schema: erpCnssExportSchema,
      });
      downloadTextContent(file.filename, file.content, file.contentType);
    } catch {
      enqueueErrorSnackBar({ message: 'Export CNSS impossible' });
    } finally {
      setBusyId(null);
    }
  };

  const employeeColumns: ErpOperationalTableColumn<ErpEmployee>[] = [
    {
      key: 'number',
      header: 'Matricule',
      width: '110px',
      render: (row) => row.employeeNumber,
    },
    {
      key: 'name',
      header: 'Salarié',
      width: '220px',
      render: (row) => `${row.lastName} ${row.firstName}`,
    },
    {
      key: 'job',
      header: 'Poste',
      width: '200px',
      render: (row) => row.jobTitle,
    },
    {
      key: 'contract',
      header: 'Contrat',
      width: '100px',
      render: (row) => row.contractType,
    },
    {
      key: 'salary',
      header: 'Salaire de base',
      width: '150px',
      align: 'right',
      render: (row) => formatMadCents(row.baseSalaryCents),
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
      width: '180px',
      render: (row) =>
        row.status === 'ACTIVE' && canManage ? (
          <Button
            title="STC / Sortie"
            ariaLabel="Calculer le STC"
            variant="secondary"
            disabled={busyId !== null}
            onClick={() => void terminateEmployee(row)}
          />
        ) : null,
    },
  ];

  const payslipColumns: ErpOperationalTableColumn<ErpPayslip>[] = [
    {
      key: 'employee',
      header: 'Salarié',
      width: '220px',
      render: (row) =>
        row.employee
          ? `${row.employee.lastName} ${row.employee.firstName}`
          : row.employeeId,
    },
    {
      key: 'period',
      header: 'Période',
      width: '110px',
      render: (row) => row.periodKey,
    },
    {
      key: 'gross',
      header: 'Brut',
      width: '130px',
      align: 'right',
      render: (row) => formatMadCents(row.grossSalaryCents),
    },
    {
      key: 'cnss',
      header: 'CNSS',
      width: '120px',
      align: 'right',
      render: (row) => formatMadCents(row.cnssEmployeeCents),
    },
    {
      key: 'amo',
      header: 'AMO',
      width: '120px',
      align: 'right',
      render: (row) => formatMadCents(row.amoEmployeeCents),
    },
    {
      key: 'ir',
      header: 'IR',
      width: '120px',
      align: 'right',
      render: (row) => formatMadCents(row.irCents),
    },
    {
      key: 'net',
      header: 'Net',
      width: '140px',
      align: 'right',
      render: (row) => formatMadCents(row.netSalaryCents),
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
      width: '180px',
      render: (row) =>
        canManage && (row.status === 'DRAFT' || row.status === 'VALIDATED') ? (
          <Button
            title={row.status === 'DRAFT' ? 'Valider' : 'Payer'}
            ariaLabel={
              row.status === 'DRAFT'
                ? 'Valider le bulletin'
                : 'Marquer le bulletin payé'
            }
            Icon={IconCheck}
            variant="secondary"
            disabled={busyId !== null}
            onClick={() => void payslipAction(row)}
          />
        ) : null,
    },
  ];

  const leaveColumns: ErpOperationalTableColumn<ErpLeaveRequest>[] = [
    {
      key: 'employee',
      header: 'Salarié',
      width: '220px',
      render: (row) =>
        row.employee
          ? `${row.employee.lastName} ${row.employee.firstName}`
          : row.employeeId,
    },
    {
      key: 'type',
      header: 'Type',
      width: '120px',
      render: (row) => row.type,
    },
    {
      key: 'dates',
      header: 'Période',
      width: '220px',
      render: (row) => `${row.startDate} → ${row.endDate}`,
    },
    {
      key: 'days',
      header: 'Jours',
      width: '90px',
      align: 'right',
      render: (row) => row.workingDays,
    },
    {
      key: 'status',
      header: 'Statut',
      width: '120px',
      render: (row) => row.status,
    },
    {
      key: 'action',
      header: 'Décision',
      width: '250px',
      render: (row) =>
        row.status === 'REQUESTED' && canManage ? (
          <StyledErpWorkspaceInlineActions>
            <Button
              title="Approuver"
              ariaLabel="Approuver le congé"
              Icon={IconCheck}
              variant="secondary"
              disabled={busyId !== null}
              onClick={() => void decideLeave(row, 'APPROVED')}
            />
            <Button
              title="Rejeter"
              ariaLabel="Rejeter le congé"
              variant="secondary"
              disabled={busyId !== null}
              onClick={() => void decideLeave(row, 'REJECTED')}
            />
          </StyledErpWorkspaceInlineActions>
        ) : null,
    },
  ];

  const totalNet = payslips.reduce(
    (sum, payslip) => sum + payslip.netSalaryCents,
    0,
  );

  return (
    <ErpPageShell
      title="Paie et ressources humaines"
      description="Contrats, bulletins, IR, CNSS, AMO, congés et STC"
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
      loadingLabel="Chargement de la paie"
      errorLabel="Impossible de charger la paie"
      onRetry={refresh}
    >
      <StyledErpWorkspaceTabs role="tablist" aria-label="Paie et RH">
        <TabButton
          id="payroll-employees"
          title="Salariés"
          active={view === 'employees'}
          onClick={() => setView('employees')}
        />
        <TabButton
          id="payroll-payslips"
          title="Bulletins"
          active={view === 'payslips'}
          onClick={() => setView('payslips')}
        />
        <TabButton
          id="payroll-leaves"
          title="Congés"
          active={view === 'leaves'}
          onClick={() => setView('leaves')}
        />
      </StyledErpWorkspaceTabs>
      <StyledErpWorkspaceSummary>
        <ErpWorkspaceSummaryItem
          label="Salariés actifs"
          value={activeEmployees.length}
        />
        <ErpWorkspaceSummaryItem
          label={`Bulletins ${periodKey}`}
          value={payslips.length}
        />
        <ErpWorkspaceSummaryItem
          label="Net à payer"
          value={formatMadCents(totalNet)}
        />
      </StyledErpWorkspaceSummary>
      <StyledErpWorkspaceToolbar>
        <StyledErpWorkspaceField>
          Période de paie
          <StyledErpWorkspaceInput
            type="month"
            value={periodKey}
            onChange={(event) => setPeriodKey(event.target.value)}
          />
        </StyledErpWorkspaceField>
        <StyledErpWorkspaceField>
          Salarié
          <StyledErpWorkspaceSelect
            value={employeeId}
            onChange={(event) => setEmployeeId(event.target.value)}
          >
            {activeEmployees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.lastName} {employee.firstName}
              </option>
            ))}
          </StyledErpWorkspaceSelect>
        </StyledErpWorkspaceField>
        {view === 'employees' ? (
          <StyledErpWorkspaceField>
            Date de sortie
            <StyledErpWorkspaceInput
              type="date"
              value={terminationDate}
              onChange={(event) => setTerminationDate(event.target.value)}
            />
          </StyledErpWorkspaceField>
        ) : null}
        {view === 'payslips' ? (
          <Button
            title="Exporter CNSS"
            ariaLabel="Exporter CNSS"
            Icon={IconDownload}
            variant="secondary"
            disabled={busyId !== null}
            onClick={() => void exportCnss()}
          />
        ) : null}
      </StyledErpWorkspaceToolbar>
      <StyledErpWorkspaceContent>
        {view === 'employees' ? (
          <>
            <StyledErpWorkspacePanel>
              <StyledErpWorkspacePanelTitle>
                Nouveau salarié et contrat
              </StyledErpWorkspacePanelTitle>
              <StyledErpWorkspaceFormGrid>
                <StyledErpWorkspaceField>
                  Matricule
                  <StyledErpWorkspaceInput
                    value={employeeNumber}
                    onChange={(event) => setEmployeeNumber(event.target.value)}
                  />
                </StyledErpWorkspaceField>
                <StyledErpWorkspaceField>
                  Prénom
                  <StyledErpWorkspaceInput
                    value={firstName}
                    onChange={(event) => setFirstName(event.target.value)}
                  />
                </StyledErpWorkspaceField>
                <StyledErpWorkspaceField>
                  Nom
                  <StyledErpWorkspaceInput
                    value={lastName}
                    onChange={(event) => setLastName(event.target.value)}
                  />
                </StyledErpWorkspaceField>
                <StyledErpWorkspaceField>
                  Poste
                  <StyledErpWorkspaceInput
                    value={jobTitle}
                    onChange={(event) => setJobTitle(event.target.value)}
                  />
                </StyledErpWorkspaceField>
                <StyledErpWorkspaceField>
                  Contrat
                  <StyledErpWorkspaceSelect
                    value={contractType}
                    onChange={(event) =>
                      setContractType(
                        event.target.value as ErpEmployee['contractType'],
                      )
                    }
                  >
                    <option value="CDI">CDI</option>
                    <option value="CDD">CDD</option>
                    <option value="ANAPEC">ANAPEC</option>
                    <option value="INTERIM">Intérim</option>
                    <option value="STAGE">Stage</option>
                  </StyledErpWorkspaceSelect>
                </StyledErpWorkspaceField>
                <StyledErpWorkspaceField>
                  Embauche
                  <StyledErpWorkspaceInput
                    type="date"
                    value={hireDate}
                    onChange={(event) => setHireDate(event.target.value)}
                  />
                </StyledErpWorkspaceField>
                <StyledErpWorkspaceField>
                  Salaire de base (MAD)
                  <StyledErpWorkspaceInput
                    type="number"
                    min="0"
                    step="0.01"
                    value={baseSalaryMad}
                    onChange={(event) => setBaseSalaryMad(event.target.value)}
                  />
                </StyledErpWorkspaceField>
                <StyledErpWorkspaceField>
                  CIN
                  <StyledErpWorkspaceInput
                    value={cin}
                    onChange={(event) => setCin(event.target.value)}
                  />
                </StyledErpWorkspaceField>
                <StyledErpWorkspaceField>
                  N° CNSS
                  <StyledErpWorkspaceInput
                    value={cnssNumber}
                    onChange={(event) => setCnssNumber(event.target.value)}
                  />
                </StyledErpWorkspaceField>
                <Button
                  title="Créer le salarié"
                  ariaLabel="Créer le salarié"
                  variant="primary"
                  disabled={!canManage || busyId !== null}
                  onClick={() => void createEmployee()}
                />
              </StyledErpWorkspaceFormGrid>
            </StyledErpWorkspacePanel>
            <ErpOperationalTable
              ariaLabel="Salariés"
              columns={employeeColumns}
              rows={employees}
              getRowKey={(row) => row.id}
              emptyLabel="Aucun salarié"
            />
          </>
        ) : null}
        {view === 'payslips' ? (
          <>
            <StyledErpWorkspacePanel>
              <StyledErpWorkspacePanelTitle>
                Calculer un bulletin
              </StyledErpWorkspacePanelTitle>
              <StyledErpWorkspaceFormGrid>
                <StyledErpWorkspaceField>
                  Primes imposables (MAD)
                  <StyledErpWorkspaceInput
                    type="number"
                    min="0"
                    step="0.01"
                    value={allowancesMad}
                    onChange={(event) => setAllowancesMad(event.target.value)}
                  />
                </StyledErpWorkspaceField>
                <Button
                  title="Générer le bulletin"
                  ariaLabel="Générer le bulletin"
                  variant="primary"
                  disabled={!canManage || !employeeId || busyId !== null}
                  onClick={() => void generatePayslip()}
                />
              </StyledErpWorkspaceFormGrid>
            </StyledErpWorkspacePanel>
            <ErpOperationalTable
              ariaLabel="Bulletins de paie"
              columns={payslipColumns}
              rows={payslips}
              getRowKey={(row) => row.id}
              emptyLabel="Aucun bulletin pour cette période"
            />
          </>
        ) : null}
        {view === 'leaves' ? (
          <>
            <StyledErpWorkspacePanel>
              <StyledErpWorkspacePanelTitle>
                Nouvelle demande de congé
              </StyledErpWorkspacePanelTitle>
              <StyledErpWorkspaceFormGrid>
                <StyledErpWorkspaceField>
                  Type
                  <StyledErpWorkspaceSelect
                    value={leaveType}
                    onChange={(event) =>
                      setLeaveType(
                        event.target.value as ErpLeaveRequest['type'],
                      )
                    }
                  >
                    <option value="ANNUAL">Annuel</option>
                    <option value="SICK">Maladie</option>
                    <option value="MATERNITY">Maternité</option>
                    <option value="PATERNITY">Paternité</option>
                    <option value="UNPAID">Sans solde</option>
                    <option value="OTHER">Autre</option>
                  </StyledErpWorkspaceSelect>
                </StyledErpWorkspaceField>
                <StyledErpWorkspaceField>
                  Début
                  <StyledErpWorkspaceInput
                    type="date"
                    value={leaveStart}
                    onChange={(event) => setLeaveStart(event.target.value)}
                  />
                </StyledErpWorkspaceField>
                <StyledErpWorkspaceField>
                  Fin
                  <StyledErpWorkspaceInput
                    type="date"
                    value={leaveEnd}
                    onChange={(event) => setLeaveEnd(event.target.value)}
                  />
                </StyledErpWorkspaceField>
                <StyledErpWorkspaceField>
                  Jours ouvrés
                  <StyledErpWorkspaceInput
                    type="number"
                    min="0.5"
                    step="0.5"
                    value={workingDays}
                    onChange={(event) => setWorkingDays(event.target.value)}
                  />
                </StyledErpWorkspaceField>
                <Button
                  title="Créer la demande"
                  ariaLabel="Créer la demande de congé"
                  variant="primary"
                  disabled={!canManage || !employeeId || busyId !== null}
                  onClick={() => void createLeave()}
                />
              </StyledErpWorkspaceFormGrid>
            </StyledErpWorkspacePanel>
            <ErpOperationalTable
              ariaLabel="Congés"
              columns={leaveColumns}
              rows={leaves}
              getRowKey={(row) => row.id}
              emptyLabel="Aucune demande de congé"
            />
          </>
        ) : null}
      </StyledErpWorkspaceContent>
    </ErpPageShell>
  );
};
