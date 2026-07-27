import { z } from 'zod';

import {
  centsSchema,
  civilDateSchema,
  instantSchema,
  nonNegativeIntegerSchema,
  uuidSchema,
} from './erp-maroc-contracts';

const civilDateHttpSchema = z
  .union([civilDateSchema, instantSchema])
  .transform((value) => value.slice(0, 10));
const nullableCivilDateHttpSchema = civilDateHttpSchema.nullable();
const nullableStringSchema = z.string().nullable();

export const hrEmployeeStatusSchema = z.enum([
  'ACTIVE',
  'SUSPENDED',
  'TERMINATED',
]);
export const hrContractTypeSchema = z.enum([
  'CDI',
  'CDD',
  'ANAPEC',
  'INTERIM',
  'STAGE',
]);
export const hrContractStatusSchema = z.enum([
  'DRAFT',
  'ACTIVE',
  'SUSPENDED',
  'ENDED',
  'CANCELLED',
]);
export const hrAmendmentStatusSchema = z.enum([
  'DRAFT',
  'APPROVED',
  'REJECTED',
  'CANCELLED',
]);

export const hrEstablishmentSchema = z.object({
  id: uuidSchema,
  organisationId: uuidSchema,
  societeId: uuidSchema,
  code: z.string(),
  name: z.string(),
  address: nullableStringSchema,
  city: nullableStringSchema,
  cnssNumber: nullableStringSchema,
  isHeadOffice: z.boolean(),
  isActive: z.boolean(),
  createdAt: instantSchema,
  updatedAt: instantSchema,
  _count: z.object({ departments: nonNegativeIntegerSchema }).optional(),
});
export const hrEstablishmentListSchema = z.array(hrEstablishmentSchema);

const hrDepartmentSummarySchema = z.object({
  id: uuidSchema,
  code: z.string(),
  name: z.string(),
  establishmentId: uuidSchema.nullable().optional(),
});
const hrEstablishmentSummarySchema = z.object({
  id: uuidSchema,
  code: z.string(),
  name: z.string(),
});
const hrJobPositionSummarySchema = z.object({
  id: uuidSchema,
  code: z.string(),
  title: z.string(),
});

export const hrDepartmentSchema = z.object({
  id: uuidSchema,
  organisationId: uuidSchema,
  societeId: uuidSchema,
  establishmentId: uuidSchema.nullable(),
  parentId: uuidSchema.nullable(),
  code: z.string(),
  name: z.string(),
  costCenterCode: nullableStringSchema,
  isActive: z.boolean(),
  createdAt: instantSchema,
  updatedAt: instantSchema,
  establishment: hrEstablishmentSchema.nullable().optional(),
  parent: hrDepartmentSummarySchema.nullable().optional(),
  _count: z
    .object({
      jobPositions: nonNegativeIntegerSchema,
      children: nonNegativeIntegerSchema,
    })
    .optional(),
});
export const hrDepartmentListSchema = z.array(hrDepartmentSchema);

export const hrJobPositionSchema = z.object({
  id: uuidSchema,
  organisationId: uuidSchema,
  societeId: uuidSchema,
  departmentId: uuidSchema.nullable(),
  code: z.string(),
  title: z.string(),
  grade: nullableStringSchema,
  description: nullableStringSchema,
  isActive: z.boolean(),
  createdAt: instantSchema,
  updatedAt: instantSchema,
  department: hrDepartmentSummarySchema.nullable().optional(),
  _count: z
    .object({ employmentContracts: nonNegativeIntegerSchema })
    .optional(),
});
export const hrJobPositionListSchema = z.array(hrJobPositionSchema);

export const hrContractAmendmentSchema = z.object({
  id: uuidSchema,
  organisationId: uuidSchema,
  societeId: uuidSchema,
  employmentContractId: uuidSchema,
  sequence: nonNegativeIntegerSchema,
  effectiveDate: civilDateHttpSchema,
  reason: z.string(),
  previousValues: z.record(z.string(), z.unknown()),
  changes: z.record(z.string(), z.unknown()),
  status: hrAmendmentStatusSchema,
  createdByTwentyUserId: z.string(),
  approvedAt: instantSchema.nullable(),
  approvedByTwentyUserId: nullableStringSchema,
  rejectedAt: instantSchema.nullable(),
  rejectedByTwentyUserId: nullableStringSchema,
  rejectionReason: nullableStringSchema,
  createdAt: instantSchema,
  updatedAt: instantSchema,
});

