import {
  ERP_MAROC_API_BASE,
  centsSchema,
  civilDateSchema,
  decimalDatabaseNumberSchema,
  erpBalanceReportSchema,
  erpBankReconciliationCandidatesSchema,
  erpBankStatementLineSchema,
  erpCreditAllocationKindSchema,
  erpCreditNotePageSchema,
  erpCreditNoteSchema,
  erpCreditNoteStatusSchema,
  erpContextSchema,
  erpEligibleInvoicePageSchema,
  erpEligibleInvoiceSchema,
  erpErrorCodeSchema,
  erpErrorSchema,
  erpInvoiceEmailOutboxStatusSchema,
  erpInvoicePageSchema,
  erpInvoicePaymentMethodSchema,
  erpInvoicePdfGenerationStatusSchema,
  erpInvoiceReadSchema,
  erpInvoiceSchema,
  erpInvoiceStatusSchema,
  erpGrandLivreReportSchema,
  erpLettrageMatchSchema,
  erpLettrageSuggestionsSchema,
  erpMarocRouteIds,
  erpMarocUpstreamRoutes,
  erpPaymentKindSchema,
  erpPaymentMethodSchema,
  erpPaymentPageSchema,
  erpPaymentSchema,
  erpPaymentStatusSchema,
  erpProductListSchema,
  erpProductSchema,
  erpPurchaseOrderListSchema,
  erpPurchaseOrderSchema,
  erpPurchaseOrderStatusSchema,
  erpPurchaseReceiptListSchema,
  erpPurchaseReceiptSchema,
  erpSupplierInvoiceListSchema,
  erpSupplierInvoiceMatchStatusSchema,
  erpSupplierInvoiceSchema,
  erpSupplierInvoiceStatusSchema,
  erpSupplierInvoiceDetailSchema,
  erpSupplierPaymentPreparationListSchema,
  erpSupplierPaymentPreparationSchema,
  erpQuoteListSchema,
  erpQuoteSchema,
  erpQuoteStatusSchema,
  erpReminderLevelSchema,
  erpReminderPageSchema,
  erpReminderScanResultSchema,
  erpReminderSchema,
  erpReminderStatusSchema,
  erpRoleSchema,
  erpRoles,
  erpTierListSchema,
  erpTierSchema,
  erpTierTypeSchema,
  instantSchema,
  nonNegativeIntegerSchema,
  uuidSchema,
} from './erp-maroc-contracts';

const ids = {
  societe: '11111111-1111-4111-8111-111111111111',
  tier: '22222222-2222-4222-8222-222222222222',
  product: '33333333-3333-4333-8333-333333333333',
  quote: '44444444-4444-4444-8444-444444444444',
  purchaseOrder: '44444444-4444-4444-9444-444444444445',
  purchaseReceipt: '44444444-4444-4444-9444-444444444446',
  purchaseReceiptLine: '44444444-4444-4444-9444-444444444447',
  warehouse: '44444444-4444-4444-9444-444444444451',
  supplierInvoice: '44444444-4444-4444-9444-444444444448',
  supplierInvoiceLine: '44444444-4444-4444-9444-444444444449',
  supplierPaymentPreparation: '44444444-4444-4444-9444-444444444450',
  invoice: '55555555-5555-4555-8555-555555555555',
  payment: '66666666-6666-4666-8666-666666666666',
  reminder: '77777777-7777-4777-8777-777777777777',
  accountingEntry: '7aaaaaaa-7777-4777-8777-777777777777',
  accountingAccount: '7bbbbbbb-7777-4777-8777-777777777777',
  bankStatement: '7ccccccc-7777-4777-8777-777777777777',
  bankStatementLine: '7ddddddd-7777-4777-8777-777777777777',
  accountingLineTwo: '7ccccccc-7777-4777-8777-777777777777',
  accountingLettering: '7ddddddd-7777-4777-8777-777777777777',
  line: '88888888-8888-4888-8888-888888888888',
  task: '99999999-9999-4999-8999-999999999999',
  company: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  person: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  opportunity: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  reversal: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
  allocation: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
  creditNote: 'f1111111-1111-4111-8111-111111111111',
  creditLine: 'f2222222-2222-4222-8222-222222222222',
  creditAllocation: 'f3333333-3333-4333-8333-333333333333',
  customerCreditAllocation: 'f4444444-4444-4444-8444-444444444444',
} as const;

const instant = '2026-07-11T09:30:00.000Z';
const laterInstant = '2026-07-11T10:30:00+01:00';

const productJson = {
  id: ids.product,
  organisationId: 'internal-organisation-id',
  societeId: ids.societe,
  code: 'SERV-001',
  name: 'Conseil ERP',
  description: null,
  type: 'SERVICE',
  unit: 'HEURE',
  defaultPriceHt: '1200.00',
  tvaRate: 20,
  incomeAccountCode: '7124',
  expenseAccountCode: '6111',
  isActive: true,
  createdAt: instant,
  updatedAt: laterInstant,
};

const tierJson = {
  id: ids.tier,
  organisationId: 'internal-organisation-id',
  societeId: ids.societe,
  type: 'CLIENT',
  name: 'Atlas Distribution',
  email: 'billing@atlas.example',
  phone: '+212522000000',
  ice: '001234567890123',
  identifiantFiscal: 'IF-123',
  address: '10 rue Atlas',
  city: 'Casablanca',
  paymentDelayDays: 30,
  creditLimit: '50000.50',
  twentyCompanyId: ids.company,
  twentyPersonId: ids.person,
  compteCollectifCode: '3421',
  isActive: true,
  createdAt: instant,
  updatedAt: laterInstant,
};

const quoteLineJson = {
  id: ids.line,
  quoteId: ids.quote,
  productId: ids.product,
  description: 'Atelier ERP',
  unit: 'JOUR',
  quantity: 2.5,
  unitPriceHtCents: 120000,
  tvaRate: 20,
  totalHtCents: 300000,
  totalTvaCents: 60000,
  totalTtcCents: 360000,
  position: 0,
  createdAt: instant,
  updatedAt: laterInstant,
};

const quoteJson = {
  id: ids.quote,
  organisationId: 'internal-organisation-id',
  societeId: ids.societe,
  tierId: ids.tier,
  number: 'DEV-2026-0001',
  year: 2026,
  title: 'Déploiement ERP',
  currency: 'MAD',
  status: 'ACCEPTED',
  issueDate: '2026-07-10T00:00:00.000Z',
  validUntil: '2026-08-10T00:00:00.000Z',
  notes: null,
  totalHtCents: 300000,
  totalTvaCents: 60000,
  totalTtcCents: 360000,
  twentyOpportunityId: ids.opportunity,
  twentyCompanyId: ids.company,
  twentyPersonId: ids.person,
  opportunityEstimatedAmountCents: 360000,
  convertedInvoiceId: null,
  convertedAt: null,
  createdAt: instant,
  updatedAt: laterInstant,
  lines: [quoteLineJson],
};

const purchaseOrderJson = {
  id: ids.purchaseOrder,
  organisationId: 'internal-organisation-id',
  societeId: ids.societe,
  supplierId: ids.tier,
  number: 'BCF-2026-00001',
  year: 2026,
  currency: 'MAD',
  status: 'CONFIRMED',
  issueDate: '2026-07-10T00:00:00.000Z',
  expectedDeliveryDate: '2026-07-20T00:00:00.000Z',
  notes: null,
  totalHtCents: 300000,
  totalTvaCents: 60000,
  totalTtcCents: 360000,
  createdAt: instant,
  updatedAt: laterInstant,
  supplier: {
    id: ids.tier,
    name: 'Fournisseur Atlas',
    type: 'FOURNISSEUR',
    ice: '001122334455667',
  },
  lines: [
    {
      id: ids.line,
      purchaseOrderId: ids.purchaseOrder,
      productId: ids.product,
      description: 'Matériel de bureau',
      unit: 'UNITE',
      quantity: 2.5,
      quantityReceived: 1,
      unitPriceHtCents: 120000,
      tvaRate: 20,
      totalHtCents: 300000,
      totalTvaCents: 60000,
      totalTtcCents: 360000,
      position: 0,
      createdAt: instant,
      updatedAt: laterInstant,
    },
  ],
};

const purchaseReceiptJson = {
  id: ids.purchaseReceipt,
  organisationId: 'internal-organisation-id',
  societeId: ids.societe,
  purchaseOrderId: ids.purchaseOrder,
  warehouseId: ids.warehouse,
  number: 'BRF-2026-00001',
  year: 2026,
  receiptDate: '2026-07-16T00:00:00.000Z',
  notes: 'Livraison partielle',
  createdAt: instant,
  updatedAt: laterInstant,
  warehouse: {
    id: ids.warehouse,
    code: 'PRINCIPAL',
    name: 'Dépôt principal',
  },
  lines: [
    {
      id: ids.purchaseReceiptLine,
      purchaseReceiptId: ids.purchaseReceipt,
      purchaseOrderLineId: ids.line,
      quantity: 1,
      position: 0,
      createdAt: instant,
      updatedAt: laterInstant,
      purchaseOrderLine: {
        id: ids.line,
        productId: ids.product,
        description: 'Matériel de bureau',
        unit: 'UNITE',
        quantity: 2.5,
      },
    },
  ],
};

