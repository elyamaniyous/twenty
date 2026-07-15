import { getInvoiceCommandPolicy } from '@/erp-maroc/invoices/invoiceCommandPolicy';

const roles = ['OWNER', 'ADMIN', 'COMPTABLE', 'COMMERCIAL'] as const;

type PolicyInput = Parameters<typeof getInvoiceCommandPolicy>[0];

const draftInput: PolicyInput = {
  role: 'COMMERCIAL',
  manageSalesDocuments: true,
  createPendingPayment: false,
  manageCreditNotes: false,
  features: {
    invoiceValidation: true,
    invoiceEmail: true,
  },
  status: 'DRAFT',
  lineCount: 1,
  legalSnapshotVerificationStatus: 'PENDING',
  legalMentionsReady: true,
  pdfGenerationStatus: 'NOT_REQUESTED',
  pdfDocumentReference: null,
  customerEmailSnapshot: null,
  outstandingCents: 100,
};

describe('getInvoiceCommandPolicy', () => {
  it.each(roles)(
    'allows every linked %s role to create and edit a DRAFT',
    (role) => {
      expect(getInvoiceCommandPolicy({ ...draftInput, role })).toEqual({
        manualCreate: true,
        edit: true,
        save: true,
        validate: true,
        viewPdf: false,
        send: false,
        createPayment: false,
        createCreditNote: false,
      });
    },
  );

  it.each(roles)(
    'allows every linked %s role to create a direct invoice',
    (role) => {
      expect(
        getInvoiceCommandPolicy({ ...draftInput, role, status: 'VALIDATED' }),
      ).toMatchObject({ manualCreate: true, edit: false, save: false });
    },
  );

  it('requires an enabled validation feature, a PENDING snapshot, legal mentions, and lines', () => {
    expect(
      getInvoiceCommandPolicy({
        ...draftInput,
        features: { ...draftInput.features, invoiceValidation: false },
      }).validate,
    ).toBe(false);
    expect(
      getInvoiceCommandPolicy({
        ...draftInput,
        legalSnapshotVerificationStatus: 'VERIFIED',
      }).validate,
    ).toBe(false);
    expect(
      getInvoiceCommandPolicy({ ...draftInput, legalMentionsReady: false })
        .validate,
    ).toBe(false);
    expect(
      getInvoiceCommandPolicy({ ...draftInput, lineCount: 0 }).validate,
    ).toBe(false);
  });

  it('only exposes a PDF after the worker generated a referenced document', () => {
    expect(
      getInvoiceCommandPolicy({
        ...draftInput,
        status: 'VALIDATED',
        legalSnapshotVerificationStatus: 'VERIFIED',
        pdfGenerationStatus: 'GENERATED',
        pdfDocumentReference: 'invoices/FAC-2026-0001.pdf',
      }).viewPdf,
    ).toBe(true);
    expect(
      getInvoiceCommandPolicy({
        ...draftInput,
        status: 'VALIDATED',
        legalSnapshotVerificationStatus: 'VERIFIED',
        pdfGenerationStatus: 'GENERATED',
        pdfDocumentReference: '  ',
      }).viewPdf,
    ).toBe(false);
    expect(
      getInvoiceCommandPolicy({
        ...draftInput,
        status: 'VALIDATED',
        legalSnapshotVerificationStatus: 'VERIFIED',
        pdfGenerationStatus: 'GENERATED',
        pdfDocumentReference: null,
      }).viewPdf,
    ).toBe(false);
  });

  it.each(['VALIDATED', 'SENT', 'PARTIALLY_PAID', 'PAID', 'OVERDUE'] as const)(
    'allows sending %s only after all observable prerequisites are met',
    (status) => {
      expect(
        getInvoiceCommandPolicy({
          ...draftInput,
          status,
          legalSnapshotVerificationStatus: 'VERIFIED',
          pdfGenerationStatus: 'GENERATED',
          pdfDocumentReference: 'invoices/FAC-2026-0001.pdf',
          customerEmailSnapshot: ' billing@example.test ',
        }).send,
      ).toBe(true);
    },
  );

  it('does not send a DRAFT, CANCELLED, incomplete PDF, unverified snapshot, or blank recipient', () => {
    const sendable: PolicyInput = {
      ...draftInput,
      status: 'VALIDATED',
      legalSnapshotVerificationStatus: 'VERIFIED',
      pdfGenerationStatus: 'GENERATED',
      pdfDocumentReference: 'invoices/FAC-2026-0001.pdf',
      customerEmailSnapshot: 'billing@example.test',
    };

    expect(getInvoiceCommandPolicy({ ...sendable, status: 'DRAFT' }).send).toBe(
      false,
    );
    expect(
      getInvoiceCommandPolicy({ ...sendable, status: 'CANCELLED' }).send,
    ).toBe(false);
    expect(
      getInvoiceCommandPolicy({ ...sendable, pdfGenerationStatus: 'PENDING' })
        .send,
    ).toBe(false);
    expect(
      getInvoiceCommandPolicy({
        ...sendable,
        legalSnapshotVerificationStatus: 'PENDING',
      }).send,
    ).toBe(false);
    expect(
      getInvoiceCommandPolicy({ ...sendable, customerEmailSnapshot: ' ' }).send,
    ).toBe(false);
    expect(
      getInvoiceCommandPolicy({ ...sendable, customerEmailSnapshot: null })
        .send,
    ).toBe(false);
    expect(
      getInvoiceCommandPolicy({
        ...sendable,
        features: { ...sendable.features, invoiceEmail: false },
      }).send,
    ).toBe(false);
  });

  it('allows pending-payment creation only for a non-draft document with a positive outstanding balance', () => {
    const paymentInput: PolicyInput = {
      ...draftInput,
      createPendingPayment: true,
      status: 'PARTIALLY_PAID',
      outstandingCents: 1,
    };

    expect(getInvoiceCommandPolicy(paymentInput).createPayment).toBe(true);
    expect(
      getInvoiceCommandPolicy({ ...paymentInput, status: 'DRAFT' })
        .createPayment,
    ).toBe(false);
    expect(
      getInvoiceCommandPolicy({ ...paymentInput, status: 'CANCELLED' })
        .createPayment,
    ).toBe(false);
    expect(
      getInvoiceCommandPolicy({ ...paymentInput, outstandingCents: 0 })
        .createPayment,
    ).toBe(false);
    expect(
      getInvoiceCommandPolicy({ ...paymentInput, outstandingCents: Number.NaN })
        .createPayment,
    ).toBe(false);
  });

  it('allows credit-note creation only for an accounting role, a non-draft document, and its dedicated capability', () => {
    const creditNoteInput: PolicyInput = {
      ...draftInput,
      role: 'COMPTABLE',
      manageCreditNotes: true,
      status: 'PARTIALLY_PAID',
    };

    expect(getInvoiceCommandPolicy(creditNoteInput).createCreditNote).toBe(
      true,
    );
    expect(
      getInvoiceCommandPolicy({ ...creditNoteInput, status: 'DRAFT' })
        .createCreditNote,
    ).toBe(false);
    expect(
      getInvoiceCommandPolicy({ ...creditNoteInput, status: 'CANCELLED' })
        .createCreditNote,
    ).toBe(false);
    expect(
      getInvoiceCommandPolicy({ ...creditNoteInput, manageCreditNotes: false })
        .createCreditNote,
    ).toBe(false);
    expect(
      getInvoiceCommandPolicy({ ...creditNoteInput, role: 'COMMERCIAL' })
        .createCreditNote,
    ).toBe(false);
  });

  it.each(roles)(
    'withholds document commands without sales-document capability',
    (role) => {
      expect(
        getInvoiceCommandPolicy({
          ...draftInput,
          role,
          manageSalesDocuments: false,
          createPendingPayment: false,
          manageCreditNotes: false,
        }),
      ).toEqual({
        manualCreate: false,
        edit: false,
        save: false,
        validate: false,
        viewPdf: false,
        send: false,
        createPayment: false,
        createCreditNote: false,
      });
    },
  );

  it('keeps payment creation governed by its dedicated capability', () => {
    expect(
      getInvoiceCommandPolicy({
        ...draftInput,
        manageSalesDocuments: false,
        createPendingPayment: true,
        status: 'VALIDATED',
      }).createPayment,
    ).toBe(true);
  });
});
