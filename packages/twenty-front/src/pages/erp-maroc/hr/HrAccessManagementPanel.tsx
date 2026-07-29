import { ErpFormDrawer } from '@/erp-maroc/components/ErpFormDrawer';
import { ErpStatusBadge } from '@/erp-maroc/components/ErpStatusBadge';
import { useErpMarocContext } from '@/erp-maroc/context/useErpMarocContext';
import { styled } from '@linaria/react';
import { useCallback, useEffect, useState } from 'react';
import {
  hrAccessAdministrationSchema,
  hrAccessGrantSchema,
  type HrAccessAdministration,
  type HrAccessRole,
  type HrEmployeeListItem,
  type HrEstablishment,
  type HrFieldPermission,
  type HrPopulationScope,
} from 'twenty-shared/erp-maroc';
import { IconCheck, IconEdit, IconPlus, IconRefresh } from 'twenty-ui/display';
import { Button } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';

type HrAccessManagementPanelProps = {
  establishments: HrEstablishment[];
  employees: HrEmployeeListItem[];
};

type AccessUser = HrAccessAdministration['users'][number];

type GrantForm = {
  twentyUserId: string;
  role: HrAccessRole;
  populationScope: HrPopulationScope;
  fieldPermissions: HrFieldPermission[];
  establishmentIds: string[];
  employeeIds: string[];
  isActive: boolean;
};

const StyledPanel = styled.section`
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-height: 0;
`;

const StyledHeader = styled.header`
  align-items: center;
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  justify-content: space-between;
  min-height: 48px;
  padding: 0 ${themeCssVariables.spacing[4]};
`;

const StyledTitle = styled.h2`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.md};
  letter-spacing: 0;
  margin: 0;
`;

const StyledHeaderActions = styled.div`
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
`;

const StyledRows = styled.div`
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
`;

const StyledRow = styled.div`
  align-items: center;
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: grid;
  gap: ${themeCssVariables.spacing[3]};
  grid-template-columns:
    minmax(240px, 1.4fr) minmax(150px, 0.8fr) minmax(180px, 1fr)
    minmax(150px, 0.8fr) auto;
  min-width: 920px;
  padding: ${themeCssVariables.spacing[3]} ${themeCssVariables.spacing[4]};
`;

const StyledCell = styled.div`
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
`;

const StyledPrimary = styled.strong`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.md};
  letter-spacing: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const StyledSecondary = styled.span`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.sm};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const StyledEmpty = styled.div`
  color: ${themeCssVariables.font.color.secondary};
  padding: ${themeCssVariables.spacing[5]} ${themeCssVariables.spacing[4]};
`;

const StyledNotice = styled.div<{ danger: boolean }>`
  background: ${({ danger }) =>
    danger
      ? themeCssVariables.tag.background.red
      : themeCssVariables.tag.background.green};
  color: ${({ danger }) =>
    danger ? themeCssVariables.tag.text.red : themeCssVariables.tag.text.green};
  font-size: ${themeCssVariables.font.size.sm};
  padding: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[4]};
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

const StyledSelect = styled.select`
  ${fieldStyles}
`;

const StyledOptionGroup = styled.fieldset`
  border: 0;
  display: grid;
  gap: ${themeCssVariables.spacing[2]};
  margin: 0;
  padding: 0;
`;

const StyledLegend = styled.legend`
  color: ${themeCssVariables.font.color.secondary};
  font-size: ${themeCssVariables.font.size.sm};
  margin-bottom: ${themeCssVariables.spacing[2]};
  padding: 0;
`;

const StyledCheckbox = styled.label`
  align-items: center;
  color: ${themeCssVariables.font.color.primary};
  display: flex;
  font-size: ${themeCssVariables.font.size.sm};
  gap: ${themeCssVariables.spacing[2]};
  min-height: 28px;
`;

const StyledScopeList = styled.div`
  border: 1px solid ${themeCssVariables.border.color.light};
  max-height: 220px;
  overflow-y: auto;
  padding: ${themeCssVariables.spacing[2]};
