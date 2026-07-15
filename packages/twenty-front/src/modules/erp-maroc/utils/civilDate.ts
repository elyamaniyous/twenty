const CIVIL_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const RFC_3339_INSTANT_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

export type CivilDateParts = {
  year: number;
  month: number;
  day: number;
};

const isLeapYear = (year: number) =>
  year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);

const daysInMonth = (year: number, month: number) => {
  if (month === 2) {
    return isLeapYear(year) ? 29 : 28;
  }

  return [4, 6, 9, 11].includes(month) ? 30 : 31;
};

export const parseCivilDate = (value: string): CivilDateParts => {
  const match = CIVIL_DATE_PATTERN.exec(value);

  if (match === null) {
    throw new TypeError('Civil date must use YYYY-MM-DD');
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (
    year < 1 ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > daysInMonth(year, month)
  ) {
    throw new RangeError('Civil date is not a valid calendar day');
  }

  return { year, month, day };
};

export const toCivilDateString = ({
  year,
  month,
  day,
}: CivilDateParts): string => {
  if (![year, month, day].every(Number.isInteger)) {
    throw new TypeError('Civil date parts must be integers');
  }

  const value = `${String(year).padStart(4, '0')}-${String(month).padStart(
    2,
    '0',
  )}-${String(day).padStart(2, '0')}`;

  parseCivilDate(value);

  return value;
};

export const formatCivilDate = (value: string): string => {
  const { year, month, day } = parseCivilDate(value);

  return `${String(day).padStart(2, '0')}/${String(month).padStart(
    2,
    '0',
  )}/${String(year).padStart(4, '0')}`;
};

export const formatInstantInTimeZone = (
  instant: string,
  timeZone: string,
): string => {
  if (!RFC_3339_INSTANT_PATTERN.test(instant)) {
    throw new TypeError('Instant must be an ISO/RFC 3339 timestamp');
  }

  const date = new Date(instant);

  if (Number.isNaN(date.getTime())) {
    throw new RangeError('Instant is not valid');
  }

  let formatter: Intl.DateTimeFormat;

  try {
    formatter = new Intl.DateTimeFormat('fr-MA', {
      timeZone,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    });
  } catch {
    throw new RangeError('Timezone must be a valid IANA identifier');
  }

  const parts = Object.fromEntries(
    formatter
      .formatToParts(date)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value]),
  );

  return `${parts.day}/${parts.month}/${parts.year} ${parts.hour}:${parts.minute}`;
};
