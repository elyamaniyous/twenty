import { useErpMarocContext } from '@/erp-maroc/context/useErpMarocContext';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import {
  erpCreditNotePageSchema,
  type ErpCreditNote,
} from 'twenty-shared/erp-maroc';

// oxlint-disable-next-line eslint/no-restricted-imports -- Pages are outside the @/ modules alias.
import { ErpCreditNotesPage } from '../ErpCreditNotesPage';

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

const creditNote: ErpCreditNote = {
  id: '0193f6ea-7c39-7aa2-8000-000000000000',
  societeId: '0193f6ea-7c39-7aa2-8000-000000000001',
  sourceInvoiceId: '0193f6ea-7c39-7aa2-8000-000000000002',
  sourceInvoiceNumber: 'FAC-2026-0042',
  tierId: '0193f6ea-7c39-7aa2-8000-000000000003',
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
  lines: [],
  allocations: [],
  validatedAt: null,
  cancelledAt: null,
  createdAt: '2026-07-10T12:00:00.000Z',
  updatedAt: '2026-07-11T12:00:00.000Z',
};

const mockContext = (
  request: jest.Mock,
  capabilities: Record<string, boolean> = {},
) => {
  jest.mocked(useErpMarocContext).mockReturnValue({
    status: 'ready',
    context: {
      societeId: creditNote.societeId,
      capabilities,
    } as never,
    error: null,
    refetch: jest.fn(),
    client: { request } as never,
  });
};

describe('ErpCreditNotesPage', () => {
  it('serializes canonical URL filters in the initial credit-notes request', async () => {
    const request = jest.fn(async () => ({ items: [], nextCursor: null }));
    mockContext(request);

    render(
      <MemoryRouter
        initialEntries={[
          `/erp-maroc/credit-notes?limit=25&status=VALIDATED&invoiceId=${creditNote.sourceInvoiceId}&tierId=${creditNote.tierId}&from=2026-07-01&to=2026-07-31`,
        ]}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <ErpCreditNotesPage />
        <LocationProbe />
      </MemoryRouter>,
    );

    await waitFor(() =>
      expect(request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          path: '/credit-notes',
          query: {
            status: 'VALIDATED',
            tierId: creditNote.tierId,
            invoiceId: creditNote.sourceInvoiceId,
            from: '2026-07-01',
            to: '2026-07-31',
            limit: '25',
          },
          schema: erpCreditNotePageSchema,
        }),
      ),
    );
    expect(screen.getByLabelText('URL courante')).toHaveTextContent(
      `/erp-maroc/credit-notes?status=VALIDATED&tierId=${creditNote.tierId}&invoiceId=${creditNote.sourceInvoiceId}&from=2026-07-01&to=2026-07-31&limit=25`,
    );
  });

  it('renders credit-note values and links its draft number to the detail page', async () => {
    const request = jest.fn(async () => ({
      items: [creditNote],
      nextCursor: null,
    }));
    mockContext(request);

    render(
      <MemoryRouter
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <ErpCreditNotesPage />
        <LocationProbe />
      </MemoryRouter>,
    );

    const detailLink = await screen.findByRole('link', { name: 'Brouillon' });
    expect(screen.getByText(creditNote.sourceInvoiceNumber)).toBeVisible();
    expect(screen.getAllByText(/120[,.]00/)).toHaveLength(2);
    expect(screen.getByText(creditNote.tierId)).toBeVisible();
    expect(screen.getByText(creditNote.issueDate)).toBeVisible();
    expect(screen.getAllByText('Brouillon')).toHaveLength(2);

    await userEvent.click(detailLink);
    expect(screen.getByLabelText('URL courante')).toHaveTextContent(
      `/erp-maroc/credit-notes/${creditNote.id}`,
    );
  });

  it('navigates to the new credit-note page only when management is allowed', async () => {
    const request = jest.fn(async () => ({ items: [], nextCursor: null }));
    mockContext(request, { manageCreditNotes: true });

    render(
      <MemoryRouter
        initialEntries={['/erp-maroc/credit-notes']}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <ErpCreditNotesPage />
        <LocationProbe />
      </MemoryRouter>,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Nouvel avoir' }));
    expect(screen.getByLabelText('URL courante')).toHaveTextContent(
      '/erp-maroc/credit-notes/new',
    );
  });

  it('does not render the new credit-note action when management is forbidden', async () => {
    const request = jest.fn(async () => ({ items: [], nextCursor: null }));
    mockContext(request, { manageCreditNotes: false });

    render(
      <MemoryRouter
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <ErpCreditNotesPage />
      </MemoryRouter>,
    );

    await screen.findByText('Aucun avoir sur la page chargée');
    expect(
      screen.queryByRole('button', { name: 'Nouvel avoir' }),
    ).not.toBeInTheDocument();
  });

  it('resets the cursor and writes the canonical URL when a filter changes', async () => {
    const cursor = '0193f6ea-7c39-7aa2-8000-000000000004';
    const request = jest.fn(async () => ({ items: [], nextCursor: null }));
    mockContext(request);

    render(
      <MemoryRouter
        initialEntries={[`/erp-maroc/credit-notes?cursor=${cursor}`]}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <ErpCreditNotesPage />
        <LocationProbe />
      </MemoryRouter>,
    );

    await screen.findByText('Aucun avoir sur la page chargée');
    await userEvent.selectOptions(screen.getByLabelText('Statut'), 'VALIDATED');

    await waitFor(() =>
      expect(screen.getByLabelText('URL courante')).toHaveTextContent(
        '/erp-maroc/credit-notes?status=VALIDATED',
      ),
    );
    await waitFor(() =>
      expect(request).toHaveBeenLastCalledWith(
        expect.objectContaining({
          path: '/credit-notes',
          query: { status: 'VALIDATED' },
        }),
      ),
    );
  });

  it('loads the next page and returns to the preceding cursor', async () => {
    const nextCursor = '0193f6ea-7c39-7aa2-8000-000000000005';
    const request = jest
      .fn()
      .mockResolvedValueOnce({ items: [], nextCursor })
      .mockResolvedValueOnce({ items: [], nextCursor: null })
      .mockResolvedValueOnce({ items: [], nextCursor });
    mockContext(request);

    render(
      <MemoryRouter
        initialEntries={['/erp-maroc/credit-notes']}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <ErpCreditNotesPage />
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
          path: '/credit-notes',
          query: { cursor: nextCursor },
        }),
      ),
    );
    expect(screen.getByLabelText('URL courante')).toHaveTextContent(
      `/erp-maroc/credit-notes?cursor=${nextCursor}`,
    );
    await waitFor(() => expect(previous).toBeEnabled());

    await userEvent.click(previous);
    await waitFor(() =>
      expect(request).toHaveBeenLastCalledWith(
        expect.objectContaining({ path: '/credit-notes', query: undefined }),
      ),
    );
    expect(screen.getByLabelText('URL courante')).toHaveTextContent(
      '/erp-maroc/credit-notes',
    );
  });

  it('shows a load error and retries the credit-notes request', async () => {
    const request = jest
      .fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({ items: [], nextCursor: null });
    mockContext(request);

    render(
      <MemoryRouter
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <ErpCreditNotesPage />
      </MemoryRouter>,
    );

    expect(
      await screen.findByText('Impossible de charger les avoirs'),
    ).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: 'Réessayer' }));
    await waitFor(() => expect(request).toHaveBeenCalledTimes(2));
  });
});