const supplierInvoiceJson = {
  id: ids.supplierInvoice,
  organisationId: 'internal-organisation-id',
  societeId: ids.societe,
  purchaseOrderId: ids.purchaseOrder,
  supplierId: ids.tier,
  externalReference: 'FACT-F-2026-0042',
  currency: 'MAD',
  status: 'PENDING_REVIEW',
  matchStatus: 'DISCREPANCY',
  issueDate: '2026-07-16T00:00:00.000Z',
  dueDate: '2026-08-15T00:00:00.000Z',
  notes: 'Prix fournisseur à contrôler',
  totalHtCents: 125000,
  totalTvaCents: 25000,
  totalTtcCents: 150000,
  approvedAt: null,
  approvedByTwentyUserId: null,
  overrideReason: null,
  cancelledAt: null,
  cancelledByTwentyUserId: null,
  cancellationReason: null,
  createdAt: instant,
  updatedAt: laterInstant,
  lines: [
    {
      id: ids.supplierInvoiceLine,
      supplierInvoiceId: ids.supplierInvoice,
      purchaseOrderLineId: ids.line,
      quantity: 1,
      unitPriceHtCents: 125000,
      tvaRate: 20,
      totalHtCents: 125000,
      totalTvaCents: 25000,
      totalTtcCents: 150000,
      matchStatus: 'DISCREPANCY',
      receivedQuantitySnapshot: 1,
      previouslyInvoicedQuantitySnapshot: 0,
      quantityVariance: 0,
      unitPriceVarianceCents: 5000,
      tvaRateVariance: 0,
      position: 0,
      createdAt: instant,
      updatedAt: laterInstant,
      purchaseOrderLine: {
        id: ids.line,
        description: 'Matériel de bureau',
        unit: 'UNITE',
        quantity: 2.5,
        quantityReceived: 1,
        unitPriceHtCents: 120000,
        tvaRate: 20,
      },
    },
  ],
};

const invoiceLineJson = {
  id: ids.line,
  organisationId: 'internal-organisation-id',
  societeId: ids.societe,
  invoiceId: ids.invoice,
  productId: ids.product,
  description: 'Atelier ERP',
  unit: 'JOUR',
  quantity: 2.5,
  unitPriceHtCents: 120000,
  tvaRate: 20,
  totalHtCents: 300000,
  totalTvaCents: 60000,
  totalTtcCents: 360000,
  position: 0,
  createdAt: instant,
  updatedAt: laterInstant,
};

const invoiceJson = {
  id: ids.invoice,
  organisationId: 'internal-organisation-id',
  societeId: ids.societe,
  tierId: ids.tier,
  number: 'FAC-2026-0001',
  year: 2026,
  title: 'Déploiement ERP',
  currency: 'MAD',
  status: 'PARTIALLY_PAID',
  issueDate: '2026-07-10T00:00:00.000Z',
  dueDate: '2026-08-09T00:00:00.000Z',
  notes: null,
  paymentMethod: 'BANK_TRANSFER',
  paymentReference: 'BC-2026-0042',
  totalHtCents: 300000,
  totalTvaCents: 60000,
  totalTtcCents: 360000,
  validatedAt: instant,
  sentAt: laterInstant,
  emailRecipient: 'billing@atlas.example',
  pdfGenerationStatus: 'GENERATED',
  pdfDocumentReference: 'invoice-pdfs/fac-2026-0001.pdf',
  pdfGeneratedAt: laterInstant,
  sellerRaisonSocialeSnapshot: 'Generovo SARL',
  sellerIceSnapshot: '001122334455667',
  sellerIdentifiantFiscalSnapshot: 'IF-42',
  sellerRcSnapshot: null,
  sellerCnssSnapshot: null,
  sellerAddressSnapshot: '10 rue Exemple',
  sellerCitySnapshot: 'Casablanca',
  sellerTaxeProfessionnelleArticleSnapshot: 'TP-12345',
  customerNameSnapshot: 'Atlas Distribution',
  customerEmailSnapshot: 'billing@atlas.example',
  customerPhoneSnapshot: '+212522000000',
  customerIceSnapshot: '001234567890123',
  customerIdentifiantFiscalSnapshot: 'IF-123',
  customerAddressSnapshot: '10 rue Atlas',
  customerCitySnapshot: 'Casablanca',
  legalSnapshotVerificationStatus: 'VERIFIED',
  legalSnapshotVerifiedAt: instant,
  legalSnapshotVerificationNote: 'CAPTURED_AT_VALIDATION',
  createdAt: instant,
  updatedAt: laterInstant,
  lines: [invoiceLineJson],
  tier: {
    id: ids.tier,
    name: 'Atlas Distribution',
    email: 'billing@atlas.example',
    phone: '+212522000000',
    ice: '001234567890123',
    identifiantFiscal: 'IF-123',
    address: '10 rue Atlas',
    city: 'Casablanca',
    paymentDelayDays: 30,
    userLinks: [{ id: 'must-not-leak' }],
  },
  societe: {
    id: ids.societe,
    raisonSociale: 'Generovo SARL',
    ice: '001122334455667',
    identifiantFiscal: 'IF-42',
    rc: null,
    cnss: null,
    address: '10 rue Exemple',
    city: 'Casablanca',
    taxeProfessionnelleArticle: 'TP-12345',
    userLinks: [{ id: 'must-not-leak' }],
  },
  sourceQuote: {
    id: ids.quote,
    number: 'DEV-2026-0001',
    status: 'CONVERTED',
    organisationId: 'must-not-leak',
  },
  pdfGenerationTask: {
    id: ids.task,
    organisationId: 'must-not-leak',
    invoiceId: ids.invoice,
    status: 'GENERATED',
    attempts: 1,
    lastError: null,
    claimToken: ids.task,
    lockedAt: instant,
    leaseExpiresAt: laterInstant,
    nextAttemptAt: null,
    internalUrl: 'postgres://secret',
    createdAt: instant,
    updatedAt: laterInstant,
  },
  emailOutbox: {
    id: ids.task,
    organisationId: 'must-not-leak',
    invoiceId: ids.invoice,
    recipient: 'billing@atlas.example',
    subject: 'Facture FAC-2026-0001',
    pdfDocumentReference: 'invoice-pdfs/fac-2026-0001.pdf',
    status: 'RECONCILIATION_REQUIRED',
    attempts: 2,
    lastError: 'Provider acceptance is unknown',
    queuedByTwentyUserId: 'internal-user-id',
    providerMessageId: 'internal-provider-id',
    providerAcceptedAt: null,
    claimToken: ids.task,
    lockedAt: instant,
    leaseExpiresAt: laterInstant,
    nextAttemptAt: null,
    sentAt: null,
    headers: { authorization: 'secret' },
    createdAt: instant,
    updatedAt: laterInstant,
  },
  paymentAllocations: [{ allocatedByTwentyUserId: 'must-not-leak' }],
  collections: {
    paymentCents: 120000,
    creditAppliedCents: 0,
    creditNoteCents: 0,
    outstandingCents: 240000,
  },
};

const wireInvoice = {
  ...invoiceJson,
  paidCents: 120000,
  outstandingCents: 240000,
  isOverdue: false,
};

const allocationJson = {
  id: ids.allocation,
  paymentId: ids.payment,
  invoiceId: ids.invoice,
  amountCents: 120000,
  position: 0,
  reversalAllocationOfId: null,
  invoiceNumber: 'FAC-2026-0001',
  invoiceStatus: 'PARTIALLY_PAID',
  paidCents: 120000,
  outstandingCents: 240000,
  isOverdue: false,
  allocatedByTwentyUserId: 'internal-user-id',
};

const paymentBaseJson = {
  id: ids.payment,
  organisationId: 'internal-organisation-id',
  societeId: ids.societe,
  tierId: ids.tier,
  kind: 'RECEIPT',
  status: 'REVERSED',
  amountCents: 120000,
  currency: 'MAD',
  paymentDate: '2026-07-10T00:00:00.000Z',
  method: 'BANK_TRANSFER',
  reference: 'VIR-2026-0042',
  notes: null,
  postedAt: instant,
  cancelledAt: null,
  reversedAt: laterInstant,
  createdByTwentyUserId: 'twenty-user-42',
  cancelledByTwentyUserId: null,
  reversedByTwentyUserId: 'internal-user-id',
  terminationReason: 'Paiement saisi en double',
  originalPaymentId: null,
  createdAt: instant,
  updatedAt: laterInstant,
  allocations: [allocationJson],
};

const paymentJson = {
  ...paymentBaseJson,
  reversal: {
    ...paymentBaseJson,
    id: ids.reversal,
    kind: 'REVERSAL',
    status: 'POSTED',
    originalPaymentId: ids.payment,
    reversedAt: null,
    reversal: undefined,
    allocations: [
      {
        ...allocationJson,
        id: ids.line,
        paymentId: ids.reversal,
        reversalAllocationOfId: ids.allocation,
      },
    ],
  },
};

const eligibleInvoiceJson = {
  id: ids.invoice,
  number: 'FAC-2026-0001',
  title: 'Déploiement ERP',
  dueDate: '2026-08-09',
  totalTtcCents: 360000,
  paidCents: 120000,
  outstandingCents: 240000,
  isOverdue: false,
};

const creditNoteJson = {
  id: ids.creditNote,
  societeId: ids.societe,
  sourceInvoiceId: ids.invoice,
  sourceInvoiceNumber: 'FAC-2026-0001',
  tierId: ids.tier,
  number: 'AVO-2026-0001',
  year: 2026,
  status: 'VALIDATED',
  issueDate: '2026-07-11',
  currency: 'MAD',
  totalHtCents: 100000,
  totalTvaCents: 20000,
  totalTtcCents: 120000,
  availableCreditCents: 60000,
  allocatedCents: 60000,
  lines: [
    {
      id: ids.creditLine,
      sourceInvoiceLineId: ids.line,
      description: 'Atelier ERP',
      quantity: 2.5,
      unit: 'JOUR',
      unitPriceHtCents: 120000,
      tvaRate: 20,
      amountHtCents: 100000,
      totalTvaCents: 20000,
      totalTtcCents: 120000,
      position: 0,
    },
  ],
  allocations: [
    {
      id: ids.creditAllocation,
      invoiceId: ids.invoice,
      amountCents: 40000,
      kind: 'SOURCE_AUTO',
      createdAt: instant,
    },
    {
      id: ids.customerCreditAllocation,
      invoiceId: ids.payment,
      amountCents: 20000,
      kind: 'CUSTOMER_CREDIT',
      createdAt: laterInstant,
    },
  ],
  validatedAt: instant,
  cancelledAt: null,
  createdAt: instant,
  updatedAt: laterInstant,
};

