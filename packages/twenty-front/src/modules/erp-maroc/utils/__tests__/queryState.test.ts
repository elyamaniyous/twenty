import {
  canonicalizeErpQueryState,
  updateErpQueryState,
} from '@/erp-maroc/utils/queryState';

const tierId = '123e4567-e89b-12d3-a456-426614174000';
const invoiceId = '550e8400-e29b-41d4-a716-446655440000';
const cursor = '0193f6ea-7c39-7aa2-8000-000000000000';
const nextCursor = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
const companyId = '263c4b43-2642-4f13-928c-f9d397340d3d';
const opportunityId = 'c098d723-02ab-4dc0-a49b-ae6f3eff97e9';

describe('ERP Maroc query state utilities', () => {
  it('keeps only operation-specific parameters and allowed values', () => {
    const result = canonicalizeErpQueryState(
      'products',
      new URLSearchParams(
        'unknown=value&cursor=not-allowed&active=inactive&search=%20acier%20',
      ),
    );

    expect(result.toString()).toBe('search=acier&active=inactive');
  });

  it('removes known keys whose values are not allowed for the operation', () => {
    const result = canonicalizeErpQueryState(
      'quotes',
      new URLSearchParams(`status=PAID&tierId=${tierId}`),
    );

    expect(result.toString()).toBe(`tierId=${tierId}`);
  });

  it('keeps contract-valid UUID query parameters, including UUID v7', () => {
    expect(
      canonicalizeErpQueryState(
        'payments',
        `tierId=${tierId}&invoiceId=${invoiceId}&cursor=${cursor}`,
      ).toString(),
    ).toBe(`tierId=${tierId}&invoiceId=${invoiceId}&cursor=${cursor}`);
  });

  it.each([
    ['quotes', 'tierId'],
    ['payments', 'tierId'],
    ['payments', 'invoiceId'],
    ['invoices', 'cursor'],
    ['payments', 'cursor'],
    ['reminders', 'cursor'],
  ] as const)('drops a malformed UUID for %s.%s', (operation, key) => {
    expect(
      canonicalizeErpQueryState(operation, `${key}=not-a-uuid`).toString(),
    ).toBe('');
  });

  it('omits defaults and empty values', () => {
    const result = canonicalizeErpQueryState(
      'invoices',
      new URLSearchParams('status=all&delivery=all&limit=50&cursor=&extra=1'),
    );

    expect(result.toString()).toBe('');
  });

  it.each([
    ['025', 'limit=25'],
    ['050', ''],
    ['001', 'limit=1'],
    ['100', 'limit=100'],
    ['000', ''],
    ['101', ''],
    ['-1', ''],
    ['1.5', ''],
  ])('normalizes and validates limit=%s', (limit, expected) => {
    expect(
      canonicalizeErpQueryState('invoices', `limit=${limit}`).toString(),
    ).toBe(expected);
  });

  it('clears the cursor when a filter changes', () => {
    const result = updateErpQueryState(
      'invoices',
      new URLSearchParams(`status=SENT&cursor=${cursor}&limit=25`),
      { status: 'VALIDATED' },
    );

    expect(result.toString()).toBe('status=VALIDATED&limit=25');
  });

  it('preserves filters when only the cursor changes', () => {
    const result = updateErpQueryState(
      'payments',
      new URLSearchParams(
        `status=PENDING_ALLOCATION&kind=RECEIPT&cursor=${cursor}`,
      ),
      { cursor: nextCursor },
    );

    expect(result.toString()).toBe(
      `status=PENDING_ALLOCATION&kind=RECEIPT&cursor=${nextCursor}`,
    );
  });

  it('drops both payment date boundaries when the range is reversed', () => {
    const result = canonicalizeErpQueryState(
      'payments',
      'status=POSTED&from=2024-03-01&to=2024-02-29',
    );

    expect(result.toString()).toBe('status=POSTED');
  });

  it('serializes credit-note query state in canonical deterministic order', () => {
    expect(
      canonicalizeErpQueryState(
        'creditNotes',
        `limit=25&to=2024-02-29&cursor=${cursor}&invoiceId=${invoiceId}&from=2024-02-01&tierId=${tierId}&status=VALIDATED`,
      ).toString(),
    ).toBe(
      `status=VALIDATED&tierId=${tierId}&invoiceId=${invoiceId}&from=2024-02-01&to=2024-02-29&cursor=${cursor}&limit=25`,
    );
  });

  it.each(['tierId', 'invoiceId', 'cursor'] as const)(
    'drops a malformed credit-note UUID for %s',
    (key) => {
      expect(
        canonicalizeErpQueryState(
          'creditNotes',
          `${key}=not-a-uuid`,
        ).toString(),
      ).toBe('');
    },
  );

  it('drops both credit-note date boundaries when the range is reversed', () => {
    expect(
      canonicalizeErpQueryState(
        'creditNotes',
        'status=DRAFT&from=2024-03-01&to=2024-02-29',
      ).toString(),
    ).toBe('status=DRAFT');
  });

  it('normalizes accounting report filters and account codes', () => {
    expect(
      canonicalizeErpQueryState(
        'accountingGrandLivre',
        'includeDraft=true&to=2026-07-31&accountCode=%203421%20&from=2026-07-01',
      ).toString(),
    ).toBe('accountCode=3421&from=2026-07-01&to=2026-07-31&includeDraft=true');
    expect(
      canonicalizeErpQueryState(
        'accountingBalance',
        'includeDraft=false&from=2026-07-31&to=2026-07-01',
      ).toString(),
    ).toBe('');
    expect(
      canonicalizeErpQueryState(
        'accountingLettrage',
        'unknown=x&accountCode=%203421%20',
      ).toString(),
    ).toBe('accountCode=3421');
  });

  it('clears the credit-note cursor for filter changes and preserves it for semantic no-ops', () => {
    const current = `status=DRAFT&tierId=${tierId}&cursor=${cursor}`;

    expect(
      updateErpQueryState('creditNotes', current, {
        status: 'VALIDATED',
      }).toString(),
    ).toBe(`status=VALIDATED&tierId=${tierId}`);

    expect(
      updateErpQueryState('creditNotes', current, { status: 'DRAFT' }).get(
        'cursor',
      ),
    ).toBe(cursor);
  });

  it.each([
    ['canonical limit', 'limit=25', { limit: '025' }],
    ['absent default', '', { status: 'all' }],
  ])('keeps the cursor for a semantic no-op: %s', (_name, filters, changes) => {
    const current = [filters, `cursor=${cursor}`].filter(Boolean).join('&');

    expect(
      updateErpQueryState('invoices', current, changes).get('cursor'),
    ).toBe(cursor);
  });

  it('treats a trimmed search change as a semantic no-op', () => {
    expect(
      updateErpQueryState('products', 'search=acier', {
        search: ' acier ',
      }).toString(),
    ).toBe('search=acier');
  });

  it('serializes parameters in deterministic operation order', () => {
    const result = canonicalizeErpQueryState(
      'payments',
      new URLSearchParams(
        `limit=25&to=2024-02-29&from=2024-02-01&invoiceId=${invoiceId}&tierId=${tierId}&method=CASH&kind=RECEIPT&status=POSTED&cursor=${cursor}`,
      ),
    );

    expect(result.toString()).toBe(
      `status=POSTED&kind=RECEIPT&method=CASH&tierId=${tierId}&invoiceId=${invoiceId}&from=2024-02-01&to=2024-02-29&cursor=${cursor}&limit=25`,
    );
  });

  it('preserves canonical tier resume identifiers after existing filters', () => {
    expect(
      canonicalizeErpQueryState(
        'tiers',
        `active=active&syncCompanyId=bad&syncCompanyId=${companyId}&resumeOpportunityId=${opportunityId}&unknown=x`,
      ).toString(),
    ).toBe(
      `active=active&syncCompanyId=${companyId}&resumeOpportunityId=${opportunityId}`,
    );
  });

  it('preserves a canonical quote resume identifier after existing filters', () => {
    expect(
      canonicalizeErpQueryState(
        'quotes',
        `resumeOpportunityId=bad&status=DRAFT&tierId=${tierId}&resumeOpportunityId=${opportunityId}`,
      ).toString(),
    ).toBe(
      `status=DRAFT&tierId=${tierId}&resumeOpportunityId=${opportunityId}`,
    );
  });

  it.each([
    ['tiers', 'syncCompanyId'],
    ['tiers', 'resumeOpportunityId'],
    ['quotes', 'resumeOpportunityId'],
  ] as const)('drops an invalid resume UUID for %s.%s', (operation, key) => {
    expect(
      canonicalizeErpQueryState(operation, `${key}=not-a-uuid`).toString(),
    ).toBe('');
  });
});
