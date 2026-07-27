import { ErpFormDrawer } from '@/erp-maroc/components/ErpFormDrawer';
import { ErpPageShell } from '@/erp-maroc/components/ErpPageShell';
import {
  ErpStatusBadge,
  type ErpStatusTone,
} from '@/erp-maroc/components/ErpStatusBadge';
import { useErpMarocContext } from '@/erp-maroc/context/useErpMarocContext';
import { erpMarocPaths } from '@/erp-maroc/navigation/erpMarocPaths';
import { styled } from '@linaria/react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  hrContractAmendmentSchema,
  hrDepartmentListSchema,
  hrEmployeeDetailSchema,
  hrEmploymentContractSchema,
  hrEstablishmentListSchema,
  hrJobPositionListSchema,
  type HrDepartment,
  type HrEmployeeDetail,
  type HrEmploymentContract,
  type HrEstablishment,
  type HrJobPosition,
} from 'twenty-shared/erp-maroc';
import {
  IconArrowLeft,
  IconCheck,
  IconFileText,
  IconPlayerPause,
  IconPlayerPlay,
  IconPlus,
  IconRefresh,
  IconX,
} from 'twenty-ui/display';
import { Button } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';

type Drawer =
  | { kind: 'contract' }
  | { kind: 'amendment'; contract: HrEmploymentContract }
  | null;

const contractTone: Record<string, ErpStatusTone> = {
  DRAFT: 'neutral',
  ACTIVE: 'success',
  SUSPENDED: 'warning',
  ENDED: 'neutral',
  CANCELLED: 'danger',
};

const StyledScroll = styled.div`
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-height: 0;
  overflow-y: auto;
`;

const StyledIdentity = styled.section`
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: grid;
  grid-template-columns: minmax(240px, 2fr) repeat(4, minmax(140px, 1fr));
  overflow-x: auto;
`;

const StyledIdentityCell = styled.div`
  border-right: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[1]};
  min-width: 140px;
  padding: ${themeCssVariables.spacing[3]} ${themeCssVariables.spacing[4]};
`;

const StyledLabel = styled.span`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.sm};
`;

const StyledValue = styled.strong`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.md};
  letter-spacing: 0;
`;

const StyledSectionHeader = styled.header`
  align-items: center;
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  justify-content: space-between;
  min-height: 48px;
  padding: 0 ${themeCssVariables.spacing[4]};
`;

const StyledSectionTitle = styled.h2`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.md};
  letter-spacing: 0;
  margin: 0;
`;

const StyledContract = styled.article`
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
`;

const StyledContractMain = styled.div`
  align-items: center;
  display: grid;
  gap: ${themeCssVariables.spacing[3]};
  grid-template-columns:
    minmax(180px, 1.3fr) minmax(160px, 1fr) minmax(140px, 0.8fr)
    minmax(160px, 0.8fr) auto;
  min-width: 900px;
  padding: ${themeCssVariables.spacing[3]} ${themeCssVariables.spacing[4]};
`;

const StyledContractField = styled.div`
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
`;

const StyledActions = styled.div`
  align-items: center;
  display: flex;
  gap: ${themeCssVariables.spacing[1]};
  justify-content: flex-end;
`;

const StyledAmendmentHeader = styled.div`
  background: ${themeCssVariables.background.secondary};
  color: ${themeCssVariables.font.color.secondary};
  font-size: ${themeCssVariables.font.size.sm};
  padding: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[4]};
`;

const StyledAmendment = styled.div`
  align-items: center;
  background: ${themeCssVariables.background.secondary};
  border-top: 1px solid ${themeCssVariables.border.color.light};
  display: grid;
  gap: ${themeCssVariables.spacing[3]};
  grid-template-columns: 120px 1fr minmax(200px, 1fr) 130px auto;
  min-width: 900px;
  padding: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[4]};
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

const StyledInput = styled.input`
  ${fieldStyles}
`;

const StyledSelect = styled.select`
  ${fieldStyles}