const draftCreditNoteJson = {
  ...creditNoteJson,
  number: null,
  year: null,
  status: 'DRAFT',
  availableCreditCents: 120000,
  allocatedCents: 0,
  allocations: [],
  validatedAt: null,
};

const reminderJson = {
  id: ids.reminder,
  organisationId: 'internal-organisation-id',
  societeId: ids.societe,
  tierId: ids.tier,
  invoiceId: ids.invoice,
  level: 'LEVEL_2',
  channel: 'EMAIL',
  status: 'RECONCILIATION_REQUIRED',
  invoiceNumber: 'FAC-2026-0001',
  dueDate: '2026-08-09',
  totalTtcCents: 360000,
  outstandingCents: 240000,
  paymentMethod: 'BANK_TRANSFER',
  paymentReference: 'BC-2026-0042',
  recipient: 'billing@atlas.example',
  subject: 'Rappel LEVEL_2 - facture FAC-2026-0001',
  body: 'Bonjour, le solde reste dû.',
  contentVersion: 2,
  proposedByTwentyUserId: 'internal-user-id',
  proposedAt: instant,
  approvedByTwentyUserId: 'internal-user-id',
  approvedAt: laterInstant,
  cancelledByTwentyUserId: null,
  cancelledAt: null,
  sentAt: null,
  providerMessageId: 'internal-provider-id',
  providerAcceptedAt: null,
  deliveryKey: 'internal-delivery-key',
  attempts: 1,
  claimToken: ids.task,
  lockedAt: instant,
  leaseExpiresAt: laterInstant,
  nextAttemptAt: null,
  lastError: 'Acceptance unknown',
  createdAt: instant,
  updatedAt: laterInstant,
};

describe('ERP Maroc foundational contracts', () => {
  it('defines the exact roles and validates UUIDs, civil dates, and instants', () => {
    expect(erpRoles).toEqual(['OWNER', 'ADMIN', 'COMPTABLE', 'COMMERCIAL']);
    for (const role of erpRoles) expect(erpRoleSchema.parse(role)).toBe(role);

    expect(uuidSchema.parse(ids.product)).toBe(ids.product);
    expect(civilDateSchema.parse('2024-02-29')).toBe('2024-02-29');
    expect(instantSchema.parse('2026-07-11T09:30:00Z')).toBe(
      '2026-07-11T09:30:00Z',
    );
    expect(instantSchema.parse(laterInstant)).toBe(laterInstant);

    for (const invalid of ['2023-02-29', '2026-04-31', '2026-7-01']) {
      expect(civilDateSchema.safeParse(invalid).success).toBe(false);
    }
    for (const invalid of [
      'not-a-uuid',
      '2026-07-11',
      '2026-02-30T10:00:00Z',
    ]) {
      expect(uuidSchema.safeParse(invalid).success).toBe(false);
      if (invalid.includes('T'))
        expect(instantSchema.safeParse(invalid).success).toBe(false);
    }
  });

  it('normalizes finite canonical database decimals and rejects ambiguous strings', () => {
    expect(decimalDatabaseNumberSchema.parse(1200.5)).toBe(1200.5);
    expect(decimalDatabaseNumberSchema.parse('1200.00')).toBe(1200);
    expect(decimalDatabaseNumberSchema.parse('-0.50')).toBe(-0.5);

    for (const invalid of [
      Number.POSITIVE_INFINITY,
      Number.NaN,
      '1e3',
      ' 1',
      '1 ',
      '+1',
      '01',
      '-01',
      '.5',
      '1.',
      'Infinity',
      '',
    ]) {
      expect(decimalDatabaseNumberSchema.safeParse(invalid).success).toBe(
        false,
      );
    }
  });

  it('accepts only safe non-negative integer cents and counts', () => {
    expect(centsSchema.parse(0)).toBe(0);
    expect(centsSchema.parse(Number.MAX_SAFE_INTEGER)).toBe(
      Number.MAX_SAFE_INTEGER,
    );
    expect(nonNegativeIntegerSchema.parse(500)).toBe(500);

    for (const invalid of [12.5, -1, Number.MAX_SAFE_INTEGER + 1, '1200']) {
      expect(centsSchema.safeParse(invalid).success).toBe(false);
      expect(nonNegativeIntegerSchema.safeParse(invalid).success).toBe(false);
    }
  });
});

