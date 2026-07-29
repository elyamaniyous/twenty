import { z } from 'zod';

import {
  centsSchema,
  civilDateSchema,
  erpRoleSchema,
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

export const hrAccessRoleSchema = z.enum([
  'HR_ADMIN',
  'HR_MANAGER',
  'PAYROLL_MANAGER',
  'HR_VIEWER',
]);
export const hrPopulationScopeSchema = z.enum([
  'ALL',
  'ESTABLISHMENTS',
  'EMPLOYEES',
]);
export const hrFieldPermissionSchema = z.enum([
  'HR_STRUCTURE_WRITE',
  'HR_PRIVATE_READ',
  'HR_PRIVATE_WRITE',
  'HR_BANK_READ',
  'HR_BANK_WRITE',
  'HR_COMPENSATION_READ',
  'HR_CONTRACT_WRITE',
  'HR_DOCUMENT_READ',
  'HR_DOCUMENT_WRITE',
]);
export const hrAssignmentTypeSchema = z.enum([
  'PRIMARY',
  'SECONDARY',
  'TEMPORARY',
]);
export const hrWorkLocationTypeSchema = z.enum([
  'ONSITE',
  'HYBRID',
  'REMOTE',
  'CLIENT_SITE',
]);
export const hrDocumentCategorySchema = z.enum([
  'IDENTITY',
  'SOCIAL_SECURITY',
  'CONTRACT',
  'DIPLOMA',
  'MEDICAL',
  'BANK',
  'LEAVE_SUPPORT',
  'OTHER',
]);
export const hrDocumentStatusSchema = z.enum([
  'MISSING',
  'VALID',
  'EXPIRING',
  'EXPIRED',
]);
export const hrLifecycleTypeSchema = z.enum([
  'HIRING',
  'ONBOARDING',
  'MOBILITY',
  'OFFBOARDING',
]);
export const hrLifecycleStatusSchema = z.enum([
  'ACTIVE',
  'COMPLETED',
  'CANCELLED',
]);
export const hrLifecycleTaskStatusSchema = z.enum([
  'TODO',
  'IN_PROGRESS',
  'COMPLETED',
  'SKIPPED',
]);

export const hrAccessContextSchema = z.object({
  role: hrAccessRoleSchema.nullable(),
  globalRole: erpRoleSchema,
  populationScope: hrPopulationScopeSchema,
  permissions: z.array(hrFieldPermissionSchema),
  establishmentIds: z.array(uuidSchema),
  employeeIds: z.array(uuidSchema),
  isSystemAdministrator: z.boolean(),
  canManageStructure: z.boolean(),
  canReadPrivate: z.boolean(),
  canWritePrivate: z.boolean(),
  canReadBank: z.boolean(),
  canWriteBank: z.boolean(),
  canReadCompensation: z.boolean(),
  canWriteContracts: z.boolean(),
  canReadDocuments: z.boolean(),
  canWriteDocuments: z.boolean(),
  canAdministerAccess: z.boolean(),
});

const hrAccessGrantEstablishmentSchema = z.object({
  establishmentId: uuidSchema,
  establishment: z.object({ code: z.string(), name: z.string() }),
});

const hrAccessGrantEmployeeSchema = z.object({
  employeeId: uuidSchema,
  employee: z.object({
    employeeNumber: z.string(),
    firstName: z.string(),
    lastName: z.string(),
  }),
});

export const hrAccessGrantSchema = z.object({
  id: uuidSchema,
  organisationId: uuidSchema,
  societeId: uuidSchema,
  twentyUserId: z.string(),
  role: hrAccessRoleSchema,
  populationScope: hrPopulationScopeSchema,
  fieldPermissions: z.array(hrFieldPermissionSchema),
  isActive: z.boolean(),
  createdByTwentyUserId: z.string(),
  updatedByTwentyUserId: z.string(),
  createdAt: instantSchema,
  updatedAt: instantSchema,
  establishmentScopes: z.array(hrAccessGrantEstablishmentSchema),
  employeeScopes: z.array(hrAccessGrantEmployeeSchema),
});

export const hrAccessAdministrationSchema = z.object({
  users: z.array(
    z.object({
      twentyUserId: z.string(),
      email: nullableStringSchema,
      role: erpRoleSchema,
      hrAccessGrant: hrAccessGrantSchema.nullable(),
    }),
  ),
});

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

export const hrGradeSchema = z.object({
  id: uuidSchema,
  organisationId: uuidSchema,
  societeId: uuidSchema,
  code: z.string(),
  name: z.string(),
  level: nonNegativeIntegerSchema.nullable(),
  description: nullableStringSchema,
  minSalaryCents: centsSchema.nullable(),
  maxSalaryCents: centsSchema.nullable(),
  isActive: z.boolean(),
  createdAt: instantSchema,
  updatedAt: instantSchema,
  _count: z.object({ jobPositions: nonNegativeIntegerSchema }).optional(),
});
export const hrGradeListSchema = z.array(hrGradeSchema);

export const hrCostCenterSchema = z.object({
  id: uuidSchema,
  organisationId: uuidSchema,
  societeId: uuidSchema,
  code: z.string(),
  name: z.string(),
  description: nullableStringSchema,
  isActive: z.boolean(),
  createdAt: instantSchema,
  updatedAt: instantSchema,
  _count: z.object({ departments: nonNegativeIntegerSchema }).optional(),
});
export const hrCostCenterListSchema = z.array(hrCostCenterSchema);

const hrEstablishmentSummarySchema = z.object({
  id: uuidSchema,
  code: z.string(),
  name: z.string(),
});
const hrDepartmentSummarySchema = z.object({
  id: uuidSchema,
  code: z.string(),
  name: z.string(),
  establishmentId: uuidSchema.nullable().optional(),
});

export const hrTeamSchema = z.object({
  id: uuidSchema,
  organisationId: uuidSchema,
  societeId: uuidSchema,
  departmentId: uuidSchema.nullable(),
  managerEmployeeId: uuidSchema.nullable(),
  code: z.string(),
  name: z.string(),
  description: nullableStringSchema,
  isActive: z.boolean(),
  createdAt: instantSchema,
  updatedAt: instantSchema,
  department: hrDepartmentSummarySchema.nullable().optional(),
  managerEmployee: z
    .object({
      id: uuidSchema,
      employeeNumber: z.string(),
      firstName: z.string(),
      lastName: z.string(),
    })
    .nullable()
    .optional(),
  _count: z
    .object({ employeeAssignments: nonNegativeIntegerSchema })
    .optional(),
});
export const hrTeamListSchema = z.array(hrTeamSchema);

export const hrWorkLocationSchema = z.object({
  id: uuidSchema,
  organisationId: uuidSchema,
  societeId: uuidSchema,
  establishmentId: uuidSchema.nullable(),
  code: z.string(),
  name: z.string(),
  type: hrWorkLocationTypeSchema,
  address: nullableStringSchema,
  city: nullableStringSchema,
  isActive: z.boolean(),
  createdAt: instantSchema,
  updatedAt: instantSchema,
  establishment: hrEstablishmentSummarySchema.nullable().optional(),
  _count: z
    .object({ employeeAssignments: nonNegativeIntegerSchema })
    .optional(),
});
export const hrWorkLocationListSchema = z.array(hrWorkLocationSchema);

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
  costCenterId: uuidSchema.nullable(),
  parentId: uuidSchema.nullable(),
  code: z.string(),
  name: z.string(),
  costCenterCode: nullableStringSchema,
  isActive: z.boolean(),
  createdAt: instantSchema,
  updatedAt: instantSchema,
  establishment: hrEstablishmentSchema.nullable().optional(),
  costCenter: hrCostCenterSchema.nullable().optional(),
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
  gradeId: uuidSchema.nullable(),
  code: z.string(),
  title: z.string(),
  grade: nullableStringSchema,
  description: nullableStringSchema,
  isActive: z.boolean(),
  createdAt: instantSchema,
  updatedAt: instantSchema,
  department: hrDepartmentSummarySchema.nullable().optional(),
  gradeRef: hrGradeSchema.nullable().optional(),
  _count: z
    .object({ employmentContracts: nonNegativeIntegerSchema })
    .optional(),
});
export const hrJobPositionListSchema = z.array(hrJobPositionSchema);

