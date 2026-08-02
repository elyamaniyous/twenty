import { z } from 'zod';

import {
  centsSchema,
  civilDateSchema,
  instantSchema,
  nullableInstantSchema,
  uuidSchema,
} from './erp-maroc-contracts';

const civilDateHttpSchema = z
  .union([civilDateSchema, instantSchema])
  .transform((value) => value.slice(0, 10));
const nullableCivilDateHttpSchema = civilDateHttpSchema.nullable();
const nullableStringSchema = z.string().nullable();
const entitySchema = z.object({ id: uuidSchema }).passthrough();

export const hrEmployeeChangeTypeSchema = z.enum([
  'CONTACT_DETAILS',
  'BANK_ACCOUNT',
]);
export const hrRequestStatusSchema = z.enum([
  'REQUESTED',
  'APPROVED',
  'REJECTED',
  'CANCELLED',
]);
export const hrAttestationTypeSchema = z.enum(['WORK', 'SALARY']);
export const hrAttestationStatusSchema = z.enum([
  'REQUESTED',
  'GENERATED',
  'ACKNOWLEDGED',
  'SIGNED',
  'REJECTED',
]);
export const hrNotificationChannelSchema = z.enum(['IN_APP', 'EMAIL']);
export const hrNotificationStatusSchema = z.enum([
  'PENDING',
  'SENT',
  'FAILED',
  'READ',
]);
export const hrJobOpeningStatusSchema = z.enum([
  'DRAFT',
  'OPEN',
  'PAUSED',
  'CLOSED',
]);
export const hrCandidateStatusSchema = z.enum(['ACTIVE', 'HIRED', 'ARCHIVED']);
export const hrApplicationStageSchema = z.enum([
  'APPLIED',
  'SCREENING',
  'INTERVIEW',
  'OFFER',
  'HIRED',
  'REJECTED',
]);
export const hrInterviewStatusSchema = z.enum([
  'SCHEDULED',
  'COMPLETED',
  'CANCELLED',
  'NO_SHOW',
]);
export const hrOfferStatusSchema = z.enum([
  'DRAFT',
  'SENT',
  'ACCEPTED',
  'REJECTED',
  'WITHDRAWN',
]);
export const hrTrainingSessionStatusSchema = z.enum([
  'PLANNED',
  'OPEN',
  'COMPLETED',
  'CANCELLED',
]);
export const hrTrainingEnrollmentStatusSchema = z.enum([
  'ENROLLED',
  'COMPLETED',
  'FAILED',
  'CANCELLED',
]);
export const hrReviewCampaignStatusSchema = z.enum(['DRAFT', 'OPEN', 'CLOSED']);
export const hrPerformanceReviewStatusSchema = z.enum([
  'DRAFT',
  'SELF_REVIEW',
  'MANAGER_REVIEW',
  'COMPLETED',
]);

export const hrPeopleEmployeeSummarySchema = z.object({
  id: uuidSchema,
  employeeNumber: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  jobTitle: z.string().optional(),
  email: nullableStringSchema.optional(),
});

export const hrCandidateNotificationSummarySchema = z.object({
  id: uuidSchema,
  firstName: z.string(),
  lastName: z.string(),
  email: z.string(),
});

export const hrEmployeeChangeRequestSchema = z.object({
  id: uuidSchema,
  organisationId: uuidSchema,
  societeId: uuidSchema,
  employeeId: uuidSchema,
  type: hrEmployeeChangeTypeSchema,
  status: hrRequestStatusSchema,
  proposedEmail: nullableStringSchema,
  proposedPhone: nullableStringSchema,
  proposedAddress: nullableStringSchema,
  proposedBankName: nullableStringSchema,
  proposedAccountHolder: nullableStringSchema,
  proposedRibLastFour: nullableStringSchema,
  reason: nullableStringSchema,
  requestedByTwentyUserId: z.string(),
  requestedAt: instantSchema,
  decidedByTwentyUserId: nullableStringSchema,
  decidedAt: nullableInstantSchema,
  decisionNote: nullableStringSchema,
  appliedBankDetailId: uuidSchema.nullable(),
  createdAt: instantSchema,
  updatedAt: instantSchema,
  employee: hrPeopleEmployeeSummarySchema.optional(),
});

