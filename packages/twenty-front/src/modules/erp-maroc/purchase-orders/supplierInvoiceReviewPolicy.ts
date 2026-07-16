import type { ErpSupplierInvoiceDetail } from 'twenty-shared/erp-maroc';

export type SupplierInvoiceReviewActions = {
  canCorrect: boolean;
  canApprove: boolean;
  canCancel: boolean;
  requiresOverrideReason: boolean;
  isBlocked: boolean;
};

export const getSupplierInvoiceReviewActions = (
  invoice: Pick<ErpSupplierInvoiceDetail, 'status' | 'matchStatus'>,
  canManageSupplierAccounting: boolean,
): SupplierInvoiceReviewActions => {
  const isPending = invoice.status === 'PENDING_REVIEW';
  const isBlocked = invoice.matchStatus === 'BLOCKED';

  return {
    canCorrect: canManageSupplierAccounting && isPending,
    canApprove: canManageSupplierAccounting && isPending && !isBlocked,
    canCancel: canManageSupplierAccounting && isPending,
    requiresOverrideReason: invoice.matchStatus === 'DISCREPANCY',
    isBlocked,
  };
};
