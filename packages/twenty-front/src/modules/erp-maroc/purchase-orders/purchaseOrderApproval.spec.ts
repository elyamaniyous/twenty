import {
  findApplicablePurchaseApprovalMatrix,
  getCurrentPurchaseApprovalStep,
  type PurchaseApprovalMatrix,
} from '@/erp-maroc/purchase-orders/purchaseOrderApproval';

const matrices: PurchaseApprovalMatrix[] = [
  {
    id: '11111111-1111-4111-8111-111111111111',
    entityType: 'PURCHASE_ORDER',
    department: null,
    minAmountCents: 0,
    maxAmountCents: 99_999,
    steps: [{ step: 1, role: 'ADMIN', label: 'Direction' }],
    isActive: true,
  },
  {
    id: '22222222-2222-4222-8222-222222222222',
    entityType: 'PURCHASE_ORDER',
    department: null,
    minAmountCents: 100_000,
    maxAmountCents: null,
    steps: [
      { step: 1, role: 'COMPTABLE', label: 'Contrôle comptable' },
      { step: 2, role: 'OWNER', label: 'Direction générale' },
    ],
    isActive: true,
  },
];

describe('purchaseOrderApproval', () => {
  it('selects the active amount bracket', () => {
    expect(findApplicablePurchaseApprovalMatrix(matrices, 250_000)?.id).toBe(
      matrices[1].id,
    );
  });

  it('returns the role expected at the current approval step', () => {
    expect(
      getCurrentPurchaseApprovalStep(matrices[1], {
        id: '33333333-3333-4333-8333-333333333333',
        entityType: 'PURCHASE_ORDER',
        entityId: '44444444-4444-4444-8444-444444444444',
        amountCents: 250_000,
        status: 'PENDING',
        currentStep: 2,
      }),
    ).toEqual({
      step: 2,
      role: 'OWNER',
      label: 'Direction générale',
    });
  });
});
