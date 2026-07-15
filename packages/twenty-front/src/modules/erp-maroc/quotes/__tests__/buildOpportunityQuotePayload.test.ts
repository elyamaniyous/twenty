import { buildOpportunityQuotePayload } from '@/erp-maroc/quotes/buildOpportunityQuotePayload';

const opportunity = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Renouvellement annuel',
  amount: {
    amountMicros: 12_340_000,
    currencyCode: 'MAD',
  },
  companyId: '22222222-2222-4222-8222-222222222222',
  pointOfContactId: '33333333-3333-4333-8333-333333333333',
  company: { name: 'Atlas SARL' },
  pointOfContact: { name: { firstName: 'Nadia', lastName: 'Alami' } },
};

const linkedTier = {
  id: '44444444-4444-4444-8444-444444444444',
  twentyCompanyId: opportunity.companyId,
};

describe('buildOpportunityQuotePayload', () => {
  it('builds the exact MAD payload when the company has a linked tier', () => {
    expect(buildOpportunityQuotePayload(opportunity, [linkedTier])).toEqual({
      status: 'ready',
      tierId: linkedTier.id,
      payload: {
        twentyOpportunityId: opportunity.id,
        twentyCompanyId: opportunity.companyId,
        twentyPersonId: opportunity.pointOfContactId,
        title: opportunity.name,
        estimatedAmount: 12.34,
        currency: 'MAD',
      },
    });
  });

  it('tolerates absent relation labels because only relation IDs are authoritative', () => {
    const {
      company: _company,
      pointOfContact: _person,
      ...withoutLabels
    } = opportunity;

    expect(
      buildOpportunityQuotePayload(withoutLabels, [linkedTier]).status,
    ).toBe('ready');
  });

  it('returns a canonical resumable tier-sync route when no tier is linked', () => {
    expect(buildOpportunityQuotePayload(opportunity, [])).toEqual({
      status: 'needs-tier-sync',
      companyId: opportunity.companyId,
      resumeOpportunityId: opportunity.id,
      route:
        '/erp-maroc/tiers?syncCompanyId=22222222-2222-4222-8222-222222222222&resumeOpportunityId=11111111-1111-4111-8111-111111111111',
    });
  });

  it('encodes tier-sync query parameters with URLSearchParams', () => {
    const result = buildOpportunityQuotePayload(
      {
        ...opportunity,
        id: 'opportunity/id?next=1',
        companyId: 'company id&source=crm',
      },
      [],
    );

    expect(result).toEqual({
      status: 'needs-tier-sync',
      companyId: 'company id&source=crm',
      resumeOpportunityId: 'opportunity/id?next=1',
      route:
        '/erp-maroc/tiers?syncCompanyId=company+id%26source%3Dcrm&resumeOpportunityId=opportunity%2Fid%3Fnext%3D1',
    });
  });

  it.each([
    ['twentyOpportunityId', { id: '  ' }],
    ['twentyCompanyId', { companyId: null }],
    ['twentyCompanyId', { companyId: '  ' }],
    ['twentyPersonId', { pointOfContactId: null }],
    ['twentyPersonId', { pointOfContactId: '  ' }],
    ['amount', { amount: null }],
    ['currency', { amount: { amountMicros: 12_340_000, currencyCode: 'EUR' } }],
  ])('blocks invalid %s source data', (field, override) => {
    const result = buildOpportunityQuotePayload(
      { ...opportunity, ...override },
      [linkedTier],
    );

    expect(result).toEqual({
      status: 'blocked',
      errors: expect.arrayContaining([expect.objectContaining({ field })]),
    });
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, -10_000, 1_005_000])(
    'blocks amountMicros %p when it cannot become exact MAD cents',
    (amountMicros) => {
      const result = buildOpportunityQuotePayload(
        { ...opportunity, amount: { amountMicros, currencyCode: 'MAD' } },
        [linkedTier],
      );

      expect(result).toEqual({
        status: 'blocked',
        errors: [expect.objectContaining({ field: 'amount' })],
      });
    },
  );

  it('blocks unsafe amountMicros values', () => {
    const result = buildOpportunityQuotePayload(
      {
        ...opportunity,
        amount: {
          amountMicros: Number.MAX_SAFE_INTEGER + 1,
          currencyCode: 'MAD',
        },
      },
      [linkedTier],
    );

    expect(result).toEqual({
      status: 'blocked',
      errors: [expect.objectContaining({ field: 'amount' })],
    });
  });
});
