import {
  ErpOperationalTable,
  type ErpOperationalTableColumn,
} from '@/erp-maroc/components/ErpOperationalTable';
import { ErpStatusBadge } from '@/erp-maroc/components/ErpStatusBadge';
import { useErpMarocContext } from '@/erp-maroc/context/useErpMarocContext';
import { styled } from '@linaria/react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  hrMonthlyPeriodDetailSchema,
  hrMonthlyPeriodListSchema,
  type HrMonthlyEmployeeSnapshot,
  type HrMonthlyPeriodDetail,
  type HrMonthlyPeriodStatus,
} from 'twenty-shared/erp-maroc';
import { IconCheck, IconPlus, IconRefresh, IconSend } from 'twenty-ui/display';
import { Button } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';

type Props = {
  canWrite: boolean;
  query: string;
};

type LoadState = 'loading' | 'ready' | 'error';

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

const formatDuration = (minutes: number) =>
  `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, '0')}`;

const statusLabels: Record<HrMonthlyPeriodStatus, string> = {
  OPEN: 'Ouverte',
  IN_REVIEW: 'En revue',
  FROZEN: 'Gelée',
  TRANSMITTED: 'Transmise en paie',
};

const statusTones: Record<
  HrMonthlyPeriodStatus,
  'neutral' | 'info' | 'success' | 'warning'
> = {
  OPEN: 'neutral',
  IN_REVIEW: 'warning',
  FROZEN: 'info',
  TRANSMITTED: 'success',
};

const StyledPanel = styled.section`
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-height: 0;
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

const StyledStatus = styled.div`
  margin-right: auto;
`;

const StyledReason = styled.input`
  background: ${themeCssVariables.background.primary};
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.sm};
  color: ${themeCssVariables.font.color.primary};
  font: inherit;
  height: 32px;
  min-width: 220px;
  padding: 0 ${themeCssVariables.spacing[2]};
`;

const StyledMetrics = styled.div`
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: grid;
  flex: 0 0 auto;
  grid-template-columns: repeat(7, minmax(130px, 1fr));
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

