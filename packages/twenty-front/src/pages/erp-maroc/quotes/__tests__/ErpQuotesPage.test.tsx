import { ErpMarocError } from '@/erp-maroc/api/erpMarocError';
import { useErpMarocContext } from '@/erp-maroc/context/useErpMarocContext';
import { useFindManyRecords } from '@/object-record/hooks/useFindManyRecords';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';

// oxlint-disable-next-line eslint/no-restricted-imports -- Pages are outside the @/ modules alias.
import { ErpQuotesPage } from '../ErpQuotesPage';

jest.mock('@/erp-maroc/context/useErpMarocContext', () => ({
  useErpMarocContext: jest.fn(),
}));

jest.mock('@/object-record/hooks/useFindManyRecords', () => ({
  useFindManyRecords: jest.fn(),
}));

const SOCIETE_ID = '89c90690-4f4a-4f2e-91ce-3700f16a8ca1';
const TIER_ID = '49b11318-8d30-43ab-bbf4-fb16ce1867ba';
const SECOND_TIER_ID = 'b330b785-8784-4e59-b45b-37f4bf5f86ef';
const QUOTE_ID = 'ac4fab7d-0ea2-4102-839e-50be33a1d2aa';
const OPPORTUNITY_ID = 'c098d723-02ab-4dc0-a49b-ae6f3eff97e9';
const COMPANY_ID = 'da33baaf-5266-4e6c-9a4f-b2f54090fc5c';
const PERSON_ID = '84d739ee-1a2b-4e8d-a6de-45c768ca4899';

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
  creditLimit: 10000,
  twentyCompanyId: COMPANY_ID,
  twentyPersonId: PERSON_ID,
  compteCollectifCode: '3421' as const,
  isActive: true,
  createdAt: '2026-07-11T08:00:00Z',
  updatedAt: '2026-07-11T08:00:00Z',
};

const quote = {
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
  notes: null,
  totalHtCents: 100000,
  totalTvaCents: 20000,
  totalTtcCents: 120000,
  twentyOpportunityId: OPPORTUNITY_ID,
  twentyCompanyId: COMPANY_ID,
  twentyPersonId: PERSON_ID,
  opportunityEstimatedAmountCents: 120000,
  convertedInvoiceId: null,
  convertedAt: null,
  createdAt: '2026-07-12T08:00:00Z',
  updatedAt: '2026-07-12T08:00:00Z',
  lines: [],
};

const sentQuote = {
  ...quote,
  id: '8fd38b8b-b231-497f-8d44-df14f256b8e4',
  tierId: SECOND_TIER_ID,
  number: 'DEV-2026-0043',
  status: 'SENT' as const,
  twentyOpportunityId: null,
};

const opportunity = {
  id: OPPORTUNITY_ID,
  name: 'Déploiement CRM',
  amount: { amountMicros: 1_200_000_000, currencyCode: 'MAD' },
  companyId: COMPANY_ID,
  pointOfContactId: PERSON_ID,
  company: { name: 'Atlas Conseil' },
  pointOfContact: { name: { firstName: 'Sara', lastName: 'Amrani' } },
};

const secondOpportunity = {
  ...opportunity,
  id: '713cb816-e94a-47dd-981f-9ecac2dd3777',
  name: 'Audit finance',
};

type FindManyState = {
  records: (typeof opportunity)[];
  loading: boolean;
  error: Error | undefined;
  hasNextPage: boolean;
  fetchMoreRecords: jest.Mock;
  refetch: jest.Mock;
};

type FindManyArgs = Parameters<typeof useFindManyRecords>[0];

const hasIdFilter = (
  filter: FindManyArgs['filter'],
): filter is NonNullable<FindManyArgs['filter']> & { id: unknown } =>
  filter !== undefined && 'id' in filter && filter.id !== undefined;