const hrContractStructureSchema = z.object({
  establishment: hrEstablishmentSummarySchema.nullable().optional(),
  department: hrDepartmentSummarySchema.nullable().optional(),
  jobPosition: hrJobPositionSummarySchema.nullable().optional(),
});

export const hrEmploymentContractSchema = z
  .object({
    id: uuidSchema,
    organisationId: uuidSchema,
    societeId: uuidSchema,
    employeeId: uuidSchema,
    establishmentId: uuidSchema.nullable(),
    departmentId: uuidSchema.nullable(),
    jobPositionId: uuidSchema.nullable(),
    contractNumber: z.string(),
    contractType: hrContractTypeSchema,
    status: hrContractStatusSchema,
    startDate: civilDateHttpSchema,
    endDate: nullableCivilDateHttpSchema,
    probationEndDate: nullableCivilDateHttpSchema,
    jobTitleSnapshot: z.string(),
    baseSalaryCents: centsSchema,
    weeklyHoursHundredths: nonNegativeIntegerSchema,
    paymentFrequency: z.string(),
    notes: nullableStringSchema,
    createdByTwentyUserId: z.string(),
    activatedAt: instantSchema.nullable(),
    activatedByTwentyUserId: nullableStringSchema,
    endedAt: instantSchema.nullable(),
    endedByTwentyUserId: nullableStringSchema,
    createdAt: instantSchema,
    updatedAt: instantSchema,
    amendments: z.array(hrContractAmendmentSchema).optional(),
  })
  .extend(hrContractStructureSchema.shape);

export const hrEmployeeListItemSchema = z.object({
  id: uuidSchema,
  employeeNumber: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  email: nullableStringSchema,
  phone: nullableStringSchema,
  jobTitle: z.string(),
  department: nullableStringSchema,
  status: hrEmployeeStatusSchema,
  hireDate: civilDateHttpSchema,
  employmentContracts: z.array(hrEmploymentContractSchema),
});
export const hrEmployeeListSchema = z.array(hrEmployeeListItemSchema);

export const hrEmployeeDetailSchema = z.object({
  id: uuidSchema,
  employeeNumber: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  cin: nullableStringSchema,
  cnssNumber: nullableStringSchema,
  email: nullableStringSchema,
  phone: nullableStringSchema,
  address: nullableStringSchema,
  jobTitle: z.string(),
  department: nullableStringSchema,
  contractType: hrContractTypeSchema,
  status: hrEmployeeStatusSchema,
  hireDate: civilDateHttpSchema,
  terminationDate: nullableCivilDateHttpSchema,
  baseSalaryCents: centsSchema,
  familyDependants: nonNegativeIntegerSchema,
  createdAt: instantSchema,
  updatedAt: instantSchema,
  employmentContracts: z.array(hrEmploymentContractSchema),
});

export const hrCoreSummarySchema = z.object({
  activeEmployees: nonNegativeIntegerSchema,
  establishments: nonNegativeIntegerSchema,
  departments: nonNegativeIntegerSchema,
  jobPositions: nonNegativeIntegerSchema,
  activeContracts: nonNegativeIntegerSchema,
  draftAmendments: nonNegativeIntegerSchema,
});

export type HrEmployeeStatus = z.infer<typeof hrEmployeeStatusSchema>;
export type HrContractType = z.infer<typeof hrContractTypeSchema>;
export type HrContractStatus = z.infer<typeof hrContractStatusSchema>;
export type HrAmendmentStatus = z.infer<typeof hrAmendmentStatusSchema>;
export type HrEstablishment = z.infer<typeof hrEstablishmentSchema>;
export type HrDepartment = z.infer<typeof hrDepartmentSchema>;
export type HrJobPosition = z.infer<typeof hrJobPositionSchema>;
export type HrContractAmendment = z.infer<typeof hrContractAmendmentSchema>;
export type HrEmploymentContract = z.infer<typeof hrEmploymentContractSchema>;
export type HrEmployeeListItem = z.infer<typeof hrEmployeeListItemSchema>;
export type HrEmployeeDetail = z.infer<typeof hrEmployeeDetailSchema>;
export type HrCoreSummary = z.infer<typeof hrCoreSummarySchema>;
