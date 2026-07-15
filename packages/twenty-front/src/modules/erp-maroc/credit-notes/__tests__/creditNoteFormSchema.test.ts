import {
  validateCreditNoteDraftLine,
  type CreditNoteSourceLine,
} from '../creditNoteFormSchema';

const sourceLine: CreditNoteSourceLine = Object.freeze({
  sourceInvoiceLineId: 'c9c90690-4f4a-4e2e-91ce-3700f16a8ca2',
  description: 'Audit operationnel',
  quantity: 2,
  unit: 'jour',
  unitPriceHtCents: 50_000,
  tvaRate: 20,
  sourceTotalHtCents: 100_000,
});

const validValues = () => ({
  ...sourceLine,
  amountHtCents: ' 25000 ',
});

const errorCodes = (result: ReturnType<typeof validateCreditNoteDraftLine>) =>
  result.success ? [] : result.errors.map(({ code }) => code);

const errorsFor = (result: ReturnType<typeof validateCreditNoteDraftLine>) =>
  result.success ? [] : result.errors;

describe('validateCreditNoteDraftLine', () => {
  it('returns the source snapshot and normalized integer HT-cent amount for a valid edit', () => {
    expect(
      validateCreditNoteDraftLine({
        sourceLine,
        values: validValues(),
      }),
    ).toEqual({
      success: true,
      line: {
        ...sourceLine,
        amountHtCents: 25_000,
      },
    });
  });

  it('accepts a zero-cent amount because draft lines allow non-negative cents', () => {
    const result = validateCreditNoteDraftLine({
      sourceLine,
      values: { ...validValues(), amountHtCents: 0 },
    });

    expect(result).toEqual({
      success: true,
      line: { ...sourceLine, amountHtCents: 0 },
    });
  });

  it('rejects an amount that exceeds the source HT amount', () => {
    const result = validateCreditNoteDraftLine({
      sourceLine,
      values: {
        ...validValues(),
        amountHtCents: sourceLine.sourceTotalHtCents + 1,
      },
    });

    expect(result).toMatchObject({ success: false });
    expect(errorCodes(result)).toContain(
      'AMOUNT_HT_CENTS_EXCEEDS_SOURCE_TOTAL',
    );
    expect(errorsFor(result)).toContainEqual({
      path: 'amountHtCents',
      code: 'AMOUNT_HT_CENTS_EXCEEDS_SOURCE_TOTAL',
      message:
        'Le montant HT ne peut pas dépasser le total HT de la ligne source.',
    });
  });

  it.each([
    -1,
    '-1',
    100.5,
    '100.5',
    '1e3',
    '',
    Number.NaN,
    Number.MAX_SAFE_INTEGER + 1,
  ])('rejects invalid HT-cent amounts: %p', (amountHtCents) => {
    const result = validateCreditNoteDraftLine({
      sourceLine,
      values: { ...validValues(), amountHtCents },
    });

    expect(result).toMatchObject({ success: false });
    expect(errorCodes(result)).toContain('AMOUNT_HT_CENTS_INVALID');
    expect(errorsFor(result)).toContainEqual(
      expect.objectContaining({
        path: 'amountHtCents',
        code: 'AMOUNT_HT_CENTS_INVALID',
      }),
    );
  });

  it.each([
    ['sourceInvoiceLineId', 'other-line'],
    ['description', 'Description modifiee'],
    ['quantity', 3],
    ['unit', null],
    ['unitPriceHtCents', 60_000],
    ['tvaRate', 10],
    ['sourceTotalHtCents', 90_000],
  ] as const)('rejects an attempted update to immutable %s', (field, value) => {
    const values = { ...validValues(), [field]: value };
    const sourceSnapshot = JSON.parse(
      JSON.stringify(sourceLine),
    ) as CreditNoteSourceLine;
    const result = validateCreditNoteDraftLine({ sourceLine, values });

    expect(result).toMatchObject({ success: false });
    expect(errorsFor(result)).toContainEqual(
      expect.objectContaining({
        path: field,
        code: 'IMMUTABLE_SOURCE_FIELD',
      }),
    );
    expect(sourceLine).toEqual(sourceSnapshot);
  });

  it('rejects an invalid source-total snapshot even with a valid editable amount', () => {
    const invalidSourceLine = {
      ...sourceLine,
      sourceTotalHtCents: Number.NaN,
    };
    const result = validateCreditNoteDraftLine({
      sourceLine: invalidSourceLine,
      values: { ...invalidSourceLine, amountHtCents: 25_000 },
    });

    expect(result).toMatchObject({ success: false });
    expect(errorCodes(result)).toContain('SOURCE_TOTAL_HT_CENTS_INVALID');
    expect(errorsFor(result)).toContainEqual(
      expect.objectContaining({
        path: 'sourceTotalHtCents',
        code: 'SOURCE_TOTAL_HT_CENTS_INVALID',
      }),
    );
  });
});
