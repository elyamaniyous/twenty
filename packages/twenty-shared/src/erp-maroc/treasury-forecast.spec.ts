import { describe, expect, it } from '@jest/globals';

import { erpTreasuryForecastSchema } from './erp-maroc-contracts';

describe('erpTreasuryForecastSchema', () => {
  it('parses a complete explainable forecast', () => {
    const result = erpTreasuryForecastSchema.parse({
      asOf: '2026-07-20',
      horizonEnd: '2026-10-18',
      currency: 'MAD',
      currentCashCents: 100_000,
      dataQuality: {
        bankAccountCount: 1,
        confirmedBankAccountCount: 1,
        usesOpeningBalance: false,
        eventCount: 1,
      },
      aging: {
        receivables: {
          totalCents: 50_000,
          notDueCents: 50_000,
          days1To30Cents: 0,
          days31To60Cents: 0,
          days61To90Cents: 0,
          over90DaysCents: 0,
        },
        payables: {
          totalCents: 0,
          notDueCents: 0,
          days1To30Cents: 0,
          days31To60Cents: 0,
          days61To90Cents: 0,
          over90DaysCents: 0,
        },
      },
      scenarios: [
        {
          code: 'BASE',
          label: 'Normal',
          assumptions: {
            inflowRateBasisPoints: 8_500,
            inflowDelayDays: 7,
            outflowRateBasisPoints: 10_000,
          },
          closingBalanceCents: 142_500,
          minimumBalanceCents: 100_000,
          firstNegativeWeek: null,
          weeks: [
            {
              index: 1,
              startDate: '2026-07-20',
              endDate: '2026-07-26',
              openingBalanceCents: 100_000,
              inflowCents: 0,
              outflowCents: 0,
              netCashFlowCents: 0,
              closingBalanceCents: 100_000,
              eventCount: 0,
            },
          ],
        },
      ],
      events: [
        {
          id: 'invoice:1',
          sourceType: 'CUSTOMER_INVOICE',
          direction: 'INFLOW',
          dueDate: '2026-07-20',
          label: 'FAC-1',
          counterparty: 'Client',
          amountCents: 50_000,
        },
      ],
      alerts: [],
      actions: [
        {
          code: 'RECONCILE_BANK',
          label: 'Mettre à jour la banque',
          description: 'Importer le dernier relevé.',
          priority: 'LOW',
          amountCents: 0,
        },
      ],
      insights: ['Prévision disponible.'],
    });

    expect(result.scenarios[0].code).toBe('BASE');
  });
});
