export type CreditNoteSourceLine = Readonly<{
  sourceInvoiceLineId: string;
  description: string;
  quantity: number;
  unit: string | null;
  unitPriceHtCents: number;
  tvaRate: number;
  sourceTotalHtCents: number;
}>;

export type CreditNoteDraftLineValues = CreditNoteSourceLine & {
  amountHtCents: string | number;
};

export type CreditNoteDraftLine = CreditNoteSourceLine & {
  amountHtCents: number;
};

export type CreditNoteDraftLineError = {
  path: string;
  code: string;
  message: string;
};

export type CreditNoteDraftLineParseResult =
  | {
      success: false;
      errors: CreditNoteDraftLineError[];
    }
  | {
      success: true;
      line: CreditNoteDraftLine;
    };

export type CreditNoteDraftLineInput = {
  sourceLine: CreditNoteSourceLine;
  values: CreditNoteDraftLineValues;
};

const INTEGER_CENTS_PATTERN = /^\d+$/;

const immutableFields = [
  'sourceInvoiceLineId',
  'description',
  'quantity',
  'unit',
  'unitPriceHtCents',
  'tvaRate',
  'sourceTotalHtCents',
] as const satisfies readonly (keyof CreditNoteSourceLine)[];

const addError = (
  errors: CreditNoteDraftLineError[],
  path: string,
  code: string,
  message: string,
) => {
  errors.push({ path, code, message });
};

const isNonNegativeSafeInteger = (value: number): boolean =>
  Number.isSafeInteger(value) && value >= 0;

const parseAmountHtCents = (value: string | number): number | null => {
  if (typeof value === 'number') {
    return isNonNegativeSafeInteger(value) ? value : null;
  }

  const normalized = value.trim();

  if (!INTEGER_CENTS_PATTERN.test(normalized)) {
    return null;
  }

  const amountHtCents = Number(normalized);

  return isNonNegativeSafeInteger(amountHtCents) ? amountHtCents : null;
};

export const validateCreditNoteDraftLine = ({
  sourceLine,
  values,
}: CreditNoteDraftLineInput): CreditNoteDraftLineParseResult => {
  const errors: CreditNoteDraftLineError[] = [];
  const amountHtCents = parseAmountHtCents(values.amountHtCents);

  for (const field of immutableFields) {
    if (!Object.is(values[field], sourceLine[field])) {
      addError(
        errors,
        field,
        'IMMUTABLE_SOURCE_FIELD',
        'Les valeurs de la ligne source ne peuvent pas être modifiées.',
      );
    }
  }

  if (!isNonNegativeSafeInteger(sourceLine.sourceTotalHtCents)) {
    addError(
      errors,
      'sourceTotalHtCents',
      'SOURCE_TOTAL_HT_CENTS_INVALID',
      'Le total HT de la ligne source est invalide.',
    );
  }

  if (amountHtCents === null) {
    addError(
      errors,
      'amountHtCents',
      'AMOUNT_HT_CENTS_INVALID',
      'Le montant HT doit être un nombre entier positif ou nul de centimes.',
    );
  } else if (amountHtCents > sourceLine.sourceTotalHtCents) {
    addError(
      errors,
      'amountHtCents',
      'AMOUNT_HT_CENTS_EXCEEDS_SOURCE_TOTAL',
      'Le montant HT ne peut pas dépasser le total HT de la ligne source.',
    );
  }

  if (errors.length > 0 || amountHtCents === null) {
    return { success: false, errors };
  }

  return {
    success: true,
    line: {
      ...sourceLine,
      amountHtCents,
    },
  };
};
