import {
  buildBankStatementAccountingEntryPath,
  parseBankStatementReturnPath,
} from './bankStatementAccountingNavigation';

const entryId = 'a1000000-0000-4000-8000-000000000001';
const statementId = 'a1000000-0000-4000-8000-000000000002';
const lineId = 'a1000000-0000-4000-8000-000000000003';

describe('bank statement accounting navigation', () => {
  it('builds a detail route with a canonical bank return path', () => {
    const path = buildBankStatementAccountingEntryPath({
      accountingEntryId: entryId,
      statementId,
      lineId,
    });
    const url = new URL(path, 'https://zowka.local');

    expect(url.pathname).toBe(`/erp-maroc/accounting/entries/${entryId}`);
    expect(parseBankStatementReturnPath(url.searchParams.get('returnTo'))).toBe(
      `/erp-maroc/bank-statements?statementId=${statementId}&lineId=${lineId}`,
    );
  });

  it.each([
    'https://example.com/erp-maroc/bank-statements',
    '//example.com/erp-maroc/bank-statements',
    '/erp-maroc/invoices?statementId=x&lineId=y',
    '/erp-maroc/bank-statements?statementId=x&lineId=y',
  ])('rejects an unsafe return target: %s', (target) => {
    expect(parseBankStatementReturnPath(target)).toBeNull();
  });
});
