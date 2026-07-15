import { parseCivilDate } from '@/erp-maroc/utils/civilDate';

export type PaymentMethod =
  | 'BANK_TRANSFER'
  | 'CHECK'
  | 'CASH'
  | 'CARD'
  | 'DIRECT_DEBIT'
  | 'OTHER';

export type PaymentFormValues = {
  tierId: string;
  amountCents: string | number;
  currency: string;
  paymentDate: string;
  method: PaymentMethod | '' | null;
  reference: string | null;
  notes: string | null;
};

export type CreatePaymentDto = {
  societeId: string;
  tierId: string;
  amountCents: number;
  currency: 'MAD';
  paymentDate: string;
  method: PaymentMethod;
  reference: string | null;
  notes: string | null;
};

export type PaymentFormInput = {
  societeId: string;
  values: PaymentFormValues;
};

export type PaymentFormError = {
  path: string;
  code: string;
  message: string;
};

export type PaymentFormParseResult =
  | {
      status: 'invalid';
      errors: PaymentFormError[];
    }
  | {
      status: 'valid';
      payload: CreatePaymentDto;
    };

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const INTEGER_CENTS_PATTERN = /^\d+$/;
const MAX_API_AMOUNT_CENTS = 2_147_483_647;
const PAYMENT_METHODS: ReadonlySet<PaymentMethod> = new Set([
  'BANK_TRANSFER',
  'CHECK',
  'CASH',
  'CARD',
  'DIRECT_DEBIT',
  'OTHER',
]);
const REFERENCE_REQUIRED_METHODS: ReadonlySet<PaymentMethod> = new Set([
  'BANK_TRANSFER',
  'CHECK',
  'CARD',
  'OTHER',
]);

const addError = (
  errors: PaymentFormError[],
  path: string,
  code: string,
  message: string,
) => {
  errors.push({ path, code, message });
};

const optionalText = (value: string | null) => {
  const normalized = value?.trim() ?? '';
  return normalized.length === 0 ? null : normalized;
};

const isValidCivilDate = (value: string) => {
  try {
    parseCivilDate(value);
    return true;
  } catch {
    return false;
  }
};

const parseAmountCents = (value: string | number): number | null => {
  if (typeof value === 'number') {
    return Number.isSafeInteger(value) &&
      value > 0 &&
      value <= MAX_API_AMOUNT_CENTS
      ? value
      : null;
  }

  const normalized = value.trim();
  if (!INTEGER_CENTS_PATTERN.test(normalized)) {
    return null;
  }

  const amountCents = Number(normalized);
  return Number.isSafeInteger(amountCents) &&
    amountCents > 0 &&
    amountCents <= MAX_API_AMOUNT_CENTS
    ? amountCents
    : null;
};

const isPaymentMethod = (value: string): value is PaymentMethod =>
  PAYMENT_METHODS.has(value as PaymentMethod);

export const parsePaymentForm = (
  input: PaymentFormInput,
): PaymentFormParseResult => {
  const { values } = input;
  const errors: PaymentFormError[] = [];
  const societeId = input.societeId.trim();
  const tierId = values.tierId.trim();
  const paymentDate = values.paymentDate.trim();
  const method = values.method?.trim() ?? '';
  const paymentMethod = isPaymentMethod(method) ? method : null;
  const reference = optionalText(values.reference);
  const notes = optionalText(values.notes);
  const amountCents = parseAmountCents(values.amountCents);

  if (!UUID_PATTERN.test(societeId)) {
    addError(
      errors,
      'societeId',
      'SOCIETE_ID_INVALID',
      "L'identifiant société est invalide.",
    );
  }

  if (!UUID_PATTERN.test(tierId)) {
    addError(errors, 'tierId', 'TIER_ID_INVALID', 'Le tiers est requis.');
  }

  if (amountCents === null) {
    addError(
      errors,
      'amountCents',
      'AMOUNT_CENTS_INVALID',
      'Le montant doit être un nombre entier positif de centimes.',
    );
  }

  if (values.currency !== 'MAD') {
    addError(
      errors,
      'currency',
      'CURRENCY_MUST_BE_MAD',
      'La devise doit être MAD.',
    );
  }

  if (!isValidCivilDate(paymentDate)) {
    addError(
      errors,
      'paymentDate',
      'PAYMENT_DATE_INVALID',
      'La date de paiement est invalide.',
    );
  }

  if (paymentMethod === null) {
    addError(
      errors,
      'method',
      'PAYMENT_METHOD_INVALID',
      'Le mode de paiement est invalide.',
    );
  } else if (
    REFERENCE_REQUIRED_METHODS.has(paymentMethod) &&
    reference === null
  ) {
    addError(
      errors,
      'reference',
      'PAYMENT_REFERENCE_REQUIRED',
      'La référence est requise pour ce mode de paiement.',
    );
  }

  if (errors.length > 0 || paymentMethod === null) {
    return { status: 'invalid', errors };
  }

  return {
    status: 'valid',
    payload: {
      societeId,
      tierId,
      amountCents: amountCents as number,
      currency: 'MAD',
      paymentDate,
      method: paymentMethod,
      reference,
      notes,
    },
  };
};