export const hrEmployeeAssignmentSchema = z.object({
  id: uuidSchema,
  organisationId: uuidSchema,
  societeId: uuidSchema,
  employeeId: uuidSchema,
  employmentContractId: uuidSchema.nullable(),
  departmentId: uuidSchema.nullable(),
  jobPositionId: uuidSchema.nullable(),
  teamId: uuidSchema.nullable(),
  workLocationId: uuidSchema.nullable(),
  costCenterId: uuidSchema.nullable(),
  type: hrAssignmentTypeSchema,
  title: nullableStringSchema,
  allocationBasisPoints: nonNegativeIntegerSchema,
  startDate: civilDateHttpSchema,
  endDate: nullableCivilDateHttpSchema,
  endReason: nullableStringSchema,
  createdByTwentyUserId: z.string(),
  endedByTwentyUserId: nullableStringSchema,
  createdAt: instantSchema,
  updatedAt: instantSchema,
  employmentContract: z
    .object({
      id: uuidSchema,
      contractNumber: z.string(),
      status: hrContractStatusSchema,
    })
    .nullable()
    .optional(),
  department: hrDepartmentSummarySchema.nullable().optional(),
  jobPosition: hrJobPositionSummarySchema.nullable().optional(),
  team: z
    .object({ id: uuidSchema, code: z.string(), name: z.string() })
    .nullable()
    .optional(),
  workLocation: z
    .object({
      id: uuidSchema,
      code: z.string(),
      name: z.string(),
      type: hrWorkLocationTypeSchema,
      city: nullableStringSchema,
    })
    .nullable()
    .optional(),
  costCenter: z
    .object({ id: uuidSchema, code: z.string(), name: z.string() })
    .nullable()
    .optional(),
});

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

