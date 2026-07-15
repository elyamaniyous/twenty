import { parsePaymentForm, type PaymentFormValues } from '../paymentFormSchema';

const SOCIETE_ID = '11111111-1111-4111-8111-111111111111';
const TIER_ID = '22222222-2222-4222-8222-222222222222';

const validValues = (): PaymentFormValues => ({
  tierId: TIER_ID,
  amountCents: ' 12000 ',
  currency: 'MAD',
  paymentDate: '2026-07-12',
  method: 'BANK_TRANSFER',
  reference: '  VIR-2026-0042  ',
  notes: '  Rapprochement juillet  ',
});

const errorPaths = (result: ReturnType<typeof parsePaymentForm>) =>
  result.status === 'invalid' ? result.errors.map(({ path }) => path) : [];

describe('parsePaymentForm', () => {
  it('builds the exact API-native CreatePaymentDto in integer cents', () => {
    expect(
      parsePaymentForm({ societeId: SOCIETE_ID, values: validValues() }),
    ).toEqual({
      status: 'valid',
      payload: {
        societeId: SOCIETE_ID,
        tierId: TIER_ID,
        amountCents: 12_000,
        currency: 'MAD',
        paymentDate: '2026-07-12',
        method: 'BANK_TRANSFER',
        reference: 'VIR-2026-0042',
        notes: 'Rapprochement juillet',
      },
    });
  });

  it('accepts a numeric integer-cent form value without returning a MAD decimal', () => {
    const result = parsePaymentForm({
      societeId: SOCIETE_ID,
      values: { ...validValues(), amountCents: 12_000 },
    });

    expect(result).toMatchObject({
      status: 'valid',
      payload: { amountCents: 12_000 },
    });
    if (result.status === 'valid') {
      expect(result.payload).not.toHaveProperty('amount');
      expect(result.payload).not.toHaveProperty('amountMad');
    }
  });

  it('does not mutate form values while normalizing the payload', () => {
    const values = validValues();
    const snapshot = JSON.parse(JSON.stringify(values)) as PaymentFormValues;

    parsePaymentForm({ societeId: SOCIETE_ID, values });

    expect(values).toEqual(snapshot);
  });

  it.each(['CASH', 'DIRECT_DEBIT'] as const)(
    'normalizes blank optional reference and notes to null for %s',
    (method) => {
      const result = parsePaymentForm({
        societeId: SOCIETE_ID,
        values: {
          ...validValues(),
          method,
          reference: ' ',
          notes: '',
        },
      });

      expect(result).toMatchObject({
        status: 'valid',
        payload: { reference: null, notes: null },
      });
    },
  );

  it.each([
    ['tierId', { tierId: 'not-a-uuid' }],
    ['currency', { currency: 'EUR' }],
    ['paymentDate', { paymentDate: '2026-02-30' }],
    ['paymentDate', { paymentDate: '12/07/2026' }],
    ['method', { method: 'CRYPTO' }],
  ])('returns a deterministic %s error', (path, override) => {
    const result = parsePaymentForm({
      societeId: SOCIETE_ID,
      values: { ...validValues(), ...override } as PaymentFormValues,
    });

    expect(errorPaths(result)).toContain(path);
  });

  it.each([
    '0',
    '-1',
    '12000.00',
    '1e3',
    '',
    0,
    -1,
    1.5,
    Number.POSITIVE_INFINITY,
    Number.MAX_SAFE_INTEGER + 1,
  ])(
    'rejects a non-positive, non-integer, or unsafe amountCents %s',
    (amountCents) => {
      const result = parsePaymentForm({
        societeId: SOCIETE_ID,
        values: { ...validValues(), amountCents } as PaymentFormValues,
      });

      expect(errorPaths(result)).toContain('amountCents');
    },
  );

  it('rejects an amountCents above the API storage limit', () => {
    const result = parsePaymentForm({
      societeId: SOCIETE_ID,
      values: { ...validValues(), amountCents: 2_147_483_648 },
    });

    expect(errorPaths(result)).toEqual(['amountCents']);
  });

  it.each(['BANK_TRANSFER', 'CHECK', 'CARD', 'OTHER'] as const)(
    'requires a non-blank reference for %s',
    (method) => {
      const result = parsePaymentForm({
        societeId: SOCIETE_ID,
        values: { ...validValues(), method, reference: ' ' },
      });

      expect(errorPaths(result)).toContain('reference');
    },
  );
});
