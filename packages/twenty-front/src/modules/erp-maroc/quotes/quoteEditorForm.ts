import {
  type ErpLineItemDraft,
  type ErpTvaRate,
} from '@/erp-maroc/components/ErpLineItemEditor';
import { centsToMadDecimalString } from '@/erp-maroc/utils/money';
import type { ErpQuote } from 'twenty-shared/erp-maroc';

import type { QuoteFormValues } from './quoteFormSchema';

export type QuoteEditorFormValues = Omit<QuoteFormValues, 'lines'> & {
  lines: ErpLineItemDraft[];
};

const toCivilDateFromInstant = (now: Date) =>
  `${String(now.getFullYear()).padStart(4, '0')}-${String(
    now.getMonth() + 1,
  ).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

export const createEmptyQuoteEditorValues = (
  now: Date,
): QuoteEditorFormValues => ({
  tierId: '',
  title: '',
  currency: 'MAD',
  issueDate: toCivilDateFromInstant(now),
  validUntil: null,
  notes: null,
  lines: [
    {
      id: 'quote-line-new-1',
      productId: null,
      description: '',
      unit: null,
      quantity: '1',
      unitPriceHt: '0.00',
      tvaRate: 20,
    },
  ],
});

export const mapQuoteToEditorValues = (
  quote: ErpQuote,
): QuoteEditorFormValues => ({
  tierId: quote.tierId,
  title: quote.title,
  currency: quote.currency,
  issueDate: quote.issueDate,
  validUntil: quote.validUntil,
  notes: quote.notes,
  lines: quote.lines.map((line) => ({
    id: line.id,
    productId: line.productId,
    description: line.description,
    unit: line.unit,
    quantity: String(line.quantity),
    unitPriceHt: centsToMadDecimalString(line.unitPriceHtCents),
    tvaRate: line.tvaRate as ErpTvaRate,
  })),
});
