import { z } from 'zod';

const approvalStepSchema = z.object({
  step: z.number().int().positive(),
  role: z.enum(['OWNER', 'ADMIN', 'COMMERCIAL', 'COMPTABLE']),
  label: z.string(),
});

export const purchaseApprovalMatrixSchema = z.object({
  id: z.string().uuid(),
  entityType: z.enum([
    'PURCHASE_ORDER',
    'EXPENSE_NOTE',
    'SUPPLIER_PAYMENT',
    'ACCOUNTING_ENTRY',
  ]),
  department: z.string().nullable(),
  minAmountCents: z.number().int().nonnegative(),
  maxAmountCents: z.number().int().nonnegative().nullable(),
  steps: z.array(approvalStepSchema).min(1),
  isActive: z.boolean(),
});

export const purchaseApprovalMatrixListSchema = z.array(
  purchaseApprovalMatrixSchema.passthrough(),
);

export const purchaseApprovalRequestSchema = z.object({
  id: z.string().uuid(),
  entityType: z.enum([
    'PURCHASE_ORDER',
    'EXPENSE_NOTE',
    'SUPPLIER_PAYMENT',
    'ACCOUNTING_ENTRY',
  ]),
  entityId: z.string().uuid(),
  amountCents: z.number().int().nonnegative(),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']),
  currentStep: z.number().int().positive(),
});

export const purchaseApprovalRequestListSchema = z.array(
  purchaseApprovalRequestSchema.passthrough(),
);

export type PurchaseApprovalMatrix = z.infer<
  typeof purchaseApprovalMatrixSchema
>;
export type PurchaseApprovalRequest = z.infer<
  typeof purchaseApprovalRequestSchema
>;

export const findApplicablePurchaseApprovalMatrix = (
  matrices: PurchaseApprovalMatrix[],
  amountCents: number,
) =>
  matrices
    .filter(
      (matrix) =>
        matrix.isActive &&
        matrix.entityType === 'PURCHASE_ORDER' &&
        matrix.department === null &&
        matrix.minAmountCents <= amountCents &&
        (matrix.maxAmountCents === null ||
          matrix.maxAmountCents >= amountCents),
    )
    .sort((left, right) => right.minAmountCents - left.minAmountCents)[0] ??
  null;

export const getCurrentPurchaseApprovalStep = (
  matrix: PurchaseApprovalMatrix | null,
  request: PurchaseApprovalRequest | null,
) =>
  matrix === null || request === null || request.status !== 'PENDING'
    ? null
    : (matrix.steps.find(({ step }) => step === request.currentStep) ?? null);
