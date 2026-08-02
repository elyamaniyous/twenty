import { z } from 'zod';

import {
  civilDateSchema,
  instantSchema,
  nullableInstantSchema,
  uuidSchema,
} from './erp-maroc-contracts';

const nullableStringSchema = z.string().nullable();
const countSchema = z.number().int().nonnegative();
const sha256Schema = z.string().regex(/^[0-9a-f]{64}$/);
const civilDateHttpSchema = z
  .union([civilDateSchema, instantSchema])
  .transform((value) => value.slice(0, 10));
const nullableCivilDateHttpSchema = civilDateHttpSchema.nullable();

export const payrollRegulatoryStatusSchema = z.enum([
  'DRAFT',
  'REVIEWED',
  'APPROVED',
  'ACTIVE',
  'REJECTED',
  'RETIRED',
]);

export const payrollLegalSourceSchema = z.object({
  id: uuidSchema,
  organisationId: uuidSchema,
  societeId: uuidSchema,
  code: z.string(),
  title: z.string(),
  authority: z.string(),
  reference: nullableStringSchema,
  url: nullableStringSchema,
  publishedAt: nullableCivilDateHttpSchema,
  retrievedAt: civilDateHttpSchema,
  contentSha256: nullableStringSchema,
  notes: nullableStringSchema,
  createdAt: instantSchema,
  updatedAt: instantSchema,
});

export const payrollRuleVersionSourceSchema = z.object({
  organisationId: uuidSchema,
  payrollRuleVersionId: uuidSchema,
  legalSourceId: uuidSchema,
  createdAt: instantSchema,
  legalSource: payrollLegalSourceSchema,
});

export const payrollRuleVersionSchema = z.object({
  id: uuidSchema,
  organisationId: uuidSchema,
  societeId: uuidSchema,
  payrollRuleId: uuidSchema,
  version: z.number().int().positive(),
  scopeType: z.enum([
    'NATIONAL',
    'SOCIETE',
    'ESTABLISHMENT',
    'PAYROLL_PROFILE',
    'EMPLOYEE',
  ]),
  scopeKey: z.string(),
  value: z.unknown(),
  effectiveFrom: civilDateHttpSchema,
  effectiveTo: nullableCivilDateHttpSchema,
  status: payrollRegulatoryStatusSchema,
  rationale: nullableStringSchema,
  createdByTwentyUserId: z.string(),
  reviewedAt: nullableInstantSchema,
  reviewedByTwentyUserId: nullableStringSchema,
  approvedAt: nullableInstantSchema,
  approvedByTwentyUserId: nullableStringSchema,
  activatedAt: nullableInstantSchema,
  activatedByTwentyUserId: nullableStringSchema,
  retiredAt: nullableInstantSchema,
  createdAt: instantSchema,
  updatedAt: instantSchema,
  sourceLinks: z.array(payrollRuleVersionSourceSchema),
});

export const payrollRuleSchema = z.object({
  id: uuidSchema,
  organisationId: uuidSchema,
  societeId: uuidSchema,
  code: z.string(),
  label: z.string(),
  description: nullableStringSchema,
  category: z.string(),
  valueType: z.enum([
    'MONEY_CENTS',
    'RATE_BASIS_POINTS',
    'INTEGER',
    'DECIMAL',
    'BOOLEAN',
    'STRING',
    'JSON',
  ]),
  unit: z.string(),
  critical: z.boolean(),
  isActive: z.boolean(),
  createdAt: instantSchema,
  updatedAt: instantSchema,
  versions: z.array(payrollRuleVersionSchema),
});
export const payrollRuleListSchema = z.array(payrollRuleSchema);

export const payrollComponentVersionSchema = z.object({
  id: uuidSchema,
  organisationId: uuidSchema,
  societeId: uuidSchema,
  payrollComponentId: uuidSchema,
  version: z.number().int().positive(),
  status: payrollRegulatoryStatusSchema,
  effectiveFrom: civilDateHttpSchema,
  effectiveTo: nullableCivilDateHttpSchema,
  unit: z.string(),
  formula: z.string(),
  incidences: z.record(z.string(), z.string()),
  payslipDisplay: nullableStringSchema,
  declarationMapping: nullableStringSchema,
  debitAccountCode: nullableStringSchema,
  creditAccountCode: nullableStringSchema,
  criticality: z.string(),
  sourceCodes: z.array(z.string()),
  createdByTwentyUserId: z.string(),
  reviewedAt: nullableInstantSchema,
  reviewedByTwentyUserId: nullableStringSchema,
  approvedAt: nullableInstantSchema,
  approvedByTwentyUserId: nullableStringSchema,
  activatedAt: nullableInstantSchema,
  activatedByTwentyUserId: nullableStringSchema,
  retiredAt: nullableInstantSchema,
  createdAt: instantSchema,
  updatedAt: instantSchema,
});

export const payrollComponentSchema = z.object({
  id: uuidSchema,
  organisationId: uuidSchema,
  societeId: uuidSchema,
  code: z.string(),
  label: z.string(),
  family: z.string(),
  isActive: z.boolean(),
  createdAt: instantSchema,
  updatedAt: instantSchema,
  versions: z.array(payrollComponentVersionSchema),
});
export const payrollComponentListSchema = z.array(payrollComponentSchema);