describe('ERP Maroc response contracts', () => {
  it('parses the exact minimal context and strips extra organisation data', () => {
    const context = erpContextSchema.parse({
      societeId: ids.societe,
      twentyUserId: 'twenty-user-42',
      timezone: 'Africa/Casablanca',
      role: 'COMMERCIAL',
      capabilities: {
        manageCatalog: true,
        manageTiers: true,
        manageSalesDocuments: true,
        createPendingPayment: true,
        postPayment: false,
        terminateOwnPendingPayment: true,
        terminateAnyPayment: false,
        manageReminders: true,
        manageCreditNotes: false,
        allocateCustomerCredit: false,
        manageSupplierAccounting: false,
        manageInventory: false,
        internalGrant: true,
      },
      features: {
        salesUi: true,
        pdfGeneration: true,
        invoiceValidation: true,
        invoiceEmail: true,
        reminderManagement: true,
        reminderDelivery: true,
        whatsappDelivery: false,
        internalWorkerHeartbeat: instant,
      },
      organisationId: 'must-not-leak',
      userLinks: [{ id: 'must-not-leak' }],
    });

    expect(context).toEqual({
      societeId: ids.societe,
      twentyUserId: 'twenty-user-42',
      timezone: 'Africa/Casablanca',
      role: 'COMMERCIAL',
      capabilities: {
        manageCatalog: true,
        manageTiers: true,
        manageSalesDocuments: true,
        createPendingPayment: true,
        postPayment: false,
        terminateOwnPendingPayment: true,
        terminateAnyPayment: false,
        manageReminders: true,
        manageCreditNotes: false,
        allocateCustomerCredit: false,
        manageSupplierAccounting: false,
        manageInventory: false,
      },
      features: {
        salesUi: true,
        pdfGeneration: true,
        invoiceValidation: true,
        invoiceEmail: true,
        reminderManagement: true,
        reminderDelivery: true,
        whatsappDelivery: false,
      },
    });
    expect(
      erpContextSchema.safeParse({
        ...context,
        features: { ...context.features, whatsappDelivery: true },
      }).success,
    ).toBe(false);
    expect(
      erpContextSchema.safeParse({ ...context, twentyUserId: ' \t ' }).success,
    ).toBe(false);

    const legacyContextWithoutCreditCapabilities = {
      ...context,
      capabilities: { ...context.capabilities },
    };
    delete (
      legacyContextWithoutCreditCapabilities.capabilities as Record<
        string,
        unknown
      >
    ).manageCreditNotes;
    delete (
      legacyContextWithoutCreditCapabilities.capabilities as Record<
        string,
        unknown
      >
    ).allocateCustomerCredit;
    expect(
      erpContextSchema.safeParse(legacyContextWithoutCreditCapabilities)
        .success,
    ).toBe(false);
  });

  it('parses products and product lists while normalizing database decimals', () => {
    const product = erpProductSchema.parse(productJson);
    expect(product.defaultPriceHt).toBe(1200);
    expect(product).not.toHaveProperty('organisationId');
    expect(erpProductListSchema.parse([productJson])).toEqual([product]);
  });

  it('parses every tier type and tier lists while stripping organisationId', () => {
    const tier = erpTierSchema.parse(tierJson);
    expect(tier.creditLimit).toBe(50000.5);
    expect(tier).not.toHaveProperty('organisationId');
    expect(erpTierListSchema.parse([tierJson])).toEqual([tier]);
    for (const type of ['CLIENT', 'FOURNISSEUR', 'MIXTE']) {
      expect(erpTierTypeSchema.parse(type)).toBe(type);
    }
  });

  it('rejects negative product prices and tier credit limits', () => {
    for (const negativeDecimal of [-1, '-0.50']) {
      expect(
        erpProductSchema.safeParse({
          ...productJson,
          defaultPriceHt: negativeDecimal,
        }).success,
      ).toBe(false);
      expect(
        erpTierSchema.safeParse({
          ...tierJson,
          creditLimit: negativeDecimal,
        }).success,
      ).toBe(false);
    }
  });

  it.each([
    [0.29, 0.29],
    ['99.95', 99.95],
    ['90071992547409.90', 90071992547409.9],
  ])(
    'accepts exact MAD transport value %s for products and tiers',
    (value, expected) => {
      expect(
        erpProductSchema.parse({ ...productJson, defaultPriceHt: value })
          .defaultPriceHt,
      ).toBe(expected);
      expect(
        erpTierSchema.parse({ ...tierJson, creditLimit: value }).creditLimit,
      ).toBe(expected);
    },
  );

  it.each([1.005, '1.005', '1e3', '90071992547409.91', '90071992547410.00'])(
    'rejects inexact MAD transport value %s for products and tiers',
    (value) => {
      expect(
        erpProductSchema.safeParse({ ...productJson, defaultPriceHt: value })
          .success,
      ).toBe(false);
      expect(
        erpTierSchema.safeParse({ ...tierJson, creditLimit: value }).success,
      ).toBe(false);
    },
  );

  it('parses quote aggregates/lists and every quote status', () => {
    const quote = erpQuoteSchema.parse(quoteJson);
    expect(quote.issueDate).toBe('2026-07-10');
    expect(quote.validUntil).toBe('2026-08-10');
    expect(quote).not.toHaveProperty('organisationId');
    expect(quote.lines[0]).not.toHaveProperty('quoteId');
    expect(erpQuoteListSchema.parse([quoteJson])).toEqual([quote]);
    for (const status of [
      'DRAFT',
      'SENT',
      'ACCEPTED',
      'REJECTED',
      'EXPIRED',
      'CONVERTED',
    ]) {
      expect(erpQuoteStatusSchema.parse(status)).toBe(status);
    }
  });

  it('parses purchase order aggregates/lists and every lifecycle status', () => {
    const purchaseOrder = erpPurchaseOrderSchema.parse(purchaseOrderJson);
    expect(purchaseOrder.issueDate).toBe('2026-07-10');
    expect(purchaseOrder.expectedDeliveryDate).toBe('2026-07-20');
    expect(purchaseOrder).not.toHaveProperty('organisationId');
    expect(erpPurchaseOrderListSchema.parse([purchaseOrderJson])).toEqual([
      purchaseOrder,
    ]);
    for (const status of [
      'DRAFT',
      'CONFIRMED',
      'PARTIALLY_RECEIVED',
      'RECEIVED',
      'INVOICED',
      'CANCELLED',
    ]) {
      expect(erpPurchaseOrderStatusSchema.parse(status)).toBe(status);
    }
    expect(
      erpPurchaseOrderSchema.safeParse({
        ...purchaseOrderJson,
        lines: [
          {
            ...purchaseOrderJson.lines[0],
            quantityReceived: 3,
          },
        ],
      }).success,
    ).toBe(false);
  });

  it('parses supplier receipt aggregates and normalizes the receipt date', () => {
    const receipt = erpPurchaseReceiptSchema.parse(purchaseReceiptJson);

    expect(receipt.receiptDate).toBe('2026-07-16');
    expect(receipt).not.toHaveProperty('organisationId');
    expect(erpPurchaseReceiptListSchema.parse([purchaseReceiptJson])).toEqual([
      receipt,
    ]);
  });

  it('parses supplier invoice matching results and lifecycle statuses', () => {
    const invoice = erpSupplierInvoiceSchema.parse(supplierInvoiceJson);

    expect(invoice.issueDate).toBe('2026-07-16');
    expect(invoice.dueDate).toBe('2026-08-15');
    expect(invoice).not.toHaveProperty('organisationId');
    expect(erpSupplierInvoiceListSchema.parse([supplierInvoiceJson])).toEqual([
      invoice,
    ]);
    for (const status of ['PENDING_REVIEW', 'APPROVED', 'CANCELLED']) {
      expect(erpSupplierInvoiceStatusSchema.parse(status)).toBe(status);
    }
    for (const status of ['MATCHED', 'DISCREPANCY', 'BLOCKED']) {
      expect(erpSupplierInvoiceMatchStatusSchema.parse(status)).toBe(status);
    }
  });

  it('parses supplier invoice review detail and payment preparations', () => {
    const detail = erpSupplierInvoiceDetailSchema.parse({
      ...supplierInvoiceJson,
      supplier: {
        id: ids.tier,
        name: 'Fournisseur Atlas',
        compteCollectifCode: '4411',
      },
      purchaseOrder: {
        id: ids.purchaseOrder,
        number: 'BC-2026-0042',
        issueDate: '2026-07-10T00:00:00.000Z',
      },
      accountingEntry: null,
      paymentPreparationSummary: {
        readyAmountCents: 50000,
        executedAmountCents: 0,
        cancelledAmountCents: 0,
        remainingToPrepareCents: 100000,
      },
    });
    const preparationJson = {
      id: ids.supplierPaymentPreparation,
      organisationId: 'must-not-leak',
      societeId: ids.societe,
      supplierId: ids.tier,
      supplierInvoiceId: ids.supplierInvoice,
      amountCents: 50000,
      currency: 'MAD',
      plannedPaymentDate: '2026-07-31T00:00:00.000Z',
      method: 'BANK_TRANSFER',
      reference: 'VIR-2026-0042',
      notes: 'Acompte',
      status: 'READY',
      createdByTwentyUserId: 'twenty-user-42',
      executedAt: null,
      executedByTwentyUserId: null,
      paymentDate: null,
      treasuryAccountCode: null,
      cancelledAt: null,
      cancelledByTwentyUserId: null,
      cancellationReason: null,
      createdAt: instant,
      updatedAt: laterInstant,
    };
    const preparation =
      erpSupplierPaymentPreparationSchema.parse(preparationJson);

    expect(detail.purchaseOrder.issueDate).toBe('2026-07-10');
    expect(preparation.plannedPaymentDate).toBe('2026-07-31');
    expect(preparation).not.toHaveProperty('organisationId');
    expect(
      erpSupplierPaymentPreparationListSchema.parse({
        items: [preparationJson],
        readyAmountCents: 50000,
        executedAmountCents: 0,
        cancelledAmountCents: 0,
        remainingToPrepareCents: 100000,
      }).items,
    ).toEqual([preparation]);
  });

  it('parses invoice aggregates/pages with only the safe email delivery projection', () => {
    const invoice = erpInvoiceReadSchema.parse({
      ...invoiceJson,
      paidCents: 120000,
      outstandingCents: 240000,
      isOverdue: false,
      stack: 'must-not-leak',
    });

    expect(invoice.issueDate).toBe('2026-07-10');
    expect(invoice.dueDate).toBe('2026-08-09');
    expect(invoice.paidCents).toBe(120000);
    expect(invoice.collections).toEqual({
      paymentCents: 120000,
      creditAppliedCents: 0,
      creditNoteCents: 0,
      outstandingCents: 240000,
    });
    expect(invoice).not.toHaveProperty('organisationId');
    expect(invoice).not.toHaveProperty('paymentAllocations');
    expect(invoice.lines[0]).not.toHaveProperty('organisationId');
    expect(invoice.lines[0]).not.toHaveProperty('invoiceId');
    expect(invoice.societe).not.toHaveProperty('userLinks');
    expect(invoice.sourceQuote).not.toHaveProperty('organisationId');
    expect(invoice).not.toHaveProperty('pdfGenerationTask');
    expect(invoice).not.toHaveProperty('emailOutbox');
    expect(invoice.emailDelivery).toEqual({
      status: 'RECONCILIATION_REQUIRED',
      sentAt: null,
      providerAcceptedAt: null,
    });

    const invoiceWithoutDelivery = erpInvoiceSchema.parse({
      ...invoiceJson,
      emailOutbox: null,
    });
    expect(invoiceWithoutDelivery).not.toHaveProperty('pdfGenerationTask');
    expect(invoiceWithoutDelivery).not.toHaveProperty('emailOutbox');
    expect(invoiceWithoutDelivery.emailDelivery).toBeNull();

    const page = erpInvoicePageSchema.parse({
      items: [
        {
          ...invoiceJson,
          paidCents: 120000,
          outstandingCents: 240000,
          isOverdue: false,
        },
      ],
      nextCursor: ids.invoice,
    });
    expect(page).toMatchObject({
      items: [
        {
          id: ids.invoice,
          emailDelivery: {
            status: 'RECONCILIATION_REQUIRED',
            sentAt: null,
            providerAcceptedAt: null,
          },
        },
      ],
      nextCursor: ids.invoice,
    });
    expect(page.items[0].paidCents).toBe(120000);
    expect(page.items[0].emailDelivery).toEqual({
      status: 'RECONCILIATION_REQUIRED',
      sentAt: null,
      providerAcceptedAt: null,
    });
    expect(page.items[0]).not.toHaveProperty('pdfGenerationTask');
    expect(page.items[0]).not.toHaveProperty('emailOutbox');
  });

  it('reparses its public invoice output idempotently', () => {
    const publicInvoice = erpInvoiceReadSchema.parse(wireInvoice);

    expect(erpInvoiceReadSchema.parse(publicInvoice)).toEqual(publicInvoice);
  });

  it('reparses its public invoice page output idempotently', () => {
    const publicPage = erpInvoicePageSchema.parse({
      items: [wireInvoice],
      nextCursor: ids.invoice,
    });

    expect(erpInvoicePageSchema.parse(publicPage)).toEqual(publicPage);
  });

  it('strips unknown invoice and delivery internals from wire and public forms', () => {
    const publicInvoice = erpInvoiceReadSchema.parse(wireInvoice);
    const wireResult = erpInvoiceReadSchema.parse({
      ...wireInvoice,
      internalInvoiceState: 'must-not-leak',
      emailOutbox: {
        ...wireInvoice.emailOutbox,
        providerMessageId: 'must-not-leak',
      },
    });
    const publicResult = erpInvoiceReadSchema.parse({
      ...publicInvoice,
      internalInvoiceState: 'must-not-leak',
      emailDelivery: {
        ...publicInvoice.emailDelivery,
        providerMessageId: 'must-not-leak',
      },
    });

    expect(wireResult).not.toHaveProperty('internalInvoiceState');
    expect(wireResult.emailDelivery).not.toHaveProperty('providerMessageId');
    expect(publicResult).not.toHaveProperty('internalInvoiceState');
    expect(publicResult.emailDelivery).not.toHaveProperty('providerMessageId');
  });

  it('requires an explicit invoice email delivery state', () => {
    const { emailOutbox: _emailOutbox, ...invoiceWithoutDelivery } =
      wireInvoice;

    expect(erpInvoiceReadSchema.safeParse(invoiceWithoutDelivery).success).toBe(
      false,
    );
  });

  it('accepts explicit null delivery state in wire and public forms', () => {
    const publicInvoice = erpInvoiceReadSchema.parse({
      ...wireInvoice,
      emailOutbox: null,
    });

    expect(publicInvoice.emailDelivery).toBeNull();
    expect(erpInvoiceReadSchema.parse(publicInvoice).emailDelivery).toBeNull();
  });

  it('rejects ambiguous invoice email delivery representations', () => {
    expect(
      erpInvoiceReadSchema.safeParse({
        ...wireInvoice,
        emailDelivery: null,
      }).success,
    ).toBe(false);
  });

  it('uses own public delivery without consulting inherited wire delivery', () => {
    const { emailOutbox: _emailOutbox, ...invoiceWithoutDelivery } =
      wireInvoice;
    let inheritedEmailOutboxReads = 0;
    const prototype = Object.create(null) as Record<string, unknown>;

    Object.defineProperty(prototype, 'emailOutbox', {
      get: () => {
        inheritedEmailOutboxReads += 1;

        return {
          status: 'FAILED',
          sentAt: null,
          providerAcceptedAt: null,
        };
      },
    });

    const invoiceInput = Object.assign(
      Object.create(prototype) as Record<string, unknown>,
      invoiceWithoutDelivery,
      {
        emailDelivery: {
          status: 'RECONCILIATION_REQUIRED',
          sentAt: null,
          providerAcceptedAt: null,
        },
      },
    );

    const invoice = erpInvoiceReadSchema.parse(invoiceInput);

    expect(invoice.emailDelivery).toEqual({
      status: 'RECONCILIATION_REQUIRED',
      sentAt: null,
      providerAcceptedAt: null,
    });
    expect(invoice).not.toHaveProperty('emailOutbox');
    expect(inheritedEmailOutboxReads).toBe(0);
  });

  it('uses own wire delivery without consulting inherited public delivery', () => {
    let inheritedEmailDeliveryReads = 0;
    const prototype = Object.create(null) as Record<string, unknown>;

    Object.defineProperty(prototype, 'emailDelivery', {
      get: () => {
        inheritedEmailDeliveryReads += 1;

        return {
          status: 'RECONCILIATION_REQUIRED',
          sentAt: null,
          providerAcceptedAt: null,
        };
      },
    });

    const invoiceInput = Object.assign(
      Object.create(prototype) as Record<string, unknown>,
      wireInvoice,
      {
        emailOutbox: {
          status: 'FAILED',
          sentAt: null,
          providerAcceptedAt: null,
        },
      },
    );

    const invoice = erpInvoiceReadSchema.parse(invoiceInput);

    expect(invoice.emailDelivery).toEqual({
      status: 'FAILED',
      sentAt: null,
      providerAcceptedAt: null,
    });
    expect(invoice).not.toHaveProperty('emailOutbox');
    expect(inheritedEmailDeliveryReads).toBe(0);
  });

  it('does not accept an inherited invoice delivery key', () => {
    const { emailOutbox: _emailOutbox, ...invoiceWithoutDelivery } =
      wireInvoice;
    const invoiceInput = Object.assign(
      Object.create({
        emailOutbox: {
          status: 'FAILED',
          sentAt: null,
          providerAcceptedAt: null,
        },
      }) as Record<string, unknown>,
      invoiceWithoutDelivery,
    );

    expect(erpInvoiceReadSchema.safeParse(invoiceInput).success).toBe(false);
  });

  it('covers invoice, PDF-generation, email-delivery, and payment-method status variants', () => {
    for (const status of [
      'DRAFT',
      'VALIDATED',
      'SENT',
      'PARTIALLY_PAID',
      'PAID',
      'OVERDUE',
      'CANCELLED',
    ]) {
      expect(erpInvoiceStatusSchema.parse(status)).toBe(status);
    }
    for (const status of [
      'NOT_REQUESTED',
      'PENDING',
      'PROCESSING',
      'GENERATED',
      'FAILED',
    ]) {
      expect(erpInvoicePdfGenerationStatusSchema.parse(status)).toBe(status);
    }
    for (const status of [
      'PENDING',
      'PROCESSING',
      'SENT',
      'FAILED',
      'RECONCILIATION_REQUIRED',
    ]) {
      expect(erpInvoiceEmailOutboxStatusSchema.parse(status)).toBe(status);
    }
    for (const method of [
      'BANK_TRANSFER',
      'CHECK',
      'CASH',
      'CARD',
      'DIRECT_DEBIT',
      'OTHER',
    ]) {
      expect(erpInvoicePaymentMethodSchema.parse(method)).toBe(method);
    }
  });

  it('parses payment aggregates/pages, including reversal, and keeps only the creator actor id', () => {
    const payment = erpPaymentSchema.parse(paymentJson);
    expect(payment.paymentDate).toBe('2026-07-10');
    expect(payment.createdByTwentyUserId).toBe('twenty-user-42');
    expect(payment).not.toHaveProperty('organisationId');
    expect(payment).not.toHaveProperty('cancelledByTwentyUserId');
    expect(payment).not.toHaveProperty('reversedByTwentyUserId');
    expect(payment.allocations[0]).not.toHaveProperty('paymentId');
    expect(payment.allocations[0]).not.toHaveProperty(
      'allocatedByTwentyUserId',
    );
    expect(payment.reversal).not.toHaveProperty('organisationId');
    expect(payment.reversal).not.toHaveProperty('reversedByTwentyUserId');
    expect(payment.reversal).not.toHaveProperty('createdByTwentyUserId');
    expect(
      erpPaymentPageSchema.parse({ items: [paymentJson], nextCursor: null }),
    ).toMatchObject({
      items: [{ id: ids.payment }],
      nextCursor: null,
    });
  });

  it('covers every payment status, kind, and method used by the UI', () => {
    for (const kind of ['RECEIPT', 'REVERSAL'])
      expect(erpPaymentKindSchema.parse(kind)).toBe(kind);
    for (const status of [
      'PENDING_ALLOCATION',
      'POSTED',
      'REVERSED',
      'CANCELLED',
    ]) {
      expect(erpPaymentStatusSchema.parse(status)).toBe(status);
    }
    for (const method of [
      'CASH',
      'BANK_TRANSFER',
      'CHECK',
      'CARD',
      'DIRECT_DEBIT',
      'OTHER',
    ]) {
      expect(erpPaymentMethodSchema.parse(method)).toBe(method);
    }
  });

  it('parses the exact eligible-invoice row and page fields', () => {
    expect(
      erpEligibleInvoiceSchema.parse({
        ...eligibleInvoiceJson,
        internalBalanceSql: 'secret',
      }),
    ).toEqual(eligibleInvoiceJson);
    expect(
      erpEligibleInvoicePageSchema.parse({
        items: [eligibleInvoiceJson],
        nextCursor: ids.invoice,
      }),
    ).toEqual({ items: [eligibleInvoiceJson], nextCursor: ids.invoice });
  });

  it('parses draft and validated credit notes with immutable totals and allocations', () => {
    expect(erpCreditNoteSchema.parse(creditNoteJson).availableCreditCents).toBe(
      60000,
    );
    expect(erpCreditNoteSchema.parse(draftCreditNoteJson)).toMatchObject({
      status: 'DRAFT',
      number: null,
      year: null,
      allocations: [],
    });
    expect(
      erpCreditNotePageSchema.parse({
        items: [creditNoteJson],
        nextCursor: null,
      }),
    ).toMatchObject({ items: [{ id: ids.creditNote }], nextCursor: null });
    expect(erpCreditNoteStatusSchema.parse('CANCELLED')).toBe('CANCELLED');
    expect(erpCreditAllocationKindSchema.parse('SOURCE_AUTO')).toBe(
      'SOURCE_AUTO',
    );
    expect(erpCreditAllocationKindSchema.parse('CUSTOMER_CREDIT')).toBe(
      'CUSTOMER_CREDIT',
    );
  });

  it('rejects credit notes whose allocations do not sum to allocated credit', () => {
    const result = erpCreditNoteSchema.safeParse({
      ...creditNoteJson,
      allocations: [
        { ...creditNoteJson.allocations[0], amountCents: 39999 },
        creditNoteJson.allocations[1],
      ],
    });

    expect(result.success).toBe(false);
    if (result.success) {
      throw new Error('Expected inconsistent allocations to be rejected');
    }
    expect(result.error.issues).toContainEqual(
      expect.objectContaining({
        path: ['allocations'],
        message: 'Allocation amounts must sum to allocated credit',
      }),
    );
  });

  it('rejects credit notes whose available and allocated credit does not equal total TTC', () => {
    const result = erpCreditNoteSchema.safeParse({
      ...creditNoteJson,
      availableCreditCents: 59999,
    });

    expect(result.success).toBe(false);
    if (result.success) {
      throw new Error('Expected inconsistent credit balance to be rejected');
    }
    expect(result.error.issues).toContainEqual(
      expect.objectContaining({
        path: ['availableCreditCents'],
        message: 'Available credit plus allocated credit must equal total TTC',
      }),
    );
  });

  it('rejects non-draft credit notes without a number and year', () => {
    const result = erpCreditNoteSchema.safeParse({
      ...creditNoteJson,
      number: null,
      year: null,
    });

    expect(result.success).toBe(false);
    if (result.success) {
      throw new Error(
        'Expected non-draft credit note numbering to be rejected',
      );
    }
    expect(result.error.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: ['number'],
          message: 'Non-draft credit notes require a number',
        }),
        expect.objectContaining({
          path: ['year'],
          message: 'Non-draft credit notes require a year',
        }),
      ]),
    );
  });

  it('rejects fractional credit amounts and unknown allocation kinds', () => {
    expect(
      erpCreditNoteSchema.safeParse({
        ...creditNoteJson,
        lines: [{ ...creditNoteJson.lines[0], amountHtCents: 1.5 }],
      }).success,
    ).toBe(false);
    expect(
      erpCreditNoteSchema.safeParse({
        ...creditNoteJson,
        allocations: [{ ...creditNoteJson.allocations[0], kind: 'UNKNOWN' }],
      }).success,
    ).toBe(false);
    expect(
      erpCreditNoteSchema.safeParse({
        ...creditNoteJson,
        availableCreditCents: 1.5,
      }).success,
    ).toBe(false);
  });

  it('parses reminder detail/pages, covers all states, and strips delivery internals', () => {
    const reminder = erpReminderSchema.parse(reminderJson);
    expect(reminder).not.toHaveProperty('organisationId');
    expect(reminder).not.toHaveProperty('proposedByTwentyUserId');
    expect(reminder).not.toHaveProperty('approvedByTwentyUserId');
    expect(reminder).not.toHaveProperty('providerMessageId');
    expect(reminder).not.toHaveProperty('deliveryKey');
    expect(reminder).not.toHaveProperty('claimToken');
    expect(reminder).not.toHaveProperty('lockedAt');
    expect(reminder).not.toHaveProperty('leaseExpiresAt');
    expect(
      erpReminderPageSchema.parse({ items: [reminderJson], nextCursor: null }),
    ).toMatchObject({
      items: [{ id: ids.reminder }],
      nextCursor: null,
    });

    for (const level of ['LEVEL_1', 'LEVEL_2', 'LEVEL_3']) {
      expect(erpReminderLevelSchema.parse(level)).toBe(level);
    }
    for (const status of [
      'PROPOSED',
      'APPROVED',
      'PROCESSING',
      'SENT',
      'CANCELLED',
      'SUPERSEDED',
      'FAILED',
      'RECONCILIATION_REQUIRED',
    ]) {
      expect(erpReminderStatusSchema.parse(status)).toBe(status);
    }
  });

  it('keeps reminder scan results distinct and requires every exact counter', () => {
    const scan = {
      reminderIds: [ids.reminder],
      hasMore: true,
      nextCursor: ids.invoice,
      counters: {
        examined: 500,
        eligible: 2,
        created: 1,
        skippedIneligible: 497,
        skippedAlreadyRecorded: 1,
        skippedActive: 0,
        internalCount: 99,
      },
      internalBatchLease: 'must-not-leak',
    };
    expect(erpReminderScanResultSchema.parse(scan)).toEqual({
      reminderIds: [ids.reminder],
      hasMore: true,
      nextCursor: ids.invoice,
      counters: {
        examined: 500,
        eligible: 2,
        created: 1,
        skippedIneligible: 497,
        skippedAlreadyRecorded: 1,
        skippedActive: 0,
      },
    });
    expect(erpReminderScanResultSchema.safeParse(reminderJson).success).toBe(
      false,
    );
    const { skippedActive: _skippedActive, ...missingCounter } = scan.counters;
    expect(
      erpReminderScanResultSchema.safeParse({
        ...scan,
        counters: missingCounter,
      }).success,
    ).toBe(false);
  });

  it('validates balance and grand livre totals against their accounting rows', () => {
    const balance = {
      from: '2026-07-01',
      to: '2026-07-31',
      includeDraft: false,
      items: [
        {
          accountId: ids.accountingAccount,
          accountCode: '3421',
          accountLabel: 'Clients',
          classNumber: 3,
          debitCents: 12_000,
          creditCents: 2_000,
          balanceCents: 10_000,
          debitBalanceCents: 10_000,
          creditBalanceCents: 0,
        },
      ],
      totals: {
        debitCents: 12_000,
        creditCents: 2_000,
        debitBalanceCents: 10_000,
        creditBalanceCents: 0,
      },
    };
    const grandLivre = {
      account: {
        id: ids.accountingAccount,
        code: '3421',
        label: 'Clients',
        classNumber: 3,
      },
      from: null,
      to: null,
      includeDraft: true,
      items: [
        {
          lineId: ids.line,
          entryId: ids.accountingEntry,
          entryDate: '2026-07-15',
          journalCode: 'VE',
          journalLabel: 'Ventes',
          label: 'Facture FAC-2026-0001',
          sourceType: 'INVOICE',
          sourceId: ids.invoice,
          status: 'DRAFT',
          debitCents: 12_000,
          creditCents: 0,
          runningBalanceCents: 12_000,
        },
      ],
      totals: {
        debitCents: 12_000,
        creditCents: 0,
        balanceCents: 12_000,
      },
    };

    expect(erpBalanceReportSchema.parse(balance)).toEqual(balance);
    expect(erpGrandLivreReportSchema.parse(grandLivre)).toEqual(grandLivre);
    expect(
      erpBalanceReportSchema.safeParse({
        ...balance,
        totals: { ...balance.totals, debitCents: 11_999 },
      }).success,
    ).toBe(false);
    expect(
      erpGrandLivreReportSchema.safeParse({
        ...grandLivre,
        totals: { ...grandLivre.totals, balanceCents: 11_999 },
      }).success,
    ).toBe(false);
  });

  it('validates exact lettrage suggestions and balanced matches', () => {
    const debitLine = {
      lineId: ids.line,
      entryId: ids.accountingEntry,
      entryDate: '2026-07-01',
      journalCode: 'VE',
      label: 'Facture FAC-2026-0001',
      sourceType: 'INVOICE',
      sourceId: ids.invoice,
      debitCents: 12_000,
      creditCents: 0,
    };
    const creditLine = {
      lineId: ids.accountingLineTwo,
      entryId: ids.reversal,
      entryDate: '2026-07-15',
      journalCode: 'BQ',
      label: 'Règlement FAC-2026-0001',
      sourceType: 'PAYMENT',
      sourceId: ids.payment,
      debitCents: 0,
      creditCents: 12_000,
    };
    const match = {
      id: ids.accountingLettering,
      reference: 'AA',
      accountId: ids.accountingAccount,
      accountCode: '3421',
      matchedAt: instant,
      matchedByTwentyUserId: 'accountant-1',
      unmatchedAt: null,
      unmatchedByTwentyUserId: null,
      lines: [debitLine, creditLine],
      totalDebitCents: 12_000,
      totalCreditCents: 12_000,
    };
    const suggestions = {
      account: {
        id: ids.accountingAccount,
        code: '3421',
        label: 'Clients',
        classNumber: 3,
      },
      suggestions: [
        {
          debitLine,
          creditLine,
          amountCents: 12_000,
          dateDistanceDays: 14,
        },
      ],
      activeMatches: [match],
    };

    expect(erpLettrageMatchSchema.parse(match)).toEqual(match);
    expect(erpLettrageSuggestionsSchema.parse(suggestions)).toEqual(
      suggestions,
    );
    expect(
      erpLettrageSuggestionsSchema.safeParse({
        ...suggestions,
        suggestions: [{ ...suggestions.suggestions[0], dateDistanceDays: 31 }],
      }).success,
    ).toBe(false);
  });

  it('parses supplier bank reconciliation candidates and confirmed matches', () => {
    const candidate = {
      kind: 'SUPPLIER',
      supplierPaymentPreparationId: ids.supplierPaymentPreparation,
      supplierId: ids.tier,
      supplierName: 'Atlas Fournitures',
      supplierInvoiceId: ids.supplierInvoice,
      supplierInvoiceReference: 'FF-2026-0042',
      paymentReference: 'VIR-0042',
      paymentDate: '2026-07-17',
      amountCents: 125_000,
      method: 'BANK_TRANSFER',
      score: 100,
      dateDistanceDays: 0,
      reasons: ['AMOUNT_EXACT', 'DATE_EXACT', 'REFERENCE_MATCH'],
    } as const;

    expect(
      erpBankReconciliationCandidatesSchema.parse({
        lineId: ids.bankStatementLine,
        candidates: [candidate],
      }),
    ).toEqual({ lineId: ids.bankStatementLine, candidates: [candidate] });

    expect(
      erpBankStatementLineSchema.parse({
        id: ids.bankStatementLine,
        position: 0,
        pageNumber: 1,
        transactionDate: '2026-07-17',
        valueDate: '2026-07-18',
        description: 'Virement Atlas Fournitures',
        reference: 'VIR-0042',
        debitCents: 125_000,
        creditCents: 0,
        balanceCents: 400_000,
        confidenceBasisPoints: 9_900,
        needsReview: false,
        sourceText: 'VIR-0042 Atlas Fournitures',
        boundingBox: null,
        review: null,
        reconciliation: {
          ...candidate,
          reconciledAt: '2026-07-17T10:00:00.000Z',
          reconciledByTwentyUserId: 'twenty-user-1',
        },
      }),
    ).toMatchObject({
      id: ids.bankStatementLine,
      reconciliation: {
        supplierPaymentPreparationId: ids.supplierPaymentPreparation,
      },
    });
  });

  it('rejects missing required response fields and malformed IDs/dates', () => {
    const { id: _id, ...productWithoutId } = productJson;
    expect(erpProductSchema.safeParse(productWithoutId).success).toBe(false);
    expect(
      erpProductSchema.safeParse({ ...productJson, id: 'bad-id' }).success,
    ).toBe(false);
    expect(
      erpEligibleInvoiceSchema.safeParse({
        ...eligibleInvoiceJson,
        dueDate: '2026-02-30',
      }).success,
    ).toBe(false);
    expect(
      erpPaymentSchema.safeParse({ ...paymentJson, amountCents: 12.5 }).success,
    ).toBe(false);
  });
});

