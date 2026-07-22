import {
  ErpWorkspaceSummaryItem,
  StyledErpWorkspaceContent,
  StyledErpWorkspacePanel,
  StyledErpWorkspacePanelTitle,
  StyledErpWorkspaceSummary,
} from '@/erp-maroc/components/ErpComplianceUi';
import { ErpPageShell } from '@/erp-maroc/components/ErpPageShell';
import { useErpMarocContext } from '@/erp-maroc/context/useErpMarocContext';
import { erpMarocPaths } from '@/erp-maroc/navigation/erpMarocPaths';
import { formatMadCents } from '@/erp-maroc/utils/money';
import { styled } from '@linaria/react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  erpExecutiveDashboardSchema,
  type ErpExecutiveDashboard,
  type ErpExecutiveDashboardTarget,
} from 'twenty-shared/erp-maroc';
import { IconRefresh } from 'twenty-ui/display';
import { Button } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';

const StyledPeriod = styled.div`
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  color: ${themeCssVariables.font.color.secondary};
  display: flex;
  flex-wrap: wrap;
  font-size: ${themeCssVariables.font.size.sm};
  gap: ${themeCssVariables.spacing[4]};
  padding: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[3]};
`;

const StyledPerformance = styled.div`
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));

  > div {
    border-right: 1px solid ${themeCssVariables.border.color.light};
    display: flex;
    flex-direction: column;
    gap: ${themeCssVariables.spacing[1]};
    min-height: 58px;
    padding: ${themeCssVariables.spacing[3]};
  }

  span {
    color: ${themeCssVariables.font.color.tertiary};
    font-size: ${themeCssVariables.font.size.sm};
  }

  strong {
    color: ${themeCssVariables.font.color.primary};
    font-size: ${themeCssVariables.font.size.md};
    font-weight: ${themeCssVariables.font.weight.semiBold};
    letter-spacing: 0;
  }
`;

const StyledAlertList = styled.div`
  display: flex;
  flex-direction: column;
`;

const StyledAlert = styled(Link)<{
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
}>`
  align-items: center;
  background: ${({ severity }) =>
    severity === 'CRITICAL'
      ? themeCssVariables.background.danger
      : themeCssVariables.background.primary};
  border-top: 1px solid ${themeCssVariables.border.color.light};
  color: ${themeCssVariables.font.color.primary};
  display: grid;
  gap: ${themeCssVariables.spacing[2]};
  grid-template-columns: minmax(0, 1fr) auto;
  min-height: 48px;
  padding: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[3]};
  text-decoration: none;

  strong {
    display: block;
    font-weight: ${themeCssVariables.font.weight.semiBold};
  }

  span {
    color: ${themeCssVariables.font.color.secondary};
    font-size: ${themeCssVariables.font.size.sm};
  }

  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
`;

const StyledEmpty = styled.div`
  color: ${themeCssVariables.font.color.secondary};
  min-height: 48px;
  padding: ${themeCssVariables.spacing[3]};
`;

const StyledActions = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));

  a {
    border-right: 1px solid ${themeCssVariables.border.color.light};
    border-top: 1px solid ${themeCssVariables.border.color.light};
    color: ${themeCssVariables.font.color.primary};
    display: flex;
    flex-direction: column;
    gap: ${themeCssVariables.spacing[1]};
    min-height: 68px;
    padding: ${themeCssVariables.spacing[3]};
    text-decoration: none;
  }

  span {
    color: ${themeCssVariables.font.color.tertiary};
    font-size: ${themeCssVariables.font.size.sm};
  }
`;

const StyledQueues = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));

  a {
    align-items: center;
    border-right: 1px solid ${themeCssVariables.border.color.light};
    border-top: 1px solid ${themeCssVariables.border.color.light};
    color: ${themeCssVariables.font.color.primary};
    display: flex;
    gap: ${themeCssVariables.spacing[3]};
    justify-content: space-between;
    min-height: 44px;
    padding: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[3]};
    text-decoration: none;
  }

  strong {
    font-size: ${themeCssVariables.font.size.lg};
    font-weight: ${themeCssVariables.font.weight.semiBold};
  }
`;

