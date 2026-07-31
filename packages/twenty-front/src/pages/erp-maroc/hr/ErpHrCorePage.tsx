import { ErpFormDrawer } from '@/erp-maroc/components/ErpFormDrawer';
import {
  ErpOperationalTable,
  type ErpOperationalTableColumn,
} from '@/erp-maroc/components/ErpOperationalTable';
import { ErpPageShell } from '@/erp-maroc/components/ErpPageShell';
import { ErpStatusBadge } from '@/erp-maroc/components/ErpStatusBadge';
import { useErpMarocContext } from '@/erp-maroc/context/useErpMarocContext';
import { erpMarocPaths } from '@/erp-maroc/navigation/erpMarocPaths';
import { styled } from '@linaria/react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  hrAccessContextSchema,
  hrCostCenterListSchema,
  hrCostCenterSchema,
  hrCoreSummarySchema,
  hrDepartmentListSchema,
  hrDepartmentSchema,
  hrDeadlineCenterSchema,
  hrEmployeeListSchema,
  hrEstablishmentListSchema,
  hrEstablishmentSchema,
  hrGradeListSchema,
  hrGradeSchema,
  hrJobPositionListSchema,
  hrJobPositionSchema,
  hrOrganisationChartSchema,
  hrTeamListSchema,
  hrTeamSchema,
  hrWorkLocationListSchema,
  hrWorkLocationSchema,
  type HrCoreSummary,
  type HrAccessContext,
  type HrCostCenter,
  type HrDepartment,
  type HrDeadlineItem,
  type HrEmployeeListItem,
  type HrEstablishment,
  type HrGrade,
  type HrJobPosition,
  type HrOrganisationChart,
  type HrTeam,
  type HrWorkLocation,
} from 'twenty-shared/erp-maroc';
import {
  IconChevronRight,
  IconFileImport,
  IconPlus,
  IconRefresh,
  IconSearch,
} from 'twenty-ui/display';
import { Button } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import { HrAccessManagementPanel } from './HrAccessManagementPanel';
import { HrEmployeeImportPanel } from './HrEmployeeImportPanel';
import { HrLifecyclePanel } from './HrLifecyclePanel';
import { HrLeaveManagementPanel } from './HrLeaveManagementPanel';
import { HrMonthlyClosingPanel } from './HrMonthlyClosingPanel';
import { HrOrganisationChartPanel } from './HrOrganisationChartPanel';
import { HrTimeAttendancePanel } from './HrTimeAttendancePanel';

const StyledActionLink = styled(Link)`
  align-items: center;
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.sm};
  color: ${themeCssVariables.font.color.secondary};
  display: inline-flex;
  height: 30px;
  justify-content: center;
  text-decoration: none;
  width: 30px;

  &:hover {
    background: ${themeCssVariables.background.transparent.light};
    color: ${themeCssVariables.font.color.primary};
  }
`;

type View =
  | 'employees'
  | 'establishments'
  | 'grades'
  | 'costCenters'
  | 'teams'
  | 'workLocations'
  | 'departments'
  | 'positions'
  | 'organisationChart'
  | 'deadlines'
  | 'journeys'
  | 'attendance'
  | 'leave'
  | 'monthlyClosing'
  | 'access';
type LoadState = 'loading' | 'ready' | 'error';
type StructureView = Exclude<
  View,
  | 'employees'
  | 'organisationChart'
  | 'deadlines'
  | 'journeys'
  | 'access'
  | 'attendance'
  | 'leave'
  | 'monthlyClosing'
>;

const EMPTY_SUMMARY: HrCoreSummary = {
  activeEmployees: 0,
  establishments: 0,
  grades: 0,
  costCenters: 0,
  departments: 0,
  jobPositions: 0,
  activeContracts: 0,
  draftAmendments: 0,
  activeJourneys: 0,
};

const EMPTY_ORGANISATION_CHART: HrOrganisationChart = {
  generatedAt: new Date(0).toISOString(),
  departments: [],
  teams: [],
  nodes: [],
  unassignedCount: 0,
};

const StyledMetrics = styled.section`
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: grid;
  flex: 0 0 auto;
  grid-template-columns: repeat(10, minmax(120px, 1fr));
  overflow-x: auto;
`;

const StyledMetric = styled.div`
  border-right: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[1]};
  min-width: 120px;
  padding: ${themeCssVariables.spacing[3]};
`;

const StyledMetricLabel = styled.span`
  color: ${themeCssVariables.font.color.secondary};
  font-size: ${themeCssVariables.font.size.sm};
`;

const StyledMetricValue = styled.strong`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.xl};
  letter-spacing: 0;
`;

const StyledToolbar = styled.div`
  align-items: center;
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  flex: 0 0 auto;
  gap: ${themeCssVariables.spacing[3]};
  justify-content: space-between;
  min-height: 44px;
  overflow-x: auto;
  padding: 0 ${themeCssVariables.spacing[3]};
`;

const StyledTabs = styled.div`
  display: flex;
  gap: ${themeCssVariables.spacing[1]};
`;

