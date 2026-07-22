import {
  ErpOperationalTable,
  type ErpOperationalTableColumn,
} from '@/erp-maroc/components/ErpOperationalTable';
import {
  ErpWorkspaceSummaryItem,
  StyledErpWorkspaceContent,
  StyledErpWorkspacePanel,
  StyledErpWorkspacePanelTitle,
  StyledErpWorkspaceSummary,
  StyledErpWorkspaceTabs,
} from '@/erp-maroc/components/ErpComplianceUi';
import { ErpPageShell } from '@/erp-maroc/components/ErpPageShell';
import { useErpMarocContext } from '@/erp-maroc/context/useErpMarocContext';
import { erpMarocPaths } from '@/erp-maroc/navigation/erpMarocPaths';
import { formatMadCents } from '@/erp-maroc/utils/money';
import { styled } from '@linaria/react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  erpTreasuryForecastSchema,
  type ErpTreasuryEvent,
  type ErpTreasuryForecast,
  type ErpTreasuryScenarioCode,
} from 'twenty-shared/erp-maroc';
import { IconRefresh } from 'twenty-ui/display';
import { Button, TabButton } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';

type ForecastWeek = ErpTreasuryForecast['scenarios'][number]['weeks'][number];

const StyledAlert = styled.div<{ severity: 'INFO' | 'WARNING' | 'CRITICAL' }>`
  background: ${({ severity }) =>
    severity === 'CRITICAL'
      ? themeCssVariables.background.danger
      : themeCssVariables.background.secondary};
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  color: ${themeCssVariables.font.color.primary};
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[2]};
  justify-content: space-between;
  padding: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[3]};

  strong {
    font-weight: ${themeCssVariables.font.weight.semiBold};
  }
`;

const StyledTwoColumns = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));

  @media (max-width: 800px) {
    grid-template-columns: 1fr;
  }
`;

const StyledAging = styled.dl`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  margin: 0;
  padding: 0 ${themeCssVariables.spacing[3]} ${themeCssVariables.spacing[3]};

  div {
    border-top: 1px solid ${themeCssVariables.border.color.light};
    min-width: 0;
    padding: ${themeCssVariables.spacing[2]};
  }

  dt {
    color: ${themeCssVariables.font.color.tertiary};
    font-size: ${themeCssVariables.font.size.sm};
  }

  dd {
    color: ${themeCssVariables.font.color.primary};
    font-size: ${themeCssVariables.font.size.md};
    font-weight: ${themeCssVariables.font.weight.semiBold};
    margin: ${themeCssVariables.spacing[1]} 0 0;
    overflow-wrap: anywhere;
  }
`;

const StyledActions = styled.div`
  display: grid;
  gap: 0;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));

  a {
    border-right: 1px solid ${themeCssVariables.border.color.light};
    color: ${themeCssVariables.font.color.primary};
    display: flex;
    flex-direction: column;
    gap: ${themeCssVariables.spacing[1]};
    min-height: 72px;
    padding: ${themeCssVariables.spacing[3]};
    text-decoration: none;
  }

  span {
    color: ${themeCssVariables.font.color.tertiary};
    font-size: ${themeCssVariables.font.size.sm};
  }
