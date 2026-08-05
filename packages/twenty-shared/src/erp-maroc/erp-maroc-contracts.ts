import { z } from 'zod';

export const ERP_MAROC_API_BASE = '/erp-maroc-api' as const;

export const erpRoles = ['OWNER', 'ADMIN', 'COMPTABLE', 'COMMERCIAL'] as const;

export const erpRoleSchema = z.enum(erpRoles);

export const erpErrorCodeSchema = z.enum([
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
]);

const safeIntegerSchema = z
  .number()
  .refine(Number.isSafeInteger, 'Expected a safe integer');

export const nonNegativeIntegerSchema = safeIntegerSchema.nonnegative();
export const positiveIntegerSchema = safeIntegerSchema.positive();
export const centsSchema = nonNegativeIntegerSchema;
export const signedCentsSchema = safeIntegerSchema;

export const uuidSchema = z.string().uuid();
export const nullableUuidSchema = uuidSchema.nullable();

const civilDatePattern = /^(\d{4})-(\d{2})-(\d{2})$/;
const instantPattern =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(Z|[+-](\d{2}):(\d{2}))$/;

const isLeapYear = (year: number): boolean =>
  year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);

const isValidCivilDateParts = (
  year: number,
  month: number,
  day: number,
): boolean => {
  const daysInMonth = [
    31,
    isLeapYear(year) ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ];

  return month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth[month - 1];
};

const isValidCivilDate = (value: string): boolean => {
  const match = civilDatePattern.exec(value);

  return (
    match !== null &&
    isValidCivilDateParts(Number(match[1]), Number(match[2]), Number(match[3]))
  );
};

const isValidInstant = (value: string): boolean => {
  const match = instantPattern.exec(value);

  if (match === null) {
    return false;
  }

  const dateIsValid = isValidCivilDateParts(
    Number(match[1]),
    Number(match[2]),
    Number(match[3]),
  );
  const timeIsValid =
    Number(match[4]) <= 23 && Number(match[5]) <= 59 && Number(match[6]) <= 59;
  const offsetIsValid =
    match[7] === 'Z' || (Number(match[8]) <= 23 && Number(match[9]) <= 59);

  return dateIsValid && timeIsValid && offsetIsValid;
};

export const civilDateSchema = z
  .string()
  .refine(isValidCivilDate, 'Expected a valid YYYY-MM-DD civil date');
export const nullableCivilDateSchema = civilDateSchema.nullable();

export const instantSchema = z
  .string()
  .refine(isValidInstant, 'Expected a valid RFC3339 instant');
export const nullableInstantSchema = instantSchema.nullable();

// Prisma serializes @db.Date values as midnight instants. Normalize those HTTP
// strings back to their civil representation without constructing a Date.
const civilDateHttpSchema = z
  .union([civilDateSchema, instantSchema])
  .transform((value) => value.slice(0, 10));
const nullableCivilDateHttpSchema = civilDateHttpSchema.nullable();

const canonicalDecimalPattern = /^-?(?:0|[1-9]\d*)(?:\.\d+)?$/;

export const decimalDatabaseNumberSchema = z
  .union([
    z.number().refine(Number.isFinite, 'Expected a finite number'),
    z
      .string()
      .regex(canonicalDecimalPattern, 'Expected a canonical decimal string'),
  ])
  .transform((value, context) => {
    const numberValue = typeof value === 'number' ? value : Number(value);

    if (!Number.isFinite(numberValue)) {
      context.addIssue({
        code: 'custom',
        message: 'Expected a finite decimal value',
      });
      return z.NEVER;
    }

    return numberValue;
  });
export const nonNegativeDecimalDatabaseNumberSchema =
  decimalDatabaseNumberSchema.pipe(z.number().nonnegative());

const canonicalMadDecimalPattern = /^(0|[1-9]\d*)(?:\.(\d{1,2}))?$/;
const maxSafeCents = BigInt(Number.MAX_SAFE_INTEGER);
const madTransportError =
  'Expected a non-negative MAD amount with at most two decimals that round-trips exactly as a JSON number';

const parseCanonicalMadCents = (value: string): bigint | null => {
  const match = canonicalMadDecimalPattern.exec(value);
  if (match === null) return null;

  return (
    BigInt(match[1]) * BigInt(100) + BigInt((match[2] ?? '').padEnd(2, '0'))
  );
};

const madTransportNumberSchema = z
  .union([z.number(), z.string()])
  .transform((value, context) => {
    const source = typeof value === 'number' ? String(value) : value;
    const sourceCents = parseCanonicalMadCents(source);
    const numberValue = Number(source);
    const transportedCents = Number.isFinite(numberValue)
      ? parseCanonicalMadCents(String(numberValue))
      : null;

    if (
      sourceCents === null ||
      sourceCents > maxSafeCents ||
      transportedCents !== sourceCents
    ) {
      context.addIssue({ code: 'custom', message: madTransportError });
      return z.NEVER;
    }

    return numberValue;
  });

const nullableStringSchema = z.string().nullable();
const nonBlankStringSchema = z.string().trim().min(1);

export const erpErrorSchema = z.object({
  statusCode: safeIntegerSchema,
  code: erpErrorCodeSchema,
  message: z.string().trim().min(1).max(500).optional(),
});

export const erpContextSchema = z.object({
  societeId: uuidSchema,
  twentyUserId: nonBlankStringSchema,
  timezone: nonBlankStringSchema,
  role: erpRoleSchema,
  capabilities: z.object({
    manageCatalog: z.boolean(),
    manageTiers: z.boolean(),
    manageSalesDocuments: z.boolean(),
    createPendingPayment: z.boolean(),
    postPayment: z.boolean(),
    terminateOwnPendingPayment: z.boolean(),
    terminateAnyPayment: z.boolean(),
    manageReminders: z.boolean(),
    manageCreditNotes: z.boolean(),
    allocateCustomerCredit: z.boolean(),
    manageSupplierAccounting: z.boolean(),
    manageInventory: z.boolean(),
    manageMarketing: z.boolean(),
  }),
  features: z.object({
    salesUi: z.boolean(),
    pdfGeneration: z.boolean(),
    invoiceValidation: z.boolean(),
    invoiceEmail: z.boolean(),
    reminderManagement: z.boolean(),
    reminderDelivery: z.boolean(),
    marketingAutomation: z.boolean(),
    whatsappDelivery: z.literal(false),
  }),
});

export const erpProductSchema = z.object({
  id: uuidSchema,
  societeId: uuidSchema,
  code: z.string(),
  name: z.string(),
  description: nullableStringSchema,
  type: z.string(),
  unit: z.string(),
  defaultPriceHt: madTransportNumberSchema,
  tvaRate: nonNegativeIntegerSchema,
  incomeAccountCode: nullableStringSchema,
  expenseAccountCode: nullableStringSchema,
  isActive: z.boolean(),
  createdAt: instantSchema,
  updatedAt: instantSchema,
});

export const erpProductListSchema = z.array(erpProductSchema);

export const erpTierTypeSchema = z.enum(['CLIENT', 'FOURNISSEUR', 'MIXTE']);
export const erpCompteCollectifCodeSchema = z.enum(['3421', '4411']);

export const erpTierSchema = z.object({
  id: uuidSchema,
  societeId: uuidSchema,
  type: erpTierTypeSchema,
  name: z.string(),
  email: nullableStringSchema,
  phone: nullableStringSchema,
  ice: nullableStringSchema,
  identifiantFiscal: nullableStringSchema,
  address: nullableStringSchema,
  city: nullableStringSchema,
  paymentDelayDays: nonNegativeIntegerSchema,
  creditLimit: madTransportNumberSchema,
  twentyCompanyId: nullableStringSchema,
  twentyPersonId: nullableStringSchema,
  compteCollectifCode: erpCompteCollectifCodeSchema,
  isActive: z.boolean(),
  createdAt: instantSchema,
  updatedAt: instantSchema,
});

export const erpTierListSchema = z.array(erpTierSchema);

export const erpQuoteStatusSchema = z.enum([
  'DRAFT',
  'SENT',
  'ACCEPTED',
  'REJECTED',
  'EXPIRED',
  'CONVERTED',
]);

export const erpQuoteLineSchema = z.object({
  id: uuidSchema,
  productId: nullableUuidSchema,
  description: z.string(),
  unit: nullableStringSchema,
  quantity: z.number().finite().positive(),
  unitPriceHtCents: centsSchema,
  tvaRate: nonNegativeIntegerSchema,
  totalHtCents: centsSchema,
  totalTvaCents: centsSchema,
  totalTtcCents: centsSchema,
  position: nonNegativeIntegerSchema,
  createdAt: instantSchema,
  updatedAt: instantSchema,
});

export const erpQuoteSchema = z.object({
  id: uuidSchema,
  societeId: uuidSchema,
  tierId: uuidSchema,
  number: z.string(),
  year: nonNegativeIntegerSchema,
  title: z.string(),
  currency: z.literal('MAD'),
  status: erpQuoteStatusSchema,
  issueDate: civilDateHttpSchema,
  validUntil: nullableCivilDateHttpSchema,
  notes: nullableStringSchema,
  totalHtCents: centsSchema,
  totalTvaCents: centsSchema,
  totalTtcCents: centsSchema,
  twentyOpportunityId: nullableUuidSchema,
  twentyCompanyId: nullableUuidSchema,
  twentyPersonId: nullableUuidSchema,
  opportunityEstimatedAmountCents: centsSchema.nullable(),
  convertedInvoiceId: nullableUuidSchema,
  convertedSalesOrderId: nullableUuidSchema.optional(),
  convertedAt: nullableInstantSchema,
  createdAt: instantSchema,
  updatedAt: instantSchema,
  lines: z.array(erpQuoteLineSchema),
});

export const erpQuoteListSchema = z.array(erpQuoteSchema);

export const erpWarehouseSummarySchema = z.object({
  id: uuidSchema,
  code: z.string(),
  name: z.string(),
});

export const erpSalesOrderStatusSchema = z.enum([
  'DRAFT',
  'CONFIRMED',
  'PARTIALLY_DELIVERED',
  'DELIVERED',
  'INVOICED',
  'CANCELLED',
]);

export const erpSalesOrderProductSchema = z.object({
  id: uuidSchema,
  code: z.string(),
  name: z.string(),
  type: z.string(),
});

export const erpSalesOrderAllocationSchema = z
  .object({
    id: uuidSchema,
    societeId: uuidSchema,
    salesOrderId: uuidSchema,
    salesOrderLineId: uuidSchema,
    warehouseId: uuidSchema,
    quantityReserved: z.number().finite().nonnegative(),
    quantityPrepared: z.number().finite().nonnegative(),
    createdByTwentyUserId: nonBlankStringSchema,
    updatedByTwentyUserId: nonBlankStringSchema,
    preparedAt: nullableInstantSchema,
    createdAt: instantSchema,
    updatedAt: instantSchema,
    warehouse: erpWarehouseSummarySchema,
  })
  .superRefine((allocation, context) => {
    if (allocation.quantityPrepared > allocation.quantityReserved) {
      context.addIssue({
        code: 'custom',
        message: 'Prepared quantity cannot exceed reserved quantity',
        path: ['quantityPrepared'],
      });
    }
  });

export const erpSalesOrderLineSchema = z
  .object({
    id: uuidSchema,
    salesOrderId: uuidSchema,
    productId: nullableUuidSchema,
    description: z.string(),
    unit: nullableStringSchema,
    quantity: z.number().finite().positive(),
    quantityDelivered: z.number().finite().nonnegative(),
    unitPriceHtCents: centsSchema,
    tvaRate: nonNegativeIntegerSchema,
    totalHtCents: centsSchema,
    totalTvaCents: centsSchema,
    totalTtcCents: centsSchema,
    position: nonNegativeIntegerSchema,
    createdAt: instantSchema,
    updatedAt: instantSchema,
    product: erpSalesOrderProductSchema.nullable(),
    allocations: z.array(erpSalesOrderAllocationSchema).default([]),
    invoiceAllocations: z
      .array(
        z.object({
          id: uuidSchema,
          invoiceId: uuidSchema,
          quantity: z.number().finite().positive(),
        }),
      )
      .default([]),
  })
  .superRefine((line, context) => {
    if (line.quantityDelivered > line.quantity) {
      context.addIssue({
        code: 'custom',
        message: 'Delivered quantity cannot exceed ordered quantity',
        path: ['quantityDelivered'],
      });
    }
    const reserved = line.allocations.reduce(
      (total, allocation) => total + allocation.quantityReserved,
      0,
    );
    if (reserved + line.quantityDelivered > line.quantity + 1e-9) {
      context.addIssue({
        code: 'custom',
        message:
          'Reserved and delivered quantities cannot exceed ordered quantity',
        path: ['allocations'],
      });
    }
  });

export const erpSalesOrderCustomerSchema = z.object({
  id: uuidSchema,
  name: z.string(),
  email: nullableStringSchema,
  phone: nullableStringSchema,
  city: nullableStringSchema,
  paymentDelayDays: nonNegativeIntegerSchema,
});

export const erpSalesOrderSourceQuoteSchema = z.object({
  id: uuidSchema,
  number: z.string(),
  status: erpQuoteStatusSchema,
});

export const erpSalesOrderConvertedInvoiceSchema = z.object({
  id: uuidSchema,
  number: z.string().nullable(),
  status: z.string(),
});

export const erpSalesOrderInvoiceSummarySchema =
  erpSalesOrderConvertedInvoiceSchema.extend({
    totalTtcCents: centsSchema,
    createdAt: instantSchema,
  });

export const erpSalesOrderSchema = z.object({
  id: uuidSchema,
  societeId: uuidSchema,
  customerId: uuidSchema,
  number: z.string(),
  year: nonNegativeIntegerSchema,
  title: z.string(),
  currency: z.literal('MAD'),
  status: erpSalesOrderStatusSchema,
  issueDate: civilDateHttpSchema,
  expectedDeliveryDate: nullableCivilDateHttpSchema,
  notes: nullableStringSchema,
  totalHtCents: centsSchema,
  totalTvaCents: centsSchema,
  totalTtcCents: centsSchema,
  confirmedAt: nullableInstantSchema,
  confirmedByTwentyUserId: nullableStringSchema,
  cancelledAt: nullableInstantSchema,
  cancelledByTwentyUserId: nullableStringSchema,
  cancellationReason: nullableStringSchema,
  convertedInvoiceId: nullableUuidSchema,
  invoicedAt: nullableInstantSchema,
  createdAt: instantSchema,
  updatedAt: instantSchema,
  customer: erpSalesOrderCustomerSchema,
  sourceQuote: erpSalesOrderSourceQuoteSchema.nullable(),
  convertedInvoice: erpSalesOrderConvertedInvoiceSchema.nullable(),
  invoices: z.array(erpSalesOrderInvoiceSummarySchema).default([]),
  lines: z.array(erpSalesOrderLineSchema),
});

export const erpSalesOrderListSchema = z.array(erpSalesOrderSchema);

export const erpDeliveryNoteStatusSchema = z.enum(['POSTED', 'CANCELLED']);

export const erpDeliveryNoteLineSchema = z.object({
  id: uuidSchema,
  deliveryNoteId: uuidSchema,
  salesOrderLineId: uuidSchema,
  quantity: z.number().finite().positive(),
  position: nonNegativeIntegerSchema,
  createdAt: instantSchema,
  updatedAt: instantSchema,
  salesOrderLine: erpSalesOrderLineSchema,
});

export const erpDeliveryNoteSchema = z.object({
  id: uuidSchema,
  societeId: uuidSchema,
  salesOrderId: uuidSchema,
  warehouseId: uuidSchema,
  number: z.string(),
  year: nonNegativeIntegerSchema,
  status: erpDeliveryNoteStatusSchema,
  deliveryDate: civilDateHttpSchema,
  notes: nullableStringSchema,
  creationCommandId: nonBlankStringSchema,
  createdByTwentyUserId: nonBlankStringSchema,
  cancellationCommandId: nullableStringSchema,
  cancelledAt: nullableInstantSchema,
  cancelledByTwentyUserId: nullableStringSchema,
  cancellationReason: nullableStringSchema,
  createdAt: instantSchema,
  updatedAt: instantSchema,
  warehouse: erpWarehouseSummarySchema,
  lines: z.array(erpDeliveryNoteLineSchema).min(1),
});

export const erpDeliveryNoteListSchema = z.array(erpDeliveryNoteSchema);

export const erpPurchaseOrderStatusSchema = z.enum([
  'DRAFT',
  'CONFIRMED',
  'PARTIALLY_RECEIVED',
  'RECEIVED',
  'INVOICED',
  'CANCELLED',
]);

export const erpPurchaseOrderLineSchema = z
  .object({
    id: uuidSchema,
    purchaseOrderId: uuidSchema,
    productId: nullableUuidSchema,
    description: z.string(),
    unit: nullableStringSchema,
    quantity: z.number().finite().positive(),
    quantityReceived: z.number().finite().nonnegative(),
    unitPriceHtCents: centsSchema,
    tvaRate: nonNegativeIntegerSchema,
    totalHtCents: centsSchema,
    totalTvaCents: centsSchema,
    totalTtcCents: centsSchema,
    position: nonNegativeIntegerSchema,
    createdAt: instantSchema,
    updatedAt: instantSchema,
  })
  .superRefine((line, context) => {
    if (line.quantityReceived > line.quantity) {
      context.addIssue({
        code: 'custom',
        message: 'Received quantity cannot exceed ordered quantity',
        path: ['quantityReceived'],
      });
    }
  });

export const erpPurchaseOrderSupplierSchema = z.object({
  id: uuidSchema,
  name: z.string(),
  type: erpTierTypeSchema,
  ice: nullableStringSchema,
});

export const erpPurchaseOrderSchema = z.object({
  id: uuidSchema,
  societeId: uuidSchema,
  supplierId: uuidSchema,
  number: z.string(),
  year: nonNegativeIntegerSchema,
  currency: z.literal('MAD'),
  status: erpPurchaseOrderStatusSchema,
  issueDate: civilDateHttpSchema,
  expectedDeliveryDate: nullableCivilDateHttpSchema,
  notes: nullableStringSchema,
  totalHtCents: centsSchema,
  totalTvaCents: centsSchema,
  totalTtcCents: centsSchema,
  createdAt: instantSchema,
  updatedAt: instantSchema,
  supplier: erpPurchaseOrderSupplierSchema,
  lines: z.array(erpPurchaseOrderLineSchema),
});

export const erpPurchaseOrderListSchema = z.array(erpPurchaseOrderSchema);

export const erpPurchaseReceiptOrderLineSchema = z.object({
  id: uuidSchema,
  productId: nullableUuidSchema,
  description: z.string(),
  unit: nullableStringSchema,
  quantity: z.number().finite().positive(),
});

export const erpPurchaseReceiptLineSchema = z.object({
  id: uuidSchema,
  purchaseReceiptId: uuidSchema,
  purchaseOrderLineId: uuidSchema,
  quantity: z.number().finite().positive(),
  position: nonNegativeIntegerSchema,
  createdAt: instantSchema,
  updatedAt: instantSchema,
  purchaseOrderLine: erpPurchaseReceiptOrderLineSchema,
});

export const erpPurchaseReceiptSchema = z.object({
  id: uuidSchema,
  societeId: uuidSchema,
  purchaseOrderId: uuidSchema,
  warehouseId: uuidSchema,
  number: z.string(),
  year: nonNegativeIntegerSchema,
  receiptDate: civilDateHttpSchema,
  notes: nullableStringSchema,
  createdAt: instantSchema,
  updatedAt: instantSchema,
  warehouse: erpWarehouseSummarySchema,
  lines: z.array(erpPurchaseReceiptLineSchema),
});

export const erpPurchaseReceiptListSchema = z.array(erpPurchaseReceiptSchema);

export const erpSupplierInvoiceStatusSchema = z.enum([
  'PENDING_REVIEW',
  'APPROVED',
  'CANCELLED',
]);

export const erpSupplierInvoiceMatchStatusSchema = z.enum([
  'MATCHED',
  'DISCREPANCY',
  'BLOCKED',
]);

export const erpSupplierInvoiceOrderLineSchema = z.object({
  id: uuidSchema,
  description: z.string(),
  unit: nullableStringSchema,
  quantity: z.number().finite().positive(),
  quantityReceived: z.number().finite().nonnegative(),
  unitPriceHtCents: centsSchema,
  tvaRate: nonNegativeIntegerSchema,
});

export const erpSupplierInvoiceLineSchema = z.object({
  id: uuidSchema,
  supplierInvoiceId: uuidSchema,
  purchaseOrderLineId: uuidSchema,
  quantity: z.number().finite().positive(),
  unitPriceHtCents: centsSchema,
  tvaRate: nonNegativeIntegerSchema,
  totalHtCents: centsSchema,
  totalTvaCents: centsSchema,
  totalTtcCents: centsSchema,
  matchStatus: erpSupplierInvoiceMatchStatusSchema,
  receivedQuantitySnapshot: z.number().finite().nonnegative(),
  previouslyInvoicedQuantitySnapshot: z.number().finite().nonnegative(),
  quantityVariance: z.number().finite().nonnegative(),
  unitPriceVarianceCents: signedCentsSchema,
  tvaRateVariance: safeIntegerSchema,
  position: nonNegativeIntegerSchema,
  createdAt: instantSchema,
  updatedAt: instantSchema,
  purchaseOrderLine: erpSupplierInvoiceOrderLineSchema,
});

export const erpSupplierInvoiceSchema = z.object({
  id: uuidSchema,
  societeId: uuidSchema,
  purchaseOrderId: uuidSchema,
  supplierId: uuidSchema,
  externalReference: nonBlankStringSchema,
  currency: z.literal('MAD'),
  status: erpSupplierInvoiceStatusSchema,
  matchStatus: erpSupplierInvoiceMatchStatusSchema,
  issueDate: civilDateHttpSchema,
  dueDate: civilDateHttpSchema,
  notes: nullableStringSchema,
  totalHtCents: centsSchema,
  totalTvaCents: centsSchema,
  totalTtcCents: centsSchema,
  approvedAt: nullableInstantSchema,
  approvedByTwentyUserId: nullableStringSchema,
  overrideReason: nullableStringSchema,
  cancelledAt: nullableInstantSchema,
  cancelledByTwentyUserId: nullableStringSchema,
  cancellationReason: nullableStringSchema,
  createdAt: instantSchema,
  updatedAt: instantSchema,
  lines: z.array(erpSupplierInvoiceLineSchema).min(1),
});

