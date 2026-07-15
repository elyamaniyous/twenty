import {
  formatCivilDate,
  formatInstantInTimeZone,
  parseCivilDate,
  toCivilDateString,
} from '@/erp-maroc/utils/civilDate';

describe('ERP Maroc civil date utilities', () => {
  it('strictly round-trips a valid leap-day without a timezone shift', () => {
    const parsed = parseCivilDate('2024-02-29');

    expect(parsed).toEqual({ year: 2024, month: 2, day: 29 });
    expect(toCivilDateString(parsed)).toBe('2024-02-29');
    expect(formatCivilDate('2024-02-29')).toBe('29/02/2024');
  });

  it.each([
    '2023-02-29',
    '2024-02-30',
    '2024-13-01',
    '2024-00-10',
    '2024-1-01',
    '01/01/2024',
  ])('rejects invalid or non-canonical civil date %s', (value) => {
    expect(() => parseCivilDate(value)).toThrow();
  });

  it('formats an instant in the supplied IANA timezone', () => {
    expect(
      formatInstantInTimeZone('2024-01-01T23:30:00.000Z', 'Africa/Casablanca'),
    ).toBe('02/01/2024 00:30');
  });

  it('rejects invalid instants and IANA timezone identifiers', () => {
    expect(() =>
      formatInstantInTimeZone('not-an-instant', 'Africa/Casablanca'),
    ).toThrow();
    expect(() =>
      formatInstantInTimeZone('2024-01-01T00:00:00.000Z', 'Casablanca'),
    ).toThrow();
  });
});
