import { useErpMarocContext } from '@/erp-maroc/context/useErpMarocContext';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import {
  erpCreditNoteSchema,
  erpInvoiceReadSchema,
  type ErpCreditNote,
} from 'twenty-shared/erp-maroc';

// oxlint-disable-next-line eslint/no-restricted-imports -- Pages are outside the @/ modules alias.
import { ErpCreditNoteEditorPage } from '../ErpCreditNoteEditorPage';

jest.mock('@/erp-maroc/context/useErpMarocContext', () => ({
  useErpMarocContext: jest.fn(),
}));

const initialRequest = globalThis.Request;

beforeAll(() => {
  if (globalThis.Request !== undefined) return;

  class TestRequest {
    signal: AbortSignal;

    constructor(_input: string, init?: { signal?: AbortSignal }) {
      this.signal = init?.signal ?? new AbortController().signal;
    }
  }

  Object.defineProperty(globalThis, 'Request', {
    configurable: true,
    value: TestRequest,
    writable: true,
  });
});

afterAll(() => {
  if (initialRequest !== undefined) return;
  delete (globalThis as { Request?: typeof Request }).Request;
});

const SOURCE_SOCIETE_ID = '89c90690-4f4a-4e2e-91ce-3700f16a8ca1';
const CONTEXT_SOCIETE_ID = '89c90690-4f4a-4e2e-91ce-3700f16a8c99';
const SOURCE_TIER_ID = '49b11318-8d30-43ab-bbf4-fb16ce1867ba';
const SOURCE_INVOICE_ID = '89c90690-4f4a-4e2e-91ce-3700f16a8ca2';
const CREDIT_NOTE_ID = '2de44ee2-3039-4bc4-98d0-71874bc1fbf9';
const SOURCE_LINE_ID = 'c24db3d3-6353-4f7c-a47e-6a1e44799e38';

const sourceInvoice = {
  id: SOURCE_INVOICE_ID,
  societeId: SOURCE_SOCIETE_ID,
  tierId: SOURCE_TIER_ID,
  number: 'FAC-2026-0042',
  issueDate: '2026-07-12',
  tier: { name: 'Atlas Conseil' },
  lines: [
    {
      id: SOURCE_LINE_ID,
      description: 'Audit et configuration',
      quantity: 2,
      unit: 'jour',
      unitPriceHtCents: 50_000,
      tvaRate: 20,
      totalHtCents: 100_000,
    },
  ],
} as never;

const draftCreditNote: ErpCreditNote = {
  id: CREDIT_NOTE_ID,
  societeId: SOURCE_SOCIETE_ID,
  sourceInvoiceId: SOURCE_INVOICE_ID,
  sourceInvoiceNumber: 'FAC-2026-0042',
  tierId: SOURCE_TIER_ID,
  number: null,
  year: null,
  status: 'DRAFT',
  issueDate: '2026-07-12',
  currency: 'MAD',
  totalHtCents: 30_000,
  totalTvaCents: 6_000,
  totalTtcCents: 36_000,
  availableCreditCents: 36_000,
  allocatedCents: 0,
  lines: [
    {
      id: '6de44ee2-3039-4bc4-98d0-71874bc1fbf9',
      sourceInvoiceLineId: SOURCE_LINE_ID,
      description: 'Audit et configuration',
      quantity: 2,
      unit: 'jour',
      unitPriceHtCents: 50_000,
      tvaRate: 20,
      amountHtCents: 30_000,
      totalTvaCents: 6_000,
      totalTtcCents: 36_000,
      position: 0,
    },
  ],
  allocations: [],
  validatedAt: null,
  cancelledAt: null,
  createdAt: '2026-07-12T08:00:00Z',
  updatedAt: '2026-07-12T08:00:00Z',
};

const validatedCreditNote: ErpCreditNote = {
  ...draftCreditNote,
  number: 'AV-2026-0001',
  year: 2026,
  status: 'VALIDATED',
};

type Request = jest.Mock<Promise<unknown>, [Record<string, unknown>]>;

