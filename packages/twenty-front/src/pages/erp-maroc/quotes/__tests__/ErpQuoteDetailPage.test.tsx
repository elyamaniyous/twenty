import { ErpMarocError } from '@/erp-maroc/api/erpMarocError';
import { useErpMarocContext } from '@/erp-maroc/context/useErpMarocContext';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import type { ErpQuote } from 'twenty-shared/erp-maroc';

// oxlint-disable-next-line eslint/no-restricted-imports -- Pages are outside the @/ modules alias.
import { ErpQuoteDetailPage } from '../ErpQuoteDetailPage';

jest.mock('@/erp-maroc/context/useErpMarocContext', () => ({
  useErpMarocContext: jest.fn(),
}));

const SOCIETE_ID = '89c90690-4f4a-4f2e-91ce-3700f16a8ca1';
const TIER_ID = '49b11318-8d30-43ab-bbf4-fb16ce1867ba';
const QUOTE_ID = 'ac4fab7d-0ea2-4102-839e-50be33a1d2aa';
const LINE_ID = 'c24db3d3-6353-4f7c-a47e-6a1e44799e38';
const INVOICE_ID = 'ad157ccc-9820-4977-84cb-569f83787ad8';

const tier = {
  id: TIER_ID,
  societeId: SOCIETE_ID,
  type: 'CLIENT' as const,
  name: 'Atlas Conseil',
  email: 'atlas@example.com',
  phone: null,
  ice: null,
  identifiantFiscal: null,
  address: null,
  city: 'Casablanca',
  paymentDelayDays: 30,
  creditLimit: 10_000,
  twentyCompanyId: null,
  twentyPersonId: null,
  compteCollectifCode: '3421' as const,
  isActive: true,
  createdAt: '2026-07-11T08:00:00Z',
  updatedAt: '2026-07-11T08:00:00Z',
};

const draftQuote = {
  id: QUOTE_ID,
  societeId: SOCIETE_ID,
  tierId: TIER_ID,
  number: 'DEV-2026-0042',
  year: 2026,
  title: 'Déploiement CRM',
  currency: 'MAD' as const,
  status: 'DRAFT' as const,
  issueDate: '2026-07-12',
  validUntil: '2026-08-12',
  notes: 'Inclure la formation',
  totalHtCents: 350_000,
  totalTvaCents: 60_000,
  totalTtcCents: 410_000,
  twentyOpportunityId: null,
  twentyCompanyId: null,
  twentyPersonId: null,
  opportunityEstimatedAmountCents: null,
  convertedInvoiceId: null,
  convertedAt: null,
  createdAt: '2026-07-12T08:00:00Z',
  updatedAt: '2026-07-12T08:00:00Z',
  lines: [
    {
      id: LINE_ID,
      productId: null,
      description: 'Audit et configuration',
      unit: 'jour',
      quantity: 2,
      unitPriceHtCents: 100_000,
      tvaRate: 20,
      totalHtCents: 200_000,
      totalTvaCents: 40_000,
      totalTtcCents: 240_000,
      position: 0,
      createdAt: '2026-07-12T08:00:00Z',
      updatedAt: '2026-07-12T08:00:00Z',
    },
    {
      id: '410b8d2f-d0ce-4683-a348-c68a206a9845',
      productId: null,
      description: 'Formation utilisateurs',
      unit: 'forfait',
      quantity: 1,
      unitPriceHtCents: 150_000,
      tvaRate: 20,
      totalHtCents: 150_000,
      totalTvaCents: 30_000,
      totalTtcCents: 180_000,
      position: 1,
      createdAt: '2026-07-12T08:00:00Z',
      updatedAt: '2026-07-12T08:00:00Z',
    },
    {
      id: 'ba12b013-7ad9-445f-8e13-81f88c990b63',
      productId: null,
      description: 'Remise commerciale',
      unit: null,
      quantity: 1,
      unitPriceHtCents: 0,
      tvaRate: 0,
      totalHtCents: 0,
      totalTvaCents: 0,
      totalTtcCents: 0,
      position: 2,
      createdAt: '2026-07-12T08:00:00Z',
      updatedAt: '2026-07-12T08:00:00Z',
    },
  ],
} satisfies ErpQuote;

type Quote = ErpQuote;

const asStatus = (
  status: Quote['status'],
  extra: Partial<Quote> = {},
): Quote => ({ ...draftQuote, status, ...extra });

