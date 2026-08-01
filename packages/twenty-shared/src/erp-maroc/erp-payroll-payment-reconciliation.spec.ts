import {
  erpBankStatementLineSchema,
  erpPayrollPaymentReconciliationSchema,
} from './erp-maroc-contracts';

const batchId = '11111111-1111-4111-8111-111111111111';
const statementId = '22222222-2222-4222-8222-222222222222';
const lineId = '33333333-3333-4333-8333-333333333333';
const bankAccountId = '44444444-4444-4444-8444-444444444444';
const accountingEntryId = '55555555-5555-4555-8555-555555555555';

const bankLine = {
  id: lineId,
  statementImportId: statementId,
  transactionDate: '2026-08-03T00:00:00.000Z',
  valueDate: null,
  description: 'Remise salaires juillet',
  reference: 'REM-PAIE-2026-07',
  debitCents: 1_800_000,
  bankAccount: {
    id: bankAccountId,
    name: 'Compte principal',
    bankName: 'Banque Zowka',
    accountingAccountCode: '5141',
  },
};

describe('payroll payment reconciliation contract', () => {
  it('normalizes and accepts complete reconciled evidence', () => {
    expect(
      erpPayrollPaymentReconciliationSchema.parse({
        batchId,
        periodKey: '2026-07',
        status: 'RECONCILED',
        totalNetCents: 1_800_000,
        totalReconciledCents: 1_800_000,
        differenceCents: 0,
        reconciledAt: '2026-08-03T10:00:00.000Z',
        reconciledByTwentyUserId: 'twenty-user-1',
        settlementAccountingEntryId: accountingEntryId,
        settlementAccountingEntryStatus: 'VALIDATED',
        lines: [bankLine],
        candidates: [],
      }),
    ).toMatchObject({
      status: 'RECONCILED',
      differenceCents: 0,
      lines: [{ transactionDate: '2026-08-03' }],
    });
  });

  it('rejects incomplete evidence and inconsistent differences', () => {
    const result = erpPayrollPaymentReconciliationSchema.safeParse({
      batchId,
      periodKey: '2026-07',
      status: 'UNRECONCILED',
      totalNetCents: 1_800_000,
      totalReconciledCents: 0,
      differenceCents: 1,
      reconciledAt: null,
      reconciledByTwentyUserId: null,
      settlementAccountingEntryId: null,
      settlementAccountingEntryStatus: null,
      lines: [],
      candidates: [],
    });

    expect(result.success).toBe(false);
  });

  it('represents payroll settlement evidence on a bank statement line', () => {
    expect(
      erpBankStatementLineSchema.parse({
        id: lineId,
        position: 0,
        pageNumber: 1,
        transactionDate: '2026-08-03',
        valueDate: null,
        description: 'Remise salaires juillet',
        reference: 'REM-PAIE-2026-07',
        debitCents: 1_800_000,
        creditCents: 0,
        balanceCents: 4_200_000,
        confidenceBasisPoints: 10_000,
        needsReview: false,
        sourceText: 'Remise salaires juillet',
        boundingBox: null,
        review: null,
        reconciliation: {
          kind: 'PAYROLL',
          payrollPaymentBatchId: batchId,
          periodKey: '2026-07',
          paymentDate: '2026-08-03',
          bankReference: 'REM-PAIE-2026-07',
          totalNetCents: 1_800_000,
          accountingEntryId,
          accountingEntryStatus: 'VALIDATED',
          reconciledAt: '2026-08-03T10:00:00.000Z',
          reconciledByTwentyUserId: 'twenty-user-1',
        },
      }).reconciliation,
    ).toMatchObject({
      kind: 'PAYROLL',
      accountingEntryStatus: 'VALIDATED',
    });
  });
});
