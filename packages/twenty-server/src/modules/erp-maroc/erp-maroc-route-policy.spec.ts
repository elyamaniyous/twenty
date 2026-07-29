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
  hrContractAmendmentSchema,
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
  hrTeamListSchema,
  hrTeamSchema,
  hrWorkLocationListSchema,
  hrWorkLocationSchema,
  hrAttendanceMonthSchema,
  hrTimeEntrySchema,
  hrWorkScheduleAssignmentSchema,
  hrWorkScheduleListSchema,
  hrWorkScheduleSchema,
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
  payrollRegulatorySeedResultSchema,
  payrollRegulatorySummarySchema,
  payrollRuleListSchema,
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
  'POST /marketing/contacts/import-tiers',
  `POST /marketing/contacts/${id}/consent`,
  'POST /marketing/segments',
  `POST /marketing/segments/${id}/sync`,
  'POST /marketing/campaigns',
  `POST /marketing/campaigns/${id}/send`,
  `POST /marketing/campaigns/${id}/refresh`,
  'POST /marketing/automations',
  `POST /marketing/automations/${id}/activate`,
  `POST /marketing/automations/${id}/pause`,
  'POST /marketing/scoring-rules',
  `POST /marketing/scoring-rules/${id}/toggle`,
  'POST /marketing/events',
  'POST /payroll/regulatory/seed/morocco-2026',
  'POST /hr-core/access/grants',
  'POST /hr-core/establishments',
  `PATCH /hr-core/establishments/${id}`,
  'POST /hr-core/grades',
  `PATCH /hr-core/grades/${id}`,
  'POST /hr-core/cost-centers',
  `PATCH /hr-core/cost-centers/${id}`,
  'POST /hr-core/teams',
  `PATCH /hr-core/teams/${id}`,
  'POST /hr-core/work-locations',
  `PATCH /hr-core/work-locations/${id}`,
  'POST /hr-core/departments',
  `PATCH /hr-core/departments/${id}`,
  'POST /hr-core/job-positions',
  `PATCH /hr-core/job-positions/${id}`,
  'POST /hr-core/employee-import/preview',
  'POST /hr-core/employee-import/commit',
  `PATCH /hr-core/employees/${id}/crm-link`,
  `PATCH /hr-core/employees/${id}/personal-details`,
  `POST /hr-core/employees/${id}/dependants`,
  `PATCH /hr-core/dependants/${id}`,
  `POST /hr-core/employees/${id}/emergency-contacts`,
  `PATCH /hr-core/emergency-contacts/${id}`,
  `PATCH /hr-core/employees/${id}/bank-account`,
  `POST /hr-core/employees/${id}/assignments`,
  `PATCH /hr-core/assignments/${id}/end`,
  `POST /hr-core/employees/${id}/documents`,
  `PATCH /hr-core/hr-documents/${id}`,
  `POST /hr-core/hr-documents/${id}/versions`,
  'POST /hr-core/lifecycle-journeys',
  'POST /hr-core/hiring',
  `PATCH /hr-core/lifecycle-tasks/${id}`,
  `PATCH /hr-core/lifecycle-journeys/${id}/status`,
  `POST /hr-core/employees/${id}/contracts`,
  `PATCH /hr-core/contracts/${id}/status`,
  `POST /hr-core/contracts/${id}/amendments`,
  `PATCH /hr-core/amendments/${id}/status`,
  'POST /hr-attendance/work-schedules',
  `POST /hr-attendance/employees/${id}/work-schedule-assignments`,
  'POST /hr-attendance/time-entries',
  `PATCH /hr-attendance/time-entries/${id}/cancel`,
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
  ['GET', '/marketing/overview', 'marketing.overview', marketingOverviewSchema],
  [
    'GET',
    '/marketing/contacts',
    'marketing.contacts.collection',
    marketingContactListSchema,
  ],
  [
    'POST',
    '/marketing/contacts/import-tiers',
    'marketing.contacts.importTiers',
    marketingTierImportResultSchema,
  ],
  [
    'POST',
    `/marketing/contacts/${id}/consent`,
    'marketing.contacts.consent',
    marketingContactSchema,
  ],
  [
    'GET',
    '/marketing/segments',
    'marketing.segments.collection',
    marketingSegmentListSchema,
  ],
  [
    'POST',
    '/marketing/segments',
    'marketing.segments.collection',
    marketingSegmentSchema,
  ],
  [
    'POST',
    `/marketing/segments/${id}/sync`,
    'marketing.segments.sync',
    marketingSegmentSyncResultSchema,
  ],
  [
    'GET',
    '/marketing/campaigns',
    'marketing.campaigns.collection',
    marketingCampaignListSchema,
  ],
  [
    'POST',
    '/marketing/campaigns',
    'marketing.campaigns.collection',
    marketingCampaignSchema,
  ],
  [
    'POST',
    `/marketing/campaigns/${id}/send`,
    'marketing.campaigns.send',
    marketingCampaignSchema,
  ],
  [
    'POST',
    `/marketing/campaigns/${id}/refresh`,
    'marketing.campaigns.refresh',
    marketingCampaignSchema,
  ],
  [
    'GET',
    '/marketing/automations',
    'marketing.automations.collection',
    marketingAutomationListSchema,
  ],
  [
    'POST',
    '/marketing/automations',
    'marketing.automations.collection',
    marketingAutomationSchema,
  ],
  [
    'POST',
    `/marketing/automations/${id}/activate`,
    'marketing.automations.activate',
    marketingAutomationSchema,
  ],
  [
    'POST',
    `/marketing/automations/${id}/pause`,
    'marketing.automations.pause',
    marketingAutomationSchema,
  ],
  [
    'GET',
    '/marketing/scoring-rules',
    'marketing.scoringRules.collection',
    marketingScoringRuleListSchema,
  ],
  [
    'POST',
    '/marketing/scoring-rules',
    'marketing.scoringRules.collection',
    marketingScoringRuleSchema,
  ],
  [
    'POST',
    `/marketing/scoring-rules/${id}/toggle`,
    'marketing.scoringRules.toggle',
    marketingScoringRuleSchema,
  ],
  [
    'GET',
    '/marketing/events',
    'marketing.events.collection',
    marketingEventListSchema,
  ],
  [
    'POST',
    '/marketing/events',
    'marketing.events.collection',
    marketingEventSchema,
  ],
  [
    'GET',
    '/payroll/regulatory/summary',
    'payroll.regulatory.summary',
    payrollRegulatorySummarySchema,
  ],
  [
    'GET',
    '/payroll/regulatory/rules',
    'payroll.regulatory.rules',
    payrollRuleListSchema,
  ],
  [
    'GET',
    '/payroll/regulatory/components',
    'payroll.regulatory.components',
    payrollComponentListSchema,
  ],
  [
    'GET',
    '/payroll/regulatory/controls',
    'payroll.regulatory.controls',
    payrollControlDefinitionListSchema,
  ],
  [
    'GET',
    '/payroll/regulatory/sources',
    'payroll.regulatory.sources',
    payrollLegalSourceListSchema,
  ],
  [
    'POST',
    '/payroll/regulatory/seed/morocco-2026',
    'payroll.regulatory.seed',
    payrollRegulatorySeedResultSchema,
  ],
  ['GET', '/hr-core/summary', 'hr-core.summary', hrCoreSummarySchema],
  ['GET', '/hr-core/access/me', 'hr-core.access.me', hrAccessContextSchema],
  [
    'GET',
    '/hr-core/access/administration',
    'hr-core.access.administration',
    hrAccessAdministrationSchema,
  ],
  [
    'POST',
    '/hr-core/access/grants',
    'hr-core.access.grants',
    hrAccessGrantSchema,
  ],
  [
    'GET',
    '/hr-core/establishments',
    'hr-core.establishments',
    hrEstablishmentListSchema,
  ],
  [
    'POST',
    '/hr-core/establishments',
    'hr-core.establishments',
    hrEstablishmentSchema,
  ],
  [
    'PATCH',
    `/hr-core/establishments/${id}`,
    'hr-core.establishment.detail',
    hrEstablishmentSchema,
  ],
  ['GET', '/hr-core/grades', 'hr-core.grades', hrGradeListSchema],
  ['POST', '/hr-core/grades', 'hr-core.grades', hrGradeSchema],
  ['PATCH', `/hr-core/grades/${id}`, 'hr-core.grade.detail', hrGradeSchema],
  [
    'GET',
    '/hr-core/cost-centers',
    'hr-core.cost-centers',
    hrCostCenterListSchema,
  ],
  ['POST', '/hr-core/cost-centers', 'hr-core.cost-centers', hrCostCenterSchema],
  [
    'PATCH',
    `/hr-core/cost-centers/${id}`,
    'hr-core.cost-center.detail',
    hrCostCenterSchema,
  ],
  ['GET', '/hr-core/teams', 'hr-core.teams', hrTeamListSchema],
  ['POST', '/hr-core/teams', 'hr-core.teams', hrTeamSchema],
  ['PATCH', `/hr-core/teams/${id}`, 'hr-core.team.detail', hrTeamSchema],
  [
    'GET',
    '/hr-core/work-locations',
    'hr-core.work-locations',
    hrWorkLocationListSchema,
  ],
  [
    'POST',
    '/hr-core/work-locations',
    'hr-core.work-locations',
    hrWorkLocationSchema,
  ],
  [
    'PATCH',
    `/hr-core/work-locations/${id}`,
    'hr-core.work-location.detail',
    hrWorkLocationSchema,
  ],
  [
    'GET',
    '/hr-core/departments',
    'hr-core.departments',
    hrDepartmentListSchema,
  ],
  ['POST', '/hr-core/departments', 'hr-core.departments', hrDepartmentSchema],
  [
    'PATCH',
    `/hr-core/departments/${id}`,
    'hr-core.department.detail',
    hrDepartmentSchema,
  ],
  [
    'GET',
    '/hr-core/job-positions',
    'hr-core.job-positions',
    hrJobPositionListSchema,
  ],
  [
    'POST',
    '/hr-core/job-positions',
    'hr-core.job-positions',
    hrJobPositionSchema,
  ],
  [
    'PATCH',
    `/hr-core/job-positions/${id}`,
    'hr-core.job-position.detail',
    hrJobPositionSchema,
  ],
  [
    'GET',
    '/hr-core/employee-import/template',
    'hr-core.employee-import.template',
    hrEmployeeImportTemplateSchema,
  ],
  [
    'POST',
    '/hr-core/employee-import/preview',
    'hr-core.employee-import.preview',
    hrEmployeeImportPreviewSchema,
  ],
  [
    'POST',
    '/hr-core/employee-import/commit',
    'hr-core.employee-import.commit',
    hrEmployeeImportCommitResultSchema,
  ],
  ['GET', '/hr-core/employees', 'hr-core.employees', hrEmployeeListSchema],
  [
    'GET',
    `/hr-core/employees/${id}`,
    'hr-core.employee.detail',
    hrEmployeeDetailSchema,
  ],
  [
    'GET',
    '/hr-core/organisation-chart',
    'hr-core.organisation-chart',
    hrOrganisationChartSchema,
  ],
  [
    'PATCH',
    `/hr-core/employees/${id}/crm-link`,
    'hr-core.employee.crm-link',
    hrEmployeeCrmLinkResultSchema,
  ],
  [
    'PATCH',
    `/hr-core/employees/${id}/personal-details`,
    'hr-core.employee.personal-details',
    hrEmployeePrivateProfileSchema,
  ],
  [
    'POST',
    `/hr-core/employees/${id}/dependants`,
    'hr-core.employee.dependants',
    hrEmployeeDependantSchema,
  ],
  [
    'PATCH',
    `/hr-core/dependants/${id}`,
    'hr-core.dependant.detail',
    hrEmployeeDependantSchema,
  ],
  [
    'POST',
    `/hr-core/employees/${id}/emergency-contacts`,
    'hr-core.employee.emergency-contacts',
    hrEmployeeEmergencyContactSchema,
  ],
  [
    'PATCH',
    `/hr-core/emergency-contacts/${id}`,
    'hr-core.emergency-contact.detail',
    hrEmployeeEmergencyContactSchema,
  ],
  [
    'PATCH',
    `/hr-core/employees/${id}/bank-account`,
    'hr-core.employee.bank-account',
    hrEmployeeBankAccountSchema,
  ],
  [
    'POST',
    `/hr-core/employees/${id}/assignments`,
    'hr-core.employee.assignments',
    hrEmployeeAssignmentSchema,
  ],
  [
    'PATCH',
    `/hr-core/assignments/${id}/end`,
    'hr-core.assignment.end',
    hrEmployeeAssignmentSchema,
  ],
  ['GET', '/hr-core/deadlines', 'hr-core.deadlines', hrDeadlineCenterSchema],
  [
    'POST',
    `/hr-core/employees/${id}/documents`,
    'hr-core.employee.documents',
    hrEmployeeDocumentSchema,
  ],
  [
    'PATCH',
    `/hr-core/hr-documents/${id}`,
    'hr-core.document.detail',
    hrEmployeeDocumentSchema,
  ],
  [
    'POST',
    `/hr-core/hr-documents/${id}/versions`,
    'hr-core.document.versions',
    hrEmployeeDocumentSchema,
  ],
  [
    'GET',
    `/hr-core/hr-document-versions/${id}/content`,
    'hr-core.document-version.content',
    hrDocumentContentSchema,
  ],
  [
    'GET',
    '/hr-core/lifecycle-journeys',
    'hr-core.lifecycle-journeys',
    hrLifecycleJourneyListSchema,
  ],
  [
    'POST',
    '/hr-core/lifecycle-journeys',
    'hr-core.lifecycle-journeys',
    hrLifecycleJourneySchema,
  ],
  ['POST', '/hr-core/hiring', 'hr-core.hiring', hrLifecycleJourneySchema],
  [
    'PATCH',
    `/hr-core/lifecycle-tasks/${id}`,
    'hr-core.lifecycle-task.detail',
    hrLifecycleTaskSchema,
  ],
  [
    'PATCH',
    `/hr-core/lifecycle-journeys/${id}/status`,
    'hr-core.lifecycle-journey.status',
    hrLifecycleJourneySchema,
  ],
  [
    'POST',
    `/hr-core/employees/${id}/contracts`,
    'hr-core.employee.contracts',
    hrEmploymentContractSchema,
  ],
  [
    'PATCH',
    `/hr-core/contracts/${id}/status`,
    'hr-core.contract.status',
    hrEmploymentContractSchema,
  ],
  [
    'POST',
    `/hr-core/contracts/${id}/amendments`,
    'hr-core.contract.amendments',
    hrContractAmendmentSchema,
  ],
  [
    'PATCH',
    `/hr-core/amendments/${id}/status`,
    'hr-core.amendment.status',
    hrContractAmendmentSchema,
  ],
  [
    'GET',
    '/hr-attendance/work-schedules',
    'hr-attendance.work-schedules',
    hrWorkScheduleListSchema,
  ],
  [
    'POST',
    '/hr-attendance/work-schedules',
    'hr-attendance.work-schedules',
    hrWorkScheduleSchema,
  ],
  [
    'POST',
    `/hr-attendance/employees/${id}/work-schedule-assignments`,
    'hr-attendance.employee.work-schedule-assignments',
    hrWorkScheduleAssignmentSchema,
  ],
  [
    'POST',
    '/hr-attendance/time-entries',
    'hr-attendance.time-entries',
    hrTimeEntrySchema,
  ],
  [
    'PATCH',
    `/hr-attendance/time-entries/${id}/cancel`,
    'hr-attendance.time-entry.cancel',
    hrTimeEntrySchema,
  ],
  [
    'GET',
    '/hr-attendance/monthly',
    'hr-attendance.monthly',
    hrAttendanceMonthSchema,
  ],
] as const;

