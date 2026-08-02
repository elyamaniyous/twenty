import {
  erpAccountingEntryPageSchema,
  erpAccountingEntrySchema,
  erpBalanceReportSchema,
  erpBankAccountListSchema,
  erpBankAccountSchema,
  erpBankReconciliationCandidatesSchema,
  erpBankStatementDetailSchema,
  erpBankStatementLineSchema,
  erpBankStatementListSchema,
  erpBankStatementSchema,
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
  hrAccessAdministrationSchema,
  hrAccessContextSchema,
  hrAccessGrantSchema,
  hrEmployeeSelfServiceAccessSchema,
  hrEmployeeSelfServiceSchema,
  hrEmployeeSelfServicePayslipDocumentSchema,
  hrContractAmendmentSchema,
  hrCalendarDaySchema,
  hrCostCenterListSchema,
  hrCostCenterSchema,
  hrCoreSummarySchema,
  hrDepartmentListSchema,
  hrDepartmentSchema,
  hrEmployeeBankAccountSchema,
  hrEmployeeDependantSchema,
  hrEmployeeDetailSchema,
  hrEmployeeCrmLinkResultSchema,
  hrEmployeeEmergencyContactSchema,
  hrEmployeeImportCommitResultSchema,
  hrEmployeeImportPreviewSchema,
  hrEmployeeImportTemplateSchema,
  hrEmployeeListSchema,
  hrOrganisationChartSchema,
  hrEmployeePrivateProfileSchema,
  hrEmployeeAssignmentSchema,
  hrEmployeeDocumentSchema,
  hrDocumentContentSchema,
  hrDeadlineCenterSchema,
  hrEmploymentContractSchema,
  hrEstablishmentListSchema,
  hrEstablishmentSchema,
  hrGradeListSchema,
  hrGradeSchema,
  hrJobPositionListSchema,
  hrJobPositionSchema,
  hrLifecycleJourneyListSchema,
  hrLifecycleJourneySchema,
  hrLifecycleTaskSchema,
  hrLeaveAccrualRunResultSchema,
  hrLeaveBalanceSchema,
  hrLeaveBalanceListSchema,
  hrLeavePolicyListSchema,
  hrLeavePolicySchema,
  hrLeavePolicySeedResultSchema,
  hrLeaveRequestListSchema,
  hrLeaveRequestSchema,
  hrMonthlyPeriodDetailSchema,
  hrMonthlyPeriodListSchema,
  hrMoroccoHolidaySeedResultSchema,
  hrTeamListSchema,
  hrTeamSchema,
  hrWorkLocationListSchema,
  hrWorkLocationSchema,
  hrWorkCalendarListSchema,
  hrWorkCalendarSchema,
  hrAttendanceMonthSchema,
  hrBreastfeedingArrangementListSchema,
  hrBreastfeedingArrangementSchema,
  hrCompensatoryRestBalanceResponseSchema,
  hrCompensatoryRestExpirationResultSchema,
  hrOvertimeApprovalListSchema,
  hrOvertimeApprovalSchema,
  hrOvertimePolicySchema,
  hrOvertimePolicyResponseSchema,
  hrTimeEntryCorrectionRequestListSchema,
  hrTimeEntryCorrectionRequestSchema,
  hrTimeEntrySchema,
  hrShiftRotationAssignmentSchema,
  hrShiftRotationListSchema,
  hrShiftRotationSchema,
  hrWorkScheduleAssignmentSchema,
  hrWorkScheduleListSchema,
  hrWorkScheduleSchema,
  hrWorkPatternChangeRequestListSchema,
  hrWorkPatternChangeRequestSchema,
  marketingAutomationListSchema,
  marketingAutomationSchema,
  marketingCampaignListSchema,
  marketingCampaignSchema,
  marketingContactListSchema,
  marketingContactSchema,
  marketingEventListSchema,
  marketingEventSchema,
  marketingOverviewSchema,
  marketingScoringRuleListSchema,
  marketingScoringRuleSchema,
  marketingSegmentListSchema,
  marketingSegmentSchema,
  marketingSegmentSyncResultSchema,
  marketingTierImportResultSchema,
  payrollComponentListSchema,
  payrollControlDefinitionListSchema,
  payrollLegalSourceListSchema,
  payrollDeclarationEvidenceSchema,
  payrollDeclarationExportSchema,
  payrollDeclarationListSchema,
  payrollDeclarationSchema,
  payrollDeadlineListSchema,
  payrollClosingDossierSchema,
  payrollClosingPreviewSchema,
  erpPayrollPaymentBatchNullableSchema,
  erpPayrollPaymentBatchSchema,
  erpPayrollPaymentReconciliationSchema,
  erpPayrollPaymentFailureSchema,
  erpPayrollPaymentExportSchema,
  erpPayrollPeriodPreviewSchema,
  payrollRegulatorySeedResultSchema,
  payrollRegulatorySummarySchema,
  payrollRuleListSchema,
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

export type ErpMarocHttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
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
const workCalendarQuery = Object.freeze(['year']);
const attendanceQuery = Object.freeze(['month', 'employeeId']);
const breastfeedingArrangementQuery = Object.freeze(['employeeId']);
const overtimeApprovalQuery = Object.freeze(['month', 'status', 'employeeId']);
const compensatoryRestBalanceQuery = Object.freeze(['employeeId']);
const timeEntryCorrectionQuery = Object.freeze([
  'month',
  'status',
  'employeeId',
]);
const workPatternChangeQuery = Object.freeze(['status']);
const leaveRequestQuery = Object.freeze(['year', 'status']);
const leaveBalanceQuery = Object.freeze(['year']);
const monthlyClosingQuery = Object.freeze(['year']);
const payrollDeclarationExportQuery = Object.freeze(['periodKey', 'format']);
const payrollDeadlineQuery = Object.freeze(['year']);
const payrollPeriodSource = '(\\d{4}-(?:0[1-9]|1[0-2]))';
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
    routeId: erpMarocRouteIds.supplierPaymentPreparationExecute,
    method: 'POST',
    pattern: action('supplier-payment-preparations', 'execute'),
    build: idBuilder(
      erpMarocUpstreamRoutes.supplierPaymentPreparations.execute,
    ),
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
    routeId: erpMarocRouteIds.bankAccountsCollection,
    method: 'GET',
    pattern: exact('/bank-accounts'),
    build: staticBuilder(erpMarocUpstreamRoutes.bankAccounts.collection),
    queryKeys: noQuery,
    responseSchema: erpBankAccountListSchema,
    kind: 'json',
    idempotency: 'forbidden',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.bankAccountsCollection,
    method: 'POST',
    pattern: exact('/bank-accounts'),
    build: staticBuilder(erpMarocUpstreamRoutes.bankAccounts.collection),
    queryKeys: noQuery,
    responseSchema: erpBankAccountSchema,
    kind: 'json',
    idempotency: 'required',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.bankAccountDetail,
    method: 'PATCH',
    pattern: detail('bank-accounts'),
    build: idBuilder(erpMarocUpstreamRoutes.bankAccounts.detail),
    queryKeys: noQuery,
    responseSchema: erpBankAccountSchema,
    kind: 'json',
    idempotency: 'required',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.bankStatementsCollection,
    method: 'GET',
    pattern: exact('/bank-statements'),
    build: staticBuilder(erpMarocUpstreamRoutes.bankStatements.collection),
    queryKeys: noQuery,
    responseSchema: erpBankStatementListSchema,
    kind: 'json',
    idempotency: 'forbidden',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.bankStatementsCollection,
    method: 'POST',
    pattern: exact('/bank-statements'),
    build: staticBuilder(erpMarocUpstreamRoutes.bankStatements.collection),
    queryKeys: noQuery,
    responseSchema: erpBankStatementSchema,
    kind: 'json',
    idempotency: 'required',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.bankStatementDetail,
    method: 'GET',
    pattern: detail('bank-statements'),
    build: idBuilder(erpMarocUpstreamRoutes.bankStatements.detail),
    queryKeys: noQuery,
    responseSchema: erpBankStatementDetailSchema,
    kind: 'json',
    idempotency: 'forbidden',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.bankStatementConfirm,
    method: 'POST',
    pattern: action('bank-statements', 'confirm'),
    build: idBuilder(erpMarocUpstreamRoutes.bankStatements.confirm),
    queryKeys: noQuery,
    responseSchema: erpBankStatementDetailSchema,
    kind: 'json',
    idempotency: 'required',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.bankStatementAssignBankAccount,
    method: 'PATCH',
    pattern: action('bank-statements', 'bank-account'),
    build: idBuilder(erpMarocUpstreamRoutes.bankStatements.assignBankAccount),
    queryKeys: noQuery,
    responseSchema: erpBankStatementDetailSchema,
    kind: 'json',
    idempotency: 'required',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.bankStatementClose,
    method: 'POST',
    pattern: action('bank-statements', 'close'),
    build: idBuilder(erpMarocUpstreamRoutes.bankStatements.close),
    queryKeys: noQuery,
    responseSchema: erpBankStatementDetailSchema,
    kind: 'json',
    idempotency: 'required',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.bankStatementLineReconciliationCandidates,
    method: 'GET',
    pattern: action('bank-statement-lines', 'reconciliation-candidates'),
    build: idBuilder(
      erpMarocUpstreamRoutes.bankStatementLines.reconciliationCandidates,
    ),
    queryKeys: noQuery,
    responseSchema: erpBankReconciliationCandidatesSchema,
    kind: 'json',
    idempotency: 'forbidden',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.bankStatementLineReconcileSupplierPayment,
    method: 'POST',
    pattern: action('bank-statement-lines', 'reconcile-supplier-payment'),
    build: idBuilder(
      erpMarocUpstreamRoutes.bankStatementLines.reconcileSupplierPayment,
    ),
    queryKeys: noQuery,
    responseSchema: erpBankStatementLineSchema,
    kind: 'json',
    idempotency: 'required',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.bankStatementLineUnreconcileSupplierPayment,
    method: 'POST',
    pattern: action('bank-statement-lines', 'unreconcile-supplier-payment'),
    build: idBuilder(
      erpMarocUpstreamRoutes.bankStatementLines.unreconcileSupplierPayment,
    ),
    queryKeys: noQuery,
    responseSchema: erpBankStatementLineSchema,
    kind: 'json',
    idempotency: 'required',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.bankStatementLineReconcileCustomerPayment,
    method: 'POST',
    pattern: action('bank-statement-lines', 'reconcile-customer-payment'),
    build: idBuilder(
      erpMarocUpstreamRoutes.bankStatementLines.reconcileCustomerPayment,
    ),
    queryKeys: noQuery,
    responseSchema: erpBankStatementLineSchema,
    kind: 'json',
    idempotency: 'required',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.bankStatementLineUnreconcileCustomerPayment,
    method: 'POST',
    pattern: action('bank-statement-lines', 'unreconcile-customer-payment'),
    build: idBuilder(
      erpMarocUpstreamRoutes.bankStatementLines.unreconcileCustomerPayment,
    ),
    queryKeys: noQuery,
    responseSchema: erpBankStatementLineSchema,
    kind: 'json',
    idempotency: 'required',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.bankStatementLineReview,
    method: 'POST',
    pattern: action('bank-statement-lines', 'review'),
    build: idBuilder(erpMarocUpstreamRoutes.bankStatementLines.review),
    queryKeys: noQuery,
    responseSchema: erpBankStatementLineSchema,
    kind: 'json',
    idempotency: 'required',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.bankStatementLineUnreview,
    method: 'POST',
    pattern: action('bank-statement-lines', 'unreview'),
    build: idBuilder(erpMarocUpstreamRoutes.bankStatementLines.unreview),
    queryKeys: noQuery,
    responseSchema: erpBankStatementLineSchema,
    kind: 'json',
    idempotency: 'required',
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
  defineRoute({
    routeId: erpMarocRouteIds.marketingScoringRulesCollection,
    method: 'GET',
    pattern: exact('/marketing/scoring-rules'),
    build: staticBuilder(erpMarocUpstreamRoutes.marketing.scoringRules),
    queryKeys: noQuery,
    responseSchema: marketingScoringRuleListSchema,
    kind: 'json',
    idempotency: 'forbidden',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.marketingScoringRulesCollection,
    method: 'POST',
    pattern: exact('/marketing/scoring-rules'),
    build: staticBuilder(erpMarocUpstreamRoutes.marketing.scoringRules),
    queryKeys: noQuery,
    responseSchema: marketingScoringRuleSchema,
    kind: 'json',
    idempotency: 'required',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.marketingScoringRuleToggle,
    method: 'POST',
    pattern: action('marketing/scoring-rules', 'toggle'),
    build: idBuilder(erpMarocUpstreamRoutes.marketing.scoringRuleToggle),
    queryKeys: noQuery,
    responseSchema: marketingScoringRuleSchema,
    kind: 'json',
    idempotency: 'required',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.marketingEventsCollection,
    method: 'GET',
    pattern: exact('/marketing/events'),
    build: staticBuilder(erpMarocUpstreamRoutes.marketing.events),
    queryKeys: noQuery,
    responseSchema: marketingEventListSchema,
    kind: 'json',
    idempotency: 'forbidden',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.marketingEventsCollection,
    method: 'POST',
    pattern: exact('/marketing/events'),
    build: staticBuilder(erpMarocUpstreamRoutes.marketing.events),
    queryKeys: noQuery,
    responseSchema: marketingEventSchema,
    kind: 'json',
    idempotency: 'required',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.payrollPeriodPreview,
    method: 'GET',
    pattern: action('payroll/periods', 'preview'),
    build: idBuilder(erpMarocUpstreamRoutes.payroll.previewPeriod),
    queryKeys: noQuery,
    responseSchema: erpPayrollPeriodPreviewSchema,
    kind: 'json',
    idempotency: 'forbidden',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.payrollPeriodPreview,
    method: 'POST',
    pattern: action('payroll/periods', 'preview'),
    build: idBuilder(erpMarocUpstreamRoutes.payroll.previewPeriod),
    queryKeys: noQuery,
    responseSchema: erpPayrollPeriodPreviewSchema,
    kind: 'json',
    idempotency: 'required',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.payrollPeriodValidate,
    method: 'POST',
    pattern: action('payroll/periods', 'validate'),
    build: idBuilder(erpMarocUpstreamRoutes.payroll.validatePeriod),
    queryKeys: noQuery,
    responseSchema: erpPayrollPeriodPreviewSchema,
    kind: 'json',
    idempotency: 'required',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.payrollPaymentBatch,
    method: 'GET',
    pattern: new RegExp(`^/payroll/periods/${uuidSource}/payment-batch$`),
    build: idBuilder(erpMarocUpstreamRoutes.payroll.paymentBatch),
    queryKeys: noQuery,
    responseSchema: erpPayrollPaymentBatchNullableSchema,
    kind: 'json',
    idempotency: 'forbidden',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.payrollPaymentBatchPrepare,
    method: 'POST',
    pattern: new RegExp(
      `^/payroll/periods/${uuidSource}/payment-batch/prepare$`,
    ),
    build: idBuilder(erpMarocUpstreamRoutes.payroll.preparePaymentBatch),
    queryKeys: noQuery,
    responseSchema: erpPayrollPaymentBatchSchema,
    kind: 'json',
    idempotency: 'required',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.payrollPaymentBatchExport,
    method: 'GET',
    pattern: new RegExp(
      `^/payroll/periods/${uuidSource}/payment-batch/export$`,
    ),
    build: idBuilder(erpMarocUpstreamRoutes.payroll.exportPaymentBatch),
    queryKeys: noQuery,
    responseSchema: erpPayrollPaymentExportSchema,
    kind: 'json',
    idempotency: 'forbidden',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.payrollPaymentBatchConfirm,
    method: 'POST',
    pattern: new RegExp(
      `^/payroll/periods/${uuidSource}/payment-batch/confirm$`,
    ),
    build: idBuilder(erpMarocUpstreamRoutes.payroll.confirmPaymentBatch),
    queryKeys: noQuery,
    responseSchema: erpPayrollPaymentBatchSchema,
    kind: 'json',
    idempotency: 'required',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.payrollPaymentReconciliation,
    method: 'GET',
    pattern: new RegExp(
      `^/payroll/periods/${uuidSource}/payment-batch/reconciliation$`,
    ),
    build: idBuilder(erpMarocUpstreamRoutes.payroll.paymentReconciliation),
    queryKeys: noQuery,
    responseSchema: erpPayrollPaymentReconciliationSchema,
    kind: 'json',
    idempotency: 'forbidden',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.payrollPaymentReconcile,
    method: 'POST',
    pattern: new RegExp(
      `^/payroll/periods/${uuidSource}/payment-batch/reconciliation$`,
    ),
    build: idBuilder(erpMarocUpstreamRoutes.payroll.reconcilePaymentBatch),
    queryKeys: noQuery,
    responseSchema: erpPayrollPaymentReconciliationSchema,
    kind: 'json',
    idempotency: 'required',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.payrollPaymentFailure,
    method: 'GET',
    pattern: new RegExp(
      `^/payroll/periods/${uuidSource}/payment-batch/failure$`,
    ),
    build: idBuilder(erpMarocUpstreamRoutes.payroll.paymentFailure),
    queryKeys: noQuery,
    responseSchema: erpPayrollPaymentFailureSchema,
    kind: 'json',
    idempotency: 'forbidden',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.payrollPaymentFailureReport,
    method: 'POST',
    pattern: new RegExp(
      `^/payroll/periods/${uuidSource}/payment-batch/failure$`,
    ),
    build: idBuilder(erpMarocUpstreamRoutes.payroll.reportPaymentFailure),
    queryKeys: noQuery,
    responseSchema: erpPayrollPaymentFailureSchema,
    kind: 'json',
    idempotency: 'required',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.payrollCnssBds,
    method: 'GET',
    pattern: exact('/payroll/cnss/bds'),
    build: staticBuilder(erpMarocUpstreamRoutes.payroll.cnssBds),
    queryKeys: payrollDeclarationExportQuery,
    responseSchema: payrollDeclarationExportSchema,
    kind: 'json',
    idempotency: 'forbidden',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.payrollIrExport,
    method: 'GET',
    pattern: exact('/payroll/ir/export'),
    build: staticBuilder(erpMarocUpstreamRoutes.payroll.irExport),
    queryKeys: payrollDeclarationExportQuery,
    responseSchema: payrollDeclarationExportSchema,
    kind: 'json',
    idempotency: 'forbidden',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.payrollDeclarations,
    method: 'GET',
    pattern: exact('/payroll/declarations'),
    build: staticBuilder(erpMarocUpstreamRoutes.payroll.declarations),
    queryKeys: noQuery,
    responseSchema: payrollDeclarationListSchema,
    kind: 'json',
    idempotency: 'forbidden',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.payrollDeclarationSubmit,
    method: 'POST',
    pattern: new RegExp(`^/payroll/declarations/${uuidSource}/submit$`),
    build: idBuilder(erpMarocUpstreamRoutes.payroll.submitDeclaration),
    queryKeys: noQuery,
    responseSchema: payrollDeclarationSchema,
    kind: 'json',
    idempotency: 'required',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.payrollDeclarationReceipt,
    method: 'POST',
    pattern: new RegExp(`^/payroll/declarations/${uuidSource}/receipts$`),
    build: idBuilder(erpMarocUpstreamRoutes.payroll.recordDeclarationReceipt),
    queryKeys: noQuery,
    responseSchema: payrollDeclarationSchema,
    kind: 'json',
    idempotency: 'required',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.payrollDeclarationEvidence,
    method: 'GET',
    pattern: new RegExp(`^/payroll/declaration-events/${uuidSource}/evidence$`),
    build: idBuilder(erpMarocUpstreamRoutes.payroll.declarationEvidence),
    queryKeys: noQuery,
    responseSchema: payrollDeclarationEvidenceSchema,
    kind: 'json',
    idempotency: 'forbidden',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.payrollDeadlines,
    method: 'GET',
    pattern: exact('/payroll/deadlines'),
    build: staticBuilder(erpMarocUpstreamRoutes.payroll.deadlines),
    queryKeys: payrollDeadlineQuery,
    responseSchema: payrollDeadlineListSchema,
    kind: 'json',
    idempotency: 'forbidden',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.payrollClosingPreview,
    method: 'GET',
    pattern: new RegExp(
      `^/payroll/closing-dossiers/${payrollPeriodSource}/preview$`,
    ),
    build: (match) => erpMarocUpstreamRoutes.payroll.closingPreview(match[1]),
    queryKeys: noQuery,
    responseSchema: payrollClosingPreviewSchema,
    kind: 'json',
    idempotency: 'forbidden',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.payrollClosingClose,
    method: 'POST',
    pattern: new RegExp(
      `^/payroll/closing-dossiers/${payrollPeriodSource}/close$`,
    ),
    build: (match) => erpMarocUpstreamRoutes.payroll.closePeriod(match[1]),
    queryKeys: noQuery,
    responseSchema: payrollClosingDossierSchema,
    kind: 'json',
    idempotency: 'required',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.payrollClosingReopen,
    method: 'POST',
    pattern: new RegExp(`^/payroll/closing-dossiers/${uuidSource}/reopen$`),
    build: idBuilder(erpMarocUpstreamRoutes.payroll.reopenPeriod),
    queryKeys: noQuery,
    responseSchema: payrollClosingDossierSchema,
    kind: 'json',
    idempotency: 'required',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.payrollRegulatorySummary,
    method: 'GET',
    pattern: exact('/payroll/regulatory/summary'),
    build: staticBuilder(erpMarocUpstreamRoutes.payroll.regulatorySummary),
    queryKeys: noQuery,
    responseSchema: payrollRegulatorySummarySchema,
    kind: 'json',
    idempotency: 'forbidden',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.payrollRegulatoryRules,
    method: 'GET',
    pattern: exact('/payroll/regulatory/rules'),
    build: staticBuilder(erpMarocUpstreamRoutes.payroll.regulatoryRules),
    queryKeys: noQuery,
    responseSchema: payrollRuleListSchema,
    kind: 'json',
    idempotency: 'forbidden',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.payrollRegulatoryComponents,
    method: 'GET',
    pattern: exact('/payroll/regulatory/components'),
    build: staticBuilder(erpMarocUpstreamRoutes.payroll.regulatoryComponents),
    queryKeys: noQuery,
    responseSchema: payrollComponentListSchema,
    kind: 'json',
    idempotency: 'forbidden',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.payrollRegulatoryControls,
    method: 'GET',
    pattern: exact('/payroll/regulatory/controls'),
    build: staticBuilder(erpMarocUpstreamRoutes.payroll.regulatoryControls),
    queryKeys: noQuery,
    responseSchema: payrollControlDefinitionListSchema,
    kind: 'json',
    idempotency: 'forbidden',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.payrollRegulatorySources,
    method: 'GET',
    pattern: exact('/payroll/regulatory/sources'),
    build: staticBuilder(erpMarocUpstreamRoutes.payroll.regulatorySources),
    queryKeys: noQuery,
    responseSchema: payrollLegalSourceListSchema,
    kind: 'json',
    idempotency: 'forbidden',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.payrollRegulatorySeed,
    method: 'POST',
    pattern: exact('/payroll/regulatory/seed/morocco-2026'),
    build: staticBuilder(erpMarocUpstreamRoutes.payroll.regulatorySeed),
    queryKeys: noQuery,
    responseSchema: payrollRegulatorySeedResultSchema,
    kind: 'json',
    idempotency: 'required',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.hrCoreSummary,
    method: 'GET',
    pattern: exact('/hr-core/summary'),
    build: staticBuilder(erpMarocUpstreamRoutes.hrCore.summary),
    queryKeys: noQuery,
    responseSchema: hrCoreSummarySchema,
    kind: 'json',
    idempotency: 'forbidden',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.hrAccessMe,
    method: 'GET',
    pattern: exact('/hr-core/access/me'),
    build: staticBuilder(erpMarocUpstreamRoutes.hrCore.accessMe),
    queryKeys: noQuery,
    responseSchema: hrAccessContextSchema,
    kind: 'json',
    idempotency: 'forbidden',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.hrAccessAdministration,
    method: 'GET',
    pattern: exact('/hr-core/access/administration'),
    build: staticBuilder(erpMarocUpstreamRoutes.hrCore.accessAdministration),
    queryKeys: noQuery,
    responseSchema: hrAccessAdministrationSchema,
    kind: 'json',
    idempotency: 'forbidden',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.hrAccessGrants,
    method: 'POST',
    pattern: exact('/hr-core/access/grants'),
    build: staticBuilder(erpMarocUpstreamRoutes.hrCore.accessGrants),
    queryKeys: noQuery,
    responseSchema: hrAccessGrantSchema,
    kind: 'json',
    idempotency: 'required',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.hrEmployeeSelfServiceLinks,
    method: 'POST',
    pattern: exact('/hr-core/access/self-service-links'),
    build: staticBuilder(erpMarocUpstreamRoutes.hrCore.selfServiceLinks),
    queryKeys: noQuery,
    responseSchema: hrEmployeeSelfServiceAccessSchema,
    kind: 'json',
    idempotency: 'required',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.hrEmployeeSelfServiceMe,
    method: 'GET',
    pattern: exact('/hr-self-service/me'),
    build: staticBuilder(erpMarocUpstreamRoutes.hrSelfService.me),
    queryKeys: noQuery,
    responseSchema: hrEmployeeSelfServiceSchema,
    kind: 'json',
    idempotency: 'forbidden',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.hrEmployeeSelfServiceDocument,
    method: 'GET',
    pattern: action('hr-self-service/documents', 'content'),
    build: idBuilder(erpMarocUpstreamRoutes.hrSelfService.documentContent),
    queryKeys: noQuery,
    responseSchema: hrDocumentContentSchema,
    kind: 'json',
    idempotency: 'forbidden',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.hrEmployeeSelfServicePayslip,
    method: 'GET',
    pattern: action('hr-self-service/payslips', 'pdf'),
    build: idBuilder(erpMarocUpstreamRoutes.hrSelfService.payslipPdf),
    queryKeys: noQuery,
    responseSchema: hrEmployeeSelfServicePayslipDocumentSchema,
    kind: 'json',
    idempotency: 'forbidden',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.hrEstablishments,
    method: 'GET',
    pattern: exact('/hr-core/establishments'),
    build: staticBuilder(erpMarocUpstreamRoutes.hrCore.establishments),
    queryKeys: noQuery,
    responseSchema: hrEstablishmentListSchema,
    kind: 'json',
    idempotency: 'forbidden',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.hrEstablishments,
    method: 'POST',
    pattern: exact('/hr-core/establishments'),
    build: staticBuilder(erpMarocUpstreamRoutes.hrCore.establishments),
    queryKeys: noQuery,
    responseSchema: hrEstablishmentSchema,
    kind: 'json',
    idempotency: 'required',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.hrEstablishmentDetail,
    method: 'PATCH',
    pattern: detail('hr-core/establishments'),
    build: idBuilder(erpMarocUpstreamRoutes.hrCore.establishment),
    queryKeys: noQuery,
    responseSchema: hrEstablishmentSchema,
    kind: 'json',
    idempotency: 'required',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.hrGrades,
    method: 'GET',
    pattern: exact('/hr-core/grades'),
    build: staticBuilder(erpMarocUpstreamRoutes.hrCore.grades),
    queryKeys: noQuery,
    responseSchema: hrGradeListSchema,
    kind: 'json',
    idempotency: 'forbidden',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.hrGrades,
    method: 'POST',
    pattern: exact('/hr-core/grades'),
    build: staticBuilder(erpMarocUpstreamRoutes.hrCore.grades),
    queryKeys: noQuery,
    responseSchema: hrGradeSchema,
    kind: 'json',
    idempotency: 'required',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.hrGradeDetail,
    method: 'PATCH',
    pattern: detail('hr-core/grades'),
    build: idBuilder(erpMarocUpstreamRoutes.hrCore.grade),
    queryKeys: noQuery,
    responseSchema: hrGradeSchema,
    kind: 'json',
    idempotency: 'required',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.hrCostCenters,
    method: 'GET',
    pattern: exact('/hr-core/cost-centers'),
    build: staticBuilder(erpMarocUpstreamRoutes.hrCore.costCenters),
    queryKeys: noQuery,
    responseSchema: hrCostCenterListSchema,
    kind: 'json',
    idempotency: 'forbidden',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.hrCostCenters,
    method: 'POST',
    pattern: exact('/hr-core/cost-centers'),
    build: staticBuilder(erpMarocUpstreamRoutes.hrCore.costCenters),
    queryKeys: noQuery,
    responseSchema: hrCostCenterSchema,
    kind: 'json',
    idempotency: 'required',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.hrCostCenterDetail,
    method: 'PATCH',
    pattern: detail('hr-core/cost-centers'),
    build: idBuilder(erpMarocUpstreamRoutes.hrCore.costCenter),
    queryKeys: noQuery,
    responseSchema: hrCostCenterSchema,
    kind: 'json',
    idempotency: 'required',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.hrTeams,
    method: 'GET',
    pattern: exact('/hr-core/teams'),
    build: staticBuilder(erpMarocUpstreamRoutes.hrCore.teams),
    queryKeys: noQuery,
    responseSchema: hrTeamListSchema,
    kind: 'json',
    idempotency: 'forbidden',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.hrTeams,
    method: 'POST',
    pattern: exact('/hr-core/teams'),
    build: staticBuilder(erpMarocUpstreamRoutes.hrCore.teams),
    queryKeys: noQuery,
    responseSchema: hrTeamSchema,
    kind: 'json',
    idempotency: 'required',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.hrTeamDetail,
    method: 'PATCH',
    pattern: detail('hr-core/teams'),
    build: idBuilder(erpMarocUpstreamRoutes.hrCore.team),
    queryKeys: noQuery,
    responseSchema: hrTeamSchema,
    kind: 'json',
    idempotency: 'required',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.hrWorkLocations,
    method: 'GET',
    pattern: exact('/hr-core/work-locations'),
    build: staticBuilder(erpMarocUpstreamRoutes.hrCore.workLocations),
    queryKeys: noQuery,
    responseSchema: hrWorkLocationListSchema,
    kind: 'json',
    idempotency: 'forbidden',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.hrWorkLocations,
    method: 'POST',
    pattern: exact('/hr-core/work-locations'),
    build: staticBuilder(erpMarocUpstreamRoutes.hrCore.workLocations),
    queryKeys: noQuery,
    responseSchema: hrWorkLocationSchema,
    kind: 'json',
    idempotency: 'required',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.hrWorkLocationDetail,
    method: 'PATCH',
    pattern: detail('hr-core/work-locations'),
    build: idBuilder(erpMarocUpstreamRoutes.hrCore.workLocation),
    queryKeys: noQuery,
    responseSchema: hrWorkLocationSchema,
    kind: 'json',
    idempotency: 'required',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.hrDepartments,
    method: 'GET',
    pattern: exact('/hr-core/departments'),
    build: staticBuilder(erpMarocUpstreamRoutes.hrCore.departments),
    queryKeys: noQuery,
    responseSchema: hrDepartmentListSchema,
    kind: 'json',
    idempotency: 'forbidden',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.hrDepartments,
    method: 'POST',
    pattern: exact('/hr-core/departments'),
    build: staticBuilder(erpMarocUpstreamRoutes.hrCore.departments),
    queryKeys: noQuery,
    responseSchema: hrDepartmentSchema,
    kind: 'json',
    idempotency: 'required',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.hrDepartmentDetail,
    method: 'PATCH',
    pattern: detail('hr-core/departments'),
    build: idBuilder(erpMarocUpstreamRoutes.hrCore.department),
    queryKeys: noQuery,
    responseSchema: hrDepartmentSchema,
    kind: 'json',
    idempotency: 'required',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.hrJobPositions,
    method: 'GET',
    pattern: exact('/hr-core/job-positions'),
    build: staticBuilder(erpMarocUpstreamRoutes.hrCore.jobPositions),
    queryKeys: noQuery,
    responseSchema: hrJobPositionListSchema,
    kind: 'json',
    idempotency: 'forbidden',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.hrJobPositions,
    method: 'POST',
    pattern: exact('/hr-core/job-positions'),
    build: staticBuilder(erpMarocUpstreamRoutes.hrCore.jobPositions),
    queryKeys: noQuery,
    responseSchema: hrJobPositionSchema,
    kind: 'json',
    idempotency: 'required',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.hrJobPositionDetail,
    method: 'PATCH',
    pattern: detail('hr-core/job-positions'),
    build: idBuilder(erpMarocUpstreamRoutes.hrCore.jobPosition),
    queryKeys: noQuery,
    responseSchema: hrJobPositionSchema,
    kind: 'json',
    idempotency: 'required',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.hrEmployeeImportTemplate,
    method: 'GET',
    pattern: exact('/hr-core/employee-import/template'),
    build: staticBuilder(erpMarocUpstreamRoutes.hrCore.employeeImportTemplate),
    queryKeys: noQuery,
    responseSchema: hrEmployeeImportTemplateSchema,
    kind: 'json',
    idempotency: 'forbidden',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.hrEmployeeImportPreview,
    method: 'POST',
    pattern: exact('/hr-core/employee-import/preview'),
    build: staticBuilder(erpMarocUpstreamRoutes.hrCore.employeeImportPreview),
    queryKeys: noQuery,
    responseSchema: hrEmployeeImportPreviewSchema,
    kind: 'json',
    idempotency: 'required',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.hrEmployeeImportCommit,
    method: 'POST',
    pattern: exact('/hr-core/employee-import/commit'),
    build: staticBuilder(erpMarocUpstreamRoutes.hrCore.employeeImportCommit),
    queryKeys: noQuery,
    responseSchema: hrEmployeeImportCommitResultSchema,
    kind: 'json',
    idempotency: 'required',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.hrEmployees,
    method: 'GET',
    pattern: exact('/hr-core/employees'),
    build: staticBuilder(erpMarocUpstreamRoutes.hrCore.employees),
    queryKeys: noQuery,
    responseSchema: hrEmployeeListSchema,
    kind: 'json',
    idempotency: 'forbidden',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.hrEmployeeDetail,
    method: 'GET',
    pattern: detail('hr-core/employees'),
    build: idBuilder(erpMarocUpstreamRoutes.hrCore.employee),
    queryKeys: noQuery,
    responseSchema: hrEmployeeDetailSchema,
    kind: 'json',
    idempotency: 'forbidden',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.hrOrganisationChart,
    method: 'GET',
    pattern: exact('/hr-core/organisation-chart'),
    build: staticBuilder(erpMarocUpstreamRoutes.hrCore.organisationChart),
    queryKeys: noQuery,
    responseSchema: hrOrganisationChartSchema,
    kind: 'json',
    idempotency: 'forbidden',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.hrEmployeeCrmLink,
    method: 'PATCH',
    pattern: action('hr-core/employees', 'crm-link'),
    build: idBuilder(erpMarocUpstreamRoutes.hrCore.employeeCrmLink),
    queryKeys: noQuery,
    responseSchema: hrEmployeeCrmLinkResultSchema,
    kind: 'json',
    idempotency: 'required',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.hrEmployeePersonalDetails,
    method: 'PATCH',
    pattern: action('hr-core/employees', 'personal-details'),
    build: idBuilder(erpMarocUpstreamRoutes.hrCore.employeePersonalDetails),
    queryKeys: noQuery,
    responseSchema: hrEmployeePrivateProfileSchema,
    kind: 'json',
    idempotency: 'required',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.hrEmployeeDependants,
    method: 'POST',
    pattern: action('hr-core/employees', 'dependants'),
    build: idBuilder(erpMarocUpstreamRoutes.hrCore.employeeDependants),
    queryKeys: noQuery,
    responseSchema: hrEmployeeDependantSchema,
    kind: 'json',
    idempotency: 'required',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.hrDependantDetail,
    method: 'PATCH',
    pattern: detail('hr-core/dependants'),
    build: idBuilder(erpMarocUpstreamRoutes.hrCore.dependant),
    queryKeys: noQuery,
    responseSchema: hrEmployeeDependantSchema,
    kind: 'json',
    idempotency: 'required',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.hrEmployeeEmergencyContacts,
    method: 'POST',
    pattern: action('hr-core/employees', 'emergency-contacts'),
    build: idBuilder(erpMarocUpstreamRoutes.hrCore.employeeEmergencyContacts),
    queryKeys: noQuery,
    responseSchema: hrEmployeeEmergencyContactSchema,
    kind: 'json',
    idempotency: 'required',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.hrEmergencyContactDetail,
    method: 'PATCH',
    pattern: detail('hr-core/emergency-contacts'),
    build: idBuilder(erpMarocUpstreamRoutes.hrCore.emergencyContact),
    queryKeys: noQuery,
    responseSchema: hrEmployeeEmergencyContactSchema,
    kind: 'json',
    idempotency: 'required',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.hrEmployeeBankAccount,
    method: 'PATCH',
    pattern: action('hr-core/employees', 'bank-account'),
    build: idBuilder(erpMarocUpstreamRoutes.hrCore.employeeBankAccount),
    queryKeys: noQuery,
    responseSchema: hrEmployeeBankAccountSchema,
    kind: 'json',
    idempotency: 'required',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.hrEmployeeAssignments,
    method: 'POST',
    pattern: action('hr-core/employees', 'assignments'),
    build: idBuilder(erpMarocUpstreamRoutes.hrCore.employeeAssignments),
    queryKeys: noQuery,
    responseSchema: hrEmployeeAssignmentSchema,
    kind: 'json',
    idempotency: 'required',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.hrAssignmentEnd,
    method: 'PATCH',
    pattern: action('hr-core/assignments', 'end'),
    build: idBuilder(erpMarocUpstreamRoutes.hrCore.assignmentEnd),
    queryKeys: noQuery,
    responseSchema: hrEmployeeAssignmentSchema,
    kind: 'json',
    idempotency: 'required',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.hrDeadlines,
    method: 'GET',
    pattern: exact('/hr-core/deadlines'),
    build: staticBuilder(erpMarocUpstreamRoutes.hrCore.deadlines),
    queryKeys: noQuery,
    responseSchema: hrDeadlineCenterSchema,
    kind: 'json',
    idempotency: 'forbidden',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.hrEmployeeDocuments,
    method: 'POST',
    pattern: action('hr-core/employees', 'documents'),
    build: idBuilder(erpMarocUpstreamRoutes.hrCore.employeeDocuments),
    queryKeys: noQuery,
    responseSchema: hrEmployeeDocumentSchema,
    kind: 'json',
    idempotency: 'required',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.hrDocumentDetail,
    method: 'PATCH',
    pattern: detail('hr-core/hr-documents'),
    build: idBuilder(erpMarocUpstreamRoutes.hrCore.document),
    queryKeys: noQuery,
    responseSchema: hrEmployeeDocumentSchema,
    kind: 'json',
    idempotency: 'required',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.hrDocumentVersions,
    method: 'POST',
    pattern: action('hr-core/hr-documents', 'versions'),
    build: idBuilder(erpMarocUpstreamRoutes.hrCore.documentVersions),
    queryKeys: noQuery,
    responseSchema: hrEmployeeDocumentSchema,
    kind: 'json',
    idempotency: 'required',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.hrDocumentVersionContent,
    method: 'GET',
    pattern: action('hr-core/hr-document-versions', 'content'),
    build: idBuilder(erpMarocUpstreamRoutes.hrCore.documentVersionContent),
    queryKeys: noQuery,
    responseSchema: hrDocumentContentSchema,
    kind: 'json',
    idempotency: 'forbidden',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.hrLifecycleJourneys,
    method: 'GET',
    pattern: exact('/hr-core/lifecycle-journeys'),
    build: staticBuilder(erpMarocUpstreamRoutes.hrCore.lifecycleJourneys),
    queryKeys: noQuery,
    responseSchema: hrLifecycleJourneyListSchema,
    kind: 'json',
    idempotency: 'forbidden',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.hrLifecycleJourneys,
    method: 'POST',
    pattern: exact('/hr-core/lifecycle-journeys'),
    build: staticBuilder(erpMarocUpstreamRoutes.hrCore.lifecycleJourneys),
    queryKeys: noQuery,
    responseSchema: hrLifecycleJourneySchema,
    kind: 'json',
    idempotency: 'required',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.hrHiring,
    method: 'POST',
    pattern: exact('/hr-core/hiring'),
    build: staticBuilder(erpMarocUpstreamRoutes.hrCore.hiring),
    queryKeys: noQuery,
    responseSchema: hrLifecycleJourneySchema,
    kind: 'json',
    idempotency: 'required',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.hrLifecycleTaskDetail,
    method: 'PATCH',
    pattern: detail('hr-core/lifecycle-tasks'),
    build: idBuilder(erpMarocUpstreamRoutes.hrCore.lifecycleTask),
    queryKeys: noQuery,
    responseSchema: hrLifecycleTaskSchema,
    kind: 'json',
    idempotency: 'required',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.hrLifecycleJourneyStatus,
    method: 'PATCH',
    pattern: action('hr-core/lifecycle-journeys', 'status'),
    build: idBuilder(erpMarocUpstreamRoutes.hrCore.lifecycleJourneyStatus),
    queryKeys: noQuery,
    responseSchema: hrLifecycleJourneySchema,
    kind: 'json',
    idempotency: 'required',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.hrEmployeeContracts,
    method: 'POST',
    pattern: action('hr-core/employees', 'contracts'),
    build: idBuilder(erpMarocUpstreamRoutes.hrCore.employeeContracts),
    queryKeys: noQuery,
    responseSchema: hrEmploymentContractSchema,
    kind: 'json',
    idempotency: 'required',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.hrContractStatus,
    method: 'PATCH',
    pattern: action('hr-core/contracts', 'status'),
    build: idBuilder(erpMarocUpstreamRoutes.hrCore.contractStatus),
    queryKeys: noQuery,
    responseSchema: hrEmploymentContractSchema,
    kind: 'json',
    idempotency: 'required',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.hrContractAmendments,
    method: 'POST',
    pattern: action('hr-core/contracts', 'amendments'),
    build: idBuilder(erpMarocUpstreamRoutes.hrCore.contractAmendments),
    queryKeys: noQuery,
    responseSchema: hrContractAmendmentSchema,
    kind: 'json',
    idempotency: 'required',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.hrAmendmentStatus,
    method: 'PATCH',
    pattern: action('hr-core/amendments', 'status'),
    build: idBuilder(erpMarocUpstreamRoutes.hrCore.amendmentStatus),
    queryKeys: noQuery,
    responseSchema: hrContractAmendmentSchema,
    kind: 'json',
    idempotency: 'required',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.hrWorkCalendars,
    method: 'GET',
    pattern: exact('/hr-attendance/work-calendars'),
    build: staticBuilder(erpMarocUpstreamRoutes.hrAttendance.workCalendars),
    queryKeys: workCalendarQuery,
    responseSchema: hrWorkCalendarListSchema,
    kind: 'json',
    idempotency: 'forbidden',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.hrWorkCalendars,
    method: 'POST',
    pattern: exact('/hr-attendance/work-calendars'),
    build: staticBuilder(erpMarocUpstreamRoutes.hrAttendance.workCalendars),
    queryKeys: noQuery,
    responseSchema: hrWorkCalendarSchema,
    kind: 'json',
    idempotency: 'required',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.hrWorkCalendarDays,
    method: 'POST',
    pattern: action('hr-attendance/work-calendars', 'days'),
    build: idBuilder(erpMarocUpstreamRoutes.hrAttendance.workCalendarDays),
    queryKeys: noQuery,
    responseSchema: hrCalendarDaySchema,
    kind: 'json',
    idempotency: 'required',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.hrWorkCalendarMoroccoNationalHolidays,
    method: 'POST',
    pattern: action(
      'hr-attendance/work-calendars',
      'morocco-national-holidays',
    ),
    build: idBuilder(
      erpMarocUpstreamRoutes.hrAttendance.workCalendarMoroccoNationalHolidays,
    ),
    queryKeys: noQuery,
    responseSchema: hrMoroccoHolidaySeedResultSchema,
    kind: 'json',
    idempotency: 'required',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.hrWorkSchedules,
    method: 'GET',
    pattern: exact('/hr-attendance/work-schedules'),
    build: staticBuilder(erpMarocUpstreamRoutes.hrAttendance.workSchedules),
    queryKeys: noQuery,
    responseSchema: hrWorkScheduleListSchema,
    kind: 'json',
    idempotency: 'forbidden',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.hrWorkSchedules,
    method: 'POST',
    pattern: exact('/hr-attendance/work-schedules'),
    build: staticBuilder(erpMarocUpstreamRoutes.hrAttendance.workSchedules),
    queryKeys: noQuery,
    responseSchema: hrWorkScheduleSchema,
    kind: 'json',
    idempotency: 'required',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.hrShiftRotations,
    method: 'GET',
    pattern: exact('/hr-attendance/shift-rotations'),
    build: staticBuilder(erpMarocUpstreamRoutes.hrAttendance.shiftRotations),
    queryKeys: noQuery,
    responseSchema: hrShiftRotationListSchema,
    kind: 'json',
    idempotency: 'forbidden',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.hrShiftRotations,
    method: 'POST',
    pattern: exact('/hr-attendance/shift-rotations'),
    build: staticBuilder(erpMarocUpstreamRoutes.hrAttendance.shiftRotations),
    queryKeys: noQuery,
    responseSchema: hrShiftRotationSchema,
    kind: 'json',
    idempotency: 'required',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.hrWorkPatternChangeRequests,
    method: 'GET',
    pattern: exact('/hr-attendance/work-pattern-change-requests'),
    build: staticBuilder(
      erpMarocUpstreamRoutes.hrAttendance.workPatternChangeRequests,
    ),
    queryKeys: workPatternChangeQuery,
    responseSchema: hrWorkPatternChangeRequestListSchema,
    kind: 'json',
    idempotency: 'forbidden',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.hrWorkPatternChangeRequests,
    method: 'POST',
    pattern: exact('/hr-attendance/work-pattern-change-requests'),
    build: staticBuilder(
      erpMarocUpstreamRoutes.hrAttendance.workPatternChangeRequests,
    ),
    queryKeys: noQuery,
    responseSchema: hrWorkPatternChangeRequestSchema,
    kind: 'json',
    idempotency: 'required',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.hrWorkPatternChangeApprove,
    method: 'PATCH',
    pattern: action('hr-attendance/work-pattern-change-requests', 'approve'),
    build: idBuilder(
      erpMarocUpstreamRoutes.hrAttendance.workPatternChangeApprove,
    ),
    queryKeys: noQuery,
    responseSchema: hrWorkPatternChangeRequestSchema,
    kind: 'json',
    idempotency: 'required',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.hrWorkPatternChangeReject,
    method: 'PATCH',
    pattern: action('hr-attendance/work-pattern-change-requests', 'reject'),
    build: idBuilder(
      erpMarocUpstreamRoutes.hrAttendance.workPatternChangeReject,
    ),
    queryKeys: noQuery,
    responseSchema: hrWorkPatternChangeRequestSchema,
    kind: 'json',
    idempotency: 'required',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.hrEmployeeWorkScheduleAssignments,
    method: 'POST',
    pattern: action('hr-attendance/employees', 'work-schedule-assignments'),
    build: idBuilder(
      erpMarocUpstreamRoutes.hrAttendance.employeeWorkScheduleAssignments,
    ),
    queryKeys: noQuery,
    responseSchema: hrWorkScheduleAssignmentSchema,
    kind: 'json',
    idempotency: 'required',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.hrEmployeeShiftRotationAssignments,
    method: 'POST',
    pattern: action('hr-attendance/employees', 'shift-rotation-assignments'),
    build: idBuilder(
      erpMarocUpstreamRoutes.hrAttendance.employeeShiftRotationAssignments,
    ),
    queryKeys: noQuery,
    responseSchema: hrShiftRotationAssignmentSchema,
    kind: 'json',
    idempotency: 'required',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.hrTimeEntries,
    method: 'POST',
    pattern: exact('/hr-attendance/time-entries'),
    build: staticBuilder(erpMarocUpstreamRoutes.hrAttendance.timeEntries),
    queryKeys: noQuery,
    responseSchema: hrTimeEntrySchema,
    kind: 'json',
    idempotency: 'required',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.hrTimeEntryCancel,
    method: 'PATCH',
    pattern: action('hr-attendance/time-entries', 'cancel'),
    build: idBuilder(erpMarocUpstreamRoutes.hrAttendance.timeEntryCancel),
    queryKeys: noQuery,
    responseSchema: hrTimeEntrySchema,
    kind: 'json',
    idempotency: 'required',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.hrTimeEntryCorrectionRequests,
    method: 'GET',
    pattern: exact('/hr-attendance/time-entry-correction-requests'),
    build: staticBuilder(
      erpMarocUpstreamRoutes.hrAttendance.timeEntryCorrectionRequests,
    ),
    queryKeys: timeEntryCorrectionQuery,
    responseSchema: hrTimeEntryCorrectionRequestListSchema,
    kind: 'json',
    idempotency: 'forbidden',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.hrTimeEntryCorrectionRequests,
    method: 'POST',
    pattern: exact('/hr-attendance/time-entry-correction-requests'),
    build: staticBuilder(
      erpMarocUpstreamRoutes.hrAttendance.timeEntryCorrectionRequests,
    ),
    queryKeys: noQuery,
    responseSchema: hrTimeEntryCorrectionRequestSchema,
    kind: 'json',
    idempotency: 'required',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.hrTimeEntryCorrectionEvidence,
    method: 'PATCH',
    pattern: action('hr-attendance/time-entry-correction-requests', 'evidence'),
    build: idBuilder(
      erpMarocUpstreamRoutes.hrAttendance.timeEntryCorrectionEvidence,
    ),
    queryKeys: noQuery,
    responseSchema: hrTimeEntryCorrectionRequestSchema,
    kind: 'json',
    idempotency: 'required',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.hrTimeEntryCorrectionDecision,
    method: 'PATCH',
    pattern: action('hr-attendance/time-entry-correction-requests', 'decision'),
    build: idBuilder(
      erpMarocUpstreamRoutes.hrAttendance.timeEntryCorrectionDecision,
    ),
    queryKeys: noQuery,
    responseSchema: hrTimeEntryCorrectionRequestSchema,
    kind: 'json',
    idempotency: 'required',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.hrAttendanceMonthly,
    method: 'GET',
    pattern: exact('/hr-attendance/monthly'),
    build: staticBuilder(erpMarocUpstreamRoutes.hrAttendance.monthly),
    queryKeys: attendanceQuery,
    responseSchema: hrAttendanceMonthSchema,
    kind: 'json',
    idempotency: 'forbidden',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.hrBreastfeedingArrangements,
    method: 'GET',
    pattern: exact('/hr-attendance/breastfeeding-arrangements'),
    build: staticBuilder(
      erpMarocUpstreamRoutes.hrAttendance.breastfeedingArrangements,
    ),
    queryKeys: breastfeedingArrangementQuery,
    responseSchema: hrBreastfeedingArrangementListSchema,
    kind: 'json',
    idempotency: 'forbidden',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.hrBreastfeedingArrangements,
    method: 'POST',
    pattern: exact('/hr-attendance/breastfeeding-arrangements'),
    build: staticBuilder(
      erpMarocUpstreamRoutes.hrAttendance.breastfeedingArrangements,
    ),
    queryKeys: noQuery,
    responseSchema: hrBreastfeedingArrangementSchema,
    kind: 'json',
    idempotency: 'required',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.hrBreastfeedingArrangementEnd,
    method: 'PATCH',
    pattern: action('hr-attendance/breastfeeding-arrangements', 'end'),
    build: idBuilder(
      erpMarocUpstreamRoutes.hrAttendance.breastfeedingArrangementEnd,
    ),
    queryKeys: noQuery,
    responseSchema: hrBreastfeedingArrangementSchema,
    kind: 'json',
    idempotency: 'required',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.hrOvertimePolicy,
    method: 'GET',
    pattern: exact('/hr-attendance/overtime-policy'),
    build: staticBuilder(erpMarocUpstreamRoutes.hrAttendance.overtimePolicy),
    queryKeys: noQuery,
    responseSchema: hrOvertimePolicyResponseSchema,
    kind: 'json',
    idempotency: 'forbidden',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.hrOvertimePolicy,
    method: 'PUT',
    pattern: exact('/hr-attendance/overtime-policy'),
    build: staticBuilder(erpMarocUpstreamRoutes.hrAttendance.overtimePolicy),
    queryKeys: noQuery,
    responseSchema: hrOvertimePolicySchema,
    kind: 'json',
    idempotency: 'required',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.hrOvertimeApprovals,
    method: 'GET',
    pattern: exact('/hr-attendance/overtime-approvals'),
    build: staticBuilder(erpMarocUpstreamRoutes.hrAttendance.overtimeApprovals),
    queryKeys: overtimeApprovalQuery,
    responseSchema: hrOvertimeApprovalListSchema,
    kind: 'json',
    idempotency: 'forbidden',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.hrOvertimeApprovalSync,
    method: 'POST',
    pattern: exact('/hr-attendance/overtime-approvals/sync'),
    build: staticBuilder(
      erpMarocUpstreamRoutes.hrAttendance.overtimeApprovalSync,
    ),
    queryKeys: noQuery,
    responseSchema: hrOvertimeApprovalListSchema,
    kind: 'json',
    idempotency: 'required',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.hrOvertimeApprovalDecision,
    method: 'PATCH',
    pattern: action('hr-attendance/overtime-approvals', 'decision'),
    build: idBuilder(
      erpMarocUpstreamRoutes.hrAttendance.overtimeApprovalDecision,
    ),
    queryKeys: noQuery,
    responseSchema: hrOvertimeApprovalSchema,
    kind: 'json',
    idempotency: 'required',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.hrCompensatoryRestBalances,
    method: 'GET',
    pattern: exact('/hr-attendance/compensatory-rest-balances'),
    build: staticBuilder(
      erpMarocUpstreamRoutes.hrAttendance.compensatoryRestBalances,
    ),
    queryKeys: compensatoryRestBalanceQuery,
    responseSchema: hrCompensatoryRestBalanceResponseSchema,
    kind: 'json',
    idempotency: 'forbidden',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.hrCompensatoryRestConsume,
    method: 'POST',
    pattern: exact('/hr-attendance/compensatory-rest/consume'),
    build: staticBuilder(
      erpMarocUpstreamRoutes.hrAttendance.compensatoryRestConsume,
    ),
    queryKeys: noQuery,
    responseSchema: hrCompensatoryRestBalanceResponseSchema,
    kind: 'json',
    idempotency: 'required',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.hrCompensatoryRestExpire,
    method: 'POST',
    pattern: exact('/hr-attendance/compensatory-rest/expire'),
    build: staticBuilder(
      erpMarocUpstreamRoutes.hrAttendance.compensatoryRestExpire,
    ),
    queryKeys: noQuery,
    responseSchema: hrCompensatoryRestExpirationResultSchema,
    kind: 'json',
    idempotency: 'required',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.hrLeavePolicies,
    method: 'GET',
    pattern: exact('/hr-leave/policies'),
    build: staticBuilder(erpMarocUpstreamRoutes.hrLeave.policies),
    queryKeys: noQuery,
    responseSchema: hrLeavePolicyListSchema,
    kind: 'json',
    idempotency: 'forbidden',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.hrLeavePolicies,
    method: 'POST',
    pattern: exact('/hr-leave/policies'),
    build: staticBuilder(erpMarocUpstreamRoutes.hrLeave.policies),
    queryKeys: noQuery,
    responseSchema: hrLeavePolicySchema,
    kind: 'json',
    idempotency: 'required',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.hrLeavePolicySeedMorocco,
    method: 'POST',
    pattern: exact('/hr-leave/policies/seed-morocco'),
    build: staticBuilder(erpMarocUpstreamRoutes.hrLeave.seedMoroccoPolicies),
    queryKeys: noQuery,
    responseSchema: hrLeavePolicySeedResultSchema,
    kind: 'json',
    idempotency: 'required',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.hrLeaveRequests,
    method: 'GET',
    pattern: exact('/hr-leave/requests'),
    build: staticBuilder(erpMarocUpstreamRoutes.hrLeave.requests),
    queryKeys: leaveRequestQuery,
    responseSchema: hrLeaveRequestListSchema,
    kind: 'json',
    idempotency: 'forbidden',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.hrLeaveRequests,
    method: 'POST',
    pattern: exact('/hr-leave/requests'),
    build: staticBuilder(erpMarocUpstreamRoutes.hrLeave.requests),
    queryKeys: noQuery,
    responseSchema: hrLeaveRequestSchema,
    kind: 'json',
    idempotency: 'required',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.hrLeaveRequestEvidence,
    method: 'PATCH',
    pattern: action('hr-leave/requests', 'evidence'),
    build: idBuilder(erpMarocUpstreamRoutes.hrLeave.requestEvidence),
    queryKeys: noQuery,
    responseSchema: hrLeaveRequestSchema,
    kind: 'json',
    idempotency: 'required',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.hrLeaveRequestDecision,
    method: 'PATCH',
    pattern: action('hr-leave/requests', 'decision'),
    build: idBuilder(erpMarocUpstreamRoutes.hrLeave.requestDecision),
    queryKeys: noQuery,
    responseSchema: hrLeaveRequestSchema,
    kind: 'json',
    idempotency: 'required',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.hrLeaveRequestCancel,
    method: 'PATCH',
    pattern: action('hr-leave/requests', 'cancel'),
    build: idBuilder(erpMarocUpstreamRoutes.hrLeave.requestCancel),
    queryKeys: noQuery,
    responseSchema: hrLeaveRequestSchema,
    kind: 'json',
    idempotency: 'required',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.hrLeaveBalances,
    method: 'GET',
    pattern: exact('/hr-leave/balances'),
    build: staticBuilder(erpMarocUpstreamRoutes.hrLeave.balances),
    queryKeys: leaveBalanceQuery,
    responseSchema: hrLeaveBalanceListSchema,
    kind: 'json',
    idempotency: 'forbidden',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.hrLeaveBalanceAdjustment,
    method: 'POST',
    pattern: exact('/hr-leave/balances/adjustments'),
    build: staticBuilder(erpMarocUpstreamRoutes.hrLeave.adjustBalance),
    queryKeys: noQuery,
    responseSchema: hrLeaveBalanceSchema,
    kind: 'json',
    idempotency: 'required',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.hrLeaveAccrualRun,
    method: 'POST',
    pattern: exact('/hr-leave/accruals/run'),
    build: staticBuilder(erpMarocUpstreamRoutes.hrLeave.runAccruals),
    queryKeys: noQuery,
    responseSchema: hrLeaveAccrualRunResultSchema,
    kind: 'json',
    idempotency: 'required',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.hrMonthlyPeriods,
    method: 'GET',
    pattern: exact('/hr-monthly-periods'),
    build: staticBuilder(erpMarocUpstreamRoutes.hrMonthlyClosing.periods),
    queryKeys: monthlyClosingQuery,
    responseSchema: hrMonthlyPeriodListSchema,
    kind: 'json',
    idempotency: 'forbidden',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.hrMonthlyPeriods,
    method: 'POST',
    pattern: exact('/hr-monthly-periods'),
    build: staticBuilder(erpMarocUpstreamRoutes.hrMonthlyClosing.periods),
    queryKeys: noQuery,
    responseSchema: hrMonthlyPeriodDetailSchema,
    kind: 'json',
    idempotency: 'required',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.hrMonthlyPeriodDetail,
    method: 'GET',
    pattern: detail('hr-monthly-periods'),
    build: idBuilder(erpMarocUpstreamRoutes.hrMonthlyClosing.period),
    queryKeys: noQuery,
    responseSchema: hrMonthlyPeriodDetailSchema,
    kind: 'json',
    idempotency: 'forbidden',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.hrMonthlyPeriodRecalculate,
    method: 'POST',
    pattern: action('hr-monthly-periods', 'recalculate'),
    build: idBuilder(erpMarocUpstreamRoutes.hrMonthlyClosing.recalculate),
    queryKeys: noQuery,
    responseSchema: hrMonthlyPeriodDetailSchema,
    kind: 'json',
    idempotency: 'required',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.hrMonthlyPeriodSubmitReview,
    method: 'POST',
    pattern: action('hr-monthly-periods', 'submit-review'),
    build: idBuilder(erpMarocUpstreamRoutes.hrMonthlyClosing.submitReview),
    queryKeys: noQuery,
    responseSchema: hrMonthlyPeriodDetailSchema,
    kind: 'json',
    idempotency: 'required',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.hrMonthlyPeriodFreeze,
    method: 'POST',
    pattern: action('hr-monthly-periods', 'freeze'),
    build: idBuilder(erpMarocUpstreamRoutes.hrMonthlyClosing.freeze),
    queryKeys: noQuery,
    responseSchema: hrMonthlyPeriodDetailSchema,
    kind: 'json',
    idempotency: 'required',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.hrMonthlyPeriodReopen,
    method: 'POST',
    pattern: action('hr-monthly-periods', 'reopen'),
    build: idBuilder(erpMarocUpstreamRoutes.hrMonthlyClosing.reopen),
    queryKeys: noQuery,
    responseSchema: hrMonthlyPeriodDetailSchema,
    kind: 'json',
    idempotency: 'required',
  }),
  defineRoute({
    routeId: erpMarocRouteIds.hrMonthlyPeriodTransmit,
    method: 'POST',
    pattern: action('hr-monthly-periods', 'transmit'),
    build: idBuilder(erpMarocUpstreamRoutes.hrMonthlyClosing.transmit),
    queryKeys: noQuery,
    responseSchema: hrMonthlyPeriodDetailSchema,
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
  if (
    key === 'cursor' ||
    key === 'tierId' ||
    key === 'invoiceId' ||
    key === 'employeeId'
  ) {
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
  if (
    routeId === erpMarocRouteIds.hrWorkCalendars &&
    key === 'year' &&
    /^(?:20\d{2}|2100)$/.test(value)
  ) {
    return;
  }
  if (
    routeId === erpMarocRouteIds.hrAttendanceMonthly &&
    key === 'month' &&
    /^\d{4}-(?:0[1-9]|1[0-2])$/.test(value)
  ) {
    return;
  }
  if (
    routeId === erpMarocRouteIds.hrTimeEntryCorrectionRequests &&
    key === 'month' &&
    /^\d{4}-(?:0[1-9]|1[0-2])$/.test(value)
  ) {
    return;
  }
  if (
    routeId === erpMarocRouteIds.hrTimeEntryCorrectionRequests &&
    key === 'status' &&
    new Set(['REQUESTED', 'MANAGER_APPROVED', 'APPROVED', 'REJECTED']).has(
      value,
    )
  ) {
    return;
  }
  if (
    routeId === erpMarocRouteIds.hrOvertimeApprovals &&
    key === 'month' &&
    /^\d{4}-(?:0[1-9]|1[0-2])$/.test(value)
  ) {
    return;
  }
  if (
    routeId === erpMarocRouteIds.hrOvertimeApprovals &&
    key === 'status' &&
    new Set(['REQUESTED', 'MANAGER_APPROVED', 'APPROVED', 'REJECTED']).has(
      value,
    )
  ) {
    return;
  }
  if (
    routeId === erpMarocRouteIds.hrWorkPatternChangeRequests &&
    key === 'status' &&
    new Set(['PENDING', 'APPROVED', 'REJECTED']).has(value)
  ) {
    return;
  }
  if (
    (routeId === erpMarocRouteIds.hrLeaveRequests ||
      routeId === erpMarocRouteIds.hrLeaveBalances) &&
    key === 'year' &&
    /^(?:20\d{2}|21\d{2}|2200)$/.test(value)
  ) {
    return;
  }
  if (
    routeId === erpMarocRouteIds.hrMonthlyPeriods &&
    key === 'year' &&
    /^(?:20\d{2}|2100)$/.test(value)
  ) {
    return;
  }
  if (
    routeId === erpMarocRouteIds.payrollDeadlines &&
    key === 'year' &&
    /^(?:20\d{2}|2100)$/.test(value)
  ) {
    return;
  }
  if (
    routeId === erpMarocRouteIds.hrLeaveRequests &&
    key === 'status' &&
    new Set([
      'REQUESTED',
      'MANAGER_APPROVED',
      'APPROVED',
      'REJECTED',
      'CANCELLED',
    ]).has(value)
  ) {
    return;
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
  if (route.queryKeys === workCalendarQuery && !values.has('year')) {
    rejectRoute();
  }
  if (
    route.routeId === erpMarocRouteIds.hrAttendanceMonthly &&
    !values.has('month')
  ) {
    rejectRoute();
  }
  if (
    route.routeId === erpMarocRouteIds.hrTimeEntryCorrectionRequests &&
    route.method === 'GET' &&
    !values.has('month')
  ) {
    rejectRoute();
  }
  if (
    route.routeId === erpMarocRouteIds.hrOvertimeApprovals &&
    !values.has('month')
  ) {
    rejectRoute();
  }
  if (
    (route.queryKeys === leaveRequestQuery ||
      route.queryKeys === leaveBalanceQuery) &&
    !values.has('year')
  ) {
    rejectRoute();
  }
  if (
    route.routeId === erpMarocRouteIds.payrollDeadlines &&
    !values.has('year')
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
