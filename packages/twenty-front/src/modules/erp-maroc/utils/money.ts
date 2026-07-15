const NORMALIZED_SPACE_PATTERN = /[\u00a0\u202f]/g;
const GROUPING_SPACE_PATTERN = /[ \u00a0\u202f]/g;
const MAD_DECIMAL_PATTERN =
  /^(-?)(?:(\d+)|(\d{1,3}(?:[ \u00a0\u202f]\d{3})+))(?:([.,])(\d{1,2}))?$/;

type SignedMoneyOptions = {
  allowNegative?: boolean;
};

const assertSafeCents = (
  cents: number,
  { allowNegative = false }: SignedMoneyOptions = {},
) => {
  if (!Number.isSafeInteger(cents)) {
    throw new RangeError('Money cents must be a safe integer');
  }

  if (!allowNegative && cents < 0) {
    throw new RangeError('Money cents cannot be negative');
  }
};

export const parseMadDecimalToCents = (
  value: string,
  { allowNegative = false }: SignedMoneyOptions = {},
): number => {
  const match = MAD_DECIMAL_PATTERN.exec(value.trim());

  if (match === null) {
    throw new TypeError('Money must be a decimal with at most two digits');
  }

  const [, sign, plainInteger, groupedInteger, , fraction = ''] = match;

  if (sign === '-' && !allowNegative) {
    throw new RangeError('Money cannot be negative');
  }

  const integer = (plainInteger ?? groupedInteger).replace(
    GROUPING_SPACE_PATTERN,
    '',
  );
  const absoluteCents =
    BigInt(integer) * 100n + BigInt(fraction.padEnd(2, '0'));
  const signedCents = sign === '-' ? -absoluteCents : absoluteCents;

  if (
    signedCents > BigInt(Number.MAX_SAFE_INTEGER) ||
    signedCents < BigInt(Number.MIN_SAFE_INTEGER)
  ) {
    throw new RangeError('Money cents exceed safe integer precision');
  }

  return Number(signedCents);
};

export const centsToMadDecimalString = (
  cents: number,
  options: SignedMoneyOptions = {},
): string => {
  assertSafeCents(cents, options);

  const centsAsBigInt = BigInt(cents);
  const isNegative = centsAsBigInt < 0n;
  const absoluteCents = isNegative ? -centsAsBigInt : centsAsBigInt;
  const units = absoluteCents / 100n;
  const fraction = String(absoluteCents % 100n).padStart(2, '0');

  return `${isNegative ? '-' : ''}${units}.${fraction}`;
};

export const parseMadDecimalToTransportNumber = (value: string): number => {
  const cents = parseMadDecimalToCents(value);
  const transportNumber = Number(centsToMadDecimalString(cents));

  let transportedCents: number;
  try {
    transportedCents = parseMadDecimalToCents(String(transportNumber));
  } catch {
    throw new RangeError('Money cannot round-trip exactly as a JSON number');
  }

  if (transportedCents !== cents) {
    throw new RangeError('Money cannot round-trip exactly as a JSON number');
  }

  return transportNumber;
};

const madFormatter = new Intl.NumberFormat('fr-MA', {
  style: 'currency',
  currency: 'MAD',
  currencyDisplay: 'code',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  useGrouping: true,
});

export const formatMadDecimal = (value: number): string => {
  if (!Number.isFinite(value)) {
    throw new RangeError('Money decimal must be finite');
  }

  return madFormatter
    .formatToParts(value)
    .map((part) => {
      if (part.type === 'group') {
        return ' ';
      }

      if (part.type === 'literal') {
        return part.value.replace(NORMALIZED_SPACE_PATTERN, ' ');
      }

      return part.value;
    })
    .join('')
    .replace(NORMALIZED_SPACE_PATTERN, ' ')
    .trim();
};

export const formatMadCents = (
  cents: number,
  options: SignedMoneyOptions = { allowNegative: true },
): string => {
  assertSafeCents(cents, options);

  const centsAsBigInt = BigInt(cents);
  const isNegative = centsAsBigInt < 0n;
  const absoluteCents = isNegative ? -centsAsBigInt : centsAsBigInt;
  const units = absoluteCents / 100n;
  const fraction = String(absoluteCents % 100n).padStart(2, '0');

  return `${isNegative ? '-' : ''}${madFormatter
    .formatToParts(units)
    .map((part) => {
      if (part.type === 'group') {
        return ' ';
      }

      if (part.type === 'fraction') {
        return fraction;
      }

      if (part.type === 'literal') {
        return part.value.replace(NORMALIZED_SPACE_PATTERN, ' ');
      }

      return part.value;
    })
    .join('')
    .replace(NORMALIZED_SPACE_PATTERN, ' ')
    .trim()}`;
};
