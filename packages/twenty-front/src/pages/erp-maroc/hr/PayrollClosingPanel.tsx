import {
  ErpOperationalTable,
  type ErpOperationalTableColumn,
} from '@/erp-maroc/components/ErpOperationalTable';
import {
  ErpStatusBadge,
  type ErpStatusTone,
} from '@/erp-maroc/components/ErpStatusBadge';
import { useErpMarocContext } from '@/erp-maroc/context/useErpMarocContext';
import { styled } from '@linaria/react';
import { useCallback, useEffect, useState } from 'react';
import {
  payrollClosingDossierSchema,
  payrollClosingPreviewSchema,
  type PayrollClosingCheck,
  type PayrollClosingPreview,
} from 'twenty-shared/erp-maroc';
import {
  IconCheck,
  IconLock,
  IconLockOpen,
  IconRefresh,
  IconX,
} from 'twenty-ui/display';
import { Button } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';

const StyledPanel = styled.div`
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-height: 0;
  overflow: auto;
`;

const StyledControls = styled.section`
  align-items: end;
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  flex: 0 0 auto;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[2]};
  padding: ${themeCssVariables.spacing[3]};
`;

const StyledField = styled.label`
  color: ${themeCssVariables.font.color.secondary};
  display: flex;
  flex-direction: column;
  font-size: ${themeCssVariables.font.size.sm};
  gap: ${themeCssVariables.spacing[1]};
`;

const StyledInput = styled.input`
  background: ${themeCssVariables.background.primary};
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.sm};
  box-sizing: border-box;
  color: ${themeCssVariables.font.color.primary};
  font: inherit;
  height: 32px;
  min-width: 150px;
  padding: 0 ${themeCssVariables.spacing[2]};
`;

const StyledMetrics = styled.section`
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: grid;
  flex: 0 0 auto;
  grid-template-columns: repeat(5, minmax(150px, 1fr));
  overflow-x: auto;
`;

const StyledMetric = styled.div`
  border-right: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[1]};
  min-width: 150px;
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
  color: ${({ danger }) =>
    danger ? themeCssVariables.tag.text.red : themeCssVariables.tag.text.green};
  font-size: ${themeCssVariables.font.size.sm};
  padding: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[3]};
`;

const currentMonth = new Date().toISOString().slice(0, 7);
const money = new Intl.NumberFormat('fr-MA', {
  style: 'currency',
  currency: 'MAD',
});
const dateTime = new Intl.DateTimeFormat('fr-MA', {
  dateStyle: 'short',
  timeStyle: 'short',
});

const checkTone = (passed: boolean): ErpStatusTone =>
  passed ? 'success' : 'danger';

