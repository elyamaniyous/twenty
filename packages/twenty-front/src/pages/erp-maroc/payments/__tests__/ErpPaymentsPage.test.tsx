import { useErpMarocContext } from '@/erp-maroc/context/useErpMarocContext';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import type { ErpPayment } from 'twenty-shared/erp-maroc';

// oxlint-disable-next-line eslint/no-restricted-imports -- Pages are outside the @/ modules alias.
import { ErpPaymentsPage } from '../ErpPaymentsPage';

jest.mock('@/erp-maroc/context/useErpMarocContext', () => ({
  useErpMarocContext: jest.fn(),
}));

const LocationProbe = () => {
  const location = useLocation();
  return (
    <output aria-label="URL courante">
      {location.pathname}
      {location.search}
    </output>
  );
};

describe('ErpPaymentsPage', () => {
  it('requests URL filters exactly and renders a payment detail link', async () => {
    const payment: ErpPayment = {
      id: '0193f6ea-7c39-7aa2-8000-000000000000',
      societeId: '0193f6ea-7c39-7aa2-8000-000000000001',
      tierId: '0193f6ea-7c39-7aa2-8000-000000000002',
      kind: 'RECEIPT',
      status: 'POSTED',
      amountCents: 12500,
      currency: 'MAD',
      paymentDate: '2026-07-10',
      method: 'BANK_TRANSFER',
      reference: 'REG-2026-0001',
      notes: null,
      postedAt: '2026-07-10T12:00:00.000Z',
      cancelledAt: null,
      reversedAt: null,
      createdByTwentyUserId: 'twenty-user-42',
      terminationReason: null,
      originalPaymentId: null,
      createdAt: '2026-07-10T12:00:00.000Z',
      updatedAt: '2026-07-11T12:00:00.000Z',
      allocations: [],
    };
    const request = jest.fn(async () => ({
      items: [payment],
      nextCursor: null,
    }));

    jest.mocked(useErpMarocContext).mockReturnValue({
      status: 'ready',
      context: {
        societeId: payment.societeId,
        capabilities: {},
      } as never,
      error: null,
      refetch: jest.fn(),
      client: { request } as never,
    });

    render(
      <MemoryRouter
        initialEntries={[
          '/erp-maroc/payments?status=POSTED&kind=RECEIPT&method=BANK_TRANSFER&limit=25',
        ]}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <ErpPaymentsPage />
        <LocationProbe />
      </MemoryRouter>,
    );

    await waitFor(() =>
      expect(request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          path: '/payments',
          query: {
            status: 'POSTED',
            kind: 'RECEIPT',
            method: 'BANK_TRANSFER',
            limit: '25',
          },
        }),
      ),
    );
    expect(screen.getByLabelText('URL courante')).toHaveTextContent(
      '/erp-maroc/payments?status=POSTED&kind=RECEIPT&method=BANK_TRANSFER&limit=25',
    );
    await userEvent.click(
      await screen.findByRole('link', { name: 'Ouvrir REG-2026-0001' }),
    );
    expect(screen.getByLabelText('URL courante')).toHaveTextContent(
      `/erp-maroc/payments/${payment.id}`,
    );
  });

  it('renders the payments title and requests the payments page', async () => {
    const request = jest.fn(async () => ({ items: [], nextCursor: null }));

    jest.mocked(useErpMarocContext).mockReturnValue({
      status: 'ready',
      context: {
        societeId: '89c90690-4f4a-4e2e-91ce-3700f16a8ca1',
        capabilities: {},
      } as never,
      error: null,
      refetch: jest.fn(),
      client: { request } as never,
    });

    render(
      <MemoryRouter
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <ErpPaymentsPage />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole('heading', { name: 'Règlements' }),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(request).toHaveBeenCalledWith(
        expect.objectContaining({ method: 'GET', path: '/payments' }),
      ),
    );
  });

  it('navigates to the new payment page when payment creation is allowed', async () => {
    const request = jest.fn(async () => ({ items: [], nextCursor: null }));

    jest.mocked(useErpMarocContext).mockReturnValue({
      status: 'ready',
      context: {
        societeId: '89c90690-4f4a-4e2e-91ce-3700f16a8ca1',
        capabilities: { createPendingPayment: true },
      } as never,
      error: null,
      refetch: jest.fn(),
      client: { request } as never,
    });

    render(
      <MemoryRouter
        initialEntries={['/erp-maroc/payments']}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <ErpPaymentsPage />
        <LocationProbe />
      </MemoryRouter>,
    );

    await userEvent.click(
      screen.getByRole('button', { name: 'Nouveau règlement' }),
    );

    expect(screen.getByLabelText('URL courante')).toHaveTextContent(
      '/erp-maroc/payments/new',
    );
  });

  it('carries canonical invoice and tier filters to the new payment page', async () => {
    const invoiceId = '0193f6ea-7c39-7aa2-8000-000000000010';
    const tierId = '0193f6ea-7c39-7aa2-8000-000000000011';
    const request = jest.fn(async () => ({ items: [], nextCursor: null }));

    jest.mocked(useErpMarocContext).mockReturnValue({
      status: 'ready',
      context: {
        societeId: '89c90690-4f4a-4e2e-91ce-3700f16a8ca1',
        capabilities: { createPendingPayment: true },
      } as never,
      error: null,
      refetch: jest.fn(),
      client: { request } as never,
    });

    render(
      <MemoryRouter
        initialEntries={[
          `/erp-maroc/payments?tierId=${tierId}&invoiceId=${invoiceId}`,
        ]}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <ErpPaymentsPage />
        <LocationProbe />
      </MemoryRouter>,
    );

    await userEvent.click(
      screen.getByRole('button', { name: 'Nouveau règlement' }),
    );

    expect(screen.getByLabelText('URL courante')).toHaveTextContent(
      `/erp-maroc/payments/new?invoiceId=${invoiceId}&tierId=${tierId}`,
    );
  });

  it('does not render the new payment action when payment creation is forbidden', async () => {
    const request = jest.fn(async () => ({ items: [], nextCursor: null }));

    jest.mocked(useErpMarocContext).mockReturnValue({
      status: 'ready',
      context: {
        societeId: '89c90690-4f4a-4e2e-91ce-3700f16a8ca1',
        capabilities: { createPendingPayment: false },
      } as never,
      error: null,
      refetch: jest.fn(),
      client: { request } as never,
    });

    render(
      <MemoryRouter
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <ErpPaymentsPage />
      </MemoryRouter>,
    );

    await screen.findByText('Aucun règlement sur la page chargée');

    expect(
      screen.queryByRole('button', { name: 'Nouveau règlement' }),
    ).not.toBeInTheDocument();
  });

  it('requests the next payments page when the next cursor is available', async () => {
    const nextCursor = '0193f6ea-7c39-7aa2-8000-000000000004';
    const request = jest
      .fn()
      .mockResolvedValueOnce({ items: [], nextCursor })
      .mockResolvedValueOnce({ items: [], nextCursor: null });

    jest.mocked(useErpMarocContext).mockReturnValue({
      status: 'ready',
      context: {
        societeId: '89c90690-4f4a-4e2e-91ce-3700f16a8ca1',
        capabilities: {},
      } as never,
      error: null,
      refetch: jest.fn(),
      client: { request } as never,
    });

    render(
      <MemoryRouter
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <ErpPaymentsPage />
      </MemoryRouter>,
    );

    await userEvent.click(
      await screen.findByRole('button', { name: 'Page suivante' }),
    );

    await waitFor(() =>
      expect(request).toHaveBeenLastCalledWith(
        expect.objectContaining({
          method: 'GET',
          path: '/payments',
          query: { cursor: nextCursor },
        }),
      ),
    );
  });

  it('removes an initial cursor when selecting a payment status', async () => {
    const cursor = '89c90690-4f4a-4e2e-91ce-3700f16a8ca4';
    const request = jest.fn(async () => ({ items: [], nextCursor: null }));

    jest.mocked(useErpMarocContext).mockReturnValue({
      status: 'ready',
      context: {
        societeId: '89c90690-4f4a-4e2e-91ce-3700f16a8ca1',
        capabilities: {},
      } as never,
      error: null,
      refetch: jest.fn(),
      client: { request } as never,
    });

    render(
      <MemoryRouter
        initialEntries={[`/erp-maroc/payments?cursor=${cursor}`]}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <ErpPaymentsPage />
        <LocationProbe />
      </MemoryRouter>,
    );

    await waitFor(() => expect(request).toHaveBeenCalled());
    await userEvent.selectOptions(
      screen.getByLabelText('Statut des règlements'),
      'POSTED',
    );

    await waitFor(() =>
      expect(screen.getByLabelText('URL courante')).toHaveTextContent(
        '/erp-maroc/payments?status=POSTED',
      ),
    );
    await waitFor(() =>
      expect(request).toHaveBeenLastCalledWith(
        expect.objectContaining({
          method: 'GET',
          path: '/payments',
          query: { status: 'POSTED' },
        }),
      ),
    );
  });

  it('shows a load error and retries the payments request', async () => {
    const request = jest
      .fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({ items: [], nextCursor: null });

    jest.mocked(useErpMarocContext).mockReturnValue({
      status: 'ready',
      context: {
        societeId: '89c90690-4f4a-4e2e-91ce-3700f16a8ca1',
        capabilities: {},
      } as never,
      error: null,
      refetch: jest.fn(),
      client: { request } as never,
    });

    render(
      <MemoryRouter
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <ErpPaymentsPage />
        <LocationProbe />
      </MemoryRouter>,
    );

    expect(
      await screen.findByText('Impossible de charger les règlements'),
    ).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: 'Réessayer' }));
    await waitFor(() => expect(request).toHaveBeenCalledTimes(2));
  });

  it('moves forward with a cursor and returns to the preceding page', async () => {
    const firstCursor = '89c90690-4f4a-4e2e-91ce-3700f16a8ca4';
    const secondCursor = '89c90690-4f4a-4e2e-91ce-3700f16a8ca5';
    const request = jest
      .fn()
      .mockResolvedValueOnce({ items: [], nextCursor: firstCursor })
      .mockResolvedValueOnce({ items: [], nextCursor: secondCursor })
      .mockResolvedValueOnce({ items: [], nextCursor: firstCursor });

    jest.mocked(useErpMarocContext).mockReturnValue({
      status: 'ready',
      context: {
        societeId: '89c90690-4f4a-4e2e-91ce-3700f16a8ca1',
        capabilities: {},
      } as never,
      error: null,
      refetch: jest.fn(),
      client: { request } as never,
    });

    render(
      <MemoryRouter
        initialEntries={['/erp-maroc/payments']}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <ErpPaymentsPage />
        <LocationProbe />
      </MemoryRouter>,
    );

    const previous = await screen.findByRole('button', {
      name: 'Page précédente',
    });
    expect(previous).toBeDisabled();

    await userEvent.click(
      screen.getByRole('button', { name: 'Page suivante' }),
    );
    await waitFor(() =>
      expect(request).toHaveBeenLastCalledWith(
        expect.objectContaining({
          method: 'GET',
          path: '/payments',
          query: { cursor: firstCursor },
        }),
      ),
    );
    expect(screen.getByLabelText('URL courante')).toHaveTextContent(
      `/erp-maroc/payments?cursor=${firstCursor}`,
    );
    await waitFor(() => expect(previous).toBeEnabled());

    await userEvent.click(previous);
    await waitFor(() =>
      expect(request).toHaveBeenLastCalledWith(
        expect.objectContaining({
          method: 'GET',
          path: '/payments',
          query: undefined,
        }),
      ),
    );
    expect(screen.getByLabelText('URL courante')).toHaveTextContent(
      '/erp-maroc/payments',
    );
    await waitFor(() => expect(previous).toBeDisabled());
  });

  it('renders a pending receipt amount and reference from the payments page', async () => {
    const payment: ErpPayment = {
      id: '0193f6ea-7c39-7aa2-8000-000000000000',
      societeId: '0193f6ea-7c39-7aa2-8000-000000000001',
      tierId: '0193f6ea-7c39-7aa2-8000-000000000002',
      kind: 'RECEIPT',
      status: 'PENDING_ALLOCATION',
      amountCents: 12500,
      currency: 'MAD',
      paymentDate: '2026-07-10',
      method: 'BANK_TRANSFER',
      reference: 'REG-2026-0001',
      notes: null,
      postedAt: null,
      cancelledAt: null,
      reversedAt: null,
      createdByTwentyUserId: 'twenty-user-42',
      terminationReason: null,
      originalPaymentId: null,
      createdAt: '2026-07-10T12:00:00.000Z',
      updatedAt: '2026-07-11T12:00:00.000Z',
      allocations: [],
    };
    const request = jest.fn(async () => ({
      items: [payment],
      nextCursor: null,
    }));

    jest.mocked(useErpMarocContext).mockReturnValue({
      status: 'ready',
      context: {
        societeId: payment.societeId,
        capabilities: {},
      } as never,
      error: null,
      refetch: jest.fn(),
      client: { request } as never,
    });

    render(
      <MemoryRouter
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <ErpPaymentsPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText(payment.reference!)).toBeInTheDocument();
    expect(screen.getByText(/125[,.]00/)).toBeInTheDocument();
  });

  it('requests URL filters when loading the payments table', async () => {
    const payment: ErpPayment = {
      id: '0193f6ea-7c39-7aa2-8000-000000000003',
      societeId: '0193f6ea-7c39-7aa2-8000-000000000001',
      tierId: '0193f6ea-7c39-7aa2-8000-000000000002',
      kind: 'RECEIPT',
      status: 'POSTED',
      amountCents: 12500,
      currency: 'MAD',
      paymentDate: '2026-07-10',
      method: 'BANK_TRANSFER',
      reference: 'REG-2026-0002',
      notes: null,
      postedAt: '2026-07-10T12:00:00.000Z',
      cancelledAt: null,
      reversedAt: null,
      createdByTwentyUserId: 'twenty-user-42',
      terminationReason: null,
      originalPaymentId: null,
      createdAt: '2026-07-10T12:00:00.000Z',
      updatedAt: '2026-07-11T12:00:00.000Z',
      allocations: [],
    };
    const request = jest.fn(async () => ({
      items: [payment],
      nextCursor: null,
    }));

    jest.mocked(useErpMarocContext).mockReturnValue({
      status: 'ready',
      context: {
        societeId: payment.societeId,
        capabilities: {},
      } as never,
      error: null,
      refetch: jest.fn(),
      client: { request } as never,
    });

    render(
      <MemoryRouter
        initialEntries={[
          '/erp-maroc/payments?status=POSTED&kind=RECEIPT&method=BANK_TRANSFER&limit=25',
        ]}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <ErpPaymentsPage />
      </MemoryRouter>,
    );

    await screen.findByRole('table', { name: 'Règlements' });

    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'GET',
        path: '/payments',
        query: {
          status: 'POSTED',
          kind: 'RECEIPT',
          method: 'BANK_TRANSFER',
          limit: '25',
        },
      }),
    );
  });
});