export const payrollControlDefinitionSchema = z.object({
  id: uuidSchema,
  organisationId: uuidSchema,
  societeId: uuidSchema,
  code: z.string(),
  version: z.number().int().positive(),
  status: payrollRegulatoryStatusSchema,
  effectiveFrom: civilDateHttpSchema,
  effectiveTo: nullableCivilDateHttpSchema,
  stage: z.string(),
  domain: z.string(),
  label: z.string(),
  severity: z.string(),
  owner: z.string(),
  frequency: z.string(),
  expectedAction: z.string(),
  isBlocking: z.boolean(),
  createdByTwentyUserId: z.string(),
  reviewedAt: nullableInstantSchema,
  reviewedByTwentyUserId: nullableStringSchema,
  approvedAt: nullableInstantSchema,
  approvedByTwentyUserId: nullableStringSchema,
  activatedAt: nullableInstantSchema,
  activatedByTwentyUserId: nullableStringSchema,
  retiredAt: nullableInstantSchema,
  createdAt: instantSchema,
  updatedAt: instantSchema,
});
export const payrollControlDefinitionListSchema = z.array(
  payrollControlDefinitionSchema,
);

export const payrollRegulatorySummarySchema = z.object({
  parameters: countSchema,
  components: countSchema,
  controls: countSchema,
  sources: countSchema,
  testPacks: countSchema,
});

export const payrollRegulatorySeedResultSchema = z.object({
  baseline: z.object({
    id: z.string(),
    version: z.number().int().positive(),
    status: z.enum(['CANDIDATE', 'APPROVED']),
    validationRequired: z.boolean(),
  }),
  sourceCount: countSchema,
  ruleCount: countSchema,
  studyParameterCount: countSchema,
  componentCount: countSchema,
  controlCount: countSchema,
  testPack: z.object({
    id: uuidSchema,
    code: z.string(),
    version: z.number().int().positive(),
    status: z.enum(['DRAFT', 'APPROVED', 'RETIRED']),
  }),
});

export const payrollLegalSourceListSchema = z.array(payrollLegalSourceSchema);

export const payrollDeclarationStatusSchema = z.enum([
  'GENERATED',
  'INTERNALLY_VALIDATED',
  'SUBMITTED',
  'ACKNOWLEDGED',
  'EXTERNALLY_ACCEPTED',
  'REJECTED',
]);

export const payrollDeclarationEventSchema = z.object({
  id: uuidSchema,
  type: z.enum(['SUBMITTED', 'ACKNOWLEDGED', 'ACCEPTED', 'REJECTED']),
  statusAfter: payrollDeclarationStatusSchema,
  occurredAt: instantSchema,
  actorTwentyUserId: z.string(),
  externalReference: nullableStringSchema,
  message: nullableStringSchema,
  evidenceFilename: nullableStringSchema,
  evidenceContentType: nullableStringSchema,
  evidencePayloadSha256: sha256Schema.nullable(),
  evidenceSizeBytes: z.number().int().positive().nullable(),
});

export const payrollDeclarationSchema = z.object({
  id: uuidSchema,
  organisationId: uuidSchema,
  societeId: uuidSchema,
  exerciceId: uuidSchema.nullable(),
  kind: z.string(),
  periodKey: z.string(),
  formatVersion: z.string(),
  filename: z.string(),
  contentType: z.string(),
  payloadSha256: sha256Schema,
  validationStatus: payrollDeclarationStatusSchema,
  validationReport: z.unknown(),
  generatedByTwentyUserId: z.string(),
  generatedAt: instantSchema,
  attemptNumber: z.number().int().positive(),
  previousSubmissionId: uuidSchema.nullable(),
  submittedAt: nullableInstantSchema,
  submittedByTwentyUserId: nullableStringSchema,
  submissionChannel: nullableStringSchema,
  externallyValidatedAt: nullableInstantSchema,
  externallyValidatedBy: nullableStringSchema,
  externalReference: nullableStringSchema,
  rejectionReason: nullableStringSchema,
  createdAt: instantSchema,
  updatedAt: instantSchema,
  previousSubmission: z
    .object({ id: uuidSchema, attemptNumber: z.number().int().positive() })
    .nullable(),
  events: z.array(payrollDeclarationEventSchema),
});
export const payrollDeclarationListSchema = z.array(payrollDeclarationSchema);

export const payrollDeclarationExportSchema = z.object({
  submissionId: uuidSchema,
  attemptNumber: z.number().int().positive(),
  previousSubmissionId: uuidSchema.nullable(),
  filename: z.string(),
  contentType: z.string(),
  content: z.string(),
  payloadSha256: sha256Schema,
  validation: z.object({
    valid: z.boolean(),
    errors: z.array(z.string()),
    warnings: z.array(z.string()),
    validator: z.string(),
    checkedAt: instantSchema,
    externalAcceptanceRequired: z.literal(true),
  }),
  employees: countSchema,
});

