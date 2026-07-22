import { useErpMarocContext } from '@/erp-maroc/context/useErpMarocContext';
import { erpMarocPaths } from '@/erp-maroc/navigation/erpMarocPaths';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { ErpMarocCockpitPage } from '~/pages/erp-maroc/ErpMarocCockpitPage';

jest.mock('@/erp-maroc/context/useErpMarocContext', () => ({
  useErpMarocContext: jest.fn(),
}));

const dashboard = {
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
      message: "Des articles sont passés sous leur seuil d'alerte.",
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
};

const renderPage = (request: jest.Mock) => {
  jest.mocked(useErpMarocContext).mockReturnValue({
    status: 'ready',
    context: {} as never,
    error: null,
    refetch: jest.fn(),
    client: { request } as never,
  });

  return render(
    <MemoryRouter
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <ErpMarocCockpitPage />
    </MemoryRouter>,
  );
};

describe('ErpMarocCockpitPage', () => {
  afterEach(() => jest.clearAllMocks());

  it('renders consolidated indicators, alerts, actions and queues', async () => {
    const request = jest.fn().mockResolvedValue(dashboard);
    renderPage(request);

    expect(await screen.findByText("Chiffre d'affaires HT net")).toBeVisible();
    expect(screen.getByText('12 000,00 MAD')).toBeVisible();
    expect(screen.getByText('Stock à réapprovisionner')).toBeVisible();
    expect(
      screen.getByRole('link', { name: /Stock à réapprovisionner/ }),
    ).toHaveAttribute('href', erpMarocPaths.inventory);
    expect(
      screen.getByRole('link', { name: /Préparer le réapprovisionnement/ }),
    ).toHaveAttribute('href', erpMarocPaths.inventory);
    expect(
      screen.getByRole('link', { name: /Factures en retard/ }),
    ).toHaveAttribute('href', `${erpMarocPaths.invoices}?status=OVERDUE`);
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'GET',
        path: '/operations/executive-dashboard',
      }),
    );
  });

  it('aborts the consolidated read when unmounted', async () => {
    let signal: AbortSignal | undefined;
    const request = jest.fn((input: { signal: AbortSignal }) => {
      signal = input.signal;
      return new Promise(() => undefined);
    });
    const view = renderPage(request);

    await waitFor(() => expect(signal).toBeDefined());
    view.unmount();

    expect(signal?.aborted).toBe(true);
  });
});
