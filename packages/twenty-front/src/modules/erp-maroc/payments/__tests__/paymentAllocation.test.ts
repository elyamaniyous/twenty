import {
  allocationTotal,
  buildSuggestedAllocations,
  isAllocationComplete,
  remainingAmount,
} from '../paymentAllocation';

type Allocation = {
  invoiceId: string;
  amountCents: number;
};

type Invoice = {
  id: string;
  dueDate: string;
  outstandingCents: number;
  isOverdue: boolean;
};

const invoices: readonly Invoice[] = Object.freeze([
  Object.freeze({
    id: 'future-invoice',
    dueDate: '2026-08-01',
    outstandingCents: 50000,
    isOverdue: false,
  }),
  Object.freeze({
    id: 'overdue-later',
    dueDate: '2026-07-10',
    outstandingCents: 3000,
    isOverdue: true,
  }),
  Object.freeze({
    id: 'overdue-earlier',
    dueDate: '2026-07-01',
    outstandingCents: 2000,
    isOverdue: true,
  }),
  Object.freeze({
    id: 'due-b',
    dueDate: '2026-07-12',
    outstandingCents: 2000,
    isOverdue: false,
  }),
  Object.freeze({
    id: 'due-a',
    dueDate: '2026-07-12',
    outstandingCents: 1000,
    isOverdue: false,
  }),
]);

