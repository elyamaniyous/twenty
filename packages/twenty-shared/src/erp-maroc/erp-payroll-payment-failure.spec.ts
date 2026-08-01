import {
  erpBankStatementLineSchema,
  erpPayrollPaymentFailureSchema,
} from './erp-maroc-contracts';

const batchId = '11111111-1111-4111-8111-111111111111';
const statementId = '22222222-2222-4222-8222-222222222222';
const lineId = '33333333-3333-4333-8333-333333333333';
const accountingEntryId = '55555555-5555-4555-8555-555555555555';

const returnLine = {
  id: lineId,
  statementImportId: statementId,
  transactionDate: '2026-08-12',
  valueDate: null,
  description: 'Retour remise salaires juillet',
  reference: 'REM-PAIE-2026-07',
  creditCents: 1_800_000,
  bankAccount: {
    id: '44444444-4444-4444-8444-444444444444',
    name: 'Compte principal',
    bankName: 'Banque Zowka',
    accountingAccountCode: '5141',
  },
};

describe('payroll payment failure contract', () => {
  it('accepts complete returned payment evidence', () => {
    expect(
      erpPayrollPaymentFailureSchema.parse({
        batchId,
        attemptNumber: 1,
        periodKey: '2026-07',
        status: 'RETURNED',
        totalNetCents: 1_800_000,
        canReportRejected: false,
        canReportReturned: false,
        failureKind: 'BANK_RETURNED',
        failedAt: '2026-08-12T10:00:00.000Z',
        failedByTwentyUserId: 'twenty-user-1',
        failureReason: 'Retour intégral confirmé par la banque',
        reversalAccountingEntryId: accountingEntryId,
        reversalAccountingEntryStatus: 'VALIDATED',
        totalReturnedCents: 1_800_000,
        returnLines: [returnLine],
        candidates: [],
      }),
    ).toMatchObject({
      status: 'RETURNED',
      failureKind: 'BANK_RETURNED',
      returnLines: [{ transactionDate: '2026-08-12' }],
    });
  });

  it('rejects a return without balanced reversal evidence', () => {
    expect(
      erpPayrollPaymentFailureSchema.safeParse({
        batchId,
        attemptNumber: 1,
        periodKey: '2026-07',
        status: 'RETURNED',
        totalNetCents: 1_800_000,
        canReportRejected: false,
        canReportReturned: false,
        failureKind: 'BANK_RETURNED',
        failedAt: '2026-08-12T10:00:00.000Z',
        failedByTwentyUserId: 'twenty-user-1',
        failureReason: 'Retour intégral confirmé par la banque',
        reversalAccountingEntryId: null,
        reversalAccountingEntryStatus: null,
        totalReturnedCents: 0,
        returnLines: [],
        candidates: [],
      }).success,
    ).toBe(false);
  });

  it('represents the reversal on the returned bank credit', () => {
    expect(
      erpBankStatementLineSchema.parse({
        id: lineId,
        position: 0,
        pageNumber: 1,
        transactionDate: '2026-08-12',
        valueDate: null,
        description: returnLine.description,
        reference: returnLine.reference,
        debitCents: 0,
        creditCents: 1_800_000,
        balanceCents: 4_200_000,
        confidenceBasisPoints: 10_000,
        needsReview: false,
        sourceText: returnLine.description,
        boundingBox: null,
        review: null,
        reconciliation: {
          kind: 'PAYROLL_RETURN',
          payrollPaymentBatchId: batchId,
          periodKey: '2026-07',
          paymentDate: '2026-08-03',
          bankReference: 'REM-PAIE-2026-07',
          totalNetCents: 1_800_000,
          accountingEntryId,
          accountingEntryStatus: 'VALIDATED',
          reconciledAt: '2026-08-12T10:00:00.000Z',
          reconciledByTwentyUserId: 'twenty-user-1',
        },
      }).reconciliation,
    ).toMatchObject({ kind: 'PAYROLL_RETURN' });
  });
});
