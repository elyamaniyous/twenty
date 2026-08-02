import { ErpFormDrawer } from '@/erp-maroc/components/ErpFormDrawer';
import {
  ErpOperationalTable,
  type ErpOperationalTableColumn,
} from '@/erp-maroc/components/ErpOperationalTable';
import { ErpPageShell } from '@/erp-maroc/components/ErpPageShell';
import {
  ErpStatusBadge,
  type ErpStatusTone,
} from '@/erp-maroc/components/ErpStatusBadge';
import { useErpMarocContext } from '@/erp-maroc/context/useErpMarocContext';
import { styled } from '@linaria/react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  hrPeopleMutationResultSchema,
  hrPeopleWorkspaceSchema,
  type HrApplication,
  type HrAttestationRequest,
  type HrCandidate,
  type HrEmployeeChangeRequest,
  type HrJobOpening,
  type HrNotification,
  type HrPeopleWorkspace,
} from 'twenty-shared/erp-maroc';
import {
  IconCheck,
  IconPlus,
  IconRefresh,
  IconSend,
  IconX,
} from 'twenty-ui/display';
import { Button } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';

type View =
  | 'requests'
  | 'recruitment'
  | 'skills'
  | 'training'
  | 'certifications'
  | 'reviews'
  | 'notifications';
type DrawerKind =
  | 'job'
  | 'candidate'
  | 'application'
  | 'applicationReject'
  | 'interview'
  | 'interviewResult'
  | 'offer'
  | 'hire'
  | 'skill'
  | 'assessment'
  | 'course'
  | 'session'
  | 'enrollment'
  | 'enrollmentResult'
  | 'certification'
  | 'award'
  | 'campaign'
  | 'review'
  | 'reviewResult'
  | 'objective';
type DrawerState = { kind: DrawerKind; entityId?: string } | null;
type FormState = Record<string, string>;

const viewLabels: Record<View, string> = {
  requests: 'Demandes RH',
  recruitment: 'Recrutement',
  skills: 'Compétences',
  training: 'Formations',
  certifications: 'Certifications',
  reviews: 'Évaluations',
  notifications: 'Notifications',
};

const StyledMetrics = styled.section`
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: grid;
  grid-template-columns: repeat(6, minmax(130px, 1fr));
  overflow-x: auto;
`;
const StyledMetric = styled.div`
  border-right: 1px solid ${themeCssVariables.border.color.light};
  display: grid;
  gap: ${themeCssVariables.spacing[1]};
  min-width: 130px;
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
  gap: ${themeCssVariables.spacing[1]};
  min-height: 44px;
  overflow-x: auto;
  padding: 0 ${themeCssVariables.spacing[3]};
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
const StyledSplit = styled.div`
  display: grid;
  flex: 1 1 auto;
  grid-template-rows: minmax(220px, 1fr) minmax(220px, 1fr);
  min-height: 0;
  overflow: hidden;
`;
const StyledThreeSplit = styled.div`
  display: grid;
  flex: 1 1 auto;
  grid-template-rows: repeat(3, minmax(180px, 1fr));
  min-height: 0;
  overflow: hidden;
`;
const StyledPanel = styled.section`
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
`;
const StyledPanelTitle = styled.h2`
  align-items: center;
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  color: ${themeCssVariables.font.color.primary};
  display: flex;
  font-size: ${themeCssVariables.font.size.md};
  height: 40px;
  letter-spacing: 0;
  margin: 0;
  padding: 0 ${themeCssVariables.spacing[3]};
`;
const StyledNotice = styled.div<{ danger: boolean }>`
  background: ${({ danger }) =>
    danger
      ? themeCssVariables.tag.background.red
      : themeCssVariables.tag.background.green};
  color: ${({ danger }) =>
    danger ? themeCssVariables.tag.text.red : themeCssVariables.tag.text.green};
  font-size: ${themeCssVariables.font.size.sm};
  padding: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[3]};
`;
const StyledActions = styled.div`
  align-items: center;
  display: flex;
  gap: ${themeCssVariables.spacing[1]};
  justify-content: flex-end;
`;
const StyledForm = styled.form`
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
const fieldStyle = `
  background: ${themeCssVariables.background.primary};
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.sm};
  box-sizing: border-box;
  color: ${themeCssVariables.font.color.primary};
  font: inherit;
  min-height: 34px;
  padding: 0 ${themeCssVariables.spacing[2]};
  width: 100%;
`;
const StyledInput = styled.input`
  ${fieldStyle}
`;
const StyledSelect = styled.select`
  ${fieldStyle}
`;
const StyledTextarea = styled.textarea`
  ${fieldStyle}
  min-height: 92px;
  padding-bottom: ${themeCssVariables.spacing[2]};
  padding-top: ${themeCssVariables.spacing[2]};
  resize: vertical;
`;

const formatDate = (value: string | null) =>
  value === null
    ? '—'
    : new Intl.DateTimeFormat('fr-MA', { dateStyle: 'medium' }).format(
        new Date(value),
      );
const formatMad = (value: number) =>
  new Intl.NumberFormat('fr-MA', {
    style: 'currency',
    currency: 'MAD',
  }).format(value / 100);
const statusTone = (status: string): ErpStatusTone => {
  if (
    [
      'APPROVED',
      'GENERATED',
      'SIGNED',
      'OPEN',
      'HIRED',
      'COMPLETED',
      'SENT',
    ].includes(status)
  )
    return 'success';
  if (['REJECTED', 'FAILED', 'EXPIRED', 'CANCELLED'].includes(status))
    return 'danger';
  if (['REQUESTED', 'EXPIRING', 'INTERVIEW', 'OFFER'].includes(status))
    return 'warning';
  return 'neutral';
};
const employeeLabel = (row?: {
  firstName: string;
  lastName: string;
  employeeNumber?: string;
}) =>
  row === undefined
    ? '—'
    : `${row.firstName} ${row.lastName}${row.employeeNumber ? ` · ${row.employeeNumber}` : ''}`;

const today = () => new Date().toISOString().slice(0, 10);
const nextMonth = () => {
  const date = new Date();
  date.setMonth(date.getMonth() + 1);
  return date.toISOString().slice(0, 10);
};

const drawerLabels: Record<DrawerKind, string> = {
  job: 'poste à pourvoir',
  candidate: 'candidat',
  application: 'candidature',
  applicationReject: 'refus de candidature',
  interview: 'entretien',
  interviewResult: 'compte rendu d’entretien',
  offer: 'proposition d’embauche',
  hire: 'embauche',
  skill: 'compétence',
  assessment: 'évaluation de compétence',
  course: 'formation',
  session: 'session de formation',
  enrollment: 'inscription',
  enrollmentResult: 'résultat de formation',
  certification: 'certification',
  award: 'certification salarié',
  campaign: 'campagne d’évaluation',
  review: 'évaluation',
  reviewResult: 'résultat d’évaluation',
  objective: 'objectif',
};