export const hrEmploymentContractDetailSchema =
  hrEmploymentContractSchema.extend({
    baseSalaryCents: centsSchema.nullable(),
  });

export const hrEmploymentContractSummarySchema = z
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
  })
  .extend(hrContractStructureSchema.shape);

export const hrEmployeeCrmLinkSchema = z.object({
  twentyPersonId: uuidSchema,
  linkedAt: instantSchema,
  lastSyncedAt: instantSchema.nullable(),
});

export const hrCrmPublicFieldSchema = z.enum([
  'firstName',
  'lastName',
  'email',
  'phone',
  'jobTitle',
]);

export const hrEmployeeCrmLinkResultSchema = z.object({
  employeeId: uuidSchema,
  twentyPersonId: uuidSchema.nullable(),
  linkedAt: instantSchema.nullable(),
  lastSyncedAt: instantSchema.nullable(),
  syncedFields: z.array(hrCrmPublicFieldSchema),
  updatedAt: instantSchema,
});

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
  crmLink: hrEmployeeCrmLinkSchema.nullable(),
  employmentContracts: z.array(hrEmploymentContractSummarySchema),
});
export const hrEmployeeListSchema = z.array(hrEmployeeListItemSchema);

const hrOrganisationChartDepartmentSchema = z.object({
  id: uuidSchema,
  code: z.string(),
  name: z.string(),
  parentId: uuidSchema.nullable(),
});

const hrOrganisationChartTeamSchema = z.object({
  id: uuidSchema,
  code: z.string(),
  name: z.string(),
});

export const hrOrganisationChartSchema = z.object({
  generatedAt: instantSchema,
  departments: z.array(
    hrOrganisationChartDepartmentSchema.extend({
      employeeCount: nonNegativeIntegerSchema,
    }),
  ),
  teams: z.array(
    hrOrganisationChartTeamSchema.extend({
      departmentId: uuidSchema.nullable(),
      managerEmployeeId: uuidSchema.nullable(),
      employeeCount: nonNegativeIntegerSchema,
    }),
  ),
  nodes: z.array(
    z.object({
      employeeId: uuidSchema,
      employeeNumber: z.string(),
      firstName: z.string(),
      lastName: z.string(),
      jobTitle: z.string(),
      status: hrEmployeeStatusSchema,
      department: hrOrganisationChartDepartmentSchema.nullable(),
      team: hrOrganisationChartTeamSchema.nullable(),
      managerEmployeeId: uuidSchema.nullable(),
      twentyPersonId: uuidSchema.nullable(),
    }),
  ),
  unassignedCount: nonNegativeIntegerSchema,
});

export const hrEmployeeImportActionSchema = z.enum([
  'CREATE',
  'MIGRATE',
  'BLOCKED',
]);

