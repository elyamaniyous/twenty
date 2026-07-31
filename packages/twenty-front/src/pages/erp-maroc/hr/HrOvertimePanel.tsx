import {
  ErpOperationalTable,
  type ErpOperationalTableColumn,
} from '@/erp-maroc/components/ErpOperationalTable';
import { ErpStatusBadge } from '@/erp-maroc/components/ErpStatusBadge';
import { useErpMarocContext } from '@/erp-maroc/context/useErpMarocContext';
import { type ErpMarocRequest } from '@/erp-maroc/api/erpMarocClient';
import { styled } from '@linaria/react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { type z } from 'zod';
import {
  hrCompensatoryRestBalanceResponseSchema,
  hrCompensatoryRestExpirationResultSchema,
  hrOvertimeApprovalListSchema,
  hrOvertimeApprovalSchema,
  hrOvertimePolicySchema,
  hrOvertimePolicyResponseSchema,
  type HrCompensatoryRestBalanceResponse,
  type HrEmployeeListItem,
  type HrOvertimeApproval,
  type HrOvertimeApprovalStatus,
  type HrOvertimePolicy,
  type HrOvertimeSettlement,
} from 'twenty-shared/erp-maroc';
import { IconCheck, IconRefresh, IconSettings, IconX } from 'twenty-ui/display';
import { Button } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';

type HrOvertimePanelProps = {
  employees: HrEmployeeListItem[];
  canWrite: boolean;
  canApproveFinal: boolean;
  query: string;
};

type LoadState = 'loading' | 'ready' | 'error';

type PolicyDraft = {
  name: string;
  dailyWarningMinutes: number;
  dailyMaximumMinutes: number;
  weeklyMaximumMinutes: number;
  annualMaximumMinutes: number;
  defaultSettlement: HrOvertimeSettlement;
  restConversionBasisPoints: number;
  restExpiryMonths: number;
  blocksApprovalOnLimitExceeded: boolean;
};

type DecisionDraft = {
  settlement: HrOvertimeSettlement;
  payableMinutes: number;
  reason: string;
};

const defaultPolicy: PolicyDraft = {
  name: 'Politique des heures supplémentaires',
  dailyWarningMinutes: 120,
  dailyMaximumMinutes: 240,
  weeklyMaximumMinutes: 720,
  annualMaximumMinutes: 4_800,
  defaultSettlement: 'PAY',
  restConversionBasisPoints: 10_000,
  restExpiryMonths: 12,
  blocksApprovalOnLimitExceeded: true,
};

const currentMonth = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Casablanca',
    year: 'numeric',
    month: '2-digit',
  })
    .format(new Date())
    .slice(0, 7);

const currentDate = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Casablanca',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

const formatDuration = (minutes: number) =>
  `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, '0')}`;

const statusLabels: Record<HrOvertimeApprovalStatus, string> = {
  REQUESTED: 'À valider Manager',
  MANAGER_APPROVED: 'À valider RH',
  APPROVED: 'Validée',
  REJECTED: 'Rejetée',
};

const statusTones: Record<
  HrOvertimeApprovalStatus,
  'neutral' | 'warning' | 'success' | 'danger'
> = {
  REQUESTED: 'warning',
  MANAGER_APPROVED: 'warning',
  APPROVED: 'success',
  REJECTED: 'danger',
};

const settlementLabels: Record<HrOvertimeSettlement, string> = {
  PAY: 'Paiement',
  COMPENSATORY_REST: 'Repos',
  SPLIT: 'Mixte',
};

const StyledPanel = styled.section`
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-height: 0;
  overflow-y: auto;
`;

const StyledToolbar = styled.div`
  align-items: center;
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  flex: 0 0 auto;
  gap: ${themeCssVariables.spacing[2]};
  min-height: 52px;
  overflow-x: auto;
  padding: 0 ${themeCssVariables.spacing[3]};
`;

const StyledMonth = styled.input`
  background: ${themeCssVariables.background.primary};
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.sm};
  color: ${themeCssVariables.font.color.primary};
  font: inherit;
  height: 32px;
  padding: 0 ${themeCssVariables.spacing[2]};
`;

const StyledMetrics = styled.div`
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: grid;
  flex: 0 0 auto;
  grid-template-columns: repeat(6, minmax(130px, 1fr));
  overflow-x: auto;
`;