export const erpSupplierInvoiceListSchema = z.array(erpSupplierInvoiceSchema);

export const erpInvoiceStatusSchema = z.enum([
  'DRAFT',
  'VALIDATED',
  'SENT',
  'PARTIALLY_PAID',
  'PAID',
  'OVERDUE',
  'CANCELLED',
]);

export const erpInvoicePdfGenerationStatusSchema = z.enum([
  'NOT_REQUESTED',
  'PENDING',
  'PROCESSING',
  'GENERATED',
  'FAILED',
]);

export const erpInvoiceEmailOutboxStatusSchema = z.enum([
  'PENDING',
  'PROCESSING',
  'SENT',
  'FAILED',
  'RECONCILIATION_REQUIRED',
]);

export const erpInvoicePaymentMethodSchema = z.enum([
  'BANK_TRANSFER',
  'CHECK',
  'CASH',
  'CARD',
  'DIRECT_DEBIT',
  'OTHER',
]);

export const erpInvoiceLineSchema = z.object({
  id: uuidSchema,
  productId: nullableUuidSchema,
  description: z.string(),
  unit: nullableStringSchema,
  quantity: z.number().finite().positive(),
  unitPriceHtCents: centsSchema,
  tvaRate: nonNegativeIntegerSchema,
  totalHtCents: centsSchema,
  totalTvaCents: centsSchema,
  totalTtcCents: centsSchema,
  position: nonNegativeIntegerSchema,
  createdAt: instantSchema,
  updatedAt: instantSchema,
});

export const erpInvoiceTierSummarySchema = z.object({
  id: uuidSchema,
  name: z.string(),
  email: nullableStringSchema,
  phone: nullableStringSchema,
  ice: nullableStringSchema,
  identifiantFiscal: nullableStringSchema,
  address: nullableStringSchema,
  city: nullableStringSchema,
  paymentDelayDays: nonNegativeIntegerSchema,
});

export const erpSocieteLegalSummarySchema = z.object({
  id: uuidSchema,
  raisonSociale: z.string(),
  ice: nullableStringSchema,
  identifiantFiscal: nullableStringSchema,
  rc: nullableStringSchema,
  cnss: nullableStringSchema,
  address: nullableStringSchema,
  city: nullableStringSchema,
  taxeProfessionnelleArticle: nullableStringSchema,
});

export const erpSourceQuoteSummarySchema = z.object({
  id: uuidSchema,
  number: z.string(),
  status: erpQuoteStatusSchema,
});

export const erpSourceSalesOrderSummarySchema = z.object({
  id: uuidSchema,
  number: z.string(),
  status: erpSalesOrderStatusSchema,
});

export const erpSalesInvoiceAllocationSchema = z.object({
  id: uuidSchema,
  salesOrderId: uuidSchema,
  salesOrderLineId: uuidSchema,
  deliveryNoteId: uuidSchema,
  deliveryNoteLineId: uuidSchema,
  invoiceId: uuidSchema,
  invoiceLineId: uuidSchema,
  quantity: z.number().finite().positive(),
  createdAt: instantSchema,
  deliveryNote: z.object({
    id: uuidSchema,
    number: z.string(),
    status: erpDeliveryNoteStatusSchema,
    deliveryDate: civilDateHttpSchema,
  }),
});

const erpInvoiceEmailDeliverySchema = z.object({
  status: erpInvoiceEmailOutboxStatusSchema,
  sentAt: nullableInstantSchema,
  providerAcceptedAt: nullableInstantSchema,
});

const erpInvoiceBaseSchema = z.object({
  id: uuidSchema,
  societeId: uuidSchema,
  tierId: uuidSchema,
  number: z.string().nullable(),
  year: nonNegativeIntegerSchema.nullable(),
  title: z.string(),
  currency: z.literal('MAD'),
  status: erpInvoiceStatusSchema,
  issueDate: civilDateHttpSchema,
  dueDate: civilDateHttpSchema,
  notes: nullableStringSchema,
  paymentMethod: erpInvoicePaymentMethodSchema.nullable(),
  paymentReference: nullableStringSchema,
  totalHtCents: centsSchema,
  totalTvaCents: centsSchema,
  totalTtcCents: centsSchema,
  validatedAt: nullableInstantSchema,
  sentAt: nullableInstantSchema,
  emailRecipient: nullableStringSchema,
  pdfGenerationStatus: erpInvoicePdfGenerationStatusSchema,
  pdfDocumentReference: nullableStringSchema,
  pdfGeneratedAt: nullableInstantSchema,
  sellerRaisonSocialeSnapshot: nullableStringSchema,
  sellerIceSnapshot: nullableStringSchema,
  sellerIdentifiantFiscalSnapshot: nullableStringSchema,
  sellerRcSnapshot: nullableStringSchema,
  sellerCnssSnapshot: nullableStringSchema,
  sellerAddressSnapshot: nullableStringSchema,
  sellerCitySnapshot: nullableStringSchema,
  sellerTaxeProfessionnelleArticleSnapshot: nullableStringSchema,
  customerNameSnapshot: nullableStringSchema,
  customerEmailSnapshot: nullableStringSchema,
  customerPhoneSnapshot: nullableStringSchema,
  customerIceSnapshot: nullableStringSchema,
  customerIdentifiantFiscalSnapshot: nullableStringSchema,
  customerAddressSnapshot: nullableStringSchema,
  customerCitySnapshot: nullableStringSchema,
  legalSnapshotVerificationStatus: z.enum(['PENDING', 'VERIFIED']),
  legalSnapshotVerifiedAt: nullableInstantSchema,
  legalSnapshotVerificationNote: nullableStringSchema,
  createdAt: instantSchema,
  updatedAt: instantSchema,
  lines: z.array(erpInvoiceLineSchema),
  tier: erpInvoiceTierSummarySchema,
  societe: erpSocieteLegalSummarySchema,
  sourceQuote: erpSourceQuoteSummarySchema.nullable(),
  sourceSalesOrderId: nullableUuidSchema.default(null),
  sourceSalesOrder: erpSourceSalesOrderSummarySchema.nullable().default(null),
  salesInvoiceAllocations: z.array(erpSalesInvoiceAllocationSchema).default([]),
});

const erpInvoiceWireEmailDeliverySchema = z.object({
  emailOutbox: erpInvoiceEmailDeliverySchema.nullable(),
});

const erpInvoicePublicEmailDeliverySchema = z.object({
  emailDelivery: erpInvoiceEmailDeliverySchema.nullable(),
});

const erpInvoiceEmailDeliveryInputSchema = z.preprocess(
  (input, context) => {
    const hasEmailOutbox =
      typeof input === 'object' &&
      input !== null &&
      Object.prototype.hasOwnProperty.call(input, 'emailOutbox');
    const hasEmailDelivery =
      typeof input === 'object' &&
      input !== null &&
      Object.prototype.hasOwnProperty.call(input, 'emailDelivery');

    if (hasEmailOutbox === hasEmailDelivery) {
      context.addIssue({
        code: 'custom',
        message: 'Expected exactly one email delivery representation',
      });
    }

    return input;
  },
  z.union([
    erpInvoiceWireEmailDeliverySchema.transform(({ emailOutbox }) => ({
      emailDelivery: emailOutbox,
    })),
    erpInvoicePublicEmailDeliverySchema,
  ]),
);

const normalizeInvoiceRootInput = (input: unknown) => {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return input;
  }

  return Object.fromEntries(Object.entries(input));
};

type PublicInvoiceOutput<InvoiceBaseSchema extends z.ZodObject> =
  z.output<InvoiceBaseSchema> &
    z.output<typeof erpInvoicePublicEmailDeliverySchema>;

const withPublicInvoiceEmailDelivery = <InvoiceBaseSchema extends z.ZodObject>(
  invoiceBaseSchema: InvoiceBaseSchema,
): z.ZodType<PublicInvoiceOutput<InvoiceBaseSchema>, unknown> =>
  z.preprocess(
    normalizeInvoiceRootInput,
    z.intersection(invoiceBaseSchema, erpInvoiceEmailDeliveryInputSchema),
  );

const erpInvoiceReadBaseSchema = erpInvoiceBaseSchema.extend({
  paidCents: centsSchema,
  outstandingCents: centsSchema,
  isOverdue: z.boolean(),
  collections: z.object({
    paymentCents: centsSchema,
    creditAppliedCents: centsSchema,
    creditNoteCents: centsSchema,
    outstandingCents: centsSchema,
  }),
});

type ErpInvoicePublicOutput = PublicInvoiceOutput<typeof erpInvoiceBaseSchema>;
type ErpInvoiceReadPublicOutput = PublicInvoiceOutput<
  typeof erpInvoiceReadBaseSchema
>;

export const erpInvoiceSchema: z.ZodType<ErpInvoicePublicOutput, unknown> =
  withPublicInvoiceEmailDelivery(erpInvoiceBaseSchema);

export const erpInvoiceReadSchema: z.ZodType<
  ErpInvoiceReadPublicOutput,
  unknown
> = withPublicInvoiceEmailDelivery(erpInvoiceReadBaseSchema);

const listPageSchema = <ItemSchema extends z.ZodType>(itemSchema: ItemSchema) =>
  z.object({
    items: z.array(itemSchema),
    nextCursor: nullableUuidSchema,
  });

export const erpInvoicePageSchema = listPageSchema(erpInvoiceReadSchema);

export const erpPaymentKindSchema = z.enum(['RECEIPT', 'REVERSAL']);
export const erpPaymentStatusSchema = z.enum([
  'PENDING_ALLOCATION',
  'POSTED',
  'REVERSED',
  'CANCELLED',
]);
export const erpPaymentMethodSchema = z.enum([
  'CASH',
  'BANK_TRANSFER',
  'CHECK',
  'CARD',
  'DIRECT_DEBIT',
  'OTHER',
]);

export const erpSupplierPaymentPreparationStatusSchema = z.enum([
  'READY',
  'EXECUTED',
  'CANCELLED',
]);

export const erpSupplierPaymentPreparationSchema = z.object({
  id: uuidSchema,
  societeId: uuidSchema,
  supplierId: uuidSchema,
  supplierInvoiceId: uuidSchema,
  amountCents: positiveIntegerSchema,
  currency: z.literal('MAD'),
  plannedPaymentDate: civilDateHttpSchema,
  method: erpPaymentMethodSchema,
  reference: nullableStringSchema,
  notes: nullableStringSchema,
  status: erpSupplierPaymentPreparationStatusSchema,
  createdByTwentyUserId: nonBlankStringSchema,
  executedAt: nullableInstantSchema,
  executedByTwentyUserId: nullableStringSchema,
  paymentDate: nullableCivilDateHttpSchema,
  treasuryAccountCode: nullableStringSchema,
  cancelledAt: nullableInstantSchema,
  cancelledByTwentyUserId: nullableStringSchema,
  cancellationReason: nullableStringSchema,
  createdAt: instantSchema,
  updatedAt: instantSchema,
  accountingEntry: z
    .object({
      id: uuidSchema,
      status: z.enum(['DRAFT', 'VALIDATED', 'REJECTED']),
      entryDate: civilDateHttpSchema,
      label: nonBlankStringSchema,
      journal: z.object({
        code: nonBlankStringSchema,
        libelle: nonBlankStringSchema,
      }),
    })
    .nullable()
    .optional(),
});

export const erpSupplierPaymentPreparationListSchema = z.object({
  items: z.array(erpSupplierPaymentPreparationSchema),
  readyAmountCents: centsSchema,
  executedAmountCents: centsSchema,
  cancelledAmountCents: centsSchema,
  remainingToPrepareCents: centsSchema,
});

export const erpSupplierInvoiceAccountingSummarySchema = z.object({
  id: uuidSchema,
  status: z.enum(['DRAFT', 'VALIDATED', 'REJECTED']),
  entryDate: civilDateHttpSchema,
  label: nonBlankStringSchema,
  journal: z.object({
    code: nonBlankStringSchema,
    libelle: nonBlankStringSchema,
  }),
});

export const erpSupplierInvoiceDetailSchema = erpSupplierInvoiceSchema.extend({
  supplier: z.object({
    id: uuidSchema,
    name: nonBlankStringSchema,
    compteCollectifCode: nonBlankStringSchema,
  }),
  purchaseOrder: z.object({
    id: uuidSchema,
    number: nonBlankStringSchema,
    issueDate: civilDateHttpSchema,
  }),
  accountingEntry: erpSupplierInvoiceAccountingSummarySchema.nullable(),
  paymentPreparationSummary: z.object({
    readyAmountCents: centsSchema,
    executedAmountCents: centsSchema,
    cancelledAmountCents: centsSchema,
    remainingToPrepareCents: centsSchema,
  }),
});

export const erpPaymentAllocationSchema = z.object({
  id: uuidSchema,
  invoiceId: uuidSchema,
  amountCents: centsSchema,
  position: nonNegativeIntegerSchema,
  reversalAllocationOfId: nullableUuidSchema.optional(),
  invoiceNumber: z.string().nullable().optional(),
  invoiceStatus: erpInvoiceStatusSchema.optional(),
  paidCents: centsSchema.optional(),
  outstandingCents: centsSchema.optional(),
  isOverdue: z.boolean().optional(),
});

const erpPaymentBaseSchema = z.object({
  id: uuidSchema,
  societeId: uuidSchema,
  tierId: uuidSchema,
  kind: erpPaymentKindSchema,
  status: erpPaymentStatusSchema,
  amountCents: centsSchema,
  currency: z.literal('MAD'),
  paymentDate: civilDateHttpSchema,
  method: erpPaymentMethodSchema,
  reference: nullableStringSchema,
  notes: nullableStringSchema,
  postedAt: nullableInstantSchema,
  cancelledAt: nullableInstantSchema,
  reversedAt: nullableInstantSchema,
  createdByTwentyUserId: nonBlankStringSchema,
  terminationReason: nullableStringSchema,
  originalPaymentId: nullableUuidSchema,
  createdAt: instantSchema,
  updatedAt: instantSchema,
});

const erpPaymentReversalSchema = erpPaymentBaseSchema
  .omit({ createdByTwentyUserId: true })
  .extend({
    allocations: z.array(erpPaymentAllocationSchema),
  });

export const erpPaymentSchema = erpPaymentBaseSchema.extend({
  allocations: z.array(erpPaymentAllocationSchema),
  reversal: erpPaymentReversalSchema.optional(),
});

export const erpPaymentPageSchema = listPageSchema(erpPaymentSchema);

export const erpChequeDirectionSchema = z.enum(['RECEIVED', 'ISSUED']);
export const erpChequeInstrumentTypeSchema = z.enum(['CHEQUE', 'LCN']);
export const erpChequeStatusSchema = z.enum([
  'DRAFT',
  'PRINTED',
  'SIGNED',
  'DELIVERED',
  'IN_PORTFOLIO',
  'DEPOSITED',
  'CLEARED',
  'REJECTED',
  'STOPPED',
  'CANCELLED',
]);
export const erpChequeBookStatusSchema = z.enum(['ACTIVE', 'CLOSED']);

export const erpChequeBookSchema = z.object({
  id: uuidSchema,
  societeId: uuidSchema,
  bankAccountId: uuidSchema,
  name: nonBlankStringSchema,
  prefix: z.string(),
  startNumber: nonNegativeIntegerSchema,
  endNumber: nonNegativeIntegerSchema,
  nextNumber: nonNegativeIntegerSchema,
  numberPadding: positiveIntegerSchema,
  status: erpChequeBookStatusSchema,
  custodian: nullableStringSchema,
  createdByTwentyUserId: nonBlankStringSchema,
  closedAt: nullableInstantSchema,
  closedByTwentyUserId: nullableStringSchema,
  createdAt: instantSchema,
  updatedAt: instantSchema,
  bankAccount: z.object({
    id: uuidSchema,
    name: nonBlankStringSchema,
    bankName: nonBlankStringSchema,
    rib: nonBlankStringSchema,
  }),
  _count: z.object({ cheques: nonNegativeIntegerSchema }),
});

export const erpChequeBookListSchema = z.array(erpChequeBookSchema);

export const erpChequeEventSchema = z.object({
  id: uuidSchema,
  chequeId: uuidSchema,
  fromStatus: erpChequeStatusSchema.nullable(),
  toStatus: erpChequeStatusSchema,
  reason: nullableStringSchema,
  actorTwentyUserId: nonBlankStringSchema,
  commandId: nonBlankStringSchema,
  occurredAt: instantSchema,
  metadata: z.record(z.string(), z.unknown()),
});

export const erpChequeBankStatementLineSchema = z.object({
  id: uuidSchema,
  transactionDate: civilDateHttpSchema,
  valueDate: nullableCivilDateHttpSchema,
  description: nonBlankStringSchema,
  reference: nullableStringSchema,
  debitCents: centsSchema,
  creditCents: centsSchema,
  reconciledAt: nullableInstantSchema.optional(),
  score: nonNegativeIntegerSchema.max(100).optional(),
  dateDistanceDays: nonNegativeIntegerSchema.optional(),
  reasons: z
    .array(
      z.enum([
        'AMOUNT_EXACT',
        'DIRECTION_MATCH',
        'BANK_ACCOUNT_MATCH',
        'DATE_EXACT',
        'DATE_NEAR',
        'CHEQUE_NUMBER_MATCH',
        'COUNTERPARTY_MATCH',
      ]),
    )
    .optional(),
});

export const erpChequeSchema = z.object({
  id: uuidSchema,
  societeId: uuidSchema,
  bankAccountId: uuidSchema,
  chequeBookId: nullableUuidSchema,
  tierId: nullableUuidSchema,
  customerPaymentId: nullableUuidSchema,
  supplierPaymentPreparationId: nullableUuidSchema,
  direction: erpChequeDirectionSchema,
  instrumentType: erpChequeInstrumentTypeSchema,
  number: nonBlankStringSchema,
  amountCents: positiveIntegerSchema,
  currency: z.literal('MAD'),
  issueDate: civilDateHttpSchema,
  dueDate: nullableCivilDateHttpSchema,
  place: nullableStringSchema,
  counterpartyName: nonBlankStringSchema,
  drawerName: nullableStringSchema,
  memo: nullableStringSchema,
  status: erpChequeStatusSchema,
  statusChangedAt: instantSchema,
  createdByTwentyUserId: nonBlankStringSchema,
  createdAt: instantSchema,
  updatedAt: instantSchema,
  bankAccount: z.object({
    id: uuidSchema,
    name: nonBlankStringSchema,
    bankName: nonBlankStringSchema,
    rib: nonBlankStringSchema,
    currency: nonBlankStringSchema,
  }),
  chequeBook: erpChequeBookSchema
    .pick({
      id: true,
      name: true,
      prefix: true,
      startNumber: true,
      endNumber: true,
      nextNumber: true,
      numberPadding: true,
      status: true,
    })
    .nullable(),
  tier: z
    .object({
      id: uuidSchema,
      name: nonBlankStringSchema,
      type: erpTierTypeSchema,
    })
    .nullable(),
  customerPayment: z
    .object({
      id: uuidSchema,
      reference: nullableStringSchema,
      status: erpPaymentStatusSchema,
      amountCents: positiveIntegerSchema,
    })
    .nullable(),
  supplierPaymentPreparation: z
    .object({
      id: uuidSchema,
      reference: nullableStringSchema,
      status: erpSupplierPaymentPreparationStatusSchema,
      amountCents: positiveIntegerSchema,
      supplierInvoiceId: uuidSchema,
    })
    .nullable(),
  bankStatementLine: erpChequeBankStatementLineSchema.nullable(),
  events: z.array(erpChequeEventSchema),
});

export const erpChequePageSchema = listPageSchema(erpChequeSchema);
export const erpChequeReconciliationCandidatesSchema = z.array(
  erpChequeBankStatementLineSchema.omit({ reconciledAt: true }),
);
export const erpChequeSummarySchema = z.object({
  rows: z.array(
    z.object({
      direction: erpChequeDirectionSchema,
      status: erpChequeStatusSchema,
      count: nonNegativeIntegerSchema,
      amountCents: centsSchema,
    }),
  ),
});

export const erpChequeAlertTypeSchema = z.enum([
  'RECEIVED_TO_DEPOSIT',
  'ISSUED_TO_FUND',
  'STALE_DEPOSIT',
]);
export const erpChequeAlertUrgencySchema = z.enum([
  'DUE_SOON',
  'DUE_TODAY',
  'OVERDUE',
]);
export const erpChequeAlertsSchema = z.object({
  asOf: civilDateHttpSchema,
  horizonDays: positiveIntegerSchema,
  alerts: z.array(
    z.object({
      type: erpChequeAlertTypeSchema,
      urgency: erpChequeAlertUrgencySchema,
      effectiveDueDate: civilDateHttpSchema,
      daysUntilDue: safeIntegerSchema,
      cheque: erpChequeSchema,
    }),
  ),
  lowBooks: z.array(
    z.object({
      book: erpChequeBookSchema,
      remainingLeaves: nonNegativeIntegerSchema,
    }),
  ),
});

const erpChequeDepositSlipBaseSchema = z.object({
  id: uuidSchema,
  societeId: uuidSchema,
  bankAccountId: uuidSchema,
  number: nonBlankStringSchema,
  year: positiveIntegerSchema,
  depositDate: civilDateHttpSchema,
  totalAmountCents: positiveIntegerSchema,
  notes: nullableStringSchema,
  submittedAt: instantSchema,
  submittedByTwentyUserId: nonBlankStringSchema,
  createdAt: instantSchema,
  updatedAt: instantSchema,
  bankAccount: z.object({
    id: uuidSchema,
    name: nonBlankStringSchema,
    bankName: nonBlankStringSchema,
    rib: nonBlankStringSchema,
  }),
});

export const erpChequeDepositSlipListItemSchema =
  erpChequeDepositSlipBaseSchema.extend({
    _count: z.object({ lines: positiveIntegerSchema }),
  });
export const erpChequeDepositSlipListSchema = z.array(
  erpChequeDepositSlipListItemSchema,
);

