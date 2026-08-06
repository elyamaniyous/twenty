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
  erpEmployeeListSchema,
  talentEmployeeSkillListSchema,
  talentEmployeeSkillSchema,
  talentPerformanceCycleListSchema,
  talentPerformanceCycleSchema,
  talentPerformanceReviewListSchema,
  talentPerformanceReviewSchema,
  talentRecruitmentApplicationListSchema,
  talentRecruitmentApplicationSchema,
  talentRecruitmentInterviewSchema,
  talentRecruitmentJobListSchema,
  talentRecruitmentJobSchema,
  talentSkillListSchema,
  talentSkillSchema,
  talentTrainingCourseListSchema,
  talentTrainingCourseSchema,
  talentTrainingEnrollmentListSchema,
  talentTrainingEnrollmentSchema,
  talentTrainingSessionListSchema,
  talentTrainingSessionSchema,
  type ErpEmployee,
  type TalentEmployeeSkill,
  type TalentPerformanceCycle,
  type TalentPerformanceReview,
  type TalentRecruitmentApplication,
  type TalentRecruitmentJob,
  type TalentSkill,
  type TalentTrainingCourse,
  type TalentTrainingEnrollment,
  type TalentTrainingSession,
} from 'twenty-shared/erp-maroc';
import {
  IconCheck,
  IconClock,
  IconPlus,
  IconRefresh,
  IconSend,
  IconX,
} from 'twenty-ui/display';
import { Button } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';

type View = 'recruitment' | 'training' | 'skills' | 'performance';
type LoadState = 'loading' | 'ready' | 'error';
type FormMode =
  | 'job'
  | 'application'
  | 'interview'
  | 'interview-result'
  | 'hire'
  | 'course'
  | 'session'
  | 'enrollment'
  | 'enrollment-result'
  | 'skill'
  | 'employee-skill'
  | 'cycle'
  | 'review'
  | 'review-result'
  | null;

const today = () => new Date().toISOString().slice(0, 10);
const nextMonth = () => {
  const value = new Date();
  value.setUTCMonth(value.getUTCMonth() + 1);
  return value.toISOString().slice(0, 10);
};
const tomorrowLocalInput = () => {
  const value = new Date();
  value.setDate(value.getDate() + 1);
  value.setHours(10, 0, 0, 0);
  const offset = value.getTimezoneOffset() * 60_000;
  return new Date(value.getTime() - offset).toISOString().slice(0, 16);
};

const employeeName = (employee?: ErpEmployee | null) =>
  employee ? `${employee.firstName} ${employee.lastName}` : '—';

const StyledToolbar = styled.div`
  align-items: center;
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  flex: 0 0 auto;
  gap: ${themeCssVariables.spacing[2]};
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
  font: inherit;
  font-size: ${themeCssVariables.font.size.sm};
  height: 30px;
  padding: 0 ${themeCssVariables.spacing[2]};
  white-space: nowrap;
`;

const StyledActions = styled.div`
  align-items: center;
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
`;

const StyledForm = styled.form`
  align-items: end;
  background: ${themeCssVariables.background.secondary};
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: grid;
  flex: 0 0 auto;
  gap: ${themeCssVariables.spacing[2]};
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  padding: ${themeCssVariables.spacing[3]};
`;

const StyledField = styled.label`
  color: ${themeCssVariables.font.color.secondary};
  display: flex;
  flex-direction: column;
  font-size: ${themeCssVariables.font.size.sm};
  gap: ${themeCssVariables.spacing[1]};
  min-width: 0;
`;

const StyledControl = styled.input`
  background: ${themeCssVariables.background.primary};
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.sm};
  box-sizing: border-box;
  color: ${themeCssVariables.font.color.primary};
  font: inherit;
  font-size: ${themeCssVariables.font.size.sm};
  height: 30px;
  min-width: 0;
  padding: 0 ${themeCssVariables.spacing[2]};
`;

const StyledSelect = styled.select`
  background: ${themeCssVariables.background.primary};
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.sm};
  color: ${themeCssVariables.font.color.primary};
  font: inherit;
  font-size: ${themeCssVariables.font.size.sm};
  height: 30px;
  min-width: 0;
  padding: 0 ${themeCssVariables.spacing[2]};
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

const StyledMetrics = styled.div`
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: grid;
  grid-template-columns: repeat(4, minmax(130px, 1fr));
  overflow-x: auto;
`;

const StyledMetric = styled.div`
  border-right: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[1]};
  padding: ${themeCssVariables.spacing[3]};
`;

const StyledMetricLabel = styled.span`
  color: ${themeCssVariables.font.color.secondary};
  font-size: ${themeCssVariables.font.size.sm};
`;

const StyledMetricValue = styled.strong`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.lg};
  letter-spacing: 0;
`;

const StyledSubheading = styled.div`
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.md};
  font-weight: ${themeCssVariables.font.weight.semiBold};
  padding: ${themeCssVariables.spacing[3]};
`;

const StyledRowActions = styled.div`
  align-items: center;
  display: flex;
  gap: ${themeCssVariables.spacing[1]};
  justify-content: flex-end;
`;

const StyledAction = styled.button`
  align-items: center;
  background: transparent;
  border: 0;
  color: ${themeCssVariables.color.blue};
  cursor: pointer;
  display: inline-flex;
  font: inherit;
  font-size: ${themeCssVariables.font.size.sm};
  gap: ${themeCssVariables.spacing[1]};
  padding: ${themeCssVariables.spacing[1]};

  &:disabled {
    color: ${themeCssVariables.font.color.extraLight};
    cursor: default;
  }
