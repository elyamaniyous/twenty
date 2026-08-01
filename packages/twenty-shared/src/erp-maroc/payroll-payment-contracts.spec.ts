import {
  erpPayrollPaymentBatchNullableSchema,
  erpPayrollPaymentBatchSchema,
  erpPayrollPaymentExportSchema,
} from './erp-maroc-contracts';

const batch = {
  id: '11111111-1111-4111-8111-111111111111',
  periodKey: '2026-07',
  status: 'READY',
  plannedPaymentDate: '2026-08-03T00:00:00.000Z',
  employeeCount: 3,
  totalNetCents: 2_500_000,
  filename: 'VIREMENTS-SALAIRES-2026-07.csv',
  payloadSha256: 'a'.repeat(64),
  preparedAt: '2026-08-01T09:00:00.000Z',
  preparedByTwentyUserId: 'payroll-manager',
  executedAt: null,
  executedByTwentyUserId: null,
  paymentDate: null,
  bankReference: null,
  createdAt: '2026-08-01T09:00:00.000Z',
  updatedAt: '2026-08-01T09:00:00.000Z',
};

describe('payroll payment contracts', () => {
  it('parses a ready monthly payment batch and explicit absence', () => {
    expect(erpPayrollPaymentBatchSchema.parse(batch)).toMatchObject({
      status: 'READY',
      plannedPaymentDate: '2026-08-03',
      employeeCount: 3,
    });
    expect(erpPayrollPaymentBatchNullableSchema.parse(null)).toBeNull();
  });

  it('parses the integrity-protected bank export', () => {
    expect(
      erpPayrollPaymentExportSchema.parse({
        batchId: batch.id,
        filename: batch.filename,
        contentType: 'text/csv; charset=utf-8',
        content: 'csv',
        payloadSha256: batch.payloadSha256,
        employeeCount: batch.employeeCount,
        totalNetCents: batch.totalNetCents,
        plannedPaymentDate: batch.plannedPaymentDate,
      }),
    ).toMatchObject({
      batchId: batch.id,
      plannedPaymentDate: '2026-08-03',
    });
  });

  it('rejects an invalid payload fingerprint', () => {
    expect(() =>
      erpPayrollPaymentBatchSchema.parse({
        ...batch,
        payloadSha256: 'not-a-sha256',
      }),
    ).toThrow();
  });
});