const StyledMetric = styled.div`
  border-right: 1px solid ${themeCssVariables.border.color.light};
  display: grid;
  gap: ${themeCssVariables.spacing[1]};
  min-width: 130px;
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

const StyledPolicy = styled.form`
  align-items: end;
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: grid;
  flex: 0 0 auto;
  gap: ${themeCssVariables.spacing[2]};
  grid-template-columns:
    minmax(220px, 1.5fr) repeat(4, minmax(125px, 0.7fr))
    minmax(145px, 0.8fr) minmax(130px, 0.7fr) minmax(110px, 0.6fr) auto;
  overflow-x: auto;
  padding: ${themeCssVariables.spacing[3]};
`;

const StyledField = styled.label`
  color: ${themeCssVariables.font.color.secondary};
  display: grid;
  font-size: ${themeCssVariables.font.size.xs};
  gap: ${themeCssVariables.spacing[1]};
  min-width: 100px;
`;

const controlStyles = `
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

const StyledInput = styled.input`
  ${controlStyles}
`;

const StyledSelect = styled.select`
  ${controlStyles}
`;

const StyledCheckboxField = styled.label`
  align-items: center;
  color: ${themeCssVariables.font.color.secondary};
  display: flex;
  font-size: ${themeCssVariables.font.size.xs};
  gap: ${themeCssVariables.spacing[2]};
  min-height: 32px;
  white-space: nowrap;
`;

const StyledFeedback = styled.div<{ danger: boolean }>`
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  color: ${({ danger }) =>
    danger
      ? themeCssVariables.color.red
      : themeCssVariables.font.color.secondary};
  flex: 0 0 auto;
  font-size: ${themeCssVariables.font.size.sm};
  padding: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[3]};
`;

const StyledSection = styled.section<{ height: number }>`
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  flex: 0 0 ${({ height }) => height}px;
  flex-direction: column;
  min-height: ${({ height }) => height}px;
`;

const StyledSectionHeader = styled.div`
  align-items: center;
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  color: ${themeCssVariables.font.color.primary};
  display: flex;
  font-size: ${themeCssVariables.font.size.md};
  font-weight: ${themeCssVariables.font.weight.semiBold};
  min-height: 40px;
  padding: 0 ${themeCssVariables.spacing[3]};
`;

const StyledEmployee = styled.div`
  display: grid;
  gap: 2px;
`;

const StyledMuted = styled.span`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.sm};
`;

const StyledBreakdown = styled.div`
  display: grid;
  font-size: ${themeCssVariables.font.size.sm};
  grid-template-columns: repeat(2, auto);
`;

const StyledDecision = styled.div`
  align-items: center;
  display: flex;
  gap: ${themeCssVariables.spacing[1]};
`;

const StyledCompactInput = styled.input`
  ${controlStyles}
  width: 110px;
`;

const StyledCompactSelect = styled.select`
  ${controlStyles}
  width: 118px;
`;

const StyledRestForm = styled.form`
  align-items: end;
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: grid;
  flex: 0 0 auto;
  gap: ${themeCssVariables.spacing[2]};
  grid-template-columns:
    minmax(220px, 1fr) 130px 150px minmax(240px, 1.4fr)
    auto 150px auto;
  overflow-x: auto;
  padding: ${themeCssVariables.spacing[3]};
`;

const policyToDraft = (policy: HrOvertimePolicy): PolicyDraft => ({
  name: policy.name,
  dailyWarningMinutes: policy.dailyWarningMinutes,
  dailyMaximumMinutes: policy.dailyMaximumMinutes,
  weeklyMaximumMinutes: policy.weeklyMaximumMinutes,
  annualMaximumMinutes: policy.annualMaximumMinutes,
  defaultSettlement: policy.defaultSettlement,
  restConversionBasisPoints: policy.restConversionBasisPoints,
  restExpiryMonths: policy.restExpiryMonths,
  blocksApprovalOnLimitExceeded: policy.blocksApprovalOnLimitExceeded,
});

