import {
  erpAccountingEntryPageSchema,
  erpAccountingEntrySchema,
  erpBalanceReportSchema,
  erpCreditNotePageSchema,
  erpCreditNoteSchema,
  erpContextSchema,
  erpEligibleInvoicePageSchema,
  erpInvoicePageSchema,
  erpInvoiceReadSchema,
  erpInvoiceSchema,
  erpGrandLivreReportSchema,
  erpLettrageMatchSchema,
  erpLettrageSuggestionsSchema,
  erpPaymentPageSchema,
  erpPaymentSchema,
  erpProductListSchema,
  erpProductSchema,
  erpPurchaseOrderListSchema,
  erpPurchaseOrderSchema,
  erpPurchaseReceiptListSchema,
  erpPurchaseReceiptSchema,
  erpQuoteListSchema,
  erpQuoteSchema,
  erpReminderPageSchema,
  erpReminderScanResultSchema,
  erpReminderSchema,
  erpTierListSchema,
  erpTierSchema,
} from 'twenty-shared/erp-maroc';

import {
  ERP_MAROC_ROUTE_POLICY,
  resolveErpRoute,
} from './erp-maroc-route-policy';

const id = '11111111-1111-4111-8111-111111111111';
const otherId = '22222222-2222-4222-8222-222222222222';
const uuidV7 = '0193f6ea-7c39-7aa2-8000-000000000000';

const requiredIdempotencyRoutes = new Set([
  'POST /payments',
  `POST /payments/${id}/allocate`,
  `POST /payments/${id}/terminate`,
  'POST /credit-notes',
  `PATCH /credit-notes/${id}`,
  `POST /credit-notes/${id}/validate`,
  `POST /credit-notes/${id}/allocate`,
  `POST /credit-notes/${id}/cancel`,
  'POST /reminders/scan',
  `POST /reminders/${id}/approve`,
  `POST /reminders/${id}/cancel`,
  `POST /accounting/entries/${id}/validate`,
  `POST /accounting/entries/${id}/reject`,
  'POST /accounting/lettrage/match',
  'POST /accounting/lettrage/unmatch',
]);