const createOpportunityQuery = (
  overrides: Partial<FindManyState> = {},
): FindManyState => ({
  records: [opportunity],
  loading: false,
  error: undefined,
  hasNextPage: false,
  fetchMoreRecords: jest.fn().mockResolvedValue(undefined),
  refetch: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

const LocationProbe = () => {
  const location = useLocation();
  return (
    <output aria-label="URL courante">
      {location.pathname}
      {location.search}
    </output>
  );
};

type RenderOptions = {
  initialEntry?: string;
  canManage?: boolean;
  opportunityQuery?: FindManyState;
  targetedOpportunityQuery?: FindManyState;
};

const renderPage = (
  request: jest.Mock,
  {
    initialEntry = '/erp-maroc/quotes',
    canManage = true,
    opportunityQuery = createOpportunityQuery(),
    targetedOpportunityQuery = createOpportunityQuery({
      records: [opportunity],
    }),
  }: RenderOptions = {},
) => {
  const access = { canManage };
  const createMutationIntent = jest.fn((input, _options) => ({
    execute: () => request(input),
  }));

  jest
    .mocked(useFindManyRecords)
    .mockImplementation(
      ({ filter }: FindManyArgs) =>
        (hasIdFilter(filter)
          ? targetedOpportunityQuery
          : opportunityQuery) as never,
    );
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

  const renderTree = () => (
    <MemoryRouter
      initialEntries={[initialEntry]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <ErpQuotesPage />
      <LocationProbe />
    </MemoryRouter>
  );
  const rendered = render(renderTree());

  return {
    ...rendered,
    rerenderPage: () => rendered.rerender(renderTree()),
    access,
    createMutationIntent,
    opportunityQuery,
    targetedOpportunityQuery,
  };
};

const listResponse = (
  quotes = [quote, sentQuote],
  tiers = [tier, { ...tier, id: SECOND_TIER_ID, name: 'Riad Industrie' }],
) =>
  jest.fn(async ({ method, path }: { method: string; path: string }) => {
    if (method === 'GET' && path === '/quotes') return quotes;
    if (method === 'GET' && path === '/tiers') return tiers;
    throw new Error(`Unexpected request ${method} ${path}`);
  });

const getPickerQueryArgs = () =>
  jest
    .mocked(useFindManyRecords)
    .mock.calls.filter(([args]) => args.limit === 20)
    .at(-1)?.[0];

describe('ErpQuotesPage', () => {
  beforeEach(() => jest.clearAllMocks());

  it('loads quotes and tiers with one abortable lifecycle and renders operational columns', async () => {
    const request = listResponse();
    renderPage(request);

    expect(await screen.findByRole('table', { name: 'Devis' })).toBeVisible();
    expect(screen.getByText('Page chargée')).toBeVisible();
    expect(screen.getByText('DEV-2026-0042')).toBeVisible();
    expect(screen.getByText('Atlas Conseil')).toBeVisible();
    expect(screen.getAllByText('1 200,00 MAD')).toHaveLength(2);
    expect(screen.getByText('Opportunité')).toBeVisible();
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'GET',
        path: '/quotes',
        signal: expect.any(AbortSignal),
      }),
    );
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'GET',
        path: '/tiers',
        signal: expect.any(AbortSignal),
      }),
    );
  });

  it('canonicalizes and locally applies status and tier filters', async () => {
    renderPage(listResponse(), {
      initialEntry: `/erp-maroc/quotes?status=bad&status=DRAFT&tierId=${TIER_ID}&junk=x`,
    });

    expect(await screen.findByText('DEV-2026-0042')).toBeVisible();
    expect(screen.queryByText('DEV-2026-0043')).not.toBeInTheDocument();
    expect(screen.getByLabelText('URL courante')).toHaveTextContent(
      `/erp-maroc/quotes?status=DRAFT&tierId=${TIER_ID}`,
    );

    await userEvent.click(
      screen.getByRole('button', { name: 'Tous les statuts' }),
    );
    expect(screen.getByLabelText('URL courante')).toHaveTextContent(
      `/erp-maroc/quotes?tierId=${TIER_ID}`,
    );
  });

  it('shows loading, error and retry states', async () => {
    let rejectFirst: (error: Error) => void = () => undefined;
    const pending = new Promise((_, reject) => {
      rejectFirst = reject;
    });
    const request = jest
      .fn()
      .mockImplementationOnce(() => pending)
      .mockImplementationOnce(() => Promise.resolve([tier]))
      .mockImplementation(({ path }: { path: string }) =>
        Promise.resolve(path === '/quotes' ? [quote] : [tier]),
      );
    renderPage(request);

    expect(screen.getByText('Chargement des devis')).toBeVisible();
    await act(async () => rejectFirst(new Error('offline')));
    expect(
      await screen.findByText('Impossible de charger les devis'),
    ).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: 'Réessayer' }));
    expect(await screen.findByText('DEV-2026-0042')).toBeVisible();
  });

  it('navigates to manual creation and quote detail', async () => {
    renderPage(listResponse());

    await screen.findByText('DEV-2026-0042');
    await userEvent.click(
      screen.getByRole('button', { name: 'Nouveau devis' }),
    );
    expect(screen.getByLabelText('URL courante')).toHaveTextContent(
      '/erp-maroc/quotes/new',
    );
  });

  it('hides mutation controls and guards a forged handler after permission revocation', async () => {
    const request = listResponse();
    const { access, createMutationIntent } = renderPage(request);

    const opportunityButton = await screen.findByRole('button', {
      name: 'Créer depuis une opportunité',
    });
    await userEvent.click(opportunityButton);
    access.canManage = false;
    fireEvent.click(
      await screen.findByRole('button', { name: /Déploiement CRM/ }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Créer le devis' }));

    expect(createMutationIntent).not.toHaveBeenCalled();
  });

  it('does not render mutation controls without sales-document permission', async () => {
    renderPage(listResponse(), { canManage: false });

    await screen.findByRole('table', { name: 'Devis' });
    expect(
      screen.queryByRole('button', { name: 'Créer depuis une opportunité' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Nouveau devis' }),
    ).not.toBeInTheDocument();
  });

  it('configures a lazy paginated opportunity picker with loading, retry and load more', async () => {
    const query = createOpportunityQuery({
      records: [],
      loading: true,
      hasNextPage: true,
    });
    renderPage(listResponse(), { opportunityQuery: query });

    expect(getPickerQueryArgs()).toMatchObject({
      objectNameSingular: 'opportunity',
      limit: 20,
      skip: true,
      recordGqlFields: {
        id: true,
        name: true,
        amount: true,
        companyId: true,
        pointOfContactId: true,
        company: { name: true },
        pointOfContact: { name: true },
      },
    });

    await userEvent.click(
      await screen.findByRole('button', {
        name: 'Créer depuis une opportunité',
      }),
    );
    expect(screen.getByText('Chargement des opportunités')).toBeVisible();
    expect(getPickerQueryArgs()).toMatchObject({ skip: false });

    query.loading = false;
    query.error = new Error('GraphQL');
    query.records = [];
    jest.mocked(useFindManyRecords).mockReturnValue(query as never);
    fireEvent.click(screen.getByRole('button', { name: 'Fermer' }));
    await userEvent.click(
      screen.getByRole('button', { name: 'Créer depuis une opportunité' }),
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Réessayer les opportunités' }),
    );
    expect(query.refetch).toHaveBeenCalledTimes(1);

    query.error = undefined;
    query.records = [opportunity];
    jest.mocked(useFindManyRecords).mockReturnValue(query as never);
    fireEvent.click(screen.getByRole('button', { name: 'Fermer' }));
    await userEvent.click(
      screen.getByRole('button', { name: 'Créer depuis une opportunité' }),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Charger plus' }));
    expect(query.fetchMoreRecords).toHaveBeenCalledTimes(1);
  });

  it('shows an explicit empty opportunity state', async () => {
    renderPage(listResponse(), {
      opportunityQuery: createOpportunityQuery({ records: [] }),
    });

    await userEvent.click(
      await screen.findByRole('button', {
        name: 'Créer depuis une opportunité',
      }),
    );
    expect(
      screen.getByText('Aucune opportunité sur la page chargée'),
    ).toBeVisible();
  });

  it('blocks invalid opportunities without posting', async () => {
    const request = listResponse();
    const invalid = { ...opportunity, companyId: null, pointOfContactId: null };
    const { createMutationIntent } = renderPage(request, {
      opportunityQuery: createOpportunityQuery({ records: [invalid as never] }),
    });

    await userEvent.click(
      await screen.findByRole('button', {
        name: 'Créer depuis une opportunité',
      }),
    );
    await userEvent.click(
      screen.getByRole('button', { name: /Déploiement CRM/ }),
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Créer le devis' }),
    );

    expect(
      await screen.findByText('Une société Twenty est requise.'),
    ).toBeVisible();
    expect(createMutationIntent).not.toHaveBeenCalled();
  });

  it('navigates to the exact tier-sync resume route when the company is not linked', async () => {
    renderPage(listResponse([quote], []));

    await userEvent.click(
      await screen.findByRole('button', {
        name: 'Créer depuis une opportunité',
      }),
    );
    await userEvent.click(
      screen.getByRole('button', { name: /Déploiement CRM/ }),
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Créer le devis' }),
    );

    expect(screen.getByLabelText('URL courante')).toHaveTextContent(
      `/erp-maroc/tiers?syncCompanyId=${COMPANY_ID}&resumeOpportunityId=${OPPORTUNITY_ID}`,
    );
  });

  it('posts the exact opportunity payload once and navigates for new or repeated responses', async () => {
    let resolvePost: (value: typeof quote) => void = () => undefined;
    const post = new Promise<typeof quote>((resolve) => {
      resolvePost = resolve;
    });
    const request = jest.fn(
      ({ method, path }: { method: string; path: string }) => {
        if (method === 'GET')
          return Promise.resolve(path === '/quotes' ? [] : [tier]);
        if (path === '/quotes/from-opportunity') return post;
        throw new Error('unexpected');
      },
    );
    const { createMutationIntent } = renderPage(request);

    await userEvent.click(
      await screen.findByRole('button', {
        name: 'Créer depuis une opportunité',
      }),
    );
    await userEvent.click(
      screen.getByRole('button', { name: /Déploiement CRM/ }),
    );
    const submit = screen.getByRole('button', { name: 'Créer le devis' });
    fireEvent.click(submit);
    fireEvent.click(submit);

    expect(createMutationIntent).toHaveBeenCalledTimes(1);
    expect(createMutationIntent).toHaveBeenCalledWith(
      {
        method: 'POST',
        path: '/quotes/from-opportunity',
        schema: expect.anything(),
        body: {
          twentyOpportunityId: OPPORTUNITY_ID,
          twentyCompanyId: COMPANY_ID,
          twentyPersonId: PERSON_ID,
          title: 'Déploiement CRM',
          estimatedAmount: 1200,
          currency: 'MAD',
        },
      },
      { idempotency: 'forbidden' },
    );

    await act(async () => resolvePost(quote));
    expect(screen.getByLabelText('URL courante')).toHaveTextContent(
      `/erp-maroc/quotes/${QUOTE_ID}`,
    );
  });

  it.each([
    ['409', new ErpMarocError('ERP_STATE_CONFLICT', 409)],
    ['429', new ErpMarocError('ERP_RATE_LIMITED', 429)],
    ['network', new TypeError('Failed to fetch')],
    ['5xx', new ErpMarocError('ERP_UPSTREAM_TIMEOUT', 503)],
  ])(
    'reconciles an uncertain %s response without retrying the POST',
    async (_label, error) => {
      let quotesRead = 0;
      const request = jest.fn(
        ({ method, path }: { method: string; path: string }) => {
          if (method === 'GET' && path === '/quotes') {
            quotesRead += 1;
            return Promise.resolve(quotesRead === 1 ? [] : [quote]);
          }
          if (method === 'GET' && path === '/tiers')
            return Promise.resolve([tier]);
          return Promise.reject(error);
        },
      );
      const { createMutationIntent } = renderPage(request);

      await userEvent.click(
        await screen.findByRole('button', {
          name: 'Créer depuis une opportunité',
        }),
      );
      await userEvent.click(
        screen.getByRole('button', { name: /Déploiement CRM/ }),
      );
      await userEvent.click(
        screen.getByRole('button', { name: 'Créer le devis' }),
      );

      await waitFor(() =>
        expect(screen.getByLabelText('URL courante')).toHaveTextContent(
          `/erp-maroc/quotes/${QUOTE_ID}`,
        ),
      );
      expect(createMutationIntent).toHaveBeenCalledTimes(1);
    },
  );

  it('preserves selection and requires acknowledgement when reconciliation finds no quote', async () => {
    const request = jest.fn(
      ({ method, path }: { method: string; path: string }) => {
        if (method === 'GET')
          return Promise.resolve(path === '/quotes' ? [] : [tier]);
        return Promise.reject(new ErpMarocError('ERP_STATE_CONFLICT', 409));
      },
    );
    const { createMutationIntent } = renderPage(request);

    await userEvent.click(
      await screen.findByRole('button', {
        name: 'Créer depuis une opportunité',
      }),
    );
    await userEvent.click(
      screen.getByRole('button', { name: /Déploiement CRM/ }),
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Créer le devis' }),
    );

    expect(await screen.findByText('État à vérifier')).toBeVisible();
    expect(screen.getByText('Déploiement CRM')).toBeVisible();
    expect(
      screen.getByRole('button', { name: 'Créer le devis' }),
    ).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Fermer' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Annuler' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: "J'ai vérifié" }));
    await userEvent.click(
      screen.getByRole('button', { name: 'Créer le devis' }),
    );
    expect(createMutationIntent).toHaveBeenCalledTimes(2);
  });

  it('freezes the source opportunity while its uncertain response is reconciled', async () => {
    let quoteReads = 0;
    let resolveReconciliation: (quotes: (typeof quote)[]) => void = () =>
      undefined;
    const reconciliationRead = new Promise<(typeof quote)[]>((resolve) => {
      resolveReconciliation = resolve;
    });
    const request = jest.fn(
      ({ method, path }: { method: string; path: string }) => {
        if (method === 'GET' && path === '/quotes') {
          quoteReads += 1;
          return quoteReads === 1 ? Promise.resolve([]) : reconciliationRead;
        }
        if (method === 'GET' && path === '/tiers')
          return Promise.resolve([tier]);
        return Promise.reject(new ErpMarocError('ERP_STATE_CONFLICT', 409));
      },
    );
    renderPage(request, {
      opportunityQuery: createOpportunityQuery({
        records: [opportunity, secondOpportunity],
      }),
    });

    await userEvent.click(
      await screen.findByRole('button', {
        name: 'Créer depuis une opportunité',
      }),
    );
    const firstSource = screen.getByRole('button', { name: /Déploiement CRM/ });
    const otherSource = screen.getByRole('button', { name: /Audit finance/ });
    await userEvent.click(firstSource);
    await userEvent.click(
      screen.getByRole('button', { name: 'Créer le devis' }),
    );

    await waitFor(() => expect(otherSource).toBeDisabled());
    fireEvent.click(otherSource);
    expect(firstSource).toHaveAttribute('aria-pressed', 'true');
    expect(otherSource).toHaveAttribute('aria-pressed', 'false');

    await act(async () => resolveReconciliation([quote]));
    expect(screen.getByLabelText('URL courante')).toHaveTextContent(
      `/erp-maroc/quotes/${QUOTE_ID}`,
    );
  });

  it.each([
    ['new', quote],
    ['existing', { ...quote, number: 'DEV-2026-EXISTANT' }],
  ])(
    'resumes a targeted opportunity exactly once for an %s quote response',
    async (_kind, savedQuote) => {
      const request = jest.fn(
        ({ method, path }: { method: string; path: string }) => {
          if (method === 'GET')
            return Promise.resolve(path === '/quotes' ? [] : [tier]);
          if (path === '/quotes/from-opportunity')
            return Promise.resolve(savedQuote);
          throw new Error('unexpected request');
        },
      );
      const { createMutationIntent } = renderPage(request, {
        initialEntry: `/erp-maroc/quotes?resumeOpportunityId=${OPPORTUNITY_ID}`,
        opportunityQuery: createOpportunityQuery({ records: [] }),
      });

      expect(
        await screen.findByRole('dialog', {
          name: 'Créer depuis une opportunité',
        }),
      ).toBeVisible();
      await waitFor(() =>
        expect(screen.getByLabelText('URL courante')).toHaveTextContent(
          `/erp-maroc/quotes/${QUOTE_ID}`,
        ),
      );
      expect(createMutationIntent).toHaveBeenCalledTimes(1);
      expect(createMutationIntent).toHaveBeenCalledWith(
        {
          method: 'POST',
          path: '/quotes/from-opportunity',
          schema: expect.anything(),
          body: {
            twentyOpportunityId: OPPORTUNITY_ID,
            twentyCompanyId: COMPANY_ID,
            twentyPersonId: PERSON_ID,
            title: 'Déploiement CRM',
            estimatedAmount: 1200,
            currency: 'MAD',
          },
        },
        { idempotency: 'forbidden' },
      );
    },
  );

  it('resolves a resumed opportunity by id outside the picker page', async () => {
    const request = jest.fn(
      ({ method, path }: { method: string; path: string }) => {
        if (method === 'GET')
          return Promise.resolve(path === '/quotes' ? [] : [tier]);
        return Promise.resolve(quote);
      },
    );
    renderPage(request, {
      initialEntry: `/erp-maroc/quotes?resumeOpportunityId=${OPPORTUNITY_ID}`,
      opportunityQuery: createOpportunityQuery({ records: [] }),
    });

    await waitFor(() =>
      expect(jest.mocked(useFindManyRecords)).toHaveBeenCalledWith(
        expect.objectContaining({
          objectNameSingular: 'opportunity',
          filter: { id: { eq: OPPORTUNITY_ID } },
          limit: 1,
          skip: false,
        }),
      ),
    );
  });

  it('shows targeted opportunity loading, error, not-found and retry states', async () => {
    const targeted = createOpportunityQuery({ records: [], loading: true });
    const rendered = renderPage(listResponse([], [tier]), {
      initialEntry: `/erp-maroc/quotes?resumeOpportunityId=${OPPORTUNITY_ID}`,
      opportunityQuery: createOpportunityQuery({ records: [] }),
      targetedOpportunityQuery: targeted,
    });

    expect(
      await screen.findByText('Chargement de l’opportunité ciblée'),
    ).toBeVisible();
    expect(rendered.createMutationIntent).not.toHaveBeenCalled();

    targeted.loading = false;
    targeted.error = new Error('GraphQL');
    rendered.rerenderPage();
    expect(
      await screen.findByText('Impossible de charger l’opportunité ciblée'),
    ).toBeVisible();
    await userEvent.click(
      screen.getByRole('button', { name: 'Réessayer l’opportunité ciblée' }),
    );
    expect(targeted.refetch).toHaveBeenCalledTimes(1);

    targeted.error = undefined;
    rendered.rerenderPage();
    expect(
      await screen.findByText('Opportunité ciblée introuvable'),
    ).toBeVisible();
    expect(rendered.createMutationIntent).not.toHaveBeenCalled();
  });

  it('keeps the resumed picker open when the linked tier is still absent', async () => {
    const { createMutationIntent } = renderPage(listResponse([], []), {
      initialEntry: `/erp-maroc/quotes?resumeOpportunityId=${OPPORTUNITY_ID}`,
    });

    expect(
      await screen.findByText(
        'Le tiers lié est encore absent. Synchronisez-le avant de reprendre ce devis.',
      ),
    ).toBeVisible();
    expect(screen.getByLabelText('URL courante')).toHaveTextContent(
      `/erp-maroc/quotes?resumeOpportunityId=${OPPORTUNITY_ID}`,
    );
    expect(createMutationIntent).not.toHaveBeenCalled();
  });

  it('does not resume without permission', async () => {
    const first = renderPage(listResponse([], [tier]), {
      canManage: false,
      initialEntry: `/erp-maroc/quotes?resumeOpportunityId=${OPPORTUNITY_ID}`,
    });

    await screen.findByText('Aucun devis sur la page chargée');
    expect(first.createMutationIntent).not.toHaveBeenCalled();
    expect(
      screen.queryByRole('dialog', { name: 'Créer depuis une opportunité' }),
    ).not.toBeInTheDocument();
    expect(
      jest
        .mocked(useFindManyRecords)
        .mock.calls.find(([args]) => hasIdFilter(args.filter))?.[0].skip,
    ).toBe(true);
  });

  it('drops an invalid resume id without opening or mutating', async () => {
    const rendered = renderPage(listResponse([], [tier]), {
      initialEntry: '/erp-maroc/quotes?resumeOpportunityId=invalid',
    });

    await screen.findByText('Aucun devis sur la page chargée');
    await waitFor(() =>
      expect(screen.getByLabelText('URL courante')).toHaveTextContent(
        '/erp-maroc/quotes',
      ),
    );
    expect(
      screen.queryByRole('dialog', { name: 'Créer depuis une opportunité' }),
    ).not.toBeInTheDocument();
    expect(rendered.createMutationIntent).not.toHaveBeenCalled();
  });

  it('reconciles an uncertain resumed creation once while freezing its source id', async () => {
    let quoteReads = 0;
    const request = jest.fn(
      ({ method, path }: { method: string; path: string }) => {
        if (method === 'GET' && path === '/quotes') {
          quoteReads += 1;
          return Promise.resolve(quoteReads === 1 ? [] : [quote]);
        }
        if (method === 'GET' && path === '/tiers') {
          return Promise.resolve([tier]);
        }
        return Promise.reject(new ErpMarocError('ERP_STATE_CONFLICT', 409));
      },
    );
    const { createMutationIntent } = renderPage(request, {
      initialEntry: `/erp-maroc/quotes?resumeOpportunityId=${OPPORTUNITY_ID}`,
      opportunityQuery: createOpportunityQuery({
        records: [secondOpportunity],
      }),
    });

    await waitFor(() =>
      expect(screen.getByLabelText('URL courante')).toHaveTextContent(
        `/erp-maroc/quotes/${QUOTE_ID}`,
      ),
    );
    expect(createMutationIntent).toHaveBeenCalledTimes(1);
    expect(createMutationIntent.mock.calls[0][0].body.twentyOpportunityId).toBe(
      OPPORTUNITY_ID,
    );
  });
});
