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
import {
  RouterProvider,
  createMemoryRouter,
  useNavigate,
} from 'react-router-dom';
import type { ErpQuote } from 'twenty-shared/erp-maroc';

// oxlint-disable-next-line eslint/no-restricted-imports -- Pages are outside the @/ modules alias.
import { ErpQuoteEditorPage } from '../ErpQuoteEditorPage';

jest.mock('@/erp-maroc/context/useErpMarocContext', () => ({
  useErpMarocContext: jest.fn(),
}));

const SOCIETE_ID = '89c90690-4f4a-4f2e-91ce-3700f16a8ca1';
const TIER_ID = '49b11318-8d30-43ab-bbf4-fb16ce1867ba';
const QUOTE_ID = 'ac4fab7d-0ea2-4102-839e-50be33a1d2aa';
const LINE_ID = 'c24db3d3-6353-4f7c-a47e-6a1e44799e38';
const PRODUCT_ID = '6de44ee2-3039-4bc4-98d0-71874bc1fbf9';

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

const otherTier = {
  ...tier,
  id: '6ded2bc9-5f76-4d39-9413-091ea752fd62',
  name: 'Beta Services',
  email: 'beta@example.com',
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
  totalHtCents: 246_900,
  totalTvaCents: 49_380,
  totalTtcCents: 296_280,
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
      productId: PRODUCT_ID,
      description: 'Audit et configuration',
      unit: 'jour',
      quantity: 2,
      unitPriceHtCents: 123_450,
      tvaRate: 20,
      totalHtCents: 246_900,
      totalTvaCents: 49_380,
      totalTtcCents: 296_280,
      position: 0,
      createdAt: '2026-07-12T08:00:00Z',
      updatedAt: '2026-07-12T08:00:00Z',
    },
  ],
} satisfies ErpQuote;

type RenderOptions = {
  quoteId?: string;
  canManage?: boolean;
  onSaved?: jest.Mock;
  now?: Date | null;
  initialPath?: string;
  navigateOnSaved?: boolean;
  routeDriven?: boolean;
};