const StyledTab = styled.button<{ active: boolean }>`
  background: ${({ active }) =>
    active
      ? themeCssVariables.background.quaternary
      : themeCssVariables.background.transparent.light};
  border: 0;
  border-radius: ${themeCssVariables.border.radius.sm};
  color: ${({ active }) =>
    active
      ? themeCssVariables.font.color.primary
      : themeCssVariables.font.color.secondary};
  cursor: pointer;
  font-size: ${themeCssVariables.font.size.sm};
  height: 30px;
  padding: 0 ${themeCssVariables.spacing[2]};
  white-space: nowrap;
`;

const StyledSearch = styled.label`
  align-items: center;
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.sm};
  color: ${themeCssVariables.font.color.tertiary};
  display: flex;
  flex: 0 0 240px;
  gap: ${themeCssVariables.spacing[1]};
  height: 30px;
  padding: 0 ${themeCssVariables.spacing[2]};
`;

const StyledSearchInput = styled.input`
  background: transparent;
  border: 0;
  color: ${themeCssVariables.font.color.primary};
  flex: 1;
  font-family: inherit;
  font-size: ${themeCssVariables.font.size.sm};
  min-width: 0;
  outline: none;
`;

const StyledPrimary = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
`;

const StyledSecondary = styled.span`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.sm};
`;

const StyledCode = styled.code`
  color: ${themeCssVariables.font.color.secondary};
  font-family: monospace;
`;

const StyledDrawerForm = styled.form`
  display: grid;
  gap: ${themeCssVariables.spacing[3]};
  overflow-y: auto;
  padding: ${themeCssVariables.spacing[4]};
`;

const StyledField = styled.label`
  color: ${themeCssVariables.font.color.secondary};
  display: grid;
  font-size: ${themeCssVariables.font.size.sm};
  gap: ${themeCssVariables.spacing[1]};
`;

const fieldStyles = `
  background: ${themeCssVariables.background.primary};
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.sm};
  box-sizing: border-box;
  color: ${themeCssVariables.font.color.primary};
  font: inherit;
  height: 34px;
  padding: 0 ${themeCssVariables.spacing[2]};
  width: 100%;
`;

const StyledInput = styled.input`
  ${fieldStyles}
`;

const StyledSelect = styled.select`
  ${fieldStyles}
`;

const StyledCheckbox = styled.label`
  align-items: center;
  color: ${themeCssVariables.font.color.primary};
  display: flex;
  font-size: ${themeCssVariables.font.size.sm};
  gap: ${themeCssVariables.spacing[2]};
`;

const StyledError = styled.div`
  color: ${themeCssVariables.color.red};
  font-size: ${themeCssVariables.font.size.sm};
