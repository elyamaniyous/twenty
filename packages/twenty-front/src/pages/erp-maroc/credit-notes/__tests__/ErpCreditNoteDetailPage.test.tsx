import { ErpMarocError } from '@/erp-maroc/api/erpMarocError';
import { useErpMarocContext } from '@/erp-maroc/context/useErpMarocContext';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import {
  erpCreditNoteSchema,
  erpEligibleInvoicePageSchema,
  type ErpCreditNote,
} from 'twenty-shared/erp-maroc';

// oxlint-disable-next-line eslint/no-restricted-imports -- Pages are outside the @/ modules alias.
import { ErpCreditNoteDetailPage } from '../ErpCreditNoteDetailPage';

jest.mock('@/erp-maroc/context/useErpMarocContext', () => ({
  useErpMarocContext: jest.fn(),
}));

const CREDIT_NOTE_ID = '0193f6ea-7c39-7aa2-8000-000000000000';
const SOCIETE_ID = '0193f6ea-7c39-7aa2-8000-000000000001';
const SOURCE_INVOICE_ID = '0193f6ea-7c39-7aa2-8000-000000000002';
const TIER_ID = '0193f6ea-7c39-7aa2-8000-000000000003';
const SOURCE_LINE_ID = '0193f6ea-7c39-7aa2-8000-000000000004';
const CREDIT_NOTE_LINE_ID = '0193f6ea-7c39-7aa2-8000-000000000005';
const TARGET_INVOICE_ID = '0193f6ea-7c39-7aa2-8000-000000000006';
const ALLOCATION_ID = '0193f6ea-7c39-7aa2-8000-000000000007';

const creditNote: ErpCreditNote = {
  id: CREDIT_NOTE_ID,
  societeId: SOCIETE_ID,
  sourceInvoiceId: SOURCE_INVOICE_ID,
  sourceInvoiceNumber: 'FAC-2026-0042',
  tierId: TIER_ID,
  number: null,
  year: null,
  status: 'DRAFT',
  issueDate: '2026-07-10',
  currency: 'MAD',
  totalHtCents: 10_000,
  totalTvaCents: 2_000,
  totalTtcCents: 12_000,
  availableCreditCents: 12_000,
  allocatedCents: 0,
  lines: [
    {
      id: CREDIT_NOTE_LINE_ID,
      sourceInvoiceLineId: SOURCE_LINE_ID,
      description: 'Prestation annulée',
      quantity: 2,
      unit: 'heure',
      unitPriceHtCents: 5_000,
      tvaRate: 20,
      amountHtCents: 10_000,
      totalTvaCents: 2_000,
      totalTtcCents: 12_000,
      position: 0,
    },
  ],
  allocations: [],
  validatedAt: null,
  cancelledAt: null,
  createdAt: '2026-07-10T12:00:00.000Z',
  updatedAt: '2026-07-11T12:00:00.000Z',
};

const eligibleInvoices = {
  items: [
    {
      id: TARGET_INVOICE_ID,
      number: 'FAC-2026-0043',
      title: 'Facture de régularisation',
      dueDate: '2026-07-31',
      totalTtcCents: 8_000,
      paidCents: 0,
      outstandingCents: 8_000,
      isOverdue: false,
    },
  ],
  nextCursor: null,
};

