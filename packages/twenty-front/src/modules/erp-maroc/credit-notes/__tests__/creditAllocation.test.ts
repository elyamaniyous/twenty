import { clampCreditAllocation } from '../creditAllocation';

describe('clampCreditAllocation', () => {
  it('caps allocation by both available customer credit and target outstanding balance', () => {
    expect(clampCreditAllocation(900, 700, 500)).toBe(500);
    expect(clampCreditAllocation(900, 700, 800)).toBe(700);
    expect(clampCreditAllocation(300, 700, 500)).toBe(300);
  });

  it.each([
    [-1, 700, 500],
    [900, -1, 500],
    [900, 700, -1],
    [900.5, 700, 500],
    [900, 700, 500.5],
  ])(
    'returns zero for invalid cent inputs: %p, %p, %p',
    (available, outstanding, requested) => {
      expect(clampCreditAllocation(available, outstanding, requested)).toBe(0);
    },
  );
});
