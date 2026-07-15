import type { ErpEligibleInvoice } from 'twenty-shared/erp-maroc';

import { parseCivilDate } from '@/erp-maroc/utils/civilDate';

export type PaymentAllocation = Readonly<{
  invoiceId: string;
  amountCents: number;
}>;

export type AllocatableInvoice = Readonly<
  Pick<ErpEligibleInvoice, 'id' | 'dueDate' | 'outstandingCents' | 'isOverdue'>
>;

type SortedInvoice = Readonly<{
  invoice: AllocatableInvoice;
  validDueDate: string | null;
}>;

const isNonNegativeSafeInteger = (amount: number): boolean =>
  Number.isSafeInteger(amount) && amount >= 0;

const isPositiveSafeInteger = (amount: number): boolean =>
  Number.isSafeInteger(amount) && amount > 0;

const compareStrings = (left: string, right: string): number => {
  if (left === right) {
    return 0;
  }

  return left < right ? -1 : 1;
};

const getValidCivilDate = (value: string): string | null => {
  try {
    parseCivilDate(value);
    return value;
  } catch {
    return null;
  }
};

const compareInvoices = (left: SortedInvoice, right: SortedInvoice): number => {
  if (left.invoice.isOverdue !== right.invoice.isOverdue) {
    return left.invoice.isOverdue ? -1 : 1;
  }

  if (left.validDueDate !== null && right.validDueDate !== null) {
    const dueDateComparison = compareStrings(
      left.validDueDate,
      right.validDueDate,
    );

    if (dueDateComparison !== 0) {
      return dueDateComparison;
    }
  } else if (left.validDueDate !== right.validDueDate) {
    return left.validDueDate === null ? 1 : -1;
  }

  return compareStrings(left.invoice.id, right.invoice.id);
};

export const allocationTotal = (
  allocations: readonly PaymentAllocation[],
): number => {
  let total = 0;

  for (const { amountCents } of allocations) {
    if (!isNonNegativeSafeInteger(amountCents)) {
      continue;
    }

    if (amountCents > Number.MAX_SAFE_INTEGER - total) {
      continue;
    }

    total += amountCents;
  }

  return total;
};

export const remainingAmount = (
  paymentCents: number,
  allocations: readonly PaymentAllocation[],
): number => {
  if (!isNonNegativeSafeInteger(paymentCents)) {
    return 0;
  }

  return Math.max(0, paymentCents - allocationTotal(allocations));
};

export const buildSuggestedAllocations = (
  paymentCents: number,
  invoices: readonly AllocatableInvoice[],
): readonly PaymentAllocation[] => {
  if (!isPositiveSafeInteger(paymentCents)) {
    return Object.freeze([]);
  }

  const orderedInvoices = invoices
    .filter(({ outstandingCents }) =>
      isNonNegativeSafeInteger(outstandingCents),
    )
    .map((invoice) => {
      return {
        invoice,
        validDueDate: getValidCivilDate(invoice.dueDate),
      };
    })
    .sort(compareInvoices);
  const suggestions: PaymentAllocation[] = [];
  const allocatedInvoiceIds = new Set<string>();
  let remaining = paymentCents;

  for (const { invoice } of orderedInvoices) {
    if (remaining === 0) {
      break;
    }

    if (allocatedInvoiceIds.has(invoice.id) || invoice.outstandingCents === 0) {
      continue;
    }

    const amountCents = Math.min(remaining, invoice.outstandingCents);

    suggestions.push(Object.freeze({ invoiceId: invoice.id, amountCents }));
    allocatedInvoiceIds.add(invoice.id);
    remaining -= amountCents;
  }

  return Object.freeze(suggestions);
};

export const isAllocationComplete = (
  paymentCents: number,
  allocations: readonly PaymentAllocation[],
  eligibleInvoices: readonly AllocatableInvoice[],
): boolean => {
  if (!isPositiveSafeInteger(paymentCents)) {
    return false;
  }

  const invoicesById = new Map(
    eligibleInvoices.map((invoice) => [invoice.id, invoice]),
  );
  const allocatedInvoiceIds = new Set<string>();
  let totalCents = 0;

  for (const { invoiceId, amountCents } of allocations) {
    if (
      !isPositiveSafeInteger(amountCents) ||
      allocatedInvoiceIds.has(invoiceId)
    ) {
      return false;
    }

    const invoice = invoicesById.get(invoiceId);

    if (
      invoice === undefined ||
      !isNonNegativeSafeInteger(invoice.outstandingCents) ||
      amountCents > invoice.outstandingCents ||
      amountCents > paymentCents - totalCents
    ) {
      return false;
    }

    allocatedInvoiceIds.add(invoiceId);
    totalCents += amountCents;
  }

  return totalCents === paymentCents;
};
