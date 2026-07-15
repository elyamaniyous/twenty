import {
  parseInvoiceForm,
  type InvoiceFormValues,
} from '@/erp-maroc/invoices/invoiceFormSchema';

const SOCIETE_ID = '11111111-1111-4111-8111-111111111111';
const TIER_ID = '22222222-2222-4222-8222-222222222222';
const PRODUCT_ID = '33333333-3333-4333-8333-333333333333';

const validValues = (): InvoiceFormValues => ({
  tierId: TIER_ID,
  title: '  Facture annuelle  ',
  currency: 'MAD',
  issueDate: '2026-07-12',
  dueDate: '2026-08-12',
  notes: '  Paiement à réception  ',
  paymentMethod: 'BANK_TRANSFER',
  paymentReference: '  BC-2026-0042  ',
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

const errorPaths = (result: ReturnType<typeof parseInvoiceForm>) =>
  result.status === 'invalid' ? result.errors.map(({ path }) => path) : [];

describe('parseInvoiceForm', () => {
  it('builds the exact CreateInvoiceDto for direct creation', () => {
    expect(
      parseInvoiceForm({
        mode: 'direct-create',
        societeId: SOCIETE_ID,
        values: validValues(),
      }),
    ).toEqual({
      status: 'valid',
      mode: 'direct-create',
      payload: {
        societeId: SOCIETE_ID,
        tierId: TIER_ID,
        title: 'Facture annuelle',
        currency: 'MAD',
        issueDate: '2026-07-12',
        dueDate: '2026-08-12',
        notes: 'Paiement à réception',
        paymentMethod: 'BANK_TRANSFER',
        paymentReference: 'BC-2026-0042',
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

  it('builds the exact UpdateInvoiceDto and permits an empty DRAFT edit', () => {
    const values = { ...validValues(), lines: [] };
    const result = parseInvoiceForm({ mode: 'draft-edit', values });

    expect(result).toEqual({
      status: 'valid',
      mode: 'draft-edit',
      payload: {
        tierId: TIER_ID,
        title: 'Facture annuelle',
        currency: 'MAD',
        issueDate: '2026-07-12',
        dueDate: '2026-08-12',
        notes: 'Paiement à réception',
        paymentMethod: 'BANK_TRANSFER',
        paymentReference: 'BC-2026-0042',
        lines: [],
      },
    });
  });

  it('does not mutate the input while normalizing the payload', () => {
    const values = validValues();
    const snapshot = JSON.parse(JSON.stringify(values)) as InvoiceFormValues;

    parseInvoiceForm({ mode: 'direct-create', societeId: SOCIETE_ID, values });

    expect(values).toEqual(snapshot);
  });

  it('normalizes blank nullable values to null', () => {
    const values = validValues();
    values.notes = ' ';
    values.paymentMethod = '';
    values.paymentReference = ' ';
    values.lines[0] = { ...values.lines[0], productId: '', unit: ' ' };

    expect(
      parseInvoiceForm({
        mode: 'direct-create',
        societeId: SOCIETE_ID,
        values,
      }),
    ).toMatchObject({
      status: 'valid',
      payload: {
        notes: null,
        paymentMethod: null,
        paymentReference: null,
        lines: [{ productId: null, unit: null }],
      },
    });
  });

  it('requires one line only for direct creation', () => {
    const values = { ...validValues(), lines: [] };

    expect(
      errorPaths(
        parseInvoiceForm({
          mode: 'direct-create',
          societeId: SOCIETE_ID,
          values,
        }),
      ),
    ).toContain('lines');
    expect(parseInvoiceForm({ mode: 'draft-edit', values }).status).toBe(
      'valid',
    );
  });

  it.each([
    ['societeId', { societeId: 'not-a-uuid' }],
    ['tierId', { tierId: 'not-a-uuid' }],
    ['title', { title: ' ' }],
    ['currency', { currency: 'EUR' }],
    ['issueDate', { issueDate: '2026-02-30' }],
    ['dueDate', { dueDate: '12/08/2026' }],
    ['paymentMethod', { paymentMethod: 'CRYPTO' }],
  ])('returns a deterministic %s error', (path, override) => {
    const values = validValues();
    const { societeId, ...valuesOverride } = override as Record<string, string>;
    const result = parseInvoiceForm({
      mode: 'direct-create',
      societeId: societeId ?? SOCIETE_ID,
      values: { ...values, ...valuesOverride } as InvoiceFormValues,
    });

    expect(errorPaths(result)).toContain(path);
  });

  it('rejects a due date before the issue date', () => {
    expect(
      errorPaths(
        parseInvoiceForm({
          mode: 'direct-create',
          societeId: SOCIETE_ID,
          values: { ...validValues(), dueDate: '2026-07-11' },
        }),
      ),
    ).toContain('dueDate');
  });

  it.each([
    ['lines.0.description', { description: ' ' }],
    ['lines.0.productId', { productId: 'bad-id' }],
    ['lines.0.quantity', { quantity: '0' }],
    ['lines.0.quantity', { quantity: 'Infinity' }],
    ['lines.0.unitPriceHt', { unitPriceHt: '-0.01' }],
    ['lines.0.unitPriceHt', { unitPriceHt: '1.005' }],
    ['lines.0.unitPriceHt', { unitPriceHt: '90071992547409.92' }],
    ['lines.0.tvaRate', { tvaRate: '19' }],
  ])('returns a deterministic line error at %s', (path, lineOverride) => {
    const values = validValues();
    values.lines[0] = { ...values.lines[0], ...lineOverride };

    expect(
      errorPaths(
        parseInvoiceForm({
          mode: 'direct-create',
          societeId: SOCIETE_ID,
          values,
        }),
      ),
    ).toContain(path);
  });

  it.each(['0', '7', '10', '14', '20'])('accepts TVA rate %s', (tvaRate) => {
    const values = validValues();
    values.lines[0] = { ...values.lines[0], tvaRate };

    expect(
      parseInvoiceForm({ mode: 'direct-create', societeId: SOCIETE_ID, values })
        .status,
    ).toBe('valid');
  });

  it('accepts exact 0.29 MAD transport', () => {
    const values = validValues();
    values.lines[0] = { ...values.lines[0], unitPriceHt: '0.29' };

    expect(
      parseInvoiceForm({
        mode: 'direct-create',
        societeId: SOCIETE_ID,
        values,
      }),
    ).toMatchObject({
      status: 'valid',
      payload: { lines: [{ unitPriceHt: 0.29 }] },
    });
  });

  it('returns errors in stable field then line order', () => {
    const result = parseInvoiceForm({
      mode: 'direct-create',
      societeId: 'bad-id',
      values: {
        ...validValues(),
        tierId: '',
        title: '',
        issueDate: '',
        lines: [{ ...validValues().lines[0], description: '', quantity: '0' }],
      },
    });

    expect(errorPaths(result)).toEqual([
      'societeId',
      'tierId',
      'title',
      'issueDate',
      'lines.0.description',
      'lines.0.quantity',
    ]);
  });
});