export const erpChequeDepositSlipSchema = erpChequeDepositSlipBaseSchema.extend(
  {
    societe: z.object({
      id: uuidSchema,
      raisonSociale: nonBlankStringSchema,
      ice: nullableStringSchema,
      identifiantFiscal: nullableStringSchema,
      rc: nullableStringSchema,
      address: nullableStringSchema,
      city: nullableStringSchema,
    }),
    lines: z.array(
      z.object({
        id: uuidSchema,
        depositSlipId: uuidSchema,
        chequeId: uuidSchema,
        position: positiveIntegerSchema,
        createdAt: instantSchema,
        cheque: z.object({
          id: uuidSchema,
          number: nonBlankStringSchema,
          instrumentType: erpChequeInstrumentTypeSchema,
          issueDate: civilDateHttpSchema,
          dueDate: nullableCivilDateHttpSchema,
          counterpartyName: nonBlankStringSchema,
          drawerName: nullableStringSchema,
          amountCents: positiveIntegerSchema,
          status: erpChequeStatusSchema,
        }),
      }),
    ),
  },
);
export const erpChequeDepositEligibleListSchema = z.array(erpChequeSchema);

export const erpEligibleInvoiceSchema = z.object({
  id: uuidSchema,
  number: z.string().nullable(),
  title: z.string(),
  dueDate: civilDateSchema,
  totalTtcCents: centsSchema,
  paidCents: centsSchema,
  outstandingCents: centsSchema,
  isOverdue: z.boolean(),
});

export const erpEligibleInvoicePageSchema = listPageSchema(
  erpEligibleInvoiceSchema,
);

export const erpCreditNoteStatusSchema = z.enum([
  'DRAFT',
  'VALIDATED',
  'CANCELLED',
]);

export const erpCreditAllocationKindSchema = z.enum([
  'SOURCE_AUTO',
  'CUSTOMER_CREDIT',
]);

export const erpCreditNoteLineSchema = z.object({
  id: uuidSchema,
  sourceInvoiceLineId: uuidSchema,
  description: z.string(),
  quantity: z.number().finite().positive(),
  unit: nullableStringSchema,
  unitPriceHtCents: centsSchema,
  tvaRate: nonNegativeIntegerSchema,
  amountHtCents: centsSchema,
  totalTvaCents: centsSchema,
  totalTtcCents: centsSchema,
  position: nonNegativeIntegerSchema,
});

export const erpCreditAllocationSchema = z.object({
  id: uuidSchema,
  invoiceId: uuidSchema,
  amountCents: positiveIntegerSchema,
  kind: erpCreditAllocationKindSchema,
  createdAt: instantSchema,
});

export const erpCreditNoteSchema = z
  .object({
    id: uuidSchema,
    societeId: uuidSchema,
    sourceInvoiceId: uuidSchema,
    sourceInvoiceNumber: z.string(),
    tierId: uuidSchema,
    number: z.string().nullable(),
    year: nonNegativeIntegerSchema.nullable(),
    status: erpCreditNoteStatusSchema,
    issueDate: civilDateHttpSchema,
    currency: z.literal('MAD'),
    totalHtCents: centsSchema,
    totalTvaCents: centsSchema,
    totalTtcCents: centsSchema,
    availableCreditCents: centsSchema,
    allocatedCents: centsSchema,
    lines: z.array(erpCreditNoteLineSchema),
    allocations: z.array(erpCreditAllocationSchema),
    validatedAt: nullableInstantSchema,
    cancelledAt: nullableInstantSchema,
    createdAt: instantSchema,
    updatedAt: instantSchema,
  })
  .superRefine((creditNote, context) => {
    const allocationCents = creditNote.allocations.reduce(
      (totalCents, allocation) => totalCents + allocation.amountCents,
      0,
    );

    if (allocationCents !== creditNote.allocatedCents) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Allocation amounts must sum to allocated credit',
        path: ['allocations'],
      });
    }

    if (
      creditNote.availableCreditCents + creditNote.allocatedCents !==
      creditNote.totalTtcCents
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Available credit plus allocated credit must equal total TTC',
        path: ['availableCreditCents'],
      });
    }

    const isDraft = creditNote.status === 'DRAFT';

    if (isDraft && creditNote.number !== null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Draft credit notes require a null number',
        path: ['number'],
      });
    }

    if (isDraft && creditNote.year !== null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Draft credit notes require a null year',
        path: ['year'],
      });
    }

    if (!isDraft && creditNote.number === null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Non-draft credit notes require a number',
        path: ['number'],
      });
    }

    if (!isDraft && creditNote.year === null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Non-draft credit notes require a year',
        path: ['year'],
      });
    }
  });

export const erpCreditNotePageSchema = listPageSchema(erpCreditNoteSchema);

export const erpCustomerReturnStatusSchema = z.enum([
  'DRAFT',
  'VALIDATED',
  'CANCELLED',
]);

const erpCustomerReturnInvoiceLineSchema = z.object({
  id: uuidSchema,
  description: z.string(),
  unit: nullableStringSchema,
  quantity: z.number().finite().positive(),
  unitPriceHtCents: centsSchema,
  tvaRate: nonNegativeIntegerSchema,
  totalHtCents: centsSchema,
  totalTtcCents: centsSchema,
});

const erpCustomerReturnProductSchema = z.object({
  id: uuidSchema,
  code: z.string(),
  name: z.string(),
  type: z.string(),
});

export const erpCustomerReturnLineSchema = z.object({
  id: uuidSchema,
  customerReturnId: uuidSchema,
  salesInvoiceAllocationId: uuidSchema,
  creditNoteLineId: nullableUuidSchema,
  quantity: z.number().finite().positive(),
  position: nonNegativeIntegerSchema,
  createdAt: instantSchema,
  updatedAt: instantSchema,
  creditNoteLine: z.object({ id: uuidSchema }).nullable(),
  salesInvoiceAllocation: z.object({
    invoiceLine: erpCustomerReturnInvoiceLineSchema,
    deliveryNoteLine: z.object({
      salesOrderLine: z.object({
        product: erpCustomerReturnProductSchema.nullable(),
      }),
    }),
  }),
});

export const erpCustomerReturnSchema = z.object({
  id: uuidSchema,
  societeId: uuidSchema,
  customerId: uuidSchema,
  salesOrderId: uuidSchema,
  deliveryNoteId: uuidSchema,
  sourceInvoiceId: uuidSchema,
  warehouseId: uuidSchema,
  number: z.string(),
  year: nonNegativeIntegerSchema,
  status: erpCustomerReturnStatusSchema,
  returnDate: civilDateHttpSchema,
  reason: z.string(),
  notes: nullableStringSchema,
  createdByTwentyUserId: nonBlankStringSchema,
  validatedAt: nullableInstantSchema,
  validatedByTwentyUserId: nullableStringSchema,
  cancelledAt: nullableInstantSchema,
  cancelledByTwentyUserId: nullableStringSchema,
  cancellationReason: nullableStringSchema,
  creditNoteId: nullableUuidSchema,
  createdAt: instantSchema,
  updatedAt: instantSchema,
  customer: z.object({ id: uuidSchema, name: z.string() }),
  salesOrder: z.object({ id: uuidSchema, number: z.string() }),
  deliveryNote: z.object({
    id: uuidSchema,
    number: z.string(),
    deliveryDate: civilDateHttpSchema,
  }),
  sourceInvoice: z.object({
    id: uuidSchema,
    number: nullableStringSchema,
    status: erpInvoiceStatusSchema,
  }),
  warehouse: erpWarehouseSummarySchema,
  creditNote: z
    .object({
      id: uuidSchema,
      number: nullableStringSchema,
      status: erpCreditNoteStatusSchema,
      totalTtcCents: centsSchema,
    })
    .nullable(),
  lines: z.array(erpCustomerReturnLineSchema).min(1),
});

export const erpCustomerReturnListSchema = z.array(erpCustomerReturnSchema);

export const erpCustomerReturnEligibleLineSchema = z.object({
  salesInvoiceAllocationId: uuidSchema,
  invoiceId: uuidSchema,
  invoiceLineId: uuidSchema,
  deliveryNoteId: uuidSchema,
  deliveryNoteNumber: z.string(),
  warehouse: erpWarehouseSummarySchema,
  product: erpCustomerReturnProductSchema,
  description: z.string(),
  unit: nullableStringSchema,
  quantityInvoiced: z.number().finite().positive(),
  quantityReturned: z.number().finite().nonnegative(),
  quantityAvailable: z.number().finite().positive(),
  unitPriceHtCents: centsSchema,
  tvaRate: nonNegativeIntegerSchema,
});

export const erpCustomerReturnEligibleLineListSchema = z.array(
  erpCustomerReturnEligibleLineSchema,
);

export const erpReminderLevelSchema = z.enum(['LEVEL_1', 'LEVEL_2', 'LEVEL_3']);
export const erpReminderStatusSchema = z.enum([
  'PROPOSED',
  'APPROVED',
  'PROCESSING',
  'SENT',
  'CANCELLED',
  'SUPERSEDED',
  'FAILED',
  'RECONCILIATION_REQUIRED',
]);

export const erpReminderSchema = z.object({
  id: uuidSchema,
  societeId: uuidSchema,
  tierId: uuidSchema,
  invoiceId: uuidSchema,
  level: erpReminderLevelSchema,
  channel: z.literal('EMAIL'),
  status: erpReminderStatusSchema,
  invoiceNumber: z.string(),
  dueDate: civilDateSchema,
  totalTtcCents: centsSchema,
  outstandingCents: centsSchema,
  paymentMethod: erpInvoicePaymentMethodSchema.nullable(),
  paymentReference: nullableStringSchema,
  recipient: nullableStringSchema,
  subject: z.string(),
  body: z.string(),
  contentVersion: positiveIntegerSchema,
  proposedAt: instantSchema,
  approvedAt: nullableInstantSchema,
  cancelledAt: nullableInstantSchema,
  sentAt: nullableInstantSchema,
  providerAcceptedAt: nullableInstantSchema,
  attempts: nonNegativeIntegerSchema,
  nextAttemptAt: nullableInstantSchema,
  lastError: nullableStringSchema,
  createdAt: instantSchema,
  updatedAt: instantSchema,
});

export const erpReminderPageSchema = listPageSchema(erpReminderSchema);

export const erpReminderScanResultSchema = z.object({
  reminderIds: z.array(uuidSchema),
  hasMore: z.boolean(),
  nextCursor: nullableUuidSchema,
  counters: z.object({
    examined: nonNegativeIntegerSchema,
    eligible: nonNegativeIntegerSchema,
    created: nonNegativeIntegerSchema,
    skippedIneligible: nonNegativeIntegerSchema,
    skippedAlreadyRecorded: nonNegativeIntegerSchema,
    skippedActive: nonNegativeIntegerSchema,
  }),
});

export const erpAccountingEntryStatusSchema = z.enum([
  'DRAFT',
  'VALIDATED',
  'LOCKED',
  'REJECTED',
]);
export const erpAccountingSourceTypeSchema = z.enum([
  'MANUAL',
  'REVERSAL',
  'INVOICE',
  'PAYMENT',
  'CREDIT_NOTE',
  'SUPPLIER_INVOICE',
  'SUPPLIER_PAYMENT',
  'PAYROLL',
  'EXPENSE_NOTE',
  'PROVISION',
  'CLOSING',
  'OPENING_BALANCE',
]);

export const erpAccountingEntryLineSchema = z
  .object({
    id: uuidSchema,
    accountId: uuidSchema,
    accountCode: nonBlankStringSchema,
    accountLabel: nonBlankStringSchema,
    label: nonBlankStringSchema,
    debitCents: centsSchema,
    creditCents: centsSchema,
    position: nonNegativeIntegerSchema,
  })
  .superRefine((line, context) => {
    const hasDebit = line.debitCents > 0 && line.creditCents === 0;
    const hasCredit = line.creditCents > 0 && line.debitCents === 0;
    if (!hasDebit && !hasCredit) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'An accounting line requires exactly one positive side',
        path: ['debitCents'],
      });
    }
  });

export const erpAccountingEntrySchema = z
  .object({
    id: uuidSchema,
    organisationId: uuidSchema,
    societeId: uuidSchema,
    journalId: uuidSchema,
    journalCode: nonBlankStringSchema,
    journalLabel: nonBlankStringSchema,
    exerciceId: uuidSchema,
    exerciceYear: nonNegativeIntegerSchema,
    sourceType: erpAccountingSourceTypeSchema,
    sourceId: uuidSchema,
    entryDate: civilDateHttpSchema,
    label: nonBlankStringSchema,
    status: erpAccountingEntryStatusSchema,
    generatedByTwentyUserId: nonBlankStringSchema,
    validatedAt: nullableInstantSchema,
    validatedByTwentyUserId: nullableStringSchema,
    rejectedAt: nullableInstantSchema,
    rejectedByTwentyUserId: nullableStringSchema,
    rejectionReason: nullableStringSchema,
    reversalOfEntryId: nullableUuidSchema,
    reversalEntryId: nullableUuidSchema,
    reversalReason: nullableStringSchema,
    totalDebitCents: centsSchema,
    totalCreditCents: centsSchema,
    lines: z.array(erpAccountingEntryLineSchema).optional(),
    createdAt: instantSchema,
    updatedAt: instantSchema,
  })
  .superRefine((entry, context) => {
    if (entry.totalDebitCents !== entry.totalCreditCents) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Accounting entry debit and credit totals must match',
        path: ['totalCreditCents'],
      });
    }

    const hasValidation =
      entry.validatedAt !== null && entry.validatedByTwentyUserId !== null;
    const hasRejection =
      entry.rejectedAt !== null &&
      entry.rejectedByTwentyUserId !== null &&
      entry.rejectionReason !== null;
    const validReviewState =
      (entry.status === 'DRAFT' && !hasValidation && !hasRejection) ||
      ((entry.status === 'VALIDATED' || entry.status === 'LOCKED') &&
        hasValidation &&
        !hasRejection) ||
      (entry.status === 'REJECTED' && !hasValidation && hasRejection);

    if (!validReviewState) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Accounting entry review metadata does not match its status',
        path: ['status'],
      });
    }
  });

export const erpAccountingEntryPageSchema = listPageSchema(
  erpAccountingEntrySchema,
);

export const erpAccountingProvisionStatusSchema = z.enum([
  'DRAFT',
  'ACTIVE',
  'REVERSED',
  'CANCELLED',
]);

export const erpAccountingProvisionTypeSchema = z.enum([
  'RISK_AND_CHARGE',
  'RECEIVABLE_IMPAIRMENT',
  'INVENTORY_IMPAIRMENT',
  'ASSET_IMPAIRMENT',
  'OTHER',
]);

export const erpAccountingProvisionReversalSchema = z.object({
  id: uuidSchema,
  provisionId: uuidSchema,
  amountCents: centsSchema,
  entryDate: civilDateHttpSchema,
  reason: nonBlankStringSchema,
  accountingEntryId: uuidSchema,
  createdByTwentyUserId: nonBlankStringSchema,
  createdAt: instantSchema,
});

export const erpAccountingProvisionSchema = z
  .object({
    id: uuidSchema,
    organisationId: uuidSchema,
    societeId: uuidSchema,
    exerciceId: uuidSchema,
    exerciceYear: nonNegativeIntegerSchema,
    type: erpAccountingProvisionTypeSchema,
    status: erpAccountingProvisionStatusSchema,
    label: nonBlankStringSchema,
    provisionDate: civilDateHttpSchema,
    reviewDate: civilDateHttpSchema.nullable(),
    journalCode: nonBlankStringSchema,
    expenseAccountCode: nonBlankStringSchema,
    provisionAccountCode: nonBlankStringSchema,
    reversalAccountCode: nonBlankStringSchema,
    amountCents: centsSchema,
    dotationEntryId: nullableUuidSchema,
    postedAt: nullableInstantSchema,
    postedByTwentyUserId: nullableStringSchema,
    cancelledAt: nullableInstantSchema,
    cancelledByTwentyUserId: nullableStringSchema,
    cancellationReason: nullableStringSchema,
    createdByTwentyUserId: nonBlankStringSchema,
    createdAt: instantSchema,
    updatedAt: instantSchema,
    reversedAmountCents: centsSchema,
    remainingAmountCents: centsSchema,
    reversals: z.array(erpAccountingProvisionReversalSchema),
  })
  .superRefine((provision, context) => {
    if (
      provision.reversedAmountCents + provision.remainingAmountCents !==
      provision.amountCents
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Provision reversal amounts must match the original amount',
        path: ['remainingAmountCents'],
      });
    }
    if (
      provision.status === 'REVERSED' &&
      provision.remainingAmountCents !== 0
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'A reversed provision cannot keep a remaining amount',
        path: ['status'],
      });
    }
  });

export const erpAccountingProvisionListSchema = z.object({
  items: z.array(erpAccountingProvisionSchema),
});

export const erpAccountingAccountSchema = z.object({
  id: uuidSchema,
  organisationId: uuidSchema,
  code: nonBlankStringSchema,
  libelle: nonBlankStringSchema,
  classe: z.number().int().min(1).max(9),
  isActive: z.boolean(),
  createdAt: instantSchema,
  updatedAt: instantSchema,
});

export const erpAccountingJournalTypeSchema = z.enum([
  'VENTE',
  'ACHAT',
  'BANQUE',
  'CAISSE',
  'OD',
  'PAIE',
]);

export const erpAccountingJournalSchema = z.object({
  id: uuidSchema,
  organisationId: uuidSchema,
  code: nonBlankStringSchema,
  libelle: nonBlankStringSchema,
  type: erpAccountingJournalTypeSchema,
  isActive: z.boolean(),
  createdAt: instantSchema,
  updatedAt: instantSchema,
});

export const erpAccountingReferencesSchema = z.object({
  accounts: z.array(erpAccountingAccountSchema),
  journals: z.array(erpAccountingJournalSchema),
});

export const erpAccountingReportStatusSchema = z.enum(['DRAFT', 'VALIDATED']);

export const erpBalanceItemSchema = z
  .object({
    accountId: uuidSchema,
    accountCode: nonBlankStringSchema,
    accountLabel: nonBlankStringSchema,
    classNumber: nonNegativeIntegerSchema,
    debitCents: centsSchema,
    creditCents: centsSchema,
    balanceCents: signedCentsSchema,
    debitBalanceCents: centsSchema,
    creditBalanceCents: centsSchema,
  })
  .superRefine((item, context) => {
    if (item.balanceCents !== item.debitCents - item.creditCents) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Account balance must equal debit minus credit',
        path: ['balanceCents'],
      });
    }
    if (
      item.debitBalanceCents !== Math.max(item.balanceCents, 0) ||
      item.creditBalanceCents !== Math.max(-item.balanceCents, 0)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'Debit and credit balance columns must reflect the signed balance',
        path: ['debitBalanceCents'],
      });
    }
  });

export const erpBalanceReportSchema = z
  .object({
    from: nullableCivilDateSchema,
    to: nullableCivilDateSchema,
    includeDraft: z.boolean(),
    items: z.array(erpBalanceItemSchema),
    totals: z.object({
      debitCents: centsSchema,
      creditCents: centsSchema,
      debitBalanceCents: centsSchema,
      creditBalanceCents: centsSchema,
    }),
  })
  .superRefine((report, context) => {
    const totals = report.items.reduce(
      (result, item) => ({
        debitCents: result.debitCents + item.debitCents,
        creditCents: result.creditCents + item.creditCents,
        debitBalanceCents: result.debitBalanceCents + item.debitBalanceCents,
        creditBalanceCents: result.creditBalanceCents + item.creditBalanceCents,
      }),
      {
        debitCents: 0,
        creditCents: 0,
        debitBalanceCents: 0,
        creditBalanceCents: 0,
      },
    );
    if (
      totals.debitCents !== report.totals.debitCents ||
      totals.creditCents !== report.totals.creditCents ||
      totals.debitBalanceCents !== report.totals.debitBalanceCents ||
      totals.creditBalanceCents !== report.totals.creditBalanceCents
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Balance totals must equal the sum of account rows',
        path: ['totals'],
      });
    }
  });

export const erpGrandLivreItemSchema = z.object({
  lineId: uuidSchema,
  entryId: uuidSchema,
  entryDate: civilDateHttpSchema,
  journalCode: nonBlankStringSchema,
  journalLabel: nonBlankStringSchema,
  label: nonBlankStringSchema,
  sourceType: erpAccountingSourceTypeSchema,
  sourceId: uuidSchema,
  status: erpAccountingReportStatusSchema,
  debitCents: centsSchema,
  creditCents: centsSchema,
  runningBalanceCents: signedCentsSchema,
});

export const erpGrandLivreReportSchema = z
  .object({
    account: z.object({
      id: uuidSchema,
      code: nonBlankStringSchema,
      label: nonBlankStringSchema,
      classNumber: nonNegativeIntegerSchema,
    }),
    from: nullableCivilDateSchema,
    to: nullableCivilDateSchema,
    includeDraft: z.boolean(),
    items: z.array(erpGrandLivreItemSchema),
    totals: z.object({
      debitCents: centsSchema,
      creditCents: centsSchema,
      balanceCents: signedCentsSchema,
    }),
  })
  .superRefine((report, context) => {
    const debitCents = report.items.reduce(
      (total, item) => total + item.debitCents,
      0,
    );
    const creditCents = report.items.reduce(
      (total, item) => total + item.creditCents,
      0,
    );
    const balanceCents =
      report.items[report.items.length - 1]?.runningBalanceCents ?? 0;
    if (
      debitCents !== report.totals.debitCents ||
      creditCents !== report.totals.creditCents ||
      balanceCents !== report.totals.balanceCents
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Grand livre totals must match its lines',
        path: ['totals'],
      });
    }
  });

export const erpLettrageLineSchema = z
  .object({
    lineId: uuidSchema,
    entryId: uuidSchema,
    entryDate: civilDateHttpSchema,
    journalCode: nonBlankStringSchema,
    label: nonBlankStringSchema,
    sourceType: erpAccountingSourceTypeSchema,
    sourceId: uuidSchema,
    debitCents: centsSchema,
    creditCents: centsSchema,
  })
  .superRefine((line, context) => {
    const hasDebit = line.debitCents > 0 && line.creditCents === 0;
    const hasCredit = line.creditCents > 0 && line.debitCents === 0;
    if (!hasDebit && !hasCredit) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'A lettering line requires exactly one positive side',
        path: ['debitCents'],
      });
    }
  });

