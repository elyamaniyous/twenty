import type { ErpContext, ErpInvoiceRead } from 'twenty-shared/erp-maroc';

export type InvoiceCommandPolicyInput = {
  role: ErpContext['role'];
  manageSalesDocuments: boolean;
  createPendingPayment: boolean;
  manageCreditNotes: boolean;
  features: Pick<ErpContext['features'], 'invoiceValidation' | 'invoiceEmail'>;
  status: ErpInvoiceRead['status'];
  lineCount: number;
  legalSnapshotVerificationStatus: ErpInvoiceRead['legalSnapshotVerificationStatus'];
  legalMentionsReady: boolean;
  pdfGenerationStatus: ErpInvoiceRead['pdfGenerationStatus'];
  pdfDocumentReference: string | null;
  customerEmailSnapshot: string | null;
  outstandingCents: number;
};

export type InvoiceCommandPolicy = {
  manualCreate: boolean;
  edit: boolean;
  save: boolean;
  validate: boolean;
  viewPdf: boolean;
  send: boolean;
  createPayment: boolean;
  createCreditNote: boolean;
};

const linkedRoles: ReadonlySet<ErpContext['role']> = new Set([
  'OWNER',
  'ADMIN',
  'COMPTABLE',
  'COMMERCIAL',
]);

const accountingRoles: ReadonlySet<ErpContext['role']> = new Set([
  'OWNER',
  'ADMIN',
  'COMPTABLE',
]);

const sendableStatuses: ReadonlySet<ErpInvoiceRead['status']> = new Set([
  'VALIDATED',
  'SENT',
  'PARTIALLY_PAID',
  'PAID',
  'OVERDUE',
]);

const noDocumentCommands: Omit<
  InvoiceCommandPolicy,
  'createPayment' | 'createCreditNote'
> = {
  manualCreate: false,
  edit: false,
  save: false,
  validate: false,
  viewPdf: false,
  send: false,
};

const hasNonBlankText = (value: string | null) =>
  typeof value === 'string' && value.trim().length > 0;

const hasPositiveLineCount = (value: number) =>
  Number.isFinite(value) && Number.isInteger(value) && value > 0;

const hasPositiveOutstandingCents = (value: number) =>
  Number.isFinite(value) && Number.isSafeInteger(value) && value > 0;

export const getInvoiceCommandPolicy = ({
  role,
  manageSalesDocuments,
  createPendingPayment,
  manageCreditNotes,
  features,
  status,
  lineCount,
  legalSnapshotVerificationStatus,
  legalMentionsReady,
  pdfGenerationStatus,
  pdfDocumentReference,
  customerEmailSnapshot,
  outstandingCents,
}: InvoiceCommandPolicyInput): InvoiceCommandPolicy => {
  const hasLinkedRole = linkedRoles.has(role);
  const canManageDocument = hasLinkedRole && manageSalesDocuments;
  const canCreateCreditNote =
    accountingRoles.has(role) &&
    manageCreditNotes &&
    status !== 'DRAFT' &&
    status !== 'CANCELLED';
  const isDraft = status === 'DRAFT';
  const hasGeneratedPdf =
    pdfGenerationStatus === 'GENERATED' &&
    hasNonBlankText(pdfDocumentReference);
  const hasVerifiedLegalSnapshot =
    legalSnapshotVerificationStatus === 'VERIFIED';

  if (!canManageDocument) {
    return {
      ...noDocumentCommands,
      createPayment:
        hasLinkedRole &&
        createPendingPayment &&
        status !== 'DRAFT' &&
        status !== 'CANCELLED' &&
        hasPositiveOutstandingCents(outstandingCents),
      createCreditNote: canCreateCreditNote,
    };
  }

  return {
    manualCreate: true,
    edit: isDraft,
    save: isDraft,
    validate:
      isDraft &&
      features.invoiceValidation &&
      legalSnapshotVerificationStatus === 'PENDING' &&
      legalMentionsReady &&
      hasPositiveLineCount(lineCount),
    viewPdf: hasGeneratedPdf,
    send:
      features.invoiceEmail &&
      sendableStatuses.has(status) &&
      hasVerifiedLegalSnapshot &&
      hasGeneratedPdf &&
      hasNonBlankText(customerEmailSnapshot),
    createPayment:
      createPendingPayment &&
      status !== 'DRAFT' &&
      status !== 'CANCELLED' &&
      hasPositiveOutstandingCents(outstandingCents),
    createCreditNote: canCreateCreditNote,
  };
};
