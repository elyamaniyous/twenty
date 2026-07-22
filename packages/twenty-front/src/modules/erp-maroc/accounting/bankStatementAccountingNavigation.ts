import { erpMarocPaths } from '../navigation/erpMarocPaths';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const buildBankStatementAccountingEntryPath = (input: {
  accountingEntryId: string;
  statementId: string;
  lineId: string;
}) => {
  const returnQuery = new URLSearchParams({
    statementId: input.statementId,
    lineId: input.lineId,
  });
  const returnTo = `${erpMarocPaths.bankStatements}?${returnQuery.toString()}`;
  const entryQuery = new URLSearchParams({ returnTo });
  return `${erpMarocPaths.accountingEntries}/${input.accountingEntryId}?${entryQuery.toString()}`;
};

export const parseBankStatementReturnPath = (
  input: string | null,
): string | null => {
  if (input === null) return null;
  try {
    const base = new URL('https://zowka.local');
    const target = new URL(input, base);
    const statementId = target.searchParams.get('statementId');
    const lineId = target.searchParams.get('lineId');
    if (
      target.origin !== base.origin ||
      target.pathname !== erpMarocPaths.bankStatements ||
      statementId === null ||
      lineId === null ||
      !UUID_PATTERN.test(statementId) ||
      !UUID_PATTERN.test(lineId)
    ) {
      return null;
    }
    return `${erpMarocPaths.bankStatements}?${new URLSearchParams({
      statementId,
      lineId,
    }).toString()}`;
  } catch {
    return null;
  }
};