export const erpLettrageMatchSchema = z
  .object({
    id: uuidSchema,
    reference: z.string().regex(/^[A-Z]{2,8}$/),
    accountId: uuidSchema,
    accountCode: nonBlankStringSchema,
    matchedAt: instantSchema,
    matchedByTwentyUserId: nonBlankStringSchema,
    unmatchedAt: nullableInstantSchema,
    unmatchedByTwentyUserId: nullableStringSchema,
    lines: z.array(erpLettrageLineSchema).min(2),
    totalDebitCents: centsSchema,
    totalCreditCents: centsSchema,
  })
  .superRefine((match, context) => {
    const totalDebitCents = match.lines.reduce(
      (total, line) => total + line.debitCents,
      0,
    );
    const totalCreditCents = match.lines.reduce(
      (total, line) => total + line.creditCents,
      0,
    );
    if (
      match.totalDebitCents !== totalDebitCents ||
      match.totalCreditCents !== totalCreditCents ||
      totalDebitCents !== totalCreditCents
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Lettering totals must be balanced and match its lines',
        path: ['totalCreditCents'],
      });
    }
    const hasUnmatch =
      match.unmatchedAt !== null && match.unmatchedByTwentyUserId !== null;
    if (
      (match.unmatchedAt === null && match.unmatchedByTwentyUserId !== null) ||
      (match.unmatchedAt !== null && !hasUnmatch)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Lettering unmatch audit fields must be set together',
        path: ['unmatchedAt'],
      });
    }
  });

export const erpLettrageSuggestionSchema = z
  .object({
    debitLine: erpLettrageLineSchema,
    creditLine: erpLettrageLineSchema,
    amountCents: positiveIntegerSchema,
    dateDistanceDays: nonNegativeIntegerSchema.max(30),
  })
  .superRefine((suggestion, context) => {
    if (
      suggestion.debitLine.debitCents !== suggestion.amountCents ||
      suggestion.debitLine.creditCents !== 0 ||
      suggestion.creditLine.creditCents !== suggestion.amountCents ||
      suggestion.creditLine.debitCents !== 0
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Suggested lettering must contain equal opposite amounts',
        path: ['amountCents'],
      });
    }
  });

export const erpLettrageSuggestionsSchema = z
  .object({
    account: z.object({
      id: uuidSchema,
      code: nonBlankStringSchema,
      label: nonBlankStringSchema,
      classNumber: nonNegativeIntegerSchema,
    }),
    suggestions: z.array(erpLettrageSuggestionSchema),
    activeMatches: z.array(erpLettrageMatchSchema),
  })
  .superRefine((result, context) => {
    result.activeMatches.forEach((match, index) => {
      if (match.unmatchedAt !== null) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Active lettering matches cannot be unmatched',
          path: ['activeMatches', index, 'unmatchedAt'],
        });
      }
    });
  });

export const erpBankStatementStatusSchema = z.enum([
  'PENDING_OCR',
  'PROCESSING',
  'READY_FOR_REVIEW',
  'CONFIRMED',
  'CLOSED',
  'FAILED',
]);

export const erpBankAccountSchema = z.object({
  id: uuidSchema,
  name: nonBlankStringSchema,
  bankName: nonBlankStringSchema,
  rib: z.string().regex(/^\d{24}$/),
  currency: z.literal('MAD'),
  accountingAccountCode: z.string().regex(/^\d{4,8}$/),
  openingBalanceCents: signedCentsSchema,
  isActive: z.boolean(),
  createdAt: instantSchema,
  updatedAt: instantSchema,
});

export const erpBankAccountListSchema = z.array(erpBankAccountSchema);

export const erpSupplierBankReconciliationSchema = z.object({
  kind: z.literal('SUPPLIER'),
  supplierPaymentPreparationId: uuidSchema,
  supplierId: uuidSchema,
  supplierName: nonBlankStringSchema,
  supplierInvoiceId: uuidSchema,
  supplierInvoiceReference: nonBlankStringSchema,
  paymentReference: nullableStringSchema,
  paymentDate: civilDateSchema,
  amountCents: positiveIntegerSchema,
  method: erpPaymentMethodSchema,
  reconciledAt: instantSchema,
  reconciledByTwentyUserId: nonBlankStringSchema,
});

export const erpCustomerBankReconciliationSchema = z.object({
  kind: z.literal('CUSTOMER'),
  customerPaymentId: uuidSchema,
  customerId: uuidSchema,
  customerName: nonBlankStringSchema,
  invoiceReferences: z.array(nonBlankStringSchema),
  paymentReference: nullableStringSchema,
  paymentDate: civilDateSchema,
  amountCents: positiveIntegerSchema,
  method: erpPaymentMethodSchema,
  reconciledAt: instantSchema,
  reconciledByTwentyUserId: nonBlankStringSchema,
});

export const erpOpeningItemBankReconciliationSchema = z.object({
  kind: z.literal('OPENING_ITEM'),
  openingOpenItemId: uuidSchema,
  tierId: uuidSchema,
  tierName: nonBlankStringSchema,
  openItemKind: z.enum(['RECEIVABLE', 'PAYABLE']),
  openItemReference: nonBlankStringSchema,
  settlementDate: civilDateSchema,
  amountCents: positiveIntegerSchema,
  remainingOutstandingCents: centsSchema,
  accountingEntryId: uuidSchema,
  accountingEntryStatus: z.enum(['DRAFT', 'VALIDATED', 'LOCKED', 'REJECTED']),
  reversalAccountingEntryId: uuidSchema.nullable(),
  reversalAccountingEntryStatus: z
    .enum(['DRAFT', 'VALIDATED', 'LOCKED', 'REJECTED'])
    .nullable(),
  reconciledAt: instantSchema,
  reconciledByTwentyUserId: nonBlankStringSchema,
});

export const erpChequeBankReconciliationSchema = z.object({
  kind: z.literal('CHEQUE'),
  chequeId: uuidSchema,
  direction: erpChequeDirectionSchema,
  instrumentType: erpChequeInstrumentTypeSchema,
  number: nonBlankStringSchema,
  counterpartyName: nonBlankStringSchema,
  tierId: nullableUuidSchema,
  tierName: nullableStringSchema,
  bankAccountId: uuidSchema,
  bankAccountName: nonBlankStringSchema,
  bankName: nonBlankStringSchema,
  amountCents: positiveIntegerSchema,
  status: erpChequeStatusSchema,
  reconciledAt: instantSchema,
  reconciledByTwentyUserId: nonBlankStringSchema,
});

export const erpBankReconciliationSchema = z.discriminatedUnion('kind', [
  erpChequeBankReconciliationSchema,
  erpSupplierBankReconciliationSchema,
  erpCustomerBankReconciliationSchema,
  erpOpeningItemBankReconciliationSchema,
]);

export const erpBankReconciliationReasonSchema = z.enum([
  'AMOUNT_EXACT',
  'DIRECTION_MATCH',
  'BANK_ACCOUNT_MATCH',
  'DATE_EXACT',
  'DATE_NEAR',
  'REFERENCE_MATCH',
  'CHEQUE_NUMBER_MATCH',
  'COUNTERPARTY_MATCH',
]);

export const erpChequeBankReconciliationCandidateSchema = z.object({
  kind: z.literal('CHEQUE'),
  chequeId: uuidSchema,
  direction: erpChequeDirectionSchema,
  instrumentType: erpChequeInstrumentTypeSchema,
  number: nonBlankStringSchema,
  counterpartyName: nonBlankStringSchema,
  tierId: nullableUuidSchema,
  tierName: nullableStringSchema,
  bankAccountId: uuidSchema,
  bankAccountName: nonBlankStringSchema,
  bankName: nonBlankStringSchema,
  amountCents: positiveIntegerSchema,
  status: erpChequeStatusSchema,
  effectiveDate: civilDateSchema,
  score: nonNegativeIntegerSchema.max(100),
  dateDistanceDays: nonNegativeIntegerSchema,
  reasons: z.array(erpBankReconciliationReasonSchema).min(1),
});

export const erpSupplierBankReconciliationCandidateSchema = z.object({
  kind: z.literal('SUPPLIER'),
  supplierPaymentPreparationId: uuidSchema,
  supplierId: uuidSchema,
  supplierName: nonBlankStringSchema,
  supplierInvoiceId: uuidSchema,
  supplierInvoiceReference: nonBlankStringSchema,
  paymentReference: nullableStringSchema,
  paymentDate: civilDateSchema,
  amountCents: positiveIntegerSchema,
  method: erpPaymentMethodSchema,
  score: nonNegativeIntegerSchema.max(100),
  dateDistanceDays: nonNegativeIntegerSchema,
  reasons: z.array(erpBankReconciliationReasonSchema).min(1),
});

export const erpCustomerBankReconciliationCandidateSchema = z.object({
  kind: z.literal('CUSTOMER'),
  customerPaymentId: uuidSchema,
  customerId: uuidSchema,
  customerName: nonBlankStringSchema,
  invoiceReferences: z.array(nonBlankStringSchema),
  paymentReference: nullableStringSchema,
  paymentDate: civilDateSchema,
  amountCents: positiveIntegerSchema,
  method: erpPaymentMethodSchema,
  score: nonNegativeIntegerSchema.max(100),
  dateDistanceDays: nonNegativeIntegerSchema,
  reasons: z.array(erpBankReconciliationReasonSchema).min(1),
});

export const erpBankReconciliationCandidateSchema = z.discriminatedUnion(
  'kind',
  [
    erpChequeBankReconciliationCandidateSchema,
    erpSupplierBankReconciliationCandidateSchema,
    erpCustomerBankReconciliationCandidateSchema,
  ],
);

export const erpBankReconciliationCandidatesSchema = z.object({
  lineId: uuidSchema,
  candidates: z.array(erpBankReconciliationCandidateSchema),
});

export const erpBankStatementLineSchema = z.object({
  id: uuidSchema,
  position: nonNegativeIntegerSchema,
  pageNumber: positiveIntegerSchema,
  transactionDate: civilDateSchema,
  valueDate: nullableCivilDateSchema,
  description: nonBlankStringSchema,
  reference: nullableStringSchema,
  debitCents: centsSchema,
  creditCents: centsSchema,
  balanceCents: signedCentsSchema.nullable(),
  confidenceBasisPoints: nonNegativeIntegerSchema.max(10_000),
  needsReview: z.boolean(),
  sourceText: z.string(),
  boundingBox: z.array(z.number().finite()).length(4).nullable(),
  review: z
    .object({
      reason: nullableStringSchema,
      reviewedAt: instantSchema,
      reviewedByTwentyUserId: nonBlankStringSchema,
    })
    .nullable(),
  reconciliation: erpBankReconciliationSchema.nullable(),
});

export const erpBankStatementSchema = z.object({
  id: uuidSchema,
  originalFilename: nonBlankStringSchema,
  contentSha256: z.string().regex(/^[0-9a-f]{64}$/),
  status: erpBankStatementStatusSchema,
  bankAccount: erpBankAccountSchema.nullable(),
  ocrEngine: nullableStringSchema,
  pageCount: positiveIntegerSchema.nullable(),
  lineCount: nonNegativeIntegerSchema,
  openingBalanceCents: signedCentsSchema.nullable(),
  closingBalanceCents: signedCentsSchema.nullable(),
  balanceCheckPassed: z.boolean().nullable(),
  lastError: nullableStringSchema,
  createdAt: instantSchema,
  updatedAt: instantSchema,
  confirmedAt: nullableInstantSchema,
  closedAt: nullableInstantSchema,
});

export const erpBankStatementListSchema = z.array(erpBankStatementSchema);
export const erpBankStatementDetailSchema = erpBankStatementSchema.extend({
  resolvedLineCount: nonNegativeIntegerSchema,
  unresolvedLineCount: nonNegativeIntegerSchema,
  reconciliationRateBasisPoints: nonNegativeIntegerSchema.max(10_000),
  lines: z.array(erpBankStatementLineSchema),
});

export const erpWarehouseSchema = erpWarehouseSummarySchema.extend({
  societeId: uuidSchema,
  address: nullableStringSchema,
  isDefault: z.boolean(),
  isActive: z.boolean(),
  createdAt: instantSchema,
  updatedAt: instantSchema,
});
export const erpWarehouseListSchema = z.array(erpWarehouseSchema);

export const erpStockProductSchema = z.object({
  id: uuidSchema,
  code: z.string(),
  name: z.string(),
  unit: z.string(),
});

export const erpStockLevelSchema = z.object({
  warehouse: erpWarehouseSummarySchema.extend({ isDefault: z.boolean() }),
  product: erpStockProductSchema,
  quantity: z.number().finite().nonnegative(),
  averageUnitCostCents: z.number().finite().nonnegative(),
  inventoryValueCents: centsSchema,
  reservedQuantity: z.number().finite().nonnegative(),
  preparedQuantity: z.number().finite().nonnegative(),
  availableQuantity: z.number().finite().nonnegative(),
  updatedAt: nullableInstantSchema,
});
export const erpStockLevelListSchema = z.array(erpStockLevelSchema);

export const erpStockMovementTypeSchema = z.enum([
  'PURCHASE_RECEIPT',
  'SALES_DELIVERY',
  'SALES_DELIVERY_CANCEL',
  'CUSTOMER_RETURN',
  'ADJUSTMENT_IN',
  'ADJUSTMENT_OUT',
  'TRANSFER_IN',
  'TRANSFER_OUT',
  'INVENTORY_CORRECTION_IN',
  'INVENTORY_CORRECTION_OUT',
]);

export const erpStockMovementSchema = z.object({
  id: uuidSchema,
  warehouseId: uuidSchema,
  productId: uuidSchema,
  type: erpStockMovementTypeSchema,
  quantityDelta: z.number().finite(),
  quantityAfter: z.number().finite().nonnegative(),
  unitCostCents: z.number().finite().nonnegative(),
  valueDeltaCents: signedCentsSchema,
  inventoryValueAfterCents: centsSchema,
  reference: nullableStringSchema,
  notes: nullableStringSchema,
  transferGroupId: nullableUuidSchema,
  purchaseReceiptLineId: nullableUuidSchema,
  inventoryCountLineId: nullableUuidSchema,
  deliveryNoteLineId: nullableUuidSchema,
  customerReturnLineId: nullableUuidSchema,
  occurredAt: civilDateHttpSchema,
  createdByTwentyUserId: nonBlankStringSchema,
  createdAt: instantSchema,
  warehouse: erpWarehouseSummarySchema,
  product: erpStockProductSchema,
});
export const erpStockMovementListSchema = z.array(erpStockMovementSchema);

const erpGrossMarginAmountsSchema = z.object({
  grossRevenueHtCents: centsSchema,
  returnedRevenueHtCents: centsSchema,
  deliveredCostCents: centsSchema,
  returnedCostCents: centsSchema,
  netRevenueHtCents: centsSchema,
  netCostCents: centsSchema,
  grossMarginCents: signedCentsSchema,
  marginRateBasisPoints: signedCentsSchema.nullable(),
});

export const erpGrossMarginDeliverySchema = erpGrossMarginAmountsSchema.extend({
  deliveryNoteId: uuidSchema,
  deliveryNumber: nonBlankStringSchema,
  deliveryDate: civilDateHttpSchema,
  salesOrderId: uuidSchema,
  salesOrderNumber: nonBlankStringSchema,
  customerId: uuidSchema,
  customerName: nonBlankStringSchema,
});

export const erpGrossMarginReportSchema = z.object({
  summary: erpGrossMarginAmountsSchema.extend({
    deliveryCount: nonNegativeIntegerSchema,
  }),
  deliveries: z.array(erpGrossMarginDeliverySchema),
});

export const erpInventoryCountStatusSchema = z.enum([
  'DRAFT',
  'VALIDATED',
  'CANCELLED',
]);

export const erpInventoryCountLineSchema = z.object({
  id: uuidSchema,
  productId: uuidSchema,
  expectedQuantity: z.number().finite().nonnegative(),
  countedQuantity: z.number().finite().nonnegative(),
  quantityBeforeValidation: z.number().finite().nonnegative().nullable(),
  varianceQuantity: z.number().finite().nullable(),
  position: z.number().int().nonnegative(),
  product: erpStockProductSchema,
  stockMovement: z.object({ id: uuidSchema }).nullable(),
});

export const erpInventoryCountSchema = z.object({
  id: uuidSchema,
  warehouseId: uuidSchema,
  number: z.string(),
  year: z.number().int(),
  status: erpInventoryCountStatusSchema,
  countedAt: civilDateHttpSchema,
  notes: nullableStringSchema,
  validatedAt: nullableInstantSchema,
  cancelledAt: nullableInstantSchema,
  createdAt: instantSchema,
  updatedAt: instantSchema,
  warehouse: erpWarehouseSummarySchema,
  lines: z.array(erpInventoryCountLineSchema),
});
export const erpInventoryCountListSchema = z.array(erpInventoryCountSchema);

export const erpInventoryThresholdSchema = z.object({
  id: uuidSchema,
  warehouseId: uuidSchema,
  productId: uuidSchema,
  minimumQuantity: z.number().finite().nonnegative(),
  targetQuantity: z.number().finite().nonnegative(),
  reorderEnabled: z.boolean(),
  updatedAt: instantSchema,
  warehouse: erpWarehouseSummarySchema,
  product: erpStockProductSchema,
});
export const erpInventoryThresholdListSchema = z.array(
  erpInventoryThresholdSchema,
);

export const erpReplenishmentSuggestionSchema = z.object({
  thresholdId: uuidSchema,
  warehouse: erpWarehouseSummarySchema,
  product: erpStockProductSchema,
  currentQuantity: z.number().finite().nonnegative(),
  physicalQuantity: z.number().finite().nonnegative(),
  reservedQuantity: z.number().finite().nonnegative(),
  preparedQuantity: z.number().finite().nonnegative(),
  availableQuantity: z.number().finite().nonnegative(),
  minimumQuantity: z.number().finite().nonnegative(),
  targetQuantity: z.number().finite().nonnegative(),
  suggestedQuantity: z.number().finite().positive(),
});
export const erpReplenishmentSuggestionListSchema = z.array(
  erpReplenishmentSuggestionSchema,
);

export const erpTaxDeclarationSchema = z
  .object({
    id: uuidSchema,
    exerciceId: uuidSchema,
    type: z.enum(['TVA', 'IS']),
    periodKey: nonBlankStringSchema,
    periodStart: civilDateHttpSchema,
    periodEnd: civilDateHttpSchema,
    dueDate: civilDateHttpSchema,
    status: z.enum(['DRAFT', 'REVIEWED', 'FILED', 'PAID', 'CANCELLED']),
    taxableBaseCents: signedCentsSchema,
    collectedTaxCents: signedCentsSchema,
    deductibleTaxCents: signedCentsSchema,
    previousCreditCents: signedCentsSchema,
    prorataBasisPoints: nonNegativeIntegerSchema,
    taxDueCents: signedCentsSchema,
    taxCreditCents: signedCentsSchema,
    calculation: z.unknown(),
    simplXml: nullableStringSchema,
    filingReference: nullableStringSchema,
    reviewedAt: nullableInstantSchema,
    filedAt: nullableInstantSchema,
    paidAt: nullableInstantSchema,
    createdAt: instantSchema,
    updatedAt: instantSchema,
    exercice: z.object({ annee: nonNegativeIntegerSchema }).optional(),
  })
  .passthrough();
export const erpTaxDeclarationListSchema = z.array(erpTaxDeclarationSchema);

export const erpFiscalDeadlineSchema = z
  .object({
    id: uuidSchema,
    code: nonBlankStringSchema,
    label: nonBlankStringSchema,
    category: nonBlankStringSchema,
    dueDate: civilDateHttpSchema,
    periodKey: nonBlankStringSchema,
    completedAt: nullableInstantSchema,
    notes: nullableStringSchema,
    createdAt: instantSchema,
    updatedAt: instantSchema,
  })
  .passthrough();
export const erpFiscalDeadlineListSchema = z.array(erpFiscalDeadlineSchema);

export const erpTvaProrataPeriodSchema = z
  .object({
    id: uuidSchema,
    exerciceId: uuidSchema,
    periodKey: nonBlankStringSchema,
    taxableRevenueCents: centsSchema,
    totalRevenueCents: positiveIntegerSchema,
    inputVatBeforeProrataCents: centsSchema,
    rateBasisPoints: nonNegativeIntegerSchema.max(10_000),
    deductibleVatCents: centsSchema,
    notes: nullableStringSchema,
    calculatedByTwentyUserId: nonBlankStringSchema,
    createdAt: instantSchema,
    updatedAt: instantSchema,
  })
  .passthrough();
export const erpTvaProrataPeriodListSchema = z.array(erpTvaProrataPeriodSchema);

export const erpAnnualTvaProrataSchema = z.object({
  exerciceId: uuidSchema,
  periods: nonNegativeIntegerSchema,
  taxableRevenueCents: centsSchema,
  totalRevenueCents: positiveIntegerSchema,
  rateBasisPoints: nonNegativeIntegerSchema.max(10_000),
  inputVatBeforeProrataCents: centsSchema,
  deductedVatCents: centsSchema,
  annualDeductibleVatCents: centsSchema,
  regularizationCents: signedCentsSchema,
  direction: z.enum(['ADDITIONAL_DEDUCTION', 'REVERSAL', 'NONE']),
});

export const erpTvaProrataPostingSchema = z
  .object({
    id: uuidSchema,
    annual: erpAnnualTvaProrataSchema,
  })
  .passthrough();

export const erpTaxPaymentSchema = z
  .object({
    id: uuidSchema,
    taxDeclarationId: uuidSchema,
    bankStatementLineId: nullableUuidSchema,
    kind: z.enum(['TVA', 'IS_INSTALLMENT', 'IS_BALANCE', 'OTHER']),
    amountCents: positiveIntegerSchema,
    paymentDate: civilDateHttpSchema,
    reference: nullableStringSchema,
    createdAt: instantSchema,
    updatedAt: instantSchema,
    totalPaidCents: centsSchema.optional(),
  })
  .passthrough();