const emptyForm = (kind: DrawerKind): FormState => {
  const defaults: Partial<Record<DrawerKind, FormState>> = {
    job: { contractType: 'CDI', status: 'OPEN', openingsCount: '1' },
    interview: { scheduledAt: '', durationMinutes: '60' },
    interviewResult: { score: '3' },
    offer: {
      contractType: 'CDI',
      startDate: today(),
      endDate: '',
      expiresAt: nextMonth(),
    },
    hire: {
      employeeNumber: '',
      contractNumber: '',
      weeklyHoursHundredths: '4400',
    },
    assessment: { currentLevel: '3', targetLevel: '4' },
    course: { durationHours: '8' },
    certification: { validityMonths: '12', reminderDays: '30' },
    award: { issuedAt: today(), expiresAt: '', verified: 'true' },
    campaign: {
      periodStart: `${new Date().getFullYear()}-01-01`,
      periodEnd: `${new Date().getFullYear()}-12-31`,
      dueDate: `${new Date().getFullYear()}-12-31`,
      status: 'OPEN',
    },
    objective: { weightPercent: '100' },
    enrollmentResult: { attendancePercent: '100', score: '100' },
    reviewResult: { managerScore: '3', overallScore: '3' },
  };
  return defaults[kind] ?? {};
};

