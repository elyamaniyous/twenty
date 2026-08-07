import {
  isPurchaseOrderDeliveryOverdue,
  matchesPurchaseOrderProcessFilter,
  purchaseOrderNextAction,
} from '@/erp-maroc/purchase-orders/purchaseOrderUi';
import { type ErpPurchaseOrder } from 'twenty-shared/erp-maroc';

const order = {
  status: 'CONFIRMED',
  expectedDeliveryDate: '2026-08-06',
} as ErpPurchaseOrder;

describe('purchaseOrderUi', () => {
  it('identifies only open receptions whose expected date has passed', () => {
    expect(isPurchaseOrderDeliveryOverdue(order, '2026-08-07')).toBe(true);
    expect(
      isPurchaseOrderDeliveryOverdue(
        { ...order, status: 'RECEIVED' },
        '2026-08-07',
      ),
    ).toBe(false);
    expect(
      isPurchaseOrderDeliveryOverdue(
        { ...order, expectedDeliveryDate: null },
        '2026-08-07',
      ),
    ).toBe(false);
  });

  it('maps orders to the operational process filters', () => {
    expect(
      matchesPurchaseOrderProcessFilter(order, 'RECEIVING', '2026-08-07'),
    ).toBe(true);
    expect(
      matchesPurchaseOrderProcessFilter(order, 'OVERDUE', '2026-08-07'),
    ).toBe(true);
    expect(
      matchesPurchaseOrderProcessFilter(order, 'INVOICING', '2026-08-07'),
    ).toBe(false);
  });

  it('provides an explicit next action for every lifecycle status', () => {
    expect(purchaseOrderNextAction.DRAFT).toBe('Finaliser et confirmer');
    expect(purchaseOrderNextAction.PARTIALLY_RECEIVED).toBe(
      'Compléter la réception',
    );
    expect(purchaseOrderNextAction.RECEIVED).toBe('Contrôler la facture');
  });
});