export const hrAttestationRequestSchema = z.object({
  id: uuidSchema,
  organisationId: uuidSchema,
  societeId: uuidSchema,
  employeeId: uuidSchema,
  type: hrAttestationTypeSchema,
  status: hrAttestationStatusSchema,
  purpose: nullableStringSchema,
  requestedByTwentyUserId: z.string(),
  requestedAt: instantSchema,
  generatedByTwentyUserId: nullableStringSchema,
  generatedAt: nullableInstantSchema,
  storageKey: nullableStringSchema,
  filename: nullableStringSchema,
  contentSha256: nullableStringSchema,
  acknowledgedAt: nullableInstantSchema,
  signedAt: nullableInstantSchema,
  signedName: nullableStringSchema,
  signatureProof: nullableStringSchema,
  rejectedByTwentyUserId: nullableStringSchema,
  rejectedAt: nullableInstantSchema,
  rejectionReason: nullableStringSchema,
  createdAt: instantSchema,
  updatedAt: instantSchema,
  employee: hrPeopleEmployeeSummarySchema.optional(),
});

export const hrNotificationSchema = z.object({
  id: uuidSchema,
  organisationId: uuidSchema,
  societeId: uuidSchema,
  employeeId: uuidSchema.nullable(),
  candidateId: uuidSchema.nullable(),
  channel: hrNotificationChannelSchema,
  status: hrNotificationStatusSchema,
  templateKey: z.string(),
  title: z.string(),
  body: z.string(),
  recipientEmail: nullableStringSchema,
  relatedEntityType: nullableStringSchema,
  relatedEntityId: uuidSchema.nullable(),
  providerMessageId: nullableStringSchema,
  errorMessage: nullableStringSchema,
  sentAt: nullableInstantSchema,
  readAt: nullableInstantSchema,
  createdByTwentyUserId: z.string(),
  createdAt: instantSchema,
  updatedAt: instantSchema,
  employee: hrPeopleEmployeeSummarySchema.nullable().optional(),
  candidate: hrCandidateNotificationSummarySchema.nullable().optional(),
});

export const hrJobOpeningSchema = z
  .object({
    id: uuidSchema,
    code: z.string(),
    title: z.string(),
    description: z.string(),
    location: nullableStringSchema,
    contractType: z.enum(['CDI', 'CDD', 'ANAPEC', 'INTERIM', 'STAGE']),
    status: hrJobOpeningStatusSchema,
    openingsCount: z.number().int().positive(),
    minSalaryCents: centsSchema.nullable(),
    maxSalaryCents: centsSchema.nullable(),
    establishmentId: uuidSchema.nullable(),
    departmentId: uuidSchema.nullable(),
    jobPositionId: uuidSchema.nullable(),
    hiringManagerEmployeeId: uuidSchema.nullable(),
    publishedAt: nullableInstantSchema,
    closesAt: nullableCivilDateHttpSchema,
    createdAt: instantSchema,
    updatedAt: instantSchema,
    _count: z
      .object({ applications: z.number().int().nonnegative() })
      .optional(),
  })
  .passthrough();

export const hrCandidateSchema = z
  .object({
    id: uuidSchema,
    firstName: z.string(),
    lastName: z.string(),
    email: z.string(),
    phone: nullableStringSchema,
    city: nullableStringSchema,
    source: nullableStringSchema,
    status: hrCandidateStatusSchema,
    consentAt: nullableInstantSchema,
    notes: nullableStringSchema,
    convertedEmployeeId: uuidSchema.nullable(),
    createdAt: instantSchema,
    updatedAt: instantSchema,
  })
  .passthrough();

export const hrInterviewSchema = z
  .object({
    id: uuidSchema,
    applicationId: uuidSchema,
    scheduledAt: instantSchema,
    durationMinutes: z.number().int().positive(),
    location: nullableStringSchema,
    interviewerTwentyUserId: z.string(),
    status: hrInterviewStatusSchema,
    score: z.number().int().nullable(),
    feedback: nullableStringSchema,
    createdAt: instantSchema,
    updatedAt: instantSchema,
  })
  .passthrough();