`;

const formatMad = (cents: number) =>
  new Intl.NumberFormat('fr-MA', {
    style: 'currency',
    currency: 'MAD',
    maximumFractionDigits: 2,
  }).format(cents / 100);

const toCents = (value: string): number | null => {
  const normalized = value.trim().replace(',', '.');
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return null;
  const cents = Math.round(Number(normalized) * 100);
  return Number.isSafeInteger(cents) ? cents : null;
};

const changesLabel = (changes: Record<string, unknown>) =>
  Object.entries(changes)
    .map(([key, value]) => {
      if (key === 'baseSalaryCents' && typeof value === 'number') {
        return `Salaire: ${formatMad(value)}`;
      }
      if (key === 'jobTitleSnapshot') return `Fonction: ${String(value)}`;
      return `${key}: ${String(value ?? '—')}`;
    })
    .join(' · ');

export const ErpEmployeeHrDetailPage = () => {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { client, context } = useErpMarocContext();
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>(
    'loading',
  );
  const [employee, setEmployee] = useState<HrEmployeeDetail | null>(null);
  const [establishments, setEstablishments] = useState<HrEstablishment[]>([]);
  const [departments, setDepartments] = useState<HrDepartment[]>([]);
  const [positions, setPositions] = useState<HrJobPosition[]>([]);
  const [drawer, setDrawer] = useState<Drawer>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageDanger, setMessageDanger] = useState(false);
  const [contractForm, setContractForm] = useState({
    contractNumber: '',
    contractType: 'CDI',
    startDate: '',
    endDate: '',
    probationEndDate: '',
    establishmentId: '',
    departmentId: '',
    jobPositionId: '',
    jobTitleSnapshot: '',
    salaryMad: '',
    weeklyHours: '44',
  });
  const [amendmentForm, setAmendmentForm] = useState({
    effectiveDate: '',
    reason: '',
    salaryMad: '',
    jobTitleSnapshot: '',
  });

  const canManage = context?.role === 'OWNER' || context?.role === 'ADMIN';

  const load = useCallback(async () => {
    setLoadState('loading');
    try {
      const [nextEmployee, nextEstablishments, nextDepartments, nextPositions] =
        await Promise.all([
          client.request({
            method: 'GET',
            path: `/hr-core/employees/${id}`,
            schema: hrEmployeeDetailSchema,
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
      setEmployee(nextEmployee);
      setEstablishments(nextEstablishments);
      setDepartments(nextDepartments);
      setPositions(nextPositions);
      setLoadState('ready');
    } catch {
      setLoadState('error');
    }
  }, [client, id]);

  useEffect(() => {
    void load();
  }, [load]);

  const activeContract = useMemo(
    () =>
      employee?.employmentContracts.find(
        (contract) =>
          contract.status === 'ACTIVE' || contract.status === 'SUSPENDED',
      ) ?? null,
    [employee],
  );

  const openContractDrawer = () => {
    setMessage(null);
    setContractForm({
      contractNumber: '',
      contractType: 'CDI',
      startDate: new Date().toISOString().slice(0, 10),
      endDate: '',
      probationEndDate: '',
      establishmentId: '',
      departmentId: '',
      jobPositionId: '',
      jobTitleSnapshot: employee?.jobTitle ?? '',
      salaryMad:
        employee === null
          ? ''
          : String((employee.baseSalaryCents / 100).toFixed(2)),
      weeklyHours: '44',
    });
    setDrawer({ kind: 'contract' });
  };

  const openAmendmentDrawer = (contract: HrEmploymentContract) => {
    setMessage(null);
    setAmendmentForm({
      effectiveDate: new Date().toISOString().slice(0, 10),
      reason: '',
      salaryMad: '',
      jobTitleSnapshot: '',
    });
    setDrawer({ kind: 'amendment', contract });
  };

  const executeMutation = async (
    input: Parameters<typeof client.createMutationIntent>[0],
    successMessage: string,
  ) => {
    setBusy(true);
    setMessage(null);
    try {
      const intent = client.createMutationIntent(input, {
        idempotency: 'required',
      });
      await intent.execute();
      setDrawer(null);
      setMessageDanger(false);
      setMessage(successMessage);
      await load();
    } catch {
      setMessageDanger(true);
      setMessage(
        "L'opération n'a pas abouti. Vérifiez les données et les droits.",
      );
    } finally {
      setBusy(false);
    }
  };

  const submitContract = async () => {
    const salaryCents = toCents(contractForm.salaryMad);
    const weeklyHours = Number(contractForm.weeklyHours.replace(',', '.'));
    if (
      salaryCents === null ||
      !Number.isFinite(weeklyHours) ||
      weeklyHours <= 0 ||
      contractForm.contractNumber.trim() === '' ||
      contractForm.startDate === '' ||
      contractForm.jobTitleSnapshot.trim() === ''
    ) {
      setMessageDanger(true);
      setMessage(
        'Vérifiez le numéro, les dates, la fonction, le salaire et les heures.',
      );
      return;
    }
    await executeMutation(
      {
        method: 'POST',
        path: `/hr-core/employees/${id}/contracts`,
        schema: hrEmploymentContractSchema,
        body: {
          contractNumber: contractForm.contractNumber,
          contractType: contractForm.contractType,
          startDate: contractForm.startDate,
          endDate: contractForm.endDate || null,
          probationEndDate: contractForm.probationEndDate || null,
          establishmentId: contractForm.establishmentId || null,
          departmentId: contractForm.departmentId || null,
          jobPositionId: contractForm.jobPositionId || null,
          jobTitleSnapshot: contractForm.jobTitleSnapshot,
          baseSalaryCents: salaryCents,
          weeklyHoursHundredths: Math.round(weeklyHours * 100),
        },
      },
      'Contrat créé en brouillon.',
    );
  };

  const submitAmendment = async () => {
    if (drawer?.kind !== 'amendment') return;
    const changes: Record<string, unknown> = {};
    if (amendmentForm.salaryMad.trim() !== '') {
      const salaryCents = toCents(amendmentForm.salaryMad);
      if (salaryCents === null) {
        setMessageDanger(true);
        setMessage('Le nouveau salaire est invalide.');
        return;
      }
      changes.baseSalaryCents = salaryCents;
    }
    if (amendmentForm.jobTitleSnapshot.trim() !== '') {
      changes.jobTitleSnapshot = amendmentForm.jobTitleSnapshot.trim();
    }
    if (
      amendmentForm.effectiveDate === '' ||
      amendmentForm.reason.trim() === '' ||
      Object.keys(changes).length === 0
    ) {
      setMessageDanger(true);
      setMessage('Précisez la date, le motif et au moins un changement.');
      return;
    }
    await executeMutation(
      {
        method: 'POST',
        path: `/hr-core/contracts/${drawer.contract.id}/amendments`,
        schema: hrContractAmendmentSchema,
        body: {
          effectiveDate: amendmentForm.effectiveDate,
          reason: amendmentForm.reason,
          changes,
        },
      },
      'Avenant créé et soumis à validation.',
    );
  };

  const transitionContract = (
    contract: HrEmploymentContract,
    status: 'ACTIVE' | 'SUSPENDED' | 'ENDED' | 'CANCELLED',
  ) => {
    const endDate =
      status === 'ENDED'
        ? (contract.endDate ?? new Date().toISOString().slice(0, 10))
        : undefined;
    void executeMutation(
      {
        method: 'PATCH',
        path: `/hr-core/contracts/${contract.id}/status`,
        schema: hrEmploymentContractSchema,
        body: { status, ...(endDate === undefined ? {} : { endDate }) },
      },
      `Contrat ${status === 'ACTIVE' ? 'activé' : status === 'SUSPENDED' ? 'suspendu' : status === 'ENDED' ? 'terminé' : 'annulé'}.`,
    );
  };

  const transitionAmendment = (
    amendmentId: string,
    status: 'APPROVED' | 'REJECTED' | 'CANCELLED',
  ) => {
    void executeMutation(
      {
        method: 'PATCH',
        path: `/hr-core/amendments/${amendmentId}/status`,
        schema: hrContractAmendmentSchema,
        body: {
          status,
          ...(status === 'REJECTED'
            ? { rejectionReason: 'Modification non retenue' }
            : {}),
        },
      },
      `Avenant ${status === 'APPROVED' ? 'approuvé' : status === 'REJECTED' ? 'rejeté' : 'annulé'}.`,
    );
  };

  return (
    <ErpPageShell
      title={
        employee === null
          ? 'Dossier salarié'
          : `${employee.firstName} ${employee.lastName}`
      }
      description={
        employee === null
          ? 'Historique contractuel'
          : `${employee.employeeNumber} · ${employee.jobTitle}`
      }
      state={loadState}
      loadingLabel="Chargement du dossier salarié"
      errorLabel="Impossible de charger le dossier salarié"
      onRetry={() => void load()}
      actions={
        <>
          <Button
            title="Retour aux ressources humaines"
            ariaLabel="Retour aux ressources humaines"
            Icon={IconArrowLeft}
            variant="secondary"
            onClick={() => navigate(erpMarocPaths.hrCore)}
          />
          <Button
            title="Actualiser"
            ariaLabel="Actualiser"
            Icon={IconRefresh}
            variant="secondary"
            onClick={() => void load()}
          />
          {canManage ? (
            <Button
              title="Nouveau contrat"
              ariaLabel="Nouveau contrat"
              Icon={IconFileText}
              accent="blue"
              disabled={activeContract !== null}
              onClick={openContractDrawer}
            />
          ) : null}
        </>
      }
    >
      {employee === null ? null : (
        <StyledScroll>
          <StyledIdentity>
            <StyledIdentityCell>
              <StyledLabel>Collaborateur</StyledLabel>
              <StyledValue>
                {employee.firstName} {employee.lastName}
              </StyledValue>
              <StyledLabel>
                {employee.email ?? employee.phone ?? '—'}
              </StyledLabel>
            </StyledIdentityCell>
            <StyledIdentityCell>
              <StyledLabel>Statut</StyledLabel>
              <ErpStatusBadge
                label={employee.status === 'ACTIVE' ? 'Actif' : employee.status}
                tone={employee.status === 'ACTIVE' ? 'success' : 'neutral'}
              />
            </StyledIdentityCell>
            <StyledIdentityCell>
              <StyledLabel>Entrée</StyledLabel>
              <StyledValue>{employee.hireDate}</StyledValue>
            </StyledIdentityCell>
            <StyledIdentityCell>
              <StyledLabel>Salaire de référence</StyledLabel>
              <StyledValue>{formatMad(employee.baseSalaryCents)}</StyledValue>
            </StyledIdentityCell>
            <StyledIdentityCell>
              <StyledLabel>CNSS</StyledLabel>
              <StyledValue>{employee.cnssNumber ?? 'À compléter'}</StyledValue>
            </StyledIdentityCell>
          </StyledIdentity>
          {message === null ? null : (
            <StyledNotice danger={messageDanger}>{message}</StyledNotice>
          )}
          <StyledSectionHeader>
            <StyledSectionTitle>Contrats et avenants</StyledSectionTitle>
            <StyledLabel>
              {employee.employmentContracts.length} contrat(s)
            </StyledLabel>
          </StyledSectionHeader>
          {employee.employmentContracts.length === 0 ? (
            <StyledEmpty>
              Aucun contrat historique. Créez un brouillon puis activez-le après
              contrôle.
            </StyledEmpty>
          ) : (
            employee.employmentContracts.map((contract) => (
              <StyledContract key={contract.id}>
                <StyledContractMain>
                  <StyledContractField>
                    <StyledValue>{contract.contractNumber}</StyledValue>
                    <StyledLabel>
                      {contract.contractType} · {contract.jobTitleSnapshot}
                    </StyledLabel>
                  </StyledContractField>
                  <StyledContractField>
                    <StyledLabel>Période</StyledLabel>
                    <span>
                      {contract.startDate} → {contract.endDate ?? 'en cours'}
                    </span>
                  </StyledContractField>
                  <StyledContractField>
                    <StyledLabel>Salaire de base</StyledLabel>
                    <span>{formatMad(contract.baseSalaryCents)}</span>
                  </StyledContractField>
                  <StyledContractField>
                    <StyledLabel>Statut</StyledLabel>
                    <ErpStatusBadge
                      label={contract.status}
                      tone={contractTone[contract.status] ?? 'neutral'}
                    />
                  </StyledContractField>
                  <StyledActions>
                    {canManage &&
                    (contract.status === 'ACTIVE' ||
                      contract.status === 'SUSPENDED') ? (
                      <Button
                        title="Créer un avenant"
                        ariaLabel="Créer un avenant"
                        Icon={IconPlus}
                        variant="secondary"
                        disabled={busy}
                        onClick={() => openAmendmentDrawer(contract)}
                      />
                    ) : null}
                    {canManage && contract.status === 'DRAFT' ? (
                      <>
                        <Button
                          title="Annuler le brouillon"
                          ariaLabel="Annuler le brouillon"
                          Icon={IconX}
                          accent="danger"
                          disabled={busy}
                          onClick={() =>
                            transitionContract(contract, 'CANCELLED')
                          }
                        />
                        <Button
                          title="Activer le contrat"
                          ariaLabel="Activer le contrat"
                          Icon={IconPlayerPlay}
                          accent="blue"
                          disabled={busy}
                          onClick={() => transitionContract(contract, 'ACTIVE')}
                        />
                      </>
                    ) : null}
                    {canManage && contract.status === 'ACTIVE' ? (
                      <>
                        <Button
                          title="Suspendre"
                          ariaLabel="Suspendre le contrat"
                          Icon={IconPlayerPause}
                          variant="secondary"
                          disabled={busy}
                          onClick={() =>
                            transitionContract(contract, 'SUSPENDED')
                          }
                        />
                        <Button
                          title="Terminer"
                          ariaLabel="Terminer le contrat"
                          Icon={IconX}
                          accent="danger"
                          disabled={busy}
                          onClick={() => transitionContract(contract, 'ENDED')}
                        />
                      </>
                    ) : null}
                    {canManage && contract.status === 'SUSPENDED' ? (
                      <Button
                        title="Réactiver"
                        ariaLabel="Réactiver le contrat"
                        Icon={IconPlayerPlay}
                        accent="blue"
                        disabled={busy}
                        onClick={() => transitionContract(contract, 'ACTIVE')}
                      />
                    ) : null}
                  </StyledActions>
                </StyledContractMain>
                {(contract.amendments?.length ?? 0) > 0 ? (
                  <>
                    <StyledAmendmentHeader>Avenants</StyledAmendmentHeader>
                    {contract.amendments?.map((amendment) => (
                      <StyledAmendment key={amendment.id}>
                        <span>#{amendment.sequence}</span>
                        <span>{amendment.effectiveDate}</span>
                        <StyledContractField>
                          <span>{amendment.reason}</span>
                          <StyledLabel>
                            {changesLabel(amendment.changes)}
                          </StyledLabel>
                        </StyledContractField>
                        <ErpStatusBadge
                          label={amendment.status}
                          tone={
                            amendment.status === 'APPROVED'
                              ? 'success'
                              : amendment.status === 'REJECTED'
                                ? 'danger'
                                : 'warning'
                          }
                        />
                        <StyledActions>
                          {canManage &&
                          amendment.status === 'DRAFT' &&
                          amendment.createdByTwentyUserId !==
                            context?.twentyUserId ? (
                            <>
                              <Button
                                title="Rejeter"
                                ariaLabel="Rejeter l’avenant"
                                Icon={IconX}
                                accent="danger"
                                disabled={busy}
                                onClick={() =>
                                  transitionAmendment(amendment.id, 'REJECTED')
                                }
                              />
                              <Button
                                title="Approuver"
                                ariaLabel="Approuver l’avenant"
                                Icon={IconCheck}
                                accent="blue"
                                disabled={busy}
                                onClick={() =>
                                  transitionAmendment(amendment.id, 'APPROVED')
                                }
                              />
                            </>
                          ) : null}
                        </StyledActions>
                      </StyledAmendment>
                    ))}
                  </>
                ) : null}
              </StyledContract>
            ))
          )}
        </StyledScroll>
      )}

      <ErpFormDrawer
        isOpen={drawer !== null}
        title={
          drawer?.kind === 'amendment' ? 'Nouvel avenant' : 'Nouveau contrat'
        }
        description={
          drawer?.kind === 'amendment'
            ? 'La modification sera appliquée après validation par un second administrateur.'
            : 'Le contrat sera créé en brouillon avant activation.'
        }
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
              title="Enregistrer"
              ariaLabel="Enregistrer"
              Icon={IconCheck}
              accent="blue"
              disabled={busy}
              onClick={() =>
                void (drawer?.kind === 'amendment'
                  ? submitAmendment()
                  : submitContract())
              }
            />
          </>
        }
      >
        <StyledDrawerForm
          onSubmit={(event) => {
            event.preventDefault();
            void (drawer?.kind === 'amendment'
              ? submitAmendment()
              : submitContract());
          }}
        >
          {drawer?.kind === 'amendment' ? (
            <>
              <StyledField>
                Date d’effet
                <StyledInput
                  type="date"
                  value={amendmentForm.effectiveDate}
                  onChange={(event) =>
                    setAmendmentForm((current) => ({
                      ...current,
                      effectiveDate: event.target.value,
                    }))
                  }
                />
              </StyledField>
              <StyledField>
                Motif
                <StyledInput
                  value={amendmentForm.reason}
                  onChange={(event) =>
                    setAmendmentForm((current) => ({
                      ...current,
                      reason: event.target.value,
                    }))
                  }
                />
              </StyledField>
              <StyledField>
                Nouveau salaire mensuel (MAD)
                <StyledInput
                  inputMode="decimal"
                  value={amendmentForm.salaryMad}
                  placeholder="Laisser vide si inchangé"
                  onChange={(event) =>
                    setAmendmentForm((current) => ({
                      ...current,
                      salaryMad: event.target.value,
                    }))
                  }
                />
              </StyledField>
              <StyledField>
                Nouvelle fonction
                <StyledInput
                  value={amendmentForm.jobTitleSnapshot}
                  placeholder="Laisser vide si inchangée"
                  onChange={(event) =>
                    setAmendmentForm((current) => ({
                      ...current,
                      jobTitleSnapshot: event.target.value,
                    }))
                  }
                />
              </StyledField>
            </>
          ) : (
            <>
              <StyledField>
                Numéro du contrat
                <StyledInput
                  value={contractForm.contractNumber}
                  onChange={(event) =>
                    setContractForm((current) => ({
                      ...current,
                      contractNumber: event.target.value.toUpperCase(),
                    }))
                  }
                />
              </StyledField>
              <StyledField>
                Type
                <StyledSelect
                  value={contractForm.contractType}
                  onChange={(event) =>
                    setContractForm((current) => ({
                      ...current,
                      contractType: event.target.value,
                    }))
                  }
                >
                  {['CDI', 'CDD', 'ANAPEC', 'INTERIM', 'STAGE'].map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </StyledSelect>
              </StyledField>
              <StyledField>
                Date de début
                <StyledInput
                  type="date"
                  value={contractForm.startDate}
                  onChange={(event) =>
                    setContractForm((current) => ({
                      ...current,
                      startDate: event.target.value,
                    }))
                  }
                />
              </StyledField>
              <StyledField>
                Date de fin
                <StyledInput
                  type="date"
                  value={contractForm.endDate}
                  onChange={(event) =>
                    setContractForm((current) => ({
                      ...current,
                      endDate: event.target.value,
                    }))
                  }
                />
              </StyledField>
              <StyledField>
                Fin de période d’essai
                <StyledInput
                  type="date"
                  value={contractForm.probationEndDate}
                  onChange={(event) =>
                    setContractForm((current) => ({
                      ...current,
                      probationEndDate: event.target.value,
                    }))
                  }
                />
              </StyledField>
              <StyledField>
                Établissement
                <StyledSelect
                  value={contractForm.establishmentId}
                  onChange={(event) =>
                    setContractForm((current) => ({
                      ...current,
                      establishmentId: event.target.value,
                    }))
                  }
                >
                  <option value="">Non défini</option>
                  {establishments.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </StyledSelect>
              </StyledField>
              <StyledField>
                Département
                <StyledSelect
                  value={contractForm.departmentId}
                  onChange={(event) =>
                    setContractForm((current) => ({
                      ...current,
                      departmentId: event.target.value,
                    }))
                  }
                >
                  <option value="">Non défini</option>
                  {departments.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </StyledSelect>
              </StyledField>
              <StyledField>
                Poste
                <StyledSelect
                  value={contractForm.jobPositionId}
                  onChange={(event) => {
                    const selected = positions.find(
                      (item) => item.id === event.target.value,
                    );
                    setContractForm((current) => ({
                      ...current,
                      jobPositionId: event.target.value,
                      jobTitleSnapshot:
                        selected?.title ?? current.jobTitleSnapshot,
                    }));
                  }}
                >
                  <option value="">Non défini</option>
                  {positions.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.title}
                    </option>
                  ))}
                </StyledSelect>
              </StyledField>
              <StyledField>
                Fonction contractuelle
                <StyledInput
                  value={contractForm.jobTitleSnapshot}
                  onChange={(event) =>
                    setContractForm((current) => ({
                      ...current,
                      jobTitleSnapshot: event.target.value,
                    }))
                  }
                />
              </StyledField>
              <StyledField>
                Salaire mensuel (MAD)
                <StyledInput
                  inputMode="decimal"
                  value={contractForm.salaryMad}
                  onChange={(event) =>
                    setContractForm((current) => ({
                      ...current,
                      salaryMad: event.target.value,
                    }))
                  }
                />
              </StyledField>
              <StyledField>
                Heures hebdomadaires
                <StyledInput
                  inputMode="decimal"
                  value={contractForm.weeklyHours}
                  onChange={(event) =>
                    setContractForm((current) => ({
                      ...current,
                      weeklyHours: event.target.value,
                    }))
                  }
                />
              </StyledField>
            </>
          )}
          {message === null || drawer === null ? null : (
            <StyledNotice danger={messageDanger}>{message}</StyledNotice>
          )}
        </StyledDrawerForm>
      </ErpFormDrawer>
    </ErpPageShell>
  );
};