export const hrEmployeeImportRowSchema = z.object({
  rowNumber: z.number().int().positive(),
  action: hrEmployeeImportActionSchema,
  existingEmployeeId: uuidSchema.nullable(),
  establishmentId: uuidSchema.nullable(),
  departmentId: uuidSchema.nullable(),
  jobPositionId: uuidSchema.nullable(),
  contractNumber: z.string(),
  normalized: z.object({
    employeeNumber: z.string(),
    firstName: z.string(),
    lastName: z.string(),
    cin: nullableStringSchema,
    cnssNumber: nullableStringSchema,
    email: nullableStringSchema,
    phone: nullableStringSchema,
    jobTitle: z.string(),
    departmentName: nullableStringSchema,
    contractType: hrContractTypeSchema.nullable(),
    hireDate: nullableCivilDateHttpSchema,
    contractStartDate: nullableCivilDateHttpSchema,
    contractEndDate: nullableCivilDateHttpSchema,
    probationEndDate: nullableCivilDateHttpSchema,
    baseSalaryCents: centsSchema.nullable(),
    weeklyHoursHundredths: nonNegativeIntegerSchema.nullable(),
    establishmentCode: nullableStringSchema,
    departmentCode: nullableStringSchema,
    jobPositionCode: nullableStringSchema,
  }),
  warnings: z.array(z.string()),
  errors: z.array(z.string()),
});

export const hrEmployeeImportPreviewSchema = z.object({
  fileName: z.string(),
  rows: z.array(hrEmployeeImportRowSchema),
  previewDigest: z.string().regex(/^[a-f0-9]{64}$/),
  readyCount: nonNegativeIntegerSchema,
  errorCount: nonNegativeIntegerSchema,
  createCount: nonNegativeIntegerSchema,
  migrateCount: nonNegativeIntegerSchema,
});

export const hrEmployeeImportTemplateSchema = z.object({
  fileName: z.string(),
  mediaType: z.literal(
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ),
  contentBase64: z.string(),
});

export const hrEmployeeImportCommitResultSchema = z.object({
  previewDigest: z.string().regex(/^[a-f0-9]{64}$/),
  importedCount: nonNegativeIntegerSchema,
  createdCount: nonNegativeIntegerSchema,
  migratedCount: nonNegativeIntegerSchema,
  employeeIds: z.array(uuidSchema),
});

export const hrEmployeePrivateProfileSchema = z.object({
  id: uuidSchema,
  organisationId: uuidSchema,
  societeId: uuidSchema,
  employeeId: uuidSchema,
  birthDate: nullableCivilDateHttpSchema,
  birthPlace: nullableStringSchema,
  nationalityCountryCode: nullableStringSchema,
  gender: nullableStringSchema,
  maritalStatus: nullableStringSchema,
  personalEmail: nullableStringSchema,
  personalPhone: nullableStringSchema,
  addressLine2: nullableStringSchema,
  city: nullableStringSchema,
  postalCode: nullableStringSchema,
  createdAt: instantSchema,
  updatedAt: instantSchema,
});

export const hrEmployeeDependantSchema = z.object({
  id: uuidSchema,
  organisationId: uuidSchema,
  societeId: uuidSchema,
  employeeId: uuidSchema,
  firstName: z.string(),
  lastName: z.string(),
  relationship: z.string(),
  birthDate: nullableCivilDateHttpSchema,
  isTaxDependant: z.boolean(),
  hasDisability: z.boolean(),
  validFrom: civilDateHttpSchema,
  validTo: nullableCivilDateHttpSchema,
  createdAt: instantSchema,
  updatedAt: instantSchema,
});

export const hrEmployeeEmergencyContactSchema = z.object({
  id: uuidSchema,
  organisationId: uuidSchema,
  societeId: uuidSchema,
  employeeId: uuidSchema,
  firstName: z.string(),
  lastName: z.string(),
  relationship: z.string(),
  phone: z.string(),
  email: nullableStringSchema,
  isPrimary: z.boolean(),
  createdAt: instantSchema,
  updatedAt: instantSchema,
});

export const hrEmployeeBankAccountSchema = z.object({
  id: uuidSchema,
  organisationId: uuidSchema,
  societeId: uuidSchema,
  employeeId: uuidSchema,
  bankName: z.string(),
  accountHolderName: z.string(),
  ribLastFour: z.string().regex(/^\d{4}$/),
  maskedRib: z.string(),
  effectiveFrom: civilDateHttpSchema,
  effectiveTo: nullableCivilDateHttpSchema,
  isPrimary: z.boolean(),
  verifiedAt: instantSchema.nullable(),
  verifiedByTwentyUserId: nullableStringSchema,
  createdAt: instantSchema,
  updatedAt: instantSchema,
});