export const PayrollClosingPanel = () => {
  const { client, context } = useErpMarocContext();
  const [periodKey, setPeriodKey] = useState(currentMonth);
  const [preview, setPreview] = useState<PayrollClosingPreview | null>(null);
  const [reason, setReason] = useState('Correction justifiée après clôture');
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{
    message: string;
    danger: boolean;
  } | null>(null);

  const canClose = ['OWNER', 'ADMIN', 'COMPTABLE'].includes(
    context?.role ?? '',
  );
  const canReopen = ['OWNER', 'ADMIN'].includes(context?.role ?? '');

  const load = useCallback(async () => {
    setBusy(true);
    setFeedback(null);
    try {
      setPreview(
        await client.request({
          method: 'GET',
          path: `/payroll/closing-dossiers/${periodKey}/preview`,
          schema: payrollClosingPreviewSchema,
        }),
      );
    } catch {
      setPreview(null);
      setFeedback({
        message: 'Le dossier de clôture ne peut pas être calculé.',
        danger: true,
      });
    } finally {
      setBusy(false);
    }
  }, [client, periodKey]);

  useEffect(() => {
    void load();
  }, [load]);

  const close = async () => {
    setBusy(true);
    setFeedback(null);
    try {
      const dossier = await client
        .createMutationIntent(
          {
            method: 'POST',
            path: `/payroll/closing-dossiers/${periodKey}/close`,
            schema: payrollClosingDossierSchema,
            body: {},
          },
          { idempotency: 'required' },
        )
        .execute();
      setFeedback({
        message: `Période clôturée · dossier v${dossier.version} · empreinte ${dossier.snapshotSha256.slice(0, 12)}…`,
        danger: false,
      });
      await load();
    } catch {
      setFeedback({
        message: 'La clôture est bloquée par un contrôle non satisfait.',
        danger: true,
      });
    } finally {
      setBusy(false);
    }
  };

  const reopen = async () => {
    const dossier = preview?.latestDossier;

    if (!dossier) return;

    setBusy(true);
    setFeedback(null);
    try {
      await client
        .createMutationIntent(
          {
            method: 'POST',
            path: `/payroll/closing-dossiers/${dossier.id}/reopen`,
            schema: payrollClosingDossierSchema,
            body: { reason },
          },
          { idempotency: 'required' },
        )
        .execute();
      setFeedback({
        message:
          'Période réouverte. La prochaine clôture créera une nouvelle version.',
        danger: false,
      });
      await load();
    } catch {
      setFeedback({
        message: "La période n'a pas pu être réouverte.",
        danger: true,
      });
    } finally {
      setBusy(false);
    }
  };

  const columns: ErpOperationalTableColumn<PayrollClosingCheck>[] = [
    {
      key: 'check',
      header: 'Contrôle',
      width: '310px',
      render: ({ label }) => label,
    },
    {
      key: 'result',
      header: 'Résultat',
      width: '130px',
      render: ({ passed }) => (
        <ErpStatusBadge
          label={passed ? 'Conforme' : 'Bloquant'}
          tone={checkTone(passed)}
        />
      ),
    },
    {
      key: 'detail',
      header: 'Détail',
      width: '320px',
      render: ({ detail }) => detail,
    },
    {
      key: 'icon',
      header: '',
      width: '60px',
      align: 'center',
      render: ({ passed }) =>
        passed ? <IconCheck size={16} /> : <IconX size={16} />,
    },
  ];

  const latestClosed = preview?.latestDossier?.status === 'CLOSED';

  return (
    <StyledPanel>
      <StyledControls>
        <StyledField>
          Période
          <StyledInput
            type="month"
            value={periodKey}
            onChange={(event) => setPeriodKey(event.target.value)}
          />
        </StyledField>
        <Button
          title="Actualiser"
          ariaLabel="Recalculer les contrôles de clôture"
          Icon={IconRefresh}
          variant="secondary"
          disabled={busy}
          onClick={() => void load()}
        />
        {canClose && preview?.ready && !latestClosed ? (
          <Button
            title="Clôturer la période"
            ariaLabel="Clôturer la période de paie"
            Icon={IconLock}
            accent="blue"
            disabled={busy}
            onClick={() => void close()}
          />
        ) : null}
        {canReopen && latestClosed ? (
          <>
            <StyledField>
              Motif de réouverture
              <StyledInput
                value={reason}
                onChange={(event) => setReason(event.target.value)}
              />
            </StyledField>
            <Button
              title="Réouvrir la période"
              ariaLabel="Réouvrir la période clôturée"
              Icon={IconLockOpen}
              variant="secondary"
              disabled={busy || reason.trim().length < 10}
              onClick={() => void reopen()}
            />
          </>
        ) : null}
      </StyledControls>
      {feedback ? (
        <StyledFeedback danger={feedback.danger}>
          {feedback.message}
        </StyledFeedback>
      ) : null}
      {preview ? (
        <>
          <StyledMetrics aria-label="Totaux de clôture de paie">
            <StyledMetric>
              <StyledMetricLabel>Statut</StyledMetricLabel>
              <StyledMetricValue>
                {latestClosed
                  ? `Clôturée v${preview.latestDossier?.version}`
                  : preview.ready
                    ? 'Prête'
                    : 'Bloquée'}
              </StyledMetricValue>
            </StyledMetric>
            <StyledMetric>
              <StyledMetricLabel>Salariés</StyledMetricLabel>
              <StyledMetricValue>
                {preview.totals.employeeCount}
              </StyledMetricValue>
            </StyledMetric>
            <StyledMetric>
              <StyledMetricLabel>Brut</StyledMetricLabel>
              <StyledMetricValue>
                {money.format(preview.totals.totalGrossCents / 100)}
              </StyledMetricValue>
            </StyledMetric>
            <StyledMetric>
              <StyledMetricLabel>Net payé</StyledMetricLabel>
              <StyledMetricValue>
                {money.format(preview.totals.totalNetCents / 100)}
              </StyledMetricValue>
            </StyledMetric>
            <StyledMetric>
              <StyledMetricLabel>Dernière clôture</StyledMetricLabel>
              <StyledMetricValue>
                {preview.latestDossier
                  ? dateTime.format(new Date(preview.latestDossier.closedAt))
                  : '—'}
              </StyledMetricValue>
            </StyledMetric>
          </StyledMetrics>
          <ErpOperationalTable
            ariaLabel="Contrôles du dossier de clôture"
            columns={columns}
            rows={preview.checks}
            getRowKey={({ code }) => code}
            emptyLabel="Aucun contrôle"
          />
        </>
      ) : null}
    </StyledPanel>
  );
};