export const erpTaxPaymentListSchema = z.array(erpTaxPaymentSchema);

export const erpTaxPaymentCandidateSchema = z
  .object({
    id: uuidSchema,
    transactionDate: civilDateHttpSchema,
    description: nonBlankStringSchema,
    reference: nullableStringSchema,
    debitCents: positiveIntegerSchema,
    confidenceBasisPoints: nonNegativeIntegerSchema.max(10_000),
    exactAmount: z.boolean(),
    dayDifference: nonNegativeIntegerSchema,
  })
  .passthrough();
export const erpTaxPaymentCandidateListSchema = z.array(
  erpTaxPaymentCandidateSchema,
);

export const erpFileExportSchema = z.object({
  filename: nonBlankStringSchema,
  contentType: nonBlankStringSchema,
  content: z.string(),
});

export const erpAccountingPeriodSchema = z
  .object({
    id: uuidSchema,
    exerciceId: uuidSchema,
    periodNumber: positiveIntegerSchema,
    startDate: civilDateHttpSchema,
    endDate: civilDateHttpSchema,
    status: z.enum(['OPEN', 'CLOSED']),
    closedAt: nullableInstantSchema,
    reopenedAt: nullableInstantSchema,
    reopenReason: nullableStringSchema,
    createdAt: instantSchema,
    updatedAt: instantSchema,
  })
  .passthrough();

export const erpAccountingReviewStatusSchema = z.enum([
  'TODO',
  'IN_PROGRESS',
  'READY_FOR_REVIEW',
  'DONE',
  'REJECTED',
  'NOT_APPLICABLE',
]);

export const erpAccountingReviewAccountSchema = z
  .object({
    id: uuidSchema,
    exerciceId: uuidSchema,
    reviewTaskId: uuidSchema,
    accountId: uuidSchema,
    accountCode: nonBlankStringSchema,
    accountLabel: nonBlankStringSchema,
    debitCents: signedCentsSchema,
    creditCents: signedCentsSchema,
    balanceCents: signedCentsSchema,
    status: erpAccountingReviewStatusSchema,
    assignedToTwentyUserId: nullableStringSchema,
    dueDate: nullableCivilDateHttpSchema,
    notes: nullableStringSchema,
    evidence: z.unknown().nullable(),
    completedAt: nullableInstantSchema,
    reviewedAt: nullableInstantSchema,
    createdAt: instantSchema,
    updatedAt: instantSchema,
  })
  .passthrough();

export const erpAccountingReviewTaskSchema = z
  .object({
    id: uuidSchema,
    exerciceId: uuidSchema,
    code: nonBlankStringSchema,
    label: nonBlankStringSchema,
    category: nonBlankStringSchema,
    status: erpAccountingReviewStatusSchema,
    isCritical: z.boolean(),
    assignedToTwentyUserId: nullableStringSchema,
    dueDate: nullableCivilDateHttpSchema,
    evidence: z.unknown().nullable(),
    notes: nullableStringSchema,
    completedAt: nullableInstantSchema,
    reviewedAt: nullableInstantSchema,
    accounts: z.array(erpAccountingReviewAccountSchema).optional(),
    createdAt: instantSchema,
    updatedAt: instantSchema,
  })
  .passthrough();
export const erpAccountingReviewTaskListSchema = z.array(
  erpAccountingReviewTaskSchema,
);

export const erpAccountingReviewDossierSchema = z.object({
  exercise: z.object({
    id: uuidSchema,
    year: nonNegativeIntegerSchema,
    startDate: civilDateHttpSchema,
    endDate: civilDateHttpSchema,
    status: z.enum(['OPEN', 'CLOSING', 'CLOSED']),
  }),
  assignees: z.array(
    z.object({
      twentyUserId: nonBlankStringSchema,
      email: nullableStringSchema,
      role: erpRoleSchema,
    }),
  ),
  tasks: z.array(erpAccountingReviewTaskSchema),
  summary: z.object({
    tasksTotal: nonNegativeIntegerSchema,
    tasksApproved: nonNegativeIntegerSchema,
    accountsTotal: nonNegativeIntegerSchema,
    accountsApproved: nonNegativeIntegerSchema,
    blockers: nonNegativeIntegerSchema,
    progressBasisPoints: nonNegativeIntegerSchema.max(10_000),
    canClose: z.boolean(),
  }),
  blockers: z.array(
    z.object({
      type: z.enum(['TASK', 'ACCOUNT']),
      id: uuidSchema,
      label: nonBlankStringSchema,
    }),
  ),
});

export const erpAccountingReviewExportSchema = z.object({
  filename: nonBlankStringSchema,
  contentType: nonBlankStringSchema,
  contentBase64: nonBlankStringSchema,
  payloadSha256: nonBlankStringSchema,
});

export const erpExerciseSchema = z
  .object({
    id: uuidSchema,
    annee: nonNegativeIntegerSchema,
    dateDebut: civilDateHttpSchema,
    dateFin: civilDateHttpSchema,
    status: z.enum(['OPEN', 'CLOSING', 'CLOSED']),
    closingStartedAt: nullableInstantSchema,
    closedAt: nullableInstantSchema,
    closingEntryId: nullableUuidSchema,
    openingEntryId: nullableUuidSchema,
    accountingPeriods: z.array(erpAccountingPeriodSchema).optional(),
    accountingReviewTasks: z.array(erpAccountingReviewTaskSchema).optional(),
    createdAt: instantSchema,
    updatedAt: instantSchema,
  })
  .passthrough();
export const erpExerciseListSchema = z.array(erpExerciseSchema);

const erpCpcSchema = z.object({
  operating: z.object({
    revenueCents: signedCentsSchema,
    expensesCents: signedCentsSchema,
    resultCents: signedCentsSchema,
  }),
  financial: z.object({
    revenueCents: signedCentsSchema,
    expensesCents: signedCentsSchema,
    resultCents: signedCentsSchema,
  }),
  nonCurrent: z.object({
    revenueCents: signedCentsSchema,
    expensesCents: signedCentsSchema,
    resultCents: signedCentsSchema,
  }),
  incomeTaxCents: signedCentsSchema,
  netResultCents: signedCentsSchema,
});

export const erpFinancialStatementsSchema = z
  .object({
    exercise: z.object({
      id: uuidSchema,
      year: nonNegativeIntegerSchema,
      startDate: civilDateHttpSchema,
      endDate: civilDateHttpSchema,
      status: z.enum(['OPEN', 'CLOSING', 'CLOSED']),
    }),
    company: z
      .object({
        raisonSociale: nonBlankStringSchema,
        ice: nullableStringSchema,
        identifiantFiscal: nullableStringSchema,
      })
      .passthrough(),
    bilan: z.object({
      assets: z.object({ totalCents: signedCentsSchema }).passthrough(),
      liabilities: z.object({ totalCents: signedCentsSchema }).passthrough(),
      differenceCents: signedCentsSchema,
      isBalanced: z.boolean(),
    }),
    cpc: erpCpcSchema,
    esg: z
      .object({
        valueAddedCents: signedCentsSchema,
        grossOperatingSurplusCents: signedCentsSchema,
        netResultCents: signedCentsSchema,
      })
      .passthrough(),
    financing: z
      .object({
        selfFinancingCapacityCents: signedCentsSchema,
        netTreasuryChangeCents: signedCentsSchema,
      })
      .passthrough(),
    taxDeclarations: z.array(z.unknown()),
    annexes: z.unknown(),
  })
  .passthrough();

export const erpFecExportSchema = erpFileExportSchema.extend({
  entries: nonNegativeIntegerSchema,
  lines: nonNegativeIntegerSchema,
});
export const erpFecImportResultSchema = z.object({
  importedEntries: nonNegativeIntegerSchema,
  skippedEntries: nonNegativeIntegerSchema,
  lines: nonNegativeIntegerSchema,
});
export const erpExerciseClosingResultSchema = z.object({
  closedExercise: erpExerciseSchema,
  nextExercise: erpExerciseSchema,
  closingEntryId: nullableUuidSchema,
  openingEntryId: nullableUuidSchema,
});

export const erpLiasseFieldDefinitionSchema = z.object({
  key: nonBlankStringSchema,
  label: nonBlankStringSchema,
  type: z.enum(['text', 'date', 'integer', 'amount', 'percentage']),
  required: z.boolean().optional(),
});

export const erpLiasseComputedRowDefinitionSchema = z.object({
  code: nonBlankStringSchema,
  label: nonBlankStringSchema,
  prefixes: z.array(nonBlankStringSchema),
  side: z.enum(['DEBIT', 'CREDIT', 'NET_DEBIT', 'NET_CREDIT']),
});

export const erpLiasseTableDefinitionSchema = z.object({
  code: nonBlankStringSchema,
  label: nonBlankStringSchema,
  category: z.enum(['ETATS', 'ANNEXES', 'SOCIAL', 'JURIDIQUE']),
  mode: z.enum(['COMPUTED', 'MANUAL', 'MIXED']),
  description: nonBlankStringSchema,
  fields: z.array(erpLiasseFieldDefinitionSchema),
  computedRows: z.array(erpLiasseComputedRowDefinitionSchema),
});

export const erpLiasseTableSummarySchema = erpLiasseTableDefinitionSchema
  .extend({
    manualRows: nonNegativeIntegerSchema,
    isReady: z.boolean(),
  })
  .passthrough();
export const erpLiasseTableSummaryListSchema = z.array(
  erpLiasseTableSummarySchema,
);

export const erpLiasseRowSchema = z
  .object({
    id: nullableUuidSchema,
    rowCode: nonBlankStringSchema,
    label: nonBlankStringSchema,
    position: nonNegativeIntegerSchema,
    source: z.enum(['COMPUTED', 'MANUAL', 'IMPORTED']),
    values: z
      .object({})
      .catchall(z.union([z.string(), safeIntegerSchema, z.null()])),
    notes: nullableStringSchema,
  })
  .passthrough();

export const erpLiasseTableDetailSchema = z.object({
  exercise: z.object({
    id: uuidSchema,
    year: safeIntegerSchema,
    startDate: civilDateHttpSchema,
    endDate: civilDateHttpSchema,
  }),
  definition: erpLiasseTableDefinitionSchema,
  rows: z.array(erpLiasseRowSchema),
});

export const erpLiasseDeleteResultSchema = z.object({
  deleted: z.literal(true),
  id: uuidSchema,
});

export const erpLiasseValidationIssueSchema = z.object({
  code: nonBlankStringSchema,
  message: nonBlankStringSchema,
  tableCode: nullableStringSchema,
  rowCode: nullableStringSchema,
});

export const erpLiasseValidationSchema = z.object({
  valid: z.boolean(),
  errors: z.array(erpLiasseValidationIssueSchema),
  warnings: z.array(erpLiasseValidationIssueSchema),
  summary: z.object({
    tables: nonNegativeIntegerSchema,
    readyTables: nonNegativeIntegerSchema,
    manualRows: nonNegativeIntegerSchema,
    rowsChecked: nonNegativeIntegerSchema,
    errors: nonNegativeIntegerSchema,
    warnings: nonNegativeIntegerSchema,
  }),
  checkedAt: instantSchema,
  validator: nonBlankStringSchema,
  externalAcceptanceRequired: z.boolean(),
});

export const erpLiasseExportSchema = z.object({
  submissionId: uuidSchema,
  filename: nonBlankStringSchema,
  contentType: nonBlankStringSchema,
  contentBase64: nonBlankStringSchema,
  payloadSha256: nonBlankStringSchema,
  validation: z.object({
    valid: z.boolean(),
    errors: z.array(z.string()),
    warnings: z.array(z.string()),
    checkedAt: instantSchema,
    validator: nonBlankStringSchema,
    externalAcceptanceRequired: z.boolean(),
  }),
});

export const erpRegulatorySubmissionSchema = z
  .object({
    id: uuidSchema,
    exerciceId: nullableUuidSchema,
    kind: nonBlankStringSchema,
    periodKey: nonBlankStringSchema,
    formatVersion: nonBlankStringSchema,
    filename: nonBlankStringSchema,
    contentType: nonBlankStringSchema,
    payloadSha256: nonBlankStringSchema,
    validationStatus: z.enum([
      'GENERATED',
      'INTERNALLY_VALIDATED',
      'EXTERNALLY_ACCEPTED',
      'REJECTED',
    ]),
    validationReport: z.unknown(),
    generatedAt: instantSchema,
    externallyValidatedAt: nullableInstantSchema,
    externalReference: nullableStringSchema,
    rejectionReason: nullableStringSchema,
    createdAt: instantSchema,
    updatedAt: instantSchema,
  })
  .passthrough();
export const erpRegulatorySubmissionListSchema = z.array(
  erpRegulatorySubmissionSchema,
);

export const erpEmployeeSchema = z
  .object({
    id: uuidSchema,
    employeeNumber: nonBlankStringSchema,
    firstName: nonBlankStringSchema,
    lastName: nonBlankStringSchema,
    cin: nullableStringSchema,
    cnssNumber: nullableStringSchema,
    email: nullableStringSchema,
    phone: nullableStringSchema,
    jobTitle: nonBlankStringSchema,
    department: nullableStringSchema,
    contractType: z.enum(['CDI', 'CDD', 'ANAPEC', 'INTERIM', 'STAGE']),
    status: z.enum(['ACTIVE', 'INACTIVE', 'TERMINATED']),
    hireDate: civilDateHttpSchema,
    terminationDate: nullableCivilDateHttpSchema,
    baseSalaryCents: centsSchema,
    familyDependants: nonNegativeIntegerSchema,
    bankRib: nullableStringSchema,
    createdAt: instantSchema,
    updatedAt: instantSchema,
  })
  .passthrough();
export const erpEmployeeListSchema = z.array(erpEmployeeSchema);

export const erpPayslipLineSchema = z
  .object({
    id: uuidSchema,
    code: nonBlankStringSchema,
    label: nonBlankStringSchema,
    kind: nonBlankStringSchema,
    baseCents: signedCentsSchema,
    rateBasisPoints: signedCentsSchema,
    amountCents: signedCentsSchema,
    position: nonNegativeIntegerSchema,
  })
  .passthrough();
export const erpPayslipSchema = z
  .object({
    id: uuidSchema,
    employeeId: uuidSchema,
    periodKey: nonBlankStringSchema,
    periodStart: civilDateHttpSchema,
    periodEnd: civilDateHttpSchema,
    status: z.enum(['DRAFT', 'VALIDATED', 'PAID', 'CANCELLED']),
    grossSalaryCents: centsSchema,
    cnssEmployeeCents: centsSchema,
    amoEmployeeCents: centsSchema,
    irCents: centsSchema,
    netSalaryCents: centsSchema,
    employerCostCents: centsSchema,
    validatedAt: nullableInstantSchema,
    paidAt: nullableInstantSchema,
    employee: erpEmployeeSchema.optional(),
    lines: z.array(erpPayslipLineSchema).optional(),
    createdAt: instantSchema,
    updatedAt: instantSchema,
  })
  .passthrough();
export const erpPayslipListSchema = z.array(erpPayslipSchema);

export const erpLeaveRequestSchema = z
  .object({
    id: uuidSchema,
    employeeId: uuidSchema,
    type: z.enum([
      'ANNUAL',
      'SICK',
      'MATERNITY',
      'PATERNITY',
      'UNPAID',
      'OTHER',
    ]),
    status: z.enum(['REQUESTED', 'APPROVED', 'REJECTED', 'CANCELLED']),
    startDate: civilDateHttpSchema,
    endDate: civilDateHttpSchema,
    workingDays: z.number().finite().nonnegative(),
    reason: nullableStringSchema,
    decidedAt: nullableInstantSchema,
    employee: erpEmployeeSchema.optional(),
    createdAt: instantSchema,
    updatedAt: instantSchema,
  })
  .passthrough();
export const erpLeaveRequestListSchema = z.array(erpLeaveRequestSchema);
export const erpLeaveBalanceSchema = z
  .object({
    id: nullableUuidSchema,
    employeeId: uuidSchema,
    employee: z.object({
      id: uuidSchema,
      employeeNumber: nonBlankStringSchema,
      firstName: nonBlankStringSchema,
      lastName: nonBlankStringSchema,
    }),
    year: nonNegativeIntegerSchema,
    entitledDays: z.number().finite().nonnegative(),
    carriedDays: z.number().finite(),
    adjustmentDays: z.number().finite(),
    consumedDays: z.number().finite().nonnegative(),
    availableDays: z.number().finite(),
    notes: nullableStringSchema.optional(),
  })
  .passthrough();
export const erpLeaveBalanceListSchema = z.array(erpLeaveBalanceSchema);
export const erpEmployeeTerminationResultSchema = z.object({
  employee: erpEmployeeSchema,
  settlement: z.unknown(),
});
export const erpCnssExportSchema = erpFileExportSchema.extend({
  employees: nonNegativeIntegerSchema,
});

export const erpDocumentSchema = z
  .object({
    id: uuidSchema,
    type: z.enum([
      'SUPPLIER_INVOICE',
      'CUSTOMER_INVOICE',
      'BANK_STATEMENT',
      'RECEIPT',
      'CONTRACT',
      'FISCAL',
      'PAYROLL',
      'OTHER',
    ]),
    status: z.enum([
      'UPLOADED',
      'OCR_PENDING',
      'OCR_PROCESSING',
      'REVIEW_REQUIRED',
      'VALIDATED',
      'REJECTED',
      'FAILED',
    ]),
    filename: nonBlankStringSchema,
    mimeType: nonBlankStringSchema,
    sizeBytes: nonNegativeIntegerSchema,
    title: nonBlankStringSchema,
    notes: nullableStringSchema,
    tags: z.array(z.string()),
    linkedEntityType: nullableStringSchema,
    linkedEntityId: nullableUuidSchema,
    ocrEngine: nullableStringSchema,
    ocrConfidenceBasisPoints: nonNegativeIntegerSchema.nullable(),
    ocrResult: z.unknown().nullable(),
    extractedData: z.unknown().nullable(),
    validationNotes: nullableStringSchema,
    lastError: nullableStringSchema,
    validatedAt: nullableInstantSchema,
    createdAt: instantSchema,
    updatedAt: instantSchema,
  })
  .passthrough();
export const erpDocumentListSchema = z.array(erpDocumentSchema);
export const erpDocumentContentSchema = z.object({
  filename: nonBlankStringSchema,
  mimeType: nonBlankStringSchema,
  contentBase64: z.string(),
});

export const erpExpenseNoteLineSchema = z
  .object({
    id: uuidSchema,
    expenseNoteId: uuidSchema,
    description: nonBlankStringSchema,
    category: nonBlankStringSchema,
    amountHtCents: centsSchema,
    tvaRate: nonNegativeIntegerSchema,
    amountTvaCents: centsSchema,
    amountTtcCents: centsSchema,
    documentId: nullableUuidSchema,
    position: nonNegativeIntegerSchema,
    createdAt: instantSchema,
  })
  .passthrough();

export const erpExpenseNoteSchema = z
  .object({
    id: uuidSchema,
    employeeId: nullableUuidSchema,
    number: nonBlankStringSchema,
    title: nonBlankStringSchema,
    expenseDate: civilDateHttpSchema,
    status: z.enum([
      'DRAFT',
      'SUBMITTED',
      'APPROVED',
      'REJECTED',
      'PAID',
      'CANCELLED',
    ]),
    totalHtCents: centsSchema,
    totalTvaCents: centsSchema,
    totalTtcCents: centsSchema,
    currency: nonBlankStringSchema,
    accountingEntryId: nullableUuidSchema,
    paymentDate: civilDateHttpSchema.nullable(),
    paymentMethod: erpPaymentMethodSchema.nullable(),
    paymentReference: nullableStringSchema,
    paymentAccountCode: nullableStringSchema,
    paymentAccountingEntryId: nullableUuidSchema,
    submittedAt: nullableInstantSchema,
    approvedAt: nullableInstantSchema,
    approvedByTwentyUserId: nullableStringSchema,
    paidAt: nullableInstantSchema,
    paidByTwentyUserId: nullableStringSchema,
    rejectionReason: nullableStringSchema,
    lines: z.array(erpExpenseNoteLineSchema).optional(),
    employee: erpEmployeeSchema.nullable().optional(),
    createdAt: instantSchema,
    updatedAt: instantSchema,
  })
  .passthrough();
export const erpExpenseNoteListSchema = z.array(erpExpenseNoteSchema);

export const erpAnalyticSectionSchema = z
  .object({
    id: uuidSchema,
    axisId: uuidSchema,
    code: nonBlankStringSchema,
    label: nonBlankStringSchema,
    isActive: z.boolean(),
  })
  .passthrough();
export const erpAnalyticAxisSchema = z
  .object({
    id: uuidSchema,
    code: nonBlankStringSchema,
    label: nonBlankStringSchema,
    isActive: z.boolean(),
    sections: z.array(erpAnalyticSectionSchema),
  })
  .passthrough();
export const erpAnalyticAxisListSchema = z.array(erpAnalyticAxisSchema);
export const erpAnalyticAllocationSchema = z
  .object({
    id: uuidSchema,
    sectionId: uuidSchema,
    entryLineId: uuidSchema,
    amountCents: signedCentsSchema,
    percentageBasisPoints: nonNegativeIntegerSchema,
  })
  .passthrough();

export const erpBudgetLineSchema = z
  .object({
    id: uuidSchema,
    budgetId: uuidSchema,
    sectionId: nullableUuidSchema,
    accountCode: nonBlankStringSchema,
    periodNumber: positiveIntegerSchema,
    amountCents: signedCentsSchema,
    section: erpAnalyticSectionSchema.nullable().optional(),
  })
  .passthrough();

export const erpBudgetSchema = z
  .object({
    id: uuidSchema,
    exerciceId: uuidSchema,
    code: nonBlankStringSchema,
    label: nonBlankStringSchema,
    status: z.enum(['DRAFT', 'APPROVED', 'CLOSED']),
    approvedAt: nullableInstantSchema,
    lines: z.array(erpBudgetLineSchema).optional(),
    exercice: erpExerciseSchema.optional(),
    createdAt: instantSchema,
    updatedAt: instantSchema,
  })
  .passthrough();