const renderPage = (
  request: jest.Mock,
  {
    quoteId,
    canManage = true,
    onSaved = jest.fn(),
    now = new Date('2026-07-12T15:30:00+01:00'),
    initialPath = quoteId === undefined
      ? '/erp-maroc/quotes/new'
      : `/erp-maroc/quotes/${quoteId}/edit`,
    navigateOnSaved = false,
    routeDriven = false,
  }: RenderOptions = {},
) => {
  const access = { canManage };
  const createMutationIntent = jest.fn((input, _options) => ({
    execute: () => request(input),
  }));

  jest.mocked(useErpMarocContext).mockReturnValue({
    status: 'ready',
    context: {
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

  const EditorRoute = ({ routeQuoteId }: { routeQuoteId?: string }) => {
    const navigate = useNavigate();

    if (routeDriven) {
      return <ErpQuoteEditorPage now={now ?? undefined} />;
    }

    return (
      <ErpQuoteEditorPage
        quoteId={routeQuoteId}
        now={now ?? undefined}
        onSaved={(savedQuote) => {
          onSaved(savedQuote);
          if (navigateOnSaved) {
            void navigate('/erp-maroc/quotes');
          }
        }}
      />
    );
  };

  const router = createMemoryRouter(
    [
      {
        path: '/erp-maroc/quotes/new',
        element: <EditorRoute />,
      },
      {
        path: '/erp-maroc/quotes/:id/edit',
        element: <EditorRoute routeQuoteId={quoteId} />,
      },
      {
        path: '/erp-maroc/quotes/:quoteId',
        element: <span>Route détail devis</span>,
      },
      {
        path: '/erp-maroc/quotes',
        element: <span>Route liste devis</span>,
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

  return {
    access,
    createMutationIntent,
    onSaved,
    router,
    unmount: rendered.unmount,
  };
};

const creationRequest = (savedQuote: ErpQuote = draftQuote) =>
  jest.fn(async ({ method, path }: { method: string; path: string }) => {
    if (method === 'GET' && path === '/tiers') return [tier];
    if (method === 'POST' && path === '/quotes') return savedQuote;
    throw new Error(`Unexpected request ${method} ${path}`);
  });

const editRequest = (sourceQuote: ErpQuote = draftQuote) =>
  jest.fn(async ({ method, path }: { method: string; path: string }) => {
    if (method === 'GET' && path === '/tiers') return [tier];
    if (method === 'GET' && path === `/quotes/${QUOTE_ID}`) return sourceQuote;
    if (method === 'PATCH' && path === `/quotes/${QUOTE_ID}`)
      return sourceQuote;
    throw new Error(`Unexpected request ${method} ${path}`);
  });

const fillRequiredCreationFields = async () => {
  await userEvent.type(screen.getByLabelText('Titre'), 'Conseil CRM');
  await userEvent.type(screen.getByLabelText('Description 1'), 'Diagnostic');
  await userEvent.clear(screen.getByLabelText('Prix unitaire HT 1'));
  await userEvent.type(screen.getByLabelText('Prix unitaire HT 1'), '0.29');
};

const mutationRequestCount = (request: jest.Mock, method: 'POST' | 'PATCH') =>
  request.mock.calls.filter(
    ([input]) => input.method === method && input.path.startsWith('/quotes'),
  ).length;

const readRequestCount = (request: jest.Mock, path: string) =>
  request.mock.calls.filter(
    ([input]) => input.method === 'GET' && input.path === path,
  ).length;

const attemptNavigation = async (
  router: ReturnType<typeof createMemoryRouter>,
) => {
  act(() => {
    void router.navigate('/erp-maroc/quotes');
  });
  await act(async () => undefined);
};

const expectDirtyDialog = async () =>
  screen.findByRole('dialog', { name: 'Quitter ce devis ?' });

const dispatchBeforeUnload = () => {
  const event = new Event('beforeunload', { cancelable: true });

  Object.defineProperty(event, 'returnValue', {
    value: undefined,
    writable: true,
  });

  window.dispatchEvent(event);

  return event;
};

const deferred = <T,>() => {
  let resolve: (value: T) => void = () => undefined;
  let reject: (reason?: unknown) => void = () => undefined;
  const promise = new Promise<T>((innerResolve, innerReject) => {
    resolve = innerResolve;
    reject = innerReject;
  });

  return { promise, resolve, reject };
};

const reconciliationRequest = ({
  mode,
  error,
  authoritativeQuote = draftQuote,
}: {
  mode: 'create' | 'edit';
  error: unknown;
  authoritativeQuote?: ErpQuote;
}) => {
  let quoteReadCount = 0;

  return jest.fn(({ method, path }: { method: string; path: string }) => {
    if (method === 'GET' && path === '/tiers') return Promise.resolve([tier]);

    if (method === 'GET' && path === `/quotes/${QUOTE_ID}`) {
      quoteReadCount += 1;

      return Promise.resolve(
        quoteReadCount === 1 ? draftQuote : authoritativeQuote,
      );
    }

    if (method === 'GET' && path === '/quotes')
      return Promise.resolve([authoritativeQuote]);

    if (mode === 'create' && method === 'POST' && path === '/quotes')
      return Promise.reject(error);

    if (mode === 'edit' && method === 'PATCH' && path === `/quotes/${QUOTE_ID}`)
      return Promise.reject(error);

    throw new Error(`Unexpected request ${method} ${path}`);
  });
};

const reconciliationErrorCases = [
  {
    label: '409 conflict',
    error: new ErpMarocError('ERP_UNKNOWN', 409),
    message: 'Conflit de devis détecté.',
  },
  {
    label: '429 rate limit',
    error: new ErpMarocError('ERP_UNKNOWN', 429),
    message: 'Limitation ERP Maroc.',
  },
  {
    label: 'network failure',
    error: new Error('offline'),
    message: 'État du devis à vérifier.',
  },
] as const;

beforeAll(() => {
  window.HTMLElement.prototype.scrollIntoView = jest.fn();

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

describe('ErpQuoteEditorPage', () => {
  beforeEach(() => jest.clearAllMocks());

  it('loads tiers with an abortable request and creates one stable empty line on the injected civil date', async () => {
    const request = creationRequest();
    renderPage(request);

    expect(await screen.findByLabelText('Titre')).toBeVisible();
    expect(screen.getByLabelText("Date d'émission")).toHaveValue('2026-07-12');
    expect(screen.getByLabelText('Description 1')).toHaveValue('');
    expect(screen.getByLabelText('Quantité 1')).toHaveValue('1');
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'GET',
        path: '/tiers',
        signal: expect.any(AbortSignal),
      }),
    );
  });

  it('captures the default current date once without reloading after each render', async () => {
    const request = creationRequest();
    renderPage(request, { now: null });

    expect(await screen.findByLabelText('Titre')).toBeVisible();
    await act(async () => undefined);
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('creates a manual MAD quote with exact decimal transport and calls onSaved', async () => {
    const request = creationRequest();
    const { createMutationIntent, onSaved } = renderPage(request);
    await screen.findByLabelText('Titre');
    await fillRequiredCreationFields();
    await userEvent.click(
      screen.getByRole('button', { name: 'Ajouter une ligne' }),
    );
    await userEvent.type(screen.getByLabelText('Description 2'), 'Formation');
    await userEvent.clear(screen.getByLabelText('Prix unitaire HT 2'));
    await userEvent.type(
      screen.getByLabelText('Prix unitaire HT 2'),
      '1 234,50',
    );

    await userEvent.click(
      screen.getByRole('button', { name: 'Créer le devis' }),
    );

    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(draftQuote));
    expect(createMutationIntent).toHaveBeenCalledWith(
      {
        method: 'POST',
        path: '/quotes',
        schema: expect.anything(),
        body: {
          societeId: SOCIETE_ID,
          tierId: TIER_ID,
          title: 'Conseil CRM',
          currency: 'MAD',
          issueDate: '2026-07-12',
          validUntil: null,
          notes: null,
          twentyOpportunityId: null,
          twentyCompanyId: null,
          twentyPersonId: null,
          lines: [
            {
              productId: null,
              description: 'Diagnostic',
              unit: null,
              quantity: 1,
              unitPriceHt: 0.29,
              tvaRate: 20,
            },
            {
              productId: null,
              description: 'Formation',
              unit: null,
              quantity: 1,
              unitPriceHt: 1234.5,
              tvaRate: 20,
            },
          ],
        },
      },
      { idempotency: 'forbidden' },
    );
  });

  it('shows authoritative line and date validation errors without submitting', async () => {
    const request = creationRequest();
    const { createMutationIntent } = renderPage(request);
    await screen.findByLabelText('Titre');
    await userEvent.type(screen.getByLabelText('Titre'), 'Conseil CRM');
    await userEvent.click(
      screen.getByRole('button', { name: 'Supprimer la ligne 1' }),
    );
    await userEvent.clear(screen.getByLabelText("Date d'émission"));
    await userEvent.type(
      screen.getByLabelText("Date d'émission"),
      '2026-02-30',
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Créer le devis' }),
    );

    expect(screen.getByText('Au moins une ligne est requise.')).toBeVisible();
    expect(screen.getByText("La date d'émission est invalide.")).toBeVisible();
    expect(createMutationIntent).not.toHaveBeenCalled();
  });

  it('locks duplicate submissions synchronously', async () => {
    let resolveSave: (value: typeof draftQuote) => void = () => undefined;
    const pendingSave = new Promise<typeof draftQuote>((resolve) => {
      resolveSave = resolve;
    });
    const request = jest.fn(
      ({ method, path }: { method: string; path: string }) => {
        if (method === 'GET' && path === '/tiers')
          return Promise.resolve([tier]);
        if (method === 'POST' && path === '/quotes') return pendingSave;
        throw new Error('Unexpected request');
      },
    );
    const { createMutationIntent, onSaved } = renderPage(request);
    await screen.findByLabelText('Titre');
    await fillRequiredCreationFields();
    const submit = screen.getByRole('button', { name: 'Créer le devis' });

    fireEvent.click(submit);
    fireEvent.click(submit);
    await waitFor(() => expect(createMutationIntent).toHaveBeenCalledTimes(1));

    await act(async () => resolveSave(draftQuote));
    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
  });

  it('maps a DRAFT quote into the full form and PATCHes its exact line values', async () => {
    const request = editRequest();
    const { createMutationIntent, onSaved } = renderPage(request, {
      quoteId: QUOTE_ID,
    });

    expect(await screen.findByLabelText('Titre')).toHaveValue(
      'Déploiement CRM',
    );
    expect(screen.getByLabelText('Description 1')).toHaveValue(
      'Audit et configuration',
    );
    expect(screen.getByLabelText('Quantité 1')).toHaveValue('2');
    expect(screen.getByLabelText('Prix unitaire HT 1')).toHaveValue('1234.50');
    expect(screen.getByLabelText('Notes')).toHaveValue('Inclure la formation');
    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));

    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(draftQuote));
    expect(createMutationIntent).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'PATCH',
        path: `/quotes/${QUOTE_ID}`,
        body: {
          tierId: TIER_ID,
          title: 'Déploiement CRM',
          currency: 'MAD',
          issueDate: '2026-07-12',
          validUntil: '2026-08-12',
          notes: 'Inclure la formation',
          lines: [
            {
              productId: PRODUCT_ID,
              description: 'Audit et configuration',
              unit: 'jour',
              quantity: 2,
              unitPriceHt: 1234.5,
              tvaRate: 20,
            },
          ],
        },
      }),
      { idempotency: 'forbidden' },
    );
  });

  it('blocks editing a non-DRAFT quote and never creates a mutation intent', async () => {
    const request = editRequest({ ...draftQuote, status: 'SENT' as const });
    const { createMutationIntent } = renderPage(request, { quoteId: QUOTE_ID });

    expect(
      await screen.findByText('Ce devis ne peut plus être modifié.'),
    ).toBeVisible();
    expect(
      screen.getByRole('link', { name: 'Retour au devis' }),
    ).toHaveAttribute('href', `/erp-maroc/quotes/${QUOTE_ID}`);
    expect(
      screen.queryByRole('button', { name: 'Enregistrer' }),
    ).not.toBeInTheDocument();
    expect(createMutationIntent).not.toHaveBeenCalled();
  });

  it('guards the UI and forged submit handler with manageSalesDocuments', async () => {
    const request = creationRequest();
    const { access, createMutationIntent, unmount } = renderPage(request);
    await screen.findByLabelText('Titre');
    await fillRequiredCreationFields();
    access.canManage = false;
    fireEvent.click(screen.getByRole('button', { name: 'Créer le devis' }));
    await waitFor(() => expect(createMutationIntent).not.toHaveBeenCalled());

    unmount();
    renderPage(creationRequest(), { canManage: false });
    expect(
      await screen.findByText(
        "Vous n'avez pas la permission de gérer les devis.",
      ),
    ).toBeVisible();
    expect(screen.queryByLabelText('Titre')).not.toBeInTheDocument();
  });

  it('blocks dirty internal navigation and resets the blocker when staying', async () => {
    const request = creationRequest();
    const { router } = renderPage(request);
    await screen.findByLabelText('Titre');
    await userEvent.type(screen.getByLabelText('Titre'), 'Conseil CRM');

    await attemptNavigation(router);

    expect(await expectDirtyDialog()).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/erp-maroc/quotes/new');

    await userEvent.click(screen.getByRole('button', { name: 'Rester' }));

    await waitFor(() =>
      expect(
        screen.queryByRole('dialog', { name: 'Quitter ce devis ?' }),
      ).not.toBeInTheDocument(),
    );
    expect(router.state.location.pathname).toBe('/erp-maroc/quotes/new');

    await attemptNavigation(router);

    expect(await expectDirtyDialog()).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/erp-maroc/quotes/new');
  });

  it('proceeds with dirty internal navigation after explicit confirmation', async () => {
    const request = creationRequest();
    const { router } = renderPage(request);
    await screen.findByLabelText('Titre');
    await userEvent.type(screen.getByLabelText('Titre'), 'Conseil CRM');

    await attemptNavigation(router);
    expect(await expectDirtyDialog()).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Quitter' }));

    await waitFor(() =>
      expect(router.state.location.pathname).toBe('/erp-maroc/quotes'),
    );
  });

  it('prevents beforeunload when the quote form is dirty', async () => {
    const request = creationRequest();
    renderPage(request);
    await screen.findByLabelText('Titre');
    await userEvent.type(screen.getByLabelText('Titre'), 'Conseil CRM');

    const event = dispatchBeforeUnload();

    expect(event.defaultPrevented).toBe(true);
    expect(event.returnValue).toBe('');
  });

  it('allows onSaved to navigate synchronously without opening the dirty dialog', async () => {
    const request = creationRequest();
    const { onSaved, router } = renderPage(request, { navigateOnSaved: true });
    await screen.findByLabelText('Titre');
    await fillRequiredCreationFields();

    await userEvent.click(
      screen.getByRole('button', { name: 'Créer le devis' }),
    );

    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(draftQuote));
    await waitFor(() =>
      expect(router.state.location.pathname).toBe('/erp-maroc/quotes'),
    );
    expect(
      screen.queryByRole('dialog', { name: 'Quitter ce devis ?' }),
    ).not.toBeInTheDocument();
  });

  it.each([
    ['create', undefined, creationRequest()],
    ['edit', QUOTE_ID, editRequest()],
  ] as const)(
    'reads the %s route and navigates to detail after save without a dirty dialog',
    async (_mode, quoteId, request) => {
      const { router } = renderPage(request, {
        quoteId,
        routeDriven: true,
      });
      await screen.findByLabelText('Titre');
      if (quoteId === undefined) await fillRequiredCreationFields();

      await userEvent.click(
        screen.getByRole('button', {
          name: quoteId === undefined ? 'Créer le devis' : 'Enregistrer',
        }),
      );

      await waitFor(() =>
        expect(router.state.location.pathname).toBe(
          `/erp-maroc/quotes/${QUOTE_ID}`,
        ),
      );
      expect(
        screen.queryByRole('dialog', { name: 'Quitter ce devis ?' }),
      ).not.toBeInTheDocument();
    },
  );

  it('renders a neutral state and performs no request for a malformed edit route id', async () => {
    const request = jest.fn();
    renderPage(request, {
      routeDriven: true,
      initialPath: '/erp-maroc/quotes/not-a-uuid/edit',
    });

    expect(await screen.findByText('Devis introuvable')).toBeVisible();
    expect(request).not.toHaveBeenCalled();
  });

  it.each([
    [
      'tier',
      async () => {
        await userEvent.click(
          screen.getByRole('button', { name: /Tiers Atlas Conseil/ }),
        );
        const options = await screen.findAllByText('Beta Services');
        await userEvent.click(options[options.length - 1]);
      },
    ],
    [
      'title',
      async () => userEvent.type(screen.getByLabelText('Titre'), 'Conseil CRM'),
    ],
    [
      'issueDate',
      async () => {
        await userEvent.clear(screen.getByLabelText("Date d'émission"));
        await userEvent.type(
          screen.getByLabelText("Date d'émission"),
          '2026-07-13',
        );
      },
    ],
    [
      'validUntil',
      async () =>
        userEvent.type(screen.getByLabelText("Valide jusqu'au"), '2026-08-12'),
    ],
    [
      'notes',
      async () => userEvent.type(screen.getByLabelText('Notes'), 'Prévoir SAV'),
    ],
    [
      'line editor',
      async () =>
        userEvent.type(screen.getByLabelText('Description 1'), 'Diagnostic'),
    ],
  ])('marks %s changes as dirty for navigation blocking', async (_, mutate) => {
    const request = jest.fn(
      ({ method, path }: { method: string; path: string }) => {
        if (method === 'GET' && path === '/tiers')
          return Promise.resolve([tier, otherTier]);
        if (method === 'POST' && path === '/quotes')
          return Promise.resolve(draftQuote);
        throw new Error(`Unexpected request ${method} ${path}`);
      },
    );
    const { router } = renderPage(request);
    await screen.findByLabelText('Titre');

    await mutate();
    await attemptNavigation(router);

    expect(await expectDirtyDialog()).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/erp-maroc/quotes/new');
  });

  it('shows a normal save failure and preserves every line value', async () => {
    const request = jest.fn(
      ({ method, path }: { method: string; path: string }) => {
        if (method === 'GET' && path === '/tiers')
          return Promise.resolve([tier]);
        if (method === 'POST' && path === '/quotes')
          return Promise.reject(new ErpMarocError('ERP_VALIDATION_ERROR', 400));
        throw new Error('Unexpected request');
      },
    );
    renderPage(request);
    await screen.findByLabelText('Titre');
    await fillRequiredCreationFields();
    await userEvent.click(
      screen.getByRole('button', { name: 'Créer le devis' }),
    );

    expect(
      await screen.findByText("Impossible d'enregistrer le devis."),
    ).toBeVisible();
    expect(screen.queryByText('Vérification du devis')).not.toBeInTheDocument();
    expect(readRequestCount(request, '/quotes')).toBe(0);
    expect(screen.getByLabelText('Description 1')).toHaveValue('Diagnostic');
    expect(screen.getByLabelText('Prix unitaire HT 1')).toHaveValue('0.29');
  });

  it.each(
    [
      { mode: 'create' as const, submitLabel: 'Créer le devis' },
      { mode: 'edit' as const, submitLabel: 'Enregistrer' },
    ].flatMap(({ mode, submitLabel }) =>
      reconciliationErrorCases.map(({ label, error, message }) => ({
        mode,
        submitLabel,
        label,
        error,
        message,
      })),
    ),
  )(
    'classifies $label for $mode without retrying the mutation',
    async ({ mode, submitLabel, error, message }) => {
      const request = reconciliationRequest({ mode, error });
      renderPage(request, {
        quoteId: mode === 'edit' ? QUOTE_ID : undefined,
      });
      await screen.findByLabelText('Titre');

      if (mode === 'create') {
        await fillRequiredCreationFields();
      } else {
        await userEvent.clear(screen.getByLabelText('Description 1'));
        await userEvent.type(
          screen.getByLabelText('Description 1'),
          'Diagnostic utilisateur',
        );
      }

      await userEvent.click(screen.getByRole('button', { name: submitLabel }));

      expect(await screen.findByText(message)).toBeVisible();
      expect(
        await screen.findByText('Vérification du devis terminée.'),
      ).toBeVisible();
      expect(screen.getByRole('button', { name: submitLabel })).toBeDisabled();
      expect(
        mutationRequestCount(request, mode === 'create' ? 'POST' : 'PATCH'),
      ).toBe(1);
      expect(screen.getByLabelText('Description 1')).toHaveValue(
        mode === 'create' ? 'Diagnostic' : 'Diagnostic utilisateur',
      );

      await userEvent.click(screen.getByRole('button', { name: submitLabel }));

      expect(
        mutationRequestCount(request, mode === 'create' ? 'POST' : 'PATCH'),
      ).toBe(1);
    },
  );

  it('keeps save and dirty departure blocked while reconciliation is refreshing', async () => {
    const refreshedQuotes = deferred<(typeof draftQuote)[]>();
    const request = jest.fn(
      ({ method, path }: { method: string; path: string }) => {
        if (method === 'GET' && path === '/tiers')
          return Promise.resolve([tier]);
        if (method === 'POST' && path === '/quotes')
          return Promise.reject(new ErpMarocError('ERP_UNKNOWN', 409));
        if (method === 'GET' && path === '/quotes')
          return refreshedQuotes.promise;
        throw new Error(`Unexpected request ${method} ${path}`);
      },
    );
    const { router } = renderPage(request);
    await screen.findByLabelText('Titre');
    await fillRequiredCreationFields();

    await userEvent.click(
      screen.getByRole('button', { name: 'Créer le devis' }),
    );

    expect(
      await screen.findByText('Vérification du devis en cours.'),
    ).toBeVisible();
    expect(
      screen.getByRole('button', { name: 'Créer le devis' }),
    ).toBeDisabled();

    await attemptNavigation(router);

    expect(await expectDirtyDialog()).toBeInTheDocument();
    const leaveButton = screen.getByRole('button', { name: 'Quitter' });
    expect(leaveButton).toBeDisabled();
    await userEvent.click(leaveButton);
    expect(router.state.location.pathname).toBe('/erp-maroc/quotes/new');

    await act(async () => refreshedQuotes.resolve([draftQuote]));

    expect(
      await screen.findByText('Vérification du devis terminée.'),
    ).toBeVisible();
  });

  it('retries only the reconciliation read after a failed refetch', async () => {
    let quoteListReads = 0;
    const request = jest.fn(
      ({ method, path }: { method: string; path: string }) => {
        if (method === 'GET' && path === '/tiers')
          return Promise.resolve([tier]);
        if (method === 'POST' && path === '/quotes')
          return Promise.reject(new ErpMarocError('ERP_UNKNOWN', 409));
        if (method === 'GET' && path === '/quotes') {
          quoteListReads += 1;

          return quoteListReads === 1
            ? Promise.reject(new Error('offline'))
            : Promise.resolve([draftQuote]);
        }
        throw new Error(`Unexpected request ${method} ${path}`);
      },
    );
    renderPage(request);
    await screen.findByLabelText('Titre');
    await fillRequiredCreationFields();

    await userEvent.click(
      screen.getByRole('button', { name: 'Créer le devis' }),
    );

    expect(
      await screen.findByText('Vérification du devis impossible.'),
    ).toBeVisible();
    expect(
      screen.getByRole('button', { name: 'Créer le devis' }),
    ).toBeDisabled();
    expect(mutationRequestCount(request, 'POST')).toBe(1);
    expect(screen.getByLabelText('Description 1')).toHaveValue('Diagnostic');

    await userEvent.click(
      screen.getByRole('button', { name: 'Réessayer la vérification' }),
    );

    expect(
      await screen.findByText('Vérification du devis terminée.'),
    ).toBeVisible();
    expect(readRequestCount(request, '/quotes')).toBe(2);
    expect(mutationRequestCount(request, 'POST')).toBe(1);
  });

  it.each([
    new Error('response perdue après création'),
    new ErpMarocError('ERP_STATE_CONFLICT', 409),
    new ErpMarocError('ERP_RATE_LIMITED', 429),
  ])(
    'keeps a manually created quote locked when %p leaves the POST outcome uncertain',
    async (failure) => {
      let postCount = 0;
      const request = jest.fn(
        ({ method, path }: { method: string; path: string }) => {
          if (method === 'GET' && path === '/tiers')
            return Promise.resolve([tier]);
          if (method === 'GET' && path === '/quotes')
            return Promise.resolve([draftQuote]);
          if (method === 'POST' && path === '/quotes') {
            postCount += 1;

            // The server may have committed a different quote before the response
            // was lost. The list cannot correlate it to this form.
            return Promise.reject(failure);
          }
          throw new Error(`Unexpected request ${method} ${path}`);
        },
      );
      const { router } = renderPage(request);
      await screen.findByLabelText('Titre');
      await fillRequiredCreationFields();

      await userEvent.click(
        screen.getByRole('button', { name: 'Créer le devis' }),
      );
      await screen.findByText('Vérification du devis terminée.');
      await userEvent.click(
        screen.getByRole('button', { name: "J'ai vérifié" }),
      );

      expect(await screen.findByText('Création à vérifier')).toBeVisible();
      expect(
        screen.getByRole('button', { name: 'Créer le devis' }),
      ).toBeDisabled();
      fireEvent.click(screen.getByRole('button', { name: 'Créer le devis' }));
      expect(postCount).toBe(1);

      await userEvent.click(
        screen.getByRole('button', { name: 'Retour aux devis' }),
      );
      expect(await screen.findByText('Route liste devis')).toBeVisible();
      expect(router.state.location.pathname).toBe('/erp-maroc/quotes');
    },
  );

  it('blocks editing when a conflict refetch finds a sent quote', async () => {
    let patchCount = 0;
    const request = jest.fn(
      ({ method, path }: { method: string; path: string }) => {
        if (method === 'GET' && path === '/tiers')
          return Promise.resolve([tier]);
        if (method === 'GET' && path === `/quotes/${QUOTE_ID}`) {
          return Promise.resolve(
            patchCount === 0
              ? draftQuote
              : { ...draftQuote, status: 'SENT' as const },
          );
        }
        if (method === 'PATCH' && path === `/quotes/${QUOTE_ID}`) {
          patchCount += 1;
          return Promise.reject(new ErpMarocError('ERP_STATE_CONFLICT', 409));
        }
        throw new Error(`Unexpected request ${method} ${path}`);
      },
    );
    renderPage(request, { quoteId: QUOTE_ID });
    await screen.findByLabelText('Titre');
    await userEvent.clear(screen.getByLabelText('Titre'));
    await userEvent.type(screen.getByLabelText('Titre'), 'Titre utilisateur');

    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));

    expect(
      await screen.findByText('Ce devis ne peut plus être modifié.'),
    ).toBeVisible();
    expect(screen.getByRole('link', { name: 'Retour au devis' })).toBeVisible();
    expect(
      screen.queryByRole('button', { name: 'Enregistrer' }),
    ).not.toBeInTheDocument();
    expect(patchCount).toBe(1);
  });

  it('preserves local values and permits a new PATCH after a DRAFT reconciliation acknowledgement', async () => {
    let patchCount = 0;
    const request = jest.fn(
      ({ method, path }: { method: string; path: string }) => {
        if (method === 'GET' && path === '/tiers')
          return Promise.resolve([tier]);
        if (method === 'GET' && path === `/quotes/${QUOTE_ID}`)
          return Promise.resolve({ ...draftQuote, title: 'Titre serveur' });
        if (method === 'PATCH' && path === `/quotes/${QUOTE_ID}`) {
          patchCount += 1;
          return patchCount === 1
            ? Promise.reject(new ErpMarocError('ERP_STATE_CONFLICT', 409))
            : Promise.resolve({ ...draftQuote, title: 'Titre utilisateur' });
        }
        throw new Error(`Unexpected request ${method} ${path}`);
      },
    );
    renderPage(request, { quoteId: QUOTE_ID });
    await screen.findByLabelText('Titre');
    await userEvent.clear(screen.getByLabelText('Titre'));
    await userEvent.type(screen.getByLabelText('Titre'), 'Titre utilisateur');

    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));
    await screen.findByText('Vérification du devis terminée.');
    expect(screen.getByLabelText('Titre')).toHaveValue('Titre utilisateur');
    await userEvent.click(screen.getByRole('button', { name: "J'ai vérifié" }));
    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));

    await waitFor(() => expect(patchCount).toBe(2));
  });

  it('does not replace edited values with the authoritative edit refetch', async () => {
    const authoritativeQuote = {
      ...draftQuote,
      title: 'Titre serveur',
      notes: 'Notes serveur',
      lines: [
        {
          ...draftQuote.lines[0]!,
          description: 'Ligne serveur',
          unitPriceHtCents: 999_00,
        },
      ],
    };
    const request = reconciliationRequest({
      mode: 'edit',
      error: new ErpMarocError('ERP_UNKNOWN', 409),
      authoritativeQuote,
    });
    renderPage(request, { quoteId: QUOTE_ID });
    expect(await screen.findByLabelText('Titre')).toHaveValue(
      'Déploiement CRM',
    );
    await userEvent.clear(screen.getByLabelText('Titre'));
    await userEvent.type(screen.getByLabelText('Titre'), 'Titre utilisateur');
    await userEvent.clear(screen.getByLabelText('Description 1'));
    await userEvent.type(
      screen.getByLabelText('Description 1'),
      'Ligne utilisateur',
    );

    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));

    expect(
      await screen.findByText('Vérification du devis terminée.'),
    ).toBeVisible();
    expect(screen.getByLabelText('Titre')).toHaveValue('Titre utilisateur');
    expect(screen.getByLabelText('Description 1')).toHaveValue(
      'Ligne utilisateur',
    );
    expect(mutationRequestCount(request, 'PATCH')).toBe(1);
  });

  it('shows initial load failure and retries tiers plus quote with fresh signals', async () => {
    let attempt = 0;
    const request = jest.fn(
      ({
        method,
        path,
      }: {
        method: string;
        path: string;
        signal?: AbortSignal;
      }) => {
        if (method === 'GET' && path === '/tiers') {
          attempt += 1;
          return attempt === 1
            ? Promise.reject(new Error('offline'))
            : Promise.resolve([tier]);
        }
        if (method === 'GET' && path === `/quotes/${QUOTE_ID}`)
          return Promise.resolve(draftQuote);
        throw new Error('Unexpected request');
      },
    );
    renderPage(request, { quoteId: QUOTE_ID });

    expect(
      await screen.findByText('Impossible de charger le devis'),
    ).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: 'Réessayer' }));
    expect(await screen.findByLabelText('Titre')).toHaveValue(
      'Déploiement CRM',
    );
    expect(
      request.mock.calls.filter(([input]) => input.path === '/tiers'),
    ).toHaveLength(2);
    expect(
      request.mock.calls.every(
        ([input]) => input.signal instanceof AbortSignal,
      ),
    ).toBe(true);
  });
});