export const hrOfferSchema = z
  .object({
    id: uuidSchema,
    applicationId: uuidSchema,
    status: hrOfferStatusSchema,
    jobTitle: z.string(),
    contractType: z.enum(['CDI', 'CDD', 'ANAPEC', 'INTERIM', 'STAGE']),
    salaryCents: centsSchema,
    startDate: civilDateHttpSchema,
    endDate: nullableCivilDateHttpSchema,
    expiresAt: civilDateHttpSchema,
    sentAt: nullableInstantSchema,
    respondedAt: nullableInstantSchema,
    notes: nullableStringSchema,
    createdAt: instantSchema,
    updatedAt: instantSchema,
  })
  .passthrough();

export const hrApplicationSchema = z
  .object({
    id: uuidSchema,
    jobOpeningId: uuidSchema,
    candidateId: uuidSchema,
    stage: hrApplicationStageSchema,
    rating: z.number().int().nullable(),
    rejectionReason: nullableStringSchema,
    appliedAt: instantSchema,
    stageChangedAt: instantSchema,
    createdAt: instantSchema,
    updatedAt: instantSchema,
    candidate: hrCandidateSchema.optional(),
    jobOpening: hrJobOpeningSchema.optional(),
    interviews: z.array(hrInterviewSchema).optional(),
    offers: z.array(hrOfferSchema).optional(),
  })
  .passthrough();

export const hrSkillSchema = entitySchema.extend({
  code: z.string(),
  name: z.string(),
  category: nullableStringSchema,
  description: nullableStringSchema,
  isActive: z.boolean(),
});
export const hrEmployeeSkillSchema = entitySchema.extend({
  employeeId: uuidSchema,
  skillId: uuidSchema,
  currentLevel: z.number().int().min(1).max(5),
  targetLevel: z.number().int().min(1).max(5).nullable(),
  assessedAt: nullableCivilDateHttpSchema,
  notes: nullableStringSchema,
  skill: hrSkillSchema.optional(),
  employee: hrPeopleEmployeeSummarySchema.optional(),
});
export const hrTrainingCourseSchema = entitySchema.extend({
  code: z.string(),
  title: z.string(),
  description: nullableStringSchema,
  durationHours: z.number().int().positive(),
  provider: nullableStringSchema,
  skillId: uuidSchema.nullable(),
  validityMonths: z.number().int().nullable(),
  isActive: z.boolean(),
  skill: hrSkillSchema.nullable().optional(),
});
export const hrTrainingEnrollmentSchema = entitySchema.extend({
  sessionId: uuidSchema,
  employeeId: uuidSchema,
  status: hrTrainingEnrollmentStatusSchema,
  attendancePercent: z.number().int().nullable(),
  score: z.number().int().nullable(),
  completedAt: nullableInstantSchema,
  notes: nullableStringSchema,
  employee: hrPeopleEmployeeSummarySchema.optional(),
});
export const hrTrainingSessionSchema = entitySchema.extend({
  courseId: uuidSchema,
  startsAt: instantSchema,
  endsAt: instantSchema,
  location: nullableStringSchema,
  capacity: z.number().int().nullable(),
  status: hrTrainingSessionStatusSchema,
  trainerName: nullableStringSchema,
  course: hrTrainingCourseSchema.optional(),
  enrollments: z.array(hrTrainingEnrollmentSchema).optional(),
});
export const hrCertificationDefinitionSchema = entitySchema.extend({
  code: z.string(),
  name: z.string(),
  issuer: nullableStringSchema,
  validityMonths: z.number().int().nullable(),
  reminderDays: z.number().int().nonnegative(),
  isRequired: z.boolean(),
  isActive: z.boolean(),
});
export const hrEmployeeCertificationSchema = entitySchema.extend({
  employeeId: uuidSchema,
  certificationDefinitionId: uuidSchema,
  certificateNumber: nullableStringSchema,
  issuedAt: civilDateHttpSchema,
  expiresAt: nullableCivilDateHttpSchema,
  verifiedAt: nullableInstantSchema,
  notes: nullableStringSchema,
  validityStatus: z.enum(['VALID', 'EXPIRING', 'EXPIRED']).optional(),
  certificationDefinition: hrCertificationDefinitionSchema.optional(),
  employee: hrPeopleEmployeeSummarySchema.optional(),
});
export const hrReviewCampaignSchema = entitySchema.extend({
  name: z.string(),
  periodStart: civilDateHttpSchema,
  periodEnd: civilDateHttpSchema,
  dueDate: civilDateHttpSchema,
  status: hrReviewCampaignStatusSchema,
});
export const hrReviewObjectiveSchema = entitySchema.extend({
  reviewId: uuidSchema,
  title: z.string(),
  description: nullableStringSchema,
  weightPercent: z.number().int().min(1).max(100),
  targetValue: nullableStringSchema,
  achievedValue: nullableStringSchema,
  score: z.number().int().nullable(),
});
export const hrPerformanceReviewSchema = entitySchema.extend({
  campaignId: uuidSchema,
  employeeId: uuidSchema,
  managerEmployeeId: uuidSchema.nullable(),
  status: hrPerformanceReviewStatusSchema,
  selfScore: z.number().int().nullable(),
  managerScore: z.number().int().nullable(),
  overallScore: z.number().int().nullable(),
  employeeSummary: nullableStringSchema,
  managerSummary: nullableStringSchema,
  completedAt: nullableInstantSchema,
  campaign: hrReviewCampaignSchema.optional(),
  employee: hrPeopleEmployeeSummarySchema.optional(),
  managerEmployee: hrPeopleEmployeeSummarySchema.nullable().optional(),
  objectives: z.array(hrReviewObjectiveSchema).optional(),
});