export const erpBudgetListSchema = z.array(erpBudgetSchema);
export const erpBudgetVarianceSchema = z.array(
  z.object({
    accountCode: nonBlankStringSchema,
    budgetCents: signedCentsSchema,
    actualCents: signedCentsSchema,
    varianceCents: signedCentsSchema,
  }),
);

export const erpRecurringInvoiceSchema = z
  .object({
    id: uuidSchema,
    tierId: uuidSchema,
    label: nonBlankStringSchema,
    status: z.enum(['ACTIVE', 'PAUSED', 'ENDED']),
    frequencyMonths: positiveIntegerSchema,
    nextRunDate: civilDateHttpSchema,
    endDate: nullableCivilDateHttpSchema,
    currency: nonBlankStringSchema,
    paymentDelayDays: nonNegativeIntegerSchema,
    lines: z.unknown(),
    lastGeneratedInvoiceId: nullableUuidSchema,
    createdAt: instantSchema,
    updatedAt: instantSchema,
  })
  .passthrough();
export const erpRecurringInvoiceListSchema = z.array(erpRecurringInvoiceSchema);
export const erpRecurringInvoiceRunSchema = z.object({
  generated: nonNegativeIntegerSchema,
  invoices: z.array(erpInvoiceSchema),
});

export const erpExchangeRateSchema = z
  .object({
    id: uuidSchema,
    baseCurrency: nonBlankStringSchema,
    quoteCurrency: nonBlankStringSchema,
    rate: decimalDatabaseNumberSchema,
    effectiveDate: civilDateHttpSchema,
    source: nonBlankStringSchema,
    createdAt: instantSchema,
  })
  .passthrough();
export const erpExchangeRateListSchema = z.array(erpExchangeRateSchema);

export const erpPortalAccessSchema = z
  .object({
    id: uuidSchema,
    tierId: uuidSchema,
    twentyUserId: nullableStringSchema,
    email: nullableStringSchema,
    tokenExpiresAt: nullableInstantSchema,
    lastAuthenticatedAt: nullableInstantSchema,
    status: z.enum(['ACTIVE', 'REVOKED']),
    canViewInvoices: z.boolean(),
    canViewDocuments: z.boolean(),
    canSubmitDocuments: z.boolean(),
    grantedAt: instantSchema,
    revokedAt: nullableInstantSchema,
    createdAt: instantSchema,
    updatedAt: instantSchema,
  })
  .passthrough();
export const erpPortalAccessListSchema = z.array(erpPortalAccessSchema);
export const erpPortalAccessGrantSchema = z.object({
  access: erpPortalAccessSchema,
  token: nonBlankStringSchema,
  portalPath: nonBlankStringSchema,
  securityNotice: nonBlankStringSchema,
});

export const erpRegulatoryFileSchema = z
  .object({
    filename: nonBlankStringSchema,
    contentType: nonBlankStringSchema,
    content: z.string().optional(),
    contentBase64: z.string().optional(),
    payloadSha256: z.string().optional(),
    submissionId: uuidSchema.optional(),
    validation: z.unknown().optional(),
  })
  .passthrough();
export const erpRegulatoryObjectSchema = z.object({}).passthrough();
export const erpRegulatoryListSchema = z.array(erpRegulatoryObjectSchema);

export const erpAccountingAnomalySchema = z
  .object({
    id: uuidSchema,
    accountingEntryId: nullableUuidSchema,
    ruleCode: nonBlankStringSchema,
    severity: nonBlankStringSchema,
    title: nonBlankStringSchema,
    explanation: nonBlankStringSchema,
    evidence: z.unknown(),
    status: z.enum(['OPEN', 'RESOLVED', 'DISMISSED']),
    resolutionNotes: nullableStringSchema,
    resolvedAt: nullableInstantSchema,
    createdAt: instantSchema,
    updatedAt: instantSchema,
  })
  .passthrough();
export const erpAccountingAnomalyListSchema = z.array(
  erpAccountingAnomalySchema,
);
export const erpAnomalyScanResultSchema = z.object({
  scannedEntries: nonNegativeIntegerSchema,
  created: nonNegativeIntegerSchema,
  anomalies: erpAccountingAnomalyListSchema,
});

export const erpAiAccountingQueryIdSchema = z.enum([
  'overdue_invoices',
  'trial_balance',
  'unreconciled_bank_lines',
  'tax_declarations',
  'payroll_cost',
]);
export const erpAiAccountingStatusSchema = z.object({
  providerConfigured: z.boolean(),
  provider: nonBlankStringSchema,
  model: nonBlankStringSchema,
  safeQueries: z.array(erpAiAccountingQueryIdSchema),
  policy: nonBlankStringSchema,
});
export const erpAiAccountingSuggestionSchema = z.object({
  id: uuidSchema,
  organisationId: uuidSchema,
  societeId: uuidSchema,
  type: z.enum(['CATEGORIZATION', 'RECONCILIATION', 'ASSISTANT', 'SQL_QUERY']),
  sourceType: nonBlankStringSchema,
  sourceId: nullableUuidSchema,
  inputHash: nonBlankStringSchema,
  proposal: z.record(z.string(), z.unknown()),
  confidenceBasisPoints: nonNegativeIntegerSchema.max(10_000),
  status: z.enum(['PROPOSED', 'ACCEPTED', 'REJECTED', 'EXPIRED']),
  provider: nonBlankStringSchema,
  model: nonBlankStringSchema,
  promptVersion: nonBlankStringSchema,
  reviewedAt: nullableInstantSchema,
  reviewedByTwentyUserId: nullableStringSchema,
  reviewNotes: nullableStringSchema,
  createdAt: instantSchema,
  updatedAt: instantSchema,
});
export const erpAiAccountingSuggestionListSchema = z.array(
  erpAiAccountingSuggestionSchema,
);
export const erpAiAccountingSuggestionBatchSchema = z.object({
  processed: nonNegativeIntegerSchema,
  suggestions: erpAiAccountingSuggestionListSchema,
});
export const erpAiCategorizationRuleSchema = z.object({
  id: uuidSchema,
  organisationId: uuidSchema,
  societeId: uuidSchema,
  name: nonBlankStringSchema,
  pattern: nonBlankStringSchema,
  matchMode: z.enum(['CONTAINS', 'REGEX']),
  direction: z.enum(['BOTH', 'DEBIT', 'CREDIT']),
  accountCode: nonBlankStringSchema,
  category: nonBlankStringSchema,
  confidenceBasisPoints: nonNegativeIntegerSchema.max(10_000),
  priority: nonNegativeIntegerSchema,
  isActive: z.boolean(),
  createdByTwentyUserId: nonBlankStringSchema,
  createdAt: instantSchema,
  updatedAt: instantSchema,
});
export const erpAiCategorizationRuleListSchema = z.array(
  erpAiCategorizationRuleSchema,
);
export const erpAiAccountingSafeQueryResultSchema = z.object({
  queryId: erpAiAccountingQueryIdSchema,
  generatedSql: nonBlankStringSchema,
  rows: z.array(z.record(z.string(), z.unknown())),
  readOnly: z.literal(true),
});
export const erpAiAccountingMessageSchema = z.object({
  id: uuidSchema,
  organisationId: uuidSchema,
  societeId: uuidSchema,
  conversationId: uuidSchema,
  role: z.enum(['user', 'assistant']),
  content: nonBlankStringSchema,
  evidence: z.unknown().nullable(),
  provider: nullableStringSchema,
  model: nullableStringSchema,
  createdAt: instantSchema,
});
export const erpAiAccountingConversationSchema = z.object({
  id: uuidSchema,
  organisationId: uuidSchema,
  societeId: uuidSchema,
  title: nonBlankStringSchema,
  createdByTwentyUserId: nonBlankStringSchema,
  createdAt: instantSchema,
  updatedAt: instantSchema,
  messages: z.array(erpAiAccountingMessageSchema),
});
export const erpAiAccountingConversationListSchema = z.array(
  erpAiAccountingConversationSchema,
);
export const erpAiAccountingAnswerSchema = z.object({
  conversationId: uuidSchema,
  content: nonBlankStringSchema,
  evidence: z.object({
    queryId: erpAiAccountingQueryIdSchema.nullable(),
    rows: z.array(z.record(z.string(), z.unknown())),
  }),
  provider: nonBlankStringSchema,
  model: nonBlankStringSchema,
});

export const erpTreasuryScenarioCodeSchema = z.enum([
  'PRUDENT',
  'BASE',
  'OPTIMISTIC',
]);

export const erpTreasuryEventSchema = z.object({
  id: nonBlankStringSchema,
  sourceType: z.enum([
    'CUSTOMER_INVOICE',
    'OPENING_RECEIVABLE',
    'RECURRING_INVOICE',
    'SUPPLIER_INVOICE',
    'SUPPLIER_PAYMENT',
    'OPENING_PAYABLE',
    'PAYROLL',
    'TAX',
    'EXPENSE_NOTE',
  ]),
  direction: z.enum(['INFLOW', 'OUTFLOW']),
  dueDate: civilDateSchema,
  label: nonBlankStringSchema,
  counterparty: nullableStringSchema,
  amountCents: centsSchema,
});

const erpTreasuryAgingSchema = z.object({
  totalCents: centsSchema,
  notDueCents: centsSchema,
  days1To30Cents: centsSchema,
  days31To60Cents: centsSchema,
  days61To90Cents: centsSchema,
  over90DaysCents: centsSchema,
});

export const erpTreasuryForecastSchema = z.object({
  asOf: civilDateSchema,
  horizonEnd: civilDateSchema,
  currency: z.literal('MAD'),
  currentCashCents: signedCentsSchema,
  dataQuality: z.object({
    bankAccountCount: nonNegativeIntegerSchema,
    confirmedBankAccountCount: nonNegativeIntegerSchema,
    usesOpeningBalance: z.boolean(),
    eventCount: nonNegativeIntegerSchema,
  }),
  aging: z.object({
    receivables: erpTreasuryAgingSchema,
    payables: erpTreasuryAgingSchema,
  }),
  scenarios: z.array(
    z.object({
      code: erpTreasuryScenarioCodeSchema,
      label: nonBlankStringSchema,
      assumptions: z.object({
        inflowRateBasisPoints: nonNegativeIntegerSchema.max(10_000),
        inflowDelayDays: nonNegativeIntegerSchema,
        outflowRateBasisPoints: nonNegativeIntegerSchema.max(10_000),
      }),
      closingBalanceCents: signedCentsSchema,
      minimumBalanceCents: signedCentsSchema,
      firstNegativeWeek: positiveIntegerSchema.nullable(),
      weeks: z.array(
        z.object({
          index: positiveIntegerSchema,
          startDate: civilDateSchema,
          endDate: civilDateSchema,
          openingBalanceCents: signedCentsSchema,
          inflowCents: centsSchema,
          outflowCents: centsSchema,
          netCashFlowCents: signedCentsSchema,
          closingBalanceCents: signedCentsSchema,
          eventCount: nonNegativeIntegerSchema,
        }),
      ),
    }),
  ),
  events: z.array(erpTreasuryEventSchema),
  alerts: z.array(
    z.object({
      code: nonBlankStringSchema,
      severity: z.enum(['INFO', 'WARNING', 'CRITICAL']),
      title: nonBlankStringSchema,
      message: nonBlankStringSchema,
      weekIndex: positiveIntegerSchema.nullable(),
      amountCents: centsSchema,
    }),
  ),
  actions: z.array(
    z.object({
      code: z.enum([
        'REMIND_CUSTOMERS',
        'PREPARE_SUPPLIER_PAYMENTS',
        'RECONCILE_BANK',
      ]),
      label: nonBlankStringSchema,
      description: nonBlankStringSchema,
      priority: z.enum(['LOW', 'MEDIUM', 'HIGH']),
      amountCents: centsSchema,
    }),
  ),
  insights: z.array(nonBlankStringSchema),
});

const encodeRouteId = (id: string): string => {
  return encodeURIComponent(uuidSchema.parse(id));
};

export const erpMarocRouteIds = {
  context: 'context',
  onboardingReadiness: 'onboarding.readiness',
  onboardingOpenItems: 'onboarding.open-items',
  onboardingOpenItemSettlementCandidates:
    'onboarding.open-item.settlement-candidates',
  onboardingOpenItemSettle: 'onboarding.open-item.settle',
  onboardingReverseOpenItemSettlement:
    'onboarding.open-item-settlement.reverse',
  onboardingFinalizeOpenItemSettlementReversal:
    'onboarding.open-item-settlement-reversal.finalize',
  onboardingImportPreview: 'onboarding.import.preview',
  onboardingImportApply: 'onboarding.import.apply',
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
  salesOrdersCollection: 'sales-orders.collection',
  salesOrderFromQuote: 'sales-orders.fromQuote',
  salesOrderDetail: 'sales-orders.detail',
  salesOrderConfirm: 'sales-orders.confirm',
  salesOrderReserve: 'sales-orders.reserve',
  salesOrderPrepare: 'sales-orders.prepare',
  salesOrderCancel: 'sales-orders.cancel',
  salesOrderDeliveries: 'sales-orders.deliveries',
  salesOrderDeliveryCancel: 'sales-orders.delivery.cancel',
  purchaseOrdersCollection: 'purchase-orders.collection',
  purchaseOrderDetail: 'purchase-orders.detail',
  purchaseOrderConfirm: 'purchase-orders.confirm',
  purchaseOrderCancel: 'purchase-orders.cancel',
  purchaseOrderReceipts: 'purchase-orders.receipts',
  purchaseOrderSupplierInvoices: 'purchase-orders.supplierInvoices',
  supplierInvoiceDetail: 'supplier-invoices.detail',
  supplierInvoiceApprove: 'supplier-invoices.approve',
  supplierInvoiceCancel: 'supplier-invoices.cancel',
  supplierInvoicePaymentPreparations: 'supplier-invoices.paymentPreparations',
  supplierPaymentPreparationCancel: 'supplier-payment-preparations.cancel',
  supplierPaymentPreparationExecute: 'supplier-payment-preparations.execute',
  invoicesCollection: 'invoices.collection',
  invoiceFromQuote: 'invoices.fromQuote',
  invoiceFromSalesOrder: 'invoices.fromSalesOrder',
  invoiceDetail: 'invoices.detail',
  invoiceValidate: 'invoices.validate',
  invoiceSend: 'invoices.send',
  invoicePdf: 'invoices.pdf',
  paymentsCollection: 'payments.collection',
  paymentDetail: 'payments.detail',
  paymentEligibleInvoices: 'payments.eligibleInvoices',
  paymentAllocate: 'payments.allocate',
  paymentTerminate: 'payments.terminate',
  chequesCollection: 'cheques.collection',
  chequeDetail: 'cheques.detail',
  chequeBooks: 'cheques.books',
  chequeSummary: 'cheques.summary',
  chequeAlerts: 'cheques.alerts',
  chequeDepositSlips: 'cheques.depositSlips',
  chequeDepositSlipEligible: 'cheques.depositSlips.eligible',
  chequeDepositSlipDetail: 'cheques.depositSlips.detail',
  chequeDepositSlipPdf: 'cheques.depositSlips.pdf',
  chequeTransition: 'cheques.transition',
  chequeReconciliationCandidates: 'cheques.reconciliationCandidates',
  chequeReconcile: 'cheques.reconcile',
  chequeUnreconcile: 'cheques.unreconcile',
  creditNotesCollection: 'credit-notes.collection',
  creditNoteDetail: 'credit-notes.detail',
  creditNoteValidate: 'credit-notes.validate',
  creditNoteEligibleInvoices: 'credit-notes.eligibleInvoices',
  creditNoteAllocate: 'credit-notes.allocate',
  creditNoteCancel: 'credit-notes.cancel',
  customerReturnsCollection: 'customer-returns.collection',
  customerReturnEligibleLines: 'customer-returns.eligibleLines',
  customerReturnDetail: 'customer-returns.detail',
  customerReturnValidate: 'customer-returns.validate',
  customerReturnCancel: 'customer-returns.cancel',
  remindersCollection: 'reminders.collection',
  remindersScan: 'reminders.scan',
  reminderDetail: 'reminders.detail',
  reminderApprove: 'reminders.approve',
  reminderCancel: 'reminders.cancel',
  accountingEntriesCollection: 'accounting.entries.collection',
  accountingEntryDetail: 'accounting.entries.detail',
  accountingEntryValidate: 'accounting.entries.validate',
  accountingEntryReject: 'accounting.entries.reject',
  accountingEntryReverse: 'accounting.entries.reverse',
  accountingEntryDuplicate: 'accounting.entries.duplicate',
  accountingProvisionsCollection: 'accounting.provisions.collection',
  accountingProvisionDetail: 'accounting.provisions.detail',
  accountingProvisionPost: 'accounting.provisions.post',
  accountingProvisionReverse: 'accounting.provisions.reverse',
  accountingProvisionCancel: 'accounting.provisions.cancel',
  accountingReferences: 'accounting.references',
  accountingAccountsCollection: 'accounting.accounts.collection',
  accountingAccountDetail: 'accounting.accounts.detail',
  accountingJournalsCollection: 'accounting.journals.collection',
  accountingJournalDetail: 'accounting.journals.detail',
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
  inventoryGrossMargins: 'inventory.grossMargins',
  inventoryAdjustments: 'inventory.adjustments',
  inventoryTransfers: 'inventory.transfers',
  inventoryCounts: 'inventory.counts',
  inventoryCountValidate: 'inventory.count.validate',
  inventoryCountCancel: 'inventory.count.cancel',
  inventoryThresholds: 'inventory.thresholds',
  inventoryReplenishmentSuggestions: 'inventory.replenishmentSuggestions',
  fiscalDeclarations: 'fiscal.declarations',
  fiscalTvaCalculate: 'fiscal.tva.calculate',
  fiscalTvaProrata: 'fiscal.tva.prorata',
  fiscalTvaProrataCalculate: 'fiscal.tva.prorata.calculate',
  fiscalTvaProrataAnnual: 'fiscal.tva.prorata.annual',
  fiscalTvaProrataAnnualPost: 'fiscal.tva.prorata.annual.post',
  fiscalIsCalculate: 'fiscal.is.calculate',
  fiscalDeclarationStatus: 'fiscal.declaration.status',
  fiscalDeclarationSimpl: 'fiscal.declaration.simpl',
  fiscalDeclarationAdc080f: 'fiscal.declaration.adc080f',
  fiscalDeclarationIsXml: 'fiscal.declaration.is-xml',
  fiscalDeclarationPayments: 'fiscal.declaration.payments',
  fiscalDeclarationPaymentCandidates: 'fiscal.declaration.payment-candidates',
  fiscalDeadlines: 'fiscal.deadlines',
  fiscalDeadlinesSeed: 'fiscal.deadlines.seed',
  fiscalDeadlineComplete: 'fiscal.deadline.complete',
  complianceExercises: 'compliance.exercises',
  complianceExerciseReview: 'compliance.exercise.review',
  complianceExerciseReviewDossier: 'compliance.exercise.review-dossier',
  complianceExerciseReviewRefresh: 'compliance.exercise.review-refresh',
  complianceExerciseReviewExport: 'compliance.exercise.review-export',
  complianceReviewTask: 'compliance.review-task',
  complianceReviewTaskDecision: 'compliance.review-task.decision',
  complianceReviewAccount: 'compliance.review-account',
  compliancePeriodClose: 'compliance.period.close',
  compliancePeriodReopen: 'compliance.period.reopen',
  complianceExerciseClose: 'compliance.exercise.close',
  complianceExerciseStatements: 'compliance.exercise.statements',
  complianceExerciseFec: 'compliance.exercise.fec',
  complianceFecImport: 'compliance.fec.import',
  payrollEmployees: 'payroll.employees',
  payrollEmployeeDetail: 'payroll.employee.detail',
  payrollEmployeeTerminate: 'payroll.employee.terminate',
  payrollPayslips: 'payroll.payslips',
  payrollPayslipGenerate: 'payroll.payslip.generate',
  payrollPayslipValidate: 'payroll.payslip.validate',
  payrollPayslipPay: 'payroll.payslip.pay',
  payrollLeaves: 'payroll.leaves',
  payrollLeaveDecision: 'payroll.leave.decision',
  payrollLeaveBalances: 'payroll.leave-balances',
  payrollLeaveBalanceUpdate: 'payroll.leave-balance.update',
  payrollCnssExport: 'payroll.cnss.export',
  payrollCnssBds: 'payroll.cnss.bds',
  payrollPayslipPdf: 'payroll.payslip.pdf',
  payrollEmployeeAttestation: 'payroll.employee.attestation',
  payrollFinalSettlementPdf: 'payroll.employee.final-settlement.pdf',
  payrollStatementPdf: 'payroll.statement.pdf',
  payrollRegulatorySummary: 'payroll.regulatory.summary',
  payrollRegulatoryRules: 'payroll.regulatory.rules',
  payrollRegulatoryComponents: 'payroll.regulatory.components',
  payrollRegulatoryControls: 'payroll.regulatory.controls',
  payrollRegulatorySources: 'payroll.regulatory.sources',
  payrollRegulatorySeed: 'payroll.regulatory.seed',
  hrCoreSummary: 'hr-core.summary',
  hrAccessMe: 'hr-core.access.me',
  hrAccessAdministration: 'hr-core.access.administration',
  hrAccessGrants: 'hr-core.access.grants',
  hrEstablishments: 'hr-core.establishments',
  hrEstablishmentDetail: 'hr-core.establishment.detail',
  hrGrades: 'hr-core.grades',
  hrGradeDetail: 'hr-core.grade.detail',
  hrCostCenters: 'hr-core.cost-centers',
  hrCostCenterDetail: 'hr-core.cost-center.detail',
  hrTeams: 'hr-core.teams',
  hrTeamDetail: 'hr-core.team.detail',
  hrWorkLocations: 'hr-core.work-locations',
  hrWorkLocationDetail: 'hr-core.work-location.detail',
  hrDepartments: 'hr-core.departments',
  hrDepartmentDetail: 'hr-core.department.detail',
  hrJobPositions: 'hr-core.job-positions',
  hrJobPositionDetail: 'hr-core.job-position.detail',
  hrEmployees: 'hr-core.employees',
  hrEmployeeDetail: 'hr-core.employee.detail',
  hrEmployeeImportTemplate: 'hr-core.employee-import.template',
  hrEmployeeImportPreview: 'hr-core.employee-import.preview',
  hrEmployeeImportCommit: 'hr-core.employee-import.commit',
  hrEmployeePersonalDetails: 'hr-core.employee.personal-details',
  hrEmployeeDependants: 'hr-core.employee.dependants',
  hrDependantDetail: 'hr-core.dependant.detail',
  hrEmployeeEmergencyContacts: 'hr-core.employee.emergency-contacts',
  hrEmergencyContactDetail: 'hr-core.emergency-contact.detail',
  hrEmployeeBankAccount: 'hr-core.employee.bank-account',
  hrEmployeeAssignments: 'hr-core.employee.assignments',
  hrAssignmentEnd: 'hr-core.assignment.end',
  hrDeadlines: 'hr-core.deadlines',
  hrEmployeeDocuments: 'hr-core.employee.documents',
  hrDocumentDetail: 'hr-core.document.detail',
  hrDocumentVersions: 'hr-core.document.versions',
  hrDocumentVersionContent: 'hr-core.document-version.content',
  hrLifecycleJourneys: 'hr-core.lifecycle-journeys',
  hrHiring: 'hr-core.hiring',
  hrLifecycleTaskDetail: 'hr-core.lifecycle-task.detail',
  hrLifecycleJourneyStatus: 'hr-core.lifecycle-journey.status',
  hrEmployeeContracts: 'hr-core.employee.contracts',
  hrContractStatus: 'hr-core.contract.status',
  hrContractAmendments: 'hr-core.contract.amendments',
  hrAmendmentStatus: 'hr-core.amendment.status',
  documentsCollection: 'documents.collection',
  documentDetail: 'documents.detail',
  documentContent: 'documents.content',
  documentOcrRetry: 'documents.ocr.retry',
  documentOcrValidate: 'documents.ocr.validate',
  documentCreateSupplierInvoice: 'documents.create-supplier-invoice',
  expenseNotes: 'operations.expense-notes',
  expenseNoteSubmit: 'operations.expense-note.submit',
  expenseNoteDecision: 'operations.expense-note.decision',
  expenseNotePayment: 'operations.expense-note.payment',
  analytics: 'operations.analytics',
  analyticAllocations: 'operations.analytics.allocations',
  budgets: 'operations.budgets',
  budgetApprove: 'operations.budget.approve',
  budgetVariance: 'operations.budget.variance',
  recurringInvoices: 'operations.recurring-invoices',
  recurringInvoiceStatus: 'operations.recurring-invoice.status',
  recurringInvoicesRun: 'operations.recurring-invoices.run',
  exchangeRates: 'operations.exchange-rates',
  portalAccess: 'operations.portal-access',
  portalAccessRevoke: 'operations.portal-access.revoke',
  accountingAnomalies: 'operations.anomalies',
  accountingAnomaliesScan: 'operations.anomalies.scan',
  accountingAnomalyResolve: 'operations.anomaly.resolve',
  liasseDefinitions: 'liasse.definitions',
  liasseTables: 'liasse.tables',
  liasseValidation: 'liasse.validation',
  liasseTable: 'liasse.table',
  liasseRow: 'liasse.row',
  liasseExport: 'liasse.export',
  regulatorySubmissions: 'regulatory.submissions',
  regulatorySubmissionValidation: 'regulatory.submission.validation',
  portalAdminRequests: 'portal.admin.requests',
  portalAdminComment: 'portal.admin.comment',
  portalAdminRequestUpdate: 'portal.admin.request.update',
  aiAccountingStatus: 'ai-accounting.status',
  aiAccountingSuggestions: 'ai-accounting.suggestions',
  aiAccountingRules: 'ai-accounting.rules',
  aiAccountingRuleUpdate: 'ai-accounting.rule.update',
  aiAccountingRuleDeactivate: 'ai-accounting.rule.deactivate',
  aiAccountingCategorize: 'ai-accounting.categorize',
  aiAccountingReconcile: 'ai-accounting.reconcile',
  aiAccountingSuggestionReview: 'ai-accounting.suggestion.review',
  aiAccountingSafeQuery: 'ai-accounting.safe-query',
  aiAccountingConversations: 'ai-accounting.conversations',
  aiAccountingAsk: 'ai-accounting.ask',
  approvalMatrices: 'approvals.matrices',
  approvalMatrixActive: 'approvals.matrix.active',
  approvalRequests: 'approvals.requests',
  approvalDecision: 'approvals.decision',
  marketingOverview: 'marketing.overview',
  marketingContactsCollection: 'marketing.contacts.collection',
  marketingContactsImportTiers: 'marketing.contacts.importTiers',
  marketingContactConsent: 'marketing.contacts.consent',
  marketingSegmentsCollection: 'marketing.segments.collection',
  marketingSegmentSync: 'marketing.segments.sync',
  marketingCampaignsCollection: 'marketing.campaigns.collection',
  marketingCampaignSend: 'marketing.campaigns.send',
  marketingCampaignRefresh: 'marketing.campaigns.refresh',
  marketingAutomationsCollection: 'marketing.automations.collection',
  marketingAutomationActivate: 'marketing.automations.activate',
  marketingAutomationPause: 'marketing.automations.pause',
  marketingScoringRulesCollection: 'marketing.scoringRules.collection',
  marketingScoringRuleToggle: 'marketing.scoringRules.toggle',
  marketingEventsCollection: 'marketing.events.collection',
} as const;

