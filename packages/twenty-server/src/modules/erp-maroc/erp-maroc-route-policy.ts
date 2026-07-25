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
  marketingAutomationListSchema,
  marketingAutomationSchema,
  marketingCampaignListSchema,
  marketingCampaignSchema,
  marketingContactListSchema,
  marketingContactSchema,
  marketingOverviewSchema,
  marketingSegmentListSchema,
  marketingSegmentSchema,
  marketingSegmentSyncResultSchema,
  marketingTierImportResultSchema,
  erpMarocRouteIds,
  erpMarocUpstreamRoutes,
  erpPaymentPageSchema,
  erpPaymentSchema,
  erpProductListSchema,
  erpProductSchema,
  erpPurchaseOrderListSchema,
  erpPurchaseOrderSchema,
  erpPurchaseReceiptListSchema,
  erpPurchaseReceiptSchema,
  erpSupplierInvoiceListSchema,
  erpSupplierInvoiceSchema,
  erpSupplierInvoiceDetailSchema,
  erpSupplierPaymentPreparationListSchema,
  erpSupplierPaymentPreparationSchema,
  erpQuoteListSchema,
  erpQuoteSchema,
  erpReminderPageSchema,
  erpReminderScanResultSchema,
  erpReminderSchema,
  erpTierListSchema,
  erpTierSchema,
  uuidSchema,
  type ErpMarocRouteId,
} from 'twenty-shared/erp-maroc';
import { z, type ZodType } from 'zod';

export type ErpMarocHttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE';
export type ErpMarocRouteKind = 'json' | 'pdf';
export type ErpMarocIdempotencyPolicy = 'forbidden' | 'required';
export type ErpMarocQuery = Readonly<Record<string, unknown>> | URLSearchParams;

export type ErpMarocRoute = Readonly<{
  routeId: ErpMarocRouteId;
  method: ErpMarocHttpMethod;
  pattern: RegExp;
  build: (match: RegExpMatchArray) => string;
  queryKeys: readonly string[];
  responseSchema: ZodType;
  kind: ErpMarocRouteKind;
  idempotency: ErpMarocIdempotencyPolicy;
}>;

export type ResolvedErpMarocRoute = Readonly<{
  routeId: ErpMarocRouteId;
  method: ErpMarocHttpMethod;
  upstreamPath: string;
  responseSchema: ZodType;
  kind: ErpMarocRouteKind;
  idempotency: ErpMarocIdempotencyPolicy;
}>;

// Capture one safe path segment, then delegate UUID semantics to the shared schema.
const uuidSource = '([^/]+)';
const noQuery = Object.freeze([] as string[]);
const pageQuery = Object.freeze(['cursor', 'limit']);
const paymentQuery = Object.freeze([
  'status',
  'kind',
  'method',
  'tierId',
  'invoiceId',
  'from',
  'to',
  'cursor',
  'limit',
]);
const creditNoteQuery = Object.freeze([
  'status',
  'tierId',
  'invoiceId',
  'from',
  'to',
  'cursor',
  'limit',
]);
const reminderQuery = Object.freeze(['status', 'level', 'cursor', 'limit']);
const accountingEntryQuery = Object.freeze([
  'status',
  'sourceType',
  'from',
  'to',
  'cursor',
  'limit',
]);
const accountingReportQuery = Object.freeze(['from', 'to', 'includeDraft']);
const grandLivreQuery = Object.freeze([
  'accountCode',
  ...accountingReportQuery,
]);
const lettrageQuery = Object.freeze(['accountCode']);
const pdfSchema = z.instanceof(Uint8Array);

const exact = (path: string) => new RegExp(`^${path}$`);
const detail = (collection: string) =>
  new RegExp(`^/${collection}/${uuidSource}$`);
const action = (collection: string, actionName: string) =>
  new RegExp(`^/${collection}/${uuidSource}/${actionName}$`);

const staticBuilder = (path: string) => () => path;
const idBuilder =
  (builder: (id: string) => string) => (match: RegExpMatchArray) =>
    builder(uuidSchema.parse(match[1]));

const defineRoute = (route: ErpMarocRoute): ErpMarocRoute => {
  Object.freeze(route.pattern);

  return Object.freeze(route);
};