export const hrPeopleWorkspaceSchema = z.object({
  summary: z.object({
    pendingChanges: z.number().int().nonnegative(),
    pendingAttestations: z.number().int().nonnegative(),
    openJobs: z.number().int().nonnegative(),
    activeApplications: z.number().int().nonnegative(),
    certificationsAtRisk: z.number().int().nonnegative(),
    reviewsInProgress: z.number().int().nonnegative(),
  }),
  changeRequests: z.array(hrEmployeeChangeRequestSchema),
  attestations: z.array(hrAttestationRequestSchema),
  notifications: z.array(hrNotificationSchema),
  recruitment: z.object({
    jobOpenings: z.array(hrJobOpeningSchema),
    candidates: z.array(hrCandidateSchema),
    applications: z.array(hrApplicationSchema),
  }),
  talent: z.object({
    skills: z.array(hrSkillSchema),
    employeeSkills: z.array(hrEmployeeSkillSchema),
    courses: z.array(hrTrainingCourseSchema),
    sessions: z.array(hrTrainingSessionSchema),
    certifications: z.array(hrCertificationDefinitionSchema),
    employeeCertifications: z.array(hrEmployeeCertificationSchema),
    reviewCampaigns: z.array(hrReviewCampaignSchema),
    reviews: z.array(hrPerformanceReviewSchema),
  }),
  employees: z.array(hrPeopleEmployeeSummarySchema),
});

export const hrPeopleMutationResultSchema = entitySchema;
export const hrPeopleDocumentSchema = z.object({
  filename: z.string(),
  mimeType: z.literal('application/pdf'),
  contentBase64: z.string(),
});

export type HrEmployeeChangeRequest = z.infer<
  typeof hrEmployeeChangeRequestSchema
>;
export type HrAttestationRequest = z.infer<typeof hrAttestationRequestSchema>;
export type HrNotification = z.infer<typeof hrNotificationSchema>;
export type HrJobOpening = z.infer<typeof hrJobOpeningSchema>;
export type HrCandidate = z.infer<typeof hrCandidateSchema>;
export type HrApplication = z.infer<typeof hrApplicationSchema>;
export type HrPeopleWorkspace = z.infer<typeof hrPeopleWorkspaceSchema>;
