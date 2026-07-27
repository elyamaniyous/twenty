import { z } from 'zod';

import {
  civilDateSchema,
  instantSchema,
  nullableInstantSchema,
  uuidSchema,
} from './erp-maroc-contracts';

const nullableStringSchema = z.string().nullable();
const countSchema = z.number().int().nonnegative();
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