describe('paymentAllocation', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  describe('allocationTotal', () => {
    it('adds every allocation amount in cents and returns zero for no allocations', () => {
      const allocations: readonly Allocation[] = Object.freeze([
        Object.freeze({ invoiceId: 'invoice-1', amountCents: 1250 }),
        Object.freeze({ invoiceId: 'invoice-2', amountCents: 1725 }),
      ]);

      expect(allocationTotal(allocations)).toBe(2975);
      expect(allocationTotal([])).toBe(0);
    });
  });

  describe('remainingAmount', () => {
    it('subtracts the exact allocation total from the payment cents', () => {
      const allocations: readonly Allocation[] = Object.freeze([
        Object.freeze({ invoiceId: 'invoice-1', amountCents: 4200 }),
        Object.freeze({ invoiceId: 'invoice-2', amountCents: 1800 }),
      ]);

      expect(remainingAmount(10000, allocations)).toBe(4000);
    });
  });

  describe('buildSuggestedAllocations', () => {
    it('allocates oldest overdue invoices first, then due date and id, without exceeding outstanding cents or the payment cents', () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-07-12T12:00:00.000Z'));

      const paymentCents = 10000;
      const invoiceSnapshot = JSON.parse(JSON.stringify(invoices));

      const suggestions = buildSuggestedAllocations(paymentCents, invoices);

      expect(suggestions).toEqual([
        { invoiceId: 'overdue-earlier', amountCents: 2000 },
        { invoiceId: 'overdue-later', amountCents: 3000 },
        { invoiceId: 'due-a', amountCents: 1000 },
        { invoiceId: 'due-b', amountCents: 2000 },
        { invoiceId: 'future-invoice', amountCents: 2000 },
      ]);
      expect(allocationTotal(suggestions)).toBeLessThanOrEqual(paymentCents);
      expect(
        suggestions.every((suggestion) => {
          const invoice = invoices.find(
            ({ id }) => id === suggestion.invoiceId,
          );

          return suggestion.amountCents <= (invoice?.outstandingCents ?? 0);
        }),
      ).toBe(true);
      expect(invoices).toEqual(invoiceSnapshot);
    });

    it('returns a frozen allocation array with frozen entries', () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-07-12T12:00:00.000Z'));

      const suggestions = buildSuggestedAllocations(2000, invoices);

      expect(Object.isFrozen(suggestions)).toBe(true);
      expect(Object.isFrozen(suggestions[0])).toBe(true);
      expect(() => {
        (suggestions as Allocation[]).push({
          invoiceId: 'another-invoice',
          amountCents: 1,
        });
      }).toThrow(TypeError);
      expect(() => {
        (suggestions[0] as Allocation).amountCents = 1;
      }).toThrow(TypeError);
    });

    it('prioritizes the ERP isOverdue flag over a locally past due date', () => {
      const invoiceSnapshot: readonly Invoice[] = [
        {
          id: 'locally-past',
          dueDate: '2026-07-01',
          outstandingCents: 1000,
          isOverdue: false,
        },
        {
          id: 'server-overdue',
          dueDate: '2026-08-01',
          outstandingCents: 1000,
          isOverdue: true,
        },
      ];

      expect(buildSuggestedAllocations(2000, invoiceSnapshot)).toEqual([
        { invoiceId: 'server-overdue', amountCents: 1000 },
        { invoiceId: 'locally-past', amountCents: 1000 },
      ]);
    });

    it('partially allocates the highest-priority overdue invoice when the payment is smaller than its outstanding balance', () => {
      const invoiceSnapshot: readonly Invoice[] = [
        {
          id: 'overdue-priority',
          dueDate: '2026-07-01',
          outstandingCents: 10000,
          isOverdue: true,
        },
        {
          id: 'less-priority-invoice',
          dueDate: '2026-07-02',
          outstandingCents: 1000,
          isOverdue: true,
        },
      ];

      expect(buildSuggestedAllocations(2500, invoiceSnapshot)).toEqual([
        { invoiceId: 'overdue-priority', amountCents: 2500 },
      ]);
    });
  });

  describe('isAllocationComplete', () => {
    it('accepts exact positive whole-cent allocations for known invoices within their outstanding balances', () => {
      const exactAllocations: readonly Allocation[] = [
        { invoiceId: 'overdue-earlier', amountCents: 2000 },
        { invoiceId: 'overdue-later', amountCents: 3000 },
        { invoiceId: 'due-a', amountCents: 1000 },
        { invoiceId: 'future-invoice', amountCents: 4000 },
      ];

      expect(isAllocationComplete(10000, exactAllocations, invoices)).toBe(
        true,
      );
    });

    it('rejects allocation totals that do not equal the payment cents exactly', () => {
      const underAllocated: readonly Allocation[] = [
        { invoiceId: 'overdue-earlier', amountCents: 9999 },
      ];
      const overAllocated: readonly Allocation[] = [
        { invoiceId: 'overdue-earlier', amountCents: 10001 },
      ];

      expect(isAllocationComplete(10000, underAllocated, invoices)).toBe(false);
      expect(isAllocationComplete(10000, overAllocated, invoices)).toBe(false);
    });

    it('rejects a zero-cent allocation even when the total equals the payment cents', () => {
      const allocations: readonly Allocation[] = [
        { invoiceId: 'overdue-earlier', amountCents: 2000 },
        { invoiceId: 'overdue-later', amountCents: 3000 },
        { invoiceId: 'due-a', amountCents: 1000 },
        { invoiceId: 'future-invoice', amountCents: 4000 },
        { invoiceId: 'due-b', amountCents: 0 },
      ];

      expect(isAllocationComplete(10000, allocations, invoices)).toBe(false);
    });

    it('rejects a fractional-cent allocation even when the total equals the payment cents', () => {
      const allocations: readonly Allocation[] = [
        { invoiceId: 'overdue-earlier', amountCents: 2000.5 },
        { invoiceId: 'overdue-later', amountCents: 2999.5 },
        { invoiceId: 'due-a', amountCents: 1000 },
        { invoiceId: 'future-invoice', amountCents: 4000 },
      ];

      expect(isAllocationComplete(10000, allocations, invoices)).toBe(false);
    });

    it('rejects duplicate invoice allocations even when the total equals the payment cents', () => {
      const allocations: readonly Allocation[] = [
        { invoiceId: 'overdue-earlier', amountCents: 1000 },
        { invoiceId: 'overdue-earlier', amountCents: 1000 },
        { invoiceId: 'overdue-later', amountCents: 3000 },
        { invoiceId: 'due-a', amountCents: 1000 },
        { invoiceId: 'future-invoice', amountCents: 4000 },
      ];

      expect(isAllocationComplete(10000, allocations, invoices)).toBe(false);
    });

    it('rejects an unknown invoice allocation even when the total equals the payment cents', () => {
      const allocations: readonly Allocation[] = [
        { invoiceId: 'overdue-earlier', amountCents: 2000 },
        { invoiceId: 'overdue-later', amountCents: 3000 },
        { invoiceId: 'due-a', amountCents: 1000 },
        { invoiceId: 'unknown-invoice', amountCents: 4000 },
      ];

      expect(isAllocationComplete(10000, allocations, invoices)).toBe(false);
    });

    it('rejects an allocation above its outstanding balance even when the total equals the payment cents', () => {
      const allocations: readonly Allocation[] = [
        { invoiceId: 'overdue-earlier', amountCents: 2000 },
        { invoiceId: 'overdue-later', amountCents: 3000 },
        { invoiceId: 'due-a', amountCents: 1001 },
        { invoiceId: 'future-invoice', amountCents: 3999 },
      ];

      expect(isAllocationComplete(10000, allocations, invoices)).toBe(false);
    });
  });
});
