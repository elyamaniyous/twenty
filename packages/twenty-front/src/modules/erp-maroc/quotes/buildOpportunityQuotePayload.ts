import { parseMadDecimalToTransportNumber } from '@/erp-maroc/utils/money';

import type { ErpTier } from 'twenty-shared/erp-maroc';

export type TwentyOpportunityRecord = {
  id: string;
  name: string;
  amount: {
    amountMicros: number;
    currencyCode: string;
  } | null;
  companyId: string | null;
  pointOfContactId: string | null;
  company?: { name?: string | null } | null;
  pointOfContact?: {
    name?:
      | string
      | { firstName?: string | null; lastName?: string | null }
      | null;
  } | null;
};

export type OpportunityQuotePayload = {
  twentyOpportunityId: string;
  twentyCompanyId: string;
  twentyPersonId: string;
  title: string;
  estimatedAmount: number;
  currency: 'MAD';
};

export type OpportunityQuotePayloadError = {
  field:
    | 'twentyOpportunityId'
    | 'twentyCompanyId'
    | 'twentyPersonId'
    | 'amount'
    | 'currency';
  code: string;
  message: string;
};

export type OpportunityQuotePayloadResult =
  | {
      status: 'blocked';
      errors: OpportunityQuotePayloadError[];
    }
  | {
      status: 'needs-tier-sync';
      companyId: string;
      resumeOpportunityId: string;
      route: string;
    }
  | {
      status: 'ready';
      tierId: string;
      payload: OpportunityQuotePayload;
    };

type LinkedTier = Pick<ErpTier, 'id' | 'twentyCompanyId'>;

const isBlank = (value: string | null) =>
  value === null || value.trim().length === 0;

const makeError = (
  field: OpportunityQuotePayloadError['field'],
  code: string,
  message: string,
): OpportunityQuotePayloadError => ({ field, code, message });

export const buildOpportunityQuotePayload = (
  opportunity: TwentyOpportunityRecord,
  tiers: readonly LinkedTier[],
): OpportunityQuotePayloadResult => {
  const errors: OpportunityQuotePayloadError[] = [];

  if (isBlank(opportunity.id)) {
    errors.push(
      makeError(
        'twentyOpportunityId',
        'OPPORTUNITY_REQUIRED',
        "L'opportunité Twenty est requise.",
      ),
    );
  }

  if (isBlank(opportunity.companyId)) {
    errors.push(
      makeError(
        'twentyCompanyId',
        'COMPANY_REQUIRED',
        'Une société Twenty est requise.',
      ),
    );
  }

  if (isBlank(opportunity.pointOfContactId)) {
    errors.push(
      makeError(
        'twentyPersonId',
        'CONTACT_REQUIRED',
        'Un contact Twenty est requis.',
      ),
    );
  }

  let estimatedAmount: number | null = null;

  if (opportunity.amount === null) {
    errors.push(
      makeError('amount', 'AMOUNT_REQUIRED', 'Un montant estimé est requis.'),
    );
  } else {
    if (opportunity.amount.currencyCode !== 'MAD') {
      errors.push(
        makeError(
          'currency',
          'CURRENCY_MUST_BE_MAD',
          'Le montant doit être en MAD.',
        ),
      );
    }

    const { amountMicros } = opportunity.amount;
    if (
      !Number.isFinite(amountMicros) ||
      !Number.isSafeInteger(amountMicros) ||
      amountMicros < 0 ||
      amountMicros % 10_000 !== 0
    ) {
      errors.push(
        makeError(
          'amount',
          'AMOUNT_MUST_BE_EXACT_CENTS',
          'Le montant doit représenter un nombre exact de centimes MAD.',
        ),
      );
    } else {
      try {
        estimatedAmount = parseMadDecimalToTransportNumber(
          String(amountMicros / 1_000_000),
        );
      } catch {
        errors.push(
          makeError(
            'amount',
            'AMOUNT_TRANSPORT_UNSAFE',
            'Le montant ne peut pas être transporté exactement.',
          ),
        );
      }
    }
  }

  if (errors.length > 0 || estimatedAmount === null) {
    return { status: 'blocked', errors };
  }

  const companyId = opportunity.companyId as string;
  const opportunityId = opportunity.id;
  const linkedTier = tiers.find((tier) => tier.twentyCompanyId === companyId);

  if (linkedTier === undefined) {
    const query = new URLSearchParams();
    query.set('syncCompanyId', companyId);
    query.set('resumeOpportunityId', opportunityId);

    return {
      status: 'needs-tier-sync',
      companyId,
      resumeOpportunityId: opportunityId,
      route: `/erp-maroc/tiers?${query.toString()}`,
    };
  }

  return {
    status: 'ready',
    tierId: linkedTier.id,
    payload: {
      twentyOpportunityId: opportunityId,
      twentyCompanyId: companyId,
      twentyPersonId: opportunity.pointOfContactId as string,
      title: opportunity.name,
      estimatedAmount,
      currency: 'MAD',
    },
  };
};