describe('ERP Maroc route policy', () => {
  it.each(approvedRoutes)(
    'allows %s %s through the declared route %s',
    (method, path, routeId, responseSchema) => {
      const requiresAccountCode =
        routeId === 'accounting.grand-livre' ||
        routeId === 'accounting.lettrage.suggestions';
      const query =
        routeId === 'hr-attendance.monthly'
          ? { month: '2026-07' }
          : requiresAccountCode
            ? { accountCode: '3421' }
            : {};
      const resolved = resolveErpRoute(method, path, query);

      expect(resolved.routeId).toBe(routeId);
      expect(resolved.upstreamPath).toBe(
        routeId === 'hr-attendance.monthly'
          ? `${path}?month=2026-07`
          : requiresAccountCode
            ? `${path}?accountCode=3421`
            : path,
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
    expect(
      resolveErpRoute('GET', '/hr-attendance/monthly', {
        month: '2026-07',
        employeeId: id,
      }).upstreamPath,
    ).toBe(`/hr-attendance/monthly?month=2026-07&employeeId=${id}`);
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
    ['/hr-attendance/monthly', {}],
    ['/hr-attendance/monthly', { month: '2026-13' }],
    ['/hr-attendance/monthly', { month: '2026-07', employeeId: 'invalid' }],
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