const renderPage = (request: Request, initialEntry: string) => {
  const createMutationIntent = jest.fn((input) => ({
    execute: () => request(input),
    retry: () => request(input),
  }));

  jest.mocked(useErpMarocContext).mockReturnValue({
    status: 'ready',
    context: {
      societeId: CONTEXT_SOCIETE_ID,
      capabilities: { manageCreditNotes: true },
    },
    error: null,
    refetch: jest.fn(),
    client: { request, createMutationIntent },
  } as never);

  const router = createMemoryRouter(
    [
      {
        path: '/erp-maroc/credit-notes/new',
        element: <ErpCreditNoteEditorPage />,
      },
      {
        path: '/erp-maroc/credit-notes/:id/edit',
        element: <ErpCreditNoteEditorPage />,
      },
      {
        path: '/erp-maroc/credit-notes/:id',
        element: <span>Détail avoir</span>,
      },
    ],
    {
      future: { v7_relativeSplatPath: true },
      initialEntries: [initialEntry],
    },
  );

  render(
    <RouterProvider router={router} future={{ v7_startTransition: true }} />,
  );

  return { createMutationIntent, router };
};

const sourceRequest = (savedCreditNote = draftCreditNote): Request =>
  jest.fn(async (input: Record<string, unknown>) => {
    if (
      input.method === 'GET' &&
      input.path === `/invoices/${SOURCE_INVOICE_ID}`
    ) {
      return sourceInvoice;
    }
    if (input.method === 'POST' && input.path === '/credit-notes') {
      return savedCreditNote;
    }
    throw new Error(
      `Unexpected request ${String(input.method)} ${String(input.path)}`,
    );
  });

const editRequest = (creditNote = draftCreditNote): Request =>
  jest.fn(async (input: Record<string, unknown>) => {
    if (
      input.method === 'GET' &&
      input.path === `/credit-notes/${CREDIT_NOTE_ID}`
    ) {
      return creditNote;
    }
    if (
      input.method === 'PATCH' &&
      input.path === `/credit-notes/${CREDIT_NOTE_ID}`
    ) {
      return creditNote;
    }
    throw new Error(
      `Unexpected request ${String(input.method)} ${String(input.path)}`,
    );
  });

const amountInput = () =>
  screen.getByRole('spinbutton', {
    name: 'Montant HT (centimes) - Audit et configuration',
  });

const setAmount = async (amountHtCents: string) => {
  await userEvent.clear(amountInput());
  await userEvent.type(amountInput(), amountHtCents);
};

const expectedLines = (amountHtCents: number) => [
  { sourceInvoiceLineId: SOURCE_LINE_ID, amountHtCents },
];

