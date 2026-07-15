import { parseCivilDate } from '@/erp-maroc/utils/civilDate';
import { parseMadDecimalToTransportNumber } from '@/erp-maroc/utils/money';

export type InvoiceFormLineValues = {
  productId?: string | null;
  description: string;
  unit?: string | null;
  quantity: string | number;
  unitPriceHt: string;
  tvaRate: string | number;
};

export type InvoicePaymentMethod =
  | 'BANK_TRANSFER'
  | 'CHECK'
  | 'CASH'
  | 'CARD'
  | 'DIRECT_DEBIT'
  | 'OTHER';

export type InvoiceFormValues = {
  tierId: string;
  title: string;
  currency: string;
  issueDate: string;
  dueDate: string;
  notes: string | null;
  paymentMethod: InvoicePaymentMethod | '' | null;
  paymentReference: string | null;
  lines: InvoiceFormLineValues[];
};

export type InvoiceLineInputDto = {
  productId?: string | null;
  description: string;
  unit?: string | null;
  quantity: number;
  unitPriceHt: number;
  tvaRate: number;
};

export type CreateInvoiceDto = {
  societeId: string;
  tierId: string;
  title: string;
  currency: 'MAD';
  issueDate: string;
  dueDate: string;
  notes?: string | null;
  paymentMethod?: InvoicePaymentMethod | null;
  paymentReference?: string | null;
  lines: InvoiceLineInputDto[];
};

export type UpdateInvoiceDto = {
  tierId?: string;
  title?: string;
  currency?: 'MAD';
  issueDate?: string;
  dueDate?: string;
  notes?: string | null;
  paymentMethod?: InvoicePaymentMethod | null;
  paymentReference?: string | null;
  lines?: InvoiceLineInputDto[];
};

export type InvoiceFormInput =
  | {
      mode: 'direct-create';
      societeId: string;
      values: InvoiceFormValues;
    }
  | {
      mode: 'draft-edit';
      values: InvoiceFormValues;
    };

export type InvoiceFormError = {
  path: string;
  code: string;
  message: string;
};

export type InvoiceFormParseResult =
  | {
      status: 'invalid';
      errors: InvoiceFormError[];
    }
  | {
      status: 'valid';
      mode: 'direct-create';
      payload: CreateInvoiceDto;
    }
  | {
      status: 'valid';
      mode: 'draft-edit';
      payload: UpdateInvoiceDto;
    };

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TVA_RATES = new Set([0, 7, 10, 14, 20]);
const PAYMENT_METHODS: ReadonlySet<InvoicePaymentMethod> = new Set([
  'BANK_TRANSFER',
  'CHECK',
  'CASH',
  'CARD',
  'DIRECT_DEBIT',
  'OTHER',
]);

const addError = (
  errors: InvoiceFormError[],
  path: string,
  code: string,
  message: string,
) => {
  errors.push({ path, code, message });
};

