import type {
  ErpAccountingEntry,
  ErpLettrageMatch,
} from 'twenty-shared/erp-maroc';

export const findSupplierPaymentLinePair = (
  supplierInvoiceEntry: ErpAccountingEntry,
  supplierPaymentEntry: ErpAccountingEntry,
  accountCode: string,
) => {
  if (
    supplierInvoiceEntry.status !== 'VALIDATED' ||
    supplierInvoiceEntry.sourceType !== 'SUPPLIER_INVOICE' ||
    supplierPaymentEntry.status !== 'VALIDATED' ||
    supplierPaymentEntry.sourceType !== 'SUPPLIER_PAYMENT'
  ) {
    return null;
  }

  const creditLine = supplierInvoiceEntry.lines?.find(
    (line) =>
      line.accountCode === accountCode &&
      line.creditCents > 0 &&
      line.debitCents === 0,
  );
  const debitLine = supplierPaymentEntry.lines?.find(
    (line) =>
      line.accountCode === accountCode &&
      line.debitCents > 0 &&
      line.creditCents === 0,
  );

  if (
    creditLine === undefined ||
    debitLine === undefined ||
    creditLine.creditCents !== debitLine.debitCents
  ) {
    return null;
  }

  return { creditLineId: creditLine.id, debitLineId: debitLine.id };
};

export const findSupplierPaymentLettering = (
  matches: readonly ErpLettrageMatch[],
  supplierInvoiceId: string,
  supplierPaymentPreparationId: string,
) =>
  matches.find((match) => {
    const hasSupplierInvoice = match.lines.some(
      (line) =>
        line.sourceType === 'SUPPLIER_INVOICE' &&
        line.sourceId === supplierInvoiceId,
    );
    const hasSupplierPayment = match.lines.some(
      (line) =>
        line.sourceType === 'SUPPLIER_PAYMENT' &&
        line.sourceId === supplierPaymentPreparationId,
    );

    return hasSupplierInvoice && hasSupplierPayment;
  }) ?? null;