const routes: ErpMarocRoute[] = [
  defineRoute({
    routeId: erpMarocRouteIds.context,
    method: 'GET',
    pattern: exact('/context'),
    build: staticBuilder(erpMarocUpstreamRoutes.context),
    queryKeys: noQuery,
    responseSchema: erpContextSchema,
    kind: 'json',
    idempotency: 'forbidden',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.productsCollection,
    method: 'GET',
    pattern: exact('/products'),
    build: staticBuilder(erpMarocUpstreamRoutes.products.collection),
    queryKeys: noQuery,
    responseSchema: erpProductListSchema,
    kind: 'json',
    idempotency: 'forbidden',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.productsCollection,
    method: 'POST',
    pattern: exact('/products'),
    build: staticBuilder(erpMarocUpstreamRoutes.products.collection),
    queryKeys: noQuery,
    responseSchema: erpProductSchema,
    kind: 'json',
    idempotency: 'forbidden',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.productDetail,
    method: 'GET',
    pattern: detail('products'),
    build: idBuilder(erpMarocUpstreamRoutes.products.detail),
    queryKeys: noQuery,
    responseSchema: erpProductSchema,
    kind: 'json',
    idempotency: 'forbidden',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.productDetail,
    method: 'PATCH',
    pattern: detail('products'),
    build: idBuilder(erpMarocUpstreamRoutes.products.detail),
    queryKeys: noQuery,
    responseSchema: erpProductSchema,
    kind: 'json',
    idempotency: 'forbidden',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.productDetail,
    method: 'DELETE',
    pattern: detail('products'),
    build: idBuilder(erpMarocUpstreamRoutes.products.detail),
    queryKeys: noQuery,
    responseSchema: erpProductSchema,
    kind: 'json',
    idempotency: 'forbidden',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.tiersCollection,
    method: 'GET',
    pattern: exact('/tiers'),
    build: staticBuilder(erpMarocUpstreamRoutes.tiers.collection),
    queryKeys: noQuery,
    responseSchema: erpTierListSchema,
    kind: 'json',
    idempotency: 'forbidden',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.tiersCollection,
    method: 'POST',
    pattern: exact('/tiers'),
    build: staticBuilder(erpMarocUpstreamRoutes.tiers.collection),
    queryKeys: noQuery,
    responseSchema: erpTierSchema,
    kind: 'json',
    idempotency: 'forbidden',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.tiersSyncFromTwentyCompany,
    method: 'POST',
    pattern: exact('/tiers/sync-from-twenty-company'),
    build: staticBuilder(erpMarocUpstreamRoutes.tiers.syncFromTwentyCompany),
    queryKeys: noQuery,
    responseSchema: erpTierSchema,
    kind: 'json',
    idempotency: 'forbidden',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.tierDetail,
    method: 'GET',
    pattern: detail('tiers'),
    build: idBuilder(erpMarocUpstreamRoutes.tiers.detail),
    queryKeys: noQuery,
    responseSchema: erpTierSchema,
    kind: 'json',
    idempotency: 'forbidden',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.tierDetail,
    method: 'PATCH',
    pattern: detail('tiers'),
    build: idBuilder(erpMarocUpstreamRoutes.tiers.detail),
    queryKeys: noQuery,
    responseSchema: erpTierSchema,
    kind: 'json',
    idempotency: 'forbidden',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.quotesCollection,
    method: 'GET',
    pattern: exact('/quotes'),
    build: staticBuilder(erpMarocUpstreamRoutes.quotes.collection),
    queryKeys: noQuery,
    responseSchema: erpQuoteListSchema,
    kind: 'json',
    idempotency: 'forbidden',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.quotesCollection,
    method: 'POST',
    pattern: exact('/quotes'),
    build: staticBuilder(erpMarocUpstreamRoutes.quotes.collection),
    queryKeys: noQuery,
    responseSchema: erpQuoteSchema,
    kind: 'json',
    idempotency: 'forbidden',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.quotesFromOpportunity,
    method: 'POST',
    pattern: exact('/quotes/from-opportunity'),
    build: staticBuilder(erpMarocUpstreamRoutes.quotes.fromOpportunity),
    queryKeys: noQuery,
    responseSchema: erpQuoteSchema,
    kind: 'json',
    idempotency: 'forbidden',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.quoteDetail,
    method: 'GET',
    pattern: detail('quotes'),
    build: idBuilder(erpMarocUpstreamRoutes.quotes.detail),
    queryKeys: noQuery,
    responseSchema: erpQuoteSchema,
    kind: 'json',
    idempotency: 'forbidden',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.quoteDetail,
    method: 'PATCH',
    pattern: detail('quotes'),
    build: idBuilder(erpMarocUpstreamRoutes.quotes.detail),
    queryKeys: noQuery,
    responseSchema: erpQuoteSchema,
    kind: 'json',
    idempotency: 'forbidden',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.quoteSend,
    method: 'POST',
    pattern: action('quotes', 'send'),
    build: idBuilder(erpMarocUpstreamRoutes.quotes.send),
    queryKeys: noQuery,
    responseSchema: erpQuoteSchema,
    kind: 'json',
    idempotency: 'forbidden',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.quoteAccept,
    method: 'POST',
    pattern: action('quotes', 'accept'),
    build: idBuilder(erpMarocUpstreamRoutes.quotes.accept),
    queryKeys: noQuery,
    responseSchema: erpQuoteSchema,
    kind: 'json',
    idempotency: 'forbidden',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.quoteReject,
    method: 'POST',
    pattern: action('quotes', 'reject'),
    build: idBuilder(erpMarocUpstreamRoutes.quotes.reject),
    queryKeys: noQuery,
    responseSchema: erpQuoteSchema,
    kind: 'json',
    idempotency: 'forbidden',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.purchaseOrdersCollection,
    method: 'GET',
    pattern: exact('/purchase-orders'),
    build: staticBuilder(erpMarocUpstreamRoutes.purchaseOrders.collection),
    queryKeys: noQuery,
    responseSchema: erpPurchaseOrderListSchema,
    kind: 'json',
    idempotency: 'forbidden',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.purchaseOrdersCollection,
    method: 'POST',
    pattern: exact('/purchase-orders'),
    build: staticBuilder(erpMarocUpstreamRoutes.purchaseOrders.collection),
    queryKeys: noQuery,
    responseSchema: erpPurchaseOrderSchema,
    kind: 'json',
    idempotency: 'forbidden',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.purchaseOrderDetail,
    method: 'GET',
    pattern: detail('purchase-orders'),
    build: idBuilder(erpMarocUpstreamRoutes.purchaseOrders.detail),
    queryKeys: noQuery,
    responseSchema: erpPurchaseOrderSchema,
    kind: 'json',
    idempotency: 'forbidden',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.purchaseOrderConfirm,
    method: 'POST',
    pattern: action('purchase-orders', 'confirm'),
    build: idBuilder(erpMarocUpstreamRoutes.purchaseOrders.confirm),
    queryKeys: noQuery,
    responseSchema: erpPurchaseOrderSchema,
    kind: 'json',
    idempotency: 'forbidden',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.purchaseOrderCancel,
    method: 'POST',
    pattern: action('purchase-orders', 'cancel'),
    build: idBuilder(erpMarocUpstreamRoutes.purchaseOrders.cancel),
    queryKeys: noQuery,
    responseSchema: erpPurchaseOrderSchema,
    kind: 'json',
    idempotency: 'forbidden',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.purchaseOrderReceipts,
    method: 'GET',
    pattern: action('purchase-orders', 'receipts'),
    build: idBuilder(erpMarocUpstreamRoutes.purchaseOrders.receipts),
    queryKeys: noQuery,
    responseSchema: erpPurchaseReceiptListSchema,
    kind: 'json',
    idempotency: 'forbidden',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.supplierInvoiceDetail,
    method: 'GET',
    pattern: detail('supplier-invoices'),
    build: idBuilder(erpMarocUpstreamRoutes.supplierInvoices.detail),
    queryKeys: noQuery,
    responseSchema: erpSupplierInvoiceDetailSchema,
    kind: 'json',
    idempotency: 'forbidden',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.supplierInvoiceDetail,
    method: 'PATCH',
    pattern: detail('supplier-invoices'),
    build: idBuilder(erpMarocUpstreamRoutes.supplierInvoices.detail),
    queryKeys: noQuery,
    responseSchema: erpSupplierInvoiceDetailSchema,
    kind: 'json',
    idempotency: 'forbidden',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.supplierInvoiceApprove,
    method: 'POST',
    pattern: action('supplier-invoices', 'approve'),
    build: idBuilder(erpMarocUpstreamRoutes.supplierInvoices.approve),
    queryKeys: noQuery,
    responseSchema: erpSupplierInvoiceDetailSchema,
    kind: 'json',
    idempotency: 'forbidden',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.supplierInvoiceCancel,
    method: 'POST',
    pattern: action('supplier-invoices', 'cancel'),
    build: idBuilder(erpMarocUpstreamRoutes.supplierInvoices.cancel),
    queryKeys: noQuery,
    responseSchema: erpSupplierInvoiceDetailSchema,
    kind: 'json',
    idempotency: 'forbidden',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.supplierInvoicePaymentPreparations,
    method: 'GET',
    pattern: new RegExp(
      `^/supplier-invoices/${uuidSource}/payment-preparations$`,
    ),
    build: idBuilder(
      erpMarocUpstreamRoutes.supplierInvoices.paymentPreparations,
    ),
    queryKeys: noQuery,
    responseSchema: erpSupplierPaymentPreparationListSchema,
    kind: 'json',
    idempotency: 'forbidden',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.supplierInvoicePaymentPreparations,
    method: 'POST',
    pattern: new RegExp(
      `^/supplier-invoices/${uuidSource}/payment-preparations$`,
    ),
    build: idBuilder(
      erpMarocUpstreamRoutes.supplierInvoices.paymentPreparations,
    ),
    queryKeys: noQuery,
    responseSchema: erpSupplierPaymentPreparationSchema,
    kind: 'json',
    idempotency: 'required',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.supplierPaymentPreparationCancel,
    method: 'POST',
    pattern: action('supplier-payment-preparations', 'cancel'),
    build: idBuilder(erpMarocUpstreamRoutes.supplierPaymentPreparations.cancel),
    queryKeys: noQuery,
    responseSchema: erpSupplierPaymentPreparationSchema,
    kind: 'json',
    idempotency: 'required',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.purchaseOrderSupplierInvoices,
    method: 'GET',
    pattern: action('purchase-orders', 'supplier-invoices'),
    build: idBuilder(erpMarocUpstreamRoutes.purchaseOrders.supplierInvoices),
    queryKeys: noQuery,
    responseSchema: erpSupplierInvoiceListSchema,
    kind: 'json',
    idempotency: 'forbidden',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.purchaseOrderSupplierInvoices,
    method: 'POST',
    pattern: action('purchase-orders', 'supplier-invoices'),
    build: idBuilder(erpMarocUpstreamRoutes.purchaseOrders.supplierInvoices),
    queryKeys: noQuery,
    responseSchema: erpSupplierInvoiceSchema,
    kind: 'json',
    idempotency: 'forbidden',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.purchaseOrderReceipts,
    method: 'POST',
    pattern: action('purchase-orders', 'receipts'),
    build: idBuilder(erpMarocUpstreamRoutes.purchaseOrders.receipts),
    queryKeys: noQuery,
    responseSchema: erpPurchaseReceiptSchema,
    kind: 'json',
    idempotency: 'forbidden',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.invoicesCollection,
    method: 'GET',
    pattern: exact('/invoices'),
    build: staticBuilder(erpMarocUpstreamRoutes.invoices.collection),
    queryKeys: pageQuery,
    responseSchema: erpInvoicePageSchema,
    kind: 'json',
    idempotency: 'forbidden',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.invoicesCollection,
    method: 'POST',
    pattern: exact('/invoices'),
    build: staticBuilder(erpMarocUpstreamRoutes.invoices.collection),
    queryKeys: noQuery,
    responseSchema: erpInvoiceSchema,
    kind: 'json',
    idempotency: 'forbidden',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.invoiceFromQuote,
    method: 'POST',
    pattern: new RegExp(`^/invoices/from-quote/${uuidSource}$`),
    build: idBuilder(erpMarocUpstreamRoutes.invoices.fromQuote),
    queryKeys: noQuery,
    responseSchema: erpInvoiceSchema,
    kind: 'json',
    idempotency: 'forbidden',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.invoiceDetail,
    method: 'GET',
    pattern: detail('invoices'),
    build: idBuilder(erpMarocUpstreamRoutes.invoices.detail),
    queryKeys: noQuery,
    responseSchema: erpInvoiceReadSchema,
    kind: 'json',
    idempotency: 'forbidden',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.invoiceDetail,
    method: 'PATCH',
    pattern: detail('invoices'),
    build: idBuilder(erpMarocUpstreamRoutes.invoices.detail),
    queryKeys: noQuery,
    responseSchema: erpInvoiceSchema,
    kind: 'json',
    idempotency: 'forbidden',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.invoiceValidate,
    method: 'POST',
    pattern: action('invoices', 'validate'),
    build: idBuilder(erpMarocUpstreamRoutes.invoices.validate),
    queryKeys: noQuery,
    responseSchema: erpInvoiceSchema,
    kind: 'json',
    idempotency: 'forbidden',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.invoiceSend,
    method: 'POST',
    pattern: action('invoices', 'send'),
    build: idBuilder(erpMarocUpstreamRoutes.invoices.send),
    queryKeys: noQuery,
    responseSchema: erpInvoiceSchema,
    kind: 'json',
    idempotency: 'forbidden',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.invoicePdf,
    method: 'GET',
    pattern: action('invoices', 'pdf'),
    build: idBuilder(erpMarocUpstreamRoutes.invoices.pdf),
    queryKeys: noQuery,
    responseSchema: pdfSchema,
    kind: 'pdf',
    idempotency: 'forbidden',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.paymentsCollection,
    method: 'GET',
    pattern: exact('/payments'),
    build: staticBuilder(erpMarocUpstreamRoutes.payments.collection),
    queryKeys: paymentQuery,
    responseSchema: erpPaymentPageSchema,
    kind: 'json',
    idempotency: 'forbidden',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.paymentsCollection,
    method: 'POST',
    pattern: exact('/payments'),
    build: staticBuilder(erpMarocUpstreamRoutes.payments.collection),
    queryKeys: noQuery,
    responseSchema: erpPaymentSchema,
    kind: 'json',
    idempotency: 'required',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.paymentDetail,
    method: 'GET',
    pattern: detail('payments'),
    build: idBuilder(erpMarocUpstreamRoutes.payments.detail),
    queryKeys: noQuery,
    responseSchema: erpPaymentSchema,
    kind: 'json',
    idempotency: 'forbidden',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.paymentEligibleInvoices,
    method: 'GET',
    pattern: action('payments', 'eligible-invoices'),
    build: idBuilder(erpMarocUpstreamRoutes.payments.eligibleInvoices),
    queryKeys: pageQuery,
    responseSchema: erpEligibleInvoicePageSchema,
    kind: 'json',
    idempotency: 'forbidden',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.paymentAllocate,
    method: 'POST',
    pattern: action('payments', 'allocate'),
    build: idBuilder(erpMarocUpstreamRoutes.payments.allocate),
    queryKeys: noQuery,
    responseSchema: erpPaymentSchema,
    kind: 'json',
    idempotency: 'required',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.paymentTerminate,
    method: 'POST',
    pattern: action('payments', 'terminate'),
    build: idBuilder(erpMarocUpstreamRoutes.payments.terminate),
    queryKeys: noQuery,
    responseSchema: erpPaymentSchema,
    kind: 'json',
    idempotency: 'required',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.creditNotesCollection,
    method: 'GET',
    pattern: exact('/credit-notes'),
    build: staticBuilder(erpMarocUpstreamRoutes.creditNotes.collection),
    queryKeys: creditNoteQuery,
    responseSchema: erpCreditNotePageSchema,
    kind: 'json',
    idempotency: 'forbidden',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.creditNotesCollection,
    method: 'POST',
    pattern: exact('/credit-notes'),
    build: staticBuilder(erpMarocUpstreamRoutes.creditNotes.collection),
    queryKeys: noQuery,
    responseSchema: erpCreditNoteSchema,
    kind: 'json',
    idempotency: 'required',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.creditNoteDetail,
    method: 'GET',
    pattern: detail('credit-notes'),
    build: idBuilder(erpMarocUpstreamRoutes.creditNotes.detail),
    queryKeys: noQuery,
    responseSchema: erpCreditNoteSchema,
    kind: 'json',
    idempotency: 'forbidden',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.creditNoteDetail,
    method: 'PATCH',
    pattern: detail('credit-notes'),
    build: idBuilder(erpMarocUpstreamRoutes.creditNotes.detail),
    queryKeys: noQuery,
    responseSchema: erpCreditNoteSchema,
    kind: 'json',
    idempotency: 'required',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.creditNoteValidate,
    method: 'POST',
    pattern: action('credit-notes', 'validate'),
    build: idBuilder(erpMarocUpstreamRoutes.creditNotes.validate),
    queryKeys: noQuery,
    responseSchema: erpCreditNoteSchema,
    kind: 'json',
    idempotency: 'required',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.creditNoteEligibleInvoices,
    method: 'GET',
    pattern: action('credit-notes', 'eligible-invoices'),
    build: idBuilder(erpMarocUpstreamRoutes.creditNotes.eligibleInvoices),
    queryKeys: pageQuery,
    responseSchema: erpEligibleInvoicePageSchema,
    kind: 'json',
    idempotency: 'forbidden',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.creditNoteAllocate,
    method: 'POST',
    pattern: action('credit-notes', 'allocate'),
    build: idBuilder(erpMarocUpstreamRoutes.creditNotes.allocate),
    queryKeys: noQuery,
    responseSchema: erpCreditNoteSchema,
    kind: 'json',
    idempotency: 'required',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.creditNoteCancel,
    method: 'POST',
    pattern: action('credit-notes', 'cancel'),
    build: idBuilder(erpMarocUpstreamRoutes.creditNotes.cancel),
    queryKeys: noQuery,
    responseSchema: erpCreditNoteSchema,
    kind: 'json',
    idempotency: 'required',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.accountingEntriesCollection,
    method: 'GET',
    pattern: exact('/accounting/entries'),
    build: staticBuilder(erpMarocUpstreamRoutes.accounting.entries),
    queryKeys: accountingEntryQuery,
    responseSchema: erpAccountingEntryPageSchema,
    kind: 'json',
    idempotency: 'forbidden',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.accountingEntryDetail,
    method: 'GET',
    pattern: detail('accounting/entries'),
    build: idBuilder(erpMarocUpstreamRoutes.accounting.detail),
    queryKeys: noQuery,
    responseSchema: erpAccountingEntrySchema,
    kind: 'json',
    idempotency: 'forbidden',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.accountingEntryValidate,
    method: 'POST',
    pattern: action('accounting/entries', 'validate'),
    build: idBuilder(erpMarocUpstreamRoutes.accounting.validate),
    queryKeys: noQuery,
    responseSchema: erpAccountingEntrySchema,
    kind: 'json',
    idempotency: 'required',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.accountingEntryReject,
    method: 'POST',
    pattern: action('accounting/entries', 'reject'),
    build: idBuilder(erpMarocUpstreamRoutes.accounting.reject),
    queryKeys: noQuery,
    responseSchema: erpAccountingEntrySchema,
    kind: 'json',
    idempotency: 'required',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.accountingGrandLivre,
    method: 'GET',
    pattern: exact('/accounting/grand-livre'),
    build: staticBuilder(erpMarocUpstreamRoutes.accounting.grandLivre),
    queryKeys: grandLivreQuery,
    responseSchema: erpGrandLivreReportSchema,
    kind: 'json',
    idempotency: 'forbidden',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.accountingBalance,
    method: 'GET',
    pattern: exact('/accounting/balance'),
    build: staticBuilder(erpMarocUpstreamRoutes.accounting.balance),
    queryKeys: accountingReportQuery,
    responseSchema: erpBalanceReportSchema,
    kind: 'json',
    idempotency: 'forbidden',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.accountingLettrageSuggestions,
    method: 'GET',
    pattern: exact('/accounting/lettrage/suggestions'),
    build: staticBuilder(erpMarocUpstreamRoutes.accounting.lettrageSuggestions),
    queryKeys: lettrageQuery,
    responseSchema: erpLettrageSuggestionsSchema,
    kind: 'json',
    idempotency: 'forbidden',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.accountingLettrageMatch,
    method: 'POST',
    pattern: exact('/accounting/lettrage/match'),
    build: staticBuilder(erpMarocUpstreamRoutes.accounting.lettrageMatch),
    queryKeys: noQuery,
    responseSchema: erpLettrageMatchSchema,
    kind: 'json',
    idempotency: 'required',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.accountingLettrageUnmatch,
    method: 'POST',
    pattern: exact('/accounting/lettrage/unmatch'),
    build: staticBuilder(erpMarocUpstreamRoutes.accounting.lettrageUnmatch),
    queryKeys: noQuery,
    responseSchema: erpLettrageMatchSchema,
    kind: 'json',
    idempotency: 'required',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.remindersCollection,
    method: 'GET',
    pattern: exact('/reminders'),
    build: staticBuilder(erpMarocUpstreamRoutes.reminders.collection),
    queryKeys: reminderQuery,
    responseSchema: erpReminderPageSchema,
    kind: 'json',
    idempotency: 'forbidden',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.remindersScan,
    method: 'POST',
    pattern: exact('/reminders/scan'),
    build: staticBuilder(erpMarocUpstreamRoutes.reminders.scan),
    queryKeys: noQuery,
    responseSchema: erpReminderScanResultSchema,
    kind: 'json',
    idempotency: 'required',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.reminderDetail,
    method: 'GET',
    pattern: detail('reminders'),
    build: idBuilder(erpMarocUpstreamRoutes.reminders.detail),
    queryKeys: noQuery,
    responseSchema: erpReminderSchema,
    kind: 'json',
    idempotency: 'forbidden',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.reminderApprove,
    method: 'POST',
    pattern: action('reminders', 'approve'),
    build: idBuilder(erpMarocUpstreamRoutes.reminders.approve),
    queryKeys: noQuery,
    responseSchema: erpReminderSchema,
    kind: 'json',
    idempotency: 'required',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.reminderCancel,
    method: 'POST',
    pattern: action('reminders', 'cancel'),
    build: idBuilder(erpMarocUpstreamRoutes.reminders.cancel),
    queryKeys: noQuery,
    responseSchema: erpReminderSchema,
    kind: 'json',
    idempotency: 'required',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.marketingOverview,
    method: 'GET',
    pattern: exact('/marketing/overview'),
    build: staticBuilder(erpMarocUpstreamRoutes.marketing.overview),
    queryKeys: noQuery,
    responseSchema: marketingOverviewSchema,
    kind: 'json',
    idempotency: 'forbidden',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.marketingContactsCollection,
    method: 'GET',
    pattern: exact('/marketing/contacts'),
    build: staticBuilder(erpMarocUpstreamRoutes.marketing.contacts),
    queryKeys: noQuery,
    responseSchema: marketingContactListSchema,
    kind: 'json',
    idempotency: 'forbidden',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.marketingContactsImportTiers,
    method: 'POST',
    pattern: exact('/marketing/contacts/import-tiers'),
    build: staticBuilder(erpMarocUpstreamRoutes.marketing.importTiers),
    queryKeys: noQuery,
    responseSchema: marketingTierImportResultSchema,
    kind: 'json',
    idempotency: 'required',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.marketingContactConsent,
    method: 'POST',
    pattern: action('marketing/contacts', 'consent'),
    build: idBuilder(erpMarocUpstreamRoutes.marketing.contactConsent),
    queryKeys: noQuery,
    responseSchema: marketingContactSchema,
    kind: 'json',
    idempotency: 'required',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.marketingSegmentsCollection,
    method: 'GET',
    pattern: exact('/marketing/segments'),
    build: staticBuilder(erpMarocUpstreamRoutes.marketing.segments),
    queryKeys: noQuery,
    responseSchema: marketingSegmentListSchema,
    kind: 'json',
    idempotency: 'forbidden',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.marketingSegmentsCollection,
    method: 'POST',
    pattern: exact('/marketing/segments'),
    build: staticBuilder(erpMarocUpstreamRoutes.marketing.segments),
    queryKeys: noQuery,
    responseSchema: marketingSegmentSchema,
    kind: 'json',
    idempotency: 'required',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.marketingSegmentSync,
    method: 'POST',
    pattern: action('marketing/segments', 'sync'),
    build: idBuilder(erpMarocUpstreamRoutes.marketing.segmentSync),
    queryKeys: noQuery,
    responseSchema: marketingSegmentSyncResultSchema,
    kind: 'json',
    idempotency: 'required',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.marketingCampaignsCollection,
    method: 'GET',
    pattern: exact('/marketing/campaigns'),
    build: staticBuilder(erpMarocUpstreamRoutes.marketing.campaigns),
    queryKeys: noQuery,
    responseSchema: marketingCampaignListSchema,
    kind: 'json',
    idempotency: 'forbidden',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.marketingCampaignsCollection,
    method: 'POST',
    pattern: exact('/marketing/campaigns'),
    build: staticBuilder(erpMarocUpstreamRoutes.marketing.campaigns),
    queryKeys: noQuery,
    responseSchema: marketingCampaignSchema,
    kind: 'json',
    idempotency: 'required',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.marketingCampaignSend,
    method: 'POST',
    pattern: action('marketing/campaigns', 'send'),
    build: idBuilder(erpMarocUpstreamRoutes.marketing.campaignSend),
    queryKeys: noQuery,
    responseSchema: marketingCampaignSchema,
    kind: 'json',
    idempotency: 'required',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.marketingCampaignRefresh,
    method: 'POST',
    pattern: action('marketing/campaigns', 'refresh'),
    build: idBuilder(erpMarocUpstreamRoutes.marketing.campaignRefresh),
    queryKeys: noQuery,
    responseSchema: marketingCampaignSchema,
    kind: 'json',
    idempotency: 'required',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.marketingAutomationsCollection,
    method: 'GET',
    pattern: exact('/marketing/automations'),
    build: staticBuilder(erpMarocUpstreamRoutes.marketing.automations),
    queryKeys: noQuery,
    responseSchema: marketingAutomationListSchema,
    kind: 'json',
    idempotency: 'forbidden',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.marketingAutomationsCollection,
    method: 'POST',
    pattern: exact('/marketing/automations'),
    build: staticBuilder(erpMarocUpstreamRoutes.marketing.automations),
    queryKeys: noQuery,
    responseSchema: marketingAutomationSchema,
    kind: 'json',
    idempotency: 'required',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.marketingAutomationActivate,
    method: 'POST',
    pattern: action('marketing/automations', 'activate'),
    build: idBuilder(erpMarocUpstreamRoutes.marketing.automationActivate),
    queryKeys: noQuery,
    responseSchema: marketingAutomationSchema,
    kind: 'json',
    idempotency: 'required',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.marketingAutomationPause,
    method: 'POST',
    pattern: action('marketing/automations', 'pause'),
    build: idBuilder(erpMarocUpstreamRoutes.marketing.automationPause),
    queryKeys: noQuery,
    responseSchema: marketingAutomationSchema,
    kind: 'json',
    idempotency: 'required',
  }),
];