export const hrEmployeeDocumentVersionSchema = z.object({
  id: uuidSchema,
  organisationId: uuidSchema,
  societeId: uuidSchema,
  hrEmployeeDocumentId: uuidSchema,
  version: z.number().int().positive(),
  filename: z.string(),
  mimeType: z.string(),
  sizeBytes: z.number().int().positive(),
  issuedAt: nullableCivilDateHttpSchema,
  expiresAt: nullableCivilDateHttpSchema,
  notes: nullableStringSchema,
  uploadedByTwentyUserId: z.string(),
  createdAt: instantSchema,
});

export const hrEmployeeDocumentSchema = z.object({
  id: uuidSchema,
  organisationId: uuidSchema,
  societeId: uuidSchema,
  employeeId: uuidSchema,
  category: hrDocumentCategorySchema,
  title: z.string(),
  isRequired: z.boolean(),
  reminderDays: nonNegativeIntegerSchema,
  isActive: z.boolean(),
  createdByTwentyUserId: z.string(),
  createdAt: instantSchema,
  updatedAt: instantSchema,
  versions: z.array(hrEmployeeDocumentVersionSchema),
  latestVersion: hrEmployeeDocumentVersionSchema.nullable(),
  versionCount: nonNegativeIntegerSchema,
  status: hrDocumentStatusSchema,
  daysUntilExpiry: z.number().int().nullable(),
});

export const hrDocumentContentSchema = z.object({
  filename: z.string(),
  mimeType: z.string(),
  contentBase64: z.string(),
});

export const hrDeadlineItemSchema = z.object({
  id: z.string(),
  kind: z.enum(['DOCUMENT', 'CONTRACT_END', 'PROBATION_END']),
  severity: z.enum(['MISSING', 'UPCOMING', 'OVERDUE']),
  title: z.string(),
  dueDate: nullableCivilDateHttpSchema,
  daysUntilDue: z.number().int().nullable(),
  employee: z.object({
    id: uuidSchema,
    employeeNumber: z.string(),
    firstName: z.string(),
    lastName: z.string(),
  }),
  documentId: uuidSchema.nullable(),
  contractId: uuidSchema.nullable(),
});

export const hrDeadlineCenterSchema = z.object({
  generatedAt: instantSchema,
  items: z.array(hrDeadlineItemSchema),
});

export const hrLifecycleTaskSchema = z.object({
  id: uuidSchema,
  organisationId: uuidSchema,
  societeId: uuidSchema,
  journeyId: uuidSchema,
  code: z.string(),
  title: z.string(),
  description: nullableStringSchema,
  sortOrder: z.number().int().positive(),
  status: hrLifecycleTaskStatusSchema,
  dueDate: nullableCivilDateHttpSchema,
  assigneeTwentyUserId: nullableStringSchema,
  completedAt: instantSchema.nullable(),
  completedByTwentyUserId: nullableStringSchema,
  createdAt: instantSchema,
  updatedAt: instantSchema,
});

export const hrLifecycleJourneyBaseSchema = z.object({
  id: uuidSchema,
  organisationId: uuidSchema,
  societeId: uuidSchema,
  employeeId: uuidSchema,
  type: hrLifecycleTypeSchema,
  status: hrLifecycleStatusSchema,
  title: z.string(),
  startDate: civilDateHttpSchema,
  targetDate: nullableCivilDateHttpSchema,
  notes: nullableStringSchema,
  createdByTwentyUserId: z.string(),
  completedAt: instantSchema.nullable(),
  completedByTwentyUserId: nullableStringSchema,
  cancelledAt: instantSchema.nullable(),
  cancelledByTwentyUserId: nullableStringSchema,
  cancellationReason: nullableStringSchema,
  createdAt: instantSchema,
  updatedAt: instantSchema,
  tasks: z.array(hrLifecycleTaskSchema),
});

export const hrLifecycleJourneySchema = hrLifecycleJourneyBaseSchema.extend({
  employee: z.object({
    id: uuidSchema,
    employeeNumber: z.string(),
    firstName: z.string(),
    lastName: z.string(),
    jobTitle: z.string(),
    status: hrEmployeeStatusSchema,
  }),
});
export const hrLifecycleJourneyListSchema = z.array(hrLifecycleJourneySchema);