const renderCreditNoteDetail = () =>
  render(
    <MemoryRouter
      initialEntries={[`/erp-maroc/credit-notes/${CREDIT_NOTE_ID}`]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <Routes>
        <Route
          path="/erp-maroc/credit-notes/:id"
          element={<ErpCreditNoteDetailPage />}
        />
      </Routes>
    </MemoryRouter>,
  );

const mockContext = ({
  request,
  createMutationIntent = jest.fn(),
  role = 'COMPTABLE',
  capabilities = { manageCreditNotes: true },
}: {
  request: jest.Mock;
  createMutationIntent?: jest.Mock;
  role?: string;
  capabilities?: Record<string, boolean>;
}) => {
  jest.mocked(useErpMarocContext).mockReturnValue({
    status: 'ready',
    context: {
      role,
      societeId: SOCIETE_ID,
      capabilities,
    } as never,
    error: null,
    refetch: jest.fn(),
    client: { request, createMutationIntent } as never,
  });
};

describe('ErpCreditNoteDetailPage', () => {
  beforeEach(() => {
    jest.mocked(useErpMarocContext).mockReset();
  });

  it('loads and renders immutable source lines, totals, allocations, and audit details', async () => {
    const validatedCreditNote: ErpCreditNote = {
      ...creditNote,
      number: 'AV-2026-0001',
      year: 2026,
      status: 'VALIDATED',
      availableCreditCents: 8_000,
      allocatedCents: 4_000,
      validatedAt: '2026-07-11T09:00:00.000Z',
      allocations: [
        {
          id: ALLOCATION_ID,
          invoiceId: TARGET_INVOICE_ID,
          amountCents: 4_000,
          kind: 'CUSTOMER_CREDIT',
          createdAt: '2026-07-11T10:00:00.000Z',
        },
      ],
    };
    const request = jest.fn(async () => validatedCreditNote);
    mockContext({
      request,
      capabilities: { allocateCustomerCredit: false, manageCreditNotes: true },
    });

    renderCreditNoteDetail();

    await waitFor(() =>
      expect(request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          path: `/credit-notes/${CREDIT_NOTE_ID}`,
          schema: erpCreditNoteSchema,
        }),
      ),
    );
    expect(await screen.findByText('Prestation annulée')).toBeVisible();
    expect(screen.getByText('FAC-2026-0042')).toBeVisible();
    expect(screen.getByTestId('credit-note-total-ht')).toHaveTextContent(
      '100,00 MAD',
    );
    expect(screen.getByTestId('credit-note-total-tva')).toHaveTextContent(
      '20,00 MAD',
    );
    expect(screen.getByTestId('credit-note-total-ttc')).toHaveTextContent(
      '120,00 MAD',
    );
    expect(
      screen.getByRole('link', { name: TARGET_INVOICE_ID }),
    ).toHaveAttribute('href', `/erp-maroc/invoices/${TARGET_INVOICE_ID}`);
    expect(screen.getByText('Créé le')).toBeVisible();
    expect(screen.getByText('Validé le')).toBeVisible();
    expect(screen.getByText('Mis à jour le')).toBeVisible();
  });

  it('shows validate and cancel only for a permitted draft credit note', async () => {
    const request = jest.fn(async () => creditNote);
    mockContext({ request });

    renderCreditNoteDetail();

    expect(
      await screen.findByRole('button', { name: "Valider l'avoir" }),
    ).toBeVisible();
    expect(
      screen.getByRole('button', { name: "Annuler l'avoir" }),
    ).toBeVisible();
    expect(
      screen.queryByRole('button', { name: "Ventiler l'avoir" }),
    ).not.toBeInTheDocument();
  });

  it('allows allocation only for validated available credit with the allocation capability and never offers cancellation then', async () => {
    const validatedCreditNote: ErpCreditNote = {
      ...creditNote,
      number: 'AV-2026-0001',
      year: 2026,
      status: 'VALIDATED',
    };
    const request = jest.fn(async ({ path }: { path: string }) => {
      if (path === `/credit-notes/${CREDIT_NOTE_ID}`)
        return validatedCreditNote;
      if (path === `/credit-notes/${CREDIT_NOTE_ID}/eligible-invoices`)
        return eligibleInvoices;
      throw new Error(`Unexpected request: ${path}`);
    });
    mockContext({
      request,
      capabilities: {
        manageCreditNotes: true,
        allocateCustomerCredit: true,
      },
    });

    renderCreditNoteDetail();

    expect(
      await screen.findByRole('button', { name: "Ventiler l'avoir" }),
    ).toBeVisible();
    expect(
      screen.queryByRole('button', { name: "Annuler l'avoir" }),
    ).not.toBeInTheDocument();
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'GET',
        path: `/credit-notes/${CREDIT_NOTE_ID}/eligible-invoices`,
        schema: erpEligibleInvoicePageSchema,
      }),
    );
  });

  it('validates a draft through a required-idempotency intent with the credit-note id payload', async () => {
    const validatedCreditNote: ErpCreditNote = {
      ...creditNote,
      number: 'AV-2026-0001',
      year: 2026,
      status: 'VALIDATED',
      validatedAt: '2026-07-11T09:00:00.000Z',
    };
    const request = jest.fn(async () => creditNote);
    const execute = jest.fn().mockResolvedValue(validatedCreditNote);
    const createMutationIntent = jest.fn(() => ({
      idempotencyKey: 'validate-credit-note',
      execute,
      retry: jest.fn(),
    }));
    mockContext({ request, createMutationIntent });

    renderCreditNoteDetail();

    fireEvent.click(
      await screen.findByRole('button', { name: "Valider l'avoir" }),
    );
    fireEvent.click(screen.getByTestId('erp-confirm-dialog-confirm'));

    await waitFor(() =>
      expect(createMutationIntent).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          path: `/credit-notes/${CREDIT_NOTE_ID}/validate`,
          schema: erpCreditNoteSchema,
          body: { creditNoteId: CREDIT_NOTE_ID },
        }),
        { idempotency: 'required' },
      ),
    );
    expect(await screen.findByText('Validé')).toBeVisible();
  });

  it('cancels a draft through a required-idempotency intent with the prescribed reason', async () => {
    const cancelledCreditNote: ErpCreditNote = {
      ...creditNote,
      number: 'AV-2026-0001',
      year: 2026,
      status: 'CANCELLED',
      cancelledAt: '2026-07-11T09:00:00.000Z',
    };
    const request = jest.fn(async () => creditNote);
    const execute = jest.fn().mockResolvedValue(cancelledCreditNote);
    const createMutationIntent = jest.fn(() => ({
      idempotencyKey: 'cancel-credit-note',
      execute,
      retry: jest.fn(),
    }));
    mockContext({ request, createMutationIntent });

    renderCreditNoteDetail();

    fireEvent.click(
      await screen.findByRole('button', { name: "Annuler l'avoir" }),
    );
    fireEvent.click(screen.getByTestId('erp-confirm-dialog-confirm'));

    await waitFor(() =>
      expect(createMutationIntent).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          path: `/credit-notes/${CREDIT_NOTE_ID}/cancel`,
          schema: erpCreditNoteSchema,
          body: {
            creditNoteId: CREDIT_NOTE_ID,
            reason: 'Annulation du brouillon depuis le CRM.',
          },
        }),
        { idempotency: 'required' },
      ),
    );
    expect(await screen.findByText('Annulé')).toBeVisible();
  });

  it('clamps the allocation payload before posting it through a required-idempotency intent', async () => {
    const validatedCreditNote: ErpCreditNote = {
      ...creditNote,
      number: 'AV-2026-0001',
      year: 2026,
      status: 'VALIDATED',
      availableCreditCents: 6_000,
      totalTtcCents: 12_000,
    };
    const allocatedCreditNote: ErpCreditNote = {
      ...validatedCreditNote,
      availableCreditCents: 0,
      allocatedCents: 12_000,
      allocations: [
        {
          id: ALLOCATION_ID,
          invoiceId: TARGET_INVOICE_ID,
          amountCents: 6_000,
          kind: 'CUSTOMER_CREDIT',
          createdAt: '2026-07-11T10:00:00.000Z',
        },
      ],
    };
    const request = jest.fn(async ({ path }: { path: string }) => {
      if (path === `/credit-notes/${CREDIT_NOTE_ID}`)
        return validatedCreditNote;
      if (path === `/credit-notes/${CREDIT_NOTE_ID}/eligible-invoices`)
        return eligibleInvoices;
      throw new Error(`Unexpected request: ${path}`);
    });
    const execute = jest.fn().mockResolvedValue(allocatedCreditNote);
    const createMutationIntent = jest.fn(() => ({
      idempotencyKey: 'allocate-credit-note',
      execute,
      retry: jest.fn(),
    }));
    mockContext({
      request,
      createMutationIntent,
      capabilities: {
        manageCreditNotes: true,
        allocateCustomerCredit: true,
      },
    });

    renderCreditNoteDetail();

    fireEvent.change(
      await screen.findByLabelText('Montant à ventiler - FAC-2026-0043'),
      { target: { value: '9000' } },
    );
    fireEvent.click(screen.getByRole('button', { name: "Ventiler l'avoir" }));
    fireEvent.click(screen.getByTestId('erp-confirm-dialog-confirm'));

    await waitFor(() =>
      expect(createMutationIntent).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          path: `/credit-notes/${CREDIT_NOTE_ID}/allocate`,
          schema: erpCreditNoteSchema,
          body: {
            creditNoteId: CREDIT_NOTE_ID,
            allocations: [{ invoiceId: TARGET_INVOICE_ID, amountCents: 6_000 }],
          },
        }),
        { idempotency: 'required' },
      ),
    );
  });

  it.each([
    new ErpMarocError('ERP_STATE_CONFLICT', 409),
    new ErpMarocError('ERP_UPSTREAM_TIMEOUT', 503),
    new Error('Network request timed out'),
  ])(
    'retries a validate intent only after an ambiguous failure: %p',
    async (failure) => {
      const request = jest.fn(async () => creditNote);
      const execute = jest.fn().mockRejectedValue(failure);
      const retry = jest.fn().mockResolvedValue({
        ...creditNote,
        number: 'AV-2026-0001',
        year: 2026,
        status: 'VALIDATED',
      });
      const createMutationIntent = jest.fn(() => ({
        idempotencyKey: 'retry-credit-note',
        execute,
        retry,
      }));
      mockContext({ request, createMutationIntent });

      renderCreditNoteDetail();

      fireEvent.click(
        await screen.findByRole('button', { name: "Valider l'avoir" }),
      );
      fireEvent.click(screen.getByTestId('erp-confirm-dialog-confirm'));
      fireEvent.click(
        await screen.findByRole('button', {
          name: "Réessayer la validation de l'avoir",
        }),
      );

      await waitFor(() => expect(retry).toHaveBeenCalledTimes(1));
      expect(execute).toHaveBeenCalledTimes(1);
      expect(createMutationIntent).toHaveBeenCalledTimes(1);
    },
  );

  it('does not offer a retry after a 400 validation failure', async () => {
    const request = jest.fn(async () => creditNote);
    const retry = jest.fn();
    const createMutationIntent = jest.fn(() => ({
      idempotencyKey: 'validation-credit-note',
      execute: jest
        .fn()
        .mockRejectedValue(new ErpMarocError('ERP_VALIDATION_ERROR', 400)),
      retry,
    }));
    mockContext({ request, createMutationIntent });

    renderCreditNoteDetail();

    fireEvent.click(
      await screen.findByRole('button', { name: "Valider l'avoir" }),
    );
    fireEvent.click(screen.getByTestId('erp-confirm-dialog-confirm'));

    expect(
      await screen.findByText("Impossible de valider l'avoir."),
    ).toBeVisible();
    expect(
      screen.queryByRole('button', {
        name: "Réessayer la validation de l'avoir",
      }),
    ).not.toBeInTheDocument();
    expect(retry).not.toHaveBeenCalled();
  });
});