const StyledFeedback = styled.div<{ danger: boolean }>`
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  color: ${({ danger }) =>
    danger
      ? themeCssVariables.color.red
      : themeCssVariables.font.color.secondary};
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

export const HrMonthlyClosingPanel = ({ canWrite, query }: Props) => {
  const { client } = useErpMarocContext();
  const [month, setMonth] = useState(previousMonth);
  const [period, setPeriod] = useState<HrMonthlyPeriodDetail | null>(null);
  const [state, setState] = useState<LoadState>('loading');
  const [busy, setBusy] = useState(false);
  const [reopenReason, setReopenReason] = useState('');
  const [feedback, setFeedback] = useState<{
    message: string;
    danger: boolean;
  } | null>(null);

  const load = useCallback(async () => {
    setState('loading');
    try {
      const periods = await client.request({
        method: 'GET',
        path: '/hr-monthly-periods',
        query: { year: month.slice(0, 4) },
        schema: hrMonthlyPeriodListSchema,
      });
      const selected = periods.find((item) => item.month === month);
      if (selected === undefined) {
        setPeriod(null);
      } else {
        setPeriod(
          await client.request({
            method: 'GET',
            path: `/hr-monthly-periods/${selected.id}`,
            schema: hrMonthlyPeriodDetailSchema,
          }),
        );
      }
      setState('ready');
    } catch {
      setState('error');
    }
  }, [client, month]);

  useEffect(() => {
    void load();
  }, [load]);

  const execute = async (
    path: string,
    success: string,
    body?: Record<string, unknown>,
  ) => {
    setBusy(true);
    setFeedback(null);
    try {
      const nextPeriod = await client
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
      setPeriod(nextPeriod);
      setFeedback({ message: success, danger: false });
      setReopenReason('');
    } catch {
      setFeedback({
        message:
          "L'opération n'a pas abouti. Vérifiez les anomalies et le statut du mois.",
        danger: true,
      });
    } finally {
      setBusy(false);
    }
  };

  const normalizedQuery = query.trim().toLocaleLowerCase('fr');
  const rows = useMemo(
    () =>
      (period?.snapshots ?? []).filter(({ employee }) =>
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
    [normalizedQuery, period],
  );

  const columns: ErpOperationalTableColumn<HrMonthlyEmployeeSnapshot>[] = [
    {
      key: 'employee',
      header: 'Collaborateur',
      width: '260px',
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
      key: 'worked',
      header: 'Travail',
      width: '130px',
      align: 'right',
      render: (item) => formatDuration(item.workedMinutes),
    },
    {
      key: 'overtime',
      header: 'Heures sup.',
      width: '130px',
      align: 'right',
      render: (item) => formatDuration(item.overtimeMinutes),
    },
    {
      key: 'late',
      header: 'Retards',
      width: '120px',
      align: 'right',
      render: (item) => `${item.lateMinutes} min`,
    },
    {
      key: 'absence',
      header: 'Absences',
      width: '120px',
      align: 'right',
      render: (item) => item.absentDays,
    },
    {
      key: 'leave',
      header: 'Congés payés / non payés',
      width: '190px',
      align: 'right',
      render: (item) => `${item.paidLeaveDays} / ${item.unpaidLeaveDays}`,
    },
    {
      key: 'anomalies',
      header: 'Contrôle',
      width: '150px',
      render: (item) => (
        <ErpStatusBadge
          label={
            item.anomalyCount === 0
              ? 'Conforme'
              : `${item.anomalyCount} anomalie(s)`
          }
          tone={item.anomalyCount === 0 ? 'success' : 'danger'}
        />
      ),
    },
  ];

  const periodId = period?.id;

  return (
    <StyledPanel>
      <StyledToolbar>
        <StyledMonth
          type="month"
          value={month}
          min="2000-01"
          max="2100-12"
          aria-label="Mois de clôture RH"
          onChange={(event) => {
            setMonth(event.target.value);
            setFeedback(null);
          }}
        />
        <StyledStatus>
          {period === null ? (
            <ErpStatusBadge label="Non ouverte" />
          ) : (
            <ErpStatusBadge
              label={statusLabels[period.status]}
              tone={statusTones[period.status]}
            />
          )}
        </StyledStatus>
        {canWrite && period === null ? (
          <Button
            title="Ouvrir le mois"
            ariaLabel="Ouvrir le mois RH"
            Icon={IconPlus}
            accent="blue"
            disabled={busy}
            onClick={() =>
              void execute('/hr-monthly-periods', 'Mois RH ouvert.', { month })
            }
          />
        ) : null}
        {canWrite && period?.status === 'OPEN' ? (
          <>
            <Button
              title="Recalculer"
              ariaLabel="Recalculer le mois RH"
              Icon={IconRefresh}
              variant="secondary"
              disabled={busy}
              onClick={() =>
                void execute(
                  `/hr-monthly-periods/${periodId}/recalculate`,
                  'Instantané RH recalculé.',
                )
              }
            />
            <Button
              title="Soumettre en revue"
              ariaLabel="Soumettre le mois RH en revue"
              Icon={IconCheck}
              accent="blue"
              disabled={busy || period.currentSnapshotVersion === null}
              onClick={() =>
                void execute(
                  `/hr-monthly-periods/${periodId}/submit-review`,
                  'Mois RH soumis en revue.',
                )
              }
            />
          </>
        ) : null}
        {canWrite &&
        (period?.status === 'IN_REVIEW' || period?.status === 'FROZEN') ? (
          <>
            <StyledReason
              value={reopenReason}
              placeholder="Motif de réouverture"
              aria-label="Motif de réouverture"
              onChange={(event) => setReopenReason(event.target.value)}
            />
            <Button
              title="Réouvrir"
              ariaLabel="Réouvrir le mois RH"
              Icon={IconRefresh}
              variant="secondary"
              disabled={busy || reopenReason.trim() === ''}
              onClick={() =>
                void execute(
                  `/hr-monthly-periods/${periodId}/reopen`,
                  'Mois RH réouvert.',
                  { reason: reopenReason.trim() },
                )
              }
            />
          </>
        ) : null}
        {canWrite && period?.status === 'IN_REVIEW' ? (
          <Button
            title="Geler"
            ariaLabel="Geler le mois RH validé"
            Icon={IconCheck}
            accent="blue"
            disabled={busy || period.totalAnomalyCount > 0}
            onClick={() =>
              void execute(
                `/hr-monthly-periods/${periodId}/freeze`,
                'Mois RH gelé.',
              )
            }
          />
        ) : null}
        {canWrite && period?.status === 'FROZEN' ? (
          <Button
            title="Transmettre en paie"
            ariaLabel="Transmettre les variables en paie"
            Icon={IconSend}
            accent="blue"
            disabled={busy}
            onClick={() =>
              void execute(
                `/hr-monthly-periods/${periodId}/transmit`,
                'Variables transmises en paie.',
              )
            }
          />
        ) : null}
      </StyledToolbar>

      {feedback === null ? null : (
        <StyledFeedback danger={feedback.danger}>
          {feedback.message}
        </StyledFeedback>
      )}

      {period === null ? null : (
        <StyledMetrics>
          {[
            ['Collaborateurs', period.employeeCount],
            ['Anomalies', period.totalAnomalyCount],
            ['Temps travaillé', formatDuration(period.totalWorkedMinutes)],
            [
              'Heures supplémentaires',
              formatDuration(period.totalOvertimeMinutes),
            ],
            ['Absences', period.totalAbsenceDays],
            ['Congés payés', period.totalPaidLeaveDays],
            ['Congés non payés', period.totalUnpaidLeaveDays],
          ].map(([label, value]) => (
            <StyledMetric key={label}>
              <StyledMetricLabel>{label}</StyledMetricLabel>
              <StyledMetricValue>{value}</StyledMetricValue>
            </StyledMetric>
          ))}
        </StyledMetrics>
      )}

      <ErpOperationalTable
        ariaLabel="Clôture mensuelle RH"
        columns={columns}
        rows={rows}
        getRowKey={(row) => row.id}
        state={state}
        loadingLabel="Chargement de la clôture RH"
        emptyLabel={
          period === null
            ? 'Ouvrez ce mois pour préparer la paie'
            : 'Recalculez le mois pour produire les variables de paie'
        }
        errorLabel="Impossible de charger la clôture RH"
        onRetry={() => void load()}
      />
    </StyledPanel>
  );
};
