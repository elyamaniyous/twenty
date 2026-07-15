import { parseCivilDate } from '@/erp-maroc/utils/civilDate';
import { parseMadDecimalToTransportNumber } from '@/erp-maroc/utils/money';

export type QuoteFormLineValues = {
  productId?: string | null;
  description: string;
  unit?: string | null;
  quantity: string | number;
  unitPriceHt: string;
  tvaRate: string | number;
};

export type QuoteFormValues = {
  tierId: string;
  title: string;
  currency: string;
  issueDate: string;
  validUntil: string | null;
  notes: string | null;
  lines: QuoteFormLineValues[];
};

export type QuoteLineInputDto = {
  productId?: string | null;
  description: string;
  unit?: string | null;
  quantity: number;
  unitPriceHt: number;
  tvaRate: number;
};

export type CreateQuoteDto = {
  societeId: string;
  tierId: string;
  title: string;
  currency: 'MAD';
  issueDate: string;
  validUntil?: string | null;
  notes?: string | null;
  twentyOpportunityId?: string | null;
  twentyCompanyId?: string | null;
  twentyPersonId?: string | null;
  lines: QuoteLineInputDto[];
};

export type UpdateQuoteDto = {
  tierId?: string;
  title?: string;
  currency?: 'MAD';
  issueDate?: string;
  validUntil?: string | null;
  notes?: string | null;
  lines?: QuoteLineInputDto[];
};

export type QuoteFormInput =
  | {
      mode: 'manual-create';
      societeId: string;
      values: QuoteFormValues;
    }
  | {
      mode: 'draft-edit';
      source: 'manual' | 'opportunity';
      values: QuoteFormValues;
    };

export type QuoteFormError = {
  path: string;
  code: string;
  message: string;
};

export type QuoteFormParseResult =
  | {
      status: 'invalid';
      errors: QuoteFormError[];
    }
  | {
      status: 'valid';
      mode: 'manual-create';
      payload: CreateQuoteDto;
    }
  | {
      status: 'valid';
      mode: 'draft-edit';
      payload: UpdateQuoteDto;
    };

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TVA_RATES = new Set([0, 7, 10, 14, 20]);

const addError = (
  errors: QuoteFormError[],
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
  line: QuoteFormLineValues,
  index: number,
  errors: QuoteFormError[],
): QuoteLineInputDto | null => {
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

export const parseQuoteForm = (input: QuoteFormInput): QuoteFormParseResult => {
  const { values } = input;
  const errors: QuoteFormError[] = [];
  const tierId = values.tierId.trim();
  const title = values.title.trim();
  const issueDate = values.issueDate.trim();
  const validUntil = optionalText(values.validUntil);
  const notes = optionalText(values.notes);

  if (input.mode === 'manual-create' && !UUID_PATTERN.test(input.societeId)) {
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

  const validUntilIsValid = validUntil === null || isValidCivilDate(validUntil);
  if (!validUntilIsValid) {
    addError(
      errors,
      'validUntil',
      'VALID_UNTIL_INVALID',
      'La date de validité est invalide.',
    );
  } else if (
    validUntil !== null &&
    issueDateIsValid &&
    validUntil < issueDate
  ) {
    addError(
      errors,
      'validUntil',
      'VALID_UNTIL_BEFORE_ISSUE_DATE',
      "La date de validité ne peut pas précéder la date d'émission.",
    );
  }

  const allowsEmptyLines =
    input.mode === 'draft-edit' && input.source === 'opportunity';
  if (values.lines.length === 0 && !allowsEmptyLines) {
    addError(
      errors,
      'lines',
      'LINE_REQUIRED',
      'Au moins une ligne est requise.',
    );
  }

  const lines = values.lines
    .map((line, index) => parseLine(line, index, errors))
    .filter((line): line is QuoteLineInputDto => line !== null);

  if (errors.length > 0) {
    return { status: 'invalid', errors };
  }

  const commonPayload = {
    tierId,
    title,
    currency: 'MAD' as const,
    issueDate,
    validUntil,
    notes,
    lines,
  };

  if (input.mode === 'manual-create') {
    return {
      status: 'valid',
      mode: 'manual-create',
      payload: {
        societeId: input.societeId,
        ...commonPayload,
        twentyOpportunityId: null,
        twentyCompanyId: null,
        twentyPersonId: null,
      },
    };
  }

  return {
    status: 'valid',
    mode: 'draft-edit',
    payload: commonPayload,
  };
};