describe('ErpCreditNoteEditorPage', () => {
  beforeEach(() => jest.clearAllMocks());

  it('loads the source invoice from invoiceId and exposes immutable source snapshots with draft HT cents', async () => {
    const request = sourceRequest();
    renderPage(
      request,
      `/erp-maroc/credit-notes/new?invoiceId=${SOURCE_INVOICE_ID}`,
    );

    expect(await screen.findByText('FAC-2026-0042')).toBeVisible();
    expect(screen.getByText('Atlas Conseil')).toBeVisible();
    expect(screen.getByText('Audit et configuration')).toBeVisible();
    expect(screen.getByText('2 jour')).toBeVisible();
    expect(screen.getByText('50000 centimes')).toBeVisible();
    expect(screen.getByText('20 %')).toBeVisible();
    expect(amountInput()).toHaveValue(100_000);
    expect(screen.queryByLabelText('Client')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Facture source')).not.toBeInTheDocument();
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'GET',
        path: `/invoices/${SOURCE_INVOICE_ID}`,
        schema: erpInvoiceReadSchema,
      }),
    );
  });

  it('creates from source snapshots with the required idempotent POST body and routes to draft edit', async () => {
    const request = sourceRequest();
    const { createMutationIntent, router } = renderPage(
      request,
      `/erp-maroc/credit-notes/new?invoiceId=${SOURCE_INVOICE_ID}`,
    );
    await screen.findByText('FAC-2026-0042');

    await setAmount('30000');
    await userEvent.click(
      screen.getByRole('button', { name: 'Enregistrer l’avoir' }),
    );

    await waitFor(() =>
      expect(router.state.location.pathname).toBe(
        `/erp-maroc/credit-notes/${CREDIT_NOTE_ID}/edit`,
      ),
    );
    expect(createMutationIntent).toHaveBeenCalledWith(
      {
        method: 'POST',
        path: '/credit-notes',
        schema: erpCreditNoteSchema,
        body: {
          sourceInvoiceId: SOURCE_INVOICE_ID,
          societeId: SOURCE_SOCIETE_ID,
          tierId: SOURCE_TIER_ID,
          issueDate: '2026-07-12',
          currency: 'MAD',
          lines: expectedLines(30_000),
        },
      },
      { idempotency: 'required' },
    );
  });

  it('loads the draft from the route param and PATCHes only editable line amounts', async () => {
    const request = editRequest();
    const { createMutationIntent } = renderPage(
      request,
      `/erp-maroc/credit-notes/${CREDIT_NOTE_ID}/edit?invoiceId=${SOURCE_INVOICE_ID}`,
    );

    expect(await screen.findByDisplayValue('30000')).toBeVisible();
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'GET',
        path: `/credit-notes/${CREDIT_NOTE_ID}`,
        schema: erpCreditNoteSchema,
      }),
    );
    expect(
      request.mock.calls.some(
        ([input]) => input.path === `/invoices/${SOURCE_INVOICE_ID}`,
      ),
    ).toBe(false);

    await setAmount('25000');
    await userEvent.click(
      screen.getByRole('button', { name: 'Enregistrer l’avoir' }),
    );

    await waitFor(() => expect(createMutationIntent).toHaveBeenCalledTimes(1));
    expect(createMutationIntent).toHaveBeenCalledWith(
      {
        method: 'PATCH',
        path: `/credit-notes/${CREDIT_NOTE_ID}`,
        schema: erpCreditNoteSchema,
        body: { lines: expectedLines(25_000) },
      },
      { idempotency: 'required' },
    );
  });

  it('makes a non-draft credit note read-only and prevents a save request', async () => {
    const request = editRequest(validatedCreditNote);
    const { createMutationIntent } = renderPage(
      request,
      `/erp-maroc/credit-notes/${CREDIT_NOTE_ID}/edit`,
    );

    expect(await screen.findByDisplayValue('30000')).toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'Enregistrer l’avoir' }),
    ).toBeDisabled();
    expect(
      screen.getByText('Cet avoir ne peut plus être modifié.'),
    ).toBeVisible();

    await userEvent.click(
      screen.getByRole('button', { name: 'Enregistrer l’avoir' }),
    );

    expect(createMutationIntent).not.toHaveBeenCalled();
  });

  it('retries a conflict with the same idempotent create intent', async () => {
    let mutationAttempts = 0;
    const request: Request = jest.fn(async (input: Record<string, unknown>) => {
      if (
        input.method === 'GET' &&
        input.path === `/invoices/${SOURCE_INVOICE_ID}`
      ) {
        return sourceInvoice;
      }
      if (input.method === 'POST' && input.path === '/credit-notes') {
        mutationAttempts += 1;
        if (mutationAttempts === 1) {
          throw Object.assign(new Error('Conflict'), { statusCode: 409 });
        }
        return draftCreditNote;
      }
      throw new Error(
        `Unexpected request ${String(input.method)} ${String(input.path)}`,
      );
    });
    const { createMutationIntent } = renderPage(
      request,
      `/erp-maroc/credit-notes/new?invoiceId=${SOURCE_INVOICE_ID}`,
    );
    await screen.findByText('FAC-2026-0042');

    await userEvent.click(
      screen.getByRole('button', { name: 'Enregistrer l’avoir' }),
    );
    expect(
      await screen.findByRole('button', { name: 'Réessayer' }),
    ).toBeVisible();

    await userEvent.click(screen.getByRole('button', { name: 'Réessayer' }));
    await waitFor(() => expect(mutationAttempts).toBe(2));
    expect(createMutationIntent).toHaveBeenCalledTimes(1);
  });

  it('does not offer retry for a 400 validation error', async () => {
    const request: Request = jest.fn(async (input: Record<string, unknown>) => {
      if (
        input.method === 'GET' &&
        input.path === `/invoices/${SOURCE_INVOICE_ID}`
      ) {
        return sourceInvoice;
      }
      if (input.method === 'POST' && input.path === '/credit-notes') {
        throw Object.assign(new Error('Invalid'), { statusCode: 400 });
      }
      throw new Error(
        `Unexpected request ${String(input.method)} ${String(input.path)}`,
      );
    });
    renderPage(
      request,
      `/erp-maroc/credit-notes/new?invoiceId=${SOURCE_INVOICE_ID}`,
    );
    await screen.findByText('FAC-2026-0042');

    await userEvent.click(
      screen.getByRole('button', { name: 'Enregistrer l’avoir' }),
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      "Impossible d'enregistrer l’avoir.",
    );
    expect(
      screen.queryByRole('button', { name: 'Réessayer' }),
    ).not.toBeInTheDocument();
  });
});
