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
import { Link, useParams } from 'react-router-dom';
import {
  hrContractAmendmentSchema,
  hrCostCenterListSchema,
  hrDepartmentListSchema,
  hrDocumentContentSchema,
  hrEmployeeDocumentSchema,
  hrEmployeeDetailSchema,
  hrEmployeeAssignmentSchema,
  hrEmploymentContractSchema,
  hrEstablishmentListSchema,
  hrJobPositionListSchema,
  hrTeamListSchema,
  hrWorkLocationListSchema,
  type HrCostCenter,
  type HrDepartment,
  type HrEmployeeDocument,
  type HrEmployeeDetail,
  type HrEmploymentContract,
  type HrEstablishment,
  type HrJobPosition,
  type HrTeam,
  type HrWorkLocation,
} from 'twenty-shared/erp-maroc';
import {
  IconArrowLeft,
  IconCheck,
  IconDownload,
  IconFileText,
  IconPlayerPause,
  IconPlayerPlay,
  IconPlus,
  IconRefresh,
  IconUpload,
  IconX,
} from 'twenty-ui/display';
import { Button } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import { EmployeePrivateProfileSections } from './EmployeePrivateProfileSections';
import { EmployeeCrmLinkPanel } from './EmployeeCrmLinkPanel';
import { Employee360Tabs } from './Employee360Tabs';

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

type Drawer =
  | { kind: 'contract' }
  | { kind: 'amendment'; contract: HrEmploymentContract }
  | { kind: 'assignment' }
  | { kind: 'document' }
  | { kind: 'documentVersion'; document: HrEmployeeDocument }
  | null;

const contractTone: Record<string, ErpStatusTone> = {
  DRAFT: 'neutral',
  ACTIVE: 'success',
  SUSPENDED: 'warning',
  ENDED: 'neutral',
  CANCELLED: 'danger',
};

const documentTone: Record<string, ErpStatusTone> = {
  MISSING: 'danger',
  VALID: 'success',
  EXPIRING: 'warning',
  EXPIRED: 'danger',
};

const documentStatusLabels: Record<string, string> = {
  MISSING: 'Pièce manquante',
  VALID: 'Valide',
  EXPIRING: 'À renouveler',
  EXPIRED: 'Expirée',
};

const documentCategoryLabels: Record<string, string> = {
  IDENTITY: 'Identité',
  SOCIAL_SECURITY: 'CNSS / protection sociale',
  CONTRACT: 'Contrat',
  DIPLOMA: 'Diplôme',
  MEDICAL: 'Médical',
  BANK: 'Banque',
  LEAVE_SUPPORT: 'Justificatif d’absence',
  OTHER: 'Autre',
};

const lifecycleTypeLabels: Record<string, string> = {
  HIRING: 'Embauche',
  ONBOARDING: 'Intégration',
  MOBILITY: 'Mobilité',
  OFFBOARDING: 'Départ',
};

const lifecycleStatusLabels: Record<string, string> = {
  ACTIVE: 'En cours',
  COMPLETED: 'Terminé',
  CANCELLED: 'Annulé',
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

const StyledCheckbox = styled.label`
  align-items: center;
  color: ${themeCssVariables.font.color.primary};
  display: flex;
  font-size: ${themeCssVariables.font.size.sm};
  gap: ${themeCssVariables.spacing[2]};
`;

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Lecture du fichier impossible'));
    reader.onload = () => {
      const result = String(reader.result ?? '');
      const separator = result.indexOf(',');
      if (separator < 0) {
        reject(new Error('Format de fichier invalide'));
        return;
      }
      resolve(result.slice(separator + 1));
    };
    reader.readAsDataURL(file);
  });