const approvedRoutes = [
  ['GET', '/context', 'context', erpContextSchema],
  ['GET', '/products', 'products.collection', erpProductListSchema],
  ['POST', '/products', 'products.collection', erpProductSchema],
  ['GET', `/products/${id}`, 'products.detail', erpProductSchema],
  ['PATCH', `/products/${id}`, 'products.detail', erpProductSchema],
  ['DELETE', `/products/${id}`, 'products.detail', erpProductSchema],
  ['GET', '/tiers', 'tiers.collection', erpTierListSchema],
  ['POST', '/tiers', 'tiers.collection', erpTierSchema],
  [
    'POST',
    '/tiers/sync-from-twenty-company',
    'tiers.syncFromTwentyCompany',
    erpTierSchema,
  ],
  ['GET', `/tiers/${id}`, 'tiers.detail', erpTierSchema],
  ['PATCH', `/tiers/${id}`, 'tiers.detail', erpTierSchema],
  ['GET', '/quotes', 'quotes.collection', erpQuoteListSchema],
  ['POST', '/quotes', 'quotes.collection', erpQuoteSchema],
  [
    'POST',
    '/quotes/from-opportunity',
    'quotes.fromOpportunity',
    erpQuoteSchema,
  ],
  ['GET', `/quotes/${id}`, 'quotes.detail', erpQuoteSchema],
  ['PATCH', `/quotes/${id}`, 'quotes.detail', erpQuoteSchema],
  ['POST', `/quotes/${id}/send`, 'quotes.send', erpQuoteSchema],
  ['POST', `/quotes/${id}/accept`, 'quotes.accept', erpQuoteSchema],
  ['POST', `/quotes/${id}/reject`, 'quotes.reject', erpQuoteSchema],
  [
    'GET',
    '/purchase-orders',
    'purchase-orders.collection',
    erpPurchaseOrderListSchema,
  ],
  [
    'POST',
    '/purchase-orders',
    'purchase-orders.collection',
    erpPurchaseOrderSchema,
  ],
  [
    'GET',
    `/purchase-orders/${id}`,
    'purchase-orders.detail',
    erpPurchaseOrderSchema,
  ],
  [
    'POST',
    `/purchase-orders/${id}/confirm`,
    'purchase-orders.confirm',
    erpPurchaseOrderSchema,
  ],
  [
    'POST',
    `/purchase-orders/${id}/cancel`,
    'purchase-orders.cancel',
    erpPurchaseOrderSchema,
  ],
  [
    'GET',
    `/purchase-orders/${id}/receipts`,
    'purchase-orders.receipts',
    erpPurchaseReceiptListSchema,
  ],
  [
    'POST',
    `/purchase-orders/${id}/receipts`,
    'purchase-orders.receipts',
    erpPurchaseReceiptSchema,
  ],
  ['GET', '/invoices', 'invoices.collection', erpInvoicePageSchema],
  ['POST', '/invoices', 'invoices.collection', erpInvoiceSchema],
  [
    'POST',
    `/invoices/from-quote/${id}`,
    'invoices.fromQuote',
    erpInvoiceSchema,
  ],
  ['GET', `/invoices/${id}`, 'invoices.detail', erpInvoiceReadSchema],
  ['PATCH', `/invoices/${id}`, 'invoices.detail', erpInvoiceSchema],
  ['POST', `/invoices/${id}/validate`, 'invoices.validate', erpInvoiceSchema],
  ['POST', `/invoices/${id}/send`, 'invoices.send', erpInvoiceSchema],
  ['GET', `/invoices/${id}/pdf`, 'invoices.pdf', undefined],
  ['GET', '/payments', 'payments.collection', erpPaymentPageSchema],
  ['POST', '/payments', 'payments.collection', erpPaymentSchema],
  ['GET', `/payments/${id}`, 'payments.detail', erpPaymentSchema],
  [
    'GET',
    `/payments/${id}/eligible-invoices`,
    'payments.eligibleInvoices',
    erpEligibleInvoicePageSchema,
  ],
  ['POST', `/payments/${id}/allocate`, 'payments.allocate', erpPaymentSchema],
  ['POST', `/payments/${id}/terminate`, 'payments.terminate', erpPaymentSchema],
  ['GET', '/credit-notes', 'credit-notes.collection', erpCreditNotePageSchema],
  ['POST', '/credit-notes', 'credit-notes.collection', erpCreditNoteSchema],
  ['GET', `/credit-notes/${id}`, 'credit-notes.detail', erpCreditNoteSchema],
  ['PATCH', `/credit-notes/${id}`, 'credit-notes.detail', erpCreditNoteSchema],
  [
    'POST',
    `/credit-notes/${id}/validate`,
    'credit-notes.validate',
    erpCreditNoteSchema,
  ],
  [
    'GET',
    `/credit-notes/${id}/eligible-invoices`,
    'credit-notes.eligibleInvoices',
    erpEligibleInvoicePageSchema,
  ],
  [
    'POST',
    `/credit-notes/${id}/allocate`,
    'credit-notes.allocate',
    erpCreditNoteSchema,
  ],
  [
    'POST',
    `/credit-notes/${id}/cancel`,
    'credit-notes.cancel',
    erpCreditNoteSchema,
  ],
  ['GET', '/reminders', 'reminders.collection', erpReminderPageSchema],
  ['POST', '/reminders/scan', 'reminders.scan', erpReminderScanResultSchema],
  ['GET', `/reminders/${id}`, 'reminders.detail', erpReminderSchema],
  ['POST', `/reminders/${id}/approve`, 'reminders.approve', erpReminderSchema],
  ['POST', `/reminders/${id}/cancel`, 'reminders.cancel', erpReminderSchema],
  [
    'GET',
    '/accounting/entries',
    'accounting.entries.collection',
    erpAccountingEntryPageSchema,
  ],
  [
    'GET',
    `/accounting/entries/${id}`,
    'accounting.entries.detail',
    erpAccountingEntrySchema,
  ],
  [
    'POST',
    `/accounting/entries/${id}/validate`,
    'accounting.entries.validate',
    erpAccountingEntrySchema,
  ],
  [
    'POST',
    `/accounting/entries/${id}/reject`,
    'accounting.entries.reject',
    erpAccountingEntrySchema,
  ],
  [
    'GET',
    '/accounting/grand-livre',
    'accounting.grand-livre',
    erpGrandLivreReportSchema,
  ],
  ['GET', '/accounting/balance', 'accounting.balance', erpBalanceReportSchema],
  [
    'GET',
    '/accounting/lettrage/suggestions',
    'accounting.lettrage.suggestions',
    erpLettrageSuggestionsSchema,
  ],
  [
    'POST',
    '/accounting/lettrage/match',
    'accounting.lettrage.match',
    erpLettrageMatchSchema,
  ],
  [
    'POST',
    '/accounting/lettrage/unmatch',
    'accounting.lettrage.unmatch',
    erpLettrageMatchSchema,
  ],
] as const;

