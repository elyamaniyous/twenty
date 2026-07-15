import { ErpMarocError } from '@/erp-maroc/api/erpMarocError';
import { useErpMarocContext } from '@/erp-maroc/context/useErpMarocContext';
import { act, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import type { ErpEligibleInvoice, ErpPayment } from 'twenty-shared/erp-maroc';

// oxlint-disable-next-line eslint/no-restricted-imports -- Pages are outside the @/ modules alias.
import { ErpPaymentEditorPage } from '../ErpPaymentEditorPage';

jest.mock('@/erp-maroc/context/useErpMarocContext', () => ({
  useErpMarocContext: jest.fn(),
}));

const INVOICE_ID = '89c90690-4f4a-4e2e-91ce-3700f16a8ca2';
const SOCIETE_ID = '89c90690-4f4a-4e2e-91ce-3700f16a8ca1';
const CLIENT_ID = '89c90690-4f4a-4e2e-91ce-3700f16a8ca3';
const PENDING_PAYMENT: ErpPayment = {
  id: 'payment-id',
  societeId: SOCIETE_ID,
  tierId: CLIENT_ID,
  kind: 'RECEIPT',
  status: 'PENDING_ALLOCATION',
  amountCents: 12_500,
  currency: 'MAD',
  paymentDate: '2026-07-12',
  method: 'CASH',
  reference: null,
  notes: null,
  postedAt: null,
  cancelledAt: null,
  reversedAt: null,
  createdByTwentyUserId: 'twenty-user-42',
  terminationReason: null,
  originalPaymentId: null,
  createdAt: '2026-07-12T12:00:00.000Z',
  updatedAt: '2026-07-12T12:00:00.000Z',
  allocations: [],
};
const ELIGIBLE_INVOICE: ErpEligibleInvoice = {
  id: INVOICE_ID,
  number: 'FAC-2026-0001',
  title: 'Facture de test',
  dueDate: '2026-07-12',
  totalTtcCents: 6_000,
  paidCents: 0,
  outstandingCents: 6_000,
  isOverdue: true,
};
const NEXT_ELIGIBLE_INVOICE: ErpEligibleInvoice = {
  id: '89c90690-4f4a-4e2e-91ce-3700f16a8ca4',
  number: 'FAC-2026-0002',
  title: 'Facture suivante',
  dueDate: '2026-07-13',
  totalTtcCents: 6_500,
  paidCents: 0,
  outstandingCents: 6_500,
  isOverdue: false,
};

const createDeferred = <Value,>() => {
  let resolve: (value: Value) => void;
  const promise = new Promise<Value>((resolvePromise) => {
    resolve = resolvePromise;
  });

  return { promise, resolve: resolve! };
};

const NavigateToInvoice = ({ invoiceId }: { invoiceId: string }) => {
  const navigate = useNavigate();

  return (
    <button
      type="button"
      onClick={() => navigate(`/erp-maroc/payments/new?invoiceId=${invoiceId}`)}
    >
      Choisir la facture suivante
    </button>
  );
};

const LocationProbe = () => {
  const location = useLocation();

  return <output aria-label="URL courante">{location.pathname}</output>;
};

describe('ErpPaymentEditorPage', () => {
  it('renders a new payment with a client field for the selected invoice', () => {
    jest.mocked(useErpMarocContext).mockReturnValue({
      status: 'ready',
      context: {
        societeId: SOCIETE_ID,
        capabilities: {},
      } as never,
      error: null,
      refetch: jest.fn(),
      client: { request: jest.fn() } as never,
    });

    render(
      <MemoryRouter
        initialEntries={[`/erp-maroc/payments/new?invoiceId=${INVOICE_ID}`]}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <ErpPaymentEditorPage />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole('heading', { name: 'Nouveau règlement' }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Client')).toBeInTheDocument();
  });

  it('does not offer allocation after an ADMIN without postPayment creates a pending payment', async () => {
    const execute = jest.fn().mockResolvedValue(PENDING_PAYMENT);
    const createMutationIntent = jest.fn(() => ({ execute }));
    const request = jest.fn().mockResolvedValue({
      items: [ELIGIBLE_INVOICE],
      nextCursor: null,
    });

    jest.mocked(useErpMarocContext).mockReturnValue({
      status: 'ready',
      context: {
        societeId: SOCIETE_ID,
        role: 'ADMIN',
        capabilities: {
          createPendingPayment: true,
          postPayment: false,
        },
      } as never,
      error: null,
      refetch: jest.fn(),
      client: { request, createMutationIntent } as never,
    });

    render(
      <MemoryRouter
        initialEntries={['/erp-maroc/payments/new']}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <ErpPaymentEditorPage />
      </MemoryRouter>,
    );

    await userEvent.type(screen.getByLabelText('Client'), CLIENT_ID);
    await userEvent.type(screen.getByLabelText('Montant (centimes)'), '12500');
    await userEvent.type(
      screen.getByLabelText('Date de paiement'),
      '2026-07-12',
    );
    await userEvent.selectOptions(
      screen.getByLabelText('Mode de paiement'),
      'CASH',
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Créer le règlement' }),
    );

    await waitFor(() =>
      expect(request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          path: '/payments/payment-id/eligible-invoices',
        }),
      ),
    );
    expect(execute).toHaveBeenCalledTimes(1);
    expect(
      screen.queryByRole('button', { name: 'Ventiler le règlement' }),
    ).not.toBeInTheDocument();
  });

  it('creates a CASH payment through a required-idempotency POST intent', async () => {
    const execute = jest.fn().mockResolvedValue(PENDING_PAYMENT);
    const createMutationIntent = jest.fn(() => ({ execute }));
    const request = jest.fn().mockResolvedValue({
      items: [],
      nextCursor: null,
    });

    jest.mocked(useErpMarocContext).mockReturnValue({
      status: 'ready',
      context: {
        societeId: SOCIETE_ID,
        role: 'ADMIN',
        capabilities: { createPendingPayment: true, postPayment: true },
      } as never,
      error: null,
      refetch: jest.fn(),
      client: { request, createMutationIntent } as never,
    });

    render(
      <MemoryRouter
        initialEntries={['/erp-maroc/payments/new']}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <ErpPaymentEditorPage />
      </MemoryRouter>,
    );

    await userEvent.type(screen.getByLabelText('Client'), CLIENT_ID);
    await userEvent.type(screen.getByLabelText('Montant (centimes)'), '12500');
    await userEvent.type(
      screen.getByLabelText('Date de paiement'),
      '2026-07-12',
    );
    await userEvent.selectOptions(
      screen.getByLabelText('Mode de paiement'),
      'CASH',
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Créer le règlement' }),
    );

    await waitFor(() =>
      expect(createMutationIntent).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          path: '/payments',
          body: expect.objectContaining({
            societeId: SOCIETE_ID,
            tierId: CLIENT_ID,
            amountCents: 12_500,
            paymentDate: '2026-07-12',
            method: 'CASH',
          }),
        }),
        { idempotency: 'required' },
      ),
    );
    expect(execute).toHaveBeenCalledTimes(1);
    await screen.findByRole('button', { name: 'Ventiler le règlement' });
  });

  it('creates a BANK_TRANSFER payment with its reference and note', async () => {
    const execute = jest.fn().mockResolvedValue(PENDING_PAYMENT);
    const createMutationIntent = jest.fn(() => ({ execute }));
    const request = jest.fn().mockResolvedValue({
      items: [],
      nextCursor: null,
    });

    jest.mocked(useErpMarocContext).mockReturnValue({
      status: 'ready',
      context: {
        societeId: SOCIETE_ID,
        role: 'ADMIN',
        capabilities: { createPendingPayment: true, postPayment: true },
      } as never,
      error: null,
      refetch: jest.fn(),
      client: { request, createMutationIntent } as never,
    });

    render(
      <MemoryRouter
        initialEntries={['/erp-maroc/payments/new']}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <ErpPaymentEditorPage />
      </MemoryRouter>,
    );

    await userEvent.type(screen.getByLabelText('Client'), CLIENT_ID);
    await userEvent.type(screen.getByLabelText('Montant (centimes)'), '12500');
    await userEvent.type(
      screen.getByLabelText('Date de paiement'),
      '2026-07-12',
    );
    await userEvent.selectOptions(
      screen.getByLabelText('Mode de paiement'),
      'BANK_TRANSFER',
    );
    await userEvent.type(screen.getByLabelText('Référence'), 'VIR-2026-001');
    await userEvent.type(
      screen.getByLabelText('Note'),
      'Règlement par virement bancaire.',
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Créer le règlement' }),
    );

    await waitFor(() =>
      expect(createMutationIntent).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          path: '/payments',
          body: expect.objectContaining({
            societeId: SOCIETE_ID,
            tierId: CLIENT_ID,
            amountCents: 12_500,
            paymentDate: '2026-07-12',
            method: 'BANK_TRANSFER',
            reference: 'VIR-2026-001',
            notes: 'Règlement par virement bancaire.',
          }),
        }),
        { idempotency: 'required' },
      ),
    );
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it.each([
    new ErpMarocError('ERP_STATE_CONFLICT', 409),
    new ErpMarocError('ERP_UNKNOWN', 502),
  ])(
    'retries a payment creation with the original intent when %p leaves the outcome ambiguous',
    async (failure) => {
      const execute = jest.fn().mockRejectedValue(failure);
      const retry = jest.fn().mockResolvedValue(PENDING_PAYMENT);
      const createMutationIntent = jest.fn(() => ({ execute, retry }));
      const request = jest.fn().mockResolvedValue({
        items: [ELIGIBLE_INVOICE],
        nextCursor: null,
      });

      jest.mocked(useErpMarocContext).mockReturnValue({
        status: 'ready',
        context: {
          societeId: SOCIETE_ID,
          role: 'ADMIN',
          capabilities: { createPendingPayment: true, postPayment: true },
        } as never,
        error: null,
        refetch: jest.fn(),
        client: { request, createMutationIntent } as never,
      });

      render(
        <MemoryRouter
          initialEntries={['/erp-maroc/payments/new']}
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        >
          <ErpPaymentEditorPage />
        </MemoryRouter>,
      );

      await userEvent.type(screen.getByLabelText('Client'), CLIENT_ID);
      await userEvent.type(
        screen.getByLabelText('Montant (centimes)'),
        '12500',
      );
      await userEvent.type(
        screen.getByLabelText('Date de paiement'),
        '2026-07-12',
      );
      await userEvent.selectOptions(
        screen.getByLabelText('Mode de paiement'),
        'CASH',
      );
      await userEvent.click(
        screen.getByRole('button', { name: 'Créer le règlement' }),
      );

      const retryButton = await screen.findByRole('button', {
        name: 'Réessayer la création du règlement',
      });
      expect(createMutationIntent).toHaveBeenCalledTimes(1);
      expect(execute).toHaveBeenCalledTimes(1);
      expect(
        screen.getByRole('button', { name: 'Créer le règlement' }),
      ).toBeDisabled();

      await userEvent.click(retryButton);

      await waitFor(() => expect(retry).toHaveBeenCalledTimes(1));
      expect(execute).toHaveBeenCalledTimes(1);
      expect(createMutationIntent).toHaveBeenCalledTimes(1);
      await screen.findByRole('button', { name: 'Ventiler le règlement' });
    },
  );

  it('does not retry-lock payment creation after a non-ambiguous client error', async () => {
    const execute = jest
      .fn()
      .mockRejectedValue(new ErpMarocError('ERP_VALIDATION_ERROR', 400));
    const createMutationIntent = jest.fn(() => ({ execute }));

    jest.mocked(useErpMarocContext).mockReturnValue({
      status: 'ready',
      context: {
        societeId: SOCIETE_ID,
        role: 'ADMIN',
        capabilities: { createPendingPayment: true, postPayment: true },
      } as never,
      error: null,
      refetch: jest.fn(),
      client: { request: jest.fn(), createMutationIntent } as never,
    });

    render(
      <MemoryRouter
        initialEntries={['/erp-maroc/payments/new']}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <ErpPaymentEditorPage />
      </MemoryRouter>,
    );

    await userEvent.type(screen.getByLabelText('Client'), CLIENT_ID);
    await userEvent.type(screen.getByLabelText('Montant (centimes)'), '12500');
    await userEvent.type(
      screen.getByLabelText('Date de paiement'),
      '2026-07-12',
    );
    await userEvent.selectOptions(
      screen.getByLabelText('Mode de paiement'),
      'CASH',
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Créer le règlement' }),
    );

    await screen.findByRole('alert');
    expect(
      screen.queryByRole('button', {
        name: 'Réessayer la création du règlement',
      }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Créer le règlement' }),
    ).toBeEnabled();
  });

  it('opens allocation after creating a pending payment', async () => {
    const execute = jest.fn().mockResolvedValue(PENDING_PAYMENT);
    const createMutationIntent = jest.fn(() => ({ execute }));
    const request = jest.fn().mockResolvedValue({
      items: [ELIGIBLE_INVOICE],
      nextCursor: null,
    });

    jest.mocked(useErpMarocContext).mockReturnValue({
      status: 'ready',
      context: {
        societeId: SOCIETE_ID,
        role: 'ADMIN',
        capabilities: { createPendingPayment: true, postPayment: true },
      } as never,
      error: null,
      refetch: jest.fn(),
      client: { request, createMutationIntent } as never,
    });

    render(
      <MemoryRouter
        initialEntries={['/erp-maroc/payments/new']}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <ErpPaymentEditorPage />
      </MemoryRouter>,
    );

    await userEvent.type(screen.getByLabelText('Client'), CLIENT_ID);
    await userEvent.type(screen.getByLabelText('Montant (centimes)'), '12500');
    await userEvent.type(
      screen.getByLabelText('Date de paiement'),
      '2026-07-12',
    );
    await userEvent.selectOptions(
      screen.getByLabelText('Mode de paiement'),
      'CASH',
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Créer le règlement' }),
    );

    await waitFor(() =>
      expect(request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          path: '/payments/payment-id/eligible-invoices',
        }),
      ),
    );
    await screen.findByRole('button', { name: 'Ventiler le règlement' });
  });

  it('allocates a pending payment across the exact suggested eligible invoices', async () => {
    const createExecute = jest.fn().mockResolvedValue(PENDING_PAYMENT);
    const allocateExecute = jest.fn().mockResolvedValue({
      ...PENDING_PAYMENT,
      status: 'POSTED',
    });
    const createMutationIntent = jest
      .fn()
      .mockReturnValueOnce({ execute: createExecute })
      .mockReturnValueOnce({ execute: allocateExecute });
    const request = jest.fn().mockResolvedValue({
      items: [ELIGIBLE_INVOICE, NEXT_ELIGIBLE_INVOICE],
      nextCursor: null,
    });

    jest.mocked(useErpMarocContext).mockReturnValue({
      status: 'ready',
      context: {
        societeId: SOCIETE_ID,
        role: 'ADMIN',
        capabilities: { createPendingPayment: true, postPayment: true },
      } as never,
      error: null,
      refetch: jest.fn(),
      client: { request, createMutationIntent } as never,
    });

    render(
      <MemoryRouter
        initialEntries={['/erp-maroc/payments/new']}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <ErpPaymentEditorPage />
      </MemoryRouter>,
    );

    await userEvent.type(screen.getByLabelText('Client'), CLIENT_ID);
    await userEvent.type(screen.getByLabelText('Montant (centimes)'), '12500');
    await userEvent.type(
      screen.getByLabelText('Date de paiement'),
      '2026-07-12',
    );
    await userEvent.selectOptions(
      screen.getByLabelText('Mode de paiement'),
      'CASH',
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Créer le règlement' }),
    );
    await userEvent.click(
      await screen.findByRole('button', { name: 'Ventiler le règlement' }),
    );

    await waitFor(() =>
      expect(createMutationIntent).toHaveBeenLastCalledWith(
        expect.objectContaining({
          method: 'POST',
          path: '/payments/payment-id/allocate',
          body: {
            allocations: [
              { invoiceId: INVOICE_ID, amountCents: 6_000 },
              {
                invoiceId: NEXT_ELIGIBLE_INVOICE.id,
                amountCents: 6_500,
              },
            ],
          },
        }),
        { idempotency: 'required' },
      ),
    );
    expect(allocateExecute).toHaveBeenCalledTimes(1);
  });

  it('retries an ambiguously failed payment allocation with the original intent', async () => {
    const createExecute = jest.fn().mockResolvedValue(PENDING_PAYMENT);
    const createRetry = jest.fn();
    const allocateExecute = jest
      .fn()
      .mockRejectedValue(new Error('Network request timed out'));
    const allocateRetry = jest.fn().mockResolvedValue({
      ...PENDING_PAYMENT,
      status: 'POSTED',
    });
    const createMutationIntent = jest
      .fn()
      .mockReturnValueOnce({ execute: createExecute, retry: createRetry })
      .mockReturnValueOnce({ execute: allocateExecute, retry: allocateRetry });
    const request = jest.fn().mockResolvedValue({
      items: [ELIGIBLE_INVOICE, NEXT_ELIGIBLE_INVOICE],
      nextCursor: null,
    });

    jest.mocked(useErpMarocContext).mockReturnValue({
      status: 'ready',
      context: {
        societeId: SOCIETE_ID,
        role: 'ADMIN',
        capabilities: { createPendingPayment: true, postPayment: true },
      } as never,
      error: null,
      refetch: jest.fn(),
      client: { request, createMutationIntent } as never,
    });

    render(
      <MemoryRouter
        initialEntries={['/erp-maroc/payments/new']}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <ErpPaymentEditorPage />
      </MemoryRouter>,
    );

    await userEvent.type(screen.getByLabelText('Client'), CLIENT_ID);
    await userEvent.type(screen.getByLabelText('Montant (centimes)'), '12500');
    await userEvent.type(
      screen.getByLabelText('Date de paiement'),
      '2026-07-12',
    );
    await userEvent.selectOptions(
      screen.getByLabelText('Mode de paiement'),
      'CASH',
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Créer le règlement' }),
    );
    await userEvent.click(
      await screen.findByRole('button', { name: 'Ventiler le règlement' }),
    );

    const retryButton = await screen.findByRole('button', {
      name: 'Réessayer la ventilation du règlement',
    });
    expect(createMutationIntent).toHaveBeenCalledTimes(2);
    expect(allocateExecute).toHaveBeenCalledTimes(1);
    expect(
      screen.queryByRole('button', { name: 'Ventiler le règlement' }),
    ).not.toBeInTheDocument();

    await userEvent.click(retryButton);

    await waitFor(() => expect(allocateRetry).toHaveBeenCalledTimes(1));
    expect(createRetry).not.toHaveBeenCalled();
    expect(allocateExecute).toHaveBeenCalledTimes(1);
    expect(createMutationIntent).toHaveBeenCalledTimes(2);
    await waitFor(() =>
      expect(
        screen.queryByRole('button', { name: 'Ventiler le règlement' }),
      ).not.toBeInTheDocument(),
    );
  });

  it.each([
    new ErpMarocError('ERP_STATE_CONFLICT', 409),
    new Error('Network request timed out'),
    new ErpMarocError('ERP_UNKNOWN', 502),
  ])(
    'reconciles an ambiguously failed allocation when %p finds a posted payment',
    async (failure) => {
      const createExecute = jest.fn().mockResolvedValue(PENDING_PAYMENT);
      const allocateExecute = jest.fn().mockRejectedValue(failure);
      const allocateRetry = jest.fn();
      const createMutationIntent = jest
        .fn()
        .mockReturnValueOnce({ execute: createExecute })
        .mockReturnValueOnce({
          execute: allocateExecute,
          retry: allocateRetry,
        });
      const request = jest
        .fn()
        .mockResolvedValueOnce({
          items: [ELIGIBLE_INVOICE, NEXT_ELIGIBLE_INVOICE],
          nextCursor: null,
        })
        .mockResolvedValueOnce({ ...PENDING_PAYMENT, status: 'POSTED' });

      jest.mocked(useErpMarocContext).mockReturnValue({
        status: 'ready',
        context: {
          societeId: SOCIETE_ID,
          role: 'ADMIN',
          capabilities: { createPendingPayment: true, postPayment: true },
        } as never,
        error: null,
        refetch: jest.fn(),
        client: { request, createMutationIntent } as never,
      });

      render(
        <MemoryRouter
          initialEntries={['/erp-maroc/payments/new']}
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        >
          <ErpPaymentEditorPage />
          <LocationProbe />
        </MemoryRouter>,
      );

      await userEvent.type(screen.getByLabelText('Client'), CLIENT_ID);
      await userEvent.type(
        screen.getByLabelText('Montant (centimes)'),
        '12500',
      );
      await userEvent.type(
        screen.getByLabelText('Date de paiement'),
        '2026-07-12',
      );
      await userEvent.selectOptions(
        screen.getByLabelText('Mode de paiement'),
        'CASH',
      );
      await userEvent.click(
        screen.getByRole('button', { name: 'Créer le règlement' }),
      );
      await userEvent.click(
        await screen.findByRole('button', { name: 'Ventiler le règlement' }),
      );

      await waitFor(() =>
        expect(request).toHaveBeenLastCalledWith(
          expect.objectContaining({
            method: 'GET',
            path: '/payments/payment-id',
            schema: expect.anything(),
          }),
        ),
      );
      expect(screen.getByLabelText('URL courante')).toHaveTextContent(
        '/erp-maroc/payments/payment-id',
      );
      expect(allocateRetry).not.toHaveBeenCalled();
      expect(
        screen.queryByRole('button', {
          name: 'Réessayer la ventilation du règlement',
        }),
      ).not.toBeInTheDocument();
    },
  );

  it('allocates all eligible invoices oldest first when a later invoice is preselected', async () => {
    const pendingPayment = {
      ...PENDING_PAYMENT,
      amountCents: 6_500,
    };
    const createExecute = jest.fn().mockResolvedValue(pendingPayment);
    const allocateExecute = jest.fn().mockResolvedValue({
      ...pendingPayment,
      status: 'POSTED',
    });
    const createMutationIntent = jest
      .fn()
      .mockReturnValueOnce({ execute: createExecute })
      .mockReturnValueOnce({ execute: allocateExecute });
    const request = jest.fn().mockResolvedValue({
      items: [ELIGIBLE_INVOICE, NEXT_ELIGIBLE_INVOICE],
      nextCursor: null,
    });

    jest.mocked(useErpMarocContext).mockReturnValue({
      status: 'ready',
      context: {
        societeId: SOCIETE_ID,
        role: 'ADMIN',
        capabilities: { createPendingPayment: true, postPayment: true },
      } as never,
      error: null,
      refetch: jest.fn(),
      client: { request, createMutationIntent } as never,
    });

    render(
      <MemoryRouter
        initialEntries={[
          `/erp-maroc/payments/new?invoiceId=${NEXT_ELIGIBLE_INVOICE.id}`,
        ]}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <ErpPaymentEditorPage />
      </MemoryRouter>,
    );

    await userEvent.type(screen.getByLabelText('Client'), CLIENT_ID);
    await userEvent.type(screen.getByLabelText('Montant (centimes)'), '6500');
    await userEvent.type(
      screen.getByLabelText('Date de paiement'),
      '2026-07-12',
    );
    await userEvent.selectOptions(
      screen.getByLabelText('Mode de paiement'),
      'CASH',
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Créer le règlement' }),
    );
    await userEvent.click(
      await screen.findByRole('button', { name: 'Ventiler le règlement' }),
    );

    await waitFor(() =>
      expect(createMutationIntent).toHaveBeenLastCalledWith(
        expect.objectContaining({
          method: 'POST',
          path: '/payments/payment-id/allocate',
          body: {
            allocations: [
              { invoiceId: INVOICE_ID, amountCents: 6_000 },
              { invoiceId: NEXT_ELIGIBLE_INVOICE.id, amountCents: 500 },
            ],
          },
        }),
        { idempotency: 'required' },
      ),
    );
    expect(allocateExecute).toHaveBeenCalledTimes(1);
  });

  it('does not offer allocation for a stale eligible invoice response after navigation', async () => {
    const createMutationIntent = jest.fn(() => ({
      execute: jest.fn().mockResolvedValue(PENDING_PAYMENT),
    }));
    const initialEligiblePage = createDeferred<{
      items: ErpEligibleInvoice[];
      nextCursor: null;
    }>();
    const nextEligiblePage = createDeferred<{
      items: ErpEligibleInvoice[];
      nextCursor: null;
    }>();
    const request = jest
      .fn()
      .mockReturnValueOnce(initialEligiblePage.promise)
      .mockReturnValueOnce(nextEligiblePage.promise);

    jest.mocked(useErpMarocContext).mockReturnValue({
      status: 'ready',
      context: {
        societeId: SOCIETE_ID,
        role: 'ADMIN',
        capabilities: { createPendingPayment: true, postPayment: true },
      } as never,
      error: null,
      refetch: jest.fn(),
      client: { request, createMutationIntent } as never,
    });

    render(
      <MemoryRouter
        initialEntries={[`/erp-maroc/payments/new?invoiceId=${INVOICE_ID}`]}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <NavigateToInvoice invoiceId={NEXT_ELIGIBLE_INVOICE.id} />
        <ErpPaymentEditorPage />
      </MemoryRouter>,
    );

    await userEvent.type(screen.getByLabelText('Client'), CLIENT_ID);
    await userEvent.type(screen.getByLabelText('Montant (centimes)'), '12500');
    await userEvent.type(
      screen.getByLabelText('Date de paiement'),
      '2026-07-12',
    );
    await userEvent.selectOptions(
      screen.getByLabelText('Mode de paiement'),
      'CASH',
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Créer le règlement' }),
    );
    await waitFor(() => expect(request).toHaveBeenCalledTimes(1));

    await userEvent.click(
      screen.getByRole('button', { name: 'Choisir la facture suivante' }),
    );
    await act(async () => {
      initialEligiblePage.resolve({
        items: [ELIGIBLE_INVOICE],
        nextCursor: null,
      });
      await initialEligiblePage.promise;
    });

    expect(
      screen.queryByRole('button', { name: 'Ventiler le règlement' }),
    ).not.toBeInTheDocument();

    await waitFor(() => expect(request).toHaveBeenCalledTimes(2));
    await act(async () => {
      nextEligiblePage.resolve({
        items: [NEXT_ELIGIBLE_INVOICE],
        nextCursor: null,
      });
      await nextEligiblePage.promise;
    });

    expect(
      await screen.findByRole('button', { name: 'Ventiler le règlement' }),
    ).toBeInTheDocument();
  });

  it('allocates only the current selected invoice when eligible loading overlaps navigation', async () => {
    const pendingPayment = {
      ...PENDING_PAYMENT,
      amountCents: 6_500,
    };
    const createExecute = jest.fn().mockResolvedValue(pendingPayment);
    const allocateExecute = jest.fn().mockResolvedValue({
      ...pendingPayment,
      status: 'POSTED',
    });
    const createMutationIntent = jest
      .fn()
      .mockReturnValueOnce({ execute: createExecute })
      .mockReturnValueOnce({ execute: allocateExecute });
    const initialEligiblePage = createDeferred<{
      items: ErpEligibleInvoice[];
      nextCursor: null;
    }>();
    const nextEligiblePage = createDeferred<{
      items: ErpEligibleInvoice[];
      nextCursor: null;
    }>();
    const request = jest
      .fn()
      .mockReturnValueOnce(initialEligiblePage.promise)
      .mockReturnValueOnce(nextEligiblePage.promise);

    jest.mocked(useErpMarocContext).mockReturnValue({
      status: 'ready',
      context: {
        societeId: SOCIETE_ID,
        role: 'ADMIN',
        capabilities: { createPendingPayment: true, postPayment: true },
      } as never,
      error: null,
      refetch: jest.fn(),
      client: { request, createMutationIntent } as never,
    });

    render(
      <MemoryRouter
        initialEntries={[`/erp-maroc/payments/new?invoiceId=${INVOICE_ID}`]}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <NavigateToInvoice invoiceId={NEXT_ELIGIBLE_INVOICE.id} />
        <ErpPaymentEditorPage />
      </MemoryRouter>,
    );

    await userEvent.type(screen.getByLabelText('Client'), CLIENT_ID);
    await userEvent.type(screen.getByLabelText('Montant (centimes)'), '6500');
    await userEvent.type(
      screen.getByLabelText('Date de paiement'),
      '2026-07-12',
    );
    await userEvent.selectOptions(
      screen.getByLabelText('Mode de paiement'),
      'CASH',
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Créer le règlement' }),
    );
    await waitFor(() => expect(request).toHaveBeenCalledTimes(1));

    await userEvent.click(
      screen.getByRole('button', { name: 'Choisir la facture suivante' }),
    );
    await act(async () => {
      initialEligiblePage.resolve({
        items: [ELIGIBLE_INVOICE],
        nextCursor: null,
      });
      await initialEligiblePage.promise;
      await Promise.resolve();
    });

    expect(
      screen.queryByRole('button', { name: 'Ventiler le règlement' }),
    ).not.toBeInTheDocument();

    await waitFor(() => expect(request).toHaveBeenCalledTimes(2));
    await act(async () => {
      nextEligiblePage.resolve({
        items: [NEXT_ELIGIBLE_INVOICE],
        nextCursor: null,
      });
      await nextEligiblePage.promise;
      await Promise.resolve();
    });

    await userEvent.click(
      await screen.findByRole('button', { name: 'Ventiler le règlement' }),
    );

    await waitFor(() =>
      expect(createMutationIntent).toHaveBeenLastCalledWith(
        expect.objectContaining({
          method: 'POST',
          path: '/payments/payment-id/allocate',
          body: {
            allocations: [
              {
                invoiceId: NEXT_ELIGIBLE_INVOICE.id,
                amountCents: 6_500,
              },
            ],
          },
        }),
        { idempotency: 'required' },
      ),
    );
    expect(allocateExecute).toHaveBeenCalledTimes(1);
  });

  it('does not offer allocation when the preselected invoice is no longer eligible', async () => {
    const pendingPayment = {
      ...PENDING_PAYMENT,
      amountCents: 6_500,
    };
    const execute = jest.fn().mockResolvedValue(pendingPayment);
    const createMutationIntent = jest.fn(() => ({ execute }));
    const request = jest.fn().mockResolvedValue({
      items: [ELIGIBLE_INVOICE],
      nextCursor: null,
    });

    jest.mocked(useErpMarocContext).mockReturnValue({
      status: 'ready',
      context: {
        societeId: SOCIETE_ID,
        role: 'ADMIN',
        capabilities: { createPendingPayment: true, postPayment: true },
      } as never,
      error: null,
      refetch: jest.fn(),
      client: { request, createMutationIntent } as never,
    });

    render(
      <MemoryRouter
        initialEntries={[
          `/erp-maroc/payments/new?invoiceId=${NEXT_ELIGIBLE_INVOICE.id}`,
        ]}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <ErpPaymentEditorPage />
      </MemoryRouter>,
    );

    await userEvent.type(screen.getByLabelText('Client'), CLIENT_ID);
    await userEvent.type(screen.getByLabelText('Montant (centimes)'), '6500');
    await userEvent.type(
      screen.getByLabelText('Date de paiement'),
      '2026-07-12',
    );
    await userEvent.selectOptions(
      screen.getByLabelText('Mode de paiement'),
      'CASH',
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Créer le règlement' }),
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      "La facture sélectionnée n'est plus éligible à la ventilation.",
    );
    expect(
      screen.queryByRole('button', { name: 'Ventiler le règlement' }),
    ).not.toBeInTheDocument();
  });

  it('fetches every eligible invoice page before allocating a pending payment', async () => {
    const createExecute = jest.fn().mockResolvedValue(PENDING_PAYMENT);
    const allocateExecute = jest.fn().mockResolvedValue({
      ...PENDING_PAYMENT,
      status: 'POSTED',
    });
    const createMutationIntent = jest
      .fn()
      .mockReturnValueOnce({ execute: createExecute })
      .mockReturnValueOnce({ execute: allocateExecute });
    const request = jest
      .fn()
      .mockResolvedValueOnce({
        items: [ELIGIBLE_INVOICE],
        nextCursor: NEXT_ELIGIBLE_INVOICE.id,
      })
      .mockResolvedValueOnce({
        items: [NEXT_ELIGIBLE_INVOICE],
        nextCursor: null,
      });

    jest.mocked(useErpMarocContext).mockReturnValue({
      status: 'ready',
      context: {
        societeId: SOCIETE_ID,
        role: 'ADMIN',
        capabilities: { createPendingPayment: true, postPayment: true },
      } as never,
      error: null,
      refetch: jest.fn(),
      client: { request, createMutationIntent } as never,
    });

    render(
      <MemoryRouter
        initialEntries={['/erp-maroc/payments/new']}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <ErpPaymentEditorPage />
      </MemoryRouter>,
    );

    await userEvent.type(screen.getByLabelText('Client'), CLIENT_ID);
    await userEvent.type(screen.getByLabelText('Montant (centimes)'), '12500');
    await userEvent.type(
      screen.getByLabelText('Date de paiement'),
      '2026-07-12',
    );
    await userEvent.selectOptions(
      screen.getByLabelText('Mode de paiement'),
      'CASH',
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Créer le règlement' }),
    );
    await userEvent.click(
      await screen.findByRole('button', { name: 'Ventiler le règlement' }),
    );

    await waitFor(() =>
      expect(request).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          method: 'GET',
          path: '/payments/payment-id/eligible-invoices',
          query: { cursor: NEXT_ELIGIBLE_INVOICE.id },
        }),
      ),
    );
    await waitFor(() =>
      expect(createMutationIntent).toHaveBeenLastCalledWith(
        expect.objectContaining({
          method: 'POST',
          path: '/payments/payment-id/allocate',
          body: {
            allocations: [
              { invoiceId: INVOICE_ID, amountCents: 6_000 },
              {
                invoiceId: NEXT_ELIGIBLE_INVOICE.id,
                amountCents: 6_500,
              },
            ],
          },
        }),
        { idempotency: 'required' },
      ),
    );
    expect(allocateExecute).toHaveBeenCalledTimes(1);
  });

  it('retries loading eligible invoices after a later page fails for a pending payment', async () => {
    const createExecute = jest.fn().mockResolvedValue(PENDING_PAYMENT);
    const createMutationIntent = jest.fn(() => ({ execute: createExecute }));
    const request = jest
      .fn()
      .mockResolvedValueOnce({
        items: [ELIGIBLE_INVOICE],
        nextCursor: NEXT_ELIGIBLE_INVOICE.id,
      })
      .mockRejectedValueOnce(new Error('Eligible invoice page failed'))
      .mockResolvedValueOnce({
        items: [ELIGIBLE_INVOICE],
        nextCursor: NEXT_ELIGIBLE_INVOICE.id,
      })
      .mockResolvedValueOnce({
        items: [NEXT_ELIGIBLE_INVOICE],
        nextCursor: null,
      });

    jest.mocked(useErpMarocContext).mockReturnValue({
      status: 'ready',
      context: {
        societeId: SOCIETE_ID,
        role: 'ADMIN',
        capabilities: { createPendingPayment: true, postPayment: true },
      } as never,
      error: null,
      refetch: jest.fn(),
      client: { request, createMutationIntent } as never,
    });

    render(
      <MemoryRouter
        initialEntries={['/erp-maroc/payments/new']}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <ErpPaymentEditorPage />
      </MemoryRouter>,
    );

    await userEvent.type(screen.getByLabelText('Client'), CLIENT_ID);
    await userEvent.type(screen.getByLabelText('Montant (centimes)'), '12500');
    await userEvent.type(
      screen.getByLabelText('Date de paiement'),
      '2026-07-12',
    );
    await userEvent.selectOptions(
      screen.getByLabelText('Mode de paiement'),
      'CASH',
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Créer le règlement' }),
    );

    const retryButton = await screen.findByRole('button', {
      name: 'Réessayer le chargement des factures',
    });
    await waitFor(() => expect(retryButton).toBeEnabled());
    expect(
      screen.queryByRole('button', { name: 'Ventiler le règlement' }),
    ).not.toBeInTheDocument();
    expect(createMutationIntent).toHaveBeenCalledTimes(1);
    expect(
      screen.getByRole('button', { name: 'Créer le règlement' }),
    ).toBeDisabled();

    await userEvent.click(retryButton);

    await waitFor(() => expect(request).toHaveBeenCalledTimes(4));
    expect(request).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        method: 'GET',
        path: '/payments/payment-id/eligible-invoices',
      }),
    );
    expect(request.mock.calls[2][0]).not.toHaveProperty('query');
    expect(request).toHaveBeenNthCalledWith(
      4,
      expect.objectContaining({
        method: 'GET',
        path: '/payments/payment-id/eligible-invoices',
        query: { cursor: NEXT_ELIGIBLE_INVOICE.id },
      }),
    );
    expect(createMutationIntent).toHaveBeenCalledTimes(1);
    expect(
      await screen.findByRole('button', { name: 'Ventiler le règlement' }),
    ).toBeInTheDocument();
  });

  it('removes the allocation control after an allocation posts the payment', async () => {
    const createExecute = jest.fn().mockResolvedValue(PENDING_PAYMENT);
    let resolveAllocation: (payment: ErpPayment) => void;
    const allocationPromise = new Promise<ErpPayment>((resolve) => {
      resolveAllocation = resolve;
    });
    const allocateExecute = jest.fn(() => allocationPromise);
    const createMutationIntent = jest
      .fn()
      .mockReturnValueOnce({ execute: createExecute })
      .mockReturnValueOnce({ execute: allocateExecute });
    const request = jest.fn().mockResolvedValue({
      items: [ELIGIBLE_INVOICE, NEXT_ELIGIBLE_INVOICE],
      nextCursor: null,
    });

    jest.mocked(useErpMarocContext).mockReturnValue({
      status: 'ready',
      context: {
        societeId: SOCIETE_ID,
        role: 'ADMIN',
        capabilities: { createPendingPayment: true, postPayment: true },
      } as never,
      error: null,
      refetch: jest.fn(),
      client: { request, createMutationIntent } as never,
    });

    render(
      <MemoryRouter
        initialEntries={['/erp-maroc/payments/new']}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <ErpPaymentEditorPage />
      </MemoryRouter>,
    );

    await userEvent.type(screen.getByLabelText('Client'), CLIENT_ID);
    await userEvent.type(screen.getByLabelText('Montant (centimes)'), '12500');
    await userEvent.type(
      screen.getByLabelText('Date de paiement'),
      '2026-07-12',
    );
    await userEvent.selectOptions(
      screen.getByLabelText('Mode de paiement'),
      'CASH',
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Créer le règlement' }),
    );

    await waitFor(() =>
      expect(request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          path: '/payments/payment-id/eligible-invoices',
        }),
      ),
    );
    await userEvent.click(
      await screen.findByRole('button', { name: 'Ventiler le règlement' }),
    );

    await waitFor(() => expect(allocateExecute).toHaveBeenCalledTimes(1));
    await act(async () => {
      resolveAllocation({ ...PENDING_PAYMENT, status: 'POSTED' });
      await allocationPromise;
    });

    await waitFor(() =>
      expect(
        screen.queryByRole('button', { name: 'Ventiler le règlement' }),
      ).not.toBeInTheDocument(),
    );
  });

  it('keeps the allocation control available when the allocation remains pending', async () => {
    const createExecute = jest.fn().mockResolvedValue(PENDING_PAYMENT);
    let resolveAllocation: (payment: ErpPayment) => void;
    const allocationPromise = new Promise<ErpPayment>((resolve) => {
      resolveAllocation = resolve;
    });
    const allocateExecute = jest.fn(() => allocationPromise);
    const createMutationIntent = jest
      .fn()
      .mockReturnValueOnce({ execute: createExecute })
      .mockReturnValueOnce({ execute: allocateExecute });
    const request = jest.fn().mockResolvedValue({
      items: [ELIGIBLE_INVOICE, NEXT_ELIGIBLE_INVOICE],
      nextCursor: null,
    });

    jest.mocked(useErpMarocContext).mockReturnValue({
      status: 'ready',
      context: {
        societeId: SOCIETE_ID,
        role: 'ADMIN',
        capabilities: { createPendingPayment: true, postPayment: true },
      } as never,
      error: null,
      refetch: jest.fn(),
      client: { request, createMutationIntent } as never,
    });

    render(
      <MemoryRouter
        initialEntries={['/erp-maroc/payments/new']}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <ErpPaymentEditorPage />
      </MemoryRouter>,
    );

    await userEvent.type(screen.getByLabelText('Client'), CLIENT_ID);
    await userEvent.type(screen.getByLabelText('Montant (centimes)'), '12500');
    await userEvent.type(
      screen.getByLabelText('Date de paiement'),
      '2026-07-12',
    );
    await userEvent.selectOptions(
      screen.getByLabelText('Mode de paiement'),
      'CASH',
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Créer le règlement' }),
    );
    await userEvent.click(
      await screen.findByRole('button', { name: 'Ventiler le règlement' }),
    );

    await waitFor(() => expect(allocateExecute).toHaveBeenCalledTimes(1));
    await act(async () => {
      resolveAllocation(PENDING_PAYMENT);
      await allocationPromise;
    });

    expect(
      await screen.findByRole('button', { name: 'Ventiler le règlement' }),
    ).toBeInTheDocument();
  });
});
