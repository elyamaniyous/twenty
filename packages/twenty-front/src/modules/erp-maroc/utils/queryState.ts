import { parseCivilDate } from './civilDate';

export type ErpQueryOperation =
  | 'products'
  | 'tiers'
  | 'quotes'
  | 'invoices'
  | 'payments'
  | 'creditNotes'
  | 'reminders'
  | 'accountingEntries'
  | 'accountingBalance'
  | 'accountingGrandLivre'
  | 'accountingLettrage';

type QueryInput =
  | string
  | URLSearchParams
  | Record<string, string | null | undefined>;

type QueryChanges = Record<string, string | null | undefined>;

type ParamRule = {
  defaultValue?: string;
  normalize?: (value: string) => string;
  validate: (value: string) => boolean;
};

const oneOf = (values: readonly string[]) => (value: string) =>
  values.includes(value);
const nonEmpty = (value: string) => value.length > 0 && value.length <= 256;
const normalizeText = (value: string) => value.trim();
const UUID_PATTERN =
  /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$/i;
const normalizeLimit = (value: string) =>
  /^\d+$/.test(value) ? value.replace(/^0+(?=\d)/, '') : value;
const validLimit = (value: string) => /^(?:[1-9]|[1-9]\d|100)$/.test(value);
const validCivilDate = (value: string) => {
  try {
    parseCivilDate(value);
    return true;
  } catch {
    return false;
  }
};

const textRule: ParamRule = {
  normalize: normalizeText,
  validate: nonEmpty,
};
const activeRule: ParamRule = {
  defaultValue: 'all',
  validate: oneOf(['active', 'inactive']),
};
const uuidRule: ParamRule = {
  normalize: normalizeText,
  validate: (value) => UUID_PATTERN.test(value),
};
const limitRule: ParamRule = {
  defaultValue: '50',
  normalize: normalizeLimit,
  validate: validLimit,
};

const queryRules: Record<
  ErpQueryOperation,
  ReadonlyArray<readonly [key: string, rule: ParamRule]>
> = {
  products: [
    ['search', textRule],
    ['active', activeRule],
  ],
  tiers: [
    ['search', textRule],
    [
      'type',
      {
        defaultValue: 'all',
        validate: oneOf(['CLIENT', 'FOURNISSEUR', 'MIXTE']),
      },
    ],
    ['active', activeRule],
    ['syncCompanyId', uuidRule],
    ['resumeOpportunityId', uuidRule],
  ],
  quotes: [
    [
      'status',
      {
        defaultValue: 'all',
        validate: oneOf([
          'DRAFT',
          'SENT',
          'ACCEPTED',
          'REJECTED',
          'EXPIRED',
          'CONVERTED',
        ]),
      },
    ],
    ['tierId', uuidRule],
    ['resumeOpportunityId', uuidRule],
  ],
  invoices: [
    [
      'status',
      {
        defaultValue: 'all',
        validate: oneOf([
          'DRAFT',
          'VALIDATED',
          'SENT',
          'PARTIALLY_PAID',
          'PAID',
          'OVERDUE',
          'CANCELLED',
        ]),
      },
    ],
    [
      'delivery',
      {
        defaultValue: 'all',
        validate: oneOf([
          'PENDING',
          'PROCESSING',
          'SENT',
          'FAILED',
          'RECONCILIATION_REQUIRED',
        ]),
      },
    ],
    ['cursor', uuidRule],
    ['limit', limitRule],
  ],
  payments: [
    [
      'status',
      {
        defaultValue: 'all',
        validate: oneOf([
          'PENDING_ALLOCATION',
          'POSTED',
          'REVERSED',
          'CANCELLED',
        ]),
      },
    ],
    ['kind', { defaultValue: 'all', validate: oneOf(['RECEIPT', 'REVERSAL']) }],
    [
      'method',
      {
        defaultValue: 'all',
        validate: oneOf([
          'CASH',
          'BANK_TRANSFER',
          'CHECK',
          'CARD',
          'DIRECT_DEBIT',
          'OTHER',
        ]),
      },
    ],
    ['tierId', uuidRule],
    ['invoiceId', uuidRule],
    ['from', { validate: validCivilDate }],
    ['to', { validate: validCivilDate }],
    ['cursor', uuidRule],
    ['limit', limitRule],
  ],
  creditNotes: [
    [
      'status',
      {
        defaultValue: 'all',
        validate: oneOf(['DRAFT', 'VALIDATED', 'CANCELLED']),
      },
    ],
    ['tierId', uuidRule],
    ['invoiceId', uuidRule],
    ['from', { validate: validCivilDate }],
    ['to', { validate: validCivilDate }],
    ['cursor', uuidRule],
    ['limit', limitRule],
  ],
  reminders: [
    [
      'status',
      {
        defaultValue: 'all',
        validate: oneOf([
          'PROPOSED',
          'APPROVED',
          'PROCESSING',
          'SENT',
          'CANCELLED',
          'SUPERSEDED',
          'FAILED',
          'RECONCILIATION_REQUIRED',
        ]),
      },
    ],
    [
      'level',
      {
        defaultValue: 'all',
        validate: oneOf(['LEVEL_1', 'LEVEL_2', 'LEVEL_3']),
      },
    ],
    ['cursor', uuidRule],
    ['limit', limitRule],
  ],
  accountingEntries: [
    [
      'status',
      {
        defaultValue: 'all',
        validate: oneOf(['DRAFT', 'VALIDATED', 'REJECTED']),
      },
    ],
    [
      'sourceType',
      {
        defaultValue: 'all',
        validate: oneOf(['INVOICE', 'PAYMENT', 'CREDIT_NOTE']),
      },
    ],
    ['from', { validate: validCivilDate }],
    ['to', { validate: validCivilDate }],
    ['cursor', uuidRule],
    ['limit', limitRule],
  ],
  accountingBalance: [
    ['from', { validate: validCivilDate }],
    ['to', { validate: validCivilDate }],
    [
      'includeDraft',
      { defaultValue: 'false', validate: oneOf(['true', 'false']) },
    ],
  ],
  accountingGrandLivre: [
    [
      'accountCode',
      {
        normalize: normalizeText,
        validate: (value) => /^[A-Za-z0-9][A-Za-z0-9.-]{0,31}$/.test(value),
      },
    ],
    ['from', { validate: validCivilDate }],
    ['to', { validate: validCivilDate }],
    [
      'includeDraft',
      { defaultValue: 'false', validate: oneOf(['true', 'false']) },
    ],
  ],
  accountingLettrage: [
    [
      'accountCode',
      {
        normalize: normalizeText,
        validate: (value) => /^[A-Za-z0-9][A-Za-z0-9.-]{0,31}$/.test(value),
      },
    ],
  ],
};

