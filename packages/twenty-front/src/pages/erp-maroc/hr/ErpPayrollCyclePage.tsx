import {
  ErpOperationalTable,
  type ErpOperationalTableColumn,
} from '@/erp-maroc/components/ErpOperationalTable';
import { ErpPageShell } from '@/erp-maroc/components/ErpPageShell';
import { ErpStatusBadge } from '@/erp-maroc/components/ErpStatusBadge';
import { useErpMarocContext } from '@/erp-maroc/context/useErpMarocContext';
import { styled } from '@linaria/react';
import { csv2json } from 'json-2-csv';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  erpPayrollPeriodPreviewSchema,
  hrAccessContextSchema,
  hrEmployeeListSchema,
  hrMonthlyPeriodDetailSchema,
  hrMonthlyPeriodListSchema,
  type ErpPayrollPeriodPreview,
  type HrEmployeeListItem,
  type HrMonthlyEmployeeSnapshot,
  type HrMonthlyPeriodDetail,
  type HrMonthlyPeriodStatus,
} from 'twenty-shared/erp-maroc';
import {
  IconCheck,
  IconFileImport,
  IconListDetails,
  IconLock,
  IconPlus,
  IconRefresh,
  IconSend,
} from 'twenty-ui/display';
import { Button } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';

type LoadState = 'loading' | 'ready' | 'error';
type Adjustment = {
  taxableAllowancesCents: number;
  otherDeductionsCents: number;
};

const previousMonth = () => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Casablanca',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(new Date());
  const year = Number(parts.find(({ type }) => type === 'year')?.value);
  const month = Number(parts.find(({ type }) => type === 'month')?.value);
  return new Date(Date.UTC(year, month - 2, 1)).toISOString().slice(0, 7);
};

const money = (cents: number) =>
  new Intl.NumberFormat('fr-MA', {
    style: 'currency',
    currency: 'MAD',
    maximumFractionDigits: 2,
  }).format(cents / 100);

const rate = (basisPoints: number) =>
  basisPoints === 0
    ? '—'
    : `${new Intl.NumberFormat('fr-MA', {
        maximumFractionDigits: 2,
      }).format(basisPoints / 100)} %`;

const statusLabels: Record<HrMonthlyPeriodStatus, string> = {
  OPEN: 'Population',
  IN_REVIEW: 'En revue',
  FROZEN: 'Variables gelées',
  TRANSMITTED: 'Prévisualisation',
};

const StyledWorkspace = styled.div`
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-height: 0;
  overflow: auto;
`;

const StyledToolbar = styled.div`
  align-items: center;
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  flex: 0 0 auto;
  gap: ${themeCssVariables.spacing[2]};
  min-height: 48px;
  overflow-x: auto;
  padding: 0 ${themeCssVariables.spacing[3]};
`;

const StyledMonth = styled.input`
  background: ${themeCssVariables.background.primary};
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.sm};
  color: ${themeCssVariables.font.color.primary};
  font: inherit;
  height: 30px;
  padding: 0 ${themeCssVariables.spacing[2]};
`;

const StyledSpacer = styled.div`
  flex: 1 1 auto;
`;

const StyledReason = styled.input`
  background: ${themeCssVariables.background.primary};
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.sm};
  color: ${themeCssVariables.font.color.primary};
  font: inherit;
  height: 30px;
  min-width: 220px;
  padding: 0 ${themeCssVariables.spacing[2]};
`;

const StyledChecklist = styled.section`
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: grid;
  flex: 0 0 auto;
  grid-template-columns: repeat(6, minmax(150px, 1fr));
  overflow-x: auto;
`;

const StyledCheck = styled.div`
  align-items: center;
  border-right: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
  min-width: 150px;
  padding: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[3]};
`;

const StyledMetrics = styled.section`
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: grid;
  flex: 0 0 auto;
  grid-template-columns: repeat(5, minmax(140px, 1fr));
  overflow-x: auto;
`;

