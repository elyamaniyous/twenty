import { useErpMarocContext } from '@/erp-maroc/context/useErpMarocContext';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import type { ErpReminder } from 'twenty-shared/erp-maroc';

// oxlint-disable-next-line eslint/no-restricted-imports -- Pages are outside the @/ modules alias.
import { ErpRemindersPage } from '../ErpRemindersPage';

jest.mock('@/erp-maroc/context/useErpMarocContext', () => ({
  useErpMarocContext: jest.fn(),
}));

const reminder: ErpReminder = {
  id: '0193f6ea-7c39-7aa2-8000-000000000001',
  societeId: '0193f6ea-7c39-7aa2-8000-000000000002',
  tierId: '0193f6ea-7c39-7aa2-8000-000000000003',
  invoiceId: '0193f6ea-7c39-7aa2-8000-000000000004',
  level: 'LEVEL_1',
  channel: 'EMAIL',
  status: 'PROPOSED',
  invoiceNumber: 'FAC-2026-0042',
  dueDate: '2026-07-01',
  totalTtcCents: 120000,
  outstandingCents: 80000,
  paymentMethod: 'BANK_TRANSFER',
  paymentReference: 'VIR-0042',
  recipient: 'client@example.com',
  subject: 'Relance facture FAC-2026-0042',
  body: 'Votre facture présente un solde impayé de 800,00 MAD.',
  contentVersion: 1,
  proposedAt: '2026-07-15T08:00:00.000Z',
  approvedAt: null,
  cancelledAt: null,
  sentAt: null,
  providerAcceptedAt: null,
  attempts: 0,
  nextAttemptAt: null,
  lastError: null,
  createdAt: '2026-07-15T08:00:00.000Z',
  updatedAt: '2026-07-15T08:00:00.000Z',
};

const LocationProbe = () => {
  const location = useLocation();
  return <output aria-label="URL courante">{location.search}</output>;
};

const mockContext = ({
  request = jest
    .fn()
    .mockResolvedValue({ items: [reminder], nextCursor: null }),
  createMutationIntent = jest.fn(),
  manageReminders = true,
  reminderDelivery = true,
}: {
  request?: jest.Mock;
  createMutationIntent?: jest.Mock;
  manageReminders?: boolean;
  reminderDelivery?: boolean;
} = {}) => {
  jest.mocked(useErpMarocContext).mockReturnValue({
    status: 'ready',
    context: {
      societeId: reminder.societeId,
      capabilities: { manageReminders },
      features: { reminderManagement: true, reminderDelivery },
    } as never,
    error: null,
    refetch: jest.fn(),
    client: { request, createMutationIntent } as never,
  });

  return { request, createMutationIntent };
};

const renderPage = (entry = '/erp-maroc/reminders') =>
  render(
    <MemoryRouter
      initialEntries={[entry]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <ErpRemindersPage />
      <LocationProbe />
    </MemoryRouter>,
  );

describe('ErpRemindersPage', () => {
  it('loads canonical filters and renders reminder business data', async () => {
    const { request } = mockContext();

    renderPage('/erp-maroc/reminders?status=PROPOSED&level=LEVEL_1&limit=25');

    await waitFor(() =>
      expect(request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          path: '/reminders',
          query: { status: 'PROPOSED', level: 'LEVEL_1', limit: '25' },
        }),
      ),
    );
    expect(screen.getByRole('heading', { name: 'Relances' })).toBeVisible();
    expect(screen.getByText('FAC-2026-0042')).toBeVisible();
    expect(screen.getByText('client@example.com')).toBeVisible();
    expect(screen.getByText('800,00 MAD')).toBeVisible();
  });

  it('opens frozen content and approves a proposed reminder after confirmation', async () => {
    const approvedReminder = {
      ...reminder,
      status: 'APPROVED' as const,
      approvedAt: '2026-07-15T09:00:00.000Z',
    };
    const execute = jest.fn().mockResolvedValue(approvedReminder);
    const createMutationIntent = jest.fn(() => ({
      idempotencyKey: 'approve-reminder-key',
      execute,
      retry: jest.fn(),
    }));
    mockContext({ createMutationIntent });

    renderPage();

    await userEvent.click(
      await screen.findByRole('button', { name: 'Ouvrir FAC-2026-0042' }),
    );
    expect(screen.getByText(reminder.subject)).toBeVisible();
    expect(screen.getByText(reminder.body)).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: 'Approuver' }));
    await userEvent.click(screen.getByTestId('erp-confirm-dialog-confirm'));

    await waitFor(() => expect(execute).toHaveBeenCalledTimes(1));
    expect(createMutationIntent).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'POST',
        path: `/reminders/${reminder.id}/approve`,
        schema: expect.anything(),
      }),
    );
    await waitFor(() =>
      expect(
        screen
          .getAllByRole('status', { hidden: true })
          .some((element) => element.textContent?.includes('Approuvée')),
      ).toBe(true),
    );
  });

  it('runs a manual arrears scan and refreshes the list', async () => {
    const execute = jest.fn().mockResolvedValue({
      reminderIds: [reminder.id],
      hasMore: false,
      nextCursor: null,
      counters: {
        examined: 12,
        eligible: 1,
        created: 1,
        skippedIneligible: 11,
        skippedAlreadyRecorded: 0,
        skippedActive: 0,
      },
    });
    const createMutationIntent = jest.fn(() => ({
      idempotencyKey: 'scan-reminders-key',
      execute,
      retry: jest.fn(),
    }));
    const { request } = mockContext({ createMutationIntent });

    renderPage();

    await userEvent.click(
      await screen.findByRole('button', { name: 'Analyser les impayés' }),
    );

    await waitFor(() => expect(execute).toHaveBeenCalledTimes(1));
    expect(createMutationIntent).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'POST',
        path: '/reminders/scan',
        body: {},
      }),
    );
    expect(await screen.findByText('1 relance créée')).toBeVisible();
    await waitFor(() => expect(request).toHaveBeenCalledTimes(2));
  });

  it('keeps reconciliation records read-only and never exposes WhatsApp', async () => {
    const reconciliationReminder = {
      ...reminder,
      status: 'RECONCILIATION_REQUIRED' as const,
    };
    mockContext({
      request: jest.fn().mockResolvedValue({
        items: [reconciliationReminder],
        nextCursor: null,
      }),
    });

    renderPage();

    await userEvent.click(
      await screen.findByRole('button', { name: 'Ouvrir FAC-2026-0042' }),
    );

    expect(screen.getByText('Réconciliation opérateur requise')).toBeVisible();
    expect(
      screen.queryByRole('button', { name: 'Approuver' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Annuler la relance' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/WhatsApp/i)).not.toBeInTheDocument();
  });
});