export const HrOvertimePanel = ({
  employees,
  canWrite,
  canApproveFinal,
  query,
}: HrOvertimePanelProps) => {
  const { client } = useErpMarocContext();
  const [month, setMonth] = useState(currentMonth);
  const [policy, setPolicy] = useState<HrOvertimePolicy | null>(null);
  const [policyDraft, setPolicyDraft] = useState<PolicyDraft>(defaultPolicy);
  const [approvals, setApprovals] = useState<HrOvertimeApproval[]>([]);
  const [rest, setRest] = useState<HrCompensatoryRestBalanceResponse>({
    asOf: currentDate(),
    balances: [],
    credits: [],
  });
  const [decisionDrafts, setDecisionDrafts] = useState<
    Record<string, DecisionDraft>
  >({});
  const [restForm, setRestForm] = useState({
    employeeId: '',
    minutes: 60,
    occurredOn: currentDate(),
    reason: '',
  });
  const [expirationDate, setExpirationDate] = useState(currentDate);
  const [state, setState] = useState<LoadState>('loading');
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{
    message: string;
    danger: boolean;
  } | null>(null);

  const load = useCallback(async () => {
    setState('loading');
    try {
      const [policyResponse, nextApprovals, nextRest] = await Promise.all([
        client.request({
          method: 'GET',
          path: '/hr-attendance/overtime-policy',
          schema: hrOvertimePolicyResponseSchema,
        }),
        client.request({
          method: 'GET',
          path: '/hr-attendance/overtime-approvals',
          query: { month },
          schema: hrOvertimeApprovalListSchema,
        }),
        client.request({
          method: 'GET',
          path: '/hr-attendance/compensatory-rest-balances',
          schema: hrCompensatoryRestBalanceResponseSchema,
        }),
      ]);
      const nextPolicy = policyResponse.policy;
      setPolicy(nextPolicy);
      if (nextPolicy !== null) setPolicyDraft(policyToDraft(nextPolicy));
      setApprovals(nextApprovals);
      setRest(nextRest);
      setRestForm((current) => ({
        ...current,
        employeeId: current.employeeId || employees[0]?.id || '',
      }));
      setDecisionDrafts((current) => {
        const next = { ...current };
        for (const approval of nextApprovals) {
          next[approval.id] ??= {
            settlement:
              approval.settlement ??
              nextPolicy?.defaultSettlement ??
              defaultPolicy.defaultSettlement,
            payableMinutes:
              approval.payableMinutes > 0
                ? approval.payableMinutes
                : Math.floor(approval.eligibleMinutes / 2),
            reason: approval.decisionReason ?? '',
          };
        }
        return next;
      });
      setState('ready');
    } catch {
      setState('error');
    }
  }, [client, employees, month]);

  useEffect(() => {
    void load();
  }, [load]);

  const execute = async <TSchema extends z.ZodType>(
    request: Omit<ErpMarocRequest<TSchema>, 'idempotencyKey'>,
    success: string,
  ): Promise<z.infer<TSchema> | null> => {
    setBusy(true);
    setFeedback(null);
    try {
      const result = await client
        .createMutationIntent(request, { idempotency: 'required' })
        .execute();
      setFeedback({ message: success, danger: false });
      return result;
    } catch {
      setFeedback({
        message:
          "L'opération n'a pas abouti. Vérifiez le statut du mois et les données saisies.",
        danger: true,
      });
      return null;
    } finally {
      setBusy(false);
    }
  };

  const savePolicy = async () => {
    const result = await execute(
      {
        method: 'PUT',
        path: '/hr-attendance/overtime-policy',
        body: policyDraft,
        schema: hrOvertimePolicySchema,
      },
      'Politique des heures supplémentaires enregistrée.',
    );
    if (result !== null) {
      setPolicy(result);
      setPolicyDraft(policyToDraft(result));
    }
  };

  const syncApprovals = async () => {
    const result = await execute(
      {
        method: 'POST',
        path: '/hr-attendance/overtime-approvals/sync',
        body: { month },
        schema: hrOvertimeApprovalListSchema,
      },
      'Heures supplémentaires recalculées depuis les présences.',
    );
    if (result !== null) setApprovals(result);
  };

  const decide = async (
    approval: HrOvertimeApproval,
    decision: 'APPROVE' | 'REJECT',
  ) => {
    const draft = decisionDrafts[approval.id] ?? {
      settlement: policy?.defaultSettlement ?? 'PAY',
      payableMinutes: Math.floor(approval.eligibleMinutes / 2),
      reason: '',
    };
    const body: Record<string, unknown> = {
      decision,
      ...(draft.reason.trim() === '' ? {} : { reason: draft.reason.trim() }),
    };
    if (decision === 'APPROVE' && approval.status === 'MANAGER_APPROVED') {
      body.settlement = draft.settlement;
      if (draft.settlement === 'SPLIT') {
        body.payableMinutes = draft.payableMinutes;
      }
    }
    const result = await execute(
      {
        method: 'PATCH',
        path: `/hr-attendance/overtime-approvals/${approval.id}/decision`,
        body,
        schema: hrOvertimeApprovalSchema,
      },
      approval.status === 'REQUESTED'
        ? decision === 'APPROVE'
          ? 'Validation Manager enregistrée.'
          : 'Demande rejetée.'
        : decision === 'APPROVE'
          ? 'Validation RH enregistrée et variable de paie préparée.'
          : 'Demande rejetée par les RH.',
    );
    if (result !== null) await load();
  };

  const consumeRest = async () => {
    const result = await execute(
      {
        method: 'POST',
        path: '/hr-attendance/compensatory-rest/consume',
        body: restForm,
        schema: hrCompensatoryRestBalanceResponseSchema,
      },
      'Repos compensateur consommé selon le solde le plus ancien.',
    );
    if (result !== null) {
      setRest(result);
      setRestForm((current) => ({ ...current, reason: '' }));
    }
  };

  const expireRest = async () => {
    const result = await execute(
      {
        method: 'POST',
        path: '/hr-attendance/compensatory-rest/expire',
        body: { asOf: expirationDate },
        schema: hrCompensatoryRestExpirationResultSchema,
      },
      'Les crédits arrivés à échéance ont été traités.',
    );
    if (result !== null) await load();
  };

  const normalizedQuery = query.trim().toLocaleLowerCase('fr');
  const visibleApprovals = useMemo(
    () =>
      approvals.filter(({ employee }) =>
        normalizedQuery === ''
          ? true
          : [
              employee.employeeNumber,
              employee.firstName,
              employee.lastName,
            ].some((value) =>
              value.toLocaleLowerCase('fr').includes(normalizedQuery),
            ),
      ),
    [approvals, normalizedQuery],
  );
  const visibleBalances = useMemo(
    () =>
      rest.balances.filter(({ employee }) =>
        normalizedQuery === ''
          ? true
          : [
              employee.employeeNumber,
              employee.firstName,
              employee.lastName,
            ].some((value) =>
              value.toLocaleLowerCase('fr').includes(normalizedQuery),
            ),
      ),
    [normalizedQuery, rest.balances],
  );

  const totals = approvals.reduce(
    (result, approval) => ({
      detected: result.detected + approval.detectedMinutes,
      eligible: result.eligible + approval.eligibleMinutes,
      payable: result.payable + approval.payableMinutes,
      rest: result.rest + approval.restCreditMinutes,
      pending:
        result.pending +
        (approval.status === 'REQUESTED' ||
        approval.status === 'MANAGER_APPROVED'
          ? 1
          : 0),
      alerts: result.alerts + approval.limitAlerts.length,
    }),
    { detected: 0, eligible: 0, payable: 0, rest: 0, pending: 0, alerts: 0 },
  );

  const approvalColumns: ErpOperationalTableColumn<HrOvertimeApproval>[] = [
    {
      key: 'employee',
      header: 'Collaborateur',
      width: '220px',
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
      key: 'detected',
      header: 'Détectées',
      width: '105px',
      align: 'right',
      render: ({ detectedMinutes }) => formatDuration(detectedMinutes),
    },
    {
      key: 'eligible',
      header: 'Éligibles',
      width: '105px',
      align: 'right',
      render: ({ eligibleMinutes }) => formatDuration(eligibleMinutes),
    },
    {
      key: 'breakdown',
      header: 'Répartition',
      width: '190px',
      render: (item) => (
        <StyledBreakdown>
          <span>Jour {formatDuration(item.dayMinutes)}</span>
          <span>Nuit {formatDuration(item.nightMinutes)}</span>
          <span>Repos {formatDuration(item.restDayMinutes)}</span>
          <span>Férié {formatDuration(item.holidayMinutes)}</span>
        </StyledBreakdown>
      ),
    },
    {
      key: 'alerts',
      header: 'Plafonds',
      width: '120px',
      render: ({ limitAlerts }) => (
        <ErpStatusBadge
          label={
            limitAlerts.length === 0
              ? 'Conforme'
              : `${limitAlerts.length} alerte(s)`
          }
          tone={limitAlerts.length === 0 ? 'success' : 'warning'}
        />
      ),
    },
    {
      key: 'status',
      header: 'Circuit',
      width: '165px',
      render: ({ status }) => (
        <ErpStatusBadge
          label={statusLabels[status]}
          tone={statusTones[status]}
        />
      ),
    },
    {
      key: 'settlement',
      header: 'Traitement RH',
      width: '250px',
      render: (approval) => {
        const draft = decisionDrafts[approval.id];
        if (approval.status === 'APPROVED' && approval.settlement !== null) {
          return `${settlementLabels[approval.settlement]} · paie ${formatDuration(approval.payableMinutes)} · repos ${formatDuration(approval.restCreditMinutes)}`;
        }
        if (approval.status !== 'MANAGER_APPROVED' || !canApproveFinal) {
          return approval.status === 'REJECTED'
            ? approval.decisionReason
            : 'En attente';
        }
        return (
          <StyledDecision>
            <StyledCompactSelect
              aria-label="Traitement des heures supplémentaires"
              value={draft?.settlement ?? policy?.defaultSettlement ?? 'PAY'}
              onChange={(event) =>
                setDecisionDrafts((current) => ({
                  ...current,
                  [approval.id]: {
                    settlement: event.target.value as HrOvertimeSettlement,
                    payableMinutes:
                      current[approval.id]?.payableMinutes ??
                      Math.floor(approval.eligibleMinutes / 2),
                    reason: current[approval.id]?.reason ?? '',
                  },
                }))
              }
            >
              {Object.entries(settlementLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </StyledCompactSelect>
            {draft?.settlement === 'SPLIT' ? (
              <StyledCompactInput
                type="number"
                min={1}
                max={Math.max(1, approval.eligibleMinutes - 1)}
                value={draft.payableMinutes}
                aria-label="Minutes à payer"
                onChange={(event) =>
                  setDecisionDrafts((current) => ({
                    ...current,
                    [approval.id]: {
                      ...current[approval.id],
                      payableMinutes: Number(event.target.value),
                    },
                  }))
                }
              />
            ) : null}
          </StyledDecision>
        );
      },
    },
    {
      key: 'decision',
      header: 'Décision',
      width: '390px',
      render: (approval) => {
        if (approval.status === 'APPROVED' || approval.status === 'REJECTED') {
          return 'Décision finale enregistrée';
        }
        if (!canWrite) return 'Lecture seule';
        if (approval.status === 'MANAGER_APPROVED' && !canApproveFinal) {
          return 'Validation RH requise';
        }
        const draft = decisionDrafts[approval.id];
        return (
          <StyledDecision>
            <StyledCompactInput
              value={draft?.reason ?? ''}
              placeholder="Motif si rejet"
              aria-label="Motif de décision"
              onChange={(event) =>
                setDecisionDrafts((current) => ({
                  ...current,
                  [approval.id]: {
                    settlement:
                      current[approval.id]?.settlement ??
                      policy?.defaultSettlement ??
                      'PAY',
                    payableMinutes:
                      current[approval.id]?.payableMinutes ??
                      Math.floor(approval.eligibleMinutes / 2),
                    reason: event.target.value,
                  },
                }))
              }
            />
            <Button
              title="Valider"
              ariaLabel={`Valider les heures supplémentaires de ${approval.employee.firstName} ${approval.employee.lastName}`}
              Icon={IconCheck}
              accent="blue"
              disabled={busy}
              onClick={() => void decide(approval, 'APPROVE')}
            />
            <Button
              title="Rejeter"
              ariaLabel={`Rejeter les heures supplémentaires de ${approval.employee.firstName} ${approval.employee.lastName}`}
              Icon={IconX}
              variant="secondary"
              disabled={busy || (draft?.reason.trim() ?? '') === ''}
              onClick={() => void decide(approval, 'REJECT')}
            />
          </StyledDecision>
        );
      },
    },
  ];

  const balanceColumns: ErpOperationalTableColumn<
    HrCompensatoryRestBalanceResponse['balances'][number]
  >[] = [
    {
      key: 'employee',
      header: 'Collaborateur',
      width: '280px',
      render: ({ employee }) =>
        `${employee.firstName} ${employee.lastName} · ${employee.employeeNumber}`,
    },
    {
      key: 'earned',
      header: 'Acquis',
      width: '140px',
      align: 'right',
      render: ({ earnedMinutes }) => formatDuration(earnedMinutes),
    },
    {
      key: 'consumed',
      header: 'Consommé',
      width: '140px',
      align: 'right',
      render: ({ consumedMinutes }) => formatDuration(consumedMinutes),
    },
    {
      key: 'expired',
      header: 'Expiré',
      width: '140px',
      align: 'right',
      render: ({ expiredMinutes }) => formatDuration(expiredMinutes),
    },
    {
      key: 'pending',
      header: 'À expirer',
      width: '140px',
      align: 'right',
      render: ({ pendingExpiryMinutes }) =>
        formatDuration(pendingExpiryMinutes),
    },
    {
      key: 'available',
      header: 'Disponible',
      width: '160px',
      align: 'right',
      render: ({ availableMinutes }) => (
        <ErpStatusBadge
          label={formatDuration(availableMinutes)}
          tone={availableMinutes > 0 ? 'success' : 'neutral'}
        />
      ),
    },
  ];

  return (
    <StyledPanel>
      <StyledToolbar>
        <StyledMonth
          type="month"
          value={month}
          aria-label="Mois des heures supplémentaires"
          onChange={(event) => setMonth(event.target.value)}
        />
        <Button
          title="Actualiser"
          ariaLabel="Actualiser les heures supplémentaires"
          Icon={IconRefresh}
          variant="secondary"
          disabled={busy}
          onClick={() => void load()}
        />
        {canWrite ? (
          <Button
            title="Recalculer depuis les présences"
            ariaLabel="Recalculer les heures supplémentaires depuis les présences"
            Icon={IconRefresh}
            accent="blue"
            disabled={busy || policy === null}
            onClick={() => void syncApprovals()}
          />
        ) : null}
      </StyledToolbar>

      <StyledMetrics>
        {[
          ['Détectées', formatDuration(totals.detected)],
          ['Éligibles', formatDuration(totals.eligible)],
          ['À payer', formatDuration(totals.payable)],
          ['Repos crédité', formatDuration(totals.rest)],
          ['En attente', totals.pending],
          ['Alertes plafonds', totals.alerts],
        ].map(([label, value]) => (
          <StyledMetric key={label}>
            <StyledMetricLabel>{label}</StyledMetricLabel>
            <StyledMetricValue>{value}</StyledMetricValue>
          </StyledMetric>
        ))}
      </StyledMetrics>

      {canApproveFinal ? (
        <StyledPolicy
          onSubmit={(event) => {
            event.preventDefault();
            void savePolicy();
          }}
        >
          <StyledField>
            Nom de la politique
            <StyledInput
              value={policyDraft.name}
              onChange={(event) =>
                setPolicyDraft((current) => ({
                  ...current,
                  name: event.target.value,
                }))
              }
            />
          </StyledField>
          {[
            ['Alerte / jour (min)', 'dailyWarningMinutes'],
            ['Maximum / jour (min)', 'dailyMaximumMinutes'],
            ['Maximum / semaine', 'weeklyMaximumMinutes'],
            ['Maximum / an', 'annualMaximumMinutes'],
          ].map(([label, key]) => (
            <StyledField key={key}>
              {label}
              <StyledInput
                type="number"
                min={0}
                value={policyDraft[key as keyof PolicyDraft] as number}
                onChange={(event) =>
                  setPolicyDraft((current) => ({
                    ...current,
                    [key]: Number(event.target.value),
                  }))
                }
              />
            </StyledField>
          ))}
          <StyledField>
            Traitement par défaut
            <StyledSelect
              value={policyDraft.defaultSettlement}
              onChange={(event) =>
                setPolicyDraft((current) => ({
                  ...current,
                  defaultSettlement: event.target.value as HrOvertimeSettlement,
                }))
              }
            >
              {Object.entries(settlementLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </StyledSelect>
          </StyledField>
          <StyledField>
            Conversion repos (%)
            <StyledInput
              type="number"
              min={1}
              max={300}
              value={policyDraft.restConversionBasisPoints / 100}
              onChange={(event) =>
                setPolicyDraft((current) => ({
                  ...current,
                  restConversionBasisPoints: Math.round(
                    Number(event.target.value) * 100,
                  ),
                }))
              }
            />
          </StyledField>
          <StyledField>
            Expiration (mois)
            <StyledInput
              type="number"
              min={1}
              max={60}
              value={policyDraft.restExpiryMonths}
              onChange={(event) =>
                setPolicyDraft((current) => ({
                  ...current,
                  restExpiryMonths: Number(event.target.value),
                }))
              }
            />
          </StyledField>
          <StyledCheckboxField>
            <input
              type="checkbox"
              checked={policyDraft.blocksApprovalOnLimitExceeded}
              onChange={(event) =>
                setPolicyDraft((current) => ({
                  ...current,
                  blocksApprovalOnLimitExceeded: event.target.checked,
                }))
              }
            />
            Bloquer si dépassement
          </StyledCheckboxField>
          <Button
            type="submit"
            title="Enregistrer la politique"
            ariaLabel="Enregistrer la politique des heures supplémentaires"
            Icon={IconSettings}
            accent="blue"
            disabled={busy}
          />
        </StyledPolicy>
      ) : null}

      {feedback === null ? null : (
        <StyledFeedback danger={feedback.danger}>
          {feedback.message}
        </StyledFeedback>
      )}

      <StyledSection height={330}>
        <StyledSectionHeader>
          Circuit de validation Manager puis RH
        </StyledSectionHeader>
        <ErpOperationalTable
          ariaLabel="Validation des heures supplémentaires"
          columns={approvalColumns}
          rows={visibleApprovals}
          getRowKey={(row) => row.id}
          state={state}
          loadingLabel="Calcul des heures supplémentaires"
          emptyLabel={
            policy === null
              ? 'Configurez la politique avant le premier calcul'
              : 'Aucune heure supplémentaire détectée pour ce mois'
          }
          errorLabel="Impossible de charger les heures supplémentaires"
          onRetry={() => void load()}
        />
      </StyledSection>

      <StyledSection height={300}>
        <StyledSectionHeader>Repos compensateur</StyledSectionHeader>
        {canApproveFinal ? (
          <StyledRestForm
            onSubmit={(event) => {
              event.preventDefault();
              void consumeRest();
            }}
          >
            <StyledField>
              Collaborateur
              <StyledSelect
                value={restForm.employeeId}
                onChange={(event) =>
                  setRestForm((current) => ({
                    ...current,
                    employeeId: event.target.value,
                  }))
                }
              >
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.firstName} {employee.lastName}
                  </option>
                ))}
              </StyledSelect>
            </StyledField>
            <StyledField>
              Minutes
              <StyledInput
                type="number"
                min={1}
                value={restForm.minutes}
                onChange={(event) =>
                  setRestForm((current) => ({
                    ...current,
                    minutes: Number(event.target.value),
                  }))
                }
              />
            </StyledField>
            <StyledField>
              Date
              <StyledInput
                type="date"
                value={restForm.occurredOn}
                onChange={(event) =>
                  setRestForm((current) => ({
                    ...current,
                    occurredOn: event.target.value,
                  }))
                }
              />
            </StyledField>
            <StyledField>
              Motif
              <StyledInput
                value={restForm.reason}
                placeholder="Repos pris et validé"
                onChange={(event) =>
                  setRestForm((current) => ({
                    ...current,
                    reason: event.target.value,
                  }))
                }
              />
            </StyledField>
            <Button
              type="submit"
              title="Déduire du compteur"
              ariaLabel="Déduire le repos du compteur"
              Icon={IconCheck}
              accent="blue"
              disabled={
                busy ||
                restForm.employeeId === '' ||
                restForm.reason.trim() === ''
              }
            />
            <StyledField>
              Expirer jusqu'au
              <StyledInput
                type="date"
                value={expirationDate}
                onChange={(event) => setExpirationDate(event.target.value)}
              />
            </StyledField>
            <Button
              type="button"
              title="Traiter les expirations"
              ariaLabel="Traiter les expirations de repos compensateur"
              Icon={IconRefresh}
              variant="secondary"
              disabled={busy}
              onClick={() => void expireRest()}
            />
          </StyledRestForm>
        ) : null}
        <ErpOperationalTable
          ariaLabel="Soldes de repos compensateur"
          columns={balanceColumns}
          rows={visibleBalances}
          getRowKey={(row) => row.employee.id}
          state={state}
          emptyLabel="Aucun crédit de repos compensateur"
          errorLabel="Impossible de charger les soldes de repos"
          onRetry={() => void load()}
        />
      </StyledSection>
    </StyledPanel>
  );
};
