import { useErpMarocContext } from '@/erp-maroc/context/useErpMarocContext';
import { ErpMarocError } from '@/erp-maroc/api/erpMarocError';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom';
import { erpPaymentSchema, type ErpPayment } from 'twenty-shared/erp-maroc';

import { ErpPaymentDetailPage } from '../ErpPaymentDetailPage';

jest.mock('@/erp-maroc/context/useErpMarocContext', () => ({
  useErpMarocContext: jest.fn(),
}));

const PAYMENT_ID = '89c90690-4f4a-4e2e-91ce-3700f16a8ca2';
const ROUTE_PAYMENT_ID = '79c90690-4f4a-4e2e-91ce-3700f16a8ca2';
const INVOICE_ID = 'a9c90690-4f4a-4e2e-91ce-3700f16a8ca2';
const SOCIETE_ID = '89c90690-4f4a-4e2e-91ce-3700f16a8ca1';

const payment: ErpPayment = {
  id: PAYMENT_ID,
  societeId: SOCIETE_ID,
  tierId: 'b9c90690-4f4a-4e2e-91ce-3700f16a8ca2',
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
  updatedAt: '2026-07-10T12:00:00.000Z',
  allocations: [
    {
      id: 'c9c90690-4f4a-4e2e-91ce-3700f16a8ca2',
      invoiceId: INVOICE_ID,
      invoiceNumber: 'FAC-2026-0042',
      amountCents: 12500,
      position: 0,
    },
  ],
};