`;

const roleLabels: Record<HrAccessRole, string> = {
  HR_ADMIN: 'Administrateur RH',
  HR_MANAGER: 'Responsable RH',
  PAYROLL_MANAGER: 'Responsable paie',
  HR_VIEWER: 'Lecteur RH',
};

const scopeLabels: Record<HrPopulationScope, string> = {
  ALL: 'Toute l’entreprise',
  ESTABLISHMENTS: 'Établissements sélectionnés',
  EMPLOYEES: 'Salariés sélectionnés',
};

const permissionLabels: Record<HrFieldPermission, string> = {
  HR_STRUCTURE_WRITE: 'Modifier l’organisation RH',
  HR_PRIVATE_READ: 'Lire les données personnelles',
  HR_PRIVATE_WRITE: 'Modifier les données personnelles',
  HR_BANK_READ: 'Lire les coordonnées bancaires masquées',
  HR_BANK_WRITE: 'Remplacer les coordonnées bancaires',
  HR_COMPENSATION_READ: 'Lire la rémunération',
  HR_CONTRACT_WRITE: 'Gérer contrats et avenants',
  HR_DOCUMENT_READ: 'Consulter les documents RH',
  HR_DOCUMENT_WRITE: 'Gérer les documents RH',
  HR_TIME_READ: 'Consulter les présences et pointages',
  HR_TIME_WRITE: 'Gérer les horaires et pointages',
};

const permissionsByRole: Record<HrAccessRole, readonly HrFieldPermission[]> = {
  HR_ADMIN: Object.keys(permissionLabels) as HrFieldPermission[],
  HR_MANAGER: [
    'HR_PRIVATE_READ',
    'HR_PRIVATE_WRITE',
    'HR_DOCUMENT_READ',
    'HR_DOCUMENT_WRITE',
    'HR_TIME_READ',
    'HR_TIME_WRITE',
  ],
  PAYROLL_MANAGER: [
    'HR_PRIVATE_READ',
    'HR_BANK_READ',
    'HR_BANK_WRITE',
    'HR_COMPENSATION_READ',
    'HR_DOCUMENT_READ',
    'HR_TIME_READ',
  ],
  HR_VIEWER: ['HR_TIME_READ'],
};

const emptyForm = (user?: AccessUser): GrantForm => {
  const grant = user?.hrAccessGrant;
  const role = grant?.role ?? 'HR_VIEWER';
  return {
    twentyUserId: user?.twentyUserId ?? '',
    role,
    populationScope: grant?.populationScope ?? 'ALL',
    fieldPermissions: grant?.fieldPermissions ?? [...permissionsByRole[role]],
    establishmentIds:
      grant?.establishmentScopes.map(
        ({ establishmentId }) => establishmentId,
      ) ?? [],
    employeeIds:
      grant?.employeeScopes.map(({ employeeId }) => employeeId) ?? [],
    isActive: grant?.isActive ?? true,
  };
};

const toggleValue = <T extends string>(
  values: readonly T[],
  value: T,
  checked: boolean,
): T[] =>
  checked
    ? [...new Set([...values, value])]
    : values.filter((current) => current !== value);

const accessScopeSummary = (user: AccessUser): string => {
  if (user.role === 'OWNER' || user.role === 'ADMIN') return scopeLabels.ALL;
  const grant = user.hrAccessGrant;
  if (!grant) return 'Aucun périmètre';
  if (grant.populationScope === 'ALL') return scopeLabels.ALL;
  if (grant.populationScope === 'ESTABLISHMENTS') {
    return grant.establishmentScopes
      .map(({ establishment }) => establishment.name)
      .join(', ');
  }
  return grant.employeeScopes
    .map(({ employee }) => `${employee.firstName} ${employee.lastName}`)
    .join(', ');
};

export const HrAccessManagementPanel = ({
  establishments,
  employees,
}: HrAccessManagementPanelProps) => {
  const { client } = useErpMarocContext();
  const [administration, setAdministration] =
    useState<HrAccessAdministration | null>(null);
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>(
    'loading',
  );
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form, setForm] = useState<GrantForm>(() => emptyForm());
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageDanger, setMessageDanger] = useState(false);

  const load = useCallback(async () => {
    setLoadState('loading');
    try {
      const result = await client.request({
        method: 'GET',
        path: '/hr-core/access/administration',
        schema: hrAccessAdministrationSchema,
      });
      setAdministration(result);
      setLoadState('ready');
    } catch {
      setLoadState('error');
    }
  }, [client]);

  useEffect(() => {
    void load();
  }, [load]);

  const openUser = (user: AccessUser) => {
    setMessage(null);
    setForm(emptyForm(user));
    setDrawerOpen(true);
  };

  const openFirstAvailableUser = () => {
    const user = administration?.users.find(
      ({ role }) => role !== 'OWNER' && role !== 'ADMIN',
    );
    if (user) openUser(user);
  };

  const setRole = (role: HrAccessRole) => {
    setForm((current) => ({
      ...current,
      role,
      fieldPermissions: [...permissionsByRole[role]],
    }));
  };

  const setPopulationScope = (populationScope: HrPopulationScope) => {
    setForm((current) => ({
      ...current,
      populationScope,
      establishmentIds:
        populationScope === 'ESTABLISHMENTS' ? current.establishmentIds : [],
      employeeIds: populationScope === 'EMPLOYEES' ? current.employeeIds : [],
    }));
  };

  const submit = async () => {
    if (
      form.twentyUserId === '' ||
      (form.populationScope === 'ESTABLISHMENTS' &&
        form.establishmentIds.length === 0) ||
      (form.populationScope === 'EMPLOYEES' && form.employeeIds.length === 0)
    ) {
      setMessageDanger(true);
      setMessage('Sélectionnez un utilisateur et un périmètre valide.');
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const intent = client.createMutationIntent(
        {
          method: 'POST',
          path: '/hr-core/access/grants',
          schema: hrAccessGrantSchema,
          body: form,
        },
        { idempotency: 'required' },
      );
      await intent.execute();
      setDrawerOpen(false);
      setMessageDanger(false);
      setMessage('Accès RH mis à jour.');
      await load();
    } catch {
      setMessageDanger(true);
      setMessage(
        'La configuration a été refusée. Vérifiez les permissions dépendantes.',
      );
    } finally {
      setBusy(false);
    }
  };

  const configurableUsers =
    administration?.users.filter(
      ({ role }) => role !== 'OWNER' && role !== 'ADMIN',
    ) ?? [];

  return (
    <StyledPanel>
      <StyledHeader>
        <StyledTitle>Rôles et périmètres RH</StyledTitle>
        <StyledHeaderActions>
          <Button
            title="Actualiser les accès"
            ariaLabel="Actualiser les accès"
            Icon={IconRefresh}
            variant="secondary"
            onClick={() => void load()}
          />
          {configurableUsers.length > 0 ? (
            <Button
              title="Configurer un accès"
              ariaLabel="Configurer un accès RH"
              Icon={IconPlus}
              accent="blue"
              onClick={openFirstAvailableUser}
            />
          ) : null}
        </StyledHeaderActions>
      </StyledHeader>
      {message === null ? null : (
        <StyledNotice danger={messageDanger}>{message}</StyledNotice>
      )}
      {loadState === 'loading' ? (
        <StyledEmpty>Chargement des accès RH…</StyledEmpty>
      ) : loadState === 'error' ? (
        <StyledEmpty>Impossible de charger les accès RH.</StyledEmpty>
      ) : administration?.users.length === 0 ? (
        <StyledEmpty>Aucun utilisateur ERP lié.</StyledEmpty>
      ) : (
        <StyledRows>
          {administration?.users.map((user) => {
            const systemAdministrator =
              user.role === 'OWNER' || user.role === 'ADMIN';
            const grant = user.hrAccessGrant;
            return (
              <StyledRow key={user.twentyUserId}>
                <StyledCell>
                  <StyledPrimary>
                    {user.email ?? user.twentyUserId}
                  </StyledPrimary>
                  <StyledSecondary>{user.twentyUserId}</StyledSecondary>
                </StyledCell>
                <StyledCell>
                  <StyledSecondary>Rôle ERP</StyledSecondary>
                  <span>{user.role}</span>
                </StyledCell>
                <StyledCell>
                  <StyledSecondary>Accès RH</StyledSecondary>
                  <span>
                    {systemAdministrator
                      ? 'Administration complète'
                      : grant
                        ? roleLabels[grant.role]
                        : 'Non configuré'}
                  </span>
                </StyledCell>
                <StyledCell>
                  <StyledSecondary>Périmètre</StyledSecondary>
                  <span>{accessScopeSummary(user)}</span>
                </StyledCell>
                {systemAdministrator ? (
                  <ErpStatusBadge label="Système" tone="success" />
                ) : (
                  <Button
                    title="Modifier l’accès RH"
                    ariaLabel={`Modifier l’accès RH de ${user.email ?? user.twentyUserId}`}
                    Icon={grant === null ? IconPlus : IconEdit}
                    variant="secondary"
                    onClick={() => openUser(user)}
                  />
                )}
              </StyledRow>
            );
          })}
        </StyledRows>
      )}

      <ErpFormDrawer
        isOpen={drawerOpen}
        title="Accès RH"
        description="Le rôle, les champs autorisés et la population sont appliqués côté serveur."
        isBusy={busy}
        onClose={() => setDrawerOpen(false)}
        footer={
          <>
            <Button
              title="Annuler"
              ariaLabel="Annuler"
              variant="secondary"
              disabled={busy}
              onClick={() => setDrawerOpen(false)}
            />
            <Button
              title="Enregistrer"
              ariaLabel="Enregistrer l’accès RH"
              Icon={IconCheck}
              accent="blue"
              disabled={busy}
              onClick={() => void submit()}
            />
          </>
        }
      >
        <StyledDrawerForm
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <StyledField>
            Utilisateur
            <StyledSelect
              value={form.twentyUserId}
              onChange={(event) => {
                const user = configurableUsers.find(
                  ({ twentyUserId }) => twentyUserId === event.target.value,
                );
                if (user) setForm(emptyForm(user));
              }}
            >
              {configurableUsers.map((user) => (
                <option key={user.twentyUserId} value={user.twentyUserId}>
                  {user.email ?? user.twentyUserId}
                </option>
              ))}
            </StyledSelect>
          </StyledField>
          <StyledField>
            Rôle RH
            <StyledSelect
              value={form.role}
              onChange={(event) => setRole(event.target.value as HrAccessRole)}
            >
              {(Object.keys(roleLabels) as HrAccessRole[]).map((role) => (
                <option key={role} value={role}>
                  {roleLabels[role]}
                </option>
              ))}
            </StyledSelect>
          </StyledField>
          <StyledField>
            Population
            <StyledSelect
              value={form.populationScope}
              onChange={(event) =>
                setPopulationScope(event.target.value as HrPopulationScope)
              }
            >
              {(Object.keys(scopeLabels) as HrPopulationScope[]).map(
                (scope) => (
                  <option key={scope} value={scope}>
                    {scopeLabels[scope]}
                  </option>
                ),
              )}
            </StyledSelect>
          </StyledField>

          {form.populationScope === 'ESTABLISHMENTS' ? (
            <StyledOptionGroup>
              <StyledLegend>Établissements autorisés</StyledLegend>
              <StyledScopeList>
                {establishments.map((establishment) => (
                  <StyledCheckbox key={establishment.id}>
                    <input
                      type="checkbox"
                      checked={form.establishmentIds.includes(establishment.id)}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          establishmentIds: toggleValue(
                            current.establishmentIds,
                            establishment.id,
                            event.target.checked,
                          ),
                        }))
                      }
                    />
                    {establishment.code} · {establishment.name}
                  </StyledCheckbox>
                ))}
              </StyledScopeList>
            </StyledOptionGroup>
          ) : null}

          {form.populationScope === 'EMPLOYEES' ? (
            <StyledOptionGroup>
              <StyledLegend>Salariés autorisés</StyledLegend>
              <StyledScopeList>
                {employees.map((employee) => (
                  <StyledCheckbox key={employee.id}>
                    <input
                      type="checkbox"
                      checked={form.employeeIds.includes(employee.id)}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          employeeIds: toggleValue(
                            current.employeeIds,
                            employee.id,
                            event.target.checked,
                          ),
                        }))
                      }
                    />
                    {employee.employeeNumber} · {employee.firstName}{' '}
                    {employee.lastName}
                  </StyledCheckbox>
                ))}
              </StyledScopeList>
            </StyledOptionGroup>
          ) : null}

          <StyledOptionGroup>
            <StyledLegend>Permissions de champs</StyledLegend>
            {(Object.keys(permissionLabels) as HrFieldPermission[]).map(
              (permission) => (
                <StyledCheckbox key={permission}>
                  <input
                    type="checkbox"
                    checked={form.fieldPermissions.includes(permission)}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        fieldPermissions: toggleValue(
                          current.fieldPermissions,
                          permission,
                          event.target.checked,
                        ),
                      }))
                    }
                  />
                  {permissionLabels[permission]}
                </StyledCheckbox>
              ),
            )}
          </StyledOptionGroup>

          <StyledCheckbox>
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  isActive: event.target.checked,
                }))
              }
            />
            Accès actif
          </StyledCheckbox>
        </StyledDrawerForm>
      </ErpFormDrawer>
    </StyledPanel>
  );
};