const toSearchParams = (input: QueryInput) => {
  if (input instanceof URLSearchParams) {
    return new URLSearchParams(input);
  }

  if (typeof input === 'string') {
    return new URLSearchParams(input.startsWith('?') ? input.slice(1) : input);
  }

  const params = new URLSearchParams();
  Object.entries(input).forEach(([key, value]) => {
    if (value !== null && value !== undefined) {
      params.set(key, value);
    }
  });
  return params;
};

export const canonicalizeErpQueryState = (
  operation: ErpQueryOperation,
  input: QueryInput,
): URLSearchParams => {
  const inputParams = toSearchParams(input);
  const output = new URLSearchParams();

  queryRules[operation].forEach(([key, rule]) => {
    const values = inputParams.getAll(key);
    const rawValue = values.at(-1);

    if (rawValue === undefined) {
      return;
    }

    const value = rule.normalize?.(rawValue) ?? rawValue;

    if (value === '' || value === rule.defaultValue || !rule.validate(value)) {
      return;
    }

    output.set(key, value);
  });

  if (
    (operation === 'payments' ||
      operation === 'creditNotes' ||
      operation === 'accountingEntries' ||
      operation === 'accountingBalance' ||
      operation === 'accountingGrandLivre') &&
    output.has('from') &&
    output.has('to') &&
    output.get('from')! > output.get('to')!
  ) {
    output.delete('from');
    output.delete('to');
  }

  return output;
};

export const updateErpQueryState = (
  operation: ErpQueryOperation,
  current: QueryInput,
  changes: QueryChanges,
): URLSearchParams => {
  const currentParams = canonicalizeErpQueryState(operation, current);
  const candidateParams = new URLSearchParams(currentParams);
  const allowedKeys = new Set(queryRules[operation].map(([key]) => key));

  Object.entries(changes).forEach(([key, rawValue]) => {
    if (!allowedKeys.has(key)) {
      return;
    }

    if (rawValue === null || rawValue === undefined || rawValue === '') {
      candidateParams.delete(key);
    } else {
      candidateParams.set(key, rawValue);
    }
  });

  const nextParams = canonicalizeErpQueryState(operation, candidateParams);
  const currentFilters = new URLSearchParams(currentParams);
  const nextFilters = new URLSearchParams(nextParams);

  currentFilters.delete('cursor');
  nextFilters.delete('cursor');

  if (currentFilters.toString() !== nextFilters.toString()) {
    nextParams.delete('cursor');
  }

  return nextParams;
};