export const erpMarocUpstreamRoutes = {
  context: '/context',
  onboarding: {
    readiness: '/onboarding/readiness',
    openItems: '/onboarding/open-items',
    settlementCandidates: (id: string) =>
      `/onboarding/open-items/${encodeRouteId(id)}/settlement-candidates`,
    settle: (id: string) =>
      `/onboarding/open-items/${encodeRouteId(id)}/settle`,
    reverseOpenItemSettlement: (id: string) =>
      `/onboarding/bank-statement-lines/${encodeRouteId(id)}/reverse-open-item-settlement`,
    finalizeOpenItemSettlementReversal: (id: string) =>
      `/onboarding/bank-statement-lines/${encodeRouteId(id)}/finalize-open-item-settlement-reversal`,
    importPreview: '/onboarding/imports/preview',
    importApply: '/onboarding/imports/apply',
  },
  products: {
    collection: '/products',
    detail: (id: string) => `/products/${encodeRouteId(id)}`,
  },
  tiers: {
    collection: '/tiers',
    syncFromTwentyCompany: '/tiers/sync-from-twenty-company',
    detail: (id: string) => `/tiers/${encodeRouteId(id)}`,
  },
  quotes: {
    collection: '/quotes',
    fromOpportunity: '/quotes/from-opportunity',
    detail: (id: string) => `/quotes/${encodeRouteId(id)}`,
    send: (id: string) => `/quotes/${encodeRouteId(id)}/send`,
    accept: (id: string) => `/quotes/${encodeRouteId(id)}/accept`,
    reject: (id: string) => `/quotes/${encodeRouteId(id)}/reject`,
  },
  salesOrders: {
    collection: '/sales-orders',
    fromQuote: (quoteId: string) =>
      `/sales-orders/from-quote/${encodeRouteId(quoteId)}`,
    detail: (id: string) => `/sales-orders/${encodeRouteId(id)}`,
    confirm: (id: string) => `/sales-orders/${encodeRouteId(id)}/confirm`,
    reserve: (id: string) => `/sales-orders/${encodeRouteId(id)}/reservations`,
    prepare: (id: string) => `/sales-orders/${encodeRouteId(id)}/preparation`,
    cancel: (id: string) => `/sales-orders/${encodeRouteId(id)}/cancel`,
    deliveries: (id: string) => `/sales-orders/${encodeRouteId(id)}/deliveries`,
    cancelDelivery: (id: string, deliveryId: string) =>
      `/sales-orders/${encodeRouteId(id)}/deliveries/${encodeRouteId(deliveryId)}/cancel`,
  },
  purchaseOrders: {
    collection: '/purchase-orders',
    detail: (id: string) => `/purchase-orders/${encodeRouteId(id)}`,
    confirm: (id: string) => `/purchase-orders/${encodeRouteId(id)}/confirm`,
    cancel: (id: string) => `/purchase-orders/${encodeRouteId(id)}/cancel`,
    receipts: (id: string) => `/purchase-orders/${encodeRouteId(id)}/receipts`,
    supplierInvoices: (id: string) =>
      `/purchase-orders/${encodeRouteId(id)}/supplier-invoices`,
  },
  supplierInvoices: {
    detail: (id: string) => `/supplier-invoices/${encodeRouteId(id)}`,
    approve: (id: string) => `/supplier-invoices/${encodeRouteId(id)}/approve`,
    cancel: (id: string) => `/supplier-invoices/${encodeRouteId(id)}/cancel`,
    paymentPreparations: (id: string) =>
      `/supplier-invoices/${encodeRouteId(id)}/payment-preparations`,
  },
  supplierPaymentPreparations: {
    cancel: (id: string) =>
      `/supplier-payment-preparations/${encodeRouteId(id)}/cancel`,
    execute: (id: string) =>
      `/supplier-payment-preparations/${encodeRouteId(id)}/execute`,
  },
  invoices: {
    collection: '/invoices',
    fromQuote: (quoteId: string) =>
      `/invoices/from-quote/${encodeRouteId(quoteId)}`,
    fromSalesOrder: (salesOrderId: string) =>
      `/invoices/from-sales-order/${encodeRouteId(salesOrderId)}`,
    detail: (id: string) => `/invoices/${encodeRouteId(id)}`,
    validate: (id: string) => `/invoices/${encodeRouteId(id)}/validate`,
    send: (id: string) => `/invoices/${encodeRouteId(id)}/send`,
    pdf: (id: string) => `/invoices/${encodeRouteId(id)}/pdf`,
  },
  payments: {
    collection: '/payments',
    detail: (id: string) => `/payments/${encodeRouteId(id)}`,
    eligibleInvoices: (id: string) =>
      `/payments/${encodeRouteId(id)}/eligible-invoices`,
    allocate: (id: string) => `/payments/${encodeRouteId(id)}/allocate`,
    terminate: (id: string) => `/payments/${encodeRouteId(id)}/terminate`,
  },
  cheques: {
    collection: '/cheques',
    detail: (id: string) => `/cheques/${encodeRouteId(id)}`,
    books: '/cheques/books',
    summary: '/cheques/summary',
    alerts: '/cheques/alerts',
    depositSlips: '/cheques/deposit-slips',
    depositSlipEligible: '/cheques/deposit-slips/eligible',
    depositSlipDetail: (id: string) =>
      `/cheques/deposit-slips/${encodeRouteId(id)}`,
    depositSlipPdf: (id: string) =>
      `/cheques/deposit-slips/${encodeRouteId(id)}/pdf`,
    transition: (id: string) => `/cheques/${encodeRouteId(id)}/transition`,
    reconciliationCandidates: (id: string) =>
      `/cheques/${encodeRouteId(id)}/reconciliation-candidates`,
    reconcile: (id: string) => `/cheques/${encodeRouteId(id)}/reconcile`,
    unreconcile: (id: string) => `/cheques/${encodeRouteId(id)}/unreconcile`,
  },
  creditNotes: {
    collection: '/credit-notes',
    detail: (id: string) => `/credit-notes/${encodeRouteId(id)}`,
    validate: (id: string) => `/credit-notes/${encodeRouteId(id)}/validate`,
    eligibleInvoices: (id: string) =>
      `/credit-notes/${encodeRouteId(id)}/eligible-invoices`,
    allocate: (id: string) => `/credit-notes/${encodeRouteId(id)}/allocate`,
    cancel: (id: string) => `/credit-notes/${encodeRouteId(id)}/cancel`,
  },
  customerReturns: {
    collection: '/customer-returns',
    eligibleLines: '/customer-returns/eligible-lines',
    detail: (id: string) => `/customer-returns/${encodeRouteId(id)}`,
    validate: (id: string) => `/customer-returns/${encodeRouteId(id)}/validate`,
    cancel: (id: string) => `/customer-returns/${encodeRouteId(id)}/cancel`,
  },
  reminders: {
    collection: '/reminders',
    scan: '/reminders/scan',
    detail: (id: string) => `/reminders/${encodeRouteId(id)}`,
    approve: (id: string) => `/reminders/${encodeRouteId(id)}/approve`,
    cancel: (id: string) => `/reminders/${encodeRouteId(id)}/cancel`,
  },
  accounting: {
    entries: '/accounting/entries',
    detail: (id: string) => `/accounting/entries/${encodeRouteId(id)}`,
    validate: (id: string) =>
      `/accounting/entries/${encodeRouteId(id)}/validate`,
    reject: (id: string) => `/accounting/entries/${encodeRouteId(id)}/reject`,
    reverse: (id: string) => `/accounting/entries/${encodeRouteId(id)}/reverse`,
    duplicate: (id: string) =>
      `/accounting/entries/${encodeRouteId(id)}/duplicate`,
    provisions: '/accounting/provisions',
    provision: (id: string) => `/accounting/provisions/${encodeRouteId(id)}`,
    postProvision: (id: string) =>
      `/accounting/provisions/${encodeRouteId(id)}/post`,
    reverseProvision: (id: string) =>
      `/accounting/provisions/${encodeRouteId(id)}/reverse`,
    cancelProvision: (id: string) =>
      `/accounting/provisions/${encodeRouteId(id)}/cancel`,
    references: '/accounting/references',
    accounts: '/accounting/references/accounts',
    account: (id: string) =>
      `/accounting/references/accounts/${encodeRouteId(id)}`,
    journals: '/accounting/references/journals',
    journal: (id: string) =>
      `/accounting/references/journals/${encodeRouteId(id)}`,
    grandLivre: '/accounting/grand-livre',
    balance: '/accounting/balance',
    lettrageSuggestions: '/accounting/lettrage/suggestions',
    lettrageMatch: '/accounting/lettrage/match',
    lettrageUnmatch: '/accounting/lettrage/unmatch',
  },
  bankAccounts: {
    collection: '/bank-accounts',
    detail: (id: string) => `/bank-accounts/${encodeRouteId(id)}`,
  },
  bankStatements: {
    collection: '/bank-statements',
    detail: (id: string) => `/bank-statements/${encodeRouteId(id)}`,
    confirm: (id: string) => `/bank-statements/${encodeRouteId(id)}/confirm`,
    assignBankAccount: (id: string) =>
      `/bank-statements/${encodeRouteId(id)}/bank-account`,
    close: (id: string) => `/bank-statements/${encodeRouteId(id)}/close`,
  },
  bankStatementLines: {
    reconciliationCandidates: (id: string) =>
      `/bank-statement-lines/${encodeRouteId(id)}/reconciliation-candidates`,
    reconcileSupplierPayment: (id: string) =>
      `/bank-statement-lines/${encodeRouteId(id)}/reconcile-supplier-payment`,
    unreconcileSupplierPayment: (id: string) =>
      `/bank-statement-lines/${encodeRouteId(id)}/unreconcile-supplier-payment`,
    reconcileCustomerPayment: (id: string) =>
      `/bank-statement-lines/${encodeRouteId(id)}/reconcile-customer-payment`,
    unreconcileCustomerPayment: (id: string) =>
      `/bank-statement-lines/${encodeRouteId(id)}/unreconcile-customer-payment`,
    review: (id: string) => `/bank-statement-lines/${encodeRouteId(id)}/review`,
    unreview: (id: string) =>
      `/bank-statement-lines/${encodeRouteId(id)}/unreview`,
  },
  warehouses: {
    collection: '/warehouses',
  },
  inventory: {
    levels: '/inventory/levels',
    movements: '/inventory/movements',
    grossMargins: '/inventory/gross-margins',
    adjustments: '/inventory/adjustments',
    transfers: '/inventory/transfers',
    counts: '/inventory/counts',
    countValidate: (id: string) =>
      `/inventory/counts/${encodeRouteId(id)}/validate`,
    countCancel: (id: string) =>
      `/inventory/counts/${encodeRouteId(id)}/cancel`,
    thresholds: '/inventory/thresholds',
    replenishmentSuggestions: '/inventory/replenishment-suggestions',
  },
  fiscal: {
    declarations: '/fiscal/declarations',
    calculateTva: '/fiscal/tva/calculate',
    tvaProrata: '/fiscal/tva/prorata',
    calculateTvaProrata: '/fiscal/tva/prorata/calculate',
    annualTvaProrata: '/fiscal/tva/prorata/annual',
    postAnnualTvaProrata: '/fiscal/tva/prorata/annual/post',
    calculateIs: '/fiscal/is/calculate',
    declarationStatus: (id: string) =>
      `/fiscal/declarations/${encodeRouteId(id)}/status`,
    declarationSimpl: (id: string) =>
      `/fiscal/declarations/${encodeRouteId(id)}/simpl`,
    declarationAdc080f: (id: string) =>
      `/fiscal/declarations/${encodeRouteId(id)}/adc080f`,
    declarationIsXml: (id: string) =>
      `/fiscal/declarations/${encodeRouteId(id)}/is-xml`,
    declarationPayments: (id: string) =>
      `/fiscal/declarations/${encodeRouteId(id)}/payments`,
    declarationPaymentCandidates: (id: string) =>
      `/fiscal/declarations/${encodeRouteId(id)}/payment-candidates`,
    deadlines: '/fiscal/deadlines',
    seedDeadlines: '/fiscal/deadlines/seed',
    completeDeadline: (id: string) =>
      `/fiscal/deadlines/${encodeRouteId(id)}/complete`,
  },
  compliance: {
    exercises: '/accounting-compliance/exercises',
    initializeReview: (id: string) =>
      `/accounting-compliance/exercises/${encodeRouteId(id)}/review`,
    reviewDossier: (id: string) =>
      `/accounting-compliance/exercises/${encodeRouteId(id)}/review-dossier`,
    refreshReview: (id: string) =>
      `/accounting-compliance/exercises/${encodeRouteId(id)}/review-refresh`,
    exportReview: (id: string) =>
      `/accounting-compliance/exercises/${encodeRouteId(id)}/review-export`,
    reviewTask: (id: string) =>
      `/accounting-compliance/review-tasks/${encodeRouteId(id)}`,
    reviewTaskDecision: (id: string) =>
      `/accounting-compliance/review-tasks/${encodeRouteId(id)}/decision`,
    reviewAccount: (id: string) =>
      `/accounting-compliance/review-accounts/${encodeRouteId(id)}`,
    closePeriod: (id: string) =>
      `/accounting-compliance/periods/${encodeRouteId(id)}/close`,
    reopenPeriod: (id: string) =>
      `/accounting-compliance/periods/${encodeRouteId(id)}/reopen`,
    closeExercise: (id: string) =>
      `/accounting-compliance/exercises/${encodeRouteId(id)}/close`,
    statements: (id: string) =>
      `/accounting-compliance/exercises/${encodeRouteId(id)}/statements`,
    fec: (id: string) =>
      `/accounting-compliance/exercises/${encodeRouteId(id)}/fec`,
    importFec: '/accounting-compliance/fec/import',
  },
  payroll: {
    employees: '/payroll/employees',
    employee: (id: string) => `/payroll/employees/${encodeRouteId(id)}`,
    terminateEmployee: (id: string) =>
      `/payroll/employees/${encodeRouteId(id)}/terminate`,
    payslips: '/payroll/payslips',
    generatePayslip: '/payroll/payslips/generate',
    validatePayslip: (id: string) =>
      `/payroll/payslips/${encodeRouteId(id)}/validate`,
    payPayslip: (id: string) => `/payroll/payslips/${encodeRouteId(id)}/pay`,
    leaves: '/payroll/leaves',
    decideLeave: (id: string) =>
      `/payroll/leaves/${encodeRouteId(id)}/decision`,
    leaveBalances: '/payroll/leave-balances',
    updateLeaveBalance: (id: string, year: string) =>
      `/payroll/employees/${encodeRouteId(id)}/leave-balances/${encodeURIComponent(year)}`,
    cnssExport: '/payroll/cnss/export',
    cnssBds: '/payroll/cnss/bds',
    payslipPdf: (id: string) => `/payroll/payslips/${encodeRouteId(id)}/pdf`,
    employeeAttestation: (id: string) =>
      `/payroll/employees/${encodeRouteId(id)}/attestation`,
    finalSettlementPdf: (id: string) =>
      `/payroll/employees/${encodeRouteId(id)}/final-settlement/pdf`,
    statementPdf: (periodKey: string) =>
      `/payroll/statements/${encodeURIComponent(periodKey)}/pdf`,
    regulatorySummary: '/payroll/regulatory/summary',
    regulatoryRules: '/payroll/regulatory/rules',
    regulatoryComponents: '/payroll/regulatory/components',
    regulatoryControls: '/payroll/regulatory/controls',
    regulatorySources: '/payroll/regulatory/sources',
    regulatorySeed: '/payroll/regulatory/seed/morocco-2026',
  },
  hrCore: {
    summary: '/hr-core/summary',
    accessMe: '/hr-core/access/me',
    accessAdministration: '/hr-core/access/administration',
    accessGrants: '/hr-core/access/grants',
    establishments: '/hr-core/establishments',
    establishment: (id: string) =>
      `/hr-core/establishments/${encodeRouteId(id)}`,
    grades: '/hr-core/grades',
    grade: (id: string) => `/hr-core/grades/${encodeRouteId(id)}`,
    costCenters: '/hr-core/cost-centers',
    costCenter: (id: string) => `/hr-core/cost-centers/${encodeRouteId(id)}`,
    teams: '/hr-core/teams',
    team: (id: string) => `/hr-core/teams/${encodeRouteId(id)}`,
    workLocations: '/hr-core/work-locations',
    workLocation: (id: string) =>
      `/hr-core/work-locations/${encodeRouteId(id)}`,
    departments: '/hr-core/departments',
    department: (id: string) => `/hr-core/departments/${encodeRouteId(id)}`,
    jobPositions: '/hr-core/job-positions',
    jobPosition: (id: string) => `/hr-core/job-positions/${encodeRouteId(id)}`,
    employees: '/hr-core/employees',
    employee: (id: string) => `/hr-core/employees/${encodeRouteId(id)}`,
    employeeImportTemplate: '/hr-core/employee-import/template',
    employeeImportPreview: '/hr-core/employee-import/preview',
    employeeImportCommit: '/hr-core/employee-import/commit',
    employeePersonalDetails: (id: string) =>
      `/hr-core/employees/${encodeRouteId(id)}/personal-details`,
    employeeDependants: (id: string) =>
      `/hr-core/employees/${encodeRouteId(id)}/dependants`,
    dependant: (id: string) => `/hr-core/dependants/${encodeRouteId(id)}`,
    employeeEmergencyContacts: (id: string) =>
      `/hr-core/employees/${encodeRouteId(id)}/emergency-contacts`,
    emergencyContact: (id: string) =>
      `/hr-core/emergency-contacts/${encodeRouteId(id)}`,
    employeeBankAccount: (id: string) =>
      `/hr-core/employees/${encodeRouteId(id)}/bank-account`,
    employeeAssignments: (id: string) =>
      `/hr-core/employees/${encodeRouteId(id)}/assignments`,
    assignmentEnd: (id: string) =>
      `/hr-core/assignments/${encodeRouteId(id)}/end`,
    deadlines: '/hr-core/deadlines',
    employeeDocuments: (id: string) =>
      `/hr-core/employees/${encodeRouteId(id)}/documents`,
    document: (id: string) => `/hr-core/hr-documents/${encodeRouteId(id)}`,
    documentVersions: (id: string) =>
      `/hr-core/hr-documents/${encodeRouteId(id)}/versions`,
    documentVersionContent: (id: string) =>
      `/hr-core/hr-document-versions/${encodeRouteId(id)}/content`,
    lifecycleJourneys: '/hr-core/lifecycle-journeys',
    hiring: '/hr-core/hiring',
    lifecycleTask: (id: string) =>
      `/hr-core/lifecycle-tasks/${encodeRouteId(id)}`,
    lifecycleJourneyStatus: (id: string) =>
      `/hr-core/lifecycle-journeys/${encodeRouteId(id)}/status`,
    employeeContracts: (id: string) =>
      `/hr-core/employees/${encodeRouteId(id)}/contracts`,
    contractStatus: (id: string) =>
      `/hr-core/contracts/${encodeRouteId(id)}/status`,
    contractAmendments: (id: string) =>
      `/hr-core/contracts/${encodeRouteId(id)}/amendments`,
    amendmentStatus: (id: string) =>
      `/hr-core/amendments/${encodeRouteId(id)}/status`,
  },
  documents: {
    collection: '/documents',
    detail: (id: string) => `/documents/${encodeRouteId(id)}`,
    content: (id: string) => `/documents/${encodeRouteId(id)}/content`,
    retryOcr: (id: string) => `/documents/${encodeRouteId(id)}/ocr/retry`,
    validateOcr: (id: string) => `/documents/${encodeRouteId(id)}/ocr/validate`,
    createSupplierInvoice: (id: string) =>
      `/documents/${encodeRouteId(id)}/create-supplier-invoice`,
  },
  operations: {
    expenseNotes: '/operations/expense-notes',
    submitExpenseNote: (id: string) =>
      `/operations/expense-notes/${encodeRouteId(id)}/submit`,
    decideExpenseNote: (id: string) =>
      `/operations/expense-notes/${encodeRouteId(id)}/decision`,
    payExpenseNote: (id: string) =>
      `/operations/expense-notes/${encodeRouteId(id)}/pay`,
    analytics: '/operations/analytics',
    analyticAllocations: '/operations/analytics/allocations',
    budgets: '/operations/budgets',
    approveBudget: (id: string) =>
      `/operations/budgets/${encodeRouteId(id)}/approve`,
    budgetVariance: (id: string) =>
      `/operations/budgets/${encodeRouteId(id)}/variance`,
    recurringInvoices: '/operations/recurring-invoices',
    recurringInvoiceStatus: (id: string) =>
      `/operations/recurring-invoices/${encodeRouteId(id)}/status`,
    runRecurringInvoices: '/operations/recurring-invoices/run',
    exchangeRates: '/operations/exchange-rates',
    portalAccess: '/operations/portal-access',
    revokePortalAccess: (id: string) =>
      `/operations/portal-access/${encodeRouteId(id)}/revoke`,
    anomalies: '/operations/anomalies',
    treasuryForecast: '/operations/treasury-forecast',
    scanAnomalies: '/operations/anomalies/scan',
    resolveAnomaly: (id: string) =>
      `/operations/anomalies/${encodeRouteId(id)}/resolve`,
  },
  liasse: {
    definitions: '/liasse/definitions',
    tables: (exerciseId: string) =>
      `/liasse/exercises/${encodeRouteId(exerciseId)}/tables`,
    validation: (exerciseId: string) =>
      `/liasse/exercises/${encodeRouteId(exerciseId)}/validation`,
    table: (exerciseId: string, tableCode: string) =>
      `/liasse/exercises/${encodeRouteId(exerciseId)}/tables/${encodeURIComponent(tableCode)}`,
    row: (exerciseId: string, tableCode: string, rowCode: string) =>
      `/liasse/exercises/${encodeRouteId(exerciseId)}/tables/${encodeURIComponent(tableCode)}/rows/${encodeURIComponent(rowCode)}`,
    export: (exerciseId: string) =>
      `/liasse/exercises/${encodeRouteId(exerciseId)}/export`,
    submissions: '/liasse/submissions',
    validateSubmission: (id: string) =>
      `/liasse/submissions/${encodeRouteId(id)}/external-validation`,
  },
  portalAdmin: {
    requests: '/portal-admin/requests',
    comment: (id: string) =>
      `/portal-admin/requests/${encodeRouteId(id)}/comments`,
    request: (id: string) => `/portal-admin/requests/${encodeRouteId(id)}`,
  },
  aiAccounting: {
    status: '/ai-accounting/status',
    suggestions: '/ai-accounting/suggestions',
    rules: '/ai-accounting/rules',
    rule: (id: string) => `/ai-accounting/rules/${encodeRouteId(id)}`,
    deactivateRule: (id: string) =>
      `/ai-accounting/rules/${encodeRouteId(id)}/deactivate`,
    categorize: '/ai-accounting/categorize',
    reconcile: '/ai-accounting/reconcile',
    reviewSuggestion: (id: string) =>
      `/ai-accounting/suggestions/${encodeRouteId(id)}`,
    safeQuery: '/ai-accounting/safe-query',
    conversations: '/ai-accounting/conversations',
    ask: '/ai-accounting/ask',
  },
  approvals: {
    matrices: '/approvals/matrices',
    matrixActive: (id: string) =>
      `/approvals/matrices/${encodeRouteId(id)}/active`,
    requests: '/approvals/requests',
    decision: (id: string) =>
      `/approvals/requests/${encodeRouteId(id)}/decision`,
  },
  marketing: {
    overview: '/marketing/overview',
    contacts: '/marketing/contacts',
    importTiers: '/marketing/contacts/import-tiers',
    contactConsent: (id: string) =>
      `/marketing/contacts/${encodeRouteId(id)}/consent`,
    segments: '/marketing/segments',
    segmentSync: (id: string) =>
      `/marketing/segments/${encodeRouteId(id)}/sync`,
    campaigns: '/marketing/campaigns',
    campaignSend: (id: string) =>
      `/marketing/campaigns/${encodeRouteId(id)}/send`,
    campaignRefresh: (id: string) =>
      `/marketing/campaigns/${encodeRouteId(id)}/refresh`,
    automations: '/marketing/automations',
    automationActivate: (id: string) =>
      `/marketing/automations/${encodeRouteId(id)}/activate`,
    automationPause: (id: string) =>
      `/marketing/automations/${encodeRouteId(id)}/pause`,
    scoringRules: '/marketing/scoring-rules',
    scoringRuleToggle: (id: string) =>
      `/marketing/scoring-rules/${encodeRouteId(id)}/toggle`,
    events: '/marketing/events',
  },
} as const;