`;

const actionPaths = {
  REMIND_CUSTOMERS: erpMarocPaths.reminders,
  PREPARE_SUPPLIER_PAYMENTS: erpMarocPaths.purchaseOrders,
  RECONCILE_BANK: erpMarocPaths.bankStatements,
} as const;

const sourceLabels: Record<ErpTreasuryEvent['sourceType'], string> = {
  CUSTOMER_INVOICE: 'Facture client',
  OPENING_RECEIVABLE: 'Créance d’ouverture',
  RECURRING_INVOICE: 'Facturation récurrente',
  SUPPLIER_INVOICE: 'Facture fournisseur',
  SUPPLIER_PAYMENT: 'Paiement préparé',
  OPENING_PAYABLE: 'Dette d’ouverture',
  PAYROLL: 'Paie',
  TAX: 'Fiscalité',
  EXPENSE_NOTE: 'Note de frais',
};

const weekColumns: ErpOperationalTableColumn<ForecastWeek>[] = [
  {
    key: 'week',
    header: 'Semaine',
    width: '130px',
    render: (row) => `S${row.index} · ${row.startDate.slice(5)}`,
  },
  {
    key: 'opening',
    header: 'Ouverture',
    width: '150px',
    align: 'right',
    render: (row) => formatMadCents(row.openingBalanceCents),
  },
  {
    key: 'inflow',
    header: 'Encaissements',
    width: '150px',
    align: 'right',
    render: (row) => formatMadCents(row.inflowCents),
  },
  {
    key: 'outflow',
    header: 'Décaissements',
    width: '150px',
    align: 'right',
    render: (row) => formatMadCents(row.outflowCents),
  },
  {
    key: 'net',
    header: 'Flux net',
    width: '140px',
    align: 'right',
    render: (row) => formatMadCents(row.netCashFlowCents),
  },
  {
    key: 'closing',
    header: 'Clôture',
    width: '150px',
    align: 'right',
    render: (row) => formatMadCents(row.closingBalanceCents),
  },
];

const eventColumns: ErpOperationalTableColumn<ErpTreasuryEvent>[] = [
  {
    key: 'dueDate',
    header: 'Échéance',
    width: '120px',
    render: (row) => row.dueDate,
  },
  {
    key: 'source',
    header: 'Source',
    width: '160px',
    render: (row) => sourceLabels[row.sourceType],
  },
  {
    key: 'label',
    header: 'Référence',
    width: '180px',
    render: (row) => row.label,
  },
  {
    key: 'counterparty',
    header: 'Tiers',
    width: '220px',
    render: (row) => row.counterparty ?? '—',
  },
  {
    key: 'amount',
    header: 'Montant',
    width: '160px',
    align: 'right',
    render: (row) =>
      `${row.direction === 'INFLOW' ? '+' : '−'} ${formatMadCents(row.amountCents)}`,
  },
];

const AgingBlock = ({
  title,
  aging,
}: {
  title: string;
  aging: ErpTreasuryForecast['aging']['receivables'];
}) => (
  <StyledErpWorkspacePanel>
    <StyledErpWorkspacePanelTitle>{title}</StyledErpWorkspacePanelTitle>
    <StyledAging>
      {[
        ['Non échu', aging.notDueCents],
        ['1–30 jours', aging.days1To30Cents],
        ['31–60 jours', aging.days31To60Cents],
        ['61–90 jours', aging.days61To90Cents],
        ['Plus de 90 jours', aging.over90DaysCents],
        ['Total', aging.totalCents],
      ].map(([label, value]) => (
        <div key={String(label)}>
          <dt>{label}</dt>
          <dd>{formatMadCents(Number(value))}</dd>
        </div>
      ))}
    </StyledAging>
  </StyledErpWorkspacePanel>
);

export const ErpTreasuryPage = () => {
  const { client } = useErpMarocContext();
  const [forecast, setForecast] = useState<ErpTreasuryForecast | null>(null);
  const [scenarioCode, setScenarioCode] =
    useState<ErpTreasuryScenarioCode>('BASE');
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [generation, setGeneration] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setState('loading');
    client
      .request({
        method: 'GET',
        path: '/operations/treasury-forecast',
        query: { weeks: '13' },
        schema: erpTreasuryForecastSchema,
        signal: controller.signal,
      })
      .then((value) => {
        if (controller.signal.aborted) return;
        setForecast(value);
        setState('ready');
      })
      .catch(() => {
        if (!controller.signal.aborted) setState('error');
      });
    return () => controller.abort();
  }, [client, generation]);

  const scenario = useMemo(
    () => forecast?.scenarios.find(({ code }) => code === scenarioCode) ?? null,
    [forecast, scenarioCode],
  );
  const refresh = () => setGeneration((value) => value + 1);

  return (
    <ErpPageShell
      title="Trésorerie"
      description="Prévision consolidée sur 13 semaines"
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
      loadingLabel="Calcul de la prévision"
      errorLabel="Impossible de calculer la trésorerie"
      onRetry={refresh}
    >
      {forecast && scenario ? (
        <StyledErpWorkspaceContent>
          <StyledErpWorkspaceTabs
            role="tablist"
            aria-label="Scénario de trésorerie"
          >
            {forecast.scenarios.map((item) => (
              <TabButton
                key={item.code}
                id={`treasury-${item.code.toLowerCase()}`}
                title={item.label}
                active={scenarioCode === item.code}
                onClick={() => setScenarioCode(item.code)}
              />
            ))}
          </StyledErpWorkspaceTabs>

          {forecast.alerts.map((alert) => (
            <StyledAlert key={alert.code} severity={alert.severity}>
              <span>
                <strong>{alert.title}</strong> · {alert.message}
              </span>
              {alert.amountCents > 0 ? (
                <strong>{formatMadCents(alert.amountCents)}</strong>
              ) : null}
            </StyledAlert>
          ))}

          <StyledErpWorkspaceSummary>
            <ErpWorkspaceSummaryItem
              label="Position bancaire"
              value={formatMadCents(forecast.currentCashCents)}
            />
            <ErpWorkspaceSummaryItem
              label="Solde à 13 semaines"
              value={formatMadCents(scenario.closingBalanceCents)}
            />
            <ErpWorkspaceSummaryItem
              label="Point bas"
              value={formatMadCents(scenario.minimumBalanceCents)}
            />
            <ErpWorkspaceSummaryItem
              label="Créances"
              value={formatMadCents(forecast.aging.receivables.totalCents)}
            />
            <ErpWorkspaceSummaryItem
              label="Dettes"
              value={formatMadCents(forecast.aging.payables.totalCents)}
            />
            <ErpWorkspaceSummaryItem
              label="Fiabilité banque"
              value={`${forecast.dataQuality.confirmedBankAccountCount}/${forecast.dataQuality.bankAccountCount}`}
            />
          </StyledErpWorkspaceSummary>

          <StyledErpWorkspacePanel>
            <StyledErpWorkspacePanelTitle>
              Prévision · encaissements{' '}
              {scenario.assumptions.inflowRateBasisPoints / 100}% · délai{' '}
              {scenario.assumptions.inflowDelayDays} j
            </StyledErpWorkspacePanelTitle>
            <ErpOperationalTable
              ariaLabel="Prévision de trésorerie"
              columns={weekColumns}
              rows={scenario.weeks}
              getRowKey={(row) => String(row.index)}
            />
          </StyledErpWorkspacePanel>

          <StyledTwoColumns>
            <AgingBlock
              title="Balance âgée clients"
              aging={forecast.aging.receivables}
            />
            <AgingBlock
              title="Balance âgée fournisseurs"
              aging={forecast.aging.payables}
            />
          </StyledTwoColumns>

          <StyledErpWorkspacePanel>
            <StyledErpWorkspacePanelTitle>
              Actions recommandées
            </StyledErpWorkspacePanelTitle>
            <StyledActions>
              {forecast.actions.map((action) => (
                <Link key={action.code} to={actionPaths[action.code]}>
                  <strong>{action.label}</strong>
                  <span>{action.description}</span>
                </Link>
              ))}
            </StyledActions>
          </StyledErpWorkspacePanel>

          <StyledErpWorkspacePanel>
            <StyledErpWorkspacePanelTitle>
              Échéances incluses
            </StyledErpWorkspacePanelTitle>
            <ErpOperationalTable
              ariaLabel="Échéances de trésorerie"
              columns={eventColumns}
              rows={forecast.events}
              getRowKey={(row) => row.id}
              emptyLabel="Aucune échéance sur l’horizon"
            />
          </StyledErpWorkspacePanel>
        </StyledErpWorkspaceContent>
      ) : null}
    </ErpPageShell>
  );
};