const invoice = { id: INVOICE_ID, number: 'FAC-2026-0012' };

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (error: unknown) => void;
};

const deferred = <T,>(): Deferred<T> => {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((onResolve, onReject) => {
    resolve = onResolve;
    reject = onReject;
  });
  return { promise, resolve, reject };
};

type RenderOptions = {
  canManage?: boolean;
  onEdit?: jest.Mock;
  onConverted?: jest.Mock;
  routeDriven?: boolean;
  initialPath?: string;
};

const renderPage = (
  request: jest.Mock,
  {
    canManage = true,
    onEdit,
    onConverted,
    routeDriven = false,
    initialPath = `/erp-maroc/quotes/${QUOTE_ID}`,
  }: RenderOptions = {},
) => {
  const access = { canManage };
  const createMutationIntent = jest.fn((input) => ({
    execute: () => request(input),
  }));

  jest.mocked(useErpMarocContext).mockReturnValue({
    status: 'ready',
    context: {
      role: 'COMMERCIAL',
      societeId: SOCIETE_ID,
      capabilities: {
        get manageSalesDocuments() {
          return access.canManage;
        },
      },
    } as never,
    error: null,
    refetch: jest.fn(),
    client: { request, createMutationIntent } as never,
  });

  const router = createMemoryRouter(
    [
      {
        path: '/erp-maroc/quotes/:id',
        element: (
          <ErpQuoteDetailPage
            quoteId={routeDriven ? undefined : QUOTE_ID}
            onEdit={onEdit}
            onConverted={onConverted}
          />
        ),
      },
      {
        path: '/erp-maroc/quote-detail-without-id',
        element: (
          <ErpQuoteDetailPage
            quoteId={routeDriven ? undefined : QUOTE_ID}
            onEdit={onEdit}
            onConverted={onConverted}
          />
        ),
      },
      {
        path: '/erp-maroc/quotes/:quoteId/edit',
        element: <span>Éditeur devis</span>,
      },
      {
        path: '/erp-maroc/invoices/:invoiceId',
        element: <span>Détail facture</span>,
      },
    ],
    {
      initialEntries: [initialPath],
      future: { v7_relativeSplatPath: true },
    },
  );

  const rendered = render(
    <RouterProvider router={router} future={{ v7_startTransition: true }} />,
  );

  return { access, createMutationIntent, router, unmount: rendered.unmount };
};

const standardRequest = (quote: Quote = draftQuote as Quote) =>
  jest.fn(async ({ method, path }: { method: string; path: string }) => {
    if (method === 'GET' && path === `/quotes/${QUOTE_ID}`) return quote;
    if (method === 'GET' && path === '/tiers') return [tier];
    throw new Error(`Unexpected request ${method} ${path}`);
  });

const mutationCalls = (request: jest.Mock, path: string) =>
  request.mock.calls.filter(
    ([input]) => input.method === 'POST' && input.path === path,
  );

const confirm = async (label: string) => {
  await userEvent.click(await screen.findByRole('button', { name: label }));
  await userEvent.click(screen.getByTestId('erp-confirm-dialog-confirm'));
};

