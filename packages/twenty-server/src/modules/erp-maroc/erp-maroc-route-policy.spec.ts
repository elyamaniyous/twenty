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
  erpCustomerReturnEligibleLineListSchema,
  erpCustomerReturnListSchema,
  erpCustomerReturnSchema,
  erpContextSchema,
  erpDeliveryNoteListSchema,
  erpDeliveryNoteSchema,
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
  erpSupplierInvoiceListSchema,
  erpSupplierInvoiceSchema,
  erpSupplierInvoiceDetailSchema,
  erpSupplierPaymentPreparationListSchema,
  erpSupplierPaymentPreparationSchema,
  erpStockLevelListSchema,
  erpGrossMarginReportSchema,
  erpStockMovementListSchema,
  erpStockMovementSchema,
  erpInventoryCountListSchema,
  erpInventoryCountSchema,
  erpInventoryThresholdListSchema,
  erpInventoryThresholdSchema,
  erpReplenishmentSuggestionListSchema,
  erpWarehouseListSchema,
  erpWarehouseSchema,
  erpQuoteListSchema,
  erpQuoteSchema,
  erpRegulatoryFileSchema,
  erpRegulatoryListSchema,
  erpRegulatoryObjectSchema,
  erpSalesOrderListSchema,
  erpSalesOrderSchema,
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
  'POST /customer-returns',
  `POST /customer-returns/${id}/validate`,
  `POST /customer-returns/${id}/cancel`,
  'POST /reminders/scan',
  `POST /reminders/${id}/approve`,
  `POST /reminders/${id}/cancel`,
  `POST /accounting/entries/${id}/validate`,
  `POST /accounting/entries/${id}/reject`,
  'POST /accounting/lettrage/match',
  'POST /accounting/lettrage/unmatch',
  `POST /supplier-invoices/${id}/payment-preparations`,
  `POST /supplier-payment-preparations/${id}/cancel`,
  `POST /supplier-payment-preparations/${id}/execute`,
  'POST /bank-statements',
  'POST /bank-accounts',
  `PATCH /bank-accounts/${id}`,
  `POST /bank-statements/${id}/confirm`,
  `PATCH /bank-statements/${id}/bank-account`,
  `POST /bank-statements/${id}/close`,
  `POST /bank-statement-lines/${id}/reconcile-supplier-payment`,
  `POST /bank-statement-lines/${id}/unreconcile-supplier-payment`,
  `POST /bank-statement-lines/${id}/reconcile-customer-payment`,
  `POST /bank-statement-lines/${id}/unreconcile-customer-payment`,
  `POST /bank-statement-lines/${id}/review`,
  `POST /bank-statement-lines/${id}/unreview`,
  'POST /warehouses',
  'POST /inventory/adjustments',
  'POST /inventory/transfers',
  'POST /inventory/counts',
  `POST /inventory/counts/${id}/validate`,
  `POST /inventory/counts/${id}/cancel`,
  'POST /inventory/thresholds',
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
  ['GET', '/sales-orders', 'sales-orders.collection', erpSalesOrderListSchema],
  [
    'POST',
    `/sales-orders/from-quote/${id}`,
    'sales-orders.fromQuote',
    erpSalesOrderSchema,
  ],
  ['GET', `/sales-orders/${id}`, 'sales-orders.detail', erpSalesOrderSchema],
  [
    'POST',
    `/sales-orders/${id}/confirm`,
    'sales-orders.confirm',
    erpSalesOrderSchema,
  ],
  [
    'POST',
    `/sales-orders/${id}/reservations`,
    'sales-orders.reserve',
    erpSalesOrderSchema,
  ],
  [
    'POST',
    `/sales-orders/${id}/preparation`,
    'sales-orders.prepare',
    erpSalesOrderSchema,
  ],
  [
    'POST',
    `/sales-orders/${id}/cancel`,
    'sales-orders.cancel',
    erpSalesOrderSchema,
  ],
  [
    'GET',
    `/sales-orders/${id}/deliveries`,
    'sales-orders.deliveries',
    erpDeliveryNoteListSchema,
  ],
  [
    'POST',
    `/sales-orders/${id}/deliveries`,
    'sales-orders.deliveries',
    erpDeliveryNoteSchema,
  ],
  [
    'POST',
    `/sales-orders/${id}/deliveries/${otherId}/cancel`,
    'sales-orders.delivery.cancel',
    erpDeliveryNoteSchema,
  ],
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
  [
    'GET',
    `/purchase-orders/${id}/supplier-invoices`,
    'purchase-orders.supplierInvoices',
    erpSupplierInvoiceListSchema,
  ],
  [
    'POST',
    `/purchase-orders/${id}/supplier-invoices`,
    'purchase-orders.supplierInvoices',
    erpSupplierInvoiceSchema,
  ],
  [
    'GET',
    `/supplier-invoices/${id}`,
    'supplier-invoices.detail',
    erpSupplierInvoiceDetailSchema,
  ],
  [
    'PATCH',
    `/supplier-invoices/${id}`,
    'supplier-invoices.detail',
    erpSupplierInvoiceDetailSchema,
  ],
  [
    'POST',
    `/supplier-invoices/${id}/approve`,
    'supplier-invoices.approve',
    erpSupplierInvoiceDetailSchema,
  ],
  [
    'POST',
    `/supplier-invoices/${id}/cancel`,
    'supplier-invoices.cancel',
    erpSupplierInvoiceDetailSchema,
  ],
  [
    'GET',
    `/supplier-invoices/${id}/payment-preparations`,
    'supplier-invoices.paymentPreparations',
    erpSupplierPaymentPreparationListSchema,
  ],
  [
    'POST',
    `/supplier-invoices/${id}/payment-preparations`,
    'supplier-invoices.paymentPreparations',
    erpSupplierPaymentPreparationSchema,
  ],
  [
    'POST',
    `/supplier-payment-preparations/${id}/cancel`,
    'supplier-payment-preparations.cancel',
    erpSupplierPaymentPreparationSchema,
  ],
  [
    'POST',
    `/supplier-payment-preparations/${id}/execute`,
    'supplier-payment-preparations.execute',
    erpSupplierPaymentPreparationSchema,
  ],
  ['GET', '/invoices', 'invoices.collection', erpInvoicePageSchema],
  ['POST', '/invoices', 'invoices.collection', erpInvoiceSchema],
  [
    'POST',
    `/invoices/from-quote/${id}`,
    'invoices.fromQuote',
    erpInvoiceSchema,
  ],
  [
    'POST',
    `/invoices/from-sales-order/${id}`,
    'invoices.fromSalesOrder',
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
  [
    'GET',
    '/customer-returns',
    'customer-returns.collection',
    erpCustomerReturnListSchema,
  ],
  [
    'POST',
    '/customer-returns',
    'customer-returns.collection',
    erpCustomerReturnSchema,
  ],
  [
    'GET',
    '/customer-returns/eligible-lines',
    'customer-returns.eligibleLines',
    erpCustomerReturnEligibleLineListSchema,
  ],
  [
    'GET',
    `/customer-returns/${id}`,
    'customer-returns.detail',
    erpCustomerReturnSchema,
  ],
  [
    'POST',
    `/customer-returns/${id}/validate`,
    'customer-returns.validate',
    erpCustomerReturnSchema,
  ],
  [
    'POST',
    `/customer-returns/${id}/cancel`,
    'customer-returns.cancel',
    erpCustomerReturnSchema,
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
  [
    'GET',
    '/bank-accounts',
    'bank-accounts.collection',
    erpBankAccountListSchema,
  ],
  ['POST', '/bank-accounts', 'bank-accounts.collection', erpBankAccountSchema],
  [
    'PATCH',
    `/bank-accounts/${id}`,
    'bank-accounts.detail',
    erpBankAccountSchema,
  ],
  [
    'GET',
    '/bank-statements',
    'bank-statements.collection',
    erpBankStatementListSchema,
  ],
  [
    'POST',
    '/bank-statements',
    'bank-statements.collection',
    erpBankStatementSchema,
  ],
  [
    'PATCH',
    `/bank-statements/${id}/bank-account`,
    'bank-statements.assignBankAccount',
    erpBankStatementDetailSchema,
  ],
  [
    'POST',
    `/bank-statements/${id}/close`,
    'bank-statements.close',
    erpBankStatementDetailSchema,
  ],
  [
    'GET',
    `/bank-statements/${id}`,
    'bank-statements.detail',
    erpBankStatementDetailSchema,
  ],
  [
    'POST',
    `/bank-statements/${id}/confirm`,
    'bank-statements.confirm',
    erpBankStatementDetailSchema,
  ],
  [
    'GET',
    `/bank-statement-lines/${id}/reconciliation-candidates`,
    'bank-statement-lines.reconciliationCandidates',
    erpBankReconciliationCandidatesSchema,
  ],
  [
    'POST',
    `/bank-statement-lines/${id}/reconcile-supplier-payment`,
    'bank-statement-lines.reconcileSupplierPayment',
    erpBankStatementLineSchema,
  ],
  [
    'POST',
    `/bank-statement-lines/${id}/unreconcile-supplier-payment`,
    'bank-statement-lines.unreconcileSupplierPayment',
    erpBankStatementLineSchema,
  ],
  [
    'POST',
    `/bank-statement-lines/${id}/reconcile-customer-payment`,
    'bank-statement-lines.reconcileCustomerPayment',
    erpBankStatementLineSchema,
  ],
  [
    'POST',
    `/bank-statement-lines/${id}/unreconcile-customer-payment`,
    'bank-statement-lines.unreconcileCustomerPayment',
    erpBankStatementLineSchema,
  ],
  [
    'POST',
    `/bank-statement-lines/${id}/review`,
    'bank-statement-lines.review',
    erpBankStatementLineSchema,
  ],
  [
    'POST',
    `/bank-statement-lines/${id}/unreview`,
    'bank-statement-lines.unreview',
    erpBankStatementLineSchema,
  ],
  ['GET', '/warehouses', 'warehouses.collection', erpWarehouseListSchema],
  ['POST', '/warehouses', 'warehouses.collection', erpWarehouseSchema],
  ['GET', '/inventory/levels', 'inventory.levels', erpStockLevelListSchema],
  [
    'GET',
    '/inventory/movements',
    'inventory.movements',
    erpStockMovementListSchema,
  ],
  [
    'GET',
    '/inventory/gross-margins',
    'inventory.grossMargins',
    erpGrossMarginReportSchema,
  ],
  [
    'POST',
    '/inventory/adjustments',
    'inventory.adjustments',
    erpStockMovementSchema,
  ],
  [
    'POST',
    '/inventory/transfers',
    'inventory.transfers',
    erpStockMovementListSchema,
  ],
  ['GET', '/inventory/counts', 'inventory.counts', erpInventoryCountListSchema],
  ['POST', '/inventory/counts', 'inventory.counts', erpInventoryCountSchema],
  [
    'POST',
    `/inventory/counts/${id}/validate`,
    'inventory.count.validate',
    erpInventoryCountSchema,
  ],
  [
    'POST',
    `/inventory/counts/${id}/cancel`,
    'inventory.count.cancel',
    erpInventoryCountSchema,
  ],
  [
    'GET',
    '/inventory/thresholds',
    'inventory.thresholds',
    erpInventoryThresholdListSchema,
  ],
  [
    'POST',
    '/inventory/thresholds',
    'inventory.thresholds',
    erpInventoryThresholdSchema,
  ],
  [
    'GET',
    '/inventory/replenishment-suggestions',
    'inventory.replenishmentSuggestions',
    erpReplenishmentSuggestionListSchema,
  ],
  ['GET', '/fiscal/declarations', 'fiscal.declarations', undefined],
  ['POST', '/fiscal/tva/calculate', 'fiscal.tva.calculate', undefined],
  ['POST', '/fiscal/is/calculate', 'fiscal.is.calculate', undefined],
  [
    'PATCH',
    `/fiscal/declarations/${id}/status`,
    'fiscal.declaration.status',
    undefined,
  ],
  [
    'GET',
    `/fiscal/declarations/${id}/simpl`,
    'fiscal.declaration.simpl',
    undefined,
  ],
  ['GET', '/fiscal/deadlines', 'fiscal.deadlines', undefined],
  ['POST', '/fiscal/deadlines/seed', 'fiscal.deadlines.seed', undefined],
  [
    'PATCH',
    `/fiscal/deadlines/${id}/complete`,
    'fiscal.deadline.complete',
    undefined,
  ],
  [
    'GET',
    '/accounting-compliance/exercises',
    'compliance.exercises',
    undefined,
  ],
  [
    'POST',
    '/accounting-compliance/exercises',
    'compliance.exercises',
    undefined,
  ],
  [
    'POST',
    `/accounting-compliance/exercises/${id}/review`,
    'compliance.exercise.review',
    undefined,
  ],
  [
    'PATCH',
    `/accounting-compliance/review-tasks/${id}`,
    'compliance.review-task',
    undefined,
  ],
  [
    'POST',
    `/accounting-compliance/periods/${id}/close`,
    'compliance.period.close',
    undefined,
  ],
  [
    'POST',
    `/accounting-compliance/periods/${id}/reopen`,
    'compliance.period.reopen',
    undefined,
  ],
  [
    'POST',
    `/accounting-compliance/exercises/${id}/close`,
    'compliance.exercise.close',
    undefined,
  ],
  [
    'GET',
    `/accounting-compliance/exercises/${id}/statements`,
    'compliance.exercise.statements',
    undefined,
  ],
  [
    'GET',
    `/accounting-compliance/exercises/${id}/fec`,
    'compliance.exercise.fec',
    undefined,
  ],
  [
    'POST',
    '/accounting-compliance/fec/import',
    'compliance.fec.import',
    undefined,
  ],
  ['GET', '/payroll/employees', 'payroll.employees', undefined],
  ['POST', '/payroll/employees', 'payroll.employees', undefined],
  ['PATCH', `/payroll/employees/${id}`, 'payroll.employee.detail', undefined],
  [
    'POST',
    `/payroll/employees/${id}/terminate`,
    'payroll.employee.terminate',
    undefined,
  ],
  ['GET', '/payroll/payslips', 'payroll.payslips', undefined],
  ['POST', '/payroll/payslips/generate', 'payroll.payslip.generate', undefined],
  [
    'POST',
    `/payroll/payslips/${id}/validate`,
    'payroll.payslip.validate',
    undefined,
  ],
  ['POST', `/payroll/payslips/${id}/pay`, 'payroll.payslip.pay', undefined],
  ['GET', '/payroll/leaves', 'payroll.leaves', undefined],
  ['POST', '/payroll/leaves', 'payroll.leaves', undefined],
  [
    'PATCH',
    `/payroll/leaves/${id}/decision`,
    'payroll.leave.decision',
    undefined,
  ],
  ['GET', '/payroll/cnss/export', 'payroll.cnss.export', undefined],
  ['GET', '/documents', 'documents.collection', undefined],
  ['POST', '/documents', 'documents.collection', undefined],
  ['GET', `/documents/${id}`, 'documents.detail', undefined],
  ['GET', `/documents/${id}/content`, 'documents.content', undefined],
  ['POST', `/documents/${id}/ocr/retry`, 'documents.ocr.retry', undefined],
  [
    'POST',
    `/documents/${id}/ocr/validate`,
    'documents.ocr.validate',
    undefined,
  ],
  [
    'POST',
    `/documents/${id}/create-supplier-invoice`,
    'documents.create-supplier-invoice',
    undefined,
  ],
  ['GET', '/operations/expense-notes', 'operations.expense-notes', undefined],
  ['POST', '/operations/expense-notes', 'operations.expense-notes', undefined],
  [
    'POST',
    `/operations/expense-notes/${id}/submit`,
    'operations.expense-note.submit',
    undefined,
  ],
  [
    'PATCH',
    `/operations/expense-notes/${id}/decision`,
    'operations.expense-note.decision',
    undefined,
  ],
  ['GET', '/operations/analytics', 'operations.analytics', undefined],
  ['POST', '/operations/analytics', 'operations.analytics', undefined],
  [
    'POST',
    '/operations/analytics/allocations',
    'operations.analytics.allocations',
    undefined,
  ],
  ['GET', '/operations/budgets', 'operations.budgets', undefined],
  ['POST', '/operations/budgets', 'operations.budgets', undefined],
  [
    'POST',
    `/operations/budgets/${id}/approve`,
    'operations.budget.approve',
    undefined,
  ],
  [
    'GET',
    `/operations/budgets/${id}/variance`,
    'operations.budget.variance',
    undefined,
  ],
  [
    'GET',
    '/operations/recurring-invoices',
    'operations.recurring-invoices',
    undefined,
  ],
  [
    'POST',
    '/operations/recurring-invoices',
    'operations.recurring-invoices',
    undefined,
  ],
  [
    'POST',
    '/operations/recurring-invoices/run',
    'operations.recurring-invoices.run',
    undefined,
  ],
  ['GET', '/operations/exchange-rates', 'operations.exchange-rates', undefined],
  [
    'POST',
    '/operations/exchange-rates',
    'operations.exchange-rates',
    undefined,
  ],
  ['GET', '/operations/portal-access', 'operations.portal-access', undefined],
  ['POST', '/operations/portal-access', 'operations.portal-access', undefined],
  [
    'POST',
    `/operations/portal-access/${id}/revoke`,
    'operations.portal-access.revoke',
    undefined,
  ],
  ['GET', '/operations/anomalies', 'operations.anomalies', undefined],
  [
    'POST',
    '/operations/anomalies/scan',
    'operations.anomalies.scan',
    undefined,
  ],
  [
    'POST',
    `/operations/anomalies/${id}/resolve`,
    'operations.anomaly.resolve',
    undefined,
  ],
  [
    'GET',
    `/fiscal/declarations/${id}/adc080f`,
    'fiscal.declaration.adc080f',
    erpRegulatoryFileSchema,
  ],
  ['GET', '/payroll/cnss/bds', 'payroll.cnss.bds', erpRegulatoryFileSchema],
  [
    'GET',
    `/payroll/payslips/${id}/pdf`,
    'payroll.payslip.pdf',
    erpRegulatoryFileSchema,
  ],
  [
    'GET',
    `/payroll/employees/${id}/attestation`,
    'payroll.employee.attestation',
    erpRegulatoryFileSchema,
  ],
  [
    'POST',
    `/payroll/employees/${id}/final-settlement/pdf`,
    'payroll.employee.final-settlement.pdf',
    erpRegulatoryFileSchema,
  ],
  [
    'GET',
    '/payroll/statements/2026-07/pdf',
    'payroll.statement.pdf',
    erpRegulatoryFileSchema,
  ],
  ['GET', '/liasse/definitions', 'liasse.definitions', erpRegulatoryListSchema],
  [
    'GET',
    `/liasse/exercises/${id}/tables`,
    'liasse.tables',
    erpRegulatoryListSchema,
  ],
  [
    'GET',
    `/liasse/exercises/${id}/tables/T20`,
    'liasse.table',
    erpRegulatoryObjectSchema,
  ],
  [
    'PUT',
    `/liasse/exercises/${id}/tables/T20/rows/LOYER_1`,
    'liasse.row',
    erpRegulatoryObjectSchema,
  ],
  [
    'DELETE',
    `/liasse/exercises/${id}/tables/T20/rows/LOYER_1`,
    'liasse.row',
    erpRegulatoryObjectSchema,
  ],
  [
    'GET',
    `/liasse/exercises/${id}/export`,
    'liasse.export',
    erpRegulatoryFileSchema,
  ],
  [
    'GET',
    '/liasse/submissions',
    'regulatory.submissions',
    erpRegulatoryListSchema,
  ],
  [
    'PATCH',
    `/liasse/submissions/${id}/external-validation`,
    'regulatory.submission.validation',
    erpRegulatoryObjectSchema,
  ],
  [
    'GET',
    '/portal-admin/requests',
    'portal.admin.requests',
    erpRegulatoryListSchema,
  ],
  [
    'POST',
    `/portal-admin/requests/${id}/comments`,
    'portal.admin.comment',
    erpRegulatoryObjectSchema,
  ],
  [
    'PATCH',
    `/portal-admin/requests/${id}`,
    'portal.admin.request.update',
    erpRegulatoryObjectSchema,
  ],
  [
    'GET',
    '/ai-accounting/status',
    'ai-accounting.status',
    erpRegulatoryObjectSchema,
  ],
  [
    'GET',
    '/ai-accounting/suggestions',
    'ai-accounting.suggestions',
    erpRegulatoryListSchema,
  ],
  [
    'POST',
    '/ai-accounting/categorize',
    'ai-accounting.categorize',
    erpRegulatoryObjectSchema,
  ],
  [
    'POST',
    '/ai-accounting/reconcile',
    'ai-accounting.reconcile',
    erpRegulatoryObjectSchema,
  ],
  [
    'PATCH',
    `/ai-accounting/suggestions/${id}`,
    'ai-accounting.suggestion.review',
    erpRegulatoryObjectSchema,
  ],
  [
    'POST',
    '/ai-accounting/safe-query',
    'ai-accounting.safe-query',
    erpRegulatoryObjectSchema,
  ],
  [
    'GET',
    '/ai-accounting/conversations',
    'ai-accounting.conversations',
    erpRegulatoryListSchema,
  ],
  [
    'POST',
    '/ai-accounting/ask',
    'ai-accounting.ask',
    erpRegulatoryObjectSchema,
  ],
  ['GET', '/approvals/matrices', 'approvals.matrices', erpRegulatoryListSchema],
  [
    'POST',
    '/approvals/matrices',
    'approvals.matrices',
    erpRegulatoryObjectSchema,
  ],
  [
    'PATCH',
    `/approvals/matrices/${id}/active`,
    'approvals.matrix.active',
    erpRegulatoryObjectSchema,
  ],
  ['GET', '/approvals/requests', 'approvals.requests', erpRegulatoryListSchema],
  [
    'POST',
    '/approvals/requests',
    'approvals.requests',
    erpRegulatoryObjectSchema,
  ],
  [
    'POST',
    `/approvals/requests/${id}/decision`,
    'approvals.decision',
    erpRegulatoryObjectSchema,
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
    ['GET', '/customer-returns/not-a-uuid'],
    ['GET', '/customer-returns/eligible-lines/not-allowed'],
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
