import { erpMarocPaths } from '@/erp-maroc/navigation/erpMarocPaths';
import { styled } from '@linaria/react';
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { type HrOrganisationChart } from 'twenty-shared/erp-maroc';
import { IconChevronRight, IconHierarchy2 } from 'twenty-ui/display';
import { themeCssVariables } from 'twenty-ui/theme-constants';

type Props = {
  chart: HrOrganisationChart;
  query: string;
};

const StyledScroll = styled.div`
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
`;

const StyledOverview = styled.div`
  align-items: center;
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: grid;
  gap: ${themeCssVariables.spacing[3]};
  grid-template-columns: auto repeat(3, minmax(120px, 1fr));
  min-height: 58px;
  padding: 0 ${themeCssVariables.spacing[4]};
`;

const StyledOverviewIcon = styled.div`
  color: ${themeCssVariables.font.color.secondary};
`;

const StyledMetric = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const StyledMetricValue = styled.strong`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.lg};
  letter-spacing: 0;
`;

const StyledMuted = styled.span`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.sm};
`;

const StyledDepartment = styled.section<{ depth: number }>`
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  margin-left: ${({ depth }) => depth * 20}px;
`;

const StyledDepartmentHeader = styled.header`
  align-items: center;
  background: ${themeCssVariables.background.secondary};
  display: flex;
  justify-content: space-between;
  min-height: 42px;
  padding: 0 ${themeCssVariables.spacing[4]};
`;

const StyledDepartmentTitle = styled.strong`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.sm};
  letter-spacing: 0;
`;

const StyledTeamHeader = styled.div`
  align-items: center;
  border-top: 1px solid ${themeCssVariables.border.color.light};
  color: ${themeCssVariables.font.color.secondary};
  display: flex;
  font-size: ${themeCssVariables.font.size.sm};
  justify-content: space-between;
  min-height: 36px;
  padding: 0 ${themeCssVariables.spacing[4]} 0
    calc(${themeCssVariables.spacing[4]} + 18px);
`;

const StyledEmployee = styled(Link)`
  align-items: center;
  border-top: 1px solid ${themeCssVariables.border.color.light};
  color: ${themeCssVariables.font.color.primary};
  display: grid;
  gap: ${themeCssVariables.spacing[3]};
  grid-template-columns:
    minmax(200px, 1.2fr) minmax(180px, 1fr) minmax(180px, 0.8fr)
    auto;
  min-height: 46px;
  padding: 0 ${themeCssVariables.spacing[4]} 0
    calc(${themeCssVariables.spacing[4]} + 36px);
  text-decoration: none;

  &:hover {
    background: ${themeCssVariables.background.transparent.light};
  }
`;

const StyledName = styled.div`
  display: flex;
  flex-direction: column;
  min-width: 0;
`;

const StyledBadge = styled.span`
  background: ${themeCssVariables.tag.background.green};
  border-radius: ${themeCssVariables.border.radius.sm};
  color: ${themeCssVariables.tag.text.green};
  font-size: ${themeCssVariables.font.size.xs};
  padding: 2px ${themeCssVariables.spacing[1]};
  width: fit-content;
`;

const StyledEmpty = styled.div`
  color: ${themeCssVariables.font.color.secondary};
  padding: ${themeCssVariables.spacing[5]} ${themeCssVariables.spacing[4]};
`;

const departmentDepth = (
  departmentId: string,
  parentById: Map<string, string | null>,
) => {
  let depth = 0;
  let current = parentById.get(departmentId) ?? null;
  const visited = new Set<string>();
  while (current !== null && !visited.has(current) && depth < 6) {
    visited.add(current);
    depth += 1;
    current = parentById.get(current) ?? null;
  }
  return depth;
};