const optionalText = (value: string | null | undefined) => {
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

const parseLine = (
  line: InvoiceFormLineValues,
  index: number,
  errors: InvoiceFormError[],
): InvoiceLineInputDto | null => {
  const prefix = `lines.${index}`;
  const description = line.description.trim();
  const productId = optionalText(line.productId);
  const unit = optionalText(line.unit);
  const quantity =
    typeof line.quantity === 'number'
      ? line.quantity
      : Number(line.quantity.trim());
  const tvaRate =
    typeof line.tvaRate === 'number'
      ? line.tvaRate
      : Number(line.tvaRate.trim());

  if (description.length === 0) {
    addError(
      errors,
      `${prefix}.description`,
      'DESCRIPTION_REQUIRED',
      'La description est requise.',
    );
  }

  if (productId !== null && !UUID_PATTERN.test(productId)) {
    addError(
      errors,
      `${prefix}.productId`,
      'PRODUCT_ID_INVALID',
      "L'identifiant produit est invalide.",
    );
  }

  if (!Number.isFinite(quantity) || quantity <= 0) {
    addError(
      errors,
      `${prefix}.quantity`,
      'QUANTITY_INVALID',
      'La quantité doit être un nombre positif.',
    );
  }

  let unitPriceHt: number | null = null;
  try {
    unitPriceHt = parseMadDecimalToTransportNumber(line.unitPriceHt);
  } catch {
    addError(
      errors,
      `${prefix}.unitPriceHt`,
      'UNIT_PRICE_INVALID',
      'Le prix HT doit être un montant MAD positif à deux décimales maximum.',
    );
  }

  if (!Number.isInteger(tvaRate) || !TVA_RATES.has(tvaRate)) {
    addError(
      errors,
      `${prefix}.tvaRate`,
      'TVA_RATE_INVALID',
      'Le taux de TVA doit être 0, 7, 10, 14 ou 20.',
    );
  }

  if (
    description.length === 0 ||
    (productId !== null && !UUID_PATTERN.test(productId)) ||
    !Number.isFinite(quantity) ||
    quantity <= 0 ||
    unitPriceHt === null ||
    !Number.isInteger(tvaRate) ||
    !TVA_RATES.has(tvaRate)
  ) {
    return null;
  }

  return {
    productId,
    description,
    unit,
    quantity,
    unitPriceHt,
    tvaRate,
  };
};

export const parseInvoiceForm = (
  input: InvoiceFormInput,
): InvoiceFormParseResult => {
  const { values } = input;
  const errors: InvoiceFormError[] = [];
  const tierId = values.tierId.trim();
  const title = values.title.trim();
  const issueDate = values.issueDate.trim();
  const dueDate = values.dueDate.trim();
  const notes = optionalText(values.notes);
  const paymentReference = optionalText(values.paymentReference);
  const paymentMethod = values.paymentMethod || null;

  if (input.mode === 'direct-create' && !UUID_PATTERN.test(input.societeId)) {
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

  if (title.length === 0) {
    addError(errors, 'title', 'TITLE_REQUIRED', 'Le titre est requis.');
  }

  if (values.currency !== 'MAD') {
    addError(
      errors,
      'currency',
      'CURRENCY_MUST_BE_MAD',
      'La devise doit être MAD.',
    );
  }

  const issueDateIsValid = isValidCivilDate(issueDate);
  if (!issueDateIsValid) {
    addError(
      errors,
      'issueDate',
      'ISSUE_DATE_INVALID',
      "La date d'émission est invalide.",
    );
  }

  const dueDateIsValid = isValidCivilDate(dueDate);
  if (!dueDateIsValid) {
    addError(
      errors,
      'dueDate',
      'DUE_DATE_INVALID',
      "La date d'échéance est invalide.",
    );
  } else if (issueDateIsValid && dueDate < issueDate) {
    addError(
      errors,
      'dueDate',
      'DUE_DATE_BEFORE_ISSUE_DATE',
      "La date d'échéance ne peut pas précéder la date d'émission.",
    );
  }

  if (
    paymentMethod !== null &&
    !PAYMENT_METHODS.has(paymentMethod as InvoicePaymentMethod)
  ) {
    addError(
      errors,
      'paymentMethod',
      'PAYMENT_METHOD_INVALID',
      'Le mode de paiement est invalide.',
    );
  }

  if (input.mode === 'direct-create' && values.lines.length === 0) {
    addError(
      errors,
      'lines',
      'LINE_REQUIRED',
      'Au moins une ligne est requise.',
    );
  }

  const lines = values.lines
    .map((line, index) => parseLine(line, index, errors))
    .filter((line): line is InvoiceLineInputDto => line !== null);

  if (errors.length > 0) {
    return { status: 'invalid', errors };
  }

  const commonPayload = {
    tierId,
    title,
    currency: 'MAD' as const,
    issueDate,
    dueDate,
    notes,
    paymentMethod,
    paymentReference,
    lines,
  };

  if (input.mode === 'direct-create') {
    return {
      status: 'valid',
      mode: 'direct-create',
      payload: { societeId: input.societeId, ...commonPayload },
    };
  }

  return {
    status: 'valid',
    mode: 'draft-edit',
    payload: commonPayload,
  };
};
