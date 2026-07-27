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
import { useNavigate } from 'react-router-dom';
import {
  hrCoreSummarySchema,
  hrDepartmentListSchema,
  hrDepartmentSchema,
  hrEmployeeListSchema,
  hrEstablishmentListSchema,
  hrEstablishmentSchema,
  hrJobPositionListSchema,
  hrJobPositionSchema,
  type HrCoreSummary,
  type HrDepartment,
  type HrEmployeeListItem,
  type HrEstablishment,
  type HrJobPosition,
} from 'twenty-shared/erp-maroc';
import {
  IconChevronRight,
  IconPlus,
  IconRefresh,
  IconSearch,
} from 'twenty-ui/display';
import { Button } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';

type View = 'employees' | 'establishments' | 'departments' | 'positions';
type LoadState = 'loading' | 'ready' | 'error';
type StructureView = Exclude<View, 'employees'>;

const EMPTY_SUMMARY: HrCoreSummary = {
  activeEmployees: 0,
  establishments: 0,
  departments: 0,
  jobPositions: 0,
  activeContracts: 0,
  draftAmendments: 0,
};

const StyledMetrics = styled.section`
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: grid;
  flex: 0 0 auto;
  grid-template-columns: repeat(6, minmax(120px, 1fr));
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
  departments: 'Départements',
  positions: 'Postes',
};

export const ErpHrCorePage = () => {
  const { client, context } = useErpMarocContext();
  const navigate = useNavigate();
  const [view, setView] = useState<View>('employees');
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [summary, setSummary] = useState(EMPTY_SUMMARY);
  const [employees, setEmployees] = useState<HrEmployeeListItem[]>([]);
  const [establishments, setEstablishments] = useState<HrEstablishment[]>([]);
  const [departments, setDepartments] = useState<HrDepartment[]>([]);
  const [positions, setPositions] = useState<HrJobPosition[]>([]);
  const [query, setQuery] = useState('');
  const [drawer, setDrawer] = useState<StructureView | null>(null);
  const [busy, setBusy] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [form, setForm] = useState({
    code: '',
    name: '',
    city: '',
    relatedId: '',
    detail: '',
    isHeadOffice: false,
  });

  const canManage = context?.role === 'OWNER' || context?.role === 'ADMIN';

  const load = useCallback(async () => {
    setLoadState('loading');
    try {
      const [
        nextSummary,
        nextEmployees,
        nextEstablishments,
        nextDepartments,
        nextPositions,
      ] = await Promise.all([
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
          path: '/hr-core/departments',
          schema: hrDepartmentListSchema,
        }),
        client.request({
          method: 'GET',
          path: '/hr-core/job-positions',
          schema: hrJobPositionListSchema,
        }),
      ]);
      setSummary(nextSummary);
      setEmployees(nextEmployees);
      setEstablishments(nextEstablishments);
      setDepartments(nextDepartments);
      setPositions(nextPositions);
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
      detail: '',
      isHeadOffice: false,
    });
    setDrawer(target);
  };

  const submitStructure = async () => {
    if (drawer === null || form.code.trim() === '' || form.name.trim() === '') {
      setMutationError('Le code et le libellé sont obligatoires.');
      return;
    }
    const config =
      drawer === 'establishments'
        ? {
            path: '/hr-core/establishments',
            schema: hrEstablishmentSchema,
            body: {
              code: form.code,
              name: form.name,
              city: form.city || null,
              isHeadOffice: form.isHeadOffice,
            },
          }
        : drawer === 'departments'
          ? {
              path: '/hr-core/departments',
              schema: hrDepartmentSchema,
              body: {
                code: form.code,
                name: form.name,
                establishmentId: form.relatedId || null,
                costCenterCode: form.detail || null,
              },
            }
          : {
              path: '/hr-core/job-positions',
              schema: hrJobPositionSchema,
              body: {
                code: form.code,
                title: form.name,
                departmentId: form.relatedId || null,
                grade: form.detail || null,
              },
            };
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
  const filteredDepartments = useMemo(
    () =>
      departments.filter((item) =>
        matches(
          item.code,
          item.name,
          item.costCenterCode,
          item.establishment?.name,
        ),
      ),
    [departments, matches],
  );
  const filteredPositions = useMemo(
    () =>
      positions.filter((item) =>
        matches(item.code, item.title, item.grade, item.department?.name),
      ),
    [matches, positions],
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
        <Button
          title="Ouvrir le dossier salarié"
          ariaLabel={`Ouvrir le dossier de ${employee.firstName} ${employee.lastName}`}
          Icon={IconChevronRight}
          variant="secondary"
          onClick={() =>
            navigate(erpMarocPaths.hrEmployeeDetail.replace(':id', employee.id))
          }
        />
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
      render: (item) => item.costCenterCode ?? '—',
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
      render: (item) => item.grade ?? '—',
    },
    {
      key: 'contracts',
      header: 'Contrats',
      width: '120px',
      align: 'right',
      render: (item) => item._count?.employmentContracts ?? 0,
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
    ) : (
      <ErpOperationalTable
        ariaLabel="Postes"
        columns={positionColumns}
        rows={filteredPositions}
        getRowKey={(row) => row.id}
        state={loadState}
        emptyLabel="Aucun poste"
        onRetry={() => void load()}
      />
    );

  return (
    <ErpPageShell
      title="Ressources humaines"
      description="Organisation, collaborateurs et historique contractuel"
      actions={
        <>
          <Button
            title="Actualiser"
            ariaLabel="Actualiser les données RH"
            Icon={IconRefresh}
            variant="secondary"
            onClick={() => void load()}
          />
          {canManage && view !== 'employees' ? (
            <Button
              title={`Créer : ${viewLabels[view]}`}
              ariaLabel={`Créer : ${viewLabels[view]}`}
              Icon={IconPlus}
              accent="blue"
              onClick={() => openCreateDrawer(view)}
            />
          ) : null}
        </>
      }
    >
      <StyledMetrics>
        {[
          ['Collaborateurs actifs', summary.activeEmployees],
          ['Établissements', summary.establishments],
          ['Départements', summary.departments],
          ['Postes', summary.jobPositions],
          ['Contrats actifs', summary.activeContracts],
          ['Avenants à valider', summary.draftAmendments],
        ].map(([label, value]) => (
          <StyledMetric key={label}>
            <StyledMetricLabel>{label}</StyledMetricLabel>
            <StyledMetricValue>{value}</StyledMetricValue>
          </StyledMetric>
        ))}
      </StyledMetrics>
      <StyledToolbar>
        <StyledTabs role="tablist" aria-label="Vues RH">
          {(Object.keys(viewLabels) as View[]).map((target) => (
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
        <StyledSearch>
          <IconSearch size={16} />
          <StyledSearchInput
            value={query}
            placeholder="Rechercher"
            onChange={(event) => setQuery(event.target.value)}
          />
        </StyledSearch>
      </StyledToolbar>
      {table}

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
          {mutationError === null ? null : (
            <StyledError role="alert">{mutationError}</StyledError>
          )}
        </StyledDrawerForm>
      </ErpFormDrawer>
    </ErpPageShell>
  );
};