describe('ERP Maroc normalized errors', () => {
  const errorCodes = [
    'AUTH_TOKEN_INVALID_OR_EXPIRED',
    'ERP_LINK_REQUIRED',
    'ERP_DISABLED',
    'ERP_UPSTREAM_TIMEOUT',
    'ERP_UPSTREAM_INVALID_RESPONSE',
    'ERP_STATE_CONFLICT',
    'ERP_VALIDATION_ERROR',
    'ERP_NOT_FOUND',
    'ERP_RATE_LIMITED',
    'ERP_UNKNOWN',
  ] as const;

  it('defines all and only the stable error codes', () => {
    expect(erpErrorCodeSchema.options).toEqual(errorCodes);
    for (const code of errorCodes)
      expect(erpErrorCodeSchema.parse(code)).toBe(code);
  });

  it('parses the stable auth error and strips unsafe diagnostics', () => {
    expect(
      erpErrorSchema.parse({
        statusCode: 401,
        code: 'AUTH_TOKEN_INVALID_OR_EXPIRED',
        message: 'Votre session a expiré.',
        stack: 'secret stack',
        internalUrl: 'http://erp-api:4000/context',
        url: 'http://internal',
        headers: { authorization: 'secret' },
        details: { database: 'secret' },
      }),
    ).toEqual({
      statusCode: 401,
      code: 'AUTH_TOKEN_INVALID_OR_EXPIRED',
      message: 'Votre session a expiré.',
    });
    expect(
      erpErrorSchema.safeParse({ statusCode: 401.5, code: 'ERP_UNKNOWN' })
        .success,
    ).toBe(false);
    expect(
      erpErrorSchema.safeParse({
        statusCode: Number.MAX_SAFE_INTEGER + 1,
        code: 'ERP_UNKNOWN',
      }).success,
    ).toBe(false);
  });
});