`;

const viewLabels: Record<View, string> = {
  employees: 'Collaborateurs',
  establishments: 'Établissements',
  grades: 'Grades',
  costCenters: 'Centres de coûts',
  teams: 'Équipes',
  workLocations: 'Lieux',
  departments: 'Départements',
  positions: 'Postes',
  organisationChart: 'Organigramme',
  deadlines: 'Échéances',
  journeys: 'Parcours RH',
  attendance: 'Présences',
  leave: 'Congés',
  monthlyClosing: 'Clôture mensuelle',
  access: 'Accès RH',
};

const isStructureView = (view: View): view is StructureView =>
  view !== 'employees' &&
  view !== 'organisationChart' &&
  view !== 'deadlines' &&
  view !== 'journeys' &&
  view !== 'attendance' &&
  view !== 'leave' &&
  view !== 'monthlyClosing' &&
  view !== 'access';

export const ErpHrCorePage = () => {
  const { client } = useErpMarocContext();
  const [view, setView] = useState<View>('employees');
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [summary, setSummary] = useState(EMPTY_SUMMARY);
  const [employees, setEmployees] = useState<HrEmployeeListItem[]>([]);
  const [establishments, setEstablishments] = useState<HrEstablishment[]>([]);
  const [grades, setGrades] = useState<HrGrade[]>([]);
  const [costCenters, setCostCenters] = useState<HrCostCenter[]>([]);
  const [teams, setTeams] = useState<HrTeam[]>([]);
  const [workLocations, setWorkLocations] = useState<HrWorkLocation[]>([]);
  const [departments, setDepartments] = useState<HrDepartment[]>([]);
  const [positions, setPositions] = useState<HrJobPosition[]>([]);
  const [organisationChart, setOrganisationChart] =
    useState<HrOrganisationChart>(EMPTY_ORGANISATION_CHART);
  const [deadlines, setDeadlines] = useState<HrDeadlineItem[]>([]);
  const [access, setAccess] = useState<HrAccessContext | null>(null);
  const [query, setQuery] = useState('');
  const [drawer, setDrawer] = useState<StructureView | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [form, setForm] = useState({
    code: '',
    name: '',
    city: '',
    relatedId: '',
    secondaryId: '',
    detail: '',
    level: '',
    isHeadOffice: false,
  });

  const canManage = access?.canManageStructure ?? false;
  const canImport =
    access?.canWriteContracts === true &&
    (access.isSystemAdministrator || access.populationScope === 'ALL');

  const load = useCallback(async () => {
    setLoadState('loading');
    try {
      const [
        nextAccess,
        nextSummary,
        nextEmployees,
        nextEstablishments,
        nextGrades,
        nextCostCenters,
        nextTeams,
        nextWorkLocations,
        nextDepartments,
        nextPositions,
        nextOrganisationChart,
        nextDeadlines,
      ] = await Promise.all([
        client.request({
          method: 'GET',
          path: '/hr-core/access/me',
          schema: hrAccessContextSchema,
        }),
        client.request({
          method: 'GET',
          path: '/hr-core/summary',
          schema: hrCoreSummarySchema,
        }),
        client.request({
          method: 'GET',
          path: '/hr-core/employees',
          schema: hrEmployeeListSchema,
        }),
        client.request({
          method: 'GET',
          path: '/hr-core/establishments',
          schema: hrEstablishmentListSchema,
        }),
        client.request({
          method: 'GET',
          path: '/hr-core/grades',
          schema: hrGradeListSchema,
        }),
        client.request({
          method: 'GET',
          path: '/hr-core/cost-centers',
          schema: hrCostCenterListSchema,
        }),
        client.request({
          method: 'GET',
          path: '/hr-core/teams',
          schema: hrTeamListSchema,
        }),
        client.request({
          method: 'GET',
          path: '/hr-core/work-locations',
          schema: hrWorkLocationListSchema,
        }),
        client.request({
          method: 'GET',
          path: '/hr-core/departments',
          schema: hrDepartmentListSchema,
        }),
        client.request({
          method: 'GET',
          path: '/hr-core/job-positions',
          schema: hrJobPositionListSchema,
        }),
        client.request({
          method: 'GET',
          path: '/hr-core/organisation-chart',
          schema: hrOrganisationChartSchema,
        }),
        client.request({
          method: 'GET',
          path: '/hr-core/deadlines',
          schema: hrDeadlineCenterSchema,
        }),
      ]);
      setAccess(nextAccess);
      setSummary(nextSummary);
      setEmployees(nextEmployees);
      setEstablishments(nextEstablishments);
      setGrades(nextGrades);
      setCostCenters(nextCostCenters);
      setTeams(nextTeams);
      setWorkLocations(nextWorkLocations);
      setDepartments(nextDepartments);
      setPositions(nextPositions);
      setOrganisationChart(nextOrganisationChart);
      setDeadlines(nextDeadlines.items);
      setLoadState('ready');
    } catch {
      setLoadState('error');
    }
  }, [client]);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreateDrawer = (target: StructureView) => {
    setMutationError(null);
    setForm({
      code: '',
      name: '',
      city: '',
      relatedId: '',
      secondaryId: '',
      detail: '',
      level: '',
      isHeadOffice: false,
    });
    setDrawer(target);
  };

  const submitStructure = async () => {
    if (drawer === null || form.code.trim() === '' || form.name.trim() === '') {
      setMutationError('Le code et le libellé sont obligatoires.');
      return;
    }
    const config = (() => {
      switch (drawer) {
        case 'establishments':
          return {
            path: '/hr-core/establishments',
            schema: hrEstablishmentSchema,
            body: {
              code: form.code,
              name: form.name,
              city: form.city || null,
              isHeadOffice: form.isHeadOffice,
            },
          };
        case 'grades':
          return {
            path: '/hr-core/grades',
            schema: hrGradeSchema,
            body: {
              code: form.code,
              name: form.name,
              level: form.level === '' ? null : Number(form.level),
              description: form.detail || null,
            },
          };
        case 'costCenters':
          return {
            path: '/hr-core/cost-centers',
            schema: hrCostCenterSchema,
            body: {
              code: form.code,
              name: form.name,
              description: form.detail || null,
            },
          };
        case 'teams':
          return {
            path: '/hr-core/teams',
            schema: hrTeamSchema,
            body: {
              code: form.code,
              name: form.name,
              departmentId: form.relatedId || null,
              managerEmployeeId: form.secondaryId || null,
            },
          };
        case 'workLocations':
          return {
            path: '/hr-core/work-locations',
            schema: hrWorkLocationSchema,
            body: {
              code: form.code,
              name: form.name,
              establishmentId: form.relatedId || null,
              type: form.detail || 'ONSITE',
              city: form.city || null,
            },
          };
        case 'departments':
          return {
            path: '/hr-core/departments',
            schema: hrDepartmentSchema,
            body: {
              code: form.code,
              name: form.name,
              establishmentId: form.relatedId || null,
              costCenterId: form.secondaryId || null,
            },
          };
        case 'positions':
          return {
            path: '/hr-core/job-positions',
            schema: hrJobPositionSchema,
            body: {
              code: form.code,
              title: form.name,
              departmentId: form.relatedId || null,
              gradeId: form.secondaryId || null,
            },
          };
      }
    })();
    setBusy(true);
    setMutationError(null);
    try {
      const intent = client.createMutationIntent(
        {
          method: 'POST',
          path: config.path,
          schema: config.schema,
          body: config.body,
        },
        { idempotency: 'required' },
      );
      await intent.execute();
      setDrawer(null);
      await load();
    } catch {
      setMutationError("La création n'a pas abouti.");
    } finally {
      setBusy(false);
    }
  };

  const normalizedQuery = query.trim().toLocaleLowerCase('fr');
  const matches = useCallback(
    (...values: Array<string | null | undefined>) =>
      normalizedQuery === '' ||
      values.some((value) =>
        value?.toLocaleLowerCase('fr').includes(normalizedQuery),
      ),
    [normalizedQuery],
  );

  const filteredEmployees = useMemo(
    () =>
      employees.filter((employee) =>
        matches(
          employee.employeeNumber,
          employee.firstName,
          employee.lastName,
          employee.email,
          employee.jobTitle,
          employee.department,
        ),
      ),
    [employees, matches],
  );
  const filteredEstablishments = useMemo(
    () =>
      establishments.filter((item) => matches(item.code, item.name, item.city)),
    [establishments, matches],
  );
  const filteredGrades = useMemo(
    () =>
      grades.filter((item) => matches(item.code, item.name, item.description)),
    [grades, matches],
  );
  const filteredCostCenters = useMemo(
    () =>
      costCenters.filter((item) =>
        matches(item.code, item.name, item.description),
      ),
    [costCenters, matches],
  );
  const filteredTeams = useMemo(
    () =>
      teams.filter((item) =>
        matches(
          item.code,
          item.name,
          item.department?.name,
          item.managerEmployee?.lastName,
        ),
      ),
    [matches, teams],
  );
  const filteredWorkLocations = useMemo(
    () =>
      workLocations.filter((item) =>
        matches(
          item.code,
          item.name,
          item.city,
          item.type,
          item.establishment?.name,
        ),
      ),
    [matches, workLocations],
  );
  const filteredDepartments = useMemo(
    () =>
      departments.filter((item) =>
        matches(
          item.code,
          item.name,
          item.costCenterCode,
          item.costCenter?.name,
          item.establishment?.name,
        ),
      ),
    [departments, matches],
  );
  const filteredPositions = useMemo(
    () =>
      positions.filter((item) =>
        matches(
          item.code,
          item.title,
          item.grade,
          item.gradeRef?.name,
          item.department?.name,
        ),
      ),
    [matches, positions],
  );
  const filteredDeadlines = useMemo(
    () =>
      deadlines.filter((item) =>
        matches(
          item.title,
          item.kind,
          item.severity,
          item.employee.employeeNumber,
          item.employee.firstName,
          item.employee.lastName,
        ),
      ),
    [deadlines, matches],
  );

  const employeeColumns: ErpOperationalTableColumn<HrEmployeeListItem>[] = [
    {
      key: 'employee',
      header: 'Collaborateur',
      width: '280px',
      render: (employee) => (
        <StyledPrimary>
          <span>
            {employee.firstName} {employee.lastName}
          </span>
          <StyledSecondary>{employee.employeeNumber}</StyledSecondary>
        </StyledPrimary>
      ),
    },
    {
      key: 'role',
      header: 'Fonction',
      width: '240px',
      render: (employee) =>
        employee.employmentContracts[0]?.jobTitleSnapshot ?? employee.jobTitle,
    },
    {
      key: 'department',
      header: 'Département',
      width: '200px',
      render: (employee) =>
        employee.employmentContracts[0]?.department?.name ??
        employee.department ??
        '—',
    },
    {
      key: 'contract',
      header: 'Contrat',
      width: '150px',
      render: (employee) =>
        employee.employmentContracts[0] === undefined ? (
          <ErpStatusBadge label="À formaliser" tone="warning" />
        ) : (
          <ErpStatusBadge
            label={employee.employmentContracts[0].contractType}
            tone="success"
          />
        ),
    },
    {
      key: 'status',
      header: 'Statut',
      width: '130px',
      render: (employee) => (
        <ErpStatusBadge
          label={employee.status === 'ACTIVE' ? 'Actif' : employee.status}
          tone={employee.status === 'ACTIVE' ? 'success' : 'neutral'}
        />
      ),
    },
    {
      key: 'action',
      header: '',
      width: '64px',
      align: 'right',
      render: (employee) => (
        <StyledActionLink
          to={erpMarocPaths.hrEmployeeDetail.replace(':id', employee.id)}
          title="Ouvrir le dossier salarié"
          aria-label={`Ouvrir le dossier de ${employee.firstName} ${employee.lastName}`}
        >
          <IconChevronRight size={16} />
        </StyledActionLink>
      ),
    },
  ];

  const establishmentColumns: ErpOperationalTableColumn<HrEstablishment>[] = [
    {
      key: 'code',
      header: 'Code',
      width: '140px',
      render: (item) => <StyledCode>{item.code}</StyledCode>,
    },
    {
      key: 'name',
      header: 'Établissement',
      width: '300px',
      render: (item) => item.name,
    },
    {
      key: 'city',
      header: 'Ville',
      width: '180px',
      render: (item) => item.city ?? '—',
    },
    {
      key: 'departments',
      header: 'Départements',
      width: '140px',
      align: 'right',
      render: (item) => item._count?.departments ?? 0,
    },
    {
      key: 'status',
      header: 'Statut',
      width: '140px',
      render: (item) => (
        <ErpStatusBadge
          label={
            item.isHeadOffice ? 'Siège' : item.isActive ? 'Actif' : 'Inactif'
          }
          tone={item.isActive ? 'success' : 'neutral'}
        />
      ),
    },
  ];

  const gradeColumns: ErpOperationalTableColumn<HrGrade>[] = [
    {
      key: 'code',
      header: 'Code',
      width: '140px',
      render: (item) => <StyledCode>{item.code}</StyledCode>,
    },
    {
      key: 'name',
      header: 'Grade',
      width: '320px',
      render: (item) => item.name,
    },
    {
      key: 'level',
      header: 'Niveau',
      width: '120px',
      align: 'right',
      render: (item) => item.level ?? '—',
    },
    {
      key: 'positions',
      header: 'Postes',
      width: '120px',
      align: 'right',
      render: (item) => item._count?.jobPositions ?? 0,
    },
    {
      key: 'status',
      header: 'Statut',
      width: '140px',
      render: (item) => (
        <ErpStatusBadge
          label={item.isActive ? 'Actif' : 'Inactif'}
          tone={item.isActive ? 'success' : 'neutral'}
        />
      ),
    },
  ];

  const costCenterColumns: ErpOperationalTableColumn<HrCostCenter>[] = [
    {
      key: 'code',
      header: 'Code analytique',
      width: '180px',
      render: (item) => <StyledCode>{item.code}</StyledCode>,
    },
    {
      key: 'name',
      header: 'Centre de coûts',
      width: '360px',
      render: (item) => item.name,
    },
    {
      key: 'departments',
      header: 'Départements',
      width: '140px',
      align: 'right',
      render: (item) => item._count?.departments ?? 0,
    },
    {
      key: 'status',
      header: 'Statut',
      width: '140px',
      render: (item) => (
        <ErpStatusBadge
          label={item.isActive ? 'Actif' : 'Inactif'}
          tone={item.isActive ? 'success' : 'neutral'}
        />
      ),
    },
  ];

  const teamColumns: ErpOperationalTableColumn<HrTeam>[] = [
    {
      key: 'code',
      header: 'Code',
      width: '140px',
      render: (item) => <StyledCode>{item.code}</StyledCode>,
    },
    {
      key: 'name',
      header: 'Équipe',
      width: '280px',
      render: (item) => item.name,
    },
    {
      key: 'department',
      header: 'Département',
      width: '220px',
      render: (item) => item.department?.name ?? 'Transverse',
    },
    {
      key: 'manager',
      header: 'Responsable',
      width: '220px',
      render: (item) =>
        item.managerEmployee === null || item.managerEmployee === undefined
          ? '—'
          : `${item.managerEmployee.firstName} ${item.managerEmployee.lastName}`,
    },
    {
      key: 'assignments',
      header: 'Affectations',
      width: '120px',
      align: 'right',
      render: (item) => item._count?.employeeAssignments ?? 0,
    },
  ];

  const workLocationColumns: ErpOperationalTableColumn<HrWorkLocation>[] = [
    {
      key: 'code',
      header: 'Code',
      width: '140px',
      render: (item) => <StyledCode>{item.code}</StyledCode>,
    },
    {
      key: 'name',
      header: 'Lieu de travail',
      width: '300px',
      render: (item) => item.name,
    },
    {
      key: 'type',
      header: 'Mode',
      width: '150px',
      render: (item) => item.type,
    },
    {
      key: 'city',
      header: 'Ville',
      width: '180px',
      render: (item) => item.city ?? '—',
    },
    {
      key: 'assignments',
      header: 'Affectations',
      width: '120px',
      align: 'right',
      render: (item) => item._count?.employeeAssignments ?? 0,
    },
  ];

  const departmentColumns: ErpOperationalTableColumn<HrDepartment>[] = [
    {
      key: 'code',
      header: 'Code',
      width: '140px',
      render: (item) => <StyledCode>{item.code}</StyledCode>,
    },
    {
      key: 'name',
      header: 'Département',
      width: '280px',
      render: (item) => item.name,
    },
    {
      key: 'establishment',
      header: 'Établissement',
      width: '240px',
      render: (item) => item.establishment?.name ?? 'Tous',
    },
    {
      key: 'costCenter',
      header: 'Centre de coût',
      width: '160px',
      render: (item) =>
        item.costCenter === null || item.costCenter === undefined
          ? (item.costCenterCode ?? '—')
          : `${item.costCenter.code} · ${item.costCenter.name}`,
    },
    {
      key: 'positions',
      header: 'Postes',
      width: '120px',
      align: 'right',
      render: (item) => item._count?.jobPositions ?? 0,
    },
  ];

  const positionColumns: ErpOperationalTableColumn<HrJobPosition>[] = [
    {
      key: 'code',
      header: 'Code',
      width: '140px',
      render: (item) => <StyledCode>{item.code}</StyledCode>,
    },
    {
      key: 'title',
      header: 'Poste',
      width: '320px',
      render: (item) => item.title,
    },
    {
      key: 'department',
      header: 'Département',
      width: '240px',
      render: (item) => item.department?.name ?? 'Non rattaché',
    },
    {
      key: 'grade',
      header: 'Grade',
      width: '160px',
      render: (item) => item.gradeRef?.name ?? item.grade ?? '—',
    },
    {
      key: 'contracts',
      header: 'Contrats',
      width: '120px',
      align: 'right',
      render: (item) => item._count?.employmentContracts ?? 0,
    },
  ];

  const deadlineColumns: ErpOperationalTableColumn<HrDeadlineItem>[] = [
    {
      key: 'employee',
      header: 'Collaborateur',
      width: '260px',
      render: (item) => (
        <StyledPrimary>
          <span>
            {item.employee.firstName} {item.employee.lastName}
          </span>
          <StyledSecondary>{item.employee.employeeNumber}</StyledSecondary>
        </StyledPrimary>
      ),
    },
    {
      key: 'title',
      header: 'Échéance',
      width: '340px',
      render: (item) => (
        <StyledPrimary>
          <span>{item.title}</span>
          <StyledSecondary>
            {item.kind === 'DOCUMENT'
              ? 'Document RH'
              : item.kind === 'CONTRACT_END'
                ? 'Fin de contrat'
                : 'Période d’essai'}
          </StyledSecondary>
        </StyledPrimary>
      ),
    },
    {
      key: 'date',
      header: 'Date',
      width: '150px',
      render: (item) => item.dueDate ?? 'À fournir',
    },
    {
      key: 'status',
      header: 'Priorité',
      width: '170px',
      render: (item) => (
        <ErpStatusBadge
          label={
            item.severity === 'MISSING'
              ? 'Pièce manquante'
              : item.severity === 'OVERDUE'
                ? 'En retard'
                : 'À venir'
          }
          tone={
            item.severity === 'UPCOMING'
              ? 'warning'
              : item.severity === 'MISSING'
                ? 'danger'
                : 'danger'
          }
        />
      ),
    },
    {
      key: 'action',
      header: '',
      width: '64px',
      align: 'right',
      render: (item) => (
        <StyledActionLink
          to={erpMarocPaths.hrEmployeeDetail.replace(':id', item.employee.id)}
          title="Ouvrir le dossier salarié"
          aria-label={`Ouvrir le dossier de ${item.employee.firstName} ${item.employee.lastName}`}
        >
          <IconChevronRight size={16} />
        </StyledActionLink>
      ),
    },
  ];

  const table =
    view === 'employees' ? (
      <ErpOperationalTable
        ariaLabel="Collaborateurs"
        columns={employeeColumns}
        rows={filteredEmployees}
        getRowKey={(row) => row.id}
        state={loadState}
        loadingLabel="Chargement des collaborateurs"
        emptyLabel="Aucun collaborateur"
        errorLabel="Impossible de charger les collaborateurs"
        onRetry={() => void load()}
      />
    ) : view === 'establishments' ? (
      <ErpOperationalTable
        ariaLabel="Établissements"
        columns={establishmentColumns}
        rows={filteredEstablishments}
        getRowKey={(row) => row.id}
        state={loadState}
        emptyLabel="Aucun établissement"
        onRetry={() => void load()}
      />
    ) : view === 'grades' ? (
      <ErpOperationalTable
        ariaLabel="Grades"
        columns={gradeColumns}
        rows={filteredGrades}
        getRowKey={(row) => row.id}
        state={loadState}
        emptyLabel="Aucun grade"
        onRetry={() => void load()}
      />
    ) : view === 'costCenters' ? (
      <ErpOperationalTable
        ariaLabel="Centres de coûts"
        columns={costCenterColumns}
        rows={filteredCostCenters}
        getRowKey={(row) => row.id}
        state={loadState}
        emptyLabel="Aucun centre de coûts"
        onRetry={() => void load()}
      />
    ) : view === 'teams' ? (
      <ErpOperationalTable
        ariaLabel="Équipes"
        columns={teamColumns}
        rows={filteredTeams}
        getRowKey={(row) => row.id}
        state={loadState}
        emptyLabel="Aucune équipe"
        onRetry={() => void load()}
      />
    ) : view === 'workLocations' ? (
      <ErpOperationalTable
        ariaLabel="Lieux de travail"
        columns={workLocationColumns}
        rows={filteredWorkLocations}
        getRowKey={(row) => row.id}
        state={loadState}
        emptyLabel="Aucun lieu de travail"
        onRetry={() => void load()}
      />
    ) : view === 'departments' ? (
      <ErpOperationalTable
        ariaLabel="Départements"
        columns={departmentColumns}
        rows={filteredDepartments}
        getRowKey={(row) => row.id}
        state={loadState}
        emptyLabel="Aucun département"
        onRetry={() => void load()}
      />
    ) : view === 'positions' ? (
      <ErpOperationalTable
        ariaLabel="Postes"
        columns={positionColumns}
        rows={filteredPositions}
        getRowKey={(row) => row.id}
        state={loadState}
        emptyLabel="Aucun poste"
        onRetry={() => void load()}
      />
    ) : view === 'organisationChart' ? (
      <HrOrganisationChartPanel chart={organisationChart} query={query} />
    ) : view === 'deadlines' ? (
      <ErpOperationalTable
        ariaLabel="Échéances RH"
        columns={deadlineColumns}
        rows={filteredDeadlines}
        getRowKey={(row) => row.id}
        state={loadState}
        emptyLabel="Aucune échéance RH dans les 45 prochains jours"
        onRetry={() => void load()}
      />
    ) : view === 'journeys' ? (
      <HrLifecyclePanel
        employees={employees}
        canWrite={access?.canWriteContracts ?? false}
        query={query}
        onChanged={load}
      />
    ) : view === 'attendance' ? (
      <HrTimeAttendancePanel
        employees={employees}
        teams={teams}
        canWrite={access?.canWriteTime ?? false}
        canWriteDocuments={access?.canWriteDocuments ?? false}
        canApproveFinal={
          (access?.canWriteTime ?? false) && access?.populationScope === 'ALL'
        }
        query={query}
      />
    ) : view === 'leave' ? (
      <HrLeaveManagementPanel
        employees={employees}
        canWrite={access?.canWriteTime ?? false}
        canWriteDocuments={access?.canWriteDocuments ?? false}
        query={query}
      />
    ) : view === 'monthlyClosing' ? (
      <HrMonthlyClosingPanel
        canWrite={access?.canWriteTime ?? false}
        query={query}
      />
    ) : (
      <HrAccessManagementPanel
        establishments={establishments}
        employees={employees}
      />
    );

  const visibleViews = (Object.keys(viewLabels) as View[]).filter(
    (target) =>
      (target !== 'access' || access?.canAdministerAccess) &&
      (target !== 'attendance' || access?.canReadTime) &&
      (target !== 'leave' || access?.canReadTime) &&
      (target !== 'monthlyClosing' || access?.canReadTime),
  );

  return (
    <ErpPageShell
      title="Ressources humaines"
      description="Organisation, dossiers salariés, parcours et échéances"
      actions={
        <>
          <Button
            title="Actualiser"
            ariaLabel="Actualiser les données RH"
            Icon={IconRefresh}
            variant="secondary"
            onClick={() => void load()}
          />
          {canManage && isStructureView(view) ? (
            <Button
              title={`Créer : ${viewLabels[view]}`}
              ariaLabel={`Créer : ${viewLabels[view]}`}
              Icon={IconPlus}
              accent="blue"
              onClick={() => openCreateDrawer(view)}
            />
          ) : null}
          {canImport && view === 'employees' ? (
            <Button
              title="Importer les salariés"
              ariaLabel="Importer les salariés depuis Excel"
              Icon={IconFileImport}
              accent="blue"
              onClick={() => setImportOpen(true)}
            />
          ) : null}
        </>
      }
    >
      <StyledMetrics>
        {[
          ['Collaborateurs actifs', summary.activeEmployees],
          ['Établissements', summary.establishments],
          ['Grades', summary.grades],
          ['Centres de coûts', summary.costCenters],
          ['Départements', summary.departments],
          ['Postes', summary.jobPositions],
          ['Contrats actifs', summary.activeContracts],
          ['Avenants à valider', summary.draftAmendments],
          ['Parcours actifs', summary.activeJourneys],
          ['Alertes RH', deadlines.length],
        ].map(([label, value]) => (
          <StyledMetric key={label}>
            <StyledMetricLabel>{label}</StyledMetricLabel>
            <StyledMetricValue>{value}</StyledMetricValue>
          </StyledMetric>
        ))}
      </StyledMetrics>
      <StyledToolbar>
        <StyledTabs role="tablist" aria-label="Vues RH">
          {visibleViews.map((target) => (
            <StyledTab
              key={target}
              type="button"
              role="tab"
              active={view === target}
              aria-selected={view === target}
              onClick={() => setView(target)}
            >
              {viewLabels[target]}
            </StyledTab>
          ))}
        </StyledTabs>
        {view === 'access' ? null : (
          <StyledSearch>
            <IconSearch size={16} />
            <StyledSearchInput
              value={query}
              placeholder="Rechercher"
              onChange={(event) => setQuery(event.target.value)}
            />
          </StyledSearch>
        )}
      </StyledToolbar>
      {table}

      <HrEmployeeImportPanel
        isOpen={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={load}
      />

      <ErpFormDrawer
        isOpen={drawer !== null}
        title={drawer === null ? 'Créer' : `Créer : ${viewLabels[drawer]}`}
        description="Le référentiel est immédiatement disponible dans les contrats."
        isBusy={busy}
        onClose={() => setDrawer(null)}
        footer={
          <>
            <Button
              title="Annuler"
              ariaLabel="Annuler"
              variant="secondary"
              disabled={busy}
              onClick={() => setDrawer(null)}
            />
            <Button
              title="Créer"
              ariaLabel="Créer"
              Icon={IconPlus}
              accent="blue"
              disabled={busy}
              onClick={() => void submitStructure()}
            />
          </>
        }
      >
        <StyledDrawerForm
          onSubmit={(event) => {
            event.preventDefault();
            void submitStructure();
          }}
        >
          <StyledField>
            Code
            <StyledInput
              value={form.code}
              maxLength={40}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  code: event.target.value.toUpperCase(),
                }))
              }
            />
          </StyledField>
          <StyledField>
            {drawer === 'positions' ? 'Intitulé du poste' : 'Libellé'}
            <StyledInput
              value={form.name}
              maxLength={180}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  name: event.target.value,
                }))
              }
            />
          </StyledField>
          {drawer === 'establishments' ? (
            <>
              <StyledField>
                Ville
                <StyledInput
                  value={form.city}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      city: event.target.value,
                    }))
                  }
                />
              </StyledField>
              <StyledCheckbox>
                <input
                  type="checkbox"
                  checked={form.isHeadOffice}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      isHeadOffice: event.target.checked,
                    }))
                  }
                />
                Siège social
              </StyledCheckbox>
            </>
          ) : null}
          {drawer === 'grades' ? (
            <>
              <StyledField>
                Niveau hiérarchique
                <StyledInput
                  type="number"
                  min="0"
                  value={form.level}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      level: event.target.value,
                    }))
                  }
                />
              </StyledField>
              <StyledField>
                Description
                <StyledInput
                  value={form.detail}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      detail: event.target.value,
                    }))
                  }
                />
              </StyledField>
            </>
          ) : null}
          {drawer === 'costCenters' ? (
            <StyledField>
              Description
              <StyledInput
                value={form.detail}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    detail: event.target.value,
                  }))
                }
              />
            </StyledField>
          ) : null}
          {drawer === 'teams' ? (
            <>
              <StyledField>
                Département
                <StyledSelect
                  value={form.relatedId}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      relatedId: event.target.value,
                    }))
                  }
                >
                  <option value="">Équipe transverse</option>
                  {departments
                    .filter((item) => item.isActive)
                    .map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                </StyledSelect>
              </StyledField>
              <StyledField>
                Responsable
                <StyledSelect
                  value={form.secondaryId}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      secondaryId: event.target.value,
                    }))
                  }
                >
                  <option value="">Non désigné</option>
                  {employees.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.firstName} {item.lastName}
                    </option>
                  ))}
                </StyledSelect>
              </StyledField>
            </>
          ) : null}
          {drawer === 'workLocations' ? (
            <>
              <StyledField>
                Établissement
                <StyledSelect
                  value={form.relatedId}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      relatedId: event.target.value,
                    }))
                  }
                >
                  <option value="">Non rattaché</option>
                  {establishments
                    .filter((item) => item.isActive)
                    .map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                </StyledSelect>
              </StyledField>
              <StyledField>
                Mode
                <StyledSelect
                  value={form.detail || 'ONSITE'}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      detail: event.target.value,
                    }))
                  }
                >
                  <option value="ONSITE">Sur site</option>
                  <option value="HYBRID">Hybride</option>
                  <option value="REMOTE">Télétravail</option>
                  <option value="CLIENT_SITE">Site client</option>
                </StyledSelect>
              </StyledField>
              <StyledField>
                Ville
                <StyledInput
                  value={form.city}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      city: event.target.value,
                    }))
                  }
                />
              </StyledField>
            </>
          ) : null}
          {drawer === 'departments' ? (
            <>
              <StyledField>
                Établissement
                <StyledSelect
                  value={form.relatedId}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      relatedId: event.target.value,
                    }))
                  }
                >
                  <option value="">Tous les établissements</option>
                  {establishments
                    .filter((item) => item.isActive)
                    .map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                </StyledSelect>
              </StyledField>
              <StyledField>
                Centre de coût
                <StyledSelect
                  value={form.secondaryId}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      secondaryId: event.target.value,
                    }))
                  }
                >
                  <option value="">Non rattaché</option>
                  {costCenters
                    .filter((item) => item.isActive)
                    .map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.code} · {item.name}
                      </option>
                    ))}
                </StyledSelect>
              </StyledField>
            </>
          ) : null}
          {drawer === 'positions' ? (
            <>
              <StyledField>
                Département
                <StyledSelect
                  value={form.relatedId}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      relatedId: event.target.value,
                    }))
                  }
                >
                  <option value="">Non rattaché</option>
                  {departments
                    .filter((item) => item.isActive)
                    .map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                </StyledSelect>
              </StyledField>
              <StyledField>
                Grade
                <StyledSelect
                  value={form.secondaryId}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      secondaryId: event.target.value,
                    }))
                  }
                >
                  <option value="">Non rattaché</option>
                  {grades
                    .filter((item) => item.isActive)
                    .map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.code} · {item.name}
                      </option>
                    ))}
                </StyledSelect>
              </StyledField>
            </>
          ) : null}
          {mutationError === null ? null : (
            <StyledError role="alert">{mutationError}</StyledError>
          )}
        </StyledDrawerForm>
      </ErpFormDrawer>
    </ErpPageShell>
  );
};
