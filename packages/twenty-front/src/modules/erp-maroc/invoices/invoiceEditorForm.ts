import type { ErpLineItemDraft } from '@/erp-maroc/components/ErpLineItemEditor';
import { centsToMadDecimalString } from '@/erp-maroc/utils/money';
import type { ErpInvoice } from 'twenty-shared/erp-maroc';

import type { InvoiceFormValues } from './invoiceFormSchema';

export type InvoiceEditorFormValues = Omit<InvoiceFormValues, 'lines'> & {
  lines: ErpLineItemDraft[];
};

const toCivilDate = (date: Date) =>
  `${String(date.getFullYear()).padStart(4, '0')}-${String(
    date.getMonth() + 1,
  ).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const addCivilDays = (now: Date, days: number) => {
  const date = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + days,
  );

  return toCivilDate(date);
};

export const createEmptyInvoiceEditorValues = (
  now: Date,
  paymentDelayDays = 30,
): InvoiceEditorFormValues => ({
  tierId: '',
  title: '',
  currency: 'MAD',
  issueDate: toCivilDate(now),
  dueDate: addCivilDays(now, paymentDelayDays),
  notes: null,
  paymentMethod: null,
  paymentReference: null,
  lines: [
    {
      id: 'invoice-line-new-1',
      productId: null,
      description: '',
      unit: null,
      quantity: '1',
      unitPriceHt: '0.00',
      tvaRate: 20,
    },
  ],
});

export const mapInvoiceToEditorValues = (
  invoice: ErpInvoice,
): InvoiceEditorFormValues => ({
  tierId: invoice.tierId,
  title: invoice.title,
  currency: invoice.currency,
  issueDate: invoice.issueDate,
  dueDate: invoice.dueDate,
  notes: invoice.notes,
  paymentMethod: invoice.paymentMethod,
  paymentReference: invoice.paymentReference,
  lines: invoice.lines.map((line) => ({
    id: line.id,
    productId: line.productId,
    description: line.description,
    unit: line.unit,
    quantity: String(line.quantity),
    unitPriceHt: centsToMadDecimalString(line.unitPriceHtCents),
    tvaRate: line.tvaRate as 0 | 7 | 10 | 14 | 20,
  })),
});