const StyledMetric = styled.div`
  border-right: 1px solid ${themeCssVariables.border.color.light};
  display: grid;
  gap: 2px;
  min-width: 140px;
  padding: ${themeCssVariables.spacing[3]};
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

const StyledFeedback = styled.div<{ danger: boolean }>`
  background: ${({ danger }) =>
    danger
      ? themeCssVariables.tag.background.red
      : themeCssVariables.tag.background.green};
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  color: ${({ danger }) =>
    danger ? themeCssVariables.tag.text.red : themeCssVariables.tag.text.green};
  font-size: ${themeCssVariables.font.size.sm};
  padding: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[3]};
`;

const StyledEmployee = styled.div`
  display: grid;
  gap: 2px;
`;

const StyledMuted = styled.span`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.sm};
`;

const StyledAmountInput = styled.input`
  background: ${themeCssVariables.background.primary};
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.sm};
  color: ${themeCssVariables.font.color.primary};
  font: inherit;
  height: 28px;
  max-width: 120px;
  padding: 0 ${themeCssVariables.spacing[2]};
  text-align: right;
`;

const StyledHiddenInput = styled.input`
  display: none;
`;

const StyledRubricPanel = styled.section`
  border-top: 1px solid ${themeCssVariables.border.color.medium};
  display: flex;
  flex: 0 0 240px;
  flex-direction: column;
  min-height: 180px;
`;

const StyledRubricHeader = styled.div`
  align-items: center;
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  flex: 0 0 40px;
  gap: ${themeCssVariables.spacing[2]};
  padding: 0 ${themeCssVariables.spacing[3]};
`;

const StyledRubricTitle = styled.strong`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.md};
  letter-spacing: 0;