describe('ERP Maroc route policy', () => {
  it.each(approvedRoutes)(
    'allows %s %s through the declared route %s',
    (method, path, routeId, responseSchema) => {
      const requiresAccountCode =
        routeId === 'accounting.grand-livre' ||
        routeId === 'accounting.lettrage.suggestions';
      const query = requiresAccountCode ? { accountCode: '3421' } : {};
      const resolved = resolveErpRoute(method, path, query);

      expect(resolved.routeId).toBe(routeId);
      expect(resolved.upstreamPath).toBe(
        requiresAccountCode ? `${path}?accountCode=3421` : path,
      );
      expect(resolved.kind).toBe(routeId === 'invoices.pdf' ? 'pdf' : 'json');
      expect(resolved.idempotency).toBe(
        requiredIdempotencyRoutes.has(`${method} ${path}`)
          ? 'required'
          : 'forbidden',
      );
      if (responseSchema !== undefined) {
        expect(resolved.responseSchema).toBe(responseSchema);
      }
    },
  );

  it('exports a deeply immutable policy with one entry per approved method/path', () => {
    expect(ERP_MAROC_ROUTE_POLICY).toHaveLength(approvedRoutes.length);
    expect(Object.isFrozen(ERP_MAROC_ROUTE_POLICY)).toBe(true);
    for (const route of ERP_MAROC_ROUTE_POLICY) {
      expect(Object.isFrozen(route)).toBe(true);
      expect(Object.isFrozen(route.queryKeys)).toBe(true);
    }
  });

  it('accepts UUID v7 exactly as the shared uuidSchema does', () => {
    expect(resolveErpRoute('GET', `/products/${uuidV7}`, {})).toMatchObject({
      routeId: 'products.detail',
      upstreamPath: `/products/${uuidV7}`,
    });
  });

  it.each([
    ['GET', '/organisations'],
    ['POST', '/organisations'],
    ['DELETE', `/payments/${id}`],
    ['PUT', '/products'],
    ['TRACE', '/context'],
    ['GET', '/products/'],
    ['GET', '/products//'],
    ['GET', `/products/${id}/${id}`],
    ['GET', `/products/${id}/${otherId}`],
    ['GET', '/products/not-a-uuid'],
    ['GET', '/products/11111111-1111-1111-1111-111111111111'],
    ['GET', '/credit-notes/not-a-uuid'],
    ['GET', '/credit-notes/%2e%2e'],
    ['GET', `/credit-notes/${id}/%2feligible-invoices`],
    ['GET', '/products/%2e%2e'],
    ['GET', '/products/%252e%252e'],
    ['GET', '/products/%2fcontext'],
    ['GET', '/products/%5ccontext'],
    ['GET', '/products\\context'],
    ['GET', 'https://attacker.test/products'],
    ['GET', '//attacker.test/products'],
    ['GET', 'http:/attacker.test/products'],
    ['GET', '/products#fragment'],
    ['GET', '/products?limit=1'],
    ['GET', '/products/%'],
    ['GET', '/products/%GG'],
  ])('rejects %s %s', (method, path) => {
    expect(() => resolveErpRoute(method, path, {})).toThrow(
      'ERP route is not allowed',
    );
  });

  it('builds query strings only from normalized allowlisted values', () => {
    expect(
      resolveErpRoute('GET', '/payments', {
        status: 'POSTED',
        kind: 'RECEIPT',
        method: 'BANK_TRANSFER',
        tierId: id,
        invoiceId: otherId,
        from: '2026-07-01',
        to: '2026-07-31',
        cursor: id,
        limit: '100',
      }).upstreamPath,
    ).toBe(
      `/payments?status=POSTED&kind=RECEIPT&method=BANK_TRANSFER&tierId=${id}&invoiceId=${otherId}&from=2026-07-01&to=2026-07-31&cursor=${id}&limit=100`,
    );
    expect(
      resolveErpRoute('GET', '/invoices', { cursor: id, limit: '50' })
        .upstreamPath,
    ).toBe(`/invoices?cursor=${id}&limit=50`);
    expect(
      resolveErpRoute('GET', `/payments/${id}/eligible-invoices`, {
        cursor: otherId,
        limit: '25',
      }).upstreamPath,
    ).toBe(`/payments/${id}/eligible-invoices?cursor=${otherId}&limit=25`);
    expect(
      resolveErpRoute('GET', '/credit-notes', {
        status: 'VALIDATED',
        tierId: id,
        invoiceId: otherId,
        from: '2026-07-01',
        to: '2026-07-31',
        cursor: id,
        limit: '100',
      }).upstreamPath,
    ).toBe(
      `/credit-notes?status=VALIDATED&tierId=${id}&invoiceId=${otherId}&from=2026-07-01&to=2026-07-31&cursor=${id}&limit=100`,
    );
    expect(
      resolveErpRoute('GET', `/credit-notes/${id}/eligible-invoices`, {
        cursor: otherId,
        limit: '25',
      }).upstreamPath,
    ).toBe(`/credit-notes/${id}/eligible-invoices?cursor=${otherId}&limit=25`);
    expect(
      resolveErpRoute('GET', '/reminders', {
        status: 'PROPOSED',
        level: 'LEVEL_1',
        cursor: id,
        limit: '10',
      }).upstreamPath,
    ).toBe(`/reminders?status=PROPOSED&level=LEVEL_1&cursor=${id}&limit=10`);
    expect(
      resolveErpRoute('GET', '/accounting/entries', {
        status: 'DRAFT',
        sourceType: 'INVOICE',
        from: '2026-07-01',
        to: '2026-07-31',
        cursor: id,
        limit: '25',
      }).upstreamPath,
    ).toBe(
      `/accounting/entries?status=DRAFT&sourceType=INVOICE&from=2026-07-01&to=2026-07-31&cursor=${id}&limit=25`,
    );
    expect(
      resolveErpRoute('GET', '/accounting/grand-livre', {
        accountCode: '3421',
        from: '2026-07-01',
        to: '2026-07-31',
        includeDraft: 'true',
      }).upstreamPath,
    ).toBe(
      '/accounting/grand-livre?accountCode=3421&from=2026-07-01&to=2026-07-31&includeDraft=true',
    );
    expect(
      resolveErpRoute('GET', '/accounting/balance', {
        from: '2026-07-01',
        to: '2026-07-31',
      }).upstreamPath,
    ).toBe('/accounting/balance?from=2026-07-01&to=2026-07-31');
    expect(
      resolveErpRoute('GET', '/accounting/lettrage/suggestions', {
        accountCode: '3421',
      }).upstreamPath,
    ).toBe('/accounting/lettrage/suggestions?accountCode=3421');
  });

  it.each([
    ['/products', { limit: '10' }],
    ['/invoices', { surprise: '1' }],
    ['/invoices', { limit: '01' }],
    ['/invoices', { limit: ' 1' }],
    ['/invoices', { limit: '101' }],
    ['/invoices', { cursor: 'not-a-uuid' }],
    ['/payments', { status: 'posted' }],
    ['/credit-notes', { status: 'POSTED' }],
    ['/credit-notes', { surprise: '1' }],
    [`/credit-notes/${id}/eligible-invoices`, { status: 'VALIDATED' }],
    ['/payments', { method: 'WIRE' }],
    ['/payments', { from: '2026-07-31', to: '2026-07-01' }],
    ['/reminders', { level: 'LEVEL_4' }],
    ['/reminders', { status: ['PROPOSED', 'SENT'] }],
    ['/reminders', { limit: 10 }],
    ['/accounting/entries', { status: 'POSTED' }],
    ['/accounting/entries', { sourceType: 'QUOTE' }],
    ['/accounting/grand-livre', {}],
    ['/accounting/grand-livre', { accountCode: '3421/../admin' }],
    ['/accounting/grand-livre', { accountCode: '3421', includeDraft: 'false' }],
    ['/accounting/balance', { includeDraft: 'yes' }],
    ['/accounting/balance', { from: '2026-07-31', to: '2026-07-01' }],
    ['/accounting/lettrage/suggestions', {}],
    ['/accounting/lettrage/suggestions', { accountCode: '3421/../admin' }],
  ])('rejects non-normalized or unauthorized query for %s', (path, query) => {
    expect(() => resolveErpRoute('GET', path, query)).toThrow(
      'ERP route is not allowed',
    );
  });

  it('rejects duplicate URLSearchParams keys', () => {
    const query = new URLSearchParams();
    query.append('limit', '10');
    query.append('limit', '20');

    expect(() => resolveErpRoute('GET', '/invoices', query)).toThrow(
      'ERP route is not allowed',
    );
  });
});