describe('ErpQuoteDetailPage', () => {
  beforeAll(() => {
    if (globalThis.Request === undefined) {
      class TestRequest {
        readonly url: string;
        readonly method: string;
        readonly signal: AbortSignal | null;

        constructor(input: string | URL, init?: RequestInit) {
          this.url = String(input);
          this.method = init?.method ?? 'GET';
          this.signal = init?.signal ?? null;
        }
      }

      Object.defineProperty(globalThis, 'Request', {
        configurable: true,
        value: TestRequest as unknown as typeof Request,
      });
    }
  });

  beforeEach(() => jest.clearAllMocks());

  it('loads the quote and customer with abort signals, then displays header, lines and totals', async () => {
    const quoteLoad = deferred<Quote>();
    const request = jest.fn(
      ({
        method,
        path,
        signal,
      }: {
        method: string;
        path: string;
        signal?: AbortSignal;
      }) => {
        expect(signal).toBeInstanceOf(AbortSignal);
        if (method === 'GET' && path === `/quotes/${QUOTE_ID}`)
          return quoteLoad.promise;
        if (method === 'GET' && path === '/tiers')
          return Promise.resolve([tier]);
        throw new Error(`Unexpected request ${method} ${path}`);
      },
    );

    const rendered = renderPage(request);
    expect(screen.getByRole('status')).toHaveTextContent('Chargement du devis');

    await act(async () => quoteLoad.resolve(draftQuote as Quote));

    expect(
      await screen.findByRole('heading', { name: 'DEV-2026-0042' }),
    ).toBeVisible();
    expect(screen.getByText('Atlas Conseil')).toBeVisible();
    expect(screen.getByText('12/07/2026')).toBeVisible();
    expect(screen.getByText('12/08/2026')).toBeVisible();
    expect(screen.getByText('Audit et configuration')).toBeVisible();
    expect(screen.getByText('Formation utilisateurs')).toBeVisible();
    expect(screen.getByTestId('quote-total-ht')).toHaveTextContent(
      '3 500,00 MAD',
    );
    expect(screen.getByTestId('quote-tax-20')).toHaveTextContent('700,00 MAD');
    expect(screen.getByTestId('quote-tax-0')).toHaveTextContent('0,00 MAD');
    expect(screen.getByTestId('quote-total-ttc')).toHaveTextContent(
      '4 100,00 MAD',
    );

    rendered.unmount();
    rendered.router.dispose();
    expect(
      request.mock.calls[0]?.[0].signal?.aborted ||
        request.mock.calls[1]?.[0].signal?.aborted,
    ).toBe(true);
  });

  it('renders error, retry and not-found states', async () => {
    let attempt = 0;
    const request = jest.fn(async ({ method, path }) => {
      if (method === 'GET' && path === '/tiers') return [tier];
      if (method === 'GET' && path === `/quotes/${QUOTE_ID}`) {
        attempt += 1;
        if (attempt === 1) throw new Error('offline');
        if (attempt === 2) throw new ErpMarocError('ERP_UNKNOWN', 404);
      }
      throw new Error('Unexpected request');
    });
    renderPage(request);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Impossible de charger le devis',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Réessayer' }));
    expect(await screen.findByText('Devis introuvable')).toBeVisible();
  });

  it.each([
    ['DRAFT', true, ['Modifier', 'Envoyer']],
    ['DRAFT', false, []],
    ['SENT', true, ['Accepter', 'Rejeter']],
    ['SENT', false, []],
    ['ACCEPTED', true, ['Convertir en facture']],
    ['ACCEPTED', false, []],
    ['REJECTED', true, []],
    ['REJECTED', false, []],
    ['EXPIRED', true, []],
    ['EXPIRED', false, []],
    ['CONVERTED', true, []],
    ['CONVERTED', false, []],
  ] as const)(
    'uses the exact command matrix for %s with capability %s',
    async (status, canManage, expected) => {
      renderPage(standardRequest(asStatus(status)), { canManage });
      await screen.findByRole('heading', { name: 'DEV-2026-0042' });

      for (const label of [
        'Modifier',
        'Envoyer',
        'Accepter',
        'Rejeter',
        'Convertir en facture',
      ]) {
        const query = screen.queryByRole('button', { name: label });
        if (expected.includes(label as never)) expect(query).toBeVisible();
        else expect(query).not.toBeInTheDocument();
      }
    },
  );

  it('does not expose send for an empty draft and routes edit through callback or canonical navigation', async () => {
    const onEdit = jest.fn();
    const first = renderPage(
      standardRequest({ ...draftQuote, lines: [] } as Quote),
      { onEdit },
    );
    await screen.findByRole('heading', { name: 'DEV-2026-0042' });
    expect(
      screen.queryByRole('button', { name: 'Envoyer' }),
    ).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Modifier' }));
    expect(onEdit).toHaveBeenCalledWith(QUOTE_ID);
    first.unmount();
    first.router.dispose();

    const request = standardRequest(draftQuote as Quote);
    const { router } = renderPage(request);
    await screen.findByRole('heading', { name: 'DEV-2026-0042' });
    await userEvent.click(screen.getByRole('button', { name: 'Modifier' }));
    await waitFor(() =>
      expect(router.state.location.pathname).toBe(
        `/erp-maroc/quotes/${QUOTE_ID}/edit`,
      ),
    );
  });

  it('reads the route id and navigates Modifier to the canonical edit route', async () => {
    const request = standardRequest(draftQuote as Quote);
    const { router } = renderPage(request, { routeDriven: true });

    await screen.findByRole('heading', { name: 'DEV-2026-0042' });
    await userEvent.click(screen.getByRole('button', { name: 'Modifier' }));

    await waitFor(() =>
      expect(router.state.location.pathname).toBe(
        `/erp-maroc/quotes/${QUOTE_ID}/edit`,
      ),
    );
  });

  it('renders a neutral state and performs no request for a malformed route id', async () => {
    const request = jest.fn();
    renderPage(request, {
      routeDriven: true,
      initialPath: '/erp-maroc/quotes/not-a-uuid',
    });

    expect(await screen.findByText('Devis introuvable')).toBeVisible();
    expect(request).not.toHaveBeenCalled();
  });

  it('renders a neutral state and performs no request when no id is available', async () => {
    const request = jest.fn();
    renderPage(request, {
      routeDriven: true,
      initialPath: '/erp-maroc/quote-detail-without-id',
    });

    expect(await screen.findByText('Devis introuvable')).toBeVisible();
    expect(request).not.toHaveBeenCalled();
  });

  it.each([
    ['Envoyer', 'send', 'Envoyer le devis', 'SENT'],
    ['Accepter', 'accept', 'Accepter le devis', 'ACCEPTED'],
    ['Rejeter', 'reject', 'Rejeter le devis', 'REJECTED'],
  ] as const)(
    'confirms and posts %s to the exact endpoint without optimistic update',
    async (label, suffix, dialogTitle, expectedStatus) => {
      const source = label === 'Envoyer' ? asStatus('DRAFT') : asStatus('SENT');
      const transitioned = asStatus(expectedStatus);
      const pending = deferred<Quote>();
      const request = jest.fn(({ method, path }) => {
        if (method === 'GET' && path === `/quotes/${QUOTE_ID}`)
          return Promise.resolve(source);
        if (method === 'GET' && path === '/tiers')
          return Promise.resolve([tier]);
        if (method === 'POST' && path === `/quotes/${QUOTE_ID}/${suffix}`)
          return pending.promise;
        throw new Error(`Unexpected request ${method} ${path}`);
      });
      renderPage(request);
      await screen.findByRole('button', { name: label });

      await userEvent.click(screen.getByRole('button', { name: label }));
      expect(screen.getByRole('dialog')).toHaveTextContent(dialogTitle);
      await userEvent.click(screen.getByTestId('erp-confirm-dialog-cancel'));
      expect(
        mutationCalls(request, `/quotes/${QUOTE_ID}/${suffix}`),
      ).toHaveLength(0);

      await confirm(label);
      expect(
        screen.getByText(source.status === 'DRAFT' ? 'Brouillon' : 'Envoyé'),
      ).toBeVisible();
      await act(async () => pending.resolve(transitioned));
      expect(
        await screen.findByText(
          expectedStatus === 'SENT'
            ? 'Envoyé'
            : expectedStatus === 'ACCEPTED'
              ? 'Accepté'
              : 'Refusé',
        ),
      ).toBeVisible();
      expect(
        mutationCalls(request, `/quotes/${QUOTE_ID}/${suffix}`),
      ).toHaveLength(1);
      expect(
        request.mock.calls.find(([input]) =>
          input.path.endsWith(`/${suffix}`),
        )?.[0],
      ).toMatchObject({
        method: 'POST',
        path: `/quotes/${QUOTE_ID}/${suffix}`,
      });
      expect(screen.queryByText(/e-mail/i)).not.toBeInTheDocument();
    },
  );

  it('locks duplicate confirmations', async () => {
    const pending = deferred<Quote>();
    const request = jest.fn(({ method, path }) => {
      if (method === 'GET' && path === `/quotes/${QUOTE_ID}`)
        return Promise.resolve(draftQuote);
      if (method === 'GET' && path === '/tiers') return Promise.resolve([tier]);
      if (method === 'POST' && path.endsWith('/send')) return pending.promise;
      throw new Error('Unexpected request');
    });
    renderPage(request);
    await screen.findByRole('button', { name: 'Envoyer' });
    await userEvent.click(screen.getByRole('button', { name: 'Envoyer' }));
    const confirmButton = screen.getByTestId('erp-confirm-dialog-confirm');
    fireEvent.click(confirmButton);
    fireEvent.click(confirmButton);
    expect(mutationCalls(request, `/quotes/${QUOTE_ID}/send`)).toHaveLength(1);
  });

  it('converts once, supports an existing invoice response, and calls the callback', async () => {
    const onConverted = jest.fn();
    const request = jest.fn(async ({ method, path }) => {
      if (method === 'GET' && path === `/quotes/${QUOTE_ID}`)
        return asStatus('ACCEPTED');
      if (method === 'GET' && path === '/tiers') return [tier];
      if (method === 'POST' && path === `/invoices/from-quote/${QUOTE_ID}`)
        return invoice;
      throw new Error(`Unexpected request ${method} ${path}`);
    });
    renderPage(request, { onConverted });
    await confirm('Convertir en facture');
    await waitFor(() => expect(onConverted).toHaveBeenCalledWith(invoice));
    expect(
      mutationCalls(request, `/invoices/from-quote/${QUOTE_ID}`),
    ).toHaveLength(1);
  });

  it('navigates to the invoice when conversion reconciliation finds a converted quote without a second POST', async () => {
    let quoteReads = 0;
    const request = jest.fn(async ({ method, path }) => {
      if (method === 'GET' && path === '/tiers') return [tier];
      if (method === 'GET' && path === `/quotes/${QUOTE_ID}`) {
        quoteReads += 1;
        return quoteReads === 1
          ? asStatus('ACCEPTED')
          : asStatus('CONVERTED', {
              convertedInvoiceId: INVOICE_ID,
              convertedAt: '2026-07-12T12:00:00Z',
            });
      }
      if (method === 'POST' && path === `/invoices/from-quote/${QUOTE_ID}`)
        throw new Error('connection lost');
      throw new Error(`Unexpected request ${method} ${path}`);
    });
    const { router } = renderPage(request);
    await confirm('Convertir en facture');
    await waitFor(() =>
      expect(router.state.location.pathname).toBe(
        `/erp-maroc/invoices/${INVOICE_ID}`,
      ),
    );
    expect(
      mutationCalls(request, `/invoices/from-quote/${QUOTE_ID}`),
    ).toHaveLength(1);
  });

  it('allows conversion re-emission only after refetch and human acknowledgement when still accepted', async () => {
    let postCount = 0;
    const request = jest.fn(async ({ method, path }) => {
      if (method === 'GET' && path === '/tiers') return [tier];
      if (method === 'GET' && path === `/quotes/${QUOTE_ID}`)
        return asStatus('ACCEPTED');
      if (method === 'POST' && path === `/invoices/from-quote/${QUOTE_ID}`) {
        postCount += 1;
        if (postCount === 1) throw new ErpMarocError('ERP_RATE_LIMITED', 429);
        return invoice;
      }
      throw new Error(`Unexpected request ${method} ${path}`);
    });
    const onConverted = jest.fn();
    renderPage(request, { onConverted });
    await confirm('Convertir en facture');
    expect(await screen.findByRole('dialog')).toHaveTextContent(
      'Vérification requise',
    );
    expect(
      mutationCalls(request, `/invoices/from-quote/${QUOTE_ID}`),
    ).toHaveLength(1);
    await userEvent.click(screen.getByTestId('erp-confirm-dialog-confirm'));
    await confirm('Convertir en facture');
    await waitFor(() => expect(onConverted).toHaveBeenCalledWith(invoice));
    expect(
      mutationCalls(request, `/invoices/from-quote/${QUOTE_ID}`),
    ).toHaveLength(2);
  });

  it.each([
    [new ErpMarocError('ERP_STATE_CONFLICT', 409), 'Conflit ERP'],
    [new ErpMarocError('ERP_RATE_LIMITED', 429), 'Limitation ERP'],
    [new ErpMarocError('ERP_UPSTREAM_TIMEOUT', 503), 'État à vérifier'],
    [new Error('offline'), 'État à vérifier'],
  ])(
    'reconciles %p without retrying the mutation and preserves the confirmed command',
    async (failure, expectedMessage) => {
      let quoteReads = 0;
      const request = jest.fn(async ({ method, path }) => {
        if (method === 'GET' && path === '/tiers') return [tier];
        if (method === 'GET' && path === `/quotes/${QUOTE_ID}`) {
          quoteReads += 1;
          return quoteReads === 1 ? asStatus('DRAFT') : asStatus('SENT');
        }
        if (method === 'POST' && path.endsWith('/send')) throw failure;
        throw new Error(`Unexpected request ${method} ${path}`);
      });
      renderPage(request);
      await confirm('Envoyer');
      expect(await screen.findByText('Envoyé')).toBeVisible();
      expect(screen.getByText(expectedMessage)).toBeVisible();
      expect(mutationCalls(request, `/quotes/${QUOTE_ID}/send`)).toHaveLength(
        1,
      );
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    },
  );

  it('requires acknowledgement after unresolved reconciliation and supports retrying a failed refetch', async () => {
    let quoteReads = 0;
    const request = jest.fn(async ({ method, path }) => {
      if (method === 'GET' && path === '/tiers') return [tier];
      if (method === 'GET' && path === `/quotes/${QUOTE_ID}`) {
        quoteReads += 1;
        if (quoteReads === 2) throw new Error('refetch failed');
        return asStatus('DRAFT');
      }
      if (method === 'POST' && path.endsWith('/send'))
        throw new Error('offline');
      throw new Error(`Unexpected request ${method} ${path}`);
    });
    renderPage(request);
    await confirm('Envoyer');
    expect(await screen.findByRole('dialog')).toHaveTextContent(
      'Échec de vérification',
    );
    expect(screen.getByRole('dialog')).toHaveTextContent('Envoyer');
    await userEvent.click(screen.getByTestId('erp-confirm-dialog-confirm'));
    expect(await screen.findByRole('dialog')).toHaveTextContent(
      'Vérification requise',
    );
    expect(mutationCalls(request, `/quotes/${QUOTE_ID}/send`)).toHaveLength(1);
    await userEvent.click(screen.getByTestId('erp-confirm-dialog-confirm'));
    expect(
      await screen.findByRole('button', { name: 'Envoyer' }),
    ).toBeEnabled();
  });

  it('aborts an in-flight reconciliation read when the detail page unmounts', async () => {
    const reconciliationRead = deferred<Quote>();
    let quoteReads = 0;
    let reconciliationSignal: AbortSignal | undefined;
    const request = jest.fn(
      ({
        method,
        path,
        signal,
      }: {
        method: string;
        path: string;
        signal?: AbortSignal;
      }) => {
        if (method === 'GET' && path === '/tiers')
          return Promise.resolve([tier]);
        if (method === 'GET' && path === `/quotes/${QUOTE_ID}`) {
          quoteReads += 1;
          if (quoteReads === 1) return Promise.resolve(asStatus('DRAFT'));
          reconciliationSignal = signal;
          return reconciliationRead.promise;
        }
        if (method === 'POST' && path.endsWith('/send'))
          return Promise.reject(new ErpMarocError('ERP_STATE_CONFLICT', 409));
        throw new Error(`Unexpected request ${method} ${path}`);
      },
    );
    const { unmount } = renderPage(request);
    await confirm('Envoyer');
    await waitFor(() =>
      expect(reconciliationSignal).toBeInstanceOf(AbortSignal),
    );

    unmount();
    expect(reconciliationSignal?.aborted).toBe(true);
    await act(async () => reconciliationRead.resolve(asStatus('SENT')));
  });

  it('treats 400 as a normal correctable error without changing the quote', async () => {
    const request = jest.fn(async ({ method, path }) => {
      if (method === 'GET' && path === `/quotes/${QUOTE_ID}`)
        return asStatus('DRAFT');
      if (method === 'GET' && path === '/tiers') return [tier];
      if (method === 'POST' && path.endsWith('/send'))
        throw new ErpMarocError('ERP_VALIDATION_ERROR', 400);
      throw new Error('Unexpected request');
    });
    renderPage(request);
    await confirm('Envoyer');
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Impossible d’envoyer le devis',
    );
    expect(screen.getByText('Brouillon')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Envoyer' })).toBeEnabled();
  });

  it('double-gates forged handlers when permission changes after opening confirmation', async () => {
    const request = jest.fn(async ({ method, path }) => {
      if (method === 'GET' && path === `/quotes/${QUOTE_ID}`)
        return asStatus('DRAFT');
      if (method === 'GET' && path === '/tiers') return [tier];
      if (method === 'POST') return asStatus('SENT');
      throw new Error('Unexpected request');
    });
    const { access } = renderPage(request);
    await userEvent.click(
      await screen.findByRole('button', { name: 'Envoyer' }),
    );
    access.canManage = false;
    fireEvent.click(screen.getByTestId('erp-confirm-dialog-confirm'));
    expect(mutationCalls(request, `/quotes/${QUOTE_ID}/send`)).toHaveLength(0);
  });
});
