import { describe, expect, it } from 'vitest';

import { getSupplierInvoiceReviewActions } from './supplierInvoiceReviewPolicy';

describe('supplier invoice review policy', () => {
  it('allows matched pending invoices to be approved', () => {
    expect(
      getSupplierInvoiceReviewActions(
        { status: 'PENDING_REVIEW', matchStatus: 'MATCHED' },
        true,
      ),
    ).toEqual({
      canCorrect: true,
      canApprove: true,
      canCancel: true,
      requiresOverrideReason: false,
      isBlocked: false,
    });
  });

  it('requires an override for discrepancies', () => {
    expect(
      getSupplierInvoiceReviewActions(
        { status: 'PENDING_REVIEW', matchStatus: 'DISCREPANCY' },
        true,
      ).requiresOverrideReason,
    ).toBe(true);
  });

  it('blocks approval and hides every mutation without capability', () => {
    expect(
      getSupplierInvoiceReviewActions(
        { status: 'PENDING_REVIEW', matchStatus: 'BLOCKED' },
        true,
      ).canApprove,
    ).toBe(false);
    expect(
      getSupplierInvoiceReviewActions(
        { status: 'PENDING_REVIEW', matchStatus: 'MATCHED' },
        false,
      ),
    ).toMatchObject({
      canCorrect: false,
      canApprove: false,
      canCancel: false,
    });
  });
});