export const hrEmployeeLeaveRequestSchema = z.object({
  id: uuidSchema,
  type: z.enum(['ANNUAL', 'SICK', 'MATERNITY', 'PATERNITY', 'UNPAID', 'OTHER']),
  status: z.enum(['REQUESTED', 'APPROVED', 'REJECTED', 'CANCELLED']),
  startDate: civilDateHttpSchema,
  endDate: civilDateHttpSchema,
  workingDays: z.number().finite().nonnegative(),
  createdAt: instantSchema,
});

export const hrEmployeeLeaveBalanceSchema = z.object({
  id: uuidSchema,
  year: nonNegativeIntegerSchema,
  entitledDays: z.number().finite().nonnegative(),
  carriedDays: z.number().finite(),
  adjustmentDays: z.number().finite(),
  consumedDays: z.number().finite().nonnegative(),
  availableDays: z.number().finite(),
  updatedAt: instantSchema,
});

export const hrEmployeePayslipSummarySchema = z.object({
  id: uuidSchema,
  periodKey: z.string(),
  periodStart: civilDateHttpSchema,
  periodEnd: civilDateHttpSchema,
  status: z.enum(['DRAFT', 'VALIDATED', 'PAID', 'CANCELLED']),
  grossSalaryCents: centsSchema,
  netSalaryCents: centsSchema,
  paidAt: instantSchema.nullable(),
  createdAt: instantSchema,
});

export const hrEmployeeHistoryEventSchema = z.object({
  id: uuidSchema,
  action: z.string(),
  actorTwentyUserId: nullableStringSchema,
  createdAt: instantSchema,
});

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
  baseSalaryCents: centsSchema.nullable(),
  familyDependants: nonNegativeIntegerSchema,
  createdAt: instantSchema,
  updatedAt: instantSchema,
  crmLink: hrEmployeeCrmLinkSchema.nullable(),
  privateProfile: hrEmployeePrivateProfileSchema.nullable(),
  dependants: z.array(hrEmployeeDependantSchema),
  emergencyContacts: z.array(hrEmployeeEmergencyContactSchema),
  bankAccounts: z.array(hrEmployeeBankAccountSchema),
  assignments: z.array(hrEmployeeAssignmentSchema),
  hrDocuments: z.array(hrEmployeeDocumentSchema),
  hrLifecycleJourneys: z.array(hrLifecycleJourneyBaseSchema),
  leaveRequests: z.array(hrEmployeeLeaveRequestSchema),
  leaveBalances: z.array(hrEmployeeLeaveBalanceSchema),
  payslips: z.array(hrEmployeePayslipSummarySchema),
  history: z.array(hrEmployeeHistoryEventSchema),
  employmentContracts: z.array(hrEmploymentContractDetailSchema),
  access: hrAccessContextSchema,
});

export const hrCoreSummarySchema = z.object({
  activeEmployees: nonNegativeIntegerSchema,
  establishments: nonNegativeIntegerSchema,
  grades: nonNegativeIntegerSchema,
  costCenters: nonNegativeIntegerSchema,
  departments: nonNegativeIntegerSchema,
  jobPositions: nonNegativeIntegerSchema,
  activeContracts: nonNegativeIntegerSchema,
  draftAmendments: nonNegativeIntegerSchema,
  activeJourneys: nonNegativeIntegerSchema,
});

export type HrEmployeeStatus = z.infer<typeof hrEmployeeStatusSchema>;
export type HrContractType = z.infer<typeof hrContractTypeSchema>;
export type HrContractStatus = z.infer<typeof hrContractStatusSchema>;
export type HrAmendmentStatus = z.infer<typeof hrAmendmentStatusSchema>;
export type HrAccessRole = z.infer<typeof hrAccessRoleSchema>;
export type HrPopulationScope = z.infer<typeof hrPopulationScopeSchema>;
export type HrFieldPermission = z.infer<typeof hrFieldPermissionSchema>;
export type HrAssignmentType = z.infer<typeof hrAssignmentTypeSchema>;
export type HrWorkLocationType = z.infer<typeof hrWorkLocationTypeSchema>;
export type HrDocumentCategory = z.infer<typeof hrDocumentCategorySchema>;
export type HrDocumentStatus = z.infer<typeof hrDocumentStatusSchema>;
export type HrLifecycleType = z.infer<typeof hrLifecycleTypeSchema>;
export type HrLifecycleStatus = z.infer<typeof hrLifecycleStatusSchema>;
export type HrLifecycleTaskStatus = z.infer<typeof hrLifecycleTaskStatusSchema>;
export type HrAccessContext = z.infer<typeof hrAccessContextSchema>;
export type HrAccessGrant = z.infer<typeof hrAccessGrantSchema>;
export type HrAccessAdministration = z.infer<
  typeof hrAccessAdministrationSchema