describe('ERP Maroc upstream routes', () => {
  const dynamicRouteCases: Array<{
    helper: (id: string) => string;
    validId: string;
    expectedPath: string;
  }> = [
    {
      helper: erpMarocUpstreamRoutes.products.detail,
      validId: ids.product,
      expectedPath: `/products/${ids.product}`,
    },
    {
      helper: erpMarocUpstreamRoutes.tiers.detail,
      validId: ids.tier,
      expectedPath: `/tiers/${ids.tier}`,
    },
    {
      helper: erpMarocUpstreamRoutes.quotes.detail,
      validId: ids.quote,
      expectedPath: `/quotes/${ids.quote}`,
    },
    {
      helper: erpMarocUpstreamRoutes.quotes.send,
      validId: ids.quote,
      expectedPath: `/quotes/${ids.quote}/send`,
    },
    {
      helper: erpMarocUpstreamRoutes.quotes.accept,
      validId: ids.quote,
      expectedPath: `/quotes/${ids.quote}/accept`,
    },
    {
      helper: erpMarocUpstreamRoutes.quotes.reject,
      validId: ids.quote,
      expectedPath: `/quotes/${ids.quote}/reject`,
    },
    {
      helper: erpMarocUpstreamRoutes.purchaseOrders.detail,
      validId: ids.purchaseOrder,
      expectedPath: `/purchase-orders/${ids.purchaseOrder}`,
    },
    {
      helper: erpMarocUpstreamRoutes.purchaseOrders.confirm,
      validId: ids.purchaseOrder,
      expectedPath: `/purchase-orders/${ids.purchaseOrder}/confirm`,
    },
    {
      helper: erpMarocUpstreamRoutes.purchaseOrders.cancel,
      validId: ids.purchaseOrder,
      expectedPath: `/purchase-orders/${ids.purchaseOrder}/cancel`,
    },
    {
      helper: erpMarocUpstreamRoutes.purchaseOrders.receipts,
      validId: ids.purchaseOrder,
      expectedPath: `/purchase-orders/${ids.purchaseOrder}/receipts`,
    },
    {
      helper: erpMarocUpstreamRoutes.purchaseOrders.supplierInvoices,
      validId: ids.purchaseOrder,
      expectedPath: `/purchase-orders/${ids.purchaseOrder}/supplier-invoices`,
    },
    {
      helper: erpMarocUpstreamRoutes.supplierInvoices.detail,
      validId: ids.supplierInvoice,
      expectedPath: `/supplier-invoices/${ids.supplierInvoice}`,
    },
    {
      helper: erpMarocUpstreamRoutes.supplierInvoices.approve,
      validId: ids.supplierInvoice,
      expectedPath: `/supplier-invoices/${ids.supplierInvoice}/approve`,
    },
    {
      helper: erpMarocUpstreamRoutes.supplierInvoices.cancel,
      validId: ids.supplierInvoice,
      expectedPath: `/supplier-invoices/${ids.supplierInvoice}/cancel`,
    },
    {
      helper: erpMarocUpstreamRoutes.supplierInvoices.paymentPreparations,
      validId: ids.supplierInvoice,
      expectedPath: `/supplier-invoices/${ids.supplierInvoice}/payment-preparations`,
    },
    {
      helper: erpMarocUpstreamRoutes.supplierPaymentPreparations.cancel,
      validId: ids.supplierPaymentPreparation,
      expectedPath: `/supplier-payment-preparations/${ids.supplierPaymentPreparation}/cancel`,
    },
    {
      helper: erpMarocUpstreamRoutes.supplierPaymentPreparations.execute,
      validId: ids.supplierPaymentPreparation,
      expectedPath: `/supplier-payment-preparations/${ids.supplierPaymentPreparation}/execute`,
    },
    {
      helper: erpMarocUpstreamRoutes.invoices.fromQuote,
      validId: ids.quote,
      expectedPath: `/invoices/from-quote/${ids.quote}`,
    },
    {
      helper: erpMarocUpstreamRoutes.invoices.detail,
      validId: ids.invoice,
      expectedPath: `/invoices/${ids.invoice}`,
    },
    {
      helper: erpMarocUpstreamRoutes.invoices.validate,
      validId: ids.invoice,
      expectedPath: `/invoices/${ids.invoice}/validate`,
    },
    {
      helper: erpMarocUpstreamRoutes.invoices.send,
      validId: ids.invoice,
      expectedPath: `/invoices/${ids.invoice}/send`,
    },
    {
      helper: erpMarocUpstreamRoutes.invoices.pdf,
      validId: ids.invoice,
      expectedPath: `/invoices/${ids.invoice}/pdf`,
    },
    {
      helper: erpMarocUpstreamRoutes.payments.detail,
      validId: ids.payment,
      expectedPath: `/payments/${ids.payment}`,
    },
    {
      helper: erpMarocUpstreamRoutes.payments.eligibleInvoices,
      validId: ids.payment,
      expectedPath: `/payments/${ids.payment}/eligible-invoices`,
    },
    {
      helper: erpMarocUpstreamRoutes.payments.allocate,
      validId: ids.payment,
      expectedPath: `/payments/${ids.payment}/allocate`,
    },
    {
      helper: erpMarocUpstreamRoutes.payments.terminate,
      validId: ids.payment,
      expectedPath: `/payments/${ids.payment}/terminate`,
    },
    {
      helper: erpMarocUpstreamRoutes.creditNotes.detail,
      validId: ids.creditNote,
      expectedPath: `/credit-notes/${ids.creditNote}`,
    },
    {
      helper: erpMarocUpstreamRoutes.creditNotes.validate,
      validId: ids.creditNote,
      expectedPath: `/credit-notes/${ids.creditNote}/validate`,
    },
    {
      helper: erpMarocUpstreamRoutes.creditNotes.eligibleInvoices,
      validId: ids.creditNote,
      expectedPath: `/credit-notes/${ids.creditNote}/eligible-invoices`,
    },
    {
      helper: erpMarocUpstreamRoutes.creditNotes.allocate,
      validId: ids.creditNote,
      expectedPath: `/credit-notes/${ids.creditNote}/allocate`,
    },
    {
      helper: erpMarocUpstreamRoutes.creditNotes.cancel,
      validId: ids.creditNote,
      expectedPath: `/credit-notes/${ids.creditNote}/cancel`,
    },
    {
      helper: erpMarocUpstreamRoutes.reminders.detail,
      validId: ids.reminder,
      expectedPath: `/reminders/${ids.reminder}`,
    },
    {
      helper: erpMarocUpstreamRoutes.reminders.approve,
      validId: ids.reminder,
      expectedPath: `/reminders/${ids.reminder}/approve`,
    },
    {
      helper: erpMarocUpstreamRoutes.reminders.cancel,
      validId: ids.reminder,
      expectedPath: `/reminders/${ids.reminder}/cancel`,
    },
    {
      helper: erpMarocUpstreamRoutes.accounting.detail,
      validId: ids.accountingEntry,
      expectedPath: `/accounting/entries/${ids.accountingEntry}`,
    },
    {
      helper: erpMarocUpstreamRoutes.accounting.validate,
      validId: ids.accountingEntry,
      expectedPath: `/accounting/entries/${ids.accountingEntry}/validate`,
    },
    {
      helper: erpMarocUpstreamRoutes.accounting.reject,
      validId: ids.accountingEntry,
      expectedPath: `/accounting/entries/${ids.accountingEntry}/reject`,
    },
    {
      helper: erpMarocUpstreamRoutes.bankAccounts.detail,
      validId: ids.bankStatement,
      expectedPath: `/bank-accounts/${ids.bankStatement}`,
    },
    {
      helper: erpMarocUpstreamRoutes.bankStatements.detail,
      validId: ids.bankStatement,
      expectedPath: `/bank-statements/${ids.bankStatement}`,
    },
    {
      helper: erpMarocUpstreamRoutes.bankStatements.confirm,
      validId: ids.bankStatement,
      expectedPath: `/bank-statements/${ids.bankStatement}/confirm`,
    },
    {
      helper: erpMarocUpstreamRoutes.bankStatements.assignBankAccount,
      validId: ids.bankStatement,
      expectedPath: `/bank-statements/${ids.bankStatement}/bank-account`,
    },
    {
      helper: erpMarocUpstreamRoutes.bankStatements.close,
      validId: ids.bankStatement,
      expectedPath: `/bank-statements/${ids.bankStatement}/close`,
    },
    {
      helper:
        erpMarocUpstreamRoutes.bankStatementLines.reconciliationCandidates,
      validId: ids.bankStatementLine,
      expectedPath: `/bank-statement-lines/${ids.bankStatementLine}/reconciliation-candidates`,
    },
    {
      helper:
        erpMarocUpstreamRoutes.bankStatementLines.reconcileSupplierPayment,
      validId: ids.bankStatementLine,
      expectedPath: `/bank-statement-lines/${ids.bankStatementLine}/reconcile-supplier-payment`,
    },
    {
      helper:
        erpMarocUpstreamRoutes.bankStatementLines.unreconcileSupplierPayment,
      validId: ids.bankStatementLine,
      expectedPath: `/bank-statement-lines/${ids.bankStatementLine}/unreconcile-supplier-payment`,
    },
    {
      helper:
        erpMarocUpstreamRoutes.bankStatementLines.reconcileCustomerPayment,
      validId: ids.bankStatementLine,
      expectedPath: `/bank-statement-lines/${ids.bankStatementLine}/reconcile-customer-payment`,
    },
    {
      helper:
        erpMarocUpstreamRoutes.bankStatementLines.unreconcileCustomerPayment,
      validId: ids.bankStatementLine,
      expectedPath: `/bank-statement-lines/${ids.bankStatementLine}/unreconcile-customer-payment`,
    },
    {
      helper: erpMarocUpstreamRoutes.bankStatementLines.review,
      validId: ids.bankStatementLine,
      expectedPath: `/bank-statement-lines/${ids.bankStatementLine}/review`,
    },
    {
      helper: erpMarocUpstreamRoutes.bankStatementLines.unreview,
      validId: ids.bankStatementLine,
      expectedPath: `/bank-statement-lines/${ids.bankStatementLine}/unreview`,
    },
  ];

  it('keeps the browser API base separate and exports stable route IDs', () => {
    expect(ERP_MAROC_API_BASE).toBe('/erp-maroc-api');
    expect(erpMarocRouteIds).toEqual({
      context: 'context',
      productsCollection: 'products.collection',
      productDetail: 'products.detail',
      tiersCollection: 'tiers.collection',
      tiersSyncFromTwentyCompany: 'tiers.syncFromTwentyCompany',
      tierDetail: 'tiers.detail',
      quotesCollection: 'quotes.collection',
      quotesFromOpportunity: 'quotes.fromOpportunity',
      quoteDetail: 'quotes.detail',
      quoteSend: 'quotes.send',
      quoteAccept: 'quotes.accept',
      quoteReject: 'quotes.reject',
      purchaseOrdersCollection: 'purchase-orders.collection',
      purchaseOrderDetail: 'purchase-orders.detail',
      purchaseOrderConfirm: 'purchase-orders.confirm',
      purchaseOrderCancel: 'purchase-orders.cancel',
      purchaseOrderReceipts: 'purchase-orders.receipts',
      purchaseOrderSupplierInvoices: 'purchase-orders.supplierInvoices',
      supplierInvoiceDetail: 'supplier-invoices.detail',
      supplierInvoiceApprove: 'supplier-invoices.approve',
      supplierInvoiceCancel: 'supplier-invoices.cancel',
      supplierInvoicePaymentPreparations:
        'supplier-invoices.paymentPreparations',
      supplierPaymentPreparationCancel: 'supplier-payment-preparations.cancel',
      supplierPaymentPreparationExecute:
        'supplier-payment-preparations.execute',
      invoicesCollection: 'invoices.collection',
      invoiceFromQuote: 'invoices.fromQuote',
      invoiceDetail: 'invoices.detail',
      invoiceValidate: 'invoices.validate',
      invoiceSend: 'invoices.send',
      invoicePdf: 'invoices.pdf',
      paymentsCollection: 'payments.collection',
      paymentDetail: 'payments.detail',
      paymentEligibleInvoices: 'payments.eligibleInvoices',
      paymentAllocate: 'payments.allocate',
      paymentTerminate: 'payments.terminate',
      creditNotesCollection: 'credit-notes.collection',
      creditNoteDetail: 'credit-notes.detail',
      creditNoteValidate: 'credit-notes.validate',
      creditNoteEligibleInvoices: 'credit-notes.eligibleInvoices',
      creditNoteAllocate: 'credit-notes.allocate',
      creditNoteCancel: 'credit-notes.cancel',
      remindersCollection: 'reminders.collection',
      remindersScan: 'reminders.scan',
      reminderDetail: 'reminders.detail',
      reminderApprove: 'reminders.approve',
      reminderCancel: 'reminders.cancel',
      accountingEntriesCollection: 'accounting.entries.collection',
      accountingEntryDetail: 'accounting.entries.detail',
      accountingEntryValidate: 'accounting.entries.validate',
      accountingEntryReject: 'accounting.entries.reject',
      accountingGrandLivre: 'accounting.grand-livre',
      accountingBalance: 'accounting.balance',
      accountingLettrageSuggestions: 'accounting.lettrage.suggestions',
      accountingLettrageMatch: 'accounting.lettrage.match',
      accountingLettrageUnmatch: 'accounting.lettrage.unmatch',
      bankAccountsCollection: 'bank-accounts.collection',
      bankAccountDetail: 'bank-accounts.detail',
      bankStatementsCollection: 'bank-statements.collection',
      bankStatementDetail: 'bank-statements.detail',
      bankStatementConfirm: 'bank-statements.confirm',
      bankStatementAssignBankAccount: 'bank-statements.assignBankAccount',
      bankStatementClose: 'bank-statements.close',
      bankStatementLineReconciliationCandidates:
        'bank-statement-lines.reconciliationCandidates',
      bankStatementLineReconcileSupplierPayment:
        'bank-statement-lines.reconcileSupplierPayment',
      bankStatementLineUnreconcileSupplierPayment:
        'bank-statement-lines.unreconcileSupplierPayment',
      bankStatementLineReconcileCustomerPayment:
        'bank-statement-lines.reconcileCustomerPayment',
      bankStatementLineUnreconcileCustomerPayment:
        'bank-statement-lines.unreconcileCustomerPayment',
      bankStatementLineReview: 'bank-statement-lines.review',
      bankStatementLineUnreview: 'bank-statement-lines.unreview',
      warehousesCollection: 'warehouses.collection',
      inventoryLevels: 'inventory.levels',
      inventoryMovements: 'inventory.movements',
      inventoryAdjustments: 'inventory.adjustments',
      inventoryTransfers: 'inventory.transfers',
    });
  });

  it('defines every approved static upstream route exactly', () => {
    expect(erpMarocUpstreamRoutes.context).toBe('/context');
    expect(erpMarocUpstreamRoutes.products.collection).toBe('/products');
    expect(erpMarocUpstreamRoutes.tiers.collection).toBe('/tiers');
    expect(erpMarocUpstreamRoutes.tiers.syncFromTwentyCompany).toBe(
      '/tiers/sync-from-twenty-company',
    );
    expect(erpMarocUpstreamRoutes.quotes.collection).toBe('/quotes');
    expect(erpMarocUpstreamRoutes.quotes.fromOpportunity).toBe(
      '/quotes/from-opportunity',
    );
    expect(erpMarocUpstreamRoutes.purchaseOrders.collection).toBe(
      '/purchase-orders',
    );
    expect(erpMarocUpstreamRoutes.invoices.collection).toBe('/invoices');
    expect(erpMarocUpstreamRoutes.payments.collection).toBe('/payments');
    expect(erpMarocUpstreamRoutes.creditNotes.collection).toBe('/credit-notes');
    expect(erpMarocUpstreamRoutes.reminders.collection).toBe('/reminders');
    expect(erpMarocUpstreamRoutes.reminders.scan).toBe('/reminders/scan');
    expect(erpMarocUpstreamRoutes.accounting.entries).toBe(
      '/accounting/entries',
    );
    expect(erpMarocUpstreamRoutes.accounting.grandLivre).toBe(
      '/accounting/grand-livre',
    );
    expect(erpMarocUpstreamRoutes.accounting.balance).toBe(
      '/accounting/balance',
    );
    expect(erpMarocUpstreamRoutes.accounting.lettrageSuggestions).toBe(
      '/accounting/lettrage/suggestions',
    );
    expect(erpMarocUpstreamRoutes.accounting.lettrageMatch).toBe(
      '/accounting/lettrage/match',
    );
    expect(erpMarocUpstreamRoutes.accounting.lettrageUnmatch).toBe(
      '/accounting/lettrage/unmatch',
    );
    expect(erpMarocUpstreamRoutes.bankStatements.collection).toBe(
      '/bank-statements',
    );
    expect(erpMarocUpstreamRoutes.bankAccounts.collection).toBe(
      '/bank-accounts',
    );
    expect(erpMarocUpstreamRoutes.warehouses.collection).toBe('/warehouses');
    expect(erpMarocUpstreamRoutes.inventory.levels).toBe('/inventory/levels');
    expect(erpMarocUpstreamRoutes.inventory.movements).toBe(
      '/inventory/movements',
    );
    expect(erpMarocUpstreamRoutes.inventory.adjustments).toBe(
      '/inventory/adjustments',
    );
    expect(erpMarocUpstreamRoutes.inventory.transfers).toBe(
      '/inventory/transfers',
    );
  });

  it('builds every dynamic upstream route exactly for valid UUIDs', () => {
    for (const { helper, validId, expectedPath } of dynamicRouteCases) {
      expect(helper(validId)).toBe(expectedPath);
    }
  });

  it('rejects unsafe IDs in every dynamic upstream route', () => {
    const invalidIds = [
      '.',
      '..',
      '',
      '   ',
      'not-a-uuid',
      '%2e',
      '%2e%2e',
      '%2e%2e%2fadmin',
      '%252e%252e%252fadmin',
    ];

    for (const { helper } of dynamicRouteCases) {
      for (const invalidId of invalidIds) {
        expect(() => helper(invalidId)).toThrow();
      }
    }
  });
});
