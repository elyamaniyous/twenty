import { useErpMarocContext } from '@/erp-maroc/context/useErpMarocContext';
import { erpMarocPaths } from '@/erp-maroc/navigation/erpMarocPaths';
import { render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { ErpMarocCockpitPage } from '~/pages/erp-maroc/ErpMarocCockpitPage';

jest.mock('@/erp-maroc/context/useErpMarocContext', () => ({
  useErpMarocContext: jest.fn(),
}));

const emptyResponses: Record<string, unknown> = {
  '/products': [],
  '/tiers': [],
  '/quotes': [],
  '/invoices': { items: [], nextCursor: null },
  '/payments': { items: [], nextCursor: null },
  '/reminders': { items: [], nextCursor: null },
};

const populatedResponses: Record<string, unknown> = {
  ...emptyResponses,
  '/quotes': [{ id: 'quote-1', status: 'DRAFT' }],
  '/invoices': {
    items: [
      {
        id: 'invoice-1',
        status: 'VALIDATED',
        isOverdue: false,
        emailDelivery: null,
      },
      {
        id: 'invoice-2',
        status: 'PARTIALLY_PAID',
        isOverdue: true,
        emailDelivery: { status: 'RECONCILIATION_REQUIRED' },
      },
    ],
    nextCursor: null,
  },
  '/payments': {
    items: [{ id: 'payment-1', status: 'PENDING_ALLOCATION' }],
    nextCursor: null,
  },
  '/reminders': {
    items: [
      { id: 'reminder-1', status: 'PROPOSED' },
      { id: 'reminder-2', status: 'RECONCILIATION_REQUIRED' },
    ],
    nextCursor: null,
  },
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

  it('starts all six reads concurrently and renders loaded-page operational queues', async () => {
    const resolvers = new Map<string, (value: unknown) => void>();
    const request = jest.fn(
      ({ path }: { path: string }) =>
        new Promise((resolve) => resolvers.set(path, resolve)),
    );

    renderPage(request);

    await waitFor(() => expect(request).toHaveBeenCalledTimes(6));
    expect(request.mock.calls.map(([input]) => input.path)).toEqual([
      '/quotes',
      '/invoices',
      '/payments',
      '/reminders',
      '/products',
      '/tiers',
    ]);

    Object.entries(populatedResponses).forEach(([path, value]) =>
      resolvers.get(path)?.(value),
    );

    expect(await screen.findByText('Brouillons à terminer')).toBeVisible();
    expect(screen.getByText('Factures validées à envoyer')).toBeVisible();
    expect(
      screen.getByText('Factures en retard ou partiellement payées'),
    ).toBeVisible();
    expect(screen.getByText('Paiements à affecter')).toBeVisible();
    expect(
      screen.getByText('Propositions de relance à approuver'),
    ).toBeVisible();
    expect(screen.getByText('Réconciliations requises')).toBeVisible();
    expect(screen.getAllByText('Page chargée')).toHaveLength(6);
    const referenceSources = screen.getByRole('region', {
      name: 'Sources de référence',
    });
    expect(referenceSources).toHaveTextContent('Catalogue — Page chargée');
    expect(referenceSources).toHaveTextContent('Tiers — Page chargée');
    expect(screen.queryByText(/chiffre d'affaires|TVA|trésorerie/i)).toBeNull();

    expect(
      screen.getByRole('link', { name: 'Brouillons à terminer' }),
    ).toHaveAttribute('href', `${erpMarocPaths.quotes}?status=DRAFT`);
    expect(
      screen.getByRole('link', { name: 'Factures validées à envoyer' }),
    ).toHaveAttribute('href', `${erpMarocPaths.invoices}?status=VALIDATED`);
    expect(
      screen.getByRole('link', { name: 'Factures en retard' }),
    ).toHaveAttribute('href', `${erpMarocPaths.invoices}?status=OVERDUE`);
    expect(
      screen.getByRole('link', { name: 'Factures partiellement payées' }),
    ).toHaveAttribute(
      'href',
      `${erpMarocPaths.invoices}?status=PARTIALLY_PAID`,
    );
    expect(
      screen.getByRole('link', { name: 'Paiements à affecter' }),
    ).toHaveAttribute(
      'href',
      `${erpMarocPaths.payments}?status=PENDING_ALLOCATION`,
    );
    expect(
      screen.getByRole('link', {
        name: 'Propositions de relance à approuver',
      }),
    ).toHaveAttribute('href', `${erpMarocPaths.reminders}?status=PROPOSED`);
    expect(
      screen.getByRole('link', { name: 'Livraisons de facture à réconcilier' }),
    ).toHaveAttribute(
      'href',
      `${erpMarocPaths.invoices}?delivery=RECONCILIATION_REQUIRED`,
    );
    expect(
      screen.getByRole('link', { name: 'Relances à réconcilier' }),
    ).toHaveAttribute(
      'href',
      `${erpMarocPaths.reminders}?status=RECONCILIATION_REQUIRED`,
    );
  });

  it.each([
    ['/products', 'Catalogue — Indisponible', 'Tiers — Page chargée'],
    ['/tiers', 'Tiers — Indisponible', 'Catalogue — Page chargée'],
  ])(
    'reports a %s reference failure without raising an operational queue alert',
    async (failedPath, failedStatus, loadedStatus) => {
      const request = jest.fn(({ path }: { path: string }) => {
        if (path === failedPath) {
          return Promise.reject(new Error('network'));
        }
        return Promise.resolve(populatedResponses[path]);
      });

      renderPage(request);

      const referenceSources = await screen.findByRole('region', {
        name: 'Sources de référence',
      });
      expect(referenceSources).toHaveTextContent(failedStatus);
      expect(referenceSources).toHaveTextContent(loadedStatus);
      expect(screen.queryByRole('alert')).toBeNull();
      expect(screen.getByText('Brouillons à terminer')).toBeVisible();
      expect(
        within(
          screen.getByText('Brouillons à terminer').closest('section')!,
        ).getByText('Page chargée'),
      ).toBeVisible();
    },
  );

  it('marks a queue unavailable instead of presenting a failed source as loaded zero', async () => {
    const request = jest.fn(({ path }: { path: string }) =>
      path === '/quotes'
        ? Promise.reject(new Error('quotes unavailable'))
        : Promise.resolve(populatedResponses[path]),
    );

    renderPage(request);

    const heading = await screen.findByText('Brouillons à terminer');
    const queue = heading.closest('section');
    expect(queue).not.toBeNull();
    expect(queue).toHaveTextContent('Indisponible');
    expect(queue).not.toHaveTextContent('Page chargée');
    expect(
      screen.getByText('Factures validées à envoyer').closest('section'),
    ).toHaveTextContent('Page chargée');
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Certaines files ne sont pas disponibles',
    );
  });

  it('aborts every in-flight request when unmounted', async () => {
    const signals: AbortSignal[] = [];
    const request = jest.fn(({ signal }: { signal: AbortSignal }) => {
      signals.push(signal);
      return new Promise(() => undefined);
    });

    const view = renderPage(request);
    await waitFor(() => expect(signals).toHaveLength(6));

    view.unmount();

    expect(signals.every((signal) => signal.aborted)).toBe(true);
  });
});
