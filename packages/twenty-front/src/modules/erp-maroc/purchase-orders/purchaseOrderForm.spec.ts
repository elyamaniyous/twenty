import {
  createEmptyPurchaseOrderValues,
  parsePurchaseOrderForm,
} from './purchaseOrderForm';

const societeId = '11111111-1111-4111-8111-111111111111';
const supplierId = '22222222-2222-4222-8222-222222222222';

describe('purchaseOrderForm', () => {
  it('creates a normalized backend payload', () => {
    const values = createEmptyPurchaseOrderValues(
      new Date('2026-07-16T12:00:00Z'),
    );
    values.supplierId = supplierId;
    values.expectedDeliveryDate = '2026-07-20';
    values.notes = '  Livraison au siège  ';
    values.lines[0] = {
      ...values.lines[0],
      description: '  Ordinateur portable  ',
      unit: '  UNITE  ',
      quantity: '2.5',
      unitPriceHt: '10000.00',
      tvaRate: 20,
    };

    expect(parsePurchaseOrderForm({ societeId, values })).toEqual({
      status: 'valid',
      payload: {
        societeId,
        supplierId,
        currency: 'MAD',
        issueDate: '2026-07-16',
        expectedDeliveryDate: '2026-07-20',
        notes: 'Livraison au siège',
        lines: [
          {
            productId: null,
            description: 'Ordinateur portable',
            unit: 'UNITE',
            quantity: 2.5,
            unitPriceHt: 10000,
            tvaRate: 20,
          },
        ],
      },
    });
  });

  it('rejects a delivery date before issue date and invalid lines', () => {
    const values = createEmptyPurchaseOrderValues(
      new Date('2026-07-16T12:00:00Z'),
    );
    values.supplierId = supplierId;
    values.expectedDeliveryDate = '2026-07-15';
    values.lines[0].quantity = '0';

    const result = parsePurchaseOrderForm({ societeId, values });

    expect(result.status).toBe('invalid');
    if (result.status === 'invalid') {
      expect(result.errors.map(({ code }) => code)).toEqual(
        expect.arrayContaining([
          'DELIVERY_DATE_BEFORE_ISSUE_DATE',
          'DESCRIPTION_REQUIRED',
          'QUANTITY_INVALID',
        ]),
      );
    }
  });
});