export const HrOrganisationChartPanel = ({ chart, query }: Props) => {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const employeesById = useMemo(
    () => new Map(chart.nodes.map((node) => [node.employeeId, node])),
    [chart.nodes],
  );
  const parentById = useMemo(
    () =>
      new Map(
        chart.departments.map((department) => [
          department.id,
          department.parentId,
        ]),
      ),
    [chart.departments],
  );
  const visibleNodes = useMemo(
    () =>
      chart.nodes.filter((node) => {
        if (normalizedQuery === '') return true;
        return [
          node.firstName,
          node.lastName,
          node.employeeNumber,
          node.jobTitle,
          node.department?.name,
          node.team?.name,
        ]
          .filter((value): value is string => Boolean(value))
          .some((value) => value.toLocaleLowerCase().includes(normalizedQuery));
      }),
    [chart.nodes, normalizedQuery],
  );
  const transverseTeams = useMemo(
    () => chart.teams.filter((team) => team.departmentId === null),
    [chart.teams],
  );

  const renderEmployee = (node: HrOrganisationChart['nodes'][number]) => {
    const manager =
      node.managerEmployeeId === null
        ? null
        : (employeesById.get(node.managerEmployeeId) ?? null);
    return (
      <StyledEmployee
        key={node.employeeId}
        to={erpMarocPaths.hrEmployeeDetail.replace(':id', node.employeeId)}
      >
        <StyledName>
          <strong>
            {node.firstName} {node.lastName}
          </strong>
          <StyledMuted>{node.employeeNumber}</StyledMuted>
        </StyledName>
        <span>{node.jobTitle}</span>
        <StyledName>
          <StyledMuted>Responsable</StyledMuted>
          <span>
            {manager === null
              ? '—'
              : `${manager.firstName} ${manager.lastName}`}
          </span>
        </StyledName>
        {node.twentyPersonId === null ? (
          <IconChevronRight size={16} />
        ) : (
          <StyledBadge>CRM lié</StyledBadge>
        )}
      </StyledEmployee>
    );
  };

  return (
    <StyledScroll>
      <StyledOverview>
        <StyledOverviewIcon>
          <IconHierarchy2 size={22} />
        </StyledOverviewIcon>
        <StyledMetric>
          <StyledMetricValue>{chart.nodes.length}</StyledMetricValue>
          <StyledMuted>Collaborateurs visibles</StyledMuted>
        </StyledMetric>
        <StyledMetric>
          <StyledMetricValue>{chart.departments.length}</StyledMetricValue>
          <StyledMuted>Départements</StyledMuted>
        </StyledMetric>
        <StyledMetric>
          <StyledMetricValue>{chart.teams.length}</StyledMetricValue>
          <StyledMuted>Équipes</StyledMuted>
        </StyledMetric>
      </StyledOverview>
      {chart.departments.map((department) => {
        const departmentNodes = visibleNodes.filter(
          (node) => node.department?.id === department.id,
        );
        const departmentTeams = chart.teams.filter(
          (team) => team.departmentId === department.id,
        );
        if (
          normalizedQuery !== '' &&
          departmentNodes.length === 0 &&
          !department.name.toLocaleLowerCase().includes(normalizedQuery)
        ) {
          return null;
        }
        return (
          <StyledDepartment
            key={department.id}
            depth={departmentDepth(department.id, parentById)}
          >
            <StyledDepartmentHeader>
              <StyledDepartmentTitle>
                {department.code} · {department.name}
              </StyledDepartmentTitle>
              <StyledMuted>
                {department.employeeCount} collaborateur(s)
              </StyledMuted>
            </StyledDepartmentHeader>
            {departmentTeams.map((team) => {
              const teamNodes = departmentNodes.filter(
                (node) => node.team?.id === team.id,
              );
              const manager =
                team.managerEmployeeId === null
                  ? null
                  : (employeesById.get(team.managerEmployeeId) ?? null);
              return (
                <div key={team.id}>
                  <StyledTeamHeader>
                    <strong>
                      {team.code} · {team.name}
                    </strong>
                    <span>
                      {manager === null
                        ? `${team.employeeCount} membre(s)`
                        : `Responsable: ${manager.firstName} ${manager.lastName}`}
                    </span>
                  </StyledTeamHeader>
                  {teamNodes.map(renderEmployee)}
                </div>
              );
            })}
            {departmentNodes
              .filter((node) => node.team === null)
              .map(renderEmployee)}
          </StyledDepartment>
        );
      })}
      {transverseTeams.map((team) => {
        const teamNodes = visibleNodes.filter(
          (node) => node.department === null && node.team?.id === team.id,
        );
        if (
          normalizedQuery !== '' &&
          teamNodes.length === 0 &&
          !team.name.toLocaleLowerCase().includes(normalizedQuery)
        ) {
          return null;
        }
        const manager =
          team.managerEmployeeId === null
            ? null
            : (employeesById.get(team.managerEmployeeId) ?? null);
        return (
          <StyledDepartment key={team.id} depth={0}>
            <StyledDepartmentHeader>
              <StyledDepartmentTitle>
                Équipe transverse · {team.code} · {team.name}
              </StyledDepartmentTitle>
              <StyledMuted>
                {manager === null
                  ? `${team.employeeCount} membre(s)`
                  : `Responsable: ${manager.firstName} ${manager.lastName}`}
              </StyledMuted>
            </StyledDepartmentHeader>
            {teamNodes.map(renderEmployee)}
          </StyledDepartment>
        );
      })}
      {visibleNodes.filter(
        (node) => node.department === null && node.team === null,
      ).length === 0 ? null : (
        <StyledDepartment depth={0}>
          <StyledDepartmentHeader>
            <StyledDepartmentTitle>Non rattachés</StyledDepartmentTitle>
            <StyledMuted>{chart.unassignedCount} collaborateur(s)</StyledMuted>
          </StyledDepartmentHeader>
          {visibleNodes
            .filter((node) => node.department === null && node.team === null)
            .map(renderEmployee)}
        </StyledDepartment>
      )}
      {visibleNodes.length === 0 ? (
        <StyledEmpty>
          Aucun collaborateur ne correspond à la recherche.
        </StyledEmpty>
      ) : null}
    </StyledScroll>
  );
};
