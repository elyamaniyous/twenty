import { describe, expect, it } from '@jest/globals';

import { erpExecutiveDashboardSchema } from './erp-maroc-contracts';

describe('erpExecutiveDashboardSchema', () => {
  it('parses consolidated executive indicators and actions', () => {
    const result = erpExecutiveDashboardSchema.parse({
      asOf: '2026-07-22',
      currency: 'MAD',
      period: {
        currentStart: '2026-07-01',
        currentEnd: '2026-07-22',
        previousStart: '2026-06-01',
        previousEnd: '2026-06-22',
      },
      performance: {
        revenueCents: 1_200_000,
        previousRevenueCents: 1_000_000,
        revenueChangeBasisPoints: 2_000,
        grossMarginCents: 300_000,
        grossMarginRateBasisPoints: 3_750,
        grossMarginDeliveryCount: 4,
        revenueBudgetCents: 1_500_000,
        revenueBudgetVarianceCents: -300_000,
      },
      cash: {
        currentCashCents: 2_000_000,
        forecastClosingCashCents: 2_400_000,
        forecastMinimumCashCents: 1_800_000,
        firstNegativeWeek: null,
        receivablesCents: 900_000,
        overdueReceivablesCents: 200_000,
        payablesCents: 500_000,
      },
      operations: {
        stockValueCents: 700_000,
        replenishmentCount: 3,
        overdueFiscalDeadlineCount: 0,
        upcomingFiscalDeadlineCount: 2,
        pendingApprovalCount: 1,
        pendingApprovalAmountCents: 250_000,
        openAnomalyCount: 0,
      },
      queues: {
        draftQuotes: 1,
        validatedInvoices: 2,
        overdueInvoices: 3,
        pendingAllocationPayments: 4,
        proposedReminders: 5,
        reconciliationRequired: 6,
      },
      referenceCounts: { products: 12, tiers: 8 },
      dataQuality: {
        bankAccountCount: 1,
        confirmedBankAccountCount: 1,
        usesOpeningBalance: false,
        eventCount: 7,
        budgetConfigured: true,
        grossMarginDeliveryCount: 4,
      },
      alerts: [
        {
          code: 'REPLENISHMENT_REQUIRED',
          severity: 'WARNING',
          title: 'Stock à réapprovisionner',
          message: "Des articles sont sous leur seuil d'alerte.",
          amountCents: 0,
          count: 3,
          target: 'INVENTORY',
        },
      ],
      actions: [
        {
          code: 'REPLENISH_STOCK',
          label: 'Préparer le réapprovisionnement',
          description: 'Contrôler les suggestions.',
          priority: 'HIGH',
          amountCents: 0,
          target: 'INVENTORY',
        },
      ],
    });

    expect(result.performance.revenueCents).toBe(1_200_000);
    expect(result.actions[0].target).toBe('INVENTORY');
  });
});