export const ERP_MAROC_ROUTE_POLICY: readonly ErpMarocRoute[] =
  Object.freeze(routes);

const rejectRoute = (): never => {
  throw new Error('ERP route is not allowed');
};

const assertSafePath = (path: string): void => {
  if (
    typeof path !== 'string' ||
    !path.startsWith('/') ||
    path.startsWith('//') ||
    path.includes('?') ||
    path.includes('#') ||
    path.includes('%') ||
    path.includes('\\') ||
    /[\u0000-\u0020\u007f]/.test(path) ||
    /(^|\/)\.{1,2}(\/|$)/.test(path)
  ) {
    rejectRoute();
  }
};

const readQueryEntries = (query: ErpMarocQuery): [string, string][] => {
  if (query instanceof URLSearchParams) {
    const entries = [...query.entries()];
    if (new Set(entries.map(([key]) => key)).size !== entries.length) {
      rejectRoute();
    }
    return entries;
  }
  if (query === null || typeof query !== 'object' || Array.isArray(query)) {
    rejectRoute();
  }

  return Object.entries(query).map(([key, value]) => {
    if (typeof value !== 'string') return rejectRoute();
    return [key, value];
  });
};

const civilDate = /^\d{4}-\d{2}-\d{2}$/;
const paymentStatuses = new Set([
  'PENDING_ALLOCATION',
  'POSTED',
  'REVERSED',
  'CANCELLED',
]);
const paymentKinds = new Set(['RECEIPT', 'REVERSAL']);
const paymentMethods = new Set([
  'CASH',
  'BANK_TRANSFER',
  'CHECK',
  'CARD',
  'DIRECT_DEBIT',
  'OTHER',
]);
const creditNoteStatuses = new Set(['DRAFT', 'VALIDATED', 'CANCELLED']);
const reminderStatuses = new Set([
  'PROPOSED',
  'APPROVED',
  'PROCESSING',
  'SENT',
  'CANCELLED',
  'SUPERSEDED',
  'FAILED',
  'RECONCILIATION_REQUIRED',
]);
const reminderLevels = new Set(['LEVEL_1', 'LEVEL_2', 'LEVEL_3']);
const accountingEntryStatuses = new Set(['DRAFT', 'VALIDATED', 'REJECTED']);
const accountingSourceTypes = new Set(['INVOICE', 'PAYMENT', 'CREDIT_NOTE']);

