import {
  centsToMadDecimalString,
  formatMadCents,
  formatMadDecimal,
  parseMadDecimalToCents,
  parseMadDecimalToTransportNumber,
} from '@/erp-maroc/utils/money';

describe('ERP Maroc money utilities', () => {
  it('formats integer cents as French Moroccan MAD with stable spaces', () => {
    expect(formatMadCents(123_450)).toBe('1 234,50 MAD');
  });

  it.each([
    [1.005, '1,01 MAD'],
    [1_234_567.895, '1 234 567,90 MAD'],
  ])(
    'formats backend decimal %s as French Moroccan MAD rounded to two decimals',
    (value, expected) => {
      expect(formatMadDecimal(value)).toBe(expected);
    },
  );

  it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
    'rejects nonfinite backend decimal %s',
    (value) => {
      expect(() => formatMadDecimal(value)).toThrow(RangeError);
    },
  );

  it.each([
    ['1234.50', 123_450],
    ['1 234,50', 123_450],
    ['0.29', 29],
    ['12', 1_200],
    ['12.3', 1_230],
  ])('converts %s to cents without floating-point drift', (value, cents) => {
    expect(parseMadDecimalToCents(value)).toBe(cents);
  });

  it.each(['1.234', '1,234', '12.2.0', 'NaN', '', '  '])(
    'rejects invalid or over-precise decimal input %s',
    (value) => {
      expect(() => parseMadDecimalToCents(value)).toThrow();
    },
  );

  it('rejects negative input unless the caller explicitly permits it', () => {
    expect(() => parseMadDecimalToCents('-1.00')).toThrow();
    expect(parseMadDecimalToCents('-1.00', { allowNegative: true })).toBe(-100);
  });

  it('rejects values that cannot be represented as safe integer cents', () => {
    expect(() => parseMadDecimalToCents('90071992547409.92')).toThrow();
    expect(() => formatMadCents(Number.MAX_SAFE_INTEGER + 1)).toThrow();
  });

  it('formats every safe cent exactly at the upper precision boundary', () => {
    expect(formatMadCents(Number.MAX_SAFE_INTEGER)).toBe(
      '90 071 992 547 409,91 MAD',
    );
  });

  it('converts cents back to a transport-safe decimal string', () => {
    expect(centsToMadDecimalString(29)).toBe('0.29');
    expect(centsToMadDecimalString(1_230)).toBe('12.30');
    expect(centsToMadDecimalString(-5, { allowNegative: true })).toBe('-0.05');
  });

  it.each([
    ['0.29', 0.29],
    ['99.95', 99.95],
    ['90071992547409.90', 90071992547409.9],
  ])(
    'converts exact MAD input %s to its JSON transport number',
    (value, expected) => {
      expect(parseMadDecimalToTransportNumber(value)).toBe(expected);
    },
  );

  it.each(['1e3', '1.005', 'NaN', 'Infinity', '90071992547409.92'])(
    'rejects invalid MAD transport input %s',
    (value) => {
      expect(() => parseMadDecimalToTransportNumber(value)).toThrow();
    },
  );

  it('rejects a safe-cent value that loses one cent in JSON number transport', () => {
    expect(() => parseMadDecimalToTransportNumber('90071992547409.91')).toThrow(
      'Money cannot round-trip exactly as a JSON number',
    );
  });
});
