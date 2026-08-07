import {
  ErpPageShell,
  type ErpPageShellState,
} from '@/erp-maroc/components/ErpPageShell';
import { styled } from '@linaria/react';
import { Link } from 'react-router-dom';
import { IconRefresh, type IconComponent } from 'twenty-ui/display';
import { Button } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';

export type ErpDashboardMetric = {
  id: string;
  label: string;
  value: string;
  to?: string;
};

export type ErpDashboardAction = {
  label: string;
  to: string;
  Icon: IconComponent;
};

export type ErpDashboardActionGroup = {
  id: string;
  label: string;
  actions: ErpDashboardAction[];
};

const StyledContent = styled.div`
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-height: 0;
  overflow: auto;
`;

const StyledMetrics = styled.section`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
`;

const StyledMetric = styled.div`
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  border-right: 1px solid ${themeCssVariables.border.color.light};
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[2]};
  min-height: 96px;
  padding: ${themeCssVariables.spacing[4]};

  a {
    color: inherit;
    display: flex;
    flex-direction: column;
    gap: ${themeCssVariables.spacing[2]};
    text-decoration: none;
  }
`;

const StyledMetricLabel = styled.span`
  color: ${themeCssVariables.font.color.secondary};
  font-size: ${themeCssVariables.font.size.sm};
`;

const StyledMetricValue = styled.strong`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.xl};
  font-weight: ${themeCssVariables.font.weight.semiBold};
  letter-spacing: 0;
`;

const StyledActionGroups = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
`;

const StyledActionGroup = styled.section`
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  border-right: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  flex-direction: column;
  min-height: 148px;
  padding: ${themeCssVariables.spacing[4]};
`;

const StyledActionGroupTitle = styled.h2`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.md};
  font-weight: ${themeCssVariables.font.weight.semiBold};
  letter-spacing: 0;
  margin: 0 0 ${themeCssVariables.spacing[2]};
`;

const StyledActionLink = styled(Link)`
  align-items: center;
  border-radius: ${themeCssVariables.border.radius.sm};
  color: ${themeCssVariables.font.color.secondary};
  display: flex;
  font-size: ${themeCssVariables.font.size.sm};
  gap: ${themeCssVariables.spacing[2]};
  min-height: 32px;
  padding: 0 ${themeCssVariables.spacing[2]};
  text-decoration: none;

  &:hover {
    background: ${themeCssVariables.background.transparent.light};
    color: ${themeCssVariables.font.color.primary};
  }
`;

export const ErpSpaceDashboard = ({
  title,
  description,
  state,
  metrics,
  actionGroups,
  onRetry,
}: {
  title: string;
  description: string;
  state: ErpPageShellState;
  metrics: ErpDashboardMetric[];
  actionGroups: ErpDashboardActionGroup[];
  onRetry: () => void;
}) => (
  <ErpPageShell
    title={title}
    description={description}
    state={state}
    loadingLabel={`Chargement de l'espace ${title}`}
    errorLabel={`L'espace ${title} est temporairement indisponible`}
    retryLabel="Réessayer"
    onRetry={onRetry}
    actions={
      state === 'ready' ? (
        <Button
          title="Actualiser"
          ariaLabel="Actualiser"
          Icon={IconRefresh}
          variant="secondary"
          onClick={onRetry}
        />
      ) : undefined
    }
  >
    <StyledContent>
      <StyledMetrics aria-label={`Indicateurs ${title}`}>
        {metrics.map((metric) => (
          <StyledMetric key={metric.id}>
            {metric.to === undefined ? (
              <>
                <StyledMetricLabel>{metric.label}</StyledMetricLabel>
                <StyledMetricValue>{metric.value}</StyledMetricValue>
              </>
            ) : (
              <Link to={metric.to} aria-label={metric.label}>
                <StyledMetricLabel>{metric.label}</StyledMetricLabel>
                <StyledMetricValue>{metric.value}</StyledMetricValue>
              </Link>
            )}
          </StyledMetric>
        ))}
      </StyledMetrics>
      <StyledActionGroups aria-label={`Accès rapides ${title}`}>
        {actionGroups.map((group) => (
          <StyledActionGroup key={group.id}>
            <StyledActionGroupTitle>{group.label}</StyledActionGroupTitle>
            {group.actions.map((action) => (
              <StyledActionLink key={action.to} to={action.to}>
                <action.Icon size={16} />
                <span>{action.label}</span>
              </StyledActionLink>
            ))}
          </StyledActionGroup>
        ))}
      </StyledActionGroups>
    </StyledContent>
  </ErpPageShell>
);
