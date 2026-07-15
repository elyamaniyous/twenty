import type { ErpContext, ErpQuote } from 'twenty-shared/erp-maroc';

export type QuoteCommandPolicyInput = {
  role: ErpContext['role'];
  manageSalesDocuments: boolean;
  status: ErpQuote['status'];
  lineCount: number;
  convertedInvoiceId: string | null;
};

export type QuoteCommandPolicy = {
  manualCreate: boolean;
  edit: boolean;
  save: boolean;
  send: boolean;
  accept: boolean;
  reject: boolean;
  convert: boolean;
};

const linkedRoles: ReadonlySet<ErpContext['role']> = new Set([
  'OWNER',
  'ADMIN',
  'COMPTABLE',
  'COMMERCIAL',
]);

const noCommands: QuoteCommandPolicy = {
  manualCreate: false,
  edit: false,
  save: false,
  send: false,
  accept: false,
  reject: false,
  convert: false,
};

export const getQuoteCommandPolicy = ({
  role,
  manageSalesDocuments,
  status,
  lineCount,
  convertedInvoiceId,
}: QuoteCommandPolicyInput): QuoteCommandPolicy => {
  if (!manageSalesDocuments || !linkedRoles.has(role)) {
    return { ...noCommands };
  }

  const isDraft = status === 'DRAFT';
  const isSent = status === 'SENT';
  const hasLines =
    Number.isFinite(lineCount) && Number.isInteger(lineCount) && lineCount > 0;

  return {
    manualCreate: true,
    edit: isDraft,
    save: isDraft,
    send: isDraft && hasLines,
    accept: isSent,
    reject: isSent,
    convert: status === 'ACCEPTED' && convertedInvoiceId === null,
  };
};