export const payrollDeclarationEvidenceSchema = z.object({
  id: uuidSchema,
  filename: z.string(),
  contentType: z.string(),
  contentBase64: z.string(),
  payloadSha256: sha256Schema.nullable(),
  sizeBytes: z.number().int().positive().nullable(),
});

export const payrollDeadlineStatusSchema = z.enum([
  'UPCOMING',
  'DUE_SOON',
  'OVERDUE',
  'IN_PROGRESS',
  'REJECTED',
  'COMPLETED',
]);

export const payrollDeadlineSchema = z.object({
  code: z.enum([
    'CNSS_MONTHLY',
    'IR_WITHHOLDING_MONTHLY',
    'IR_SALARIES_ANNUAL',
  ]),
  label: z.string(),
  periodKey: z.string(),
  dueDate: civilDateHttpSchema,
  portal: z.enum(['DAMANCOM', 'SIMPL_IR']),
  ruleVersion: z.string(),
  sourceLabel: z.string(),
  sourceUrl: z.string(),
  sourceArticle: nullableStringSchema,
  requiresExpertReview: z.boolean(),
  status: payrollDeadlineStatusSchema,
  declarationId: uuidSchema.nullable(),
  declarationStatus: payrollDeclarationStatusSchema.nullable(),
  attemptNumber: z.number().int().positive().nullable(),
  externalReference: nullableStringSchema,
});
export const payrollDeadlineListSchema = z.array(payrollDeadlineSchema);

export const payrollClosingCheckSchema = z.object({
  code: z.string(),
  label: z.string(),
  passed: z.boolean(),
  blocking: z.literal(true),
  detail: z.string(),
});

export const payrollClosingTotalsSchema = z.object({
  employeeCount: countSchema,
  totalGrossCents: countSchema,
  totalNetCents: countSchema,
  totalEmployerCostCents: countSchema,
  totalCnssCents: countSchema,
  totalAmoCents: countSchema,
  totalIrCents: countSchema,
});

export const payrollClosingProofsSchema = z.object({
  hrMonthlyPeriodId: uuidSchema.nullable(),
  payslipIds: z.array(uuidSchema),
  payrollAccountingEntryIds: z.array(uuidSchema),
  paymentBatchId: uuidSchema.nullable(),
  paymentBatchAttemptNumber: z.number().int().positive().nullable(),
  settlementAccountingEntryId: uuidSchema.nullable(),
  cnssDeclarationId: uuidSchema.nullable(),
  cnssEvidenceEventId: uuidSchema.nullable(),
  irDeclarationId: uuidSchema.nullable(),
  irEvidenceEventId: uuidSchema.nullable(),
});

export const payrollClosingDossierSchema = z.object({
  id: uuidSchema,
  organisationId: uuidSchema,
  societeId: uuidSchema,
  periodKey: z.string(),
  version: z.number().int().positive(),
  status: z.enum(['CLOSED', 'REOPENED']),
  previousDossierId: uuidSchema.nullable(),
  snapshot: z.unknown(),
  snapshotSha256: sha256Schema,
  closedAt: instantSchema,
  closedByTwentyUserId: z.string(),
  closeIdempotencyKey: z.string(),
  reopenedAt: nullableInstantSchema,
  reopenedByTwentyUserId: nullableStringSchema,
  reopenReason: nullableStringSchema,
  reopenIdempotencyKey: nullableStringSchema,
  createdAt: instantSchema,
  updatedAt: instantSchema,
});

export const payrollClosingPreviewSchema = z.object({
  periodKey: z.string(),
  generatedAt: instantSchema,
  ready: z.boolean(),
  checks: z.array(payrollClosingCheckSchema),
  totals: payrollClosingTotalsSchema,
  proofs: payrollClosingProofsSchema,
  deadlines: payrollDeadlineListSchema,
  latestDossier: payrollClosingDossierSchema.nullable(),
});

export type PayrollRegulatoryStatus = z.infer<
  typeof payrollRegulatoryStatusSchema
>;
export type PayrollLegalSource = z.infer<typeof payrollLegalSourceSchema>;
export type PayrollRule = z.infer<typeof payrollRuleSchema>;
export type PayrollComponent = z.infer<typeof payrollComponentSchema>;
export type PayrollControlDefinition = z.infer<
  typeof payrollControlDefinitionSchema
>;
export type PayrollRegulatorySummary = z.infer<
  typeof payrollRegulatorySummarySchema
>;
export type PayrollDeclarationStatus = z.infer<
  typeof payrollDeclarationStatusSchema
>;
export type PayrollDeclarationEvent = z.infer<
  typeof payrollDeclarationEventSchema
>;
export type PayrollDeclaration = z.infer<typeof payrollDeclarationSchema>;
export type PayrollDeadlineStatus = z.infer<typeof payrollDeadlineStatusSchema>;
export type PayrollDeadline = z.infer<typeof payrollDeadlineSchema>;
export type PayrollClosingCheck = z.infer<typeof payrollClosingCheckSchema>;
export type PayrollClosingDossier = z.infer<typeof payrollClosingDossierSchema>;
export type PayrollClosingPreview = z.infer<typeof payrollClosingPreviewSchema>;