>;
export type HrEstablishment = z.infer<typeof hrEstablishmentSchema>;
export type HrGrade = z.infer<typeof hrGradeSchema>;
export type HrCostCenter = z.infer<typeof hrCostCenterSchema>;
export type HrTeam = z.infer<typeof hrTeamSchema>;
export type HrWorkLocation = z.infer<typeof hrWorkLocationSchema>;
export type HrEmployeeAssignment = z.infer<typeof hrEmployeeAssignmentSchema>;
export type HrDepartment = z.infer<typeof hrDepartmentSchema>;
export type HrJobPosition = z.infer<typeof hrJobPositionSchema>;
export type HrContractAmendment = z.infer<typeof hrContractAmendmentSchema>;
export type HrEmploymentContract = z.infer<
  typeof hrEmploymentContractDetailSchema
>;
export type HrEmployeeCrmLink = z.infer<typeof hrEmployeeCrmLinkSchema>;
export type HrCrmPublicField = z.infer<typeof hrCrmPublicFieldSchema>;
export type HrEmployeeCrmLinkResult = z.infer<
  typeof hrEmployeeCrmLinkResultSchema
>;
export type HrOrganisationChart = z.infer<typeof hrOrganisationChartSchema>;
export type HrEmployeeListItem = z.infer<typeof hrEmployeeListItemSchema>;
export type HrEmployeeImportAction = z.infer<
  typeof hrEmployeeImportActionSchema
>;
export type HrEmployeeImportRow = z.infer<typeof hrEmployeeImportRowSchema>;
export type HrEmployeeImportPreview = z.infer<
  typeof hrEmployeeImportPreviewSchema
>;
export type HrEmployeeImportTemplate = z.infer<
  typeof hrEmployeeImportTemplateSchema
>;
export type HrEmployeeImportCommitResult = z.infer<
  typeof hrEmployeeImportCommitResultSchema
>;
export type HrEmployeePrivateProfile = z.infer<
  typeof hrEmployeePrivateProfileSchema
>;
export type HrEmployeeDependant = z.infer<typeof hrEmployeeDependantSchema>;
export type HrEmployeeEmergencyContact = z.infer<
  typeof hrEmployeeEmergencyContactSchema
>;
export type HrEmployeeBankAccount = z.infer<typeof hrEmployeeBankAccountSchema>;
export type HrEmployeeDocumentVersion = z.infer<
  typeof hrEmployeeDocumentVersionSchema
>;
export type HrEmployeeDocument = z.infer<typeof hrEmployeeDocumentSchema>;
export type HrDeadlineItem = z.infer<typeof hrDeadlineItemSchema>;
export type HrDeadlineCenter = z.infer<typeof hrDeadlineCenterSchema>;
export type HrLifecycleTask = z.infer<typeof hrLifecycleTaskSchema>;
export type HrLifecycleJourneyBase = z.infer<
  typeof hrLifecycleJourneyBaseSchema
>;
export type HrLifecycleJourney = z.infer<typeof hrLifecycleJourneySchema>;
export type HrEmployeeLeaveRequest = z.infer<
  typeof hrEmployeeLeaveRequestSchema
>;
export type HrEmployeeLeaveBalance = z.infer<
  typeof hrEmployeeLeaveBalanceSchema
>;
export type HrEmployeePayslipSummary = z.infer<
  typeof hrEmployeePayslipSummarySchema
>;
export type HrEmployeeHistoryEvent = z.infer<
  typeof hrEmployeeHistoryEventSchema
>;
export type HrEmployeeDetail = z.infer<typeof hrEmployeeDetailSchema>;
export type HrCoreSummary = z.infer<typeof hrCoreSummarySchema>;