`;

const centsFromMad = (value: unknown): number => {
  const normalized = String(value ?? '')
    .trim()
    .replaceAll(' ', '')
    .replace(',', '.');
  const amount = Number(normalized || 0);
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error('Montant CSV invalide');
  }
  return Math.round(amount * 100);
};

const adjustmentsFromPreview = (
  preview: ErpPayrollPeriodPreview,
): Record<string, Adjustment> =>
  Object.fromEntries(
    preview.payslips.map((payslip) => [
      payslip.employeeId,
      {
        taxableAllowancesCents:
          payslip.lines?.find(({ code }) => code === 'ALLOWANCES')
            ?.amountCents ?? 0,
        otherDeductionsCents:
          payslip.lines?.find(({ code }) => code === 'OTHER_DED')
            ?.amountCents ?? 0,
      },
    ]),
  );

export const ErpPayrollCyclePage = () => {
  const { client } = useErpMarocContext();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [month, setMonth] = useState(previousMonth);
  const [period, setPeriod] = useState<HrMonthlyPeriodDetail | null>(null);
  const [employees, setEmployees] = useState<HrEmployeeListItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [adjustments, setAdjustments] = useState<Record<string, Adjustment>>(
    {},
  );
  const [preview, setPreview] = useState<ErpPayrollPeriodPreview | null>(null);
  const [selectedPayslipId, setSelectedPayslipId] = useState<string | null>(
    null,
  );
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [busy, setBusy] = useState(false);
  const [canOperate, setCanOperate] = useState(false);
  const [reopenReason, setReopenReason] = useState('');
  const [feedback, setFeedback] = useState<{
    message: string;
    danger: boolean;
  } | null>(null);

  const load = useCallback(async () => {
    setLoadState('loading');
    try {
      const [periods, employeeList, access] = await Promise.all([
        client.request({
          method: 'GET',
          path: '/hr-monthly-periods',
          query: { year: month.slice(0, 4) },
          schema: hrMonthlyPeriodListSchema,
        }),
        client.request({
          method: 'GET',
          path: '/hr-core/employees',
          schema: hrEmployeeListSchema,
        }),
        client.request({
          method: 'GET',
          path: '/hr-core/access/me',
          schema: hrAccessContextSchema,
        }),
      ]);
      const activeEmployees = employeeList.filter(
        ({ status }) => status === 'ACTIVE',
      );
      const selectedPeriod = periods.find((item) => item.month === month);
      const detail =
        selectedPeriod === undefined
          ? null
          : await client.request({
              method: 'GET',
              path: `/hr-monthly-periods/${selectedPeriod.id}`,
              schema: hrMonthlyPeriodDetailSchema,
            });
      setEmployees(activeEmployees);
      setPeriod(detail);
      setSelectedIds(
        new Set(
          detail?.snapshots.length
            ? detail.snapshots.map(({ employeeId }) => employeeId)
            : activeEmployees.map(({ id }) => id),
        ),
      );
      setCanOperate(
        access.populationScope === 'ALL' &&
          access.canWriteTime &&
          access.canReadCompensation,
      );
      if (detail?.status === 'TRANSMITTED') {
        const loadedPreview = await client.request({
          method: 'GET',
          path: `/payroll/periods/${detail.id}/preview`,
          schema: erpPayrollPeriodPreviewSchema,
        });
        setPreview(loadedPreview);
        setSelectedPayslipId(loadedPreview.payslips[0]?.id ?? null);
        setAdjustments(adjustmentsFromPreview(loadedPreview));
      } else {
        setPreview(null);
        setSelectedPayslipId(null);
        setAdjustments({});
      }
      setLoadState('ready');
    } catch {
      setLoadState('error');
    }
  }, [client, month]);

  useEffect(() => {
    void load();
  }, [load]);

  const mutatePeriod = async (
    path: string,
    message: string,
    body?: Record<string, unknown>,
  ) => {
    setBusy(true);
    setFeedback(null);
    try {
      const updated = await client
        .createMutationIntent(
          {
            method: 'POST',
            path,
            schema: hrMonthlyPeriodDetailSchema,
            ...(body === undefined ? {} : { body }),
          },
          { idempotency: 'required' },
        )
        .execute();
      setPeriod(updated);
      setPreview(null);
      setSelectedPayslipId(null);
      setFeedback({ message, danger: false });
      setReopenReason('');
    } catch {
      setFeedback({
        message:
          "L'opération est bloquée par le statut ou un contrôle du cycle.",
        danger: true,
      });
    } finally {
      setBusy(false);
    }
  };

  const generatePreview = async () => {
    if (period === null) return;
    setBusy(true);
    setFeedback(null);
    try {
      const generated = await client
        .createMutationIntent(
          {
            method: 'POST',
            path: `/payroll/periods/${period.id}/preview`,
            body: {
              adjustments: Object.entries(adjustments).map(
                ([employeeId, adjustment]) => ({ employeeId, ...adjustment }),
              ),
            },
            schema: erpPayrollPeriodPreviewSchema,
          },
          { idempotency: 'required' },
        )
        .execute();
      setPreview(generated);
      setSelectedPayslipId(generated.payslips[0]?.id ?? null);
      setAdjustments(adjustmentsFromPreview(generated));
      setFeedback({
        message: `${generated.generated} bulletin(s) brouillon généré(s), sans écriture comptable.`,
        danger: false,
      });
    } catch {
      setFeedback({
        message:
          'La prévisualisation est bloquée par des variables incomplètes.',
        danger: true,
      });
    } finally {
      setBusy(false);
    }
  };

  const importAdjustments = async (file: File) => {
    try {
      const rows = csv2json(await file.text()) as Array<
        Record<string, string | number | undefined>
      >;
      const employeesByNumber = new Map(
        employees.map((employee) => [employee.employeeNumber, employee]),
      );
      const imported: Record<string, Adjustment> = {};
      for (const row of rows) {
        const employeeNumber = String(
          row.employeeNumber ?? row.matricule ?? '',
        ).trim();
        const employee = employeesByNumber.get(employeeNumber);
        if (employee === undefined || !selectedIds.has(employee.id)) {
          throw new Error('Matricule CSV absent de la population');
        }
        imported[employee.id] = {
          taxableAllowancesCents: centsFromMad(
            row.taxableAllowancesMad ?? row.primes_mad,
          ),
          otherDeductionsCents: centsFromMad(
            row.otherDeductionsMad ?? row.retenues_mad,
          ),
        };
      }
      setAdjustments((current) => ({ ...current, ...imported }));
      setFeedback({
        message: `${rows.length} ligne(s) de variables importée(s).`,
        danger: false,
      });
    } catch {
      setFeedback({
        message:
          'Import refusé : vérifiez les colonnes matricule, primes_mad et retenues_mad.',
        danger: true,
      });
    }
  };

  const updateAdjustment = (
    employeeId: string,
    field: keyof Adjustment,
    madValue: string,
  ) => {
    const amount = Math.max(0, Math.round(Number(madValue || 0) * 100));
    setAdjustments((current) => ({
      ...current,
      [employeeId]: {
        taxableAllowancesCents:
          current[employeeId]?.taxableAllowancesCents ?? 0,
        otherDeductionsCents: current[employeeId]?.otherDeductionsCents ?? 0,
        [field]: amount,
      },
    }));
  };

  const payslipByEmployee = useMemo(
    () =>
      new Map(
        (preview?.payslips ?? []).map((payslip) => [
          payslip.employeeId,
          payslip,
        ]),
      ),
    [preview],
  );

  const selectedPayslip = useMemo(
    () => preview?.payslips.find(({ id }) => id === selectedPayslipId) ?? null,
    [preview, selectedPayslipId],
  );

  const populationColumns: ErpOperationalTableColumn<HrEmployeeListItem>[] = [
    {
      key: 'selected',
      header: '',
      width: '48px',
      render: (employee) => (
        <input
          type="checkbox"
          aria-label={`Sélectionner ${employee.firstName} ${employee.lastName}`}
          checked={selectedIds.has(employee.id)}
          disabled={!canOperate || period?.status !== 'OPEN'}
          onChange={(event) =>
            setSelectedIds((current) => {
              const next = new Set(current);
              if (event.target.checked) next.add(employee.id);
              else next.delete(employee.id);
              return next;
            })
          }
        />
      ),
    },
    {
      key: 'employee',
      header: 'Collaborateur',
      width: '280px',
      render: (employee) => (
        <StyledEmployee>
          <span>
            {employee.firstName} {employee.lastName}
          </span>
          <StyledMuted>{employee.employeeNumber}</StyledMuted>
        </StyledEmployee>
      ),
    },
    {
      key: 'job',
      header: 'Fonction',
      width: '220px',
      render: (row) => row.jobTitle,
    },
    {
      key: 'contract',
      header: 'Contrat actif',
      width: '160px',
      render: (row) =>
        row.employmentContracts.find(({ status }) => status === 'ACTIVE')
          ?.contractType ?? 'À contrôler',
    },
    {
      key: 'status',
      header: 'Statut',
      width: '130px',
      render: () => <ErpStatusBadge label="Éligible" tone="success" />,
    },
  ];

  const variableColumns: ErpOperationalTableColumn<HrMonthlyEmployeeSnapshot>[] =
    [
      {
        key: 'employee',
        header: 'Collaborateur',
        width: '250px',
        render: ({ employee }) => (
          <StyledEmployee>
            <span>
              {employee.firstName} {employee.lastName}
            </span>
            <StyledMuted>{employee.employeeNumber}</StyledMuted>
          </StyledEmployee>
        ),
      },
      {
        key: 'attendance',
        header: 'Abs. / congé non payé',
        width: '180px',
        align: 'right',
        render: (row) => `${row.absentDays} / ${row.unpaidLeaveDays}`,
      },
      {
        key: 'overtime',
        header: 'Heures sup.',
        width: '120px',
        align: 'right',
        render: (row) =>
          `${Math.round((row.overtimeMinutes / 60) * 100) / 100} h`,
      },
      {
        key: 'allowances',
        header: 'Primes MAD',
        width: '150px',
        render: (row) => (
          <StyledAmountInput
            type="number"
            min="0"
            step="0.01"
            aria-label={`Primes ${row.employee.employeeNumber}`}
            value={
              (adjustments[row.employeeId]?.taxableAllowancesCents ?? 0) / 100
            }
            disabled={!canOperate || period?.status !== 'TRANSMITTED'}
            onChange={(event) =>
              updateAdjustment(
                row.employeeId,
                'taxableAllowancesCents',
                event.target.value,
              )
            }
          />
        ),
      },
      {
        key: 'deductions',
        header: 'Retenues MAD',
        width: '150px',
        render: (row) => (
          <StyledAmountInput
            type="number"
            min="0"
            step="0.01"
            aria-label={`Retenues ${row.employee.employeeNumber}`}
            value={
              (adjustments[row.employeeId]?.otherDeductionsCents ?? 0) / 100
            }
            disabled={!canOperate || period?.status !== 'TRANSMITTED'}
            onChange={(event) =>
              updateAdjustment(
                row.employeeId,
                'otherDeductionsCents',
                event.target.value,
              )
            }
          />
        ),
      },
      {
        key: 'seniority',
        header: 'Ancienneté',
        width: '145px',
        align: 'right',
        render: (row) => {
          const amount = payslipByEmployee
            .get(row.employeeId)
            ?.lines?.find(({ code }) => code === 'ANC001')?.amountCents;
          return amount === undefined ? '—' : money(amount);
        },
      },
      {
        key: 'valued-overtime',
        header: 'HS valorisées',
        width: '150px',
        align: 'right',
        render: (row) => {
          const payslip = payslipByEmployee.get(row.employeeId);
          return payslip === undefined
            ? '—'
            : money(
                (payslip.lines ?? [])
                  .filter(({ code }) => code.startsWith('HS'))
                  .reduce((total, line) => total + line.amountCents, 0),
              );
        },
      },
      {
        key: 'gross',
        header: 'Brut',
        width: '150px',
        align: 'right',
        render: (row) => {
          const payslip = payslipByEmployee.get(row.employeeId);
          return payslip === undefined ? '—' : money(payslip.grossSalaryCents);
        },
      },
      {
        key: 'net',
        header: 'Net prévisualisé',
        width: '170px',
        align: 'right',
        render: (row) => {
          const payslip = payslipByEmployee.get(row.employeeId);
          return payslip === undefined ? '—' : money(payslip.netSalaryCents);
        },
      },
      {
        key: 'details',
        header: '',
        width: '110px',
        align: 'center',
        render: (row) => {
          const payslip = payslipByEmployee.get(row.employeeId);
          return payslip === undefined ? null : (
            <Button
              title="Rubriques"
              ariaLabel={`Afficher les rubriques de ${row.employee.employeeNumber}`}
              Icon={IconListDetails}
              variant="secondary"
              onClick={() => setSelectedPayslipId(payslip.id)}
            />
          );
        },
      },
      {
        key: 'control',
        header: 'Contrôle',
        width: '150px',
        render: (row) => (
          <ErpStatusBadge
            label={
              row.anomalyCount === 0
                ? 'Conforme'
                : `${row.anomalyCount} anomalie(s)`
            }
            tone={row.anomalyCount === 0 ? 'success' : 'danger'}
          />
        ),
      },
    ];

  const checklist = [
    ['Période ouverte', period !== null],
    ['Population calculée', (period?.employeeCount ?? 0) > 0],
    [
      'Anomalies RH levées',
      period !== null &&
        period.currentSnapshotVersion !== null &&
        period.totalAnomalyCount === 0,
    ],
    [
      'Variables gelées',
      period?.status === 'FROZEN' || period?.status === 'TRANSMITTED',
    ],
    ['Variables transmises', period?.status === 'TRANSMITTED'],
    [
      'Brouillons complets',
      period !== null && preview?.generated === period.employeeCount,
    ],
  ] as const;

  const periodId = period?.id;
  const tableRows = period?.snapshots ?? [];
  const rubricColumns: ErpOperationalTableColumn<
    NonNullable<ErpPayrollPeriodPreview['payslips'][number]['lines']>[number]
  >[] = [
    {
      key: 'code',
      header: 'Code',
      width: '130px',
      render: ({ code }) => code,
    },
    {
      key: 'label',
      header: 'Rubrique',
      width: '300px',
      render: ({ label }) => label,
    },
    {
      key: 'kind',
      header: 'Nature',
      width: '140px',
      render: ({ kind }) =>
        ({
          EARNING: 'Gain',
          DEDUCTION: 'Retenue',
          EMPLOYER: 'Employeur',
          INFORMATION: 'Information',
        })[kind] ?? kind,
    },
    {
      key: 'base',
      header: 'Assiette',
      width: '160px',
      align: 'right',
      render: ({ baseCents }) => money(baseCents),
    },
    {
      key: 'rate',
      header: 'Taux',
      width: '120px',
      align: 'right',
      render: ({ rateBasisPoints }) => rate(rateBasisPoints),
    },
    {
      key: 'amount',
      header: 'Montant',
      width: '170px',
      align: 'right',
      render: ({ amountCents }) => money(amountCents),
    },
  ];

  return (
    <ErpPageShell
      title="Cycle de paie"
      description="Population, variables figées, contrôles et prévisualisation sans impact comptable"
      state={loadState}
      loadingLabel="Chargement du cycle de paie"
      errorLabel="Impossible de charger le cycle de paie"
      onRetry={() => void load()}
      actions={
        <Button
          title="Actualiser"
          ariaLabel="Actualiser le cycle de paie"
          Icon={IconRefresh}
          variant="secondary"
          disabled={busy}
          onClick={() => void load()}
        />
      }
    >
      <StyledWorkspace>
        <StyledToolbar>
          <StyledMonth
            type="month"
            value={month}
            min="2000-01"
            max="2100-12"
            aria-label="Mois de paie"
            onChange={(event) => {
              setMonth(event.target.value);
              setFeedback(null);
              setAdjustments({});
            }}
          />
          {period === null ? (
            <ErpStatusBadge label="Non ouverte" />
          ) : (
            <ErpStatusBadge
              label={statusLabels[period.status]}
              tone={period.status === 'TRANSMITTED' ? 'success' : 'info'}
            />
          )}
          <StyledSpacer />
          {canOperate && period === null ? (
            <Button
              title="Ouvrir"
              ariaLabel="Ouvrir le cycle de paie"
              Icon={IconPlus}
              accent="blue"
              disabled={busy}
              onClick={() =>
                void mutatePeriod(
                  '/hr-monthly-periods',
                  'Cycle de paie ouvert.',
                  { month },
                )
              }
            />
          ) : null}
          {canOperate && period?.status === 'OPEN' ? (
            <>
              <Button
                title="Calculer la population"
                ariaLabel="Calculer la population sélectionnée"
                Icon={IconRefresh}
                variant="secondary"
                disabled={busy || selectedIds.size === 0}
                onClick={() =>
                  void mutatePeriod(
                    `/hr-monthly-periods/${periodId}/recalculate`,
                    'Population et variables RH recalculées.',
                    { employeeIds: [...selectedIds] },
                  )
                }
              />
              <Button
                title="Soumettre"
                ariaLabel="Soumettre le cycle en revue"
                Icon={IconCheck}
                accent="blue"
                disabled={busy || period.currentSnapshotVersion === null}
                onClick={() =>
                  void mutatePeriod(
                    `/hr-monthly-periods/${periodId}/submit-review`,
                    'Cycle soumis en revue.',
                  )
                }
              />
            </>
          ) : null}
          {canOperate && period?.status === 'IN_REVIEW' ? (
            <Button
              title="Geler"
              ariaLabel="Geler les variables du cycle"
              Icon={IconLock}
              accent="blue"
              disabled={busy || period.totalAnomalyCount > 0}
              onClick={() =>
                void mutatePeriod(
                  `/hr-monthly-periods/${periodId}/freeze`,
                  'Variables de paie gelées.',
                )
              }
            />
          ) : null}
          {canOperate && period?.status === 'FROZEN' ? (
            <Button
              title="Transmettre"
              ariaLabel="Transmettre les variables à la paie"
              Icon={IconSend}
              accent="blue"
              disabled={busy}
              onClick={() =>
                void mutatePeriod(
                  `/hr-monthly-periods/${periodId}/transmit`,
                  'Variables transmises à la paie.',
                )
              }
            />
          ) : null}
          {canOperate && period?.status === 'TRANSMITTED' ? (
            <>
              <StyledHiddenInput
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file !== undefined) void importAdjustments(file);
                  event.target.value = '';
                }}
              />
              <Button
                title="Importer variables"
                ariaLabel="Importer les variables CSV"
                Icon={IconFileImport}
                variant="secondary"
                disabled={busy}
                onClick={() => fileInputRef.current?.click()}
              />
              <Button
                title="Prévisualiser"
                ariaLabel="Générer les bulletins brouillons"
                Icon={IconCheck}
                accent="blue"
                disabled={busy}
                onClick={() => void generatePreview()}
              />
            </>
          ) : null}
          {canOperate && period !== null && period.status !== 'OPEN' ? (
            <>
              <StyledReason
                value={reopenReason}
                placeholder="Motif de réouverture"
                aria-label="Motif de réouverture"
                onChange={(event) => setReopenReason(event.target.value)}
              />
              <Button
                title="Réouvrir"
                ariaLabel="Réouvrir le cycle de paie"
                Icon={IconRefresh}
                variant="secondary"
                disabled={busy || reopenReason.trim() === ''}
                onClick={() =>
                  void mutatePeriod(
                    `/hr-monthly-periods/${periodId}/reopen`,
                    'Cycle réouvert et brouillons retirés.',
                    { reason: reopenReason.trim() },
                  )
                }
              />
            </>
          ) : null}
        </StyledToolbar>

        <StyledChecklist aria-label="Checklist bloquante du cycle de paie">
          {checklist.map(([label, complete]) => (
            <StyledCheck key={label}>
              <ErpStatusBadge
                label={complete ? 'OK' : 'À faire'}
                tone={complete ? 'success' : 'warning'}
              />
              <StyledMuted>{label}</StyledMuted>
            </StyledCheck>
          ))}
        </StyledChecklist>

        {period === null ? null : (
          <StyledMetrics aria-label="Indicateurs du cycle de paie">
            {[
              ['Population', period.employeeCount],
              ['Anomalies bloquantes', period.totalAnomalyCount],
              ['Bulletins brouillons', preview?.generated ?? 0],
              ['Net à payer', money(preview?.totalNetCents ?? 0)],
              ['Coût employeur', money(preview?.totalEmployerCostCents ?? 0)],
            ].map(([label, value]) => (
              <StyledMetric key={label}>
                <StyledMetricLabel>{label}</StyledMetricLabel>
                <StyledMetricValue>{value}</StyledMetricValue>
              </StyledMetric>
            ))}
          </StyledMetrics>
        )}

        {feedback === null ? null : (
          <StyledFeedback danger={feedback.danger}>
            {feedback.message}
          </StyledFeedback>
        )}
        {preview !== null && preview.warnings.length > 0 ? (
          <StyledFeedback danger>
            {preview.warnings.length} contrôle(s) de paie restent à traiter
            avant validation.
          </StyledFeedback>
        ) : null}

        {period === null || period.status === 'OPEN' ? (
          <ErpOperationalTable
            ariaLabel="Population du cycle de paie"
            columns={populationColumns}
            rows={employees}
            getRowKey={(row) => row.id}
            state="ready"
            emptyLabel="Aucun collaborateur actif"
          />
        ) : (
          <ErpOperationalTable
            ariaLabel="Variables et prévisualisation de paie"
            columns={variableColumns}
            rows={tableRows}
            getRowKey={(row) => row.id}
            state="ready"
            emptyLabel="Aucune variable de paie"
          />
        )}
        {selectedPayslip === null ? null : (
          <StyledRubricPanel aria-label="Détail des rubriques de paie">
            <StyledRubricHeader>
              <IconListDetails size={16} />
              <StyledRubricTitle>
                {selectedPayslip.employee?.firstName}{' '}
                {selectedPayslip.employee?.lastName} ·{' '}
                {selectedPayslip.periodKey}
              </StyledRubricTitle>
              <StyledSpacer />
              <ErpStatusBadge
                label={selectedPayslip.status}
                tone={selectedPayslip.status === 'DRAFT' ? 'info' : 'success'}
              />
            </StyledRubricHeader>
            <ErpOperationalTable
              ariaLabel="Rubriques du bulletin sélectionné"
              columns={rubricColumns}
              rows={selectedPayslip.lines ?? []}
              getRowKey={(row) => row.id}
              state="ready"
              emptyLabel="Aucune rubrique"
            />
          </StyledRubricPanel>
        )}
      </StyledWorkspace>
    </ErpPageShell>
  );
};
