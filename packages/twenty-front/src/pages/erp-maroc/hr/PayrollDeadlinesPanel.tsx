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
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  payrollDeadlineListSchema,
  type PayrollDeadline,
  type PayrollDeadlineStatus,
} from 'twenty-shared/erp-maroc';
import { IconExternalLink, IconRefresh } from 'twenty-ui/display';
import { Button } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';

type PayrollDeadlinesPanelProps = { query: string };

const statusAppearance: Record<
  PayrollDeadlineStatus,
  { label: string; tone: ErpStatusTone }
> = {
  UPCOMING: { label: 'À venir', tone: 'neutral' },
  DUE_SOON: { label: 'Échéance proche', tone: 'warning' },
  OVERDUE: { label: 'En retard', tone: 'danger' },
  IN_PROGRESS: { label: 'Déposée', tone: 'info' },
  REJECTED: { label: 'Rejetée', tone: 'danger' },
  COMPLETED: { label: 'Terminée', tone: 'success' },
};

const StyledPanel = styled.div`
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-height: 0;
`;

const StyledControls = styled.section`
  align-items: end;
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  flex: 0 0 auto;
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
  color: ${themeCssVariables.font.color.primary};
  font: inherit;
  height: 32px;
  padding: 0 ${themeCssVariables.spacing[2]};
  width: 110px;
`;

const StyledFeedback = styled.div`
  background: ${themeCssVariables.tag.background.red};
  color: ${themeCssVariables.tag.text.red};
  font-size: ${themeCssVariables.font.size.sm};
  padding: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[3]};
`;

const StyledSource = styled.a`
  align-items: center;
  color: ${themeCssVariables.color.blue};
  display: inline-flex;
  gap: ${themeCssVariables.spacing[1]};
  text-decoration: none;
`;

const date = new Intl.DateTimeFormat('fr-MA', { dateStyle: 'medium' });

export const PayrollDeadlinesPanel = ({
  query,
}: PayrollDeadlinesPanelProps) => {
  const { client } = useErpMarocContext();
  const [year, setYear] = useState(new Date().getFullYear());
  const [deadlines, setDeadlines] = useState<PayrollDeadline[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    setError(false);
    try {
      setDeadlines(
        await client.request({
          method: 'GET',
          path: '/payroll/deadlines',
          query: { year },
          schema: payrollDeadlineListSchema,
        }),
      );
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }, [client, year]);

  useEffect(() => {
    void load();
  }, [load]);

  const normalizedQuery = query.trim().toLocaleLowerCase('fr');
  const filtered = useMemo(
    () =>
      deadlines.filter((deadline) =>
        [
          deadline.label,
          deadline.periodKey,
          deadline.portal,
          deadline.status,
          deadline.externalReference ?? '',
        ].some((value) =>
          value.toLocaleLowerCase('fr').includes(normalizedQuery),
        ),
      ),
    [deadlines, normalizedQuery],
  );

  const columns: ErpOperationalTableColumn<PayrollDeadline>[] = [
    {
      key: 'obligation',
      header: 'Obligation',
      width: '260px',
      render: ({ label }) => label,
    },
    {
      key: 'period',
      header: 'Période',
      width: '100px',
      render: ({ periodKey }) => periodKey,
    },
    {
      key: 'dueDate',
      header: 'Échéance',
      width: '140px',
      render: ({ dueDate }) => date.format(new Date(`${dueDate}T00:00:00Z`)),
    },
    {
      key: 'portal',
      header: 'Portail',
      width: '110px',
      render: ({ portal }) => portal,
    },
    {
      key: 'status',
      header: 'Statut',
      width: '150px',
      render: ({ status }) => {
        const appearance = statusAppearance[status];
        return (
          <ErpStatusBadge label={appearance.label} tone={appearance.tone} />
        );
      },
    },
    {
      key: 'reference',
      header: 'Référence',
      width: '180px',
      render: ({ externalReference }) => externalReference ?? '—',
    },
    {
      key: 'rule',
      header: 'Règle',
      width: '210px',
      render: ({ requiresExpertReview, ruleVersion }) =>
        `${ruleVersion}${requiresExpertReview ? ' · à confirmer' : ''}`,
    },
    {
      key: 'source',
      header: 'Source',
      width: '170px',
      render: ({ sourceArticle, sourceLabel, sourceUrl }) => (
        <StyledSource href={sourceUrl} target="_blank" rel="noreferrer">
          {sourceArticle ?? sourceLabel}
          <IconExternalLink size={14} aria-hidden="true" />
        </StyledSource>
      ),
    },
  ];

  return (
    <StyledPanel>
      <StyledControls>
        <StyledField>
          Année
          <StyledInput
            type="number"
            min={2000}
            max={2200}
            value={year}
            onChange={(event) => setYear(Number(event.target.value))}
          />
        </StyledField>
        <Button
          title="Actualiser"
          ariaLabel="Actualiser l'échéancier réglementaire"
          Icon={IconRefresh}
          variant="secondary"
          disabled={busy}
          onClick={() => void load()}
        />
      </StyledControls>
      {error ? (
        <StyledFeedback>L'échéancier ne peut pas être chargé.</StyledFeedback>
      ) : null}
      <ErpOperationalTable
        ariaLabel="Échéancier réglementaire de paie"
        columns={columns}
        rows={filtered}
        getRowKey={({ code, periodKey }) => `${code}-${periodKey}`}
        emptyLabel={busy ? 'Chargement…' : 'Aucune échéance'}
      />
    </StyledPanel>
  );
};
