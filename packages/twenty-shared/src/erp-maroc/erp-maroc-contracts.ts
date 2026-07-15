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
  }),
  features: z.object({
    salesUi: z.boolean(),
    pdfGeneration: z.boolean(),
    invoiceValidation: z.boolean(),
    invoiceEmail: z.boolean(),
    reminderManagement: z.boolean(),
    reminderDelivery: z.boolean(),
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
  convertedAt: nullableInstantSchema,
  createdAt: instantSchema,
  updatedAt: instantSchema,
  lines: z.array(erpQuoteLineSchema),
});

export const erpQuoteListSchema = z.array(erpQuoteSchema);

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
  'REJECTED',
]);
export const erpAccountingSourceTypeSchema = z.enum([
  'INVOICE',
  'PAYMENT',
  'CREDIT_NOTE',
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
      (entry.status === 'VALIDATED' && hasValidation && !hasRejection) ||
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

const encodeRouteId = (id: string): string => {
  return encodeURIComponent(uuidSchema.parse(id));
};

export const erpMarocRouteIds = {
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
} as const;

export const erpMarocUpstreamRoutes = {
  context: '/context',
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
  invoices: {
    collection: '/invoices',
    fromQuote: (quoteId: string) =>
      `/invoices/from-quote/${encodeRouteId(quoteId)}`,
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
  creditNotes: {
    collection: '/credit-notes',
    detail: (id: string) => `/credit-notes/${encodeRouteId(id)}`,
    validate: (id: string) => `/credit-notes/${encodeRouteId(id)}/validate`,
    eligibleInvoices: (id: string) =>
      `/credit-notes/${encodeRouteId(id)}/eligible-invoices`,
    allocate: (id: string) => `/credit-notes/${encodeRouteId(id)}/allocate`,
    cancel: (id: string) => `/credit-notes/${encodeRouteId(id)}/cancel`,
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
    grandLivre: '/accounting/grand-livre',
    balance: '/accounting/balance',
    lettrageSuggestions: '/accounting/lettrage/suggestions',
    lettrageMatch: '/accounting/lettrage/match',
    lettrageUnmatch: '/accounting/lettrage/unmatch',
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
export type ErpInvoiceLine = z.infer<typeof erpInvoiceLineSchema>;
export type ErpInvoice = z.infer<typeof erpInvoiceSchema>;
export type ErpInvoiceRead = z.infer<typeof erpInvoiceReadSchema>;
export type ErpInvoicePage = z.infer<typeof erpInvoicePageSchema>;
export type ErpPaymentAllocation = z.infer<typeof erpPaymentAllocationSchema>;
export type ErpPayment = z.infer<typeof erpPaymentSchema>;
export type ErpPaymentPage = z.infer<typeof erpPaymentPageSchema>;
export type ErpEligibleInvoice = z.infer<typeof erpEligibleInvoiceSchema>;
export type ErpEligibleInvoicePage = z.infer<
  typeof erpEligibleInvoicePageSchema
>;
export type ErpCreditNoteLine = z.infer<typeof erpCreditNoteLineSchema>;
export type ErpCreditAllocation = z.infer<typeof erpCreditAllocationSchema>;
export type ErpCreditNote = z.infer<typeof erpCreditNoteSchema>;
export type ErpCreditNotePage = z.infer<typeof erpCreditNotePageSchema>;
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
export type ErpMarocRouteId =
  (typeof erpMarocRouteIds)[keyof typeof erpMarocRouteIds];