const targetPaths: Record<ErpExecutiveDashboardTarget, string> = {
  TREASURY: erpMarocPaths.treasury,
  REMINDERS: erpMarocPaths.reminders,
  BANK: erpMarocPaths.bankStatements,
  PURCHASES: erpMarocPaths.purchaseOrders,
  INVENTORY: erpMarocPaths.inventory,
  FISCAL: erpMarocPaths.fiscal,
  APPROVALS: erpMarocPaths.approvals,
  MANAGEMENT: erpMarocPaths.management,
};

const formatBasisPoints = (basisPoints: number | null) => {
  if (basisPoints === null) return 'Non comparable';
  return new Intl.NumberFormat('fr-MA', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
    signDisplay: 'always',
  }).format(basisPoints / 10_000);
};

const formatRate = (basisPoints: number | null) =>
  basisPoints === null
    ? 'Non calculée'
    : new Intl.NumberFormat('fr-MA', {
        style: 'percent',
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      }).format(basisPoints / 10_000);

export const ErpMarocCockpitPage = () => {
  const { client } = useErpMarocContext();
  const [dashboard, setDashboard] = useState<ErpExecutiveDashboard | null>(
    null,
  );
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [generation, setGeneration] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setState('loading');
    client
      .request({
        method: 'GET',
        path: '/operations/executive-dashboard',
        schema: erpExecutiveDashboardSchema,
        signal: controller.signal,
      })
      .then((value) => {
        if (controller.signal.aborted) return;
        setDashboard(value);
        setState('ready');
      })
      .catch(() => {
        if (!controller.signal.aborted) setState('error');
      });
    return () => controller.abort();
  }, [client, generation]);

  const refresh = () => setGeneration((value) => value + 1);
  const queueLinks = dashboard
    ? [
        {
          label: 'Devis brouillons',
          count: dashboard.queues.draftQuotes,
          to: `${erpMarocPaths.quotes}?status=DRAFT`,
        },
        {
          label: 'Factures à envoyer',
          count: dashboard.queues.validatedInvoices,
          to: `${erpMarocPaths.invoices}?status=VALIDATED`,
        },
        {
          label: 'Factures en retard',
          count: dashboard.queues.overdueInvoices,
          to: `${erpMarocPaths.invoices}?status=OVERDUE`,
        },
        {
          label: 'Paiements à affecter',
          count: dashboard.queues.pendingAllocationPayments,
          to: `${erpMarocPaths.payments}?status=PENDING_ALLOCATION`,
        },
        {
          label: 'Relances à approuver',
          count: dashboard.queues.proposedReminders,
          to: `${erpMarocPaths.reminders}?status=PROPOSED`,
        },
        {
          label: 'Réconciliations requises',
          count: dashboard.queues.reconciliationRequired,
          to: `${erpMarocPaths.invoices}?delivery=RECONCILIATION_REQUIRED`,
        },
      ]
    : [];

  return (
    <ErpPageShell
      title="Cockpit dirigeant"
      description="Pilotage consolidé de Zowka"
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
      loadingLabel="Calcul des indicateurs"
      errorLabel="Le cockpit dirigeant est indisponible"
      retryLabel="Réessayer"
      onRetry={refresh}
    >
      {dashboard ? (
        <StyledErpWorkspaceContent>
          <StyledPeriod>
            <span>
              Période · {dashboard.period.currentStart} au{' '}
              {dashboard.period.currentEnd}
            </span>
            <span>
              Référence · {dashboard.period.previousStart} au{' '}
              {dashboard.period.previousEnd}
            </span>
            <span>
              Banque confirmée ·{' '}
              {dashboard.dataQuality.confirmedBankAccountCount}/
              {dashboard.dataQuality.bankAccountCount}
            </span>
          </StyledPeriod>

          <StyledErpWorkspaceSummary aria-label="Indicateurs dirigeants">
            <ErpWorkspaceSummaryItem
              label="Chiffre d'affaires HT net"
              value={formatMadCents(dashboard.performance.revenueCents)}
            />
            <ErpWorkspaceSummaryItem
              label="Évolution"
              value={formatBasisPoints(
                dashboard.performance.revenueChangeBasisPoints,
              )}
            />
            <ErpWorkspaceSummaryItem
              label="Marge brute livrée"
              value={formatMadCents(dashboard.performance.grossMarginCents)}
            />
            <ErpWorkspaceSummaryItem
              label="Taux de marge"
              value={formatRate(
                dashboard.performance.grossMarginRateBasisPoints,
              )}
            />
            <ErpWorkspaceSummaryItem
              label="Position bancaire"
              value={formatMadCents(dashboard.cash.currentCashCents)}
            />
            <ErpWorkspaceSummaryItem
              label="Trésorerie à 13 semaines"
              value={formatMadCents(dashboard.cash.forecastClosingCashCents)}
            />
            <ErpWorkspaceSummaryItem
              label="Créances échues"
              value={formatMadCents(dashboard.cash.overdueReceivablesCents)}
            />
            <ErpWorkspaceSummaryItem
              label="Stock valorisé"
              value={formatMadCents(dashboard.operations.stockValueCents)}
            />
          </StyledErpWorkspaceSummary>

          <StyledPerformance aria-label="Suivi de performance">
            <div>
              <span>Période précédente</span>
              <strong>
                {formatMadCents(dashboard.performance.previousRevenueCents)}
              </strong>
            </div>
            <div>
              <span>Objectif de chiffre d'affaires</span>
              <strong>
                {dashboard.performance.revenueBudgetCents === null
                  ? 'Non configuré'
                  : formatMadCents(dashboard.performance.revenueBudgetCents)}
              </strong>
            </div>
            <div>
              <span>Écart au budget</span>
              <strong>
                {dashboard.performance.revenueBudgetVarianceCents === null
                  ? 'Non disponible'
                  : formatMadCents(
                      dashboard.performance.revenueBudgetVarianceCents,
                    )}
              </strong>
            </div>
            <div>
              <span>Créances / dettes identifiées</span>
              <strong>
                {formatMadCents(dashboard.cash.receivablesCents)} /{' '}
                {formatMadCents(dashboard.cash.payablesCents)}
              </strong>
            </div>
          </StyledPerformance>

          <StyledErpWorkspacePanel>
            <StyledErpWorkspacePanelTitle>
              Alertes prioritaires
            </StyledErpWorkspacePanelTitle>
            <StyledAlertList>
              {dashboard.alerts.length === 0 ? (
                <StyledEmpty>Aucune alerte prioritaire</StyledEmpty>
              ) : (
                dashboard.alerts.map((alert) => (
                  <StyledAlert
                    key={alert.code}
                    to={targetPaths[alert.target]}
                    severity={alert.severity}
                  >
                    <div>
                      <strong>{alert.title}</strong>
                      <span>{alert.message}</span>
                    </div>
                    <strong>
                      {alert.amountCents > 0
                        ? formatMadCents(alert.amountCents)
                        : alert.count > 0
                          ? alert.count
                          : alert.severity}
                    </strong>
                  </StyledAlert>
                ))
              )}
            </StyledAlertList>
          </StyledErpWorkspacePanel>

          <StyledErpWorkspacePanel>
            <StyledErpWorkspacePanelTitle>
              Actions recommandées
            </StyledErpWorkspacePanelTitle>
            <StyledActions>
              {dashboard.actions.map((action) => (
                <Link key={action.code} to={targetPaths[action.target]}>
                  <strong>{action.label}</strong>
                  <span>{action.description}</span>
                </Link>
              ))}
            </StyledActions>
          </StyledErpWorkspacePanel>

          <StyledErpWorkspacePanel>
            <StyledErpWorkspacePanelTitle>
              Files opérationnelles
            </StyledErpWorkspacePanelTitle>
            <StyledQueues>
              {queueLinks.map((queue) => (
                <Link key={queue.label} to={queue.to}>
                  <span>{queue.label}</span>
                  <strong>{queue.count}</strong>
                </Link>
              ))}
            </StyledQueues>
          </StyledErpWorkspacePanel>
        </StyledErpWorkspaceContent>
      ) : null}
    </ErpPageShell>
  );
};