`;

const statusBadge = (status: string) => {
  const values: Record<string, { label: string; tone: ErpStatusTone }> = {
    DRAFT: { label: 'Brouillon', tone: 'neutral' },
    OPEN: { label: 'Ouvert', tone: 'success' },
    PAUSED: { label: 'En pause', tone: 'warning' },
    CLOSED: { label: 'Clôturé', tone: 'neutral' },
    FILLED: { label: 'Pourvu', tone: 'success' },
    NEW: { label: 'Nouveau', tone: 'info' },
    SCREENING: { label: 'Présélection', tone: 'warning' },
    SHORTLISTED: { label: 'Retenu', tone: 'info' },
    INTERVIEW: { label: 'Entretien', tone: 'warning' },
    OFFER: { label: 'Offre', tone: 'info' },
    HIRED: { label: 'Embauché', tone: 'success' },
    REJECTED: { label: 'Rejeté', tone: 'danger' },
    WITHDRAWN: { label: 'Retiré', tone: 'neutral' },
    SCHEDULED: { label: 'Planifié', tone: 'info' },
    IN_PROGRESS: { label: 'En cours', tone: 'warning' },
    REGISTERED: { label: 'Inscrit', tone: 'info' },
    ATTENDED: { label: 'Présent', tone: 'warning' },
    COMPLETED: { label: 'Terminé', tone: 'success' },
    FAILED: { label: 'Non validé', tone: 'danger' },
    CANCELLED: { label: 'Annulé', tone: 'danger' },
    SELF_REVIEW: { label: 'Autoévaluation', tone: 'info' },
    MANAGER_REVIEW: { label: 'Manager', tone: 'warning' },
    FINALIZED: { label: 'Finalisée', tone: 'success' },
  };
  const value = values[status] ?? { label: status, tone: 'neutral' as const };
  return <ErpStatusBadge label={value.label} tone={value.tone} />;
};

export const ErpTalentPage = () => {
  const { client } = useErpMarocContext();
  const [view, setView] = useState<View>('recruitment');
  const [formMode, setFormMode] = useState<FormMode>(null);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageDanger, setMessageDanger] = useState(false);

  const [employees, setEmployees] = useState<ErpEmployee[]>([]);
  const [jobs, setJobs] = useState<TalentRecruitmentJob[]>([]);
  const [applications, setApplications] = useState<
    TalentRecruitmentApplication[]
  >([]);
  const [courses, setCourses] = useState<TalentTrainingCourse[]>([]);
  const [sessions, setSessions] = useState<TalentTrainingSession[]>([]);
  const [enrollments, setEnrollments] = useState<TalentTrainingEnrollment[]>(
    [],
  );
  const [skills, setSkills] = useState<TalentSkill[]>([]);
  const [employeeSkills, setEmployeeSkills] = useState<TalentEmployeeSkill[]>(
    [],
  );
  const [cycles, setCycles] = useState<TalentPerformanceCycle[]>([]);
  const [reviews, setReviews] = useState<TalentPerformanceReview[]>([]);

  const [selectedApplication, setSelectedApplication] =
    useState<TalentRecruitmentApplication | null>(null);
  const [selectedEnrollment, setSelectedEnrollment] =
    useState<TalentTrainingEnrollment | null>(null);
  const [selectedReview, setSelectedReview] =
    useState<TalentPerformanceReview | null>(null);

  const [jobForm, setJobForm] = useState({
    code: '',
    title: '',
    contractType: 'CDI',
    vacancies: '1',
    location: '',
  });
  const [applicationForm, setApplicationForm] = useState({
    jobId: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    source: 'Candidature directe',
  });
  const [interviewForm, setInterviewForm] = useState({
    scheduledAt: tomorrowLocalInput(),
    interviewType: 'Entretien RH',
    location: '',
    score: '80',
    feedback: '',
  });
  const [hireForm, setHireForm] = useState({
    employeeNumber: '',
    contractNumber: '',
    hireDate: today(),
    endDate: '',
    baseSalary: '',
  });
  const [courseForm, setCourseForm] = useState({
    code: '',
    title: '',
    category: '',
    provider: '',
    durationHours: '8',
    certification: false,
  });
  const [sessionForm, setSessionForm] = useState({
    courseId: '',
    startDate: today(),
    endDate: today(),
    location: '',
    capacity: '20',
    trainerName: '',
  });
  const [enrollmentForm, setEnrollmentForm] = useState({
    sessionId: '',
    employeeId: '',
    attendancePercent: '100',
    score: '80',
    certificateNumber: '',
  });
  const [skillForm, setSkillForm] = useState({
    code: '',
    name: '',
    category: '',
  });
  const [employeeSkillForm, setEmployeeSkillForm] = useState({
    employeeId: '',
    skillId: '',
    level: '3',
    targetLevel: '4',
    verified: true,
  });
  const [cycleForm, setCycleForm] = useState({
    name: `Évaluation ${new Date().getUTCFullYear()}`,
    startDate: today(),
    endDate: nextMonth(),
  });
  const [reviewForm, setReviewForm] = useState({
    cycleId: '',
    employeeId: '',
    status: 'SELF_REVIEW',
    selfScore: '80',
    managerScore: '80',
    finalScore: '80',
    comments: '',
  });

  const load = useCallback(async () => {
    setLoadState('loading');
    try {
      const results = await Promise.all([
        client.request({
          method: 'GET',
          path: '/payroll/employees',
          schema: erpEmployeeListSchema,
        }),
        client.request({
          method: 'GET',
          path: '/talent/recruitment/jobs',
          schema: talentRecruitmentJobListSchema,
        }),
        client.request({
          method: 'GET',
          path: '/talent/recruitment/applications',
          schema: talentRecruitmentApplicationListSchema,
        }),
        client.request({
          method: 'GET',
          path: '/talent/training/courses',
          schema: talentTrainingCourseListSchema,
        }),
        client.request({
          method: 'GET',
          path: '/talent/training/sessions',
          schema: talentTrainingSessionListSchema,
        }),
        client.request({
          method: 'GET',
          path: '/talent/training/enrollments',
          schema: talentTrainingEnrollmentListSchema,
        }),
        client.request({
          method: 'GET',
          path: '/talent/skills',
          schema: talentSkillListSchema,
        }),
        client.request({
          method: 'GET',
          path: '/talent/employee-skills',
          schema: talentEmployeeSkillListSchema,
        }),
        client.request({
          method: 'GET',
          path: '/talent/performance/cycles',
          schema: talentPerformanceCycleListSchema,
        }),
        client.request({
          method: 'GET',
          path: '/talent/performance/reviews',
          schema: talentPerformanceReviewListSchema,
        }),
      ]);
      const [
        nextEmployees,
        nextJobs,
        nextApplications,
        nextCourses,
        nextSessions,
        nextEnrollments,
        nextSkills,
        nextEmployeeSkills,
        nextCycles,
        nextReviews,
      ] = results;
      setEmployees(nextEmployees);
      setJobs(nextJobs);
      setApplications(nextApplications);
      setCourses(nextCourses);
      setSessions(nextSessions);
      setEnrollments(nextEnrollments);
      setSkills(nextSkills);
      setEmployeeSkills(nextEmployeeSkills);
      setCycles(nextCycles);
      setReviews(nextReviews);
      setApplicationForm((current) => ({
        ...current,
        jobId:
          current.jobId ||
          nextJobs.find(({ status }) => status === 'OPEN')?.id ||
          '',
      }));
      setSessionForm((current) => ({
        ...current,
        courseId: current.courseId || nextCourses[0]?.id || '',
      }));
      setEnrollmentForm((current) => ({
        ...current,
        sessionId:
          current.sessionId ||
          nextSessions.find(({ status }) => status === 'OPEN')?.id ||
          '',
        employeeId: current.employeeId || nextEmployees[0]?.id || '',
      }));
      setEmployeeSkillForm((current) => ({
        ...current,
        employeeId: current.employeeId || nextEmployees[0]?.id || '',
        skillId: current.skillId || nextSkills[0]?.id || '',
      }));
      setReviewForm((current) => ({
        ...current,
        cycleId:
          current.cycleId ||
          nextCycles.find(({ status }) => status !== 'CLOSED')?.id ||
          '',
        employeeId: current.employeeId || nextEmployees[0]?.id || '',
      }));
      setLoadState('ready');
    } catch {
      setLoadState('error');
    }
  }, [client]);

  useEffect(() => {
    void load();
  }, [load]);

  const execute = (
    request: Parameters<typeof client.createMutationIntent>[0],
  ) =>
    client.createMutationIntent(request, { idempotency: 'required' }).execute();

  const mutate = async <T,>(operation: () => Promise<T>, success: string) => {
    setBusy(true);
    setMessage(null);
    try {
      await operation();
      setMessageDanger(false);
      setMessage(success);
      setFormMode(null);
      await load();
    } catch {
      setMessageDanger(true);
      setMessage(
        "L'opération n'a pas abouti. Vérifiez les données et l'état du workflow.",
      );
    } finally {
      setBusy(false);
    }
  };

  const saveJob = (event: React.FormEvent) => {
    event.preventDefault();
    void mutate(
      () =>
        execute({
          method: 'POST',
          path: '/talent/recruitment/jobs',
          schema: talentRecruitmentJobSchema,
          body: {
            ...jobForm,
            vacancies: Number(jobForm.vacancies),
          },
        }),
      'Offre créée.',
    );
  };

  const saveApplication = (event: React.FormEvent) => {
    event.preventDefault();
    void mutate(
      () =>
        execute({
          method: 'POST',
          path: '/talent/recruitment/applications',
          schema: talentRecruitmentApplicationSchema,
          body: { ...applicationForm, consent: true },
        }),
      'Candidature enregistrée.',
    );
  };

  const saveInterview = (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedApplication) return;
    if (formMode === 'interview-result') {
      const interview = selectedApplication.interviews?.find(
        ({ status }) => status === 'SCHEDULED',
      );
      if (!interview) return;
      void mutate(
        () =>
          execute({
            method: 'PATCH',
            path: `/talent/recruitment/interviews/${interview.id}`,
            schema: talentRecruitmentInterviewSchema,
            body: {
              status: 'COMPLETED',
              score: Number(interviewForm.score),
              feedback: interviewForm.feedback,
            },
          }),
        'Entretien évalué.',
      );
      return;
    }
    void mutate(
      () =>
        execute({
          method: 'POST',
          path: `/talent/recruitment/applications/${selectedApplication.id}/interviews`,
          schema: talentRecruitmentInterviewSchema,
          body: {
            scheduledAt: new Date(interviewForm.scheduledAt).toISOString(),
            interviewType: interviewForm.interviewType,
            location: interviewForm.location,
            durationMinutes: 60,
          },
        }),
      'Entretien planifié.',
    );
  };

  const saveHire = (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedApplication) return;
    void mutate(
      () =>
        execute({
          method: 'POST',
          path: `/talent/recruitment/applications/${selectedApplication.id}/hire`,
          schema: talentRecruitmentApplicationSchema,
          body: {
            employeeNumber: hireForm.employeeNumber,
            contractNumber: hireForm.contractNumber,
            hireDate: hireForm.hireDate,
            endDate: hireForm.endDate || undefined,
            baseSalaryCents: Math.round(Number(hireForm.baseSalary) * 100),
          },
        }),
      'Candidat converti en salarié.',
    );
  };

  const saveCourse = (event: React.FormEvent) => {
    event.preventDefault();
    void mutate(
      () =>
        execute({
          method: 'POST',
          path: '/talent/training/courses',
          schema: talentTrainingCourseSchema,
          body: {
            code: courseForm.code,
            title: courseForm.title,
            category: courseForm.category,
            provider: courseForm.provider,
            durationHours: Number(courseForm.durationHours),
            isCertification: courseForm.certification,
          },
        }),
      'Formation ajoutée au catalogue.',
    );
  };

  const saveSession = (event: React.FormEvent) => {
    event.preventDefault();
    void mutate(
      () =>
        execute({
          method: 'POST',
          path: '/talent/training/sessions',
          schema: talentTrainingSessionSchema,
          body: {
            ...sessionForm,
            capacity: Number(sessionForm.capacity),
          },
        }),
      'Session créée.',
    );
  };

  const saveEnrollment = (event: React.FormEvent) => {
    event.preventDefault();
    if (formMode === 'enrollment-result' && selectedEnrollment) {
      void mutate(
        () =>
          execute({
            method: 'PATCH',
            path: `/talent/training/enrollments/${selectedEnrollment.id}`,
            schema: talentTrainingEnrollmentSchema,
            body: {
              status: 'COMPLETED',
              attendancePercent: Number(enrollmentForm.attendancePercent),
              score: Number(enrollmentForm.score),
              certificateNumber: enrollmentForm.certificateNumber,
              certificateIssuedAt: today(),
            },
          }),
        'Formation validée.',
      );
      return;
    }
    void mutate(
      () =>
        execute({
          method: 'POST',
          path: '/talent/training/enrollments',
          schema: talentTrainingEnrollmentSchema,
          body: {
            sessionId: enrollmentForm.sessionId,
            employeeId: enrollmentForm.employeeId,
          },
        }),
      'Salarié inscrit.',
    );
  };

  const saveSkill = (event: React.FormEvent) => {
    event.preventDefault();
    void mutate(
      () =>
        execute({
          method: 'POST',
          path: '/talent/skills',
          schema: talentSkillSchema,
          body: skillForm,
        }),
      'Compétence créée.',
    );
  };

  const saveEmployeeSkill = (event: React.FormEvent) => {
    event.preventDefault();
    void mutate(
      () =>
        execute({
          method: 'POST',
          path: '/talent/employee-skills',
          schema: talentEmployeeSkillSchema,
          body: {
            ...employeeSkillForm,
            level: Number(employeeSkillForm.level),
            targetLevel: Number(employeeSkillForm.targetLevel),
          },
        }),
      'Niveau de compétence enregistré.',
    );
  };

  const saveCycle = (event: React.FormEvent) => {
    event.preventDefault();
    void mutate(
      () =>
        execute({
          method: 'POST',
          path: '/talent/performance/cycles',
          schema: talentPerformanceCycleSchema,
          body: cycleForm,
        }),
      "Campagne d'évaluation créée.",
    );
  };

  const saveReview = (event: React.FormEvent) => {
    event.preventDefault();
    if (formMode === 'review-result' && selectedReview) {
      void mutate(
        () =>
          execute({
            method: 'PATCH',
            path: `/talent/performance/reviews/${selectedReview.id}`,
            schema: talentPerformanceReviewSchema,
            body: {
              status: reviewForm.status,
              selfScore: Number(reviewForm.selfScore),
              managerScore: Number(reviewForm.managerScore),
              finalScore: Number(reviewForm.finalScore),
              managerComments: reviewForm.comments,
              developmentPlan: reviewForm.comments,
            },
          }),
        'Évaluation mise à jour.',
      );
      return;
    }
    void mutate(
      () =>
        execute({
          method: 'POST',
          path: '/talent/performance/reviews',
          schema: talentPerformanceReviewSchema,
          body: {
            cycleId: reviewForm.cycleId,
            employeeId: reviewForm.employeeId,
            objectives: [],
          },
        }),
      'Évaluation affectée.',
    );
  };

  const changeStatus = (
    path: string,
    schema:
      | typeof talentRecruitmentJobSchema
      | typeof talentRecruitmentApplicationSchema
      | typeof talentTrainingSessionSchema
      | typeof talentTrainingEnrollmentSchema
      | typeof talentPerformanceCycleSchema,
    status: string,
    success: string,
    extra: Record<string, unknown> = {},
  ) =>
    void mutate(
      () =>
        execute({ method: 'PATCH', path, schema, body: { status, ...extra } }),
      success,
    );

  const recruitmentMetrics = useMemo(
    () => [
      [
        'Offres ouvertes',
        jobs.filter(({ status }) => status === 'OPEN').length,
      ],
      [
        'Candidatures actives',
        applications.filter(
          ({ status }) => !['HIRED', 'REJECTED', 'WITHDRAWN'].includes(status),
        ).length,
      ],
      [
        'Entretiens',
        applications.filter(({ status }) => status === 'INTERVIEW').length,
      ],
      [
        'Embauches',
        applications.filter(({ status }) => status === 'HIRED').length,
      ],
    ],
    [applications, jobs],
  );

  const trainingMetrics = useMemo(
    () => [
      ['Catalogue', courses.length],
      [
        'Sessions ouvertes',
        sessions.filter(({ status }) => status === 'OPEN').length,
      ],
      ['Inscriptions', enrollments.length],
      [
        'Certifications',
        enrollments.filter(({ certificateNumber }) => certificateNumber).length,
      ],
    ],
    [courses, enrollments, sessions],
  );

  const openInterview = (application: TalentRecruitmentApplication) => {
    setSelectedApplication(application);
    setFormMode('interview');
  };

  const recruitmentJobColumns = useMemo<
    ErpOperationalTableColumn<TalentRecruitmentJob>[]
  >(
    () => [
      { key: 'code', header: 'Réf.', width: '90px', render: (job) => job.code },
      {
        key: 'title',
        header: 'Poste',
        width: '180px',
        render: (job) => job.title,
      },
      {
        key: 'contract',
        header: 'Contrat',
        width: '90px',
        render: (job) => job.contractType,
      },
      {
        key: 'vacancies',
        header: 'Postes',
        width: '80px',
        align: 'right',
        render: (job) => job.vacancies,
      },
      {
        key: 'applications',
        header: 'Candidats',
        width: '95px',
        align: 'right',
        render: (job) => job._count?.applications ?? 0,
      },
      {
        key: 'status',
        header: 'Statut',
        width: '110px',
        render: (job) => statusBadge(job.status),
      },
      {
        key: 'actions',
        header: '',
        width: '120px',
        align: 'right',
        render: (job) => (
          <StyledRowActions>
            {job.status === 'DRAFT' || job.status === 'PAUSED' ? (
              <StyledAction
                disabled={busy}
                onClick={() =>
                  changeStatus(
                    `/talent/recruitment/jobs/${job.id}/status`,
                    talentRecruitmentJobSchema,
                    'OPEN',
                    'Offre publiée.',
                  )
                }
              >
                <IconSend size={14} /> Publier
              </StyledAction>
            ) : null}
            {job.status === 'OPEN' ? (
              <StyledAction
                disabled={busy}
                onClick={() =>
                  changeStatus(
                    `/talent/recruitment/jobs/${job.id}/status`,
                    talentRecruitmentJobSchema,
                    'CLOSED',
                    'Offre clôturée.',
                  )
                }
              >
                <IconX size={14} /> Clore
              </StyledAction>
            ) : null}
          </StyledRowActions>
        ),
      },
    ],
    [busy],
  );

  const applicationColumns = useMemo<
    ErpOperationalTableColumn<TalentRecruitmentApplication>[]
  >(
    () => [
      {
        key: 'candidate',
        header: 'Candidat',
        width: '170px',
        render: ({ candidate }) =>
          `${candidate.firstName} ${candidate.lastName}`,
      },
      {
        key: 'job',
        header: 'Offre',
        width: '160px',
        render: ({ job }) => job.title,
      },
      {
        key: 'source',
        header: 'Source',
        width: '130px',
        render: ({ candidate }) => candidate.source ?? '—',
      },
      {
        key: 'score',
        header: 'Score',
        width: '70px',
        align: 'right',
        render: ({ score }) => score ?? '—',
      },
      {
        key: 'status',
        header: 'Étape',
        width: '120px',
        render: ({ status }) => statusBadge(status),
      },
      {
        key: 'actions',
        header: '',
        width: '210px',
        align: 'right',
        render: (application) => {
          const next: Record<string, string> = {
            NEW: 'SCREENING',
            SCREENING: 'SHORTLISTED',
            INTERVIEW: 'OFFER',
          };
          const scheduled = application.interviews?.find(
            ({ status }) => status === 'SCHEDULED',
          );
          return (
            <StyledRowActions>
              {next[application.status] ? (
                <StyledAction
                  disabled={busy}
                  onClick={() =>
                    changeStatus(
                      `/talent/recruitment/applications/${application.id}/status`,
                      talentRecruitmentApplicationSchema,
                      next[application.status],
                      'Candidature avancée.',
                    )
                  }
                >
                  <IconCheck size={14} /> Avancer
                </StyledAction>
              ) : null}
              {application.status === 'SHORTLISTED' ? (
                <StyledAction
                  disabled={busy}
                  onClick={() => openInterview(application)}
                >
                  <IconClock size={14} /> Planifier
                </StyledAction>
              ) : null}
              {application.status === 'INTERVIEW' && scheduled ? (
                <StyledAction
                  disabled={busy}
                  onClick={() => {
                    setSelectedApplication(application);
                    setFormMode('interview-result');
                  }}
                >
                  <IconCheck size={14} /> Évaluer
                </StyledAction>
              ) : null}
              {application.status === 'OFFER' ? (
                <StyledAction
                  disabled={busy}
                  onClick={() => {
                    setSelectedApplication(application);
                    setFormMode('hire');
                  }}
                >
                  <IconPlus size={14} /> Embaucher
                </StyledAction>
              ) : null}
              {!['HIRED', 'REJECTED', 'WITHDRAWN'].includes(
                application.status,
              ) ? (
                <StyledAction
                  disabled={busy}
                  onClick={() =>
                    changeStatus(
                      `/talent/recruitment/applications/${application.id}/status`,
                      talentRecruitmentApplicationSchema,
                      'REJECTED',
                      'Candidature rejetée.',
                      { rejectionReason: 'Décision RH' },
                    )
                  }
                >
                  <IconX size={14} /> Rejeter
                </StyledAction>
              ) : null}
            </StyledRowActions>
          );
        },
      },
    ],
    [busy],
  );

  const sessionColumns = useMemo<
    ErpOperationalTableColumn<TalentTrainingSession>[]
  >(
    () => [
      {
        key: 'course',
        header: 'Formation',
        width: '180px',
        render: ({ course }) => course.title,
      },
      {
        key: 'dates',
        header: 'Dates',
        width: '170px',
        render: ({ startDate, endDate }) => `${startDate} → ${endDate}`,
      },
      {
        key: 'trainer',
        header: 'Formateur',
        width: '130px',
        render: ({ trainerName }) => trainerName ?? '—',
      },
      {
        key: 'enrolled',
        header: 'Inscrits',
        width: '80px',
        align: 'right',
        render: ({ enrollments: rows }) => `${rows?.length ?? 0}`,
      },
      {
        key: 'status',
        header: 'Statut',
        width: '110px',
        render: ({ status }) => statusBadge(status),
      },
      {
        key: 'actions',
        header: '',
        width: '120px',
        align: 'right',
        render: (session) => {
          const next: Record<string, string> = {
            DRAFT: 'OPEN',
            OPEN: 'IN_PROGRESS',
            IN_PROGRESS: 'COMPLETED',
          };
          return next[session.status] ? (
            <StyledAction
              disabled={busy}
              onClick={() =>
                changeStatus(
                  `/talent/training/sessions/${session.id}/status`,
                  talentTrainingSessionSchema,
                  next[session.status],
                  'Session mise à jour.',
                )
              }
            >
              <IconCheck size={14} /> Avancer
            </StyledAction>
          ) : null;
        },
      },
    ],
    [busy],
  );

  const enrollmentColumns = useMemo<
    ErpOperationalTableColumn<TalentTrainingEnrollment>[]
  >(
    () => [
      {
        key: 'employee',
        header: 'Salarié',
        width: '160px',
        render: ({ employee }) => employeeName(employee),
      },
      {
        key: 'course',
        header: 'Formation',
        width: '180px',
        render: ({ session }) => session?.course.title ?? '—',
      },
      {
        key: 'score',
        header: 'Score',
        width: '70px',
        align: 'right',
        render: ({ score }) => score ?? '—',
      },
      {
        key: 'certificate',
        header: 'Certificat',
        width: '120px',
        render: ({ certificateNumber }) => certificateNumber ?? '—',
      },
      {
        key: 'status',
        header: 'Statut',
        width: '110px',
        render: ({ status }) => statusBadge(status),
      },
      {
        key: 'actions',
        header: '',
        width: '130px',
        align: 'right',
        render: (enrollment) =>
          ['REGISTERED', 'ATTENDED'].includes(enrollment.status) ? (
            <StyledAction
              disabled={busy}
              onClick={() => {
                setSelectedEnrollment(enrollment);
                setEnrollmentForm((current) => ({
                  ...current,
                  certificateNumber: enrollment.session?.course.isCertification
                    ? `CERT-${Date.now()}`
                    : '',
                }));
                setFormMode('enrollment-result');
              }}
            >
              <IconCheck size={14} /> Valider
            </StyledAction>
          ) : null,
      },
    ],
    [busy],
  );

  const employeeSkillColumns = useMemo<
    ErpOperationalTableColumn<TalentEmployeeSkill>[]
  >(
    () => [
      {
        key: 'employee',
        header: 'Salarié',
        width: '180px',
        render: ({ employee }) => employeeName(employee),
      },
      {
        key: 'skill',
        header: 'Compétence',
        width: '180px',
        render: ({ skill }) => skill?.name ?? '—',
      },
      {
        key: 'category',
        header: 'Catégorie',
        width: '130px',
        render: ({ skill }) => skill?.category ?? '—',
      },
      {
        key: 'level',
        header: 'Niveau',
        width: '90px',
        align: 'right',
        render: ({ level }) => `${level}/5`,
      },
      {
        key: 'target',
        header: 'Cible',
        width: '90px',
        align: 'right',
        render: ({ targetLevel }) => (targetLevel ? `${targetLevel}/5` : '—'),
      },
      {
        key: 'verified',
        header: 'Vérifiée',
        width: '90px',
        render: ({ verifiedAt }) =>
          verifiedAt ? statusBadge('COMPLETED') : statusBadge('DRAFT'),
      },
    ],
    [],
  );

  const cycleColumns = useMemo<
    ErpOperationalTableColumn<TalentPerformanceCycle>[]
  >(
    () => [
      {
        key: 'name',
        header: 'Campagne',
        width: '190px',
        render: ({ name }) => name,
      },
      {
        key: 'dates',
        header: 'Période',
        width: '170px',
        render: ({ startDate, endDate }) => `${startDate} → ${endDate}`,
      },
      {
        key: 'reviews',
        header: 'Évaluations',
        width: '100px',
        align: 'right',
        render: ({ _count }) => _count?.reviews ?? 0,
      },
      {
        key: 'status',
        header: 'Statut',
        width: '110px',
        render: ({ status }) => statusBadge(status),
      },
      {
        key: 'actions',
        header: '',
        width: '110px',
        align: 'right',
        render: (cycle) => {
          const next: Record<string, string> = {
            DRAFT: 'OPEN',
            OPEN: 'CLOSED',
          };
          return next[cycle.status] ? (
            <StyledAction
              disabled={busy}
              onClick={() =>
                changeStatus(
                  `/talent/performance/cycles/${cycle.id}/status`,
                  talentPerformanceCycleSchema,
                  next[cycle.status],
                  'Campagne mise à jour.',
                )
              }
            >
              <IconCheck size={14} /> Avancer
            </StyledAction>
          ) : null;
        },
      },
    ],
    [busy],
  );

  const reviewColumns = useMemo<
    ErpOperationalTableColumn<TalentPerformanceReview>[]
  >(
    () => [
      {
        key: 'employee',
        header: 'Salarié',
        width: '180px',
        render: ({ employee }) => employeeName(employee),
      },
      {
        key: 'cycle',
        header: 'Campagne',
        width: '170px',
        render: ({ cycle }) => cycle.name,
      },
      {
        key: 'self',
        header: 'Auto',
        width: '70px',
        align: 'right',
        render: ({ selfScore }) => selfScore ?? '—',
      },
      {
        key: 'manager',
        header: 'Manager',
        width: '80px',
        align: 'right',
        render: ({ managerScore }) => managerScore ?? '—',
      },
      {
        key: 'final',
        header: 'Final',
        width: '70px',
        align: 'right',
        render: ({ finalScore }) => finalScore ?? '—',
      },
      {
        key: 'status',
        header: 'Étape',
        width: '120px',
        render: ({ status }) => statusBadge(status),
      },
      {
        key: 'actions',
        header: '',
        width: '120px',
        align: 'right',
        render: (review) =>
          review.status !== 'FINALIZED' ? (
            <StyledAction
              disabled={busy}
              onClick={() => {
                setSelectedReview(review);
                setReviewForm((current) => ({
                  ...current,
                  status:
                    review.status === 'DRAFT'
                      ? 'SELF_REVIEW'
                      : review.status === 'SELF_REVIEW'
                        ? 'MANAGER_REVIEW'
                        : 'FINALIZED',
                  selfScore: String(review.selfScore ?? 80),
                  managerScore: String(review.managerScore ?? 80),
                  finalScore: String(
                    review.finalScore ?? review.managerScore ?? 80,
                  ),
                }));
                setFormMode('review-result');
              }}
            >
              <IconCheck size={14} /> Évaluer
            </StyledAction>
          ) : null,
      },
    ],
    [busy],
  );

  const actions = (
    <>
      <Button
        title="Nouveau"
        ariaLabel="Créer"
        Icon={IconPlus}
        variant="secondary"
        disabled={busy}
        onClick={() =>
          setFormMode(
            view === 'recruitment'
              ? 'job'
              : view === 'training'
                ? 'course'
                : view === 'skills'
                  ? 'skill'
                  : 'cycle',
          )
        }
      />
      <Button
        title="Actualiser"
        ariaLabel="Actualiser"
        Icon={IconRefresh}
        variant="secondary"
        disabled={busy}
        onClick={() => void load()}
      />
    </>
  );

  const metrics = view === 'recruitment' ? recruitmentMetrics : trainingMetrics;

  return (
    <ErpPageShell
      title="Talents"
      description="Recrutement, formation, compétences et performance"
      actions={actions}
      state={loadState}
      onRetry={() => void load()}
    >
      <StyledToolbar>
        <StyledTabs>
          {(['recruitment', 'training', 'skills', 'performance'] as View[]).map(
            (item) => (
              <StyledTab
                key={item}
                active={view === item}
                onClick={() => {
                  setView(item);
                  setFormMode(null);
                }}
              >
                {
                  {
                    recruitment: 'Recrutement',
                    training: 'Formation',
                    skills: 'Compétences',
                    performance: 'Évaluations',
                  }[item]
                }
              </StyledTab>
            ),
          )}
        </StyledTabs>
        <StyledActions>
          {view === 'recruitment' ? (
            <Button
              title="Candidat"
              ariaLabel="Ajouter une candidature"
              Icon={IconPlus}
              variant="secondary"
              onClick={() => setFormMode('application')}
            />
          ) : null}
          {view === 'training' ? (
            <>
              <Button
                title="Session"
                ariaLabel="Créer une session"
                Icon={IconClock}
                variant="secondary"
                onClick={() => setFormMode('session')}
              />
              <Button
                title="Inscrire"
                ariaLabel="Inscrire un salarié"
                Icon={IconPlus}
                variant="secondary"
                onClick={() => setFormMode('enrollment')}
              />
            </>
          ) : null}
          {view === 'skills' ? (
            <Button
              title="Affecter"
              ariaLabel="Affecter une compétence"
              Icon={IconCheck}
              variant="secondary"
              onClick={() => setFormMode('employee-skill')}
            />
          ) : null}
          {view === 'performance' ? (
            <Button
              title="Affecter"
              ariaLabel="Affecter une évaluation"
              Icon={IconPlus}
              variant="secondary"
              onClick={() => setFormMode('review')}
            />
          ) : null}
        </StyledActions>
      </StyledToolbar>

      {message ? (
        <StyledNotice danger={messageDanger}>{message}</StyledNotice>
      ) : null}

      {view === 'recruitment' || view === 'training' ? (
        <StyledMetrics>
          {metrics.map(([label, value]) => (
            <StyledMetric key={String(label)}>
              <StyledMetricLabel>{label}</StyledMetricLabel>
              <StyledMetricValue>{value}</StyledMetricValue>
            </StyledMetric>
          ))}
        </StyledMetrics>
      ) : null}

      {formMode === 'job' ? (
        <StyledForm onSubmit={saveJob}>
          <StyledField>
            Référence
            <StyledControl
              required
              value={jobForm.code}
              onChange={(event) =>
                setJobForm({ ...jobForm, code: event.target.value })
              }
            />
          </StyledField>
          <StyledField>
            Intitulé
            <StyledControl
              required
              value={jobForm.title}
              onChange={(event) =>
                setJobForm({ ...jobForm, title: event.target.value })
              }
            />
          </StyledField>
          <StyledField>
            Contrat
            <StyledSelect
              value={jobForm.contractType}
              onChange={(event) =>
                setJobForm({ ...jobForm, contractType: event.target.value })
              }
            >
              {['CDI', 'CDD', 'ANAPEC', 'INTERIM', 'STAGE'].map((value) => (
                <option key={value}>{value}</option>
              ))}
            </StyledSelect>
          </StyledField>
          <StyledField>
            Postes
            <StyledControl
              type="number"
              min="1"
              required
              value={jobForm.vacancies}
              onChange={(event) =>
                setJobForm({ ...jobForm, vacancies: event.target.value })
              }
            />
          </StyledField>
          <StyledField>
            Lieu
            <StyledControl
              value={jobForm.location}
              onChange={(event) =>
                setJobForm({ ...jobForm, location: event.target.value })
              }
            />
          </StyledField>
          <Button
            title="Créer"
            ariaLabel="Créer l'offre"
            Icon={IconPlus}
            variant="primary"
            disabled={busy}
            type="submit"
          />
        </StyledForm>
      ) : null}

      {formMode === 'application' ? (
        <StyledForm onSubmit={saveApplication}>
          <StyledField>
            Offre
            <StyledSelect
              required
              value={applicationForm.jobId}
              onChange={(event) =>
                setApplicationForm({
                  ...applicationForm,
                  jobId: event.target.value,
                })
              }
            >
              <option value="">Sélectionner</option>
              {jobs
                .filter(({ status }) => status === 'OPEN')
                .map((job) => (
                  <option key={job.id} value={job.id}>
                    {job.title}
                  </option>
                ))}
            </StyledSelect>
          </StyledField>
          <StyledField>
            Prénom
            <StyledControl
              required
              value={applicationForm.firstName}
              onChange={(event) =>
                setApplicationForm({
                  ...applicationForm,
                  firstName: event.target.value,
                })
              }
            />
          </StyledField>
          <StyledField>
            Nom
            <StyledControl
              required
              value={applicationForm.lastName}
              onChange={(event) =>
                setApplicationForm({
                  ...applicationForm,
                  lastName: event.target.value,
                })
              }
            />
          </StyledField>
          <StyledField>
            Email
            <StyledControl
              type="email"
              required
              value={applicationForm.email}
              onChange={(event) =>
                setApplicationForm({
                  ...applicationForm,
                  email: event.target.value,
                })
              }
            />
          </StyledField>
          <StyledField>
            Téléphone
            <StyledControl
              value={applicationForm.phone}
              onChange={(event) =>
                setApplicationForm({
                  ...applicationForm,
                  phone: event.target.value,
                })
              }
            />
          </StyledField>
          <StyledField>
            Source
            <StyledControl
              value={applicationForm.source}
              onChange={(event) =>
                setApplicationForm({
                  ...applicationForm,
                  source: event.target.value,
                })
              }
            />
          </StyledField>
          <Button
            title="Ajouter"
            ariaLabel="Ajouter la candidature"
            Icon={IconPlus}
            variant="primary"
            disabled={busy}
            type="submit"
          />
        </StyledForm>
      ) : null}

      {formMode === 'interview' || formMode === 'interview-result' ? (
        <StyledForm onSubmit={saveInterview}>
          <StyledField>
            Candidat
            <StyledControl
              disabled
              value={
                selectedApplication
                  ? `${selectedApplication.candidate.firstName} ${selectedApplication.candidate.lastName}`
                  : ''
              }
            />
          </StyledField>
          {formMode === 'interview' ? (
            <>
              <StyledField>
                Date et heure
                <StyledControl
                  type="datetime-local"
                  required
                  value={interviewForm.scheduledAt}
                  onChange={(event) =>
                    setInterviewForm({
                      ...interviewForm,
                      scheduledAt: event.target.value,
                    })
                  }
                />
              </StyledField>
              <StyledField>
                Type
                <StyledControl
                  required
                  value={interviewForm.interviewType}
                  onChange={(event) =>
                    setInterviewForm({
                      ...interviewForm,
                      interviewType: event.target.value,
                    })
                  }
                />
              </StyledField>
              <StyledField>
                Lieu
                <StyledControl
                  value={interviewForm.location}
                  onChange={(event) =>
                    setInterviewForm({
                      ...interviewForm,
                      location: event.target.value,
                    })
                  }
                />
              </StyledField>
            </>
          ) : (
            <>
              <StyledField>
                Score / 100
                <StyledControl
                  type="number"
                  min="0"
                  max="100"
                  value={interviewForm.score}
                  onChange={(event) =>
                    setInterviewForm({
                      ...interviewForm,
                      score: event.target.value,
                    })
                  }
                />
              </StyledField>
              <StyledField>
                Retour
                <StyledControl
                  value={interviewForm.feedback}
                  onChange={(event) =>
                    setInterviewForm({
                      ...interviewForm,
                      feedback: event.target.value,
                    })
                  }
                />
              </StyledField>
            </>
          )}
          <Button
            title={formMode === 'interview' ? 'Planifier' : 'Valider'}
            ariaLabel="Valider l'entretien"
            Icon={IconCheck}
            variant="primary"
            disabled={busy}
            type="submit"
          />
        </StyledForm>
      ) : null}

      {formMode === 'hire' ? (
        <StyledForm onSubmit={saveHire}>
          <StyledField>
            Candidat
            <StyledControl
              disabled
              value={
                selectedApplication
                  ? `${selectedApplication.candidate.firstName} ${selectedApplication.candidate.lastName}`
                  : ''
              }
            />
          </StyledField>
          <StyledField>
            Matricule
            <StyledControl
              required
              value={hireForm.employeeNumber}
              onChange={(event) =>
                setHireForm({ ...hireForm, employeeNumber: event.target.value })
              }
            />
          </StyledField>
          <StyledField>
            N° contrat
            <StyledControl
              value={hireForm.contractNumber}
              onChange={(event) =>
                setHireForm({ ...hireForm, contractNumber: event.target.value })
              }
            />
          </StyledField>
          <StyledField>
            Date d'embauche
            <StyledControl
              type="date"
              required
              value={hireForm.hireDate}
              onChange={(event) =>
                setHireForm({ ...hireForm, hireDate: event.target.value })
              }
            />
          </StyledField>
          {selectedApplication &&
          ['CDD', 'ANAPEC', 'STAGE'].includes(
            selectedApplication.job.contractType,
          ) ? (
            <StyledField>
              Fin du contrat
              <StyledControl
                type="date"
                required
                min={hireForm.hireDate}
                value={hireForm.endDate}
                onChange={(event) =>
                  setHireForm({ ...hireForm, endDate: event.target.value })
                }
              />
            </StyledField>
          ) : null}
          <StyledField>
            Salaire MAD
            <StyledControl
              type="number"
              min="0"
              required
              value={hireForm.baseSalary}
              onChange={(event) =>
                setHireForm({ ...hireForm, baseSalary: event.target.value })
              }
            />
          </StyledField>
          <Button
            title="Embaucher"
            ariaLabel="Convertir en salarié"
            Icon={IconCheck}
            variant="primary"
            disabled={busy}
            type="submit"
          />
        </StyledForm>
      ) : null}

      {formMode === 'course' ? (
        <StyledForm onSubmit={saveCourse}>
          <StyledField>
            Code
            <StyledControl
              required
              value={courseForm.code}
              onChange={(event) =>
                setCourseForm({ ...courseForm, code: event.target.value })
              }
            />
          </StyledField>
          <StyledField>
            Formation
            <StyledControl
              required
              value={courseForm.title}
              onChange={(event) =>
                setCourseForm({ ...courseForm, title: event.target.value })
              }
            />
          </StyledField>
          <StyledField>
            Catégorie
            <StyledControl
              value={courseForm.category}
              onChange={(event) =>
                setCourseForm({ ...courseForm, category: event.target.value })
              }
            />
          </StyledField>
          <StyledField>
            Prestataire
            <StyledControl
              value={courseForm.provider}
              onChange={(event) =>
                setCourseForm({ ...courseForm, provider: event.target.value })
              }
            />
          </StyledField>
          <StyledField>
            Durée (h)
            <StyledControl
              type="number"
              min="1"
              value={courseForm.durationHours}
              onChange={(event) =>
                setCourseForm({
                  ...courseForm,
                  durationHours: event.target.value,
                })
              }
            />
          </StyledField>
          <StyledField>
            Type
            <StyledSelect
              value={String(courseForm.certification)}
              onChange={(event) =>
                setCourseForm({
                  ...courseForm,
                  certification: event.target.value === 'true',
                })
              }
            >
              <option value="false">Formation</option>
              <option value="true">Certification</option>
            </StyledSelect>
          </StyledField>
          <Button
            title="Créer"
            ariaLabel="Créer la formation"
            Icon={IconPlus}
            variant="primary"
            disabled={busy}
            type="submit"
          />
        </StyledForm>
      ) : null}

      {formMode === 'session' ? (
        <StyledForm onSubmit={saveSession}>
          <StyledField>
            Formation
            <StyledSelect
              required
              value={sessionForm.courseId}
              onChange={(event) =>
                setSessionForm({ ...sessionForm, courseId: event.target.value })
              }
            >
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.title}
                </option>
              ))}
            </StyledSelect>
          </StyledField>
          <StyledField>
            Début
            <StyledControl
              type="date"
              required
              value={sessionForm.startDate}
              onChange={(event) =>
                setSessionForm({
                  ...sessionForm,
                  startDate: event.target.value,
                })
              }
            />
          </StyledField>
          <StyledField>
            Fin
            <StyledControl
              type="date"
              required
              value={sessionForm.endDate}
              onChange={(event) =>
                setSessionForm({ ...sessionForm, endDate: event.target.value })
              }
            />
          </StyledField>
          <StyledField>
            Lieu
            <StyledControl
              value={sessionForm.location}
              onChange={(event) =>
                setSessionForm({ ...sessionForm, location: event.target.value })
              }
            />
          </StyledField>
          <StyledField>
            Capacité
            <StyledControl
              type="number"
              min="1"
              value={sessionForm.capacity}
              onChange={(event) =>
                setSessionForm({ ...sessionForm, capacity: event.target.value })
              }
            />
          </StyledField>
          <StyledField>
            Formateur
            <StyledControl
              value={sessionForm.trainerName}
              onChange={(event) =>
                setSessionForm({
                  ...sessionForm,
                  trainerName: event.target.value,
                })
              }
            />
          </StyledField>
          <Button
            title="Créer"
            ariaLabel="Créer la session"
            Icon={IconPlus}
            variant="primary"
            disabled={busy}
            type="submit"
          />
        </StyledForm>
      ) : null}

      {formMode === 'enrollment' || formMode === 'enrollment-result' ? (
        <StyledForm onSubmit={saveEnrollment}>
          {formMode === 'enrollment' ? (
            <>
              <StyledField>
                Session
                <StyledSelect
                  required
                  value={enrollmentForm.sessionId}
                  onChange={(event) =>
                    setEnrollmentForm({
                      ...enrollmentForm,
                      sessionId: event.target.value,
                    })
                  }
                >
                  {sessions
                    .filter(({ status }) => status === 'OPEN')
                    .map((session) => (
                      <option key={session.id} value={session.id}>
                        {session.course.title} · {session.startDate}
                      </option>
                    ))}
                </StyledSelect>
              </StyledField>
              <StyledField>
                Salarié
                <StyledSelect
                  required
                  value={enrollmentForm.employeeId}
                  onChange={(event) =>
                    setEnrollmentForm({
                      ...enrollmentForm,
                      employeeId: event.target.value,
                    })
                  }
                >
                  {employees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employeeName(employee)}
                    </option>
                  ))}
                </StyledSelect>
              </StyledField>
            </>
          ) : (
            <>
              <StyledField>
                Présence %
                <StyledControl
                  type="number"
                  min="0"
                  max="100"
                  value={enrollmentForm.attendancePercent}
                  onChange={(event) =>
                    setEnrollmentForm({
                      ...enrollmentForm,
                      attendancePercent: event.target.value,
                    })
                  }
                />
              </StyledField>
              <StyledField>
                Score / 100
                <StyledControl
                  type="number"
                  min="0"
                  max="100"
                  value={enrollmentForm.score}
                  onChange={(event) =>
                    setEnrollmentForm({
                      ...enrollmentForm,
                      score: event.target.value,
                    })
                  }
                />
              </StyledField>
              <StyledField>
                N° certificat
                <StyledControl
                  value={enrollmentForm.certificateNumber}
                  onChange={(event) =>
                    setEnrollmentForm({
                      ...enrollmentForm,
                      certificateNumber: event.target.value,
                    })
                  }
                />
              </StyledField>
            </>
          )}
          <Button
            title={formMode === 'enrollment' ? 'Inscrire' : 'Valider'}
            ariaLabel="Valider l'inscription"
            Icon={IconCheck}
            variant="primary"
            disabled={busy}
            type="submit"
          />
        </StyledForm>
      ) : null}

      {formMode === 'skill' ? (
        <StyledForm onSubmit={saveSkill}>
          <StyledField>
            Code
            <StyledControl
              required
              value={skillForm.code}
              onChange={(event) =>
                setSkillForm({ ...skillForm, code: event.target.value })
              }
            />
          </StyledField>
          <StyledField>
            Compétence
            <StyledControl
              required
              value={skillForm.name}
              onChange={(event) =>
                setSkillForm({ ...skillForm, name: event.target.value })
              }
            />
          </StyledField>
          <StyledField>
            Catégorie
            <StyledControl
              value={skillForm.category}
              onChange={(event) =>
                setSkillForm({ ...skillForm, category: event.target.value })
              }
            />
          </StyledField>
          <Button
            title="Créer"
            ariaLabel="Créer la compétence"
            Icon={IconPlus}
            variant="primary"
            disabled={busy}
            type="submit"
          />
        </StyledForm>
      ) : null}

      {formMode === 'employee-skill' ? (
        <StyledForm onSubmit={saveEmployeeSkill}>
          <StyledField>
            Salarié
            <StyledSelect
              required
              value={employeeSkillForm.employeeId}
              onChange={(event) =>
                setEmployeeSkillForm({
                  ...employeeSkillForm,
                  employeeId: event.target.value,
                })
              }
            >
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employeeName(employee)}
                </option>
              ))}
            </StyledSelect>
          </StyledField>
          <StyledField>
            Compétence
            <StyledSelect
              required
              value={employeeSkillForm.skillId}
              onChange={(event) =>
                setEmployeeSkillForm({
                  ...employeeSkillForm,
                  skillId: event.target.value,
                })
              }
            >
              {skills.map((skill) => (
                <option key={skill.id} value={skill.id}>
                  {skill.name}
                </option>
              ))}
            </StyledSelect>
          </StyledField>
          <StyledField>
            Niveau
            <StyledSelect
              value={employeeSkillForm.level}
              onChange={(event) =>
                setEmployeeSkillForm({
                  ...employeeSkillForm,
                  level: event.target.value,
                })
              }
            >
              {[1, 2, 3, 4, 5].map((value) => (
                <option key={value}>{value}</option>
              ))}
            </StyledSelect>
          </StyledField>
          <StyledField>
            Cible
            <StyledSelect
              value={employeeSkillForm.targetLevel}
              onChange={(event) =>
                setEmployeeSkillForm({
                  ...employeeSkillForm,
                  targetLevel: event.target.value,
                })
              }
            >
              {[1, 2, 3, 4, 5].map((value) => (
                <option key={value}>{value}</option>
              ))}
            </StyledSelect>
          </StyledField>
          <Button
            title="Enregistrer"
            ariaLabel="Enregistrer le niveau"
            Icon={IconCheck}
            variant="primary"
            disabled={busy}
            type="submit"
          />
        </StyledForm>
      ) : null}

      {formMode === 'cycle' ? (
        <StyledForm onSubmit={saveCycle}>
          <StyledField>
            Campagne
            <StyledControl
              required
              value={cycleForm.name}
              onChange={(event) =>
                setCycleForm({ ...cycleForm, name: event.target.value })
              }
            />
          </StyledField>
          <StyledField>
            Début
            <StyledControl
              type="date"
              required
              value={cycleForm.startDate}
              onChange={(event) =>
                setCycleForm({ ...cycleForm, startDate: event.target.value })
              }
            />
          </StyledField>
          <StyledField>
            Fin
            <StyledControl
              type="date"
              required
              value={cycleForm.endDate}
              onChange={(event) =>
                setCycleForm({ ...cycleForm, endDate: event.target.value })
              }
            />
          </StyledField>
          <Button
            title="Créer"
            ariaLabel="Créer la campagne"
            Icon={IconPlus}
            variant="primary"
            disabled={busy}
            type="submit"
          />
        </StyledForm>
      ) : null}

      {formMode === 'review' || formMode === 'review-result' ? (
        <StyledForm onSubmit={saveReview}>
          {formMode === 'review' ? (
            <>
              <StyledField>
                Campagne
                <StyledSelect
                  required
                  value={reviewForm.cycleId}
                  onChange={(event) =>
                    setReviewForm({
                      ...reviewForm,
                      cycleId: event.target.value,
                    })
                  }
                >
                  {cycles
                    .filter(({ status }) => status !== 'CLOSED')
                    .map((cycle) => (
                      <option key={cycle.id} value={cycle.id}>
                        {cycle.name}
                      </option>
                    ))}
                </StyledSelect>
              </StyledField>
              <StyledField>
                Salarié
                <StyledSelect
                  required
                  value={reviewForm.employeeId}
                  onChange={(event) =>
                    setReviewForm({
                      ...reviewForm,
                      employeeId: event.target.value,
                    })
                  }
                >
                  {employees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employeeName(employee)}
                    </option>
                  ))}
                </StyledSelect>
              </StyledField>
            </>
          ) : (
            <>
              <StyledField>
                Prochaine étape
                <StyledSelect
                  value={reviewForm.status}
                  onChange={(event) =>
                    setReviewForm({ ...reviewForm, status: event.target.value })
                  }
                >
                  <option value="SELF_REVIEW">Autoévaluation</option>
                  <option value="MANAGER_REVIEW">Évaluation manager</option>
                  <option value="FINALIZED">Finaliser</option>
                </StyledSelect>
              </StyledField>
              <StyledField>
                Auto / 100
                <StyledControl
                  type="number"
                  min="0"
                  max="100"
                  value={reviewForm.selfScore}
                  onChange={(event) =>
                    setReviewForm({
                      ...reviewForm,
                      selfScore: event.target.value,
                    })
                  }
                />
              </StyledField>
              <StyledField>
                Manager / 100
                <StyledControl
                  type="number"
                  min="0"
                  max="100"
                  value={reviewForm.managerScore}
                  onChange={(event) =>
                    setReviewForm({
                      ...reviewForm,
                      managerScore: event.target.value,
                    })
                  }
                />
              </StyledField>
              <StyledField>
                Final / 100
                <StyledControl
                  type="number"
                  min="0"
                  max="100"
                  value={reviewForm.finalScore}
                  onChange={(event) =>
                    setReviewForm({
                      ...reviewForm,
                      finalScore: event.target.value,
                    })
                  }
                />
              </StyledField>
              <StyledField>
                Commentaires et plan
                <StyledControl
                  value={reviewForm.comments}
                  onChange={(event) =>
                    setReviewForm({
                      ...reviewForm,
                      comments: event.target.value,
                    })
                  }
                />
              </StyledField>
            </>
          )}
          <Button
            title={formMode === 'review' ? 'Affecter' : 'Enregistrer'}
            ariaLabel="Valider l'évaluation"
            Icon={IconCheck}
            variant="primary"
            disabled={busy}
            type="submit"
          />
        </StyledForm>
      ) : null}

      {view === 'recruitment' ? (
        <>
          <StyledSubheading>Offres</StyledSubheading>
          <ErpOperationalTable
            ariaLabel="Offres de recrutement"
            columns={recruitmentJobColumns}
            rows={jobs}
            getRowKey={(row) => row.id}
            emptyLabel="Créez la première offre"
          />
          <StyledSubheading>Candidatures</StyledSubheading>
          <ErpOperationalTable
            ariaLabel="Candidatures"
            columns={applicationColumns}
            rows={applications}
            getRowKey={(row) => row.id}
            emptyLabel="Aucune candidature"
          />
        </>
      ) : null}
      {view === 'training' ? (
        <>
          <StyledSubheading>Sessions</StyledSubheading>
          <ErpOperationalTable
            ariaLabel="Sessions de formation"
            columns={sessionColumns}
            rows={sessions}
            getRowKey={(row) => row.id}
            emptyLabel="Créez une session de formation"
          />
          <StyledSubheading>Inscriptions et certifications</StyledSubheading>
          <ErpOperationalTable
            ariaLabel="Inscriptions aux formations"
            columns={enrollmentColumns}
            rows={enrollments}
            getRowKey={(row) => row.id}
            emptyLabel="Aucune inscription"
          />
        </>
      ) : null}
      {view === 'skills' ? (
        <ErpOperationalTable
          ariaLabel="Matrice de compétences"
          columns={employeeSkillColumns}
          rows={employeeSkills}
          getRowKey={(row) => row.id}
          emptyLabel="Affectez une compétence à un salarié"
        />
      ) : null}
      {view === 'performance' ? (
        <>
          <StyledSubheading>Campagnes</StyledSubheading>
          <ErpOperationalTable
            ariaLabel="Campagnes d'évaluation"
            columns={cycleColumns}
            rows={cycles}
            getRowKey={(row) => row.id}
            emptyLabel="Créez la première campagne"
          />
          <StyledSubheading>Évaluations</StyledSubheading>
          <ErpOperationalTable
            ariaLabel="Évaluations de performance"
            columns={reviewColumns}
            rows={reviews}
            getRowKey={(row) => row.id}
            emptyLabel="Affectez une évaluation"
          />
        </>
      ) : null}
    </ErpPageShell>
  );
};
