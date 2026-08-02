import { z } from 'zod';

import {
  centsSchema,
  civilDateSchema,
  erpRoleSchema,
  instantSchema,
  nullableInstantSchema,
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
  'HR_TIME_READ',
  'HR_TIME_WRITE',
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
export const hrTimeEntryTypeSchema = z.enum([
  'CLOCK_IN',
  'CLOCK_OUT',
  'BREAK_START',
  'BREAK_END',
]);
export const hrTimeEntrySourceSchema = z.enum([
  'MANUAL',
  'IMPORT',
  'DEVICE',
  'API',
]);
export const hrTimeEntryStatusSchema = z.enum(['ACTIVE', 'CANCELLED']);
export const hrTimeWorkModeSchema = z.enum(['ONSITE', 'REMOTE', 'CLIENT_SITE']);
export const hrOvertimeCategorySchema = z.enum([
  'DAY',
  'NIGHT',
  'REST_DAY',
  'HOLIDAY',
]);
export const hrOvertimeSettlementSchema = z.enum([
  'PAY',
  'COMPENSATORY_REST',
  'SPLIT',
]);
export const hrOvertimeApprovalStatusSchema = z.enum([
  'REQUESTED',
  'MANAGER_APPROVED',
  'APPROVED',
  'REJECTED',
]);
export const hrCompensatoryRestMovementTypeSchema = z.enum([
  'EARNED',
  'CONSUMED',
  'EXPIRED',
]);
export const hrTimeEntryCorrectionActionSchema = z.enum([
  'ADD',
  'REPLACE',
  'CANCEL',
]);
export const hrTimeEntryCorrectionStatusSchema = z.enum([
  'REQUESTED',
  'MANAGER_APPROVED',
  'APPROVED',
  'REJECTED',
]);
export const hrCalendarDayTypeSchema = z.enum([
  'NATIONAL_HOLIDAY',
  'RELIGIOUS_HOLIDAY',
  'COMPANY_CLOSURE',
  'WORKING_EXCEPTION',
]);
export const hrWorkPatternTypeSchema = z.enum([
  'WORK_SCHEDULE',
  'SHIFT_ROTATION',
]);
export const hrWorkPatternChangeStatusSchema = z.enum([
  'PENDING',
  'APPROVED',
  'REJECTED',
]);
export const hrAttendanceDayStatusSchema = z.enum([
  'PLANNED',
  'PRESENT',
  'LATE',
  'ABSENT',
  'ON_LEAVE',
  'HOLIDAY',
  'ANOMALY',
  'UNSCHEDULED',
]);
export const hrBreastfeedingArrangementStatusSchema = z.enum([
  'ACTIVE',
  'ENDED',
]);
export const hrLeaveTypeSchema = z.enum([
  'ANNUAL',
  'SICK',
  'MATERNITY',
  'PATERNITY',
  'BIRTH',
  'MARRIAGE',
  'BEREAVEMENT',
  'UNPAID',
  'OTHER',
]);
export const hrLeaveRequestStatusSchema = z.enum([
  'REQUESTED',
  'MANAGER_APPROVED',
  'APPROVED',
  'REJECTED',
  'CANCELLED',
]);
export const hrLeaveBalanceMovementTypeSchema = z.enum([
  'ACCRUAL',
  'SENIORITY',
  'CARRYOVER',
  'ADJUSTMENT',
]);
export const hrMonthlyPeriodStatusSchema = z.enum([
  'OPEN',
  'IN_REVIEW',
  'FROZEN',
  'TRANSMITTED',
]);
export const hrPayrollVariableKindSchema = z.enum([
  'WORKED_MINUTES',
  'OVERTIME_MINUTES',
  'LATE_MINUTES',
  'ABSENCE_DAYS',
  'PAID_LEAVE_DAYS',
  'UNPAID_LEAVE_DAYS',
]);
export const hrPayrollVariableUnitSchema = z.enum(['MINUTES', 'DAYS']);

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
  canApprovePayroll: z.boolean(),
  canWriteContracts: z.boolean(),
  canReadDocuments: z.boolean(),
  canWriteDocuments: z.boolean(),
  canReadTime: z.boolean(),
  canWriteTime: z.boolean(),
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

export const hrEmployeeSelfServiceAccessSchema = z.object({
  id: uuidSchema,
  organisationId: uuidSchema,
  societeId: uuidSchema,
  twentyUserId: z.string(),
  employeeId: uuidSchema,
  isActive: z.boolean(),
  createdByTwentyUserId: z.string(),
  updatedByTwentyUserId: z.string(),
  createdAt: instantSchema,
  updatedAt: instantSchema,
  employee: z.object({
    employeeNumber: z.string(),
    firstName: z.string(),
    lastName: z.string(),
    status: hrEmployeeStatusSchema,
  }),
});

export const hrAccessAdministrationSchema = z.object({
  users: z.array(
    z.object({
      twentyUserId: z.string(),
      email: nullableStringSchema,
      role: erpRoleSchema,
      hrAccessGrant: hrAccessGrantSchema.nullable(),
      hrEmployeeSelfServiceAccess: hrEmployeeSelfServiceAccessSchema.nullable(),
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
  type: hrLeaveTypeSchema,
  status: hrLeaveRequestStatusSchema,
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

export const hrLeavePolicySchema = z
  .object({
    id: uuidSchema,
    organisationId: uuidSchema,
    societeId: uuidSchema,
    code: z.string(),
    name: z.string(),
    type: hrLeaveTypeSchema,
    isPaid: z.boolean(),
    deductsAnnualBalance: z.boolean(),
    adultMonthlyAccrualDays: z.number().finite().nonnegative(),
    minorMonthlyAccrualDays: z.number().finite().nonnegative(),
    eligibilityMonths: nonNegativeIntegerSchema,
    seniorityStepYears: nonNegativeIntegerSchema,
    seniorityBonusDays: z.number().finite().nonnegative(),
    annualCapDays: z.number().finite().nonnegative().nullable(),
    maximumWorkingDays: z.number().finite().positive().nullable(),
    paidWorkingDaysLimit: z.number().finite().nonnegative().nullable(),
    minimumNoticeDays: nonNegativeIntegerSchema,
    evidenceRequiredAfterDays: z.number().finite().nonnegative().nullable(),
    managerApprovalRequired: z.boolean(),
    hrApprovalRequired: z.boolean(),
    allowNegativeBalance: z.boolean(),
    eventDateRequired: z.boolean(),
    eventWindowDays: z.number().int().min(1).max(366).nullable(),
    allowFractionation: z.boolean(),
    maximumEventSegments: z.number().int().min(1).max(100).nullable(),
    isActive: z.boolean(),
    sourceReference: nullableStringSchema,
    createdByTwentyUserId: z.string(),
    createdAt: instantSchema,
    updatedAt: instantSchema,
    _count: z.object({ requests: nonNegativeIntegerSchema }).optional(),
  })
  .superRefine((policy, context) => {
    if (policy.eventWindowDays !== null && !policy.eventDateRequired) {
      context.addIssue({
        code: 'custom',
        message: 'An event window requires an event date',
        path: ['eventWindowDays'],
      });
    }
    if (policy.allowFractionation && !policy.eventDateRequired) {
      context.addIssue({
        code: 'custom',
        message: 'Fractionation requires an event date',
        path: ['allowFractionation'],
      });
    }
    if (policy.maximumEventSegments !== null && !policy.allowFractionation) {
      context.addIssue({
        code: 'custom',
        message: 'A segment limit requires fractionation',
        path: ['maximumEventSegments'],
      });
    }
  });
export const hrLeavePolicyListSchema = z.array(hrLeavePolicySchema);

const hrLeaveEmployeeSummarySchema = z.object({
  id: uuidSchema,
  employeeNumber: z.string(),
  firstName: z.string(),
  lastName: z.string(),
});

const hrLeaveSupportingDocumentSchema = z.object({
  id: uuidSchema,
  title: z.string(),
  category: hrDocumentCategorySchema,
  versions: z.array(
    z.object({
      id: uuidSchema,
      filename: z.string(),
      createdAt: instantSchema,
    }),
  ),
});

export const hrLeaveRequestSchema = z.object({
  id: uuidSchema,
  organisationId: uuidSchema,
  societeId: uuidSchema,
  employeeId: uuidSchema,
  delegateEmployeeId: uuidSchema.nullable(),
  policyId: uuidSchema.nullable(),
  supportingDocumentId: uuidSchema.nullable(),
  type: hrLeaveTypeSchema,
  status: hrLeaveRequestStatusSchema,
  startDate: civilDateHttpSchema,
  endDate: civilDateHttpSchema,
  eventDate: civilDateHttpSchema.nullable(),
  eventReference: nullableStringSchema,
  workingDays: z.number().finite().nonnegative(),
  evidenceRequired: z.boolean(),
  reason: nullableStringSchema,
  requestedByTwentyUserId: nullableStringSchema,
  managerApprovedAt: instantSchema.nullable(),
  managerApprovedByTwentyUserId: nullableStringSchema,
  decidedAt: instantSchema.nullable(),
  decidedByTwentyUserId: nullableStringSchema,
  decisionReason: nullableStringSchema,
  createdAt: instantSchema,
  updatedAt: instantSchema,
  employee: hrLeaveEmployeeSummarySchema,
  delegateEmployee: hrLeaveEmployeeSummarySchema.nullable(),
  policy: hrLeavePolicySchema.nullable(),
  supportingDocument: hrLeaveSupportingDocumentSchema.nullable(),
});
export const hrLeaveRequestListSchema = z.array(hrLeaveRequestSchema);

export const hrBreastfeedingArrangementSchema = z
  .object({
    id: uuidSchema,
    organisationId: uuidSchema,
    societeId: uuidSchema,
    employeeId: uuidSchema,
    resumedWorkDate: civilDateHttpSchema,
    legalEndDate: civilDateHttpSchema,
    morningMinutes: z.number().int().min(0).max(60),
    afternoonMinutes: z.number().int().min(0).max(60),
    flexibleUse: z.boolean(),
    status: hrBreastfeedingArrangementStatusSchema,
    notes: nullableStringSchema,
    sourceReference: z.string(),
    createdByTwentyUserId: z.string(),
    updatedByTwentyUserId: z.string(),
    endedAt: instantSchema.nullable(),
    endedByTwentyUserId: nullableStringSchema,
    endReason: nullableStringSchema,
    createdAt: instantSchema,
    updatedAt: instantSchema,
    employee: hrLeaveEmployeeSummarySchema,
  })
  .superRefine((arrangement, context) => {
    if (arrangement.morningMinutes + arrangement.afternoonMinutes !== 60) {
      context.addIssue({
        code: 'custom',
        message: 'Daily paid rest must total 60 minutes',
        path: ['afternoonMinutes'],
      });
    }
    if (arrangement.legalEndDate < arrangement.resumedWorkDate) {
      context.addIssue({
        code: 'custom',
        message: 'Legal end date cannot precede return to work',
        path: ['legalEndDate'],
      });
    }
    const hasAnyEndMetadata =
      arrangement.endedAt !== null ||
      arrangement.endedByTwentyUserId !== null ||
      arrangement.endReason !== null;
    const hasAllEndMetadata =
      arrangement.endedAt !== null &&
      arrangement.endedByTwentyUserId !== null &&
      arrangement.endReason !== null;
    if (
      (arrangement.status === 'ACTIVE' && hasAnyEndMetadata) ||
      (arrangement.status === 'ENDED' && !hasAllEndMetadata)
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Arrangement status and end metadata are inconsistent',
        path: ['status'],
      });
    }
  });
export const hrBreastfeedingArrangementListSchema = z.array(
  hrBreastfeedingArrangementSchema,
);

export const hrLeaveBalanceMovementSchema = z.object({
  id: uuidSchema,
  organisationId: uuidSchema,
  societeId: uuidSchema,
  employeeId: uuidSchema,
  policyId: uuidSchema,
  year: z.number().int().min(2000).max(2200),
  type: hrLeaveBalanceMovementTypeSchema,
  days: z.number().finite(),
  effectiveDate: civilDateHttpSchema,
  periodKey: z.string(),
  reason: z.string(),
  createdByTwentyUserId: z.string(),
  createdAt: instantSchema,
});

export const hrLeaveBalanceSchema = z.object({
  id: uuidSchema.nullable(),
  employee: hrLeaveEmployeeSummarySchema,
  year: z.number().int().min(2000).max(2200),
  entitledDays: z.number().finite(),
  carriedDays: z.number().finite(),
  adjustmentDays: z.number().finite(),
  consumedDays: z.number().finite().nonnegative(),
  pendingDays: z.number().finite().nonnegative(),
  availableDays: z.number().finite(),
  movements: z.array(hrLeaveBalanceMovementSchema),
});
export const hrLeaveBalanceListSchema = z.array(hrLeaveBalanceSchema);

export const hrLeavePolicySeedResultSchema = z.object({
  createdCount: nonNegativeIntegerSchema,
  policies: hrLeavePolicyListSchema,
});

export const hrLeaveAccrualRunResultSchema = z.object({
  year: z.number().int().min(2000).max(2200),
  asOfDate: civilDateHttpSchema,
  employeeCount: nonNegativeIntegerSchema,
  createdMovementCount: nonNegativeIntegerSchema,
  balances: hrLeaveBalanceListSchema,
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

const hrEmployeeSelfServiceDocumentSchema = z.object({
  id: uuidSchema,
  category: hrDocumentCategorySchema,
  title: z.string(),
  isRequired: z.boolean(),
  status: hrDocumentStatusSchema,
  daysUntilExpiry: z.number().int().nullable(),
  latestVersion: z
    .object({
      id: uuidSchema,
      version: z.number().int().positive(),
      filename: z.string(),
      mimeType: z.string(),
      sizeBytes: z.number().int().positive(),
      issuedAt: nullableCivilDateHttpSchema,
      expiresAt: nullableCivilDateHttpSchema,
      createdAt: instantSchema,
    })
    .nullable(),
});

const hrEmployeeSelfServiceLeaveRequestSchema = z.object({
  id: uuidSchema,
  type: hrLeaveTypeSchema,
  status: hrLeaveRequestStatusSchema,
  startDate: civilDateHttpSchema,
  endDate: civilDateHttpSchema,
  workingDays: z.number().finite().nonnegative(),
  reason: nullableStringSchema,
  evidenceRequired: z.boolean(),
  decisionReason: nullableStringSchema,
  createdAt: instantSchema,
  updatedAt: instantSchema,
});

const hrEmployeeSelfServiceTimeCorrectionSchema = z.object({
  id: uuidSchema,
  action: hrTimeEntryCorrectionActionSchema,
  targetAttendanceDate: civilDateHttpSchema,
  proposedType: hrTimeEntryTypeSchema.nullable(),
  proposedOccurredAt: instantSchema.nullable(),
  reason: z.string(),
  status: hrTimeEntryCorrectionStatusSchema,
  evidenceRequired: z.boolean(),
  decisionReason: nullableStringSchema,
  requestedAt: instantSchema,
  updatedAt: instantSchema,
});

const hrEmployeeSelfServiceTimeEntrySchema = z.object({
  id: uuidSchema,
  type: hrTimeEntryTypeSchema,
  workMode: hrTimeWorkModeSchema,
  occurredAt: instantSchema,
  localDate: civilDateHttpSchema,
  attendanceDate: civilDateHttpSchema,
  notes: nullableStringSchema,
});

const hrEmployeeSelfServiceLeaveBalanceSchema = z.object({
  id: uuidSchema,
  year: z.number().int().min(2000).max(2200),
  entitledDays: z.number().finite(),
  carriedDays: z.number().finite(),
  adjustmentDays: z.number().finite(),
  consumedDays: z.number().finite().nonnegative(),
  pendingDays: z.number().finite().nonnegative(),
  availableDays: z.number().finite(),
  updatedAt: instantSchema,
});

const hrEmployeeSelfServiceOrganisationUnitSchema = z.object({
  id: uuidSchema,
  code: z.string(),
  name: z.string(),
});

export const hrEmployeeSelfServiceSchema = z.object({
  access: z.object({ id: uuidSchema, isActive: z.literal(true) }),
  employee: z.object({
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
  }),
  currentContract: z
    .object({
      id: uuidSchema,
      contractNumber: z.string(),
      contractType: hrContractTypeSchema,
      status: hrContractStatusSchema,
      startDate: civilDateHttpSchema,
      endDate: nullableCivilDateHttpSchema,
      probationEndDate: nullableCivilDateHttpSchema,
      jobTitleSnapshot: z.string(),
      weeklyHoursHundredths: nonNegativeIntegerSchema,
      establishment: hrEmployeeSelfServiceOrganisationUnitSchema.nullable(),
      department: hrEmployeeSelfServiceOrganisationUnitSchema.nullable(),
      jobPosition: z
        .object({ id: uuidSchema, code: z.string(), title: z.string() })
        .nullable(),
    })
    .nullable(),
  currentAssignment: z
    .object({
      id: uuidSchema,
      isPrimary: z.boolean(),
      startDate: civilDateHttpSchema,
      department: hrEmployeeSelfServiceOrganisationUnitSchema.nullable(),
      jobPosition: z
        .object({ id: uuidSchema, code: z.string(), title: z.string() })
        .nullable(),
      team: hrEmployeeSelfServiceOrganisationUnitSchema.nullable(),
      workLocation: z
        .object({
          id: uuidSchema,
          code: z.string(),
          name: z.string(),
          type: hrWorkLocationTypeSchema,
          city: nullableStringSchema,
        })
        .nullable(),
    })
    .nullable(),
  bankAccount: hrEmployeeBankAccountSchema.nullable(),
  documents: z.array(hrEmployeeSelfServiceDocumentSchema),
  leavePolicies: z.array(hrLeavePolicySchema),
  leaveBalances: z.array(hrEmployeeSelfServiceLeaveBalanceSchema),
  leaveRequests: z.array(hrEmployeeSelfServiceLeaveRequestSchema),
  payslips: z.array(hrEmployeePayslipSummarySchema),
  timeEntries: z.array(hrEmployeeSelfServiceTimeEntrySchema),
  timeCorrectionRequests: z.array(hrEmployeeSelfServiceTimeCorrectionSchema),
});

export const hrEmployeeSelfServicePayslipDocumentSchema = z.object({
  filename: z.string(),
  contentType: z.literal('application/pdf'),
  contentBase64: z.string(),
});

export const hrCalendarDaySchema = z.object({
  id: uuidSchema,
  organisationId: uuidSchema,
  societeId: uuidSchema,
  workCalendarId: uuidSchema,
  date: civilDateHttpSchema,
  name: z.string(),
  type: hrCalendarDayTypeSchema,
  isWorkingDay: z.boolean(),
  isConfirmed: z.boolean(),
  startMinute: z.number().int().min(0).max(1439).nullable(),
  endMinute: z.number().int().min(1).max(1440).nullable(),
  breakMinutes: z.number().int().min(0).max(1439),
  sourceUrl: nullableStringSchema,
  notes: nullableStringSchema,
  createdByTwentyUserId: z.string(),
  confirmedByTwentyUserId: nullableStringSchema,
  confirmedAt: instantSchema.nullable(),
  createdAt: instantSchema,
  updatedAt: instantSchema,
});

export const hrWorkCalendarSchema = z.object({
  id: uuidSchema,
  organisationId: uuidSchema,
  societeId: uuidSchema,
  teamId: uuidSchema.nullable(),
  code: z.string(),
  name: z.string(),
  timezone: z.string(),
  isActive: z.boolean(),
  createdByTwentyUserId: z.string(),
  createdAt: instantSchema,
  updatedAt: instantSchema,
  team: z
    .object({ id: uuidSchema, code: z.string(), name: z.string() })
    .nullable()
    .optional(),
  days: z.array(hrCalendarDaySchema),
});
export const hrWorkCalendarListSchema = z.array(hrWorkCalendarSchema);

export const hrMoroccoHolidaySeedResultSchema = z.object({
  year: z.number().int().min(2000).max(2100),
  createdCount: nonNegativeIntegerSchema,
  days: z.array(hrCalendarDaySchema),
});

export const hrWorkScheduleDaySchema = z.object({
  id: uuidSchema,
  organisationId: uuidSchema,
  societeId: uuidSchema,
  workScheduleId: uuidSchema,
  weekday: z.number().int().min(1).max(7),
  isWorkingDay: z.boolean(),
  startMinute: z.number().int().min(0).max(1439).nullable(),
  endMinute: z.number().int().min(1).max(1440).nullable(),
  endsNextDay: z.boolean(),
  breakMinutes: z.number().int().min(0).max(1439),
  createdAt: instantSchema,
  updatedAt: instantSchema,
});

export const hrWorkScheduleSchema = z.object({
  id: uuidSchema,
  organisationId: uuidSchema,
  societeId: uuidSchema,
  code: z.string(),
  name: z.string(),
  timezone: z.string(),
  lateToleranceMinutes: z.number().int().min(0),
  isActive: z.boolean(),
  createdByTwentyUserId: z.string(),
  createdAt: instantSchema,
  updatedAt: instantSchema,
  days: z.array(hrWorkScheduleDaySchema),
  _count: z.object({ assignments: nonNegativeIntegerSchema }).optional(),
});
export const hrWorkScheduleListSchema = z.array(hrWorkScheduleSchema);

export const hrShiftRotationDaySchema = z.object({
  id: uuidSchema,
  organisationId: uuidSchema,
  societeId: uuidSchema,
  rotationId: uuidSchema,
  dayOffset: z.number().int().min(0).max(59),
  label: nullableStringSchema,
  isWorkingDay: z.boolean(),
  startMinute: z.number().int().min(0).max(1439).nullable(),
  endMinute: z.number().int().min(1).max(1440).nullable(),
  endsNextDay: z.boolean(),
  breakMinutes: z.number().int().min(0).max(1439),
  createdAt: instantSchema,
  updatedAt: instantSchema,
});

export const hrShiftRotationSchema = z.object({
  id: uuidSchema,
  organisationId: uuidSchema,
  societeId: uuidSchema,
  code: z.string(),
  name: z.string(),
  timezone: z.string(),
  cycleLengthDays: z.number().int().min(1).max(60),
  lateToleranceMinutes: z.number().int().min(0).max(180),
  isActive: z.boolean(),
  createdByTwentyUserId: z.string(),
  createdAt: instantSchema,
  updatedAt: instantSchema,
  days: z.array(hrShiftRotationDaySchema),
  _count: z.object({ assignments: nonNegativeIntegerSchema }).optional(),
});
export const hrShiftRotationListSchema = z.array(hrShiftRotationSchema);

export const hrShiftRotationAssignmentSchema = z.object({
  id: uuidSchema,
  organisationId: uuidSchema,
  societeId: uuidSchema,
  employeeId: uuidSchema,
  rotationId: uuidSchema,
  validFrom: civilDateHttpSchema,
  validTo: nullableCivilDateHttpSchema,
  startOffset: z.number().int().min(0).max(59),
  createdByTwentyUserId: z.string(),
  createdAt: instantSchema,
  updatedAt: instantSchema,
  rotation: hrShiftRotationSchema,
});

export const hrWorkScheduleAssignmentSchema = z.object({
  id: uuidSchema,
  organisationId: uuidSchema,
  societeId: uuidSchema,
  employeeId: uuidSchema,
  workScheduleId: uuidSchema,
  validFrom: civilDateHttpSchema,
  validTo: nullableCivilDateHttpSchema,
  createdByTwentyUserId: z.string(),
  createdAt: instantSchema,
  updatedAt: instantSchema,
  workSchedule: hrWorkScheduleSchema,
});

export const hrWorkPatternChangeRequestSchema = z
  .object({
    id: uuidSchema,
    organisationId: uuidSchema,
    societeId: uuidSchema,
    employeeId: uuidSchema,
    patternType: hrWorkPatternTypeSchema,
    workScheduleId: uuidSchema.nullable(),
    rotationId: uuidSchema.nullable(),
    effectiveFrom: civilDateHttpSchema,
    startOffset: z.number().int().min(0).max(59),
    reason: z.string(),
    status: hrWorkPatternChangeStatusSchema,
    requestedByTwentyUserId: z.string(),
    requestedAt: instantSchema,
    reviewedByTwentyUserId: nullableStringSchema,
    reviewedAt: instantSchema.nullable(),
    reviewNote: nullableStringSchema,
    appliedWorkScheduleAssignmentId: uuidSchema.nullable(),
    appliedShiftRotationAssignmentId: uuidSchema.nullable(),
    createdAt: instantSchema,
    updatedAt: instantSchema,
    employee: hrLeaveEmployeeSummarySchema,
    workSchedule: hrWorkScheduleSchema.nullable(),
    rotation: hrShiftRotationSchema.nullable(),
  })
  .superRefine((request, context) => {
    const targetsSchedule =
      request.patternType === 'WORK_SCHEDULE' &&
      request.workScheduleId !== null &&
      request.workSchedule !== null &&
      request.rotationId === null &&
      request.rotation === null &&
      request.startOffset === 0;
    const targetsRotation =
      request.patternType === 'SHIFT_ROTATION' &&
      request.workScheduleId === null &&
      request.workSchedule === null &&
      request.rotationId !== null &&
      request.rotation !== null;
    if (!targetsSchedule && !targetsRotation) {
      context.addIssue({
        code: 'custom',
        message: 'Work pattern target does not match its type',
      });
    }

    const isReviewed =
      request.reviewedByTwentyUserId !== null && request.reviewedAt !== null;
    const appliedSchedule =
      request.appliedWorkScheduleAssignmentId !== null &&
      request.appliedShiftRotationAssignmentId === null;
    const appliedRotation =
      request.appliedWorkScheduleAssignmentId === null &&
      request.appliedShiftRotationAssignmentId !== null;
    const hasNoAppliedAssignment =
      request.appliedWorkScheduleAssignmentId === null &&
      request.appliedShiftRotationAssignmentId === null;
    const reviewIsConsistent =
      (request.status === 'PENDING' && !isReviewed && hasNoAppliedAssignment) ||
      (request.status === 'REJECTED' && isReviewed && hasNoAppliedAssignment) ||
      (request.status === 'APPROVED' &&
        isReviewed &&
        ((request.patternType === 'WORK_SCHEDULE' && appliedSchedule) ||
          (request.patternType === 'SHIFT_ROTATION' && appliedRotation)));
    if (!reviewIsConsistent) {
      context.addIssue({
        code: 'custom',
        message: 'Work pattern review state is inconsistent',
      });
    }
  });
export const hrWorkPatternChangeRequestListSchema = z.array(
  hrWorkPatternChangeRequestSchema,
);

export const hrTimeEntrySchema = z.object({
  id: uuidSchema,
  organisationId: uuidSchema,
  societeId: uuidSchema,
  employeeId: uuidSchema,
  externalId: z.string(),
  type: hrTimeEntryTypeSchema,
  source: hrTimeEntrySourceSchema,
  status: hrTimeEntryStatusSchema,
  workMode: hrTimeWorkModeSchema,
  occurredAt: instantSchema,
  localDate: civilDateHttpSchema,
  attendanceDate: civilDateHttpSchema,
  notes: nullableStringSchema,
  recordedByTwentyUserId: z.string(),
  cancelledAt: instantSchema.nullable(),
  cancelledByTwentyUserId: nullableStringSchema,
  cancellationReason: nullableStringSchema,
  createdAt: instantSchema,
  updatedAt: instantSchema,
});

export const hrTimeEntryCorrectionRequestSchema = z
  .object({
    id: uuidSchema,
    organisationId: uuidSchema,
    societeId: uuidSchema,
    employeeId: uuidSchema,
    action: hrTimeEntryCorrectionActionSchema,
    originalTimeEntryId: uuidSchema.nullable(),
    proposedType: hrTimeEntryTypeSchema.nullable(),
    proposedOccurredAt: instantSchema.nullable(),
    proposedLocalDate: nullableCivilDateHttpSchema,
    targetAttendanceDate: civilDateHttpSchema,
    proposedWorkMode: hrTimeWorkModeSchema.nullable(),
    proposedNotes: nullableStringSchema,
    reason: z.string(),
    evidenceRequired: z.boolean(),
    supportingDocumentId: uuidSchema.nullable(),
    status: hrTimeEntryCorrectionStatusSchema,
    requestedByTwentyUserId: z.string(),
    requestedAt: instantSchema,
    managerApprovedAt: instantSchema.nullable(),
    managerApprovedByTwentyUserId: nullableStringSchema,
    decidedAt: instantSchema.nullable(),
    decidedByTwentyUserId: nullableStringSchema,
    decisionReason: nullableStringSchema,
    appliedTimeEntryId: uuidSchema.nullable(),
    createdAt: instantSchema,
    updatedAt: instantSchema,
    employee: hrLeaveEmployeeSummarySchema,
    originalTimeEntry: hrTimeEntrySchema.nullable(),
    appliedTimeEntry: hrTimeEntrySchema.nullable(),
    supportingDocument: z
      .object({
        id: uuidSchema,
        title: z.string(),
        category: hrDocumentCategorySchema,
      })
      .nullable(),
  })
  .superRefine((request, context) => {
    const hasOriginal =
      request.originalTimeEntryId !== null &&
      request.originalTimeEntry !== null;
    const hasNoOriginal =
      request.originalTimeEntryId === null &&
      request.originalTimeEntry === null;
    const hasProposal =
      request.proposedType !== null &&
      request.proposedOccurredAt !== null &&
      request.proposedLocalDate !== null &&
      request.proposedWorkMode !== null;
    const hasNoProposal =
      request.proposedType === null &&
      request.proposedOccurredAt === null &&
      request.proposedLocalDate === null &&
      request.proposedWorkMode === null &&
      request.proposedNotes === null;
    const targetIsConsistent =
      (request.action === 'ADD' && hasNoOriginal && hasProposal) ||
      (request.action === 'REPLACE' && hasOriginal && hasProposal) ||
      (request.action === 'CANCEL' && hasOriginal && hasNoProposal);
    if (!targetIsConsistent) {
      context.addIssue({
        code: 'custom',
        message: 'Time entry correction target is inconsistent',
      });
    }

    const hasManagerApproval =
      request.managerApprovedAt !== null &&
      request.managerApprovedByTwentyUserId !== null;
    const hasDecision =
      request.decidedAt !== null && request.decidedByTwentyUserId !== null;
    const hasAppliedEntry =
      request.appliedTimeEntryId !== null && request.appliedTimeEntry !== null;
    const hasNoAppliedEntry =
      request.appliedTimeEntryId === null && request.appliedTimeEntry === null;
    const supportingDocumentIsConsistent =
      (request.supportingDocumentId === null &&
        request.supportingDocument === null) ||
      (request.supportingDocumentId !== null &&
        request.supportingDocument !== null);
    if (!supportingDocumentIsConsistent) {
      context.addIssue({
        code: 'custom',
        message: 'Time entry correction evidence relation is inconsistent',
      });
    }
    const reviewIsConsistent =
      (request.status === 'REQUESTED' &&
        !hasManagerApproval &&
        !hasDecision &&
        hasNoAppliedEntry) ||
      (request.status === 'MANAGER_APPROVED' &&
        hasManagerApproval &&
        !hasDecision &&
        hasNoAppliedEntry) ||
      (request.status === 'REJECTED' &&
        hasDecision &&
        request.decisionReason !== null &&
        hasNoAppliedEntry) ||
      (request.status === 'APPROVED' &&
        hasManagerApproval &&
        hasDecision &&
        ((request.action === 'CANCEL' && hasNoAppliedEntry) ||
          (request.action !== 'CANCEL' && hasAppliedEntry)));
    if (!reviewIsConsistent) {
      context.addIssue({
        code: 'custom',
        message: 'Time entry correction review state is inconsistent',
      });
    }
    if (
      request.evidenceRequired &&
      request.status === 'APPROVED' &&
      (request.supportingDocumentId === null ||
        request.supportingDocument === null)
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Approved correction is missing required evidence',
      });
    }
  });
export const hrTimeEntryCorrectionRequestListSchema = z.array(
  hrTimeEntryCorrectionRequestSchema,
);

export const hrAttendanceDaySchema = z.object({
  date: civilDateHttpSchema,
  schedule: z
    .object({
      id: uuidSchema,
      code: z.string(),
      name: z.string(),
      timezone: z.string(),
    })
    .nullable(),
  rotation: z
    .object({
      id: uuidSchema,
      code: z.string(),
      name: z.string(),
      timezone: z.string(),
      dayOffset: z.number().int().min(0).max(59).nullable(),
      label: nullableStringSchema,
    })
    .nullable(),
  calendarDay: z
    .object({
      id: uuidSchema,
      workCalendarId: uuidSchema,
      name: z.string(),
      type: hrCalendarDayTypeSchema,
      isWorkingDay: z.boolean(),
      isConfirmed: z.boolean(),
    })
    .nullable(),
  status: hrAttendanceDayStatusSchema,
  firstClockIn: instantSchema.nullable(),
  lastClockOut: instantSchema.nullable(),
  workedMinutes: nonNegativeIntegerSchema,
  scheduledMinutes: nonNegativeIntegerSchema,
  overtimeMinutes: nonNegativeIntegerSchema,
  overtimeCategory: hrOvertimeCategorySchema.nullable(),
  paidBreastfeedingRestMinutes: nonNegativeIntegerSchema,
  lateMinutes: nonNegativeIntegerSchema,
  earlyLeaveMinutes: nonNegativeIntegerSchema,
  breakMinutes: nonNegativeIntegerSchema,
  anomalies: z.array(z.string()),
  entries: z.array(hrTimeEntrySchema),
});

export const hrAttendanceEmployeeMonthSchema = z.object({
  employee: z.object({
    id: uuidSchema,
    employeeNumber: z.string(),
    firstName: z.string(),
    lastName: z.string(),
  }),
  summary: z.object({
    scheduledDays: nonNegativeIntegerSchema,
    presentDays: nonNegativeIntegerSchema,
    absentDays: nonNegativeIntegerSchema,
    leaveDays: nonNegativeIntegerSchema,
    holidayDays: nonNegativeIntegerSchema,
    lateCount: nonNegativeIntegerSchema,
    lateMinutes: nonNegativeIntegerSchema,
    workedMinutes: nonNegativeIntegerSchema,
    paidBreastfeedingRestMinutes: nonNegativeIntegerSchema,
    overtimeMinutes: nonNegativeIntegerSchema,
    overtimeSourceDigest: z.string().length(64),
    anomalyCount: nonNegativeIntegerSchema,
  }),
  days: z.array(hrAttendanceDaySchema),
});

export const hrAttendanceMonthSchema = z.object({
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
  generatedAt: instantSchema,
  employees: z.array(hrAttendanceEmployeeMonthSchema),
});

export const hrOvertimePolicySchema = z.object({
  id: uuidSchema,
  organisationId: uuidSchema,
  societeId: uuidSchema,
  name: z.string(),
  dailyWarningMinutes: nonNegativeIntegerSchema,
  dailyMaximumMinutes: nonNegativeIntegerSchema,
  weeklyMaximumMinutes: nonNegativeIntegerSchema,
  annualMaximumMinutes: nonNegativeIntegerSchema,
  defaultSettlement: hrOvertimeSettlementSchema,
  restConversionBasisPoints: nonNegativeIntegerSchema,
  restExpiryMonths: nonNegativeIntegerSchema,
  blocksApprovalOnLimitExceeded: z.boolean(),
  createdByTwentyUserId: z.string(),
  updatedByTwentyUserId: z.string(),
  createdAt: instantSchema,
  updatedAt: instantSchema,
});
export const hrNullableOvertimePolicySchema = hrOvertimePolicySchema.nullable();
export const hrOvertimePolicyResponseSchema = z.object({
  policy: hrNullableOvertimePolicySchema,
});

export const hrOvertimeLimitAlertSchema = z.object({
  code: z.enum([
    'DAILY_WARNING',
    'DAILY_MAXIMUM',
    'WEEKLY_MAXIMUM',
    'ANNUAL_MAXIMUM',
  ]),
  date: civilDateHttpSchema.nullable(),
  weekStart: civilDateHttpSchema.nullable(),
  detectedMinutes: nonNegativeIntegerSchema,
  limitMinutes: nonNegativeIntegerSchema,
  excessMinutes: nonNegativeIntegerSchema,
});

export const hrCompensatoryRestMovementSchema = z.object({
  id: uuidSchema,
  organisationId: uuidSchema,
  societeId: uuidSchema,
  employeeId: uuidSchema,
  type: hrCompensatoryRestMovementTypeSchema,
  minutes: nonNegativeIntegerSchema,
  occurredOn: civilDateHttpSchema,
  expiresOn: nullableCivilDateHttpSchema,
  reason: z.string(),
  overtimeApprovalId: uuidSchema.nullable(),
  sourceMovementId: uuidSchema.nullable(),
  createdByTwentyUserId: z.string(),
  createdAt: instantSchema,
});

export const hrOvertimeApprovalSchema = z
  .object({
    id: uuidSchema,
    organisationId: uuidSchema,
    societeId: uuidSchema,
    employeeId: uuidSchema,
    policyId: uuidSchema,
    month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
    sourceDigest: z.string().length(64),
    detectedMinutes: nonNegativeIntegerSchema,
    eligibleMinutes: nonNegativeIntegerSchema,
    dayMinutes: nonNegativeIntegerSchema,
    nightMinutes: nonNegativeIntegerSchema,
    restDayMinutes: nonNegativeIntegerSchema,
    holidayMinutes: nonNegativeIntegerSchema,
    limitAlerts: z.array(hrOvertimeLimitAlertSchema),
    policySnapshot: z.record(z.string(), z.unknown()),
    status: hrOvertimeApprovalStatusSchema,
    requestedByTwentyUserId: z.string(),
    requestedAt: instantSchema,
    managerApprovedAt: nullableInstantSchema,
    managerApprovedByTwentyUserId: nullableStringSchema,
    decidedAt: nullableInstantSchema,
    decidedByTwentyUserId: nullableStringSchema,
    decisionReason: nullableStringSchema,
    settlement: hrOvertimeSettlementSchema.nullable(),
    approvedMinutes: nonNegativeIntegerSchema,
    payableMinutes: nonNegativeIntegerSchema,
    restMinutes: nonNegativeIntegerSchema,
    restCreditMinutes: nonNegativeIntegerSchema,
    createdAt: instantSchema,
    updatedAt: instantSchema,
    employee: hrLeaveEmployeeSummarySchema,
    policy: hrOvertimePolicySchema,
    restMovement: hrCompensatoryRestMovementSchema.nullable(),
  })
  .superRefine((approval, context) => {
    if (
      approval.detectedMinutes !==
      approval.dayMinutes +
        approval.nightMinutes +
        approval.restDayMinutes +
        approval.holidayMinutes
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Overtime category totals are inconsistent',
      });
    }
    const hasManagerApproval =
      approval.managerApprovedAt !== null &&
      approval.managerApprovedByTwentyUserId !== null;
    const hasDecision =
      approval.decidedAt !== null && approval.decidedByTwentyUserId !== null;
    const isConsistent =
      (approval.status === 'REQUESTED' &&
        !hasManagerApproval &&
        !hasDecision &&
        approval.settlement === null) ||
      (approval.status === 'MANAGER_APPROVED' &&
        hasManagerApproval &&
        !hasDecision &&
        approval.settlement === null) ||
      (approval.status === 'REJECTED' &&
        hasDecision &&
        approval.decisionReason !== null &&
        approval.settlement === null) ||
      (approval.status === 'APPROVED' &&
        hasManagerApproval &&
        hasDecision &&
        approval.settlement !== null &&
        approval.approvedMinutes === approval.eligibleMinutes &&
        approval.approvedMinutes ===
          approval.payableMinutes + approval.restMinutes);
    if (!isConsistent) {
      context.addIssue({
        code: 'custom',
        message: 'Overtime approval state is inconsistent',
      });
    }
  });
export const hrOvertimeApprovalListSchema = z.array(hrOvertimeApprovalSchema);

const hrCompensatoryRestCreditSchema = hrCompensatoryRestMovementSchema.extend({
  employee: hrLeaveEmployeeSummarySchema,
  overtimeApproval: z
    .object({
      id: uuidSchema,
      month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
      settlement: hrOvertimeSettlementSchema.nullable(),
    })
    .nullable(),
  allocations: z.array(hrCompensatoryRestMovementSchema),
});

export const hrCompensatoryRestBalanceResponseSchema = z.object({
  asOf: civilDateHttpSchema,
  balances: z.array(
    z.object({
      employee: hrLeaveEmployeeSummarySchema,
      earnedMinutes: nonNegativeIntegerSchema,
      consumedMinutes: nonNegativeIntegerSchema,
      expiredMinutes: nonNegativeIntegerSchema,
      pendingExpiryMinutes: nonNegativeIntegerSchema,
      availableMinutes: nonNegativeIntegerSchema,
    }),
  ),
  credits: z.array(hrCompensatoryRestCreditSchema),
});

export const hrCompensatoryRestExpirationResultSchema = z.object({
  asOf: civilDateHttpSchema,
  expiredCreditCount: nonNegativeIntegerSchema,
  expiredMinutes: nonNegativeIntegerSchema,
});

const hrMonthlyEmployeeSchema = z.object({
  id: uuidSchema,
  employeeNumber: z.string(),
  firstName: z.string(),
  lastName: z.string(),
});

export const hrMonthlyPeriodSchema = z.object({
  id: uuidSchema,
  organisationId: uuidSchema,
  societeId: uuidSchema,
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
  status: hrMonthlyPeriodStatusSchema,
  currentSnapshotVersion: nonNegativeIntegerSchema.nullable(),
  frozenSnapshotVersion: nonNegativeIntegerSchema.nullable(),
  sourceDigest: nullableStringSchema,
  employeeCount: nonNegativeIntegerSchema,
  totalAnomalyCount: nonNegativeIntegerSchema,
  totalWorkedMinutes: nonNegativeIntegerSchema,
  totalOvertimeMinutes: nonNegativeIntegerSchema,
  totalAbsenceDays: z.number().nonnegative(),
  totalPaidLeaveDays: z.number().nonnegative(),
  totalUnpaidLeaveDays: z.number().nonnegative(),
  reviewSubmittedAt: nullableInstantSchema,
  reviewSubmittedByTwentyUserId: nullableStringSchema,
  frozenAt: nullableInstantSchema,
  frozenByTwentyUserId: nullableStringSchema,
  transmittedAt: nullableInstantSchema,
  transmittedByTwentyUserId: nullableStringSchema,
  reopenedAt: nullableInstantSchema,
  reopenedByTwentyUserId: nullableStringSchema,
  reopenReason: nullableStringSchema,
  createdByTwentyUserId: z.string(),
  createdAt: instantSchema,
  updatedAt: instantSchema,
  _count: z.object({
    snapshots: nonNegativeIntegerSchema,
    payrollVariables: nonNegativeIntegerSchema,
  }),
});

export const hrMonthlyEmployeeSnapshotSchema = z.object({
  id: uuidSchema,
  organisationId: uuidSchema,
  societeId: uuidSchema,
  periodId: uuidSchema,
  employeeId: uuidSchema,
  version: nonNegativeIntegerSchema,
  scheduledDays: nonNegativeIntegerSchema,
  presentDays: nonNegativeIntegerSchema,
  absentDays: z.number().nonnegative(),
  paidLeaveDays: z.number().nonnegative(),
  unpaidLeaveDays: z.number().nonnegative(),
  holidayDays: nonNegativeIntegerSchema,
  lateMinutes: nonNegativeIntegerSchema,
  workedMinutes: nonNegativeIntegerSchema,
  overtimeMinutes: nonNegativeIntegerSchema,
  anomalyCount: nonNegativeIntegerSchema,
  pendingLeaveRequestCount: nonNegativeIntegerSchema,
  sourceDigest: z.string(),
  details: z.unknown(),
  generatedByTwentyUserId: z.string(),
  generatedAt: instantSchema,
  employee: hrMonthlyEmployeeSchema,
});

export const hrPayrollVariableSchema = z.object({
  id: uuidSchema,
  organisationId: uuidSchema,
  societeId: uuidSchema,
  periodId: uuidSchema,
  employeeId: uuidSchema,
  snapshotVersion: nonNegativeIntegerSchema,
  kind: hrPayrollVariableKindSchema,
  unit: hrPayrollVariableUnitSchema,
  value: z.number().nonnegative(),
  sourceDigest: z.string(),
  generatedByTwentyUserId: z.string(),
  createdAt: instantSchema,
  employee: hrMonthlyEmployeeSchema,
});

export const hrMonthlyPeriodListSchema = z.array(hrMonthlyPeriodSchema);
export const hrMonthlyPeriodDetailSchema = hrMonthlyPeriodSchema.extend({
  snapshots: z.array(hrMonthlyEmployeeSnapshotSchema),
  payrollVariables: z.array(hrPayrollVariableSchema),
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
export type HrTimeEntryType = z.infer<typeof hrTimeEntryTypeSchema>;
export type HrTimeEntrySource = z.infer<typeof hrTimeEntrySourceSchema>;
export type HrTimeEntryStatus = z.infer<typeof hrTimeEntryStatusSchema>;
export type HrTimeWorkMode = z.infer<typeof hrTimeWorkModeSchema>;
export type HrOvertimeCategory = z.infer<typeof hrOvertimeCategorySchema>;
export type HrOvertimeSettlement = z.infer<typeof hrOvertimeSettlementSchema>;
export type HrOvertimeApprovalStatus = z.infer<
  typeof hrOvertimeApprovalStatusSchema
>;
export type HrCompensatoryRestMovementType = z.infer<
  typeof hrCompensatoryRestMovementTypeSchema
>;
export type HrTimeEntryCorrectionAction = z.infer<
  typeof hrTimeEntryCorrectionActionSchema
>;
export type HrTimeEntryCorrectionStatus = z.infer<
  typeof hrTimeEntryCorrectionStatusSchema
>;
export type HrCalendarDayType = z.infer<typeof hrCalendarDayTypeSchema>;
export type HrWorkPatternType = z.infer<typeof hrWorkPatternTypeSchema>;
export type HrWorkPatternChangeStatus = z.infer<
  typeof hrWorkPatternChangeStatusSchema
>;
export type HrAttendanceDayStatus = z.infer<typeof hrAttendanceDayStatusSchema>;
export type HrLeaveType = z.infer<typeof hrLeaveTypeSchema>;
export type HrLeaveRequestStatus = z.infer<typeof hrLeaveRequestStatusSchema>;
export type HrLeaveBalanceMovementType = z.infer<
  typeof hrLeaveBalanceMovementTypeSchema
>;
export type HrMonthlyPeriodStatus = z.infer<typeof hrMonthlyPeriodStatusSchema>;
export type HrPayrollVariableKind = z.infer<typeof hrPayrollVariableKindSchema>;
export type HrPayrollVariableUnit = z.infer<typeof hrPayrollVariableUnitSchema>;
export type HrAccessContext = z.infer<typeof hrAccessContextSchema>;
export type HrAccessGrant = z.infer<typeof hrAccessGrantSchema>;
export type HrEmployeeSelfServiceAccess = z.infer<
  typeof hrEmployeeSelfServiceAccessSchema
>;
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
export type HrLeavePolicy = z.infer<typeof hrLeavePolicySchema>;
export type HrLeaveRequest = z.infer<typeof hrLeaveRequestSchema>;
export type HrBreastfeedingArrangementStatus = z.infer<
  typeof hrBreastfeedingArrangementStatusSchema
>;
export type HrBreastfeedingArrangement = z.infer<
  typeof hrBreastfeedingArrangementSchema
>;
export type HrLeaveBalanceMovement = z.infer<
  typeof hrLeaveBalanceMovementSchema
>;
export type HrLeaveBalance = z.infer<typeof hrLeaveBalanceSchema>;
export type HrLeavePolicySeedResult = z.infer<
  typeof hrLeavePolicySeedResultSchema
>;
export type HrLeaveAccrualRunResult = z.infer<
  typeof hrLeaveAccrualRunResultSchema
>;
export type HrEmployeePayslipSummary = z.infer<
  typeof hrEmployeePayslipSummarySchema
>;
export type HrEmployeeSelfService = z.infer<typeof hrEmployeeSelfServiceSchema>;
export type HrCalendarDay = z.infer<typeof hrCalendarDaySchema>;
export type HrWorkCalendar = z.infer<typeof hrWorkCalendarSchema>;
export type HrMoroccoHolidaySeedResult = z.infer<
  typeof hrMoroccoHolidaySeedResultSchema
>;
export type HrWorkScheduleDay = z.infer<typeof hrWorkScheduleDaySchema>;
export type HrWorkSchedule = z.infer<typeof hrWorkScheduleSchema>;
export type HrShiftRotationDay = z.infer<typeof hrShiftRotationDaySchema>;
export type HrShiftRotation = z.infer<typeof hrShiftRotationSchema>;
export type HrShiftRotationAssignment = z.infer<
  typeof hrShiftRotationAssignmentSchema
>;
export type HrWorkScheduleAssignment = z.infer<
  typeof hrWorkScheduleAssignmentSchema
>;
export type HrWorkPatternChangeRequest = z.infer<
  typeof hrWorkPatternChangeRequestSchema
>;
export type HrTimeEntry = z.infer<typeof hrTimeEntrySchema>;
export type HrTimeEntryCorrectionRequest = z.infer<
  typeof hrTimeEntryCorrectionRequestSchema
>;
export type HrAttendanceDay = z.infer<typeof hrAttendanceDaySchema>;
export type HrAttendanceEmployeeMonth = z.infer<
  typeof hrAttendanceEmployeeMonthSchema
>;
export type HrAttendanceMonth = z.infer<typeof hrAttendanceMonthSchema>;
export type HrOvertimePolicy = z.infer<typeof hrOvertimePolicySchema>;
export type HrOvertimeLimitAlert = z.infer<typeof hrOvertimeLimitAlertSchema>;
export type HrOvertimeApproval = z.infer<typeof hrOvertimeApprovalSchema>;
export type HrCompensatoryRestMovement = z.infer<
  typeof hrCompensatoryRestMovementSchema
>;
export type HrCompensatoryRestBalanceResponse = z.infer<
  typeof hrCompensatoryRestBalanceResponseSchema
>;
export type HrCompensatoryRestExpirationResult = z.infer<
  typeof hrCompensatoryRestExpirationResultSchema
>;
export type HrMonthlyPeriod = z.infer<typeof hrMonthlyPeriodSchema>;
export type HrMonthlyPeriodDetail = z.infer<typeof hrMonthlyPeriodDetailSchema>;
export type HrMonthlyEmployeeSnapshot = z.infer<
  typeof hrMonthlyEmployeeSnapshotSchema
>;
export type HrPayrollVariable = z.infer<typeof hrPayrollVariableSchema>;
export type HrEmployeeHistoryEvent = z.infer<
  typeof hrEmployeeHistoryEventSchema
>;
export type HrEmployeeDetail = z.infer<typeof hrEmployeeDetailSchema>;
export type HrCoreSummary = z.infer<typeof hrCoreSummarySchema>;