export type ErpRole = z.infer<typeof erpRoleSchema>;
export type ErpErrorCode = z.infer<typeof erpErrorCodeSchema>;
export type ErpError = z.infer<typeof erpErrorSchema>;
export type ErpContext = z.infer<typeof erpContextSchema>;
export type ErpProduct = z.infer<typeof erpProductSchema>;
export type ErpProductList = z.infer<typeof erpProductListSchema>;
export type ErpTier = z.infer<typeof erpTierSchema>;
export type ErpTierList = z.infer<typeof erpTierListSchema>;
export type ErpQuoteLine = z.infer<typeof erpQuoteLineSchema>;
export type ErpQuote = z.infer<typeof erpQuoteSchema>;
export type ErpQuoteList = z.infer<typeof erpQuoteListSchema>;
export type ErpSalesOrderAllocation = z.infer<
  typeof erpSalesOrderAllocationSchema
>;
export type ErpSalesOrderLine = z.infer<typeof erpSalesOrderLineSchema>;
export type ErpSalesOrder = z.infer<typeof erpSalesOrderSchema>;
export type ErpSalesOrderList = z.infer<typeof erpSalesOrderListSchema>;
export type ErpDeliveryNoteLine = z.infer<typeof erpDeliveryNoteLineSchema>;
export type ErpDeliveryNote = z.infer<typeof erpDeliveryNoteSchema>;
export type ErpDeliveryNoteList = z.infer<typeof erpDeliveryNoteListSchema>;
export type ErpPurchaseOrderLine = z.infer<typeof erpPurchaseOrderLineSchema>;
export type ErpPurchaseOrder = z.infer<typeof erpPurchaseOrderSchema>;
export type ErpPurchaseOrderList = z.infer<typeof erpPurchaseOrderListSchema>;
export type ErpPurchaseReceiptLine = z.infer<
  typeof erpPurchaseReceiptLineSchema
>;
export type ErpPurchaseReceipt = z.infer<typeof erpPurchaseReceiptSchema>;
export type ErpPurchaseReceiptList = z.infer<
  typeof erpPurchaseReceiptListSchema
>;
export type ErpSupplierInvoiceLine = z.infer<
  typeof erpSupplierInvoiceLineSchema
>;
export type ErpSupplierInvoice = z.infer<typeof erpSupplierInvoiceSchema>;
export type ErpSupplierInvoiceList = z.infer<
  typeof erpSupplierInvoiceListSchema
>;
export type ErpSupplierInvoiceDetail = z.infer<
  typeof erpSupplierInvoiceDetailSchema
>;
export type ErpSupplierPaymentPreparation = z.infer<
  typeof erpSupplierPaymentPreparationSchema
>;
export type ErpSupplierPaymentPreparationList = z.infer<
  typeof erpSupplierPaymentPreparationListSchema
>;
export type ErpInvoiceLine = z.infer<typeof erpInvoiceLineSchema>;
export type ErpInvoice = z.infer<typeof erpInvoiceSchema>;
export type ErpInvoiceRead = z.infer<typeof erpInvoiceReadSchema>;
export type ErpInvoicePage = z.infer<typeof erpInvoicePageSchema>;
export type ErpPaymentAllocation = z.infer<typeof erpPaymentAllocationSchema>;
export type ErpPayment = z.infer<typeof erpPaymentSchema>;
export type ErpPaymentPage = z.infer<typeof erpPaymentPageSchema>;
export type ErpChequeDirection = z.infer<typeof erpChequeDirectionSchema>;
export type ErpChequeInstrumentType = z.infer<
  typeof erpChequeInstrumentTypeSchema
>;
export type ErpChequeStatus = z.infer<typeof erpChequeStatusSchema>;
export type ErpChequeBook = z.infer<typeof erpChequeBookSchema>;
export type ErpCheque = z.infer<typeof erpChequeSchema>;
export type ErpChequePage = z.infer<typeof erpChequePageSchema>;
export type ErpChequeSummary = z.infer<typeof erpChequeSummarySchema>;
export type ErpChequeAlerts = z.infer<typeof erpChequeAlertsSchema>;
export type ErpChequeAlert = ErpChequeAlerts['alerts'][number];
export type ErpChequeDepositSlipListItem = z.infer<
  typeof erpChequeDepositSlipListItemSchema
>;
export type ErpChequeDepositSlip = z.infer<typeof erpChequeDepositSlipSchema>;
export type ErpChequeBankStatementLine = z.infer<
  typeof erpChequeBankStatementLineSchema
>;
export type ErpEligibleInvoice = z.infer<typeof erpEligibleInvoiceSchema>;
export type ErpEligibleInvoicePage = z.infer<
  typeof erpEligibleInvoicePageSchema
>;
export type ErpCreditNoteLine = z.infer<typeof erpCreditNoteLineSchema>;
export type ErpCreditAllocation = z.infer<typeof erpCreditAllocationSchema>;
export type ErpCreditNote = z.infer<typeof erpCreditNoteSchema>;
export type ErpCreditNotePage = z.infer<typeof erpCreditNotePageSchema>;
export type ErpCustomerReturnLine = z.infer<typeof erpCustomerReturnLineSchema>;
export type ErpCustomerReturn = z.infer<typeof erpCustomerReturnSchema>;
export type ErpCustomerReturnList = z.infer<typeof erpCustomerReturnListSchema>;
export type ErpCustomerReturnEligibleLine = z.infer<
  typeof erpCustomerReturnEligibleLineSchema
>;
export type ErpCustomerReturnEligibleLineList = z.infer<
  typeof erpCustomerReturnEligibleLineListSchema
>;
export type ErpReminder = z.infer<typeof erpReminderSchema>;
export type ErpReminderPage = z.infer<typeof erpReminderPageSchema>;
export type ErpReminderScanResult = z.infer<typeof erpReminderScanResultSchema>;
export type ErpAccountingEntryLine = z.infer<
  typeof erpAccountingEntryLineSchema
>;
export type ErpAccountingEntry = z.infer<typeof erpAccountingEntrySchema>;
export type ErpAccountingEntryPage = z.infer<
  typeof erpAccountingEntryPageSchema
>;
export type ErpAccountingProvisionStatus = z.infer<
  typeof erpAccountingProvisionStatusSchema
>;
export type ErpAccountingProvisionType = z.infer<
  typeof erpAccountingProvisionTypeSchema
>;
export type ErpAccountingProvisionReversal = z.infer<
  typeof erpAccountingProvisionReversalSchema
>;
export type ErpAccountingProvision = z.infer<
  typeof erpAccountingProvisionSchema
>;
export type ErpAccountingProvisionList = z.infer<
  typeof erpAccountingProvisionListSchema
>;
export type ErpAccountingAccount = z.infer<typeof erpAccountingAccountSchema>;
export type ErpAccountingJournal = z.infer<typeof erpAccountingJournalSchema>;
export type ErpAccountingReferences = z.infer<
  typeof erpAccountingReferencesSchema
>;
export type ErpBalanceItem = z.infer<typeof erpBalanceItemSchema>;
export type ErpBalanceReport = z.infer<typeof erpBalanceReportSchema>;
export type ErpGrandLivreItem = z.infer<typeof erpGrandLivreItemSchema>;
export type ErpGrandLivreReport = z.infer<typeof erpGrandLivreReportSchema>;
export type ErpLettrageLine = z.infer<typeof erpLettrageLineSchema>;
export type ErpLettrageMatch = z.infer<typeof erpLettrageMatchSchema>;
export type ErpLettrageSuggestion = z.infer<typeof erpLettrageSuggestionSchema>;
export type ErpLettrageSuggestions = z.infer<
  typeof erpLettrageSuggestionsSchema
>;
export type ErpBankStatementStatus = z.infer<
  typeof erpBankStatementStatusSchema
>;
export type ErpBankAccount = z.infer<typeof erpBankAccountSchema>;
export type ErpBankAccountList = z.infer<typeof erpBankAccountListSchema>;
export type ErpBankReconciliation = z.infer<typeof erpBankReconciliationSchema>;
export type ErpBankReconciliationCandidate = z.infer<
  typeof erpBankReconciliationCandidateSchema
>;
export type ErpBankReconciliationCandidates = z.infer<
  typeof erpBankReconciliationCandidatesSchema
>;
export type ErpBankStatementLine = z.infer<typeof erpBankStatementLineSchema>;
export type ErpBankStatement = z.infer<typeof erpBankStatementSchema>;
export type ErpBankStatementDetail = z.infer<
  typeof erpBankStatementDetailSchema
>;
export type ErpWarehouse = z.infer<typeof erpWarehouseSchema>;
export type ErpWarehouseList = z.infer<typeof erpWarehouseListSchema>;
export type ErpStockLevel = z.infer<typeof erpStockLevelSchema>;
export type ErpStockLevelList = z.infer<typeof erpStockLevelListSchema>;
export type ErpStockMovement = z.infer<typeof erpStockMovementSchema>;
export type ErpStockMovementList = z.infer<typeof erpStockMovementListSchema>;
export type ErpGrossMarginDelivery = z.infer<
  typeof erpGrossMarginDeliverySchema
>;
export type ErpGrossMarginReport = z.infer<typeof erpGrossMarginReportSchema>;
export type ErpInventoryCount = z.infer<typeof erpInventoryCountSchema>;
export type ErpInventoryCountList = z.infer<typeof erpInventoryCountListSchema>;
export type ErpInventoryThreshold = z.infer<typeof erpInventoryThresholdSchema>;
export type ErpInventoryThresholdList = z.infer<
  typeof erpInventoryThresholdListSchema
>;
export type ErpReplenishmentSuggestion = z.infer<
  typeof erpReplenishmentSuggestionSchema
>;
export type ErpReplenishmentSuggestionList = z.infer<
  typeof erpReplenishmentSuggestionListSchema
>;
export type ErpTaxDeclaration = z.infer<typeof erpTaxDeclarationSchema>;
export type ErpFiscalDeadline = z.infer<typeof erpFiscalDeadlineSchema>;
export type ErpTvaProrataPeriod = z.infer<typeof erpTvaProrataPeriodSchema>;
export type ErpAnnualTvaProrata = z.infer<typeof erpAnnualTvaProrataSchema>;
export type ErpTvaProrataPosting = z.infer<typeof erpTvaProrataPostingSchema>;
export type ErpTaxPayment = z.infer<typeof erpTaxPaymentSchema>;
export type ErpTaxPaymentCandidate = z.infer<
  typeof erpTaxPaymentCandidateSchema
>;
export type ErpAccountingPeriod = z.infer<typeof erpAccountingPeriodSchema>;
export type ErpAccountingReviewTask = z.infer<
  typeof erpAccountingReviewTaskSchema
>;
export type ErpAccountingReviewAccount = z.infer<
  typeof erpAccountingReviewAccountSchema
>;
export type ErpAccountingReviewDossier = z.infer<
  typeof erpAccountingReviewDossierSchema
>;
export type ErpAccountingReviewExport = z.infer<
  typeof erpAccountingReviewExportSchema
>;
export type ErpExercise = z.infer<typeof erpExerciseSchema>;
export type ErpFinancialStatements = z.infer<
  typeof erpFinancialStatementsSchema
>;
export type ErpLiasseTableSummary = z.infer<typeof erpLiasseTableSummarySchema>;
export type ErpLiasseFieldDefinition = z.infer<
  typeof erpLiasseFieldDefinitionSchema
>;
export type ErpLiasseRow = z.infer<typeof erpLiasseRowSchema>;
export type ErpLiasseTableDetail = z.infer<typeof erpLiasseTableDetailSchema>;
export type ErpLiasseValidationIssue = z.infer<
  typeof erpLiasseValidationIssueSchema
>;
export type ErpLiasseValidation = z.infer<typeof erpLiasseValidationSchema>;
export type ErpLiasseExport = z.infer<typeof erpLiasseExportSchema>;
export type ErpRegulatorySubmission = z.infer<
  typeof erpRegulatorySubmissionSchema
>;
export type ErpEmployee = z.infer<typeof erpEmployeeSchema>;
export type ErpPayslip = z.infer<typeof erpPayslipSchema>;
export type ErpLeaveRequest = z.infer<typeof erpLeaveRequestSchema>;
export type ErpLeaveBalance = z.infer<typeof erpLeaveBalanceSchema>;
export type ErpDocument = z.infer<typeof erpDocumentSchema>;
export type ErpExpenseNoteLine = z.infer<typeof erpExpenseNoteLineSchema>;
export type ErpExpenseNote = z.infer<typeof erpExpenseNoteSchema>;
export type ErpAnalyticAxis = z.infer<typeof erpAnalyticAxisSchema>;
export type ErpBudgetLine = z.infer<typeof erpBudgetLineSchema>;
export type ErpBudget = z.infer<typeof erpBudgetSchema>;
export type ErpRecurringInvoice = z.infer<typeof erpRecurringInvoiceSchema>;
export type ErpExchangeRate = z.infer<typeof erpExchangeRateSchema>;
export type ErpPortalAccess = z.infer<typeof erpPortalAccessSchema>;
export type ErpAccountingAnomaly = z.infer<typeof erpAccountingAnomalySchema>;
export type ErpAiAccountingQueryId = z.infer<
  typeof erpAiAccountingQueryIdSchema
>;
export type ErpAiAccountingStatus = z.infer<typeof erpAiAccountingStatusSchema>;
export type ErpAiAccountingSuggestion = z.infer<
  typeof erpAiAccountingSuggestionSchema
>;
export type ErpAiCategorizationRule = z.infer<
  typeof erpAiCategorizationRuleSchema
>;
export type ErpAiAccountingSafeQueryResult = z.infer<
  typeof erpAiAccountingSafeQueryResultSchema
>;
export type ErpAiAccountingMessage = z.infer<
  typeof erpAiAccountingMessageSchema
>;
export type ErpAiAccountingConversation = z.infer<
  typeof erpAiAccountingConversationSchema
>;
export type ErpAiAccountingAnswer = z.infer<typeof erpAiAccountingAnswerSchema>;
export type ErpTreasuryScenarioCode = z.infer<
  typeof erpTreasuryScenarioCodeSchema
>;
export type ErpTreasuryEvent = z.infer<typeof erpTreasuryEventSchema>;
export type ErpTreasuryForecast = z.infer<typeof erpTreasuryForecastSchema>;
export type ErpMarocRouteId =
  (typeof erpMarocRouteIds)[keyof typeof erpMarocRouteIds];