const renderPaymentDetail = () =>
  render(
    <MemoryRouter
      initialEntries={[`/erp-maroc/payments/${PAYMENT_ID}`]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <Routes>
        <Route
          path="/erp-maroc/payments/:id"
          element={<ErpPaymentDetailPage />}
        />
      </Routes>
    </MemoryRouter>,
  );

const PaymentDetailRoute = () => {
  const navigate = useNavigate();

  return (
    <>
      <button
        type="button"
        onClick={() => navigate(`/erp-maroc/payments/${ROUTE_PAYMENT_ID}`)}
      >
        Load next payment
      </button>
      <ErpPaymentDetailPage />
    </>
  );
};

describe('ErpPaymentDetailPage', () => {
  beforeEach(() => {
    jest.mocked(useErpMarocContext).mockReset();
    jest.mocked(useErpMarocContext).mockReturnValue({
      status: 'ready',
      context: {
        role: 'COMMERCIAL',
        societeId: SOCIETE_ID,
        capabilities: {},
      } as never,
      error: null,
      refetch: jest.fn(),
      client: {
        request: jest.fn(),
        createMutationIntent: jest.fn(),
      } as never,
    });
  });

  it('renders the payment heading', async () => {
    render(
      <MemoryRouter>
        <ErpPaymentDetailPage />
      </MemoryRouter>,
    );

    await screen.findByRole('heading', { name: 'Règlement' });
  });

  it('requests the payment detail for the route payment id', async () => {
    const request = jest.fn(
      async (_input: { method: string; path: string }) => payment,
    );

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
        initialEntries={[`/erp-maroc/payments/${ROUTE_PAYMENT_ID}`]}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <Routes>
          <Route
            path="/erp-maroc/payments/:id"
            element={<ErpPaymentDetailPage />}
          />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => expect(request).toHaveBeenCalledTimes(1));

    expect(request.mock.calls[0]?.[0].method).toBe('GET');
    expect(request.mock.calls[0]?.[0].path).toBe(
      `/payments/${ROUTE_PAYMENT_ID}`,
    );
  });

  it('renders the loaded payment allocation, reference, and status without an edit action', async () => {
    const request = jest.fn(async () => payment);

    jest.mocked(useErpMarocContext).mockReturnValue({
      status: 'ready',
      context: {
        role: 'COMMERCIAL',
        societeId: SOCIETE_ID,
        capabilities: {},
      } as never,
      error: null,
      refetch: jest.fn(),
      client: { request } as never,
    });

    renderPaymentDetail();

    expect(await screen.findByText('En attente de ventilation')).toBeVisible();
    expect(screen.getByText(payment.reference!)).toBeVisible();
    const paymentAmounts = screen.getAllByText('125,00 MAD');
    expect(paymentAmounts).toHaveLength(2);
    paymentAmounts.forEach((paymentAmount) => {
      expect(paymentAmount).toBeVisible();
    });
    expect(screen.getByRole('link', { name: 'FAC-2026-0042' })).toHaveAttribute(
      'href',
      `/erp-maroc/invoices/${INVOICE_ID}`,
    );
    expect(
      screen.queryByRole('button', { name: /modifier|éditer/i }),
    ).not.toBeInTheDocument();
  });

  it('shows the termination action to a COMMERCIAL who owns a pending payment', async () => {
    const request = jest.fn(async () => payment);

    jest.mocked(useErpMarocContext).mockReturnValue({
      status: 'ready',
      context: {
        role: 'COMMERCIAL',
        societeId: SOCIETE_ID,
        twentyUserId: payment.createdByTwentyUserId,
        capabilities: {
          terminateOwnPendingPayment: true,
        },
      } as never,
      error: null,
      refetch: jest.fn(),
      client: { request } as never,
    });

    renderPaymentDetail();

    expect(
      await screen.findByRole('button', { name: 'Terminer le règlement' }),
    ).toBeVisible();
  });

  it('confirms termination through a required-idempotency payment intent for an authorized admin', async () => {
    const terminatedPayment: ErpPayment = {
      ...payment,
      status: 'CANCELLED',
      cancelledAt: '2026-07-11T12:00:00.000Z',
      terminationReason: 'Terminaison confirmée depuis le CRM.',
      updatedAt: '2026-07-11T12:00:00.000Z',
    };
    const request = jest.fn(
      async ({ method, path }: { method: string; path: string }) => {
        if (method === 'GET' && path === `/payments/${PAYMENT_ID}`)
          return payment;
        if (method === 'POST' && path === `/payments/${PAYMENT_ID}/terminate`)
          return terminatedPayment;
        throw new Error(`Unexpected request: ${method} ${path}`);
      },
    );
    const createMutationIntent = jest.fn((input, _options) => ({
      idempotencyKey: 'stable-test-intent',
      execute: () => request(input),
      retry: jest.fn(),
    }));

    jest.mocked(useErpMarocContext).mockReturnValue({
      status: 'ready',
      context: {
        role: 'ADMIN',
        societeId: SOCIETE_ID,
        capabilities: {
          terminateAnyPayment: true,
        },
      } as never,
      error: null,
      refetch: jest.fn(),
      client: { request, createMutationIntent } as never,
    });

    renderPaymentDetail();

    fireEvent.click(
      await screen.findByRole('button', { name: 'Terminer le règlement' }),
    );
    fireEvent.click(screen.getByTestId('erp-confirm-dialog-confirm'));

    await waitFor(() =>
      expect(createMutationIntent).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          path: `/payments/${PAYMENT_ID}/terminate`,
          schema: erpPaymentSchema,
          body: { reason: 'Terminaison confirmée depuis le CRM.' },
        }),
        { idempotency: 'required' },
      ),
    );
    expect(await screen.findByText('Annulé')).toBeVisible();
    expect(
      screen.queryByTestId('erp-confirm-dialog-confirm'),
    ).not.toBeInTheDocument();
  });

  it.each([
    new ErpMarocError('ERP_STATE_CONFLICT', 409),
    new ErpMarocError('ERP_UNKNOWN', 503),
    new Error('Network request timed out'),
  ])(
    'retries an ambiguously failed termination with the original intent when %p',
    async (failure) => {
      const terminatedPayment: ErpPayment = {
        ...payment,
        status: 'CANCELLED',
        cancelledAt: '2026-07-11T12:00:00.000Z',
        terminationReason: 'Terminaison confirmée depuis le CRM.',
        updatedAt: '2026-07-11T12:00:00.000Z',
      };
      const request = jest.fn(async () => payment);
      const execute = jest.fn().mockRejectedValue(failure);
      const retry = jest.fn().mockResolvedValue(terminatedPayment);
      const createMutationIntent = jest.fn(() => ({
        idempotencyKey: 'stable-test-intent',
        execute,
        retry,
      }));

      jest.mocked(useErpMarocContext).mockReturnValue({
        status: 'ready',
        context: {
          role: 'ADMIN',
          societeId: SOCIETE_ID,
          capabilities: {
            terminateAnyPayment: true,
          },
        } as never,
        error: null,
        refetch: jest.fn(),
        client: { request, createMutationIntent } as never,
      });

      renderPaymentDetail();

      fireEvent.click(
        await screen.findByRole('button', { name: 'Terminer le règlement' }),
      );
      fireEvent.click(screen.getByTestId('erp-confirm-dialog-confirm'));

      const retryButton = await screen.findByRole('button', {
        name: 'Réessayer la terminaison du règlement',
      });
      expect(execute).toHaveBeenCalledTimes(1);
      expect(createMutationIntent).toHaveBeenCalledTimes(1);

      fireEvent.click(retryButton);

      await waitFor(() => expect(retry).toHaveBeenCalledTimes(1));
      expect(execute).toHaveBeenCalledTimes(1);
      expect(createMutationIntent).toHaveBeenCalledTimes(1);
      expect(await screen.findByText('Annulé')).toBeVisible();
      expect(
        screen.queryByTestId('erp-confirm-dialog-confirm'),
      ).not.toBeInTheDocument();
    },
  );

  it('does not retain an ambiguous termination retry when the route payment changes', async () => {
    const nextPayment: ErpPayment = {
      ...payment,
      id: ROUTE_PAYMENT_ID,
      reference: 'REG-2026-0002',
    };
    const request = jest.fn(async ({ path }: { path: string }) => {
      if (path === `/payments/${PAYMENT_ID}`) return payment;
      if (path === `/payments/${ROUTE_PAYMENT_ID}`) return nextPayment;

      throw new Error(`Unexpected request: ${path}`);
    });
    const executeFirstPayment = jest
      .fn()
      .mockRejectedValue(new ErpMarocError('ERP_STATE_CONFLICT', 409));
    const executeNextPayment = jest.fn().mockResolvedValue(nextPayment);
    const createMutationIntent = jest.fn((input: { path: string }) => ({
      idempotencyKey: 'stable-test-intent',
      execute:
        input.path === `/payments/${PAYMENT_ID}/terminate`
          ? executeFirstPayment
          : executeNextPayment,
      retry: jest.fn(),
    }));

    jest.mocked(useErpMarocContext).mockReturnValue({
      status: 'ready',
      context: {
        role: 'ADMIN',
        societeId: SOCIETE_ID,
        capabilities: {
          terminateAnyPayment: true,
        },
      } as never,
      error: null,
      refetch: jest.fn(),
      client: { request, createMutationIntent } as never,
    });

    render(
      <MemoryRouter
        initialEntries={[`/erp-maroc/payments/${PAYMENT_ID}`]}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <Routes>
          <Route
            path="/erp-maroc/payments/:id"
            element={<PaymentDetailRoute />}
          />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(
      await screen.findByRole('button', { name: 'Terminer le règlement' }),
    );
    fireEvent.click(screen.getByTestId('erp-confirm-dialog-confirm'));

    await screen.findByRole('button', {
      name: 'Réessayer la terminaison du règlement',
    });
    await screen.findByText('Impossible de terminer le règlement');

    fireEvent.click(screen.getByRole('button', { name: 'Load next payment' }));

    expect(await screen.findByText(nextPayment.reference!)).toBeVisible();
    expect(
      screen.queryByRole('button', {
        name: 'Réessayer la terminaison du règlement',
      }),
    ).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', { name: 'Terminer le règlement' }),
    );
    fireEvent.click(screen.getByTestId('erp-confirm-dialog-confirm'));

    await waitFor(() =>
      expect(createMutationIntent).toHaveBeenLastCalledWith(
        expect.objectContaining({
          path: `/payments/${ROUTE_PAYMENT_ID}/terminate`,
        }),
        { idempotency: 'required' },
      ),
    );
    expect(executeNextPayment).toHaveBeenCalledTimes(1);
  });

  it('does not offer termination retry after an ordinary client error', async () => {
    const request = jest.fn(async () => payment);
    const execute = jest
      .fn()
      .mockRejectedValue(new ErpMarocError('ERP_VALIDATION_ERROR', 400));
    const retry = jest.fn();
    const createMutationIntent = jest.fn(() => ({
      idempotencyKey: 'stable-test-intent',
      execute,
      retry,
    }));

    jest.mocked(useErpMarocContext).mockReturnValue({
      status: 'ready',
      context: {
        role: 'ADMIN',
        societeId: SOCIETE_ID,
        capabilities: {
          terminateAnyPayment: true,
        },
      } as never,
      error: null,
      refetch: jest.fn(),
      client: { request, createMutationIntent } as never,
    });

    renderPaymentDetail();

    fireEvent.click(
      await screen.findByRole('button', { name: 'Terminer le règlement' }),
    );
    fireEvent.click(screen.getByTestId('erp-confirm-dialog-confirm'));

    expect(
      await screen.findByText('Impossible de terminer le règlement'),
    ).toBeVisible();
    expect(
      screen.queryByRole('button', {
        name: 'Réessayer la terminaison du règlement',
      }),
    ).not.toBeInTheDocument();
    expect(retry).not.toHaveBeenCalled();
  });
});