export const ErpHrPeoplePage = () => {
  const { client } = useErpMarocContext();
  const [data, setData] = useState<HrPeopleWorkspace | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [view, setView] = useState<View>('requests');
  const [drawer, setDrawer] = useState<DrawerState>(null);
  const [form, setForm] = useState<FormState>({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [danger, setDanger] = useState(false);

  const load = useCallback(async () => {
    setState('loading');
    try {
      setData(
        await client.request({
          method: 'GET',
          path: '/hr-people/workspace',
          schema: hrPeopleWorkspaceSchema,
        }),
      );
      setState('ready');
    } catch {
      setState('error');
    }
  }, [client]);

  useEffect(() => {
    void load();
  }, [load]);

  const openDrawer = (kind: DrawerKind, entityId?: string) => {
    setForm(emptyForm(kind));
    setDrawer({ kind, entityId });
    setMessage(null);
  };
  const setField = (key: string, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  const mutate = async (
    method: 'POST' | 'PATCH',
    path: string,
    body: unknown,
    success: string,
  ) => {
    setBusy(true);
    setMessage(null);
    try {
      const intent =
        method === 'POST'
          ? client.createMutationIntent(
              { method, path, schema: hrPeopleMutationResultSchema, body },
              { idempotency: 'required' },
            )
          : client.createMutationIntent(
              { method, path, schema: hrPeopleMutationResultSchema, body },
              { idempotency: 'forbidden' },
            );
      await intent.execute();
      setDanger(false);
      setMessage(success);
      setDrawer(null);
      await load();
    } catch {
      setDanger(true);
      setMessage(
        'Opération impossible. Vérifiez les données et le statut actuel.',
      );
    } finally {
      setBusy(false);
    }
  };

  const submitDrawer = async () => {
    if (drawer === null) return;
    const numberOrNull = (value: string | undefined) =>
      value ? Number(value) : null;
    const bodyByKind: Record<DrawerKind, unknown> = {
      job: {
        code: form.code,
        title: form.title,
        description: form.description,
        location: form.location || null,
        contractType: form.contractType,
        status: form.status,
        openingsCount: Number(form.openingsCount),
        minSalaryCents: form.minSalary ? Number(form.minSalary) * 100 : null,
        maxSalaryCents: form.maxSalary ? Number(form.maxSalary) * 100 : null,
      },
      candidate: {
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        phone: form.phone || null,
        source: form.source || null,
        consentAt: new Date().toISOString(),
      },
      application: {
        jobOpeningId: form.jobOpeningId,
        candidateId: form.candidateId,
      },
      applicationReject: {
        stage: 'REJECTED',
        rejectionReason: form.rejectionReason,
      },
      interview: {
        scheduledAt: new Date(form.scheduledAt).toISOString(),
        durationMinutes: Number(form.durationMinutes),
        location: form.location || null,
      },
      interviewResult: {
        status: 'COMPLETED',
        score: Number(form.score),
        feedback: form.feedback,
      },
      offer: {
        jobTitle: form.jobTitle,
        contractType: form.contractType,
        salaryCents: Number(form.salary) * 100,
        startDate: form.startDate,
        endDate: form.endDate || null,
        expiresAt: form.expiresAt,
      },
      hire: {
        employeeNumber: form.employeeNumber,
        contractNumber: form.contractNumber,
        weeklyHoursHundredths: Number(form.weeklyHoursHundredths),
      },
      skill: {
        code: form.code,
        name: form.name,
        category: form.category || null,
      },
      assessment: {
        skillId: form.skillId,
        currentLevel: Number(form.currentLevel),
        targetLevel: numberOrNull(form.targetLevel),
      },
      course: {
        code: form.code,
        title: form.title,
        durationHours: Number(form.durationHours),
        provider: form.provider || null,
        skillId: form.skillId || null,
      },
      session: {
        startsAt: new Date(form.startsAt).toISOString(),
        endsAt: new Date(form.endsAt).toISOString(),
        location: form.location || null,
        capacity: numberOrNull(form.capacity),
        status: 'OPEN',
      },
      enrollment: { employeeId: form.employeeId },
      enrollmentResult: {
        status: 'COMPLETED',
        attendancePercent: Number(form.attendancePercent),
        score: Number(form.score),
        notes: form.notes || null,
      },
      certification: {
        code: form.code,
        name: form.name,
        issuer: form.issuer || null,
        validityMonths: numberOrNull(form.validityMonths),
        reminderDays: Number(form.reminderDays),
        isRequired: form.isRequired === 'true',
      },
      award: {
        certificationDefinitionId: form.certificationDefinitionId,
        issuedAt: form.issuedAt,
        expiresAt: form.expiresAt || null,
        certificateNumber: form.certificateNumber || null,
        verified: form.verified === 'true',
      },
      campaign: {
        name: form.name,
        periodStart: form.periodStart,
        periodEnd: form.periodEnd,
        dueDate: form.dueDate,
        status: form.status,
      },
      review: {
        campaignId: form.campaignId,
        employeeId: form.employeeId,
        managerEmployeeId: form.managerEmployeeId || null,
      },
      reviewResult: {
        status: 'COMPLETED',
        managerScore: Number(form.managerScore),
        overallScore: Number(form.overallScore),
        managerSummary: form.managerSummary,
      },
      objective: {
        title: form.title,
        description: form.description || null,
        weightPercent: Number(form.weightPercent),
        targetValue: form.targetValue || null,
      },
    };
    const routeByKind: Record<DrawerKind, string> = {
      job: '/hr-people/job-openings',
      candidate: '/hr-people/candidates',
      application: '/hr-people/applications',
      applicationReject: `/hr-people/applications/${drawer.entityId}`,
      interview: `/hr-people/applications/${drawer.entityId}/interviews`,
      interviewResult: `/hr-people/interviews/${drawer.entityId}`,
      offer: `/hr-people/applications/${drawer.entityId}/offers`,
      hire: `/hr-people/applications/${drawer.entityId}/hire`,
      skill: '/hr-people/skills',
      assessment: `/hr-people/employees/${form.employeeId}/skills`,
      course: '/hr-people/training-courses',
      session: `/hr-people/training-courses/${form.courseId}/sessions`,
      enrollment: `/hr-people/training-sessions/${form.sessionId}/enrollments`,
      enrollmentResult: `/hr-people/training-enrollments/${drawer.entityId}`,
      certification: '/hr-people/certifications',
      award: `/hr-people/employees/${form.employeeId}/certifications`,
      campaign: '/hr-people/review-campaigns',
      review: '/hr-people/reviews',
      reviewResult: `/hr-people/reviews/${drawer.entityId}`,
      objective: `/hr-people/reviews/${form.reviewId}/objectives`,
    };
    const method = [
      'applicationReject',
      'interviewResult',
      'enrollmentResult',
      'reviewResult',
    ].includes(drawer.kind)
      ? 'PATCH'
      : 'POST';
    await mutate(
      method,
      routeByKind[drawer.kind],
      bodyByKind[drawer.kind],
      'Enregistrement effectué.',
    );
  };

  const requestColumns: ErpOperationalTableColumn<HrEmployeeChangeRequest>[] = [
    {
      key: 'employee',
      header: 'Salarié',
      width: '220px',
      render: (row) => employeeLabel(row.employee),
    },
    {
      key: 'type',
      header: 'Demande',
      width: '160px',
      render: (row) =>
        row.type === 'BANK_ACCOUNT' ? 'Coordonnées bancaires' : 'Coordonnées',
    },
    {
      key: 'value',
      header: 'Valeur proposée',
      width: '260px',
      render: (row) =>
        row.type === 'BANK_ACCOUNT'
          ? `${row.proposedBankName ?? 'Banque'} · RIB •••• ${row.proposedRibLastFour ?? ''}`
          : [row.proposedEmail, row.proposedPhone, row.proposedAddress]
              .filter(Boolean)
              .join(' · '),
    },
    {
      key: 'date',
      header: 'Demandé le',
      width: '140px',
      render: (row) => formatDate(row.requestedAt),
    },
    {
      key: 'status',
      header: 'État',
      width: '130px',
      render: (row) => (
        <ErpStatusBadge label={row.status} tone={statusTone(row.status)} />
      ),
    },
    {
      key: 'actions',
      header: '',
      width: '130px',
      align: 'right',
      render: (row) =>
        row.status !== 'REQUESTED' ? null : (
          <StyledActions>
            <Button
              title="Approuver"
              ariaLabel="Approuver la demande"
              Icon={IconCheck}
              accent="blue"
              disabled={busy}
              onClick={() =>
                void mutate(
                  'PATCH',
                  `/hr-people/change-requests/${row.id}/decision`,
                  { decision: 'APPROVED' },
                  'Demande approuvée.',
                )
              }
            />
            <Button
              title="Refuser"
              ariaLabel="Refuser la demande"
              Icon={IconX}
              variant="secondary"
              disabled={busy}
              onClick={() =>
                void mutate(
                  'PATCH',
                  `/hr-people/change-requests/${row.id}/decision`,
                  { decision: 'REJECTED', note: 'Demande refusée par les RH.' },
                  'Demande refusée.',
                )
              }
            />
          </StyledActions>
        ),
    },
  ];
  const attestationColumns: ErpOperationalTableColumn<HrAttestationRequest>[] =
    [
      {
        key: 'employee',
        header: 'Salarié',
        width: '220px',
        render: (row) => employeeLabel(row.employee),
      },
      {
        key: 'type',
        header: 'Document',
        width: '180px',
        render: (row) =>
          row.type === 'WORK'
            ? 'Attestation de travail'
            : 'Attestation de salaire',
      },
      {
        key: 'purpose',
        header: 'Motif',
        width: '260px',
        render: (row) => row.purpose ?? '—',
      },
      {
        key: 'status',
        header: 'État',
        width: '150px',
        render: (row) => (
          <ErpStatusBadge label={row.status} tone={statusTone(row.status)} />
        ),
      },
      {
        key: 'signed',
        header: 'Signature',
        width: '170px',
        render: (row) => (row.signedAt ? formatDate(row.signedAt) : '—'),
      },
      {
        key: 'actions',
        header: '',
        width: '130px',
        align: 'right',
        render: (row) =>
          row.status !== 'REQUESTED' ? null : (
            <StyledActions>
              <Button
                title="Générer"
                ariaLabel="Générer l’attestation"
                Icon={IconCheck}
                accent="blue"
                disabled={busy}
                onClick={() =>
                  void mutate(
                    'PATCH',
                    `/hr-people/attestations/${row.id}/decision`,
                    { decision: 'GENERATE' },
                    'Attestation générée.',
                  )
                }
              />
              <Button
                title="Refuser"
                ariaLabel="Refuser l’attestation"
                Icon={IconX}
                variant="secondary"
                disabled={busy}
                onClick={() =>
                  void mutate(
                    'PATCH',
                    `/hr-people/attestations/${row.id}/decision`,
                    {
                      decision: 'REJECT',
                      reason: 'Demande refusée par les RH.',
                    },
                    'Demande refusée.',
                  )
                }
              />
            </StyledActions>
          ),
      },
    ];

  const jobColumns: ErpOperationalTableColumn<HrJobOpening>[] = [
    {
      key: 'code',
      header: 'Référence',
      width: '120px',
      render: (row) => row.code,
    },
    {
      key: 'title',
      header: 'Poste',
      width: '260px',
      render: (row) => row.title,
    },
    {
      key: 'contract',
      header: 'Contrat',
      width: '100px',
      render: (row) => row.contractType,
    },
    {
      key: 'location',
      header: 'Lieu',
      width: '160px',
      render: (row) => row.location ?? '—',
    },
    {
      key: 'applications',
      header: 'Candidatures',
      width: '120px',
      align: 'right',
      render: (row) => row._count?.applications ?? 0,
    },
    {
      key: 'status',
      header: 'État',
      width: '120px',
      render: (row) => (
        <ErpStatusBadge label={row.status} tone={statusTone(row.status)} />
      ),
    },
    {
      key: 'action',
      header: '',
      width: '120px',
      align: 'right',
      render: (row) => (
        <Button
          title={row.status === 'OPEN' ? 'Suspendre' : 'Ouvrir'}
          ariaLabel="Changer le statut de l’offre"
          Icon={row.status === 'OPEN' ? IconX : IconCheck}
          variant="secondary"
          onClick={() =>
            void mutate(
              'PATCH',
              `/hr-people/job-openings/${row.id}`,
              { status: row.status === 'OPEN' ? 'PAUSED' : 'OPEN' },
              'Offre mise à jour.',
            )
          }
        />
      ),
    },
  ];
  const candidateColumns: ErpOperationalTableColumn<HrCandidate>[] = [
    {
      key: 'name',
      header: 'Candidat',
      width: '220px',
      render: (row) => `${row.firstName} ${row.lastName}`,
    },
    {
      key: 'email',
      header: 'Email',
      width: '240px',
      render: (row) => row.email,
    },
    {
      key: 'source',
      header: 'Source',
      width: '140px',
      render: (row) => row.source ?? '—',
    },
    {
      key: 'status',
      header: 'État',
      width: '120px',
      render: (row) => (
        <ErpStatusBadge label={row.status} tone={statusTone(row.status)} />
      ),
    },
  ];
  const applicationColumns: ErpOperationalTableColumn<HrApplication>[] = [
    {
      key: 'candidate',
      header: 'Candidat',
      width: '210px',
      render: (row) =>
        row.candidate
          ? `${row.candidate.firstName} ${row.candidate.lastName}`
          : '—',
    },
    {
      key: 'job',
      header: 'Poste',
      width: '220px',
      render: (row) => row.jobOpening?.title ?? '—',
    },
    {
      key: 'stage',
      header: 'Étape',
      width: '130px',
      render: (row) => (
        <ErpStatusBadge label={row.stage} tone={statusTone(row.stage)} />
      ),
    },
    {
      key: 'rating',
      header: 'Note',
      width: '80px',
      align: 'right',
      render: (row) => row.rating ?? '—',
    },
    {
      key: 'actions',
      header: 'Actions',
      width: '520px',
      align: 'right',
      render: (row) => {
        const scheduledInterview = row.interviews?.find(
          (interview) => interview.status === 'SCHEDULED',
        );
        const activeOffer = row.offers?.find((offer) =>
          ['DRAFT', 'SENT', 'ACCEPTED'].includes(offer.status),
        );
        const active = !['HIRED', 'REJECTED'].includes(row.stage);
        return (
          <StyledActions>
            {active ? (
              <>
                {row.stage === 'APPLIED' ? (
                  <Button
                    title="Présélectionner"
                    ariaLabel="Passer la candidature en présélection"
                    Icon={IconCheck}
                    variant="secondary"
                    onClick={() =>
                      void mutate(
                        'PATCH',
                        `/hr-people/applications/${row.id}`,
                        { stage: 'SCREENING' },
                        'Candidature présélectionnée.',
                      )
                    }
                  />
                ) : null}
                {scheduledInterview ? (
                  <Button
                    title="Compte rendu"
                    ariaLabel="Saisir le compte rendu de l’entretien"
                    Icon={IconCheck}
                    variant="secondary"
                    onClick={() =>
                      openDrawer('interviewResult', scheduledInterview.id)
                    }
                  />
                ) : (
                  <Button
                    title="Entretien"
                    ariaLabel="Planifier un entretien"
                    Icon={IconPlus}
                    variant="secondary"
                    onClick={() => openDrawer('interview', row.id)}
                  />
                )}
                {row.stage === 'INTERVIEW' && activeOffer === undefined ? (
                  <Button
                    title="Offre"
                    ariaLabel="Créer une offre"
                    Icon={IconSend}
                    variant="secondary"
                    onClick={() => {
                      setForm({
                        ...emptyForm('offer'),
                        jobTitle: row.jobOpening?.title ?? '',
                        contractType: row.jobOpening?.contractType ?? 'CDI',
                      });
                      setDrawer({ kind: 'offer', entityId: row.id });
                      setMessage(null);
                    }}
                  />
                ) : null}
                {activeOffer?.status === 'DRAFT' ? (
                  <Button
                    title="Envoyer l’offre"
                    ariaLabel="Envoyer l’offre au candidat"
                    Icon={IconSend}
                    variant="secondary"
                    onClick={() =>
                      void mutate(
                        'PATCH',
                        `/hr-people/offers/${activeOffer.id}`,
                        { status: 'SENT' },
                        'Offre marquée comme envoyée.',
                      )
                    }
                  />
                ) : null}
                {activeOffer?.status === 'SENT' ? (
                  <Button
                    title="Accepter l’offre"
                    ariaLabel="Enregistrer l’acceptation de l’offre"
                    Icon={IconCheck}
                    accent="blue"
                    onClick={() =>
                      void mutate(
                        'PATCH',
                        `/hr-people/offers/${activeOffer.id}`,
                        { status: 'ACCEPTED' },
                        'Acceptation enregistrée.',
                      )
                    }
                  />
                ) : null}
                {activeOffer?.status === 'ACCEPTED' ? (
                  <Button
                    title="Embaucher"
                    ariaLabel="Convertir en salarié"
                    Icon={IconCheck}
                    accent="blue"
                    onClick={() => openDrawer('hire', row.id)}
                  />
                ) : null}
                <Button
                  title="Refuser"
                  ariaLabel="Refuser la candidature"
                  Icon={IconX}
                  variant="secondary"
                  onClick={() => openDrawer('applicationReject', row.id)}
                />
              </>
            ) : null}
          </StyledActions>
        );
      },
    },
  ];

  const notificationColumns: ErpOperationalTableColumn<HrNotification>[] = [
    {
      key: 'employee',
      header: 'Destinataire',
      width: '220px',
      render: (row) =>
        employeeLabel(row.employee ?? row.candidate ?? undefined),
    },
    {
      key: 'channel',
      header: 'Canal',
      width: '100px',
      render: (row) => row.channel,
    },
    {
      key: 'title',
      header: 'Objet',
      width: '260px',
      render: (row) => row.title,
    },
    {
      key: 'date',
      header: 'Créée le',
      width: '150px',
      render: (row) => formatDate(row.createdAt),
    },
    {
      key: 'status',
      header: 'État',
      width: '120px',
      render: (row) => (
        <ErpStatusBadge label={row.status} tone={statusTone(row.status)} />
      ),
    },
    {
      key: 'error',
      header: 'Détail',
      width: '260px',
      render: (row) => row.errorMessage ?? row.providerMessageId ?? '—',
    },
    {
      key: 'action',
      header: '',
      width: '100px',
      align: 'right',
      render: (row) =>
        row.channel === 'EMAIL' && row.status === 'FAILED' ? (
          <Button
            title="Réessayer"
            ariaLabel="Réessayer l’envoi"
            Icon={IconRefresh}
            variant="secondary"
            onClick={() =>
              void mutate(
                'POST',
                `/hr-people/notifications/${row.id}/retry`,
                {},
                'Notification renvoyée.',
              )
            }
          />
        ) : null,
    },
  ];

  const simpleColumns = (
    kind:
      | 'skillDefinitions'
      | 'skills'
      | 'courses'
      | 'sessions'
      | 'enrollments'
      | 'certificationDefinitions'
      | 'certifications'
      | 'campaigns'
      | 'reviews',
  ): ErpOperationalTableColumn<Record<string, unknown>>[] => {
    if (kind === 'skillDefinitions')
      return [
        {
          key: 'code',
          header: 'Code',
          width: '120px',
          render: (row) => String(row.code),
        },
        {
          key: 'name',
          header: 'Compétence',
          width: '260px',
          render: (row) => String(row.name),
        },
        {
          key: 'category',
          header: 'Catégorie',
          width: '180px',
          render: (row) => String(row.category ?? '—'),
        },
      ];
    if (kind === 'skills')
      return [
        {
          key: 'employee',
          header: 'Salarié',
          width: '220px',
          render: (row) => employeeLabel(row.employee as never),
        },
        {
          key: 'skill',
          header: 'Compétence',
          width: '230px',
          render: (row) => (row.skill as { name?: string })?.name ?? '—',
        },
        {
          key: 'current',
          header: 'Niveau actuel',
          width: '120px',
          align: 'right',
          render: (row) => String(row.currentLevel ?? '—'),
        },
        {
          key: 'target',
          header: 'Cible',
          width: '100px',
          align: 'right',
          render: (row) => String(row.targetLevel ?? '—'),
        },
      ];
    if (kind === 'courses')
      return [
        {
          key: 'code',
          header: 'Code',
          width: '120px',
          render: (row) => String(row.code),
        },
        {
          key: 'title',
          header: 'Formation',
          width: '280px',
          render: (row) => String(row.title),
        },
        {
          key: 'provider',
          header: 'Organisme',
          width: '180px',
          render: (row) => String(row.provider ?? '—'),
        },
        {
          key: 'duration',
          header: 'Durée',
          width: '100px',
          align: 'right',
          render: (row) => `${String(row.durationHours)} h`,
        },
      ];
    if (kind === 'sessions')
      return [
        {
          key: 'course',
          header: 'Formation',
          width: '260px',
          render: (row) =>
            String((row.course as { title?: string })?.title ?? '—'),
        },
        {
          key: 'start',
          header: 'Début',
          width: '160px',
          render: (row) => formatDate(String(row.startsAt)),
        },
        {
          key: 'location',
          header: 'Lieu',
          width: '160px',
          render: (row) => String(row.location ?? '—'),
        },
        {
          key: 'status',
          header: 'État',
          width: '120px',
          render: (row) => (
            <ErpStatusBadge
              label={String(row.status)}
              tone={statusTone(String(row.status))}
            />
          ),
        },
        {
          key: 'enrollments',
          header: 'Inscrits',
          width: '100px',
          align: 'right',
          render: (row) =>
            String((row.enrollments as unknown[] | undefined)?.length ?? 0),
        },
      ];
    if (kind === 'enrollments')
      return [
        {
          key: 'employee',
          header: 'Salarié',
          width: '220px',
          render: (row) => employeeLabel(row.employee as never),
        },
        {
          key: 'course',
          header: 'Formation',
          width: '260px',
          render: (row) => String(row.courseTitle ?? '—'),
        },
        {
          key: 'status',
          header: 'État',
          width: '120px',
          render: (row) => (
            <ErpStatusBadge
              label={String(row.status)}
              tone={statusTone(String(row.status))}
            />
          ),
        },
        {
          key: 'attendance',
          header: 'Présence',
          width: '100px',
          align: 'right',
          render: (row) =>
            row.attendancePercent === null
              ? '—'
              : `${String(row.attendancePercent)} %`,
        },
        {
          key: 'action',
          header: '',
          width: '120px',
          align: 'right',
          render: (row) =>
            row.status === 'ENROLLED' ? (
              <Button
                title="Résultat"
                ariaLabel="Saisir le résultat de formation"
                Icon={IconCheck}
                variant="secondary"
                onClick={() => openDrawer('enrollmentResult', String(row.id))}
              />
            ) : null,
        },
      ];
    if (kind === 'certificationDefinitions')
      return [
        {
          key: 'code',
          header: 'Code',
          width: '120px',
          render: (row) => String(row.code),
        },
        {
          key: 'name',
          header: 'Certification',
          width: '280px',
          render: (row) => String(row.name),
        },
        {
          key: 'issuer',
          header: 'Organisme',
          width: '200px',
          render: (row) => String(row.issuer ?? '—'),
        },
        {
          key: 'required',
          header: 'Obligatoire',
          width: '110px',
          render: (row) => (row.isRequired ? 'Oui' : 'Non'),
        },
      ];
    if (kind === 'certifications')
      return [
        {
          key: 'employee',
          header: 'Salarié',
          width: '220px',
          render: (row) => employeeLabel(row.employee as never),
        },
        {
          key: 'certification',
          header: 'Certification',
          width: '250px',
          render: (row) =>
            String(
              (row.certificationDefinition as { name?: string })?.name ?? '—',
            ),
        },
        {
          key: 'issued',
          header: 'Délivrée le',
          width: '140px',
          render: (row) => formatDate(String(row.issuedAt)),
        },
        {
          key: 'expires',
          header: 'Expire le',
          width: '140px',
          render: (row) =>
            row.expiresAt ? formatDate(String(row.expiresAt)) : '—',
        },
        {
          key: 'status',
          header: 'État',
          width: '120px',
          render: (row) => (
            <ErpStatusBadge
              label={String(row.validityStatus)}
              tone={statusTone(String(row.validityStatus))}
            />
          ),
        },
      ];
    if (kind === 'campaigns')
      return [
        {
          key: 'name',
          header: 'Campagne',
          width: '260px',
          render: (row) => String(row.name),
        },
        {
          key: 'period',
          header: 'Période',
          width: '260px',
          render: (row) =>
            `${formatDate(String(row.periodStart))} – ${formatDate(String(row.periodEnd))}`,
        },
        {
          key: 'due',
          header: 'Échéance',
          width: '140px',
          render: (row) => formatDate(String(row.dueDate)),
        },
        {
          key: 'status',
          header: 'État',
          width: '120px',
          render: (row) => (
            <ErpStatusBadge
              label={String(row.status)}
              tone={statusTone(String(row.status))}
            />
          ),
        },
      ];
    return [
      {
        key: 'employee',
        header: 'Salarié',
        width: '220px',
        render: (row) => employeeLabel(row.employee as never),
      },
      {
        key: 'campaign',
        header: 'Campagne',
        width: '220px',
        render: (row) =>
          String((row.campaign as { name?: string })?.name ?? '—'),
      },
      {
        key: 'manager',
        header: 'Manager',
        width: '220px',
        render: (row) => employeeLabel(row.managerEmployee as never),
      },
      {
        key: 'status',
        header: 'État',
        width: '150px',
        render: (row) => (
          <ErpStatusBadge
            label={String(row.status)}
            tone={statusTone(String(row.status))}
          />
        ),
      },
      {
        key: 'score',
        header: 'Score',
        width: '100px',
        align: 'right',
        render: (row) => String(row.overallScore ?? '—'),
      },
      {
        key: 'objectives',
        header: 'Objectifs',
        width: '100px',
        align: 'right',
        render: (row) =>
          String((row.objectives as unknown[] | undefined)?.length ?? 0),
      },
      {
        key: 'action',
        header: '',
        width: '230px',
        align: 'right',
        render: (row) => (
          <StyledActions>
            <Button
              title="Objectif"
              ariaLabel="Ajouter un objectif"
              Icon={IconPlus}
              variant="secondary"
              onClick={() => {
                openDrawer('objective');
                setField('reviewId', String(row.id));
              }}
            />
            {row.status !== 'COMPLETED' ? (
              <Button
                title="Évaluer"
                ariaLabel="Finaliser l’évaluation"
                Icon={IconCheck}
                accent="blue"
                onClick={() => openDrawer('reviewResult', String(row.id))}
              />
            ) : null}
          </StyledActions>
        ),
      },
    ];
  };

  const primaryDrawer = useMemo<DrawerKind | null>(() => {
    if (view === 'recruitment') return 'job';
    if (view === 'skills') return 'skill';
    if (view === 'training') return 'course';
    if (view === 'certifications') return 'certification';
    if (view === 'reviews') return 'campaign';
    return null;
  }, [view]);

  const tableState = state === 'ready' ? 'ready' : state;
  const renderContent = () => {
    if (view === 'requests')
      return (
        <StyledSplit>
          <StyledPanel>
            <StyledPanelTitle>Modifications sensibles</StyledPanelTitle>
            <ErpOperationalTable
              ariaLabel="Demandes de modification"
              rows={data?.changeRequests ?? []}
              columns={requestColumns}
              getRowKey={(row) => row.id}
              state={tableState}
              onRetry={() => void load()}
            />
          </StyledPanel>
          <StyledPanel>
            <StyledPanelTitle>Attestations et signatures</StyledPanelTitle>
            <ErpOperationalTable
              ariaLabel="Demandes d’attestation"
              rows={data?.attestations ?? []}
              columns={attestationColumns}
              getRowKey={(row) => row.id}
              state={tableState}
              onRetry={() => void load()}
            />
          </StyledPanel>
        </StyledSplit>
      );
    if (view === 'recruitment')
      return (
        <StyledThreeSplit>
          <StyledPanel>
            <StyledPanelTitle>Postes à pourvoir</StyledPanelTitle>
            <ErpOperationalTable
              ariaLabel="Postes à pourvoir"
              rows={data?.recruitment.jobOpenings ?? []}
              columns={jobColumns}
              getRowKey={(row) => row.id}
              state={tableState}
            />
          </StyledPanel>
          <StyledPanel>
            <StyledPanelTitle>Vivier candidats</StyledPanelTitle>
            <ErpOperationalTable
              ariaLabel="Vivier candidats"
              rows={data?.recruitment.candidates ?? []}
              columns={candidateColumns}
              getRowKey={(row) => row.id}
              state={tableState}
            />
          </StyledPanel>
          <StyledPanel>
            <StyledPanelTitle>Candidatures</StyledPanelTitle>
            <ErpOperationalTable
              ariaLabel="Candidatures"
              rows={data?.recruitment.applications ?? []}
              columns={applicationColumns}
              getRowKey={(row) => row.id}
              state={tableState}
            />
          </StyledPanel>
        </StyledThreeSplit>
      );
    if (view === 'notifications')
      return (
        <ErpOperationalTable
          ariaLabel="Historique des notifications"
          rows={data?.notifications ?? []}
          columns={notificationColumns}
          getRowKey={(row) => row.id}
          state={tableState}
          onRetry={() => void load()}
        />
      );
    if (view === 'skills')
      return (
        <StyledSplit>
          <StyledPanel>
            <StyledPanelTitle>Référentiel de compétences</StyledPanelTitle>
            <ErpOperationalTable
              ariaLabel="Référentiel de compétences"
              rows={(data?.talent.skills ?? []) as Record<string, unknown>[]}
              columns={simpleColumns('skillDefinitions')}
              getRowKey={(row) => String(row.id)}
              state={tableState}
            />
          </StyledPanel>
          <StyledPanel>
            <StyledPanelTitle>Évaluations des salariés</StyledPanelTitle>
            <ErpOperationalTable
              ariaLabel="Évaluations de compétences"
              rows={
                (data?.talent.employeeSkills ?? []) as Record<string, unknown>[]
              }
              columns={simpleColumns('skills')}
              getRowKey={(row) => String(row.id)}
              state={tableState}
            />
          </StyledPanel>
        </StyledSplit>
      );
    if (view === 'training') {
      const enrollments =
        data?.talent.sessions.flatMap((session) =>
          (session.enrollments ?? []).map((enrollment) => ({
            ...enrollment,
            courseTitle: session.course?.title ?? null,
          })),
        ) ?? [];
      return (
        <StyledThreeSplit>
          <StyledPanel>
            <StyledPanelTitle>Catalogue de formation</StyledPanelTitle>
            <ErpOperationalTable
              ariaLabel="Catalogue de formation"
              rows={(data?.talent.courses ?? []) as Record<string, unknown>[]}
              columns={simpleColumns('courses')}
              getRowKey={(row) => String(row.id)}
              state={tableState}
            />
          </StyledPanel>
          <StyledPanel>
            <StyledPanelTitle>Sessions</StyledPanelTitle>
            <ErpOperationalTable
              ariaLabel="Sessions de formation"
              rows={(data?.talent.sessions ?? []) as Record<string, unknown>[]}
              columns={simpleColumns('sessions')}
              getRowKey={(row) => String(row.id)}
              state={tableState}
            />
          </StyledPanel>
          <StyledPanel>
            <StyledPanelTitle>Inscriptions et résultats</StyledPanelTitle>
            <ErpOperationalTable
              ariaLabel="Inscriptions aux formations"
              rows={enrollments as Record<string, unknown>[]}
              columns={simpleColumns('enrollments')}
              getRowKey={(row) => String(row.id)}
              state={tableState}
            />
          </StyledPanel>
        </StyledThreeSplit>
      );
    }
    if (view === 'certifications')
      return (
        <StyledSplit>
          <StyledPanel>
            <StyledPanelTitle>Référentiel de certifications</StyledPanelTitle>
            <ErpOperationalTable
              ariaLabel="Référentiel de certifications"
              rows={
                (data?.talent.certifications ?? []) as Record<string, unknown>[]
              }
              columns={simpleColumns('certificationDefinitions')}
              getRowKey={(row) => String(row.id)}
              state={tableState}
            />
          </StyledPanel>
          <StyledPanel>
            <StyledPanelTitle>Certifications des salariés</StyledPanelTitle>
            <ErpOperationalTable
              ariaLabel="Certifications des salariés"
              rows={
                (data?.talent.employeeCertifications ?? []) as Record<
                  string,
                  unknown
                >[]
              }
              columns={simpleColumns('certifications')}
              getRowKey={(row) => String(row.id)}
              state={tableState}
            />
          </StyledPanel>
        </StyledSplit>
      );
    if (view === 'reviews')
      return (
        <StyledSplit>
          <StyledPanel>
            <StyledPanelTitle>Campagnes</StyledPanelTitle>
            <ErpOperationalTable
              ariaLabel="Campagnes d’évaluation"
              rows={
                (data?.talent.reviewCampaigns ?? []) as Record<
                  string,
                  unknown
                >[]
              }
              columns={simpleColumns('campaigns')}
              getRowKey={(row) => String(row.id)}
              state={tableState}
            />
          </StyledPanel>
          <StyledPanel>
            <StyledPanelTitle>Évaluations et objectifs</StyledPanelTitle>
            <ErpOperationalTable
              ariaLabel="Évaluations professionnelles"
              rows={(data?.talent.reviews ?? []) as Record<string, unknown>[]}
              columns={simpleColumns('reviews')}
              getRowKey={(row) => String(row.id)}
              state={tableState}
            />
          </StyledPanel>
        </StyledSplit>
      );
    return null;
  };

  const input = (label: string, key: string, type = 'text') => (
    <StyledField>
      {label}
      <StyledInput
        type={type}
        value={form[key] ?? ''}
        onChange={(event) => setField(key, event.target.value)}
      />
    </StyledField>
  );
  const select = (
    label: string,
    key: string,
    options: Array<{ value: string; label: string }>,
  ) => (
    <StyledField>
      {label}
      <StyledSelect
        value={form[key] ?? ''}
        onChange={(event) => setField(key, event.target.value)}
      >
        <option value="">Sélectionner</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </StyledSelect>
    </StyledField>
  );
  const employeeOptions =
    data?.employees.map((employee) => ({
      value: employee.id,
      label: employeeLabel(employee),
    })) ?? [];
  const drawerFields = () => {
    if (!drawer) return null;
    switch (drawer.kind) {
      case 'job':
        return (
          <>
            {input('Référence', 'code')}
            {input('Intitulé du poste', 'title')}
            <StyledField>
              Description
              <StyledTextarea
                value={form.description ?? ''}
                onChange={(event) =>
                  setField('description', event.target.value)
                }
              />
            </StyledField>
            {input('Lieu', 'location')}
            {select(
              'Contrat',
              'contractType',
              ['CDI', 'CDD', 'ANAPEC', 'INTERIM', 'STAGE'].map((value) => ({
                value,
                label: value,
              })),
            )}
            {input('Nombre de postes', 'openingsCount', 'number')}
            {input('Salaire minimum (MAD)', 'minSalary', 'number')}
            {input('Salaire maximum (MAD)', 'maxSalary', 'number')}
          </>
        );
      case 'candidate':
        return (
          <>
            {input('Prénom', 'firstName')}
            {input('Nom', 'lastName')}
            {input('Email', 'email', 'email')}
            {input('Téléphone', 'phone')}
            {input('Source', 'source')}
          </>
        );
      case 'application':
        return (
          <>
            {select(
              'Poste',
              'jobOpeningId',
              data?.recruitment.jobOpenings
                .filter((job) => job.status === 'OPEN')
                .map((job) => ({
                  value: job.id,
                  label: `${job.code} · ${job.title}`,
                })) ?? [],
            )}
            {select(
              'Candidat',
              'candidateId',
              data?.recruitment.candidates
                .filter((candidate) => candidate.status === 'ACTIVE')
                .map((candidate) => ({
                  value: candidate.id,
                  label: `${candidate.firstName} ${candidate.lastName}`,
                })) ?? [],
            )}
          </>
        );
      case 'applicationReject':
        return (
          <StyledField>
            Motif du refus
            <StyledTextarea
              value={form.rejectionReason ?? ''}
              onChange={(event) =>
                setField('rejectionReason', event.target.value)
              }
            />
          </StyledField>
        );
      case 'interview':
        return (
          <>
            {input('Date et heure', 'scheduledAt', 'datetime-local')}
            {input('Durée (minutes)', 'durationMinutes', 'number')}
            {input('Lieu ou lien', 'location')}
          </>
        );
      case 'interviewResult':
        return (
          <>
            {input('Note (1-5)', 'score', 'number')}
            <StyledField>
              Compte rendu
              <StyledTextarea
                value={form.feedback ?? ''}
                onChange={(event) => setField('feedback', event.target.value)}
              />
            </StyledField>
          </>
        );
      case 'offer':
        return (
          <>
            {input('Intitulé', 'jobTitle')}
            {select(
              'Contrat',
              'contractType',
              ['CDI', 'CDD', 'ANAPEC', 'INTERIM', 'STAGE'].map((value) => ({
                value,
                label: value,
              })),
            )}
            {input('Salaire brut (MAD)', 'salary', 'number')}
            {input('Début', 'startDate', 'date')}
            {input('Fin', 'endDate', 'date')}
            {input('Valable jusqu’au', 'expiresAt', 'date')}
          </>
        );
      case 'hire':
        return (
          <>
            {input('Matricule salarié', 'employeeNumber')}
            {input('Numéro de contrat', 'contractNumber')}
            {input(
              'Durée hebdomadaire (centièmes d’heure)',
              'weeklyHoursHundredths',
              'number',
            )}
          </>
        );
      case 'skill':
        return (
          <>
            {input('Code', 'code')}
            {input('Compétence', 'name')}
            {input('Catégorie', 'category')}
          </>
        );
      case 'assessment':
        return (
          <>
            {select('Salarié', 'employeeId', employeeOptions)}
            {select(
              'Compétence',
              'skillId',
              data?.talent.skills.map((skill) => ({
                value: skill.id,
                label: skill.name,
              })) ?? [],
            )}
            {input('Niveau actuel (1-5)', 'currentLevel', 'number')}
            {input('Niveau cible (1-5)', 'targetLevel', 'number')}
          </>
        );
      case 'course':
        return (
          <>
            {input('Code', 'code')}
            {input('Formation', 'title')}
            {input('Organisme', 'provider')}
            {input('Durée (heures)', 'durationHours', 'number')}
            {select(
              'Compétence associée',
              'skillId',
              data?.talent.skills.map((skill) => ({
                value: skill.id,
                label: skill.name,
              })) ?? [],
            )}
          </>
        );
      case 'session':
        return (
          <>
            {select(
              'Formation',
              'courseId',
              data?.talent.courses.map((course) => ({
                value: course.id,
                label: course.title,
              })) ?? [],
            )}
            {input('Début', 'startsAt', 'datetime-local')}
            {input('Fin', 'endsAt', 'datetime-local')}
            {input('Lieu', 'location')}
            {input('Capacité', 'capacity', 'number')}
          </>
        );
      case 'enrollment':
        return (
          <>
            {select(
              'Session',
              'sessionId',
              data?.talent.sessions.map((session) => ({
                value: session.id,
                label: `${session.course?.title ?? 'Formation'} · ${formatDate(session.startsAt)}`,
              })) ?? [],
            )}
            {select('Salarié', 'employeeId', employeeOptions)}
          </>
        );
      case 'enrollmentResult':
        return (
          <>
            {input('Présence (%)', 'attendancePercent', 'number')}
            {input('Score (/100)', 'score', 'number')}
            <StyledField>
              Observations
              <StyledTextarea
                value={form.notes ?? ''}
                onChange={(event) => setField('notes', event.target.value)}
              />
            </StyledField>
          </>
        );
      case 'certification':
        return (
          <>
            {input('Code', 'code')}
            {input('Certification', 'name')}
            {input('Organisme émetteur', 'issuer')}
            {input('Validité (mois)', 'validityMonths', 'number')}
            {input('Alerte avant expiration (jours)', 'reminderDays', 'number')}
            {select('Obligatoire', 'isRequired', [
              { value: 'false', label: 'Non' },
              { value: 'true', label: 'Oui' },
            ])}
          </>
        );
      case 'award':
        return (
          <>
            {select('Salarié', 'employeeId', employeeOptions)}
            {select(
              'Certification',
              'certificationDefinitionId',
              data?.talent.certifications.map((item) => ({
                value: item.id,
                label: item.name,
              })) ?? [],
            )}
            {input('Numéro de certificat', 'certificateNumber')}
            {input('Date de délivrance', 'issuedAt', 'date')}
            {input('Expiration', 'expiresAt', 'date')}
          </>
        );
      case 'campaign':
        return (
          <>
            {input('Nom de la campagne', 'name')}
            {input('Début de période', 'periodStart', 'date')}
            {input('Fin de période', 'periodEnd', 'date')}
            {input('Échéance', 'dueDate', 'date')}
          </>
        );
      case 'review':
        return (
          <>
            {select(
              'Campagne',
              'campaignId',
              data?.talent.reviewCampaigns.map((campaign) => ({
                value: campaign.id,
                label: campaign.name,
              })) ?? [],
            )}
            {select('Salarié', 'employeeId', employeeOptions)}
            {select('Manager', 'managerEmployeeId', employeeOptions)}
          </>
        );
      case 'reviewResult':
        return (
          <>
            {input('Note manager (1-5)', 'managerScore', 'number')}
            {input('Note globale (1-5)', 'overallScore', 'number')}
            <StyledField>
              Synthèse du manager
              <StyledTextarea
                value={form.managerSummary ?? ''}
                onChange={(event) =>
                  setField('managerSummary', event.target.value)
                }
              />
            </StyledField>
          </>
        );
      case 'objective':
        return (
          <>
            {select(
              'Évaluation',
              'reviewId',
              data?.talent.reviews.map((review) => ({
                value: review.id,
                label: `${employeeLabel(review.employee)} · ${review.campaign?.name ?? ''}`,
              })) ?? [],
            )}
            {input('Objectif', 'title')}
            <StyledField>
              Description
              <StyledTextarea
                value={form.description ?? ''}
                onChange={(event) =>
                  setField('description', event.target.value)
                }
              />
            </StyledField>
            {input('Poids (%)', 'weightPercent', 'number')}
            {input('Cible mesurable', 'targetValue')}
          </>
        );
    }
  };

  return (
    <ErpPageShell
      title="Développement RH"
      description="Demandes, recrutement, compétences, formations et évaluations"
      state={state}
      onRetry={() => void load()}
      actions={
        <>
          <Button
            title="Actualiser"
            ariaLabel="Actualiser le développement RH"
            Icon={IconRefresh}
            variant="secondary"
            onClick={() => void load()}
          />
          {primaryDrawer ? (
            <Button
              title="Créer"
              ariaLabel={`Créer dans ${viewLabels[view]}`}
              Icon={IconPlus}
              accent="blue"
              onClick={() => openDrawer(primaryDrawer)}
            />
          ) : null}
        </>
      }
    >
      {data ? (
        <StyledMetrics>
          {[
            ['Modifications à valider', data.summary.pendingChanges],
            ['Attestations à produire', data.summary.pendingAttestations],
            ['Postes ouverts', data.summary.openJobs],
            ['Candidatures actives', data.summary.activeApplications],
            ['Certifications à risque', data.summary.certificationsAtRisk],
            ['Évaluations en cours', data.summary.reviewsInProgress],
          ].map(([label, value]) => (
            <StyledMetric key={String(label)}>
              <StyledMetricLabel>{label}</StyledMetricLabel>
              <StyledMetricValue>{value}</StyledMetricValue>
            </StyledMetric>
          ))}
        </StyledMetrics>
      ) : null}
      <StyledToolbar>
        {(Object.keys(viewLabels) as View[]).map((item) => (
          <StyledTab
            key={item}
            active={view === item}
            onClick={() => setView(item)}
          >
            {viewLabels[item]}
          </StyledTab>
        ))}
        {view === 'recruitment' ? (
          <>
            <Button
              title="Candidat"
              ariaLabel="Créer un candidat"
              Icon={IconPlus}
              variant="secondary"
              onClick={() => openDrawer('candidate')}
            />
            <Button
              title="Candidature"
              ariaLabel="Créer une candidature"
              Icon={IconPlus}
              variant="secondary"
              onClick={() => openDrawer('application')}
            />
          </>
        ) : null}
        {view === 'skills' ? (
          <Button
            title="Évaluer"
            ariaLabel="Évaluer une compétence"
            Icon={IconPlus}
            variant="secondary"
            onClick={() => openDrawer('assessment')}
          />
        ) : null}
        {view === 'training' ? (
          <>
            <Button
              title="Session"
              ariaLabel="Planifier une session"
              Icon={IconPlus}
              variant="secondary"
              onClick={() => openDrawer('session')}
            />
            <Button
              title="Inscrire"
              ariaLabel="Inscrire un salarié"
              Icon={IconPlus}
              variant="secondary"
              onClick={() => openDrawer('enrollment')}
            />
          </>
        ) : null}
        {view === 'certifications' ? (
          <Button
            title="Attribuer"
            ariaLabel="Attribuer une certification"
            Icon={IconPlus}
            variant="secondary"
            onClick={() => openDrawer('award')}
          />
        ) : null}
        {view === 'reviews' ? (
          <>
            <Button
              title="Évaluation"
              ariaLabel="Créer une évaluation"
              Icon={IconPlus}
              variant="secondary"
              onClick={() => openDrawer('review')}
            />
            <Button
              title="Objectif"
              ariaLabel="Créer un objectif"
              Icon={IconPlus}
              variant="secondary"
              onClick={() => openDrawer('objective')}
            />
          </>
        ) : null}
      </StyledToolbar>
      {message ? <StyledNotice danger={danger}>{message}</StyledNotice> : null}
      {renderContent()}
      <ErpFormDrawer
        isOpen={drawer !== null}
        title={drawer ? `Saisir : ${drawerLabels[drawer.kind]}` : 'Saisir'}
        description="Les champs sont contrôlés avant enregistrement."
        isBusy={busy}
        onClose={() => setDrawer(null)}
        footer={
          <>
            <Button
              title="Annuler"
              ariaLabel="Annuler"
              variant="secondary"
              onClick={() => setDrawer(null)}
            />
            <Button
              title="Enregistrer"
              ariaLabel="Enregistrer"
              Icon={IconCheck}
              accent="blue"
              disabled={busy}
              onClick={() => void submitDrawer()}
            />
          </>
        }
      >
        <StyledForm
          onSubmit={(event) => {
            event.preventDefault();
            void submitDrawer();
          }}
        >
          {drawerFields()}
        </StyledForm>
      </ErpFormDrawer>
    </ErpPageShell>
  );
};
