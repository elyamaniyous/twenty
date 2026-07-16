import {
  findSupplierPaymentLettering,
  findSupplierPaymentLinePair,
} from '@/erp-maroc/purchase-orders/supplierPaymentLettering';
import type {
  ErpAccountingEntry,
  ErpLettrageLine,
  ErpLettrageMatch,
} from 'twenty-shared/erp-maroc';

const invoiceId = '11111111-1111-4111-8111-111111111111';
const paymentId = '22222222-2222-4222-8222-222222222222';

const line = (
  sourceType: ErpLettrageLine['sourceType'],
  sourceId: string,
  side: 'debit' | 'credit',
): ErpLettrageLine => ({
  lineId:
    side === 'debit'
      ? '33333333-3333-4333-8333-333333333333'
      : '44444444-4444-4444-8444-444444444444',
  entryId:
    side === 'debit'
      ? '55555555-5555-4555-8555-555555555555'
      : '66666666-6666-4666-8666-666666666666',
  entryDate: '2026-07-16',
  journalCode: side === 'debit' ? 'BQ' : 'AC',
  label: 'Règlement fournisseur',
  sourceType,
  sourceId,
  debitCents: side === 'debit' ? 120_000 : 0,
  creditCents: side === 'credit' ? 120_000 : 0,
});

const debitLine = line('SUPPLIER_PAYMENT', paymentId, 'debit');
const creditLine = line('SUPPLIER_INVOICE', invoiceId, 'credit');

const lettering: ErpLettrageMatch = {
  id: '77777777-7777-4777-8777-777777777777',
  reference: 'AA',
  accountId: '88888888-8888-4888-8888-888888888888',
  accountCode: '4411',
  matchedAt: '2026-07-16T12:00:00.000Z',
  matchedByTwentyUserId: 'twenty-user',
  unmatchedAt: null,
  unmatchedByTwentyUserId: null,
  lines: [debitLine, creditLine],
  totalDebitCents: 120_000,
  totalCreditCents: 120_000,
};

describe('supplier payment lettering', () => {
  const entry = (
    sourceType: ErpAccountingEntry['sourceType'],
    sourceId: string,
    accountingLine: ErpLettrageLine,
  ) =>
    ({
      status: 'VALIDATED',
      sourceType,
      sourceId,
      lines: [
        {
          id: accountingLine.lineId,
          accountId: lettering.accountId,
          accountCode: '4411',
          accountLabel: 'Fournisseurs',
          label: accountingLine.label,
          debitCents: accountingLine.debitCents,
          creditCents: accountingLine.creditCents,
          position: 0,
        },
      ],
    }) as ErpAccountingEntry;

  it('pairs the validated supplier entries even when their dates are far apart', () => {
    const invoiceEntry = entry('SUPPLIER_INVOICE', invoiceId, creditLine);
    const paymentEntry = entry('SUPPLIER_PAYMENT', paymentId, debitLine);

    expect(
      findSupplierPaymentLinePair(invoiceEntry, paymentEntry, '4411'),
    ).toEqual({
      creditLineId: creditLine.lineId,
      debitLineId: debitLine.lineId,
    });

    paymentEntry.lines![0].debitCents = 60_000;
    expect(
      findSupplierPaymentLinePair(invoiceEntry, paymentEntry, '4411'),
    ).toBeNull();
  });

  it('finds an active lettering containing both source documents', () => {
    expect(
      findSupplierPaymentLettering([lettering], invoiceId, paymentId),
    ).toBe(lettering);
    expect(
      findSupplierPaymentLettering(
        [lettering],
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        paymentId,
      ),
    ).toBeNull();
  });
});