const formatMad = (cents: number | null) =>
  cents === null
    ? 'Accès restreint'
    : new Intl.NumberFormat('fr-MA', {
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
  const { client, context } = useErpMarocContext();
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>(
    'loading',
  );
  const [employee, setEmployee] = useState<HrEmployeeDetail | null>(null);
  const [establishments, setEstablishments] = useState<HrEstablishment[]>([]);
  const [departments, setDepartments] = useState<HrDepartment[]>([]);
  const [positions, setPositions] = useState<HrJobPosition[]>([]);
  const [costCenters, setCostCenters] = useState<HrCostCenter[]>([]);
  const [teams, setTeams] = useState<HrTeam[]>([]);
  const [workLocations, setWorkLocations] = useState<HrWorkLocation[]>([]);
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
  const [assignmentForm, setAssignmentForm] = useState({
    type: 'SECONDARY',
    title: '',
    allocationPercent: '20',
    startDate: '',
    endDate: '',
    departmentId: '',
    jobPositionId: '',
    teamId: '',
    workLocationId: '',
    costCenterId: '',
  });
  const [documentForm, setDocumentForm] = useState({
    category: 'IDENTITY',
    title: '',
    isRequired: true,
    reminderDays: '30',
    issuedAt: '',
    expiresAt: '',
    notes: '',
    file: null as File | null,
  });

  const canWriteContracts = employee?.access.canWriteContracts ?? false;
  const canReadDocuments = employee?.access.canReadDocuments ?? false;
  const canWriteDocuments = employee?.access.canWriteDocuments ?? false;

  const load = useCallback(async () => {
    setLoadState('loading');
    try {
      const [
        nextEmployee,
        nextEstablishments,
        nextDepartments,
        nextPositions,
        nextCostCenters,
        nextTeams,
        nextWorkLocations,
      ] = await Promise.all([
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
      ]);
      setEmployee(nextEmployee);
      setEstablishments(nextEstablishments);
      setDepartments(nextDepartments);
      setPositions(nextPositions);
      setCostCenters(nextCostCenters);
      setTeams(nextTeams);
      setWorkLocations(nextWorkLocations);
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
        employee?.baseSalaryCents == null
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

  const openAssignmentDrawer = () => {
    setMessage(null);
    setAssignmentForm({
      type: employee?.assignments.some(
        (assignment) =>
          assignment.type === 'PRIMARY' && assignment.endDate === null,
      )
        ? 'SECONDARY'
        : 'PRIMARY',
      title: employee?.jobTitle ?? '',
      allocationPercent: '100',
      startDate: new Date().toISOString().slice(0, 10),
      endDate: '',
      departmentId: '',
      jobPositionId: '',
      teamId: '',
      workLocationId: '',
      costCenterId: '',
    });
    setDrawer({ kind: 'assignment' });
  };

  const openDocumentDrawer = () => {
    setMessage(null);
    setDocumentForm({
      category: 'IDENTITY',
      title: '',
      isRequired: true,
      reminderDays: '30',
      issuedAt: '',
      expiresAt: '',
      notes: '',
      file: null,
    });
    setDrawer({ kind: 'document' });
  };

  const openDocumentVersionDrawer = (document: HrEmployeeDocument) => {
    setMessage(null);
    setDocumentForm({
      category: document.category,
      title: document.title,
      isRequired: document.isRequired,
      reminderDays: String(document.reminderDays),
      issuedAt: '',
      expiresAt: '',
      notes: '',
      file: null,
    });
    setDrawer({ kind: 'documentVersion', document });
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

  const submitAssignment = async () => {
    const allocation = Number(assignmentForm.allocationPercent);
    if (
      assignmentForm.startDate === '' ||
      !Number.isFinite(allocation) ||
      allocation <= 0 ||
      allocation > 100
    ) {
      setMessageDanger(true);
      setMessage('Date de début et quotité entre 1 et 100 % requises.');
      return;
    }
    await executeMutation(
      {
        method: 'POST',
        path: `/hr-core/employees/${id}/assignments`,
        schema: hrEmployeeAssignmentSchema,
        body: {
          type: assignmentForm.type,
          title: assignmentForm.title || null,
          allocationBasisPoints: Math.round(allocation * 100),
          startDate: assignmentForm.startDate,
          endDate: assignmentForm.endDate || null,
          employmentContractId: activeContract?.id ?? null,
          departmentId: assignmentForm.departmentId || null,
          jobPositionId: assignmentForm.jobPositionId || null,
          teamId: assignmentForm.teamId || null,
          workLocationId: assignmentForm.workLocationId || null,
          costCenterId: assignmentForm.costCenterId || null,
        },
      },
      'Affectation ajoutée.',
    );
  };

  const submitDocument = async () => {
    if (drawer?.kind !== 'document' && drawer?.kind !== 'documentVersion') {
      return;
    }
    const reminderDays = Number(documentForm.reminderDays);
    if (
      !Number.isInteger(reminderDays) ||
      reminderDays < 0 ||
      reminderDays > 3650 ||
      (drawer.kind === 'document' && documentForm.title.trim() === '') ||
      (drawer.kind === 'documentVersion' && documentForm.file === null)
    ) {
      setMessageDanger(true);
      setMessage(
        drawer.kind === 'documentVersion'
          ? 'Sélectionnez un fichier PDF, PNG ou JPEG.'
          : 'Renseignez le titre et un délai de rappel valide.',
      );
      return;
    }
    if (
      documentForm.file !== null &&
      documentForm.file.size > 20 * 1024 * 1024
    ) {
      setMessageDanger(true);
      setMessage('Le fichier ne doit pas dépasser 20 Mo.');
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const fileBody =
        documentForm.file === null
          ? {}
          : {
              filename: documentForm.file.name,
              contentBase64: await fileToBase64(documentForm.file),
              issuedAt: documentForm.issuedAt || null,
              expiresAt: documentForm.expiresAt || null,
              notes: documentForm.notes || null,
            };
      const intent = client.createMutationIntent(
        drawer.kind === 'document'
          ? {
              method: 'POST',
              path: `/hr-core/employees/${id}/documents`,
              schema: hrEmployeeDocumentSchema,
              body: {
                category: documentForm.category,
                title: documentForm.title.trim(),
                isRequired: documentForm.isRequired,
                reminderDays,
                ...fileBody,
              },
            }
          : {
              method: 'POST',
              path: `/hr-core/hr-documents/${drawer.document.id}/versions`,
              schema: hrEmployeeDocumentSchema,
              body: fileBody,
            },
        { idempotency: 'required' },
      );
      await intent.execute();
      setDrawer(null);
      setMessageDanger(false);
      setMessage(
        drawer.kind === 'document'
          ? 'Document RH ajouté.'
          : 'Nouvelle version enregistrée.',
      );
      await load();
    } catch {
      setMessageDanger(true);
      setMessage(
        "Le document n'a pas été enregistré. Vérifiez le fichier et les dates.",
      );
    } finally {
      setBusy(false);
    }
  };

  const downloadDocumentVersion = async (document: HrEmployeeDocument) => {
    const latest = document.latestVersion;
    if (latest === null) return;
    setBusy(true);
    setMessage(null);
    try {
      const content = await client.request({
        method: 'GET',
        path: `/hr-core/hr-document-versions/${latest.id}/content`,
        schema: hrDocumentContentSchema,
      });
      const binary = atob(content.contentBase64);
      const bytes = Uint8Array.from(binary, (character) =>
        character.charCodeAt(0),
      );
      const url = URL.createObjectURL(
        new Blob([bytes], { type: content.mimeType }),
      );
      const anchor = window.document.createElement('a');
      anchor.href = url;
      anchor.download = content.filename;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch {
      setMessageDanger(true);
      setMessage('Téléchargement impossible.');
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
          <StyledActionLink
            to={erpMarocPaths.hrCore}
            title="Retour aux ressources humaines"
            aria-label="Retour aux ressources humaines"
          >
            <IconArrowLeft size={16} />
          </StyledActionLink>
          <Button
            title="Actualiser"
            ariaLabel="Actualiser"
            Icon={IconRefresh}
            variant="secondary"
            onClick={() => void load()}
          />
          {canWriteContracts ? (
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
          <EmployeeCrmLinkPanel
            employee={employee}
            canWrite={employee.access.canWritePrivate}
            onUpdated={load}
            onNotify={(nextMessage, danger) => {
              setMessageDanger(danger);
              setMessage(nextMessage);
            }}
          />
          <EmployeePrivateProfileSections
            employee={employee}
            canWritePrivate={employee.access.canWritePrivate}
            canWriteBank={employee.access.canWriteBank}
            onUpdated={load}
            onNotify={(nextMessage, danger) => {
              setMessageDanger(danger);
              setMessage(nextMessage);
            }}
          />
          <Employee360Tabs employee={employee} />
          <StyledSectionHeader>
            <StyledSectionTitle>Parcours RH</StyledSectionTitle>
            <StyledLabel>
              {employee.hrLifecycleJourneys.length} parcours
            </StyledLabel>
          </StyledSectionHeader>
          {employee.hrLifecycleJourneys.length === 0 ? (
            <StyledEmpty>
              Aucun parcours d’embauche, d’intégration, de mobilité ou de
              départ.
            </StyledEmpty>
          ) : (
            employee.hrLifecycleJourneys.map((journey) => {
              const completedTasks = journey.tasks.filter((task) =>
                ['COMPLETED', 'SKIPPED'].includes(task.status),
              ).length;
              return (
                <StyledContract key={journey.id}>
                  <StyledContractMain>
                    <StyledContractField>
                      <StyledValue>{journey.title}</StyledValue>
                      <StyledLabel>
                        {lifecycleTypeLabels[journey.type]}
                      </StyledLabel>
                    </StyledContractField>
                    <StyledContractField>
                      <StyledLabel>Calendrier</StyledLabel>
                      <span>
                        {journey.startDate} → {journey.targetDate ?? '—'}
                      </span>
                    </StyledContractField>
                    <StyledContractField>
                      <StyledLabel>Progression</StyledLabel>
                      <span>
                        {completedTasks} / {journey.tasks.length} étapes
                      </span>
                    </StyledContractField>
                    <StyledContractField>
                      <ErpStatusBadge
                        label={lifecycleStatusLabels[journey.status]}
                        tone={
                          journey.status === 'COMPLETED'
                            ? 'success'
                            : journey.status === 'ACTIVE'
                              ? 'warning'
                              : 'neutral'
                        }
                      />
                    </StyledContractField>
                    <span />
                  </StyledContractMain>
                </StyledContract>
              );
            })
          )}
          {canReadDocuments ? (
            <>
              <StyledSectionHeader>
                <StyledSectionTitle>Documents RH</StyledSectionTitle>
                {canWriteDocuments ? (
                  <Button
                    title="Ajouter un document"
                    ariaLabel="Ajouter un document RH"
                    Icon={IconUpload}
                    variant="secondary"
                    onClick={openDocumentDrawer}
                  />
                ) : (
                  <StyledLabel>
                    {employee.hrDocuments.length} document(s)
                  </StyledLabel>
                )}
              </StyledSectionHeader>
              {employee.hrDocuments.length === 0 ? (
                <StyledEmpty>
                  Aucun document ni pièce requise dans le dossier.
                </StyledEmpty>
              ) : (
                employee.hrDocuments.map((document) => (
                  <StyledContract key={document.id}>
                    <StyledContractMain>
                      <StyledContractField>
                        <StyledValue>{document.title}</StyledValue>
                        <StyledLabel>
                          {documentCategoryLabels[document.category]} ·{' '}
                          {document.isRequired ? 'Obligatoire' : 'Facultatif'}
                        </StyledLabel>
                      </StyledContractField>
                      <StyledContractField>
                        <StyledLabel>Version</StyledLabel>
                        <span>
                          {document.latestVersion === null
                            ? 'Aucun fichier'
                            : `v${document.latestVersion.version} · ${document.latestVersion.filename}`}
                        </span>
                      </StyledContractField>
                      <StyledContractField>
                        <StyledLabel>Expiration</StyledLabel>
                        <span>
                          {document.latestVersion?.expiresAt ?? 'Sans échéance'}
                        </span>
                      </StyledContractField>
                      <ErpStatusBadge
                        label={
                          documentStatusLabels[document.status] ??
                          document.status
                        }
                        tone={documentTone[document.status] ?? 'neutral'}
                      />
                      <StyledActions>
                        {document.latestVersion === null ? null : (
                          <Button
                            title="Télécharger"
                            ariaLabel={`Télécharger ${document.title}`}
                            Icon={IconDownload}
                            variant="secondary"
                            disabled={busy}
                            onClick={() =>
                              void downloadDocumentVersion(document)
                            }
                          />
                        )}
                        {canWriteDocuments ? (
                          <Button
                            title="Nouvelle version"
                            ariaLabel={`Nouvelle version de ${document.title}`}
                            Icon={IconUpload}
                            variant="secondary"
                            disabled={busy}
                            onClick={() => openDocumentVersionDrawer(document)}
                          />
                        ) : null}
                      </StyledActions>
                    </StyledContractMain>
                  </StyledContract>
                ))
              )}
            </>
          ) : null}
          <StyledSectionHeader>
            <StyledSectionTitle>Affectations</StyledSectionTitle>
            {canWriteContracts ? (
              <Button
                title="Nouvelle affectation"
                ariaLabel="Nouvelle affectation"
                Icon={IconPlus}
                variant="secondary"
                onClick={openAssignmentDrawer}
              />
            ) : (
              <StyledLabel>
                {employee.assignments.length} affectation(s)
              </StyledLabel>
            )}
          </StyledSectionHeader>
          {employee.assignments.length === 0 ? (
            <StyledEmpty>Aucune affectation historisée.</StyledEmpty>
          ) : (
            employee.assignments.map((assignment) => (
              <StyledContract key={assignment.id}>
                <StyledContractMain>
                  <StyledContractField>
                    <StyledValue>
                      {assignment.title ??
                        assignment.jobPosition?.title ??
                        'Affectation'}
                    </StyledValue>
                    <StyledLabel>
                      {assignment.type} ·{' '}
                      {assignment.allocationBasisPoints / 100} %
                    </StyledLabel>
                  </StyledContractField>
                  <StyledContractField>
                    <StyledLabel>Période</StyledLabel>
                    <span>
                      {assignment.startDate} →{' '}
                      {assignment.endDate ?? 'en cours'}
                    </span>
                  </StyledContractField>
                  <StyledContractField>
                    <StyledLabel>Équipe</StyledLabel>
                    <span>{assignment.team?.name ?? '—'}</span>
                  </StyledContractField>
                  <StyledContractField>
                    <StyledLabel>Lieu</StyledLabel>
                    <span>{assignment.workLocation?.name ?? '—'}</span>
                  </StyledContractField>
                  <ErpStatusBadge
                    label={assignment.endDate === null ? 'Active' : 'Terminée'}
                    tone={assignment.endDate === null ? 'success' : 'neutral'}
                  />
                </StyledContractMain>
              </StyledContract>
            ))
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
                    {canWriteContracts &&
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
                    {canWriteContracts && contract.status === 'DRAFT' ? (
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
                    {canWriteContracts && contract.status === 'ACTIVE' ? (
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
                    {canWriteContracts && contract.status === 'SUSPENDED' ? (
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
                          {canWriteContracts &&
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
          drawer?.kind === 'document'
            ? 'Nouveau document RH'
            : drawer?.kind === 'documentVersion'
              ? `Nouvelle version · ${drawer.document.title}`
              : drawer?.kind === 'assignment'
                ? 'Nouvelle affectation'
                : drawer?.kind === 'amendment'
                  ? 'Nouvel avenant'
                  : 'Nouveau contrat'
        }
        description={
          drawer?.kind === 'document' || drawer?.kind === 'documentVersion'
            ? 'PDF, PNG ou JPEG, 20 Mo maximum. Chaque remplacement conserve la version précédente.'
            : drawer?.kind === 'assignment'
              ? 'La quotité cumulée ne peut pas dépasser 100 % sur une même période.'
              : drawer?.kind === 'amendment'
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
                void (drawer?.kind === 'document' ||
                drawer?.kind === 'documentVersion'
                  ? submitDocument()
                  : drawer?.kind === 'assignment'
                    ? submitAssignment()
                    : drawer?.kind === 'amendment'
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
            void (drawer?.kind === 'document' ||
            drawer?.kind === 'documentVersion'
              ? submitDocument()
              : drawer?.kind === 'assignment'
                ? submitAssignment()
                : drawer?.kind === 'amendment'
                  ? submitAmendment()
                  : submitContract());
          }}
        >
          {drawer?.kind === 'document' || drawer?.kind === 'documentVersion' ? (
            <>
              {drawer.kind === 'document' ? (
                <>
                  <StyledField>
                    Catégorie
                    <StyledSelect
                      value={documentForm.category}
                      onChange={(event) =>
                        setDocumentForm((current) => ({
                          ...current,
                          category: event.target.value,
                        }))
                      }
                    >
                      {Object.entries(documentCategoryLabels).map(
                        ([category, label]) => (
                          <option key={category} value={category}>
                            {label}
                          </option>
                        ),
                      )}
                    </StyledSelect>
                  </StyledField>
                  <StyledField>
                    Titre
                    <StyledInput
                      value={documentForm.title}
                      maxLength={180}
                      placeholder="Ex. Carte d’identité nationale"
                      onChange={(event) =>
                        setDocumentForm((current) => ({
                          ...current,
                          title: event.target.value,
                        }))
                      }
                    />
                  </StyledField>
                  <StyledCheckbox>
                    <input
                      type="checkbox"
                      checked={documentForm.isRequired}
                      onChange={(event) =>
                        setDocumentForm((current) => ({
                          ...current,
                          isRequired: event.target.checked,
                        }))
                      }
                    />
                    Pièce obligatoire
                  </StyledCheckbox>
                  <StyledField>
                    Alerter avant expiration (jours)
                    <StyledInput
                      type="number"
                      min="0"
                      max="3650"
                      value={documentForm.reminderDays}
                      onChange={(event) =>
                        setDocumentForm((current) => ({
                          ...current,
                          reminderDays: event.target.value,
                        }))
                      }
                    />
                  </StyledField>
                </>
              ) : null}
              <StyledField>
                Fichier
                <StyledInput
                  type="file"
                  accept="application/pdf,image/png,image/jpeg"
                  onChange={(event) =>
                    setDocumentForm((current) => ({
                      ...current,
                      file: event.target.files?.[0] ?? null,
                    }))
                  }
                />
              </StyledField>
              <StyledField>
                Date d’émission
                <StyledInput
                  type="date"
                  value={documentForm.issuedAt}
                  onChange={(event) =>
                    setDocumentForm((current) => ({
                      ...current,
                      issuedAt: event.target.value,
                    }))
                  }
                />
              </StyledField>
              <StyledField>
                Date d’expiration
                <StyledInput
                  type="date"
                  value={documentForm.expiresAt}
                  onChange={(event) =>
                    setDocumentForm((current) => ({
                      ...current,
                      expiresAt: event.target.value,
                    }))
                  }
                />
              </StyledField>
              <StyledField>
                Notes
                <StyledInput
                  value={documentForm.notes}
                  maxLength={2000}
                  onChange={(event) =>
                    setDocumentForm((current) => ({
                      ...current,
                      notes: event.target.value,
                    }))
                  }
                />
              </StyledField>
            </>
          ) : drawer?.kind === 'assignment' ? (
            <>
              <StyledField>
                Type
                <StyledSelect
                  value={assignmentForm.type}
                  onChange={(event) =>
                    setAssignmentForm((current) => ({
                      ...current,
                      type: event.target.value,
                    }))
                  }
                >
                  <option value="PRIMARY">Principale</option>
                  <option value="SECONDARY">Secondaire</option>
                  <option value="TEMPORARY">Temporaire</option>
                </StyledSelect>
              </StyledField>
              <StyledField>
                Intitulé
                <StyledInput
                  value={assignmentForm.title}
                  onChange={(event) =>
                    setAssignmentForm((current) => ({
                      ...current,
                      title: event.target.value,
                    }))
                  }
                />
              </StyledField>
              <StyledField>
                Quotité (%)
                <StyledInput
                  type="number"
                  min="1"
                  max="100"
                  value={assignmentForm.allocationPercent}
                  onChange={(event) =>
                    setAssignmentForm((current) => ({
                      ...current,
                      allocationPercent: event.target.value,
                    }))
                  }
                />
              </StyledField>
              <StyledField>
                Date de début
                <StyledInput
                  type="date"
                  value={assignmentForm.startDate}
                  onChange={(event) =>
                    setAssignmentForm((current) => ({
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
                  value={assignmentForm.endDate}
                  onChange={(event) =>
                    setAssignmentForm((current) => ({
                      ...current,
                      endDate: event.target.value,
                    }))
                  }
                />
              </StyledField>
              {[
                ['departmentId', 'Département', departments],
                ['jobPositionId', 'Poste', positions],
                ['teamId', 'Équipe', teams],
                ['workLocationId', 'Lieu de travail', workLocations],
                ['costCenterId', 'Centre de coûts', costCenters],
              ].map(([field, label, options]) => (
                <StyledField key={String(field)}>
                  {String(label)}
                  <StyledSelect
                    value={assignmentForm[field as keyof typeof assignmentForm]}
                    onChange={(event) =>
                      setAssignmentForm((current) => ({
                        ...current,
                        [String(field)]: event.target.value,
                      }))
                    }
                  >
                    <option value="">Non défini</option>
                    {(
                      options as Array<{
                        id: string;
                        name?: string;
                        title?: string;
                      }>
                    ).map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name ?? item.title}
                      </option>
                    ))}
                  </StyledSelect>
                </StyledField>
              ))}
            </>
          ) : drawer?.kind === 'amendment' ? (
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
