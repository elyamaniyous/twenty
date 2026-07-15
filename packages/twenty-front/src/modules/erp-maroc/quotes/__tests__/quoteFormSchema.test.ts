import {
  parseQuoteForm,
  type QuoteFormValues,
} from '@/erp-maroc/quotes/quoteFormSchema';

const SOCIETE_ID = '11111111-1111-4111-8111-111111111111';
const TIER_ID = '22222222-2222-4222-8222-222222222222';
const PRODUCT_ID = '33333333-3333-4333-8333-333333333333';

const validValues = (): QuoteFormValues => ({
  tierId: TIER_ID,
  title: '  Offre annuelle  ',
  currency: 'MAD',
  issueDate: '2026-07-12',
  validUntil: '2026-08-12',
  notes: '  Conditions commerciales  ',
  lines: [
    {
      productId: PRODUCT_ID,
      description: '  Abonnement  ',
      unit: '  forfait  ',
      quantity: '2.5',
      unitPriceHt: '1 234,50',
      tvaRate: '20',
    },
  ],
});

const errorPaths = (result: ReturnType<typeof parseQuoteForm>) =>
  result.status === 'invalid' ? result.errors.map(({ path }) => path) : [];

describe('parseQuoteForm', () => {
  it('builds the exact CreateQuoteDto for a manual creation', () => {
    const values = validValues();

    expect(
      parseQuoteForm({ mode: 'manual-create', societeId: SOCIETE_ID, values }),
    ).toEqual({
      status: 'valid',
      mode: 'manual-create',
      payload: {
        societeId: SOCIETE_ID,
        tierId: TIER_ID,
        title: 'Offre annuelle',
        currency: 'MAD',
        issueDate: '2026-07-12',
        validUntil: '2026-08-12',
        notes: 'Conditions commerciales',
        twentyOpportunityId: null,
        twentyCompanyId: null,
        twentyPersonId: null,
        lines: [
          {
            productId: PRODUCT_ID,
            description: 'Abonnement',
            unit: 'forfait',
            quantity: 2.5,
            unitPriceHt: 1234.5,
            tvaRate: 20,
          },
        ],
      },
    });
  });

  it('does not mutate form values while normalizing a payload', () => {
    const values = validValues();
    const snapshot = JSON.parse(JSON.stringify(values)) as QuoteFormValues;

    parseQuoteForm({ mode: 'manual-create', societeId: SOCIETE_ID, values });

    expect(values).toEqual(snapshot);
  });

  it('normalizes blank optional values to null', () => {
    const values = validValues();
    values.validUntil = ' ';
    values.notes = '';
    values.lines[0] = {
      ...values.lines[0],
      productId: '',
      unit: ' ',
    };

    const result = parseQuoteForm({
      mode: 'manual-create',
      societeId: SOCIETE_ID,
      values,
    });

    expect(result).toMatchObject({
      status: 'valid',
      payload: {
        validUntil: null,
        notes: null,
        lines: [{ productId: null, unit: null }],
      },
    });
  });

  it('builds an exact UpdateQuoteDto for a manual DRAFT edit', () => {
    const result = parseQuoteForm({
      mode: 'draft-edit',
      source: 'manual',
      values: validValues(),
    });

    expect(result.status).toBe('valid');
    if (result.status === 'valid') {
      expect(result.payload).not.toHaveProperty('societeId');
      expect(result.payload).not.toHaveProperty('twentyOpportunityId');
      expect(result.payload.lines).toHaveLength(1);
    }
  });

  it('permits an empty opportunity draft only in opportunity edit mode', () => {
    const values = { ...validValues(), lines: [] };

    expect(
      parseQuoteForm({
        mode: 'draft-edit',
        source: 'opportunity',
        values,
      }).status,
    ).toBe('valid');
    expect(
      errorPaths(
        parseQuoteForm({
          mode: 'draft-edit',
          source: 'manual',
          values,
        }),
      ),
    ).toContain('lines');
    expect(
      errorPaths(
        parseQuoteForm({
          mode: 'manual-create',
          societeId: SOCIETE_ID,
          values,
        }),
      ),
    ).toContain('lines');
  });

  it.each([
    ['tierId', { tierId: 'not-a-uuid' }],
    ['title', { title: '   ' }],
    ['currency', { currency: 'EUR' }],
    ['issueDate', { issueDate: '2026-02-30' }],
    ['validUntil', { validUntil: '12/08/2026' }],
  ])('returns a deterministic %s error', (path, override) => {
    const result = parseQuoteForm({
      mode: 'manual-create',
      societeId: SOCIETE_ID,
      values: { ...validValues(), ...override } as QuoteFormValues,
    });

    expect(errorPaths(result)).toContain(path);
  });

  it('rejects a validity date before the issue date', () => {
    const result = parseQuoteForm({
      mode: 'manual-create',
      societeId: SOCIETE_ID,
      values: { ...validValues(), validUntil: '2026-07-11' },
    });

    expect(errorPaths(result)).toContain('validUntil');
  });

  it.each([
    ['lines.0.description', { description: ' ' }],
    ['lines.0.quantity', { quantity: '0' }],
    ['lines.0.quantity', { quantity: 'Infinity' }],
    ['lines.0.unitPriceHt', { unitPriceHt: '-0.01' }],
    ['lines.0.unitPriceHt', { unitPriceHt: '1.005' }],
    ['lines.0.unitPriceHt', { unitPriceHt: '90071992547409.92' }],
    ['lines.0.tvaRate', { tvaRate: '19' }],
  ])('returns a deterministic line error at %s', (path, lineOverride) => {
    const values = validValues();
    values.lines[0] = { ...values.lines[0], ...lineOverride };

    const result = parseQuoteForm({
      mode: 'manual-create',
      societeId: SOCIETE_ID,
      values,
    });

    expect(errorPaths(result)).toContain(path);
  });

  it.each(['0', '7', '10', '14', '20'])('accepts TVA rate %s', (tvaRate) => {
    const values = validValues();
    values.lines[0] = { ...values.lines[0], tvaRate };

    expect(
      parseQuoteForm({ mode: 'manual-create', societeId: SOCIETE_ID, values })
        .status,
    ).toBe('valid');
  });

  it('accepts exact 0.29 MAD transport', () => {
    const values = validValues();
    values.lines[0] = { ...values.lines[0], unitPriceHt: '0.29' };

    const result = parseQuoteForm({
      mode: 'manual-create',
      societeId: SOCIETE_ID,
      values,
    });

    expect(result).toMatchObject({
      status: 'valid',
      payload: { lines: [{ unitPriceHt: 0.29 }] },
    });
  });

  it('returns errors in stable field then line order', () => {
    const values: QuoteFormValues = {
      ...validValues(),
      tierId: '',
      title: '',
      issueDate: '',
      lines: [
        {
          ...validValues().lines[0],
          description: '',
          quantity: '0',
        },
      ],
    };

    const result = parseQuoteForm({
      mode: 'manual-create',
      societeId: SOCIETE_ID,
      values,
    });

    expect(errorPaths(result)).toEqual([
      'tierId',
      'title',
      'issueDate',
      'lines.0.description',
      'lines.0.quantity',
    ]);
  });
});