const isValidCivilDate = (value: string): boolean => {
  if (!civilDate.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  return (
    new Date(Date.UTC(year, month - 1, day)).toISOString().slice(0, 10) ===
    value
  );
};

const assertNormalizedQueryValue = (
  routeId: ErpMarocRouteId,
  key: string,
  value: string,
): void => {
  if (value.length === 0 || value.trim() !== value) rejectRoute();
  if (key === 'cursor' || key === 'tierId' || key === 'invoiceId') {
    if (!uuidSchema.safeParse(value).success) rejectRoute();
    return;
  }
  if (key === 'limit') {
    if (!/^(?:[1-9]|[1-9]\d|100)$/.test(value)) rejectRoute();
    return;
  }
  if (key === 'from' || key === 'to') {
    if (!isValidCivilDate(value)) rejectRoute();
    return;
  }
  if (
    routeId === erpMarocRouteIds.accountingGrandLivre ||
    routeId === erpMarocRouteIds.accountingBalance ||
    routeId === erpMarocRouteIds.accountingLettrageSuggestions
  ) {
    if (key === 'includeDraft' && value === 'true') return;
    if (
      routeId === erpMarocRouteIds.accountingGrandLivre &&
      key === 'accountCode' &&
      /^[A-Za-z0-9][A-Za-z0-9.-]{0,31}$/.test(value)
    ) {
      return;
    }
    if (
      routeId === erpMarocRouteIds.accountingLettrageSuggestions &&
      key === 'accountCode' &&
      /^[A-Za-z0-9][A-Za-z0-9.-]{0,31}$/.test(value)
    ) {
      return;
    }
  }
  if (routeId === erpMarocRouteIds.paymentsCollection) {
    if (key === 'status' && paymentStatuses.has(value)) return;
    if (key === 'kind' && paymentKinds.has(value)) return;
    if (key === 'method' && paymentMethods.has(value)) return;
  }
  if (routeId === erpMarocRouteIds.creditNotesCollection) {
    if (key === 'status' && creditNoteStatuses.has(value)) return;
  }
  if (routeId === erpMarocRouteIds.remindersCollection) {
    if (key === 'status' && reminderStatuses.has(value)) return;
    if (key === 'level' && reminderLevels.has(value)) return;
  }
  if (routeId === erpMarocRouteIds.accountingEntriesCollection) {
    if (key === 'status' && accountingEntryStatuses.has(value)) return;
    if (key === 'sourceType' && accountingSourceTypes.has(value)) return;
  }
  rejectRoute();
};

const buildQueryString = (
  route: ErpMarocRoute,
  query: ErpMarocQuery,
): string => {
  const entries = readQueryEntries(query);
  const values = new Map<string, string>();

  for (const [key, value] of entries) {
    if (!route.queryKeys.includes(key) || values.has(key)) rejectRoute();
    assertNormalizedQueryValue(route.routeId, key, value);
    values.set(key, value);
  }
  if (
    (route.routeId === erpMarocRouteIds.accountingGrandLivre ||
      route.routeId === erpMarocRouteIds.accountingLettrageSuggestions) &&
    !values.has('accountCode')
  ) {
    rejectRoute();
  }
  if (
    values.has('from') &&
    values.has('to') &&
    values.get('from')! > values.get('to')!
  ) {
    rejectRoute();
  }

  const params = new URLSearchParams();
  for (const key of route.queryKeys) {
    const value = values.get(key);
    if (value !== undefined) params.append(key, value);
  }
  const serialized = params.toString();
  return serialized.length === 0 ? '' : `?${serialized}`;
};

export const resolveErpRoute = (
  method: string,
  path: string,
  query: ErpMarocQuery,
): ResolvedErpMarocRoute => {
  assertSafePath(path);
  const route = ERP_MAROC_ROUTE_POLICY.find((candidate) => {
    if (candidate.method !== method) return false;
    return candidate.pattern.test(path);
  });
  const matchedRoute = route ?? rejectRoute();

  const match = path.match(matchedRoute.pattern) ?? rejectRoute();
  let builtPath: string;
  try {
    builtPath = matchedRoute.build(match);
  } catch {
    return rejectRoute();
  }
  const upstreamPath = `${builtPath}${buildQueryString(matchedRoute, query)}`;

  return Object.freeze({
    routeId: matchedRoute.routeId,
    method: matchedRoute.method,
    upstreamPath,
    responseSchema: matchedRoute.responseSchema,
    kind: matchedRoute.kind,
    idempotency: matchedRoute.idempotency,
  });
};
