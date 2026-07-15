import { useErpMarocContext } from '@/erp-maroc/context/useErpMarocContext';
import { ErpMarocError } from '@/erp-maroc/api/erpMarocError';
import { useFindManyRecords } from '@/object-record/hooks/useFindManyRecords';
import { useSnackBar } from '@/ui/feedback/snack-bar-manager/hooks/useSnackBar';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';

import { ErpTiersPage } from '~/pages/erp-maroc/tiers/ErpTiersPage';

jest.mock('@/erp-maroc/context/useErpMarocContext', () => ({
  useErpMarocContext: jest.fn(),
}));
jest.mock('@/object-record/hooks/useFindManyRecords', () => ({
  useFindManyRecords: jest.fn(),
}));
jest.mock('@/ui/feedback/snack-bar-manager/hooks/useSnackBar', () => ({
  useSnackBar: jest.fn(),
}));

Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
  configurable: true,
  value: () => undefined,
});

const SOCIETE_ID = '89c90690-4f4a-4f2e-91ce-3700f16a8ca1';
const TIER_ID = '49b11318-8d30-43ab-bbf4-fb16ce1867ba';
const COMPANY_ID = '263c4b43-2642-4f13-928c-f9d397340d3d';
const OPPORTUNITY_ID = 'c098d723-02ab-4dc0-a49b-ae6f3eff97e9';

const company = {
  __typename: 'Company',
  id: COMPANY_ID,
  createdAt: '2026-07-11T08:00:00Z',
  name: 'Atlas CRM',
  address: {
    addressStreet1: '12 avenue Hassan II',
    addressStreet2: '',
    addressPostcode: '20000',
    addressCity: 'Casablanca',
  },
};

const person = {
  __typename: 'Person',
  id: 'person-1',
  createdAt: '2026-07-11T08:00:00Z',
  companyId: COMPANY_ID,
  name: { firstName: 'Sara', lastName: 'Amrani' },
  emails: { primaryEmail: 'sara@atlas.example' },
  phones: {
    primaryPhoneCallingCode: '+212',
    primaryPhoneNumber: '612345678',
  },
};

const tier = {
  id: TIER_ID,
  societeId: SOCIETE_ID,
  type: 'CLIENT' as const,
  name: 'Atlas ERP',
  email: 'erp@atlas.example',
  phone: '+212500000000',
  ice: '001122334455667',
  identifiantFiscal: 'IF-42',
  address: 'Ancienne adresse',
  city: 'Rabat',
  paymentDelayDays: 30,
  creditLimit: 25000.5,
  twentyCompanyId: COMPANY_ID,
  twentyPersonId: null,
  compteCollectifCode: '3421' as const,
  isActive: true,
  createdAt: '2026-07-11T08:00:00Z',
  updatedAt: '2026-07-11T08:00:00Z',
};

const supplier = {
  ...tier,
  id: 'b330b785-8784-4e59-b45b-37f4bf5f86ef',
  type: 'FOURNISSEUR' as const,
  name: 'Fournisseur Nord',
  compteCollectifCode: '4411' as const,
  twentyCompanyId: null,
  isActive: false,
};

const snackBar = {
  enqueueSuccessSnackBar: jest.fn(),
  enqueueErrorSnackBar: jest.fn(),
};

type RenderPageOptions = {
  companies?: (typeof company)[];
  people?: (typeof person)[];
  linkedPeople?: (typeof person)[];
  companyQuery?: Partial<FindManyState<typeof company>>;
  targetedCompanyQuery?: Partial<FindManyState<typeof company>>;
  peopleQuery?: Partial<FindManyState<typeof person>>;
  linkedPersonQuery?: Partial<FindManyState<typeof person>>;
  initialEntry?: string;
  access?: { manageTiers: boolean };
};

type FindManyState<T> = {
  records: T[];
  loading: boolean;
  error: Error | undefined;
  hasNextPage: boolean;
  fetchMoreRecords: jest.Mock;
  refetch: jest.Mock;
};

const createFindManyState = <T,>(
  records: T[],
  overrides: Partial<FindManyState<T>> = {},
): FindManyState<T> => ({
  records,
  loading: false,
  error: undefined,
  hasNextPage: false,
  fetchMoreRecords: jest.fn().mockResolvedValue(undefined),
  refetch: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

const CurrentUrl = () => {
  const location = useLocation();

  return (
    <>
      <output aria-label="URL courante">{location.search}</output>
      <output aria-label="Route courante">
        {location.pathname}
        {location.search}
      </output>
    </>
  );
};

const renderPage = (
  request: jest.Mock,
  {
    companies = [company],
    people = [person],
    linkedPeople = people,
    companyQuery: companyQueryOverrides,
    targetedCompanyQuery: targetedCompanyQueryOverrides,
    peopleQuery: peopleQueryOverrides,
    linkedPersonQuery: linkedPersonQueryOverrides,
    initialEntry = '/erp-maroc/tiers',
    access = { manageTiers: true },
  }: RenderPageOptions = {},
) => {
  const companyQuery = createFindManyState(companies, companyQueryOverrides);
  const targetedCompanyQuery = createFindManyState(
    companies.filter(({ id }) => id === COMPANY_ID),
    targetedCompanyQueryOverrides,
  );
  const peopleQuery = createFindManyState(people, peopleQueryOverrides);
  const linkedPersonQuery = createFindManyState(
    linkedPeople,
    linkedPersonQueryOverrides,
  );
  const createMutationIntent = jest.fn((input, _options) => ({
    idempotencyKey: 'stable-test-intent',
    execute: () => request(input),
    retry: jest.fn(),
  }));
  jest.mocked(useSnackBar).mockReturnValue(snackBar as never);
  jest
    .mocked(useFindManyRecords)
    .mockImplementation(
      ({
        objectNameSingular,
        filter,
      }: Parameters<typeof useFindManyRecords>[0]) => {
        const hasIdFilter =
          filter !== undefined && 'id' in filter && filter.id !== undefined;

        return (
          objectNameSingular === 'company'
            ? hasIdFilter
              ? targetedCompanyQuery
              : companyQuery
            : hasIdFilter
              ? linkedPersonQuery
              : peopleQuery
        ) as never;
      },
    );
  jest.mocked(useErpMarocContext).mockReturnValue({
    status: 'ready',
    context: {
      societeId: SOCIETE_ID,
      capabilities: {
        get manageTiers() {
          return access.manageTiers;
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
      <ErpTiersPage />
      <CurrentUrl />
    </MemoryRouter>
  );
  const rendered = render(renderTree());

  return {
    ...rendered,
    rerenderPage: () => rendered.rerender(renderTree()),
    access,
    companyQuery,
    targetedCompanyQuery,
    createMutationIntent,
    linkedPersonQuery,
    peopleQuery,
  };
};

const getLastFindManyArgs = (
  objectNameSingular: 'company' | 'person',
  query: 'picker' | 'linked' = 'picker',
) => {
  const matchingCalls = jest
    .mocked(useFindManyRecords)
    .mock.calls.filter(
      ([args]) =>
        args.objectNameSingular === objectNameSingular &&
        (objectNameSingular === 'company'
          ? args.limit !== 1
          : query === 'linked'
            ? args.limit === 1
            : args.limit !== 1),
    );

  return matchingCalls[matchingCalls.length - 1][0];
};

const chooseOption = async (
  user: ReturnType<typeof userEvent.setup>,
  label: string,
  option: string,
) => {
  const select = screen.getByRole('button', {
    name: (accessibleName) => accessibleName.startsWith(label),
  });
  act(() => select.focus());
  await user.keyboard('{Enter}');
  await user.click(screen.getByRole('option', { name: option }));
};

const replaceText = async (
  user: ReturnType<typeof userEvent.setup>,
  label: string | RegExp,
  value: string,
) => {
  const input = screen.getByRole('textbox', { name: label });
  await user.clear(input);
  await user.type(input, value);
};

const replaceNumber = async (
  user: ReturnType<typeof userEvent.setup>,
  label: string,
  value: string,
) => {
  const input = screen.getByLabelText(label);
  await user.clear(input);
  await user.type(input, value);
};

const enterEditedTierValues = async (
  user: ReturnType<typeof userEvent.setup>,
) => {
  await chooseOption(user, 'Type', 'Fournisseur');
  await chooseOption(user, 'Compte collectif', '4411');
  await replaceText(user, /^Nom/, 'Atlas modifié');
  await replaceText(user, 'E-mail', 'modifie@atlas.example');
  await replaceText(user, 'Téléphone', '+212622222222');
  await replaceText(user, 'ICE', '998877665544332');
  await replaceText(user, 'Identifiant fiscal', 'IF-99');
  await replaceText(user, 'Adresse', '99 rue des Fleurs');
  await replaceText(user, 'Ville', 'Marrakech');
  await replaceNumber(user, 'Délai de paiement (jours)', '60');
  await replaceNumber(user, 'Plafond de crédit (MAD)', '40000.25');
  await user.click(screen.getByRole('checkbox', { name: 'Actif' }));
};

describe('ErpTiersPage', () => {
  afterEach(() => jest.clearAllMocks());

  it('loads tiers and keeps both CRM picker queries skipped while the drawer is closed', async () => {
    const request = jest.fn().mockResolvedValue([tier, supplier]);
    const user = userEvent.setup();

    renderPage(request);

    expect(await screen.findByText('Atlas ERP')).toBeVisible();
    expect(screen.getByText('Fournisseur Nord')).toBeVisible();
    expect(screen.getByText('Page chargée')).toBeVisible();
    expect(
      screen.getAllByRole('columnheader').map((header) => header.textContent),
    ).toEqual([
      'Nom',
      'Type',
      'E-mail',
      'Téléphone',
      'ICE',
      'Compte collectif',
      'État',
      'Actions',
    ]);
    expect(getLastFindManyArgs('company')).toEqual({
      objectNameSingular: 'company',
      recordGqlFields: {
        id: true,
        name: true,
        address: {
          addressStreet1: true,
          addressStreet2: true,
          addressPostcode: true,
          addressCity: true,
        },
      },
      filter: undefined,
      limit: 20,
      skip: true,
    });
    expect(getLastFindManyArgs('person')).toEqual({
      objectNameSingular: 'person',
      recordGqlFields: {
        id: true,
        companyId: true,
        name: { firstName: true, lastName: true },
        emails: { primaryEmail: true },
        phones: {
          primaryPhoneCallingCode: true,
          primaryPhoneNumber: true,
        },
      },
      filter: undefined,
      limit: 20,
      skip: true,
    });
    expect(
      screen.getByRole('link', { name: 'Ouvrir Atlas CRM dans Twenty' }),
    ).toHaveAttribute('href', `/object/company/${COMPANY_ID}`);
    expect(screen.getByRole('button', { name: 'Tous types' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: 'Clients' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    expect(screen.getByRole('button', { name: 'Tous états' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    await user.type(
      screen.getByRole('textbox', { name: 'Rechercher des tiers' }),
      'nord',
    );
    expect(screen.queryByText('Atlas ERP')).toBeNull();
    expect(screen.getByText('Fournisseur Nord')).toBeVisible();
    await user.clear(
      screen.getByRole('textbox', { name: 'Rechercher des tiers' }),
    );
    await user.click(screen.getByRole('button', { name: 'Clients' }));
    expect(screen.getByRole('button', { name: 'Tous types' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    expect(screen.getByRole('button', { name: 'Clients' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByText('Atlas ERP')).toBeVisible();
    expect(screen.queryByText('Fournisseur Nord')).toBeNull();
  });

  it('opens only the company query and starts the server-filtered people query after selection', async () => {
    const request = jest.fn().mockResolvedValue([]);
    const user = userEvent.setup();

    renderPage(request);
    await screen.findByText('Aucun tiers sur la page chargée');
    await user.click(
      screen.getByRole('button', { name: 'Synchroniser depuis Twenty' }),
    );

    expect(getLastFindManyArgs('company')).toEqual(
      expect.objectContaining({
        filter: undefined,
        limit: 20,
        skip: false,
      }),
    );
    expect(getLastFindManyArgs('person')).toEqual(
      expect.objectContaining({
        filter: undefined,
        limit: 20,
        skip: true,
      }),
    );

    await chooseOption(user, 'Société Twenty', 'Atlas CRM');

    await waitFor(() =>
      expect(getLastFindManyArgs('person')).toEqual(
        expect.objectContaining({
          filter: { companyId: { eq: COMPANY_ID } },
          limit: 20,
          skip: false,
        }),
      ),
    );
  });

  it('uses RHF company search with the exact name filter and retains the selected company across refreshed results', async () => {
    const request = jest.fn().mockResolvedValue([]);
    const user = userEvent.setup();

    const { companyQuery, rerenderPage } = renderPage(request);
    await screen.findByText('Aucun tiers sur la page chargée');
    await user.click(
      screen.getByRole('button', { name: 'Synchroniser depuis Twenty' }),
    );
    await chooseOption(user, 'Société Twenty', 'Atlas CRM');

    await user.type(
      screen.getByRole('textbox', { name: 'Rechercher une société' }),
      '  Atlas  ',
    );
    expect(getLastFindManyArgs('company')).toEqual(
      expect.objectContaining({
        filter: { name: { ilike: '%Atlas%' } },
        limit: 20,
        skip: false,
      }),
    );

    companyQuery.records = [];
    rerenderPage();

    expect(
      screen.getByRole('button', { name: 'Société Twenty Atlas CRM' }),
    ).toHaveTextContent('Atlas CRM');
    expect(
      screen.getByRole('table', { name: 'Aperçu de synchronisation' }),
    ).toBeVisible();
  });

  it('loads more companies and server-filtered people through the hook commands', async () => {
    const request = jest.fn().mockResolvedValue([]);
    const user = userEvent.setup();

    const { companyQuery, peopleQuery } = renderPage(request, {
      companyQuery: { hasNextPage: true },
      peopleQuery: { hasNextPage: true },
    });
    await screen.findByText('Aucun tiers sur la page chargée');
    await user.click(
      screen.getByRole('button', { name: 'Synchroniser depuis Twenty' }),
    );
    await user.click(
      screen.getByRole('button', { name: 'Charger plus de sociétés' }),
    );
    expect(companyQuery.fetchMoreRecords).toHaveBeenCalledTimes(1);

    await chooseOption(user, 'Société Twenty', 'Atlas CRM');
    await user.click(
      screen.getByRole('button', { name: 'Charger plus de contacts' }),
    );
    expect(peopleQuery.fetchMoreRecords).toHaveBeenCalledTimes(1);
  });

  it('shows retryable company loading, error, and empty states without closing the sync drawer', async () => {
    const request = jest.fn().mockResolvedValue([]);
    const user = userEvent.setup();

    const { companyQuery, rerenderPage } = renderPage(request, {
      companyQuery: { loading: true, records: [] },
    });
    await screen.findByText('Aucun tiers sur la page chargée');
    await user.click(
      screen.getByRole('button', { name: 'Synchroniser depuis Twenty' }),
    );
    expect(screen.getByText('Chargement des sociétés')).toBeVisible();

    companyQuery.loading = false;
    companyQuery.error = new Error('company unavailable');
    rerenderPage();
    expect(
      screen.getByText('Impossible de charger les sociétés'),
    ).toBeVisible();
    expect(
      screen.getByRole('dialog', { name: 'Synchroniser depuis Twenty' }),
    ).toBeVisible();
    await user.click(
      screen.getByRole('button', { name: 'Réessayer les sociétés' }),
    );
    expect(companyQuery.refetch).toHaveBeenCalledTimes(1);

    await user.type(
      screen.getByRole('textbox', { name: 'Rechercher une société' }),
      'Nova',
    );
    expect(getLastFindManyArgs('company')).toEqual(
      expect.objectContaining({ filter: { name: { ilike: '%Nova%' } } }),
    );
    expect(
      screen.getByRole('dialog', { name: 'Synchroniser depuis Twenty' }),
    ).toBeVisible();

    companyQuery.error = undefined;
    rerenderPage();
    expect(screen.getByText('Aucune société trouvée')).toBeVisible();
  });

  it('shows retryable people loading, error, and empty states for the selected company', async () => {
    const request = jest.fn().mockResolvedValue([]);
    const user = userEvent.setup();

    const { peopleQuery, rerenderPage } = renderPage(request, {
      peopleQuery: { loading: true, records: [] },
    });
    await screen.findByText('Aucun tiers sur la page chargée');
    await user.click(
      screen.getByRole('button', { name: 'Synchroniser depuis Twenty' }),
    );
    await chooseOption(user, 'Société Twenty', 'Atlas CRM');
    expect(screen.getByText('Chargement des contacts')).toBeVisible();

    peopleQuery.loading = false;
    peopleQuery.error = new Error('people unavailable');
    rerenderPage();
    expect(
      screen.getByText('Impossible de charger les contacts'),
    ).toBeVisible();
    expect(
      screen.getByRole('button', { name: 'Société Twenty Atlas CRM' }),
    ).toHaveTextContent('Atlas CRM');
    await user.click(
      screen.getByRole('button', { name: 'Réessayer les contacts' }),
    );
    expect(peopleQuery.refetch).toHaveBeenCalledTimes(1);

    peopleQuery.error = undefined;
    rerenderPage();
    expect(screen.getByText('Aucun contact trouvé')).toBeVisible();
    expect(
      screen.getByRole('dialog', { name: 'Synchroniser depuis Twenty' }),
    ).toBeVisible();
  });

  it('retries an initial list failure without entering mutation reconciliation', async () => {
    const request = jest
      .fn()
      .mockRejectedValueOnce(new Error('list unavailable'))
      .mockResolvedValueOnce([tier]);
    const user = userEvent.setup();

    renderPage(request);

    expect(
      await screen.findByText('Impossible de charger les tiers'),
    ).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Réessayer' }));

    expect(await screen.findByText('Atlas ERP')).toBeVisible();
    expect(
      screen.queryByRole('button', {
        name: 'J’ai vérifié, autoriser un nouvel essai',
      }),
    ).toBeNull();
    expect(screen.getByRole('button', { name: 'Nouveau tiers' })).toBeEnabled();
    expect(request).toHaveBeenCalledTimes(2);
  });

  it('keeps tiers readable while tier mutation controls and forged drawer opens are blocked', async () => {
    const request = jest.fn().mockResolvedValue([tier]);
    const user = userEvent.setup();
    const access = { manageTiers: true };

    const { rerenderPage } = renderPage(request, { access });
    expect(await screen.findByText('Atlas ERP')).toBeVisible();
    const staleOpener = screen.getByRole('button', { name: 'Nouveau tiers' });

    access.manageTiers = false;
    await user.click(staleOpener);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    rerenderPage();
    expect(screen.getByText('Atlas ERP')).toBeVisible();
    expect(
      screen.getByRole('link', { name: /Ouvrir Atlas CRM/ }),
    ).toBeVisible();
    expect(
      screen.queryByRole('button', { name: 'Nouveau tiers' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Synchroniser depuis Twenty' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Modifier Atlas ERP' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Synchroniser Atlas ERP' }),
    ).not.toBeInTheDocument();
  });

  it('blocks forged tier form and sync submits after permission is revoked', async () => {
    const request = jest.fn().mockResolvedValue([tier]);
    const user = userEvent.setup();
    const access = { manageTiers: true };

    const { createMutationIntent } = renderPage(request, { access });
    expect(await screen.findByText('Atlas ERP')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Nouveau tiers' }));
    await user.type(screen.getByRole('textbox', { name: /^Nom/ }), 'Bloqué');
    const save = screen.getByRole('button', { name: 'Enregistrer' });

    access.manageTiers = false;
    fireEvent.submit(save.closest('form') as HTMLFormElement);
    await waitFor(() => expect(request).toHaveBeenCalledTimes(1));
    expect(createMutationIntent).not.toHaveBeenCalled();

    access.manageTiers = true;
    await user.click(screen.getByRole('button', { name: 'Annuler' }));
    await user.click(
      screen.getByRole('button', { name: 'Synchroniser Atlas ERP' }),
    );
    await user.click(
      screen.getByRole('checkbox', {
        name: 'Je confirme les valeurs modifiées',
      }),
    );
    const sync = screen.getByRole('button', { name: 'Synchroniser' });

    access.manageTiers = false;
    fireEvent.submit(sync.closest('form') as HTMLFormElement);
    await waitFor(() => expect(request).toHaveBeenCalledTimes(1));
    expect(createMutationIntent).not.toHaveBeenCalled();
  });

  it('canonicalizes the initial tiers URL before applying filters', async () => {
    const request = jest.fn().mockResolvedValue([tier, supplier]);

    renderPage(request, {
      initialEntry:
        '/erp-maroc/tiers?unknown=1&type=invalid&active=nope&search=%20Atlas%20ERP%20',
    });

    expect(await screen.findByText('Atlas ERP')).toBeVisible();
    expect(screen.queryByText('Fournisseur Nord')).toBeNull();
    await waitFor(() =>
      expect(
        screen.getByRole('status', { name: 'URL courante' }),
      ).toHaveTextContent('?search=Atlas+ERP'),
    );
  });

  it('removes default tiers filters and unknown parameters from the initial URL', async () => {
    const request = jest.fn().mockResolvedValue([tier, supplier]);

    renderPage(request, {
      initialEntry: '/erp-maroc/tiers?type=all&active=all&unknown=1',
    });

    expect(await screen.findByText('Atlas ERP')).toBeVisible();
    expect(screen.getByText('Fournisseur Nord')).toBeVisible();
    await waitFor(() =>
      expect(
        screen.getByRole('status', { name: 'URL courante' }),
      ).toBeEmptyDOMElement(),
    );
  });

  it('opens a targeted company sync from a deep link and resumes the opportunity after success', async () => {
    const synced = { ...tier, twentyPersonId: null };
    const request = jest
      .fn()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(synced);
    const user = userEvent.setup();

    const { createMutationIntent } = renderPage(request, {
      companies: [],
      people: [],
      targetedCompanyQuery: { records: [company] },
      initialEntry: `/erp-maroc/tiers?syncCompanyId=${COMPANY_ID}&resumeOpportunityId=${OPPORTUNITY_ID}`,
    });

    expect(
      await screen.findByRole('dialog', {
        name: 'Synchroniser depuis Twenty',
      }),
    ).toBeVisible();
    expect(jest.mocked(useFindManyRecords)).toHaveBeenCalledWith(
      expect.objectContaining({
        objectNameSingular: 'company',
        filter: { id: { eq: COMPANY_ID } },
        limit: 1,
        skip: false,
      }),
    );
    expect(screen.getAllByText('Atlas CRM').length).toBeGreaterThan(0);

    await user.click(
      screen.getByRole('checkbox', {
        name: 'Je confirme les valeurs modifiées',
      }),
    );
    const submit = screen.getByRole('button', { name: 'Synchroniser' });
    expect(submit).toBeEnabled();
    await user.click(submit);

    await waitFor(() => expect(createMutationIntent).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(screen.getByLabelText('Route courante')).toHaveTextContent(
        `/erp-maroc/quotes?resumeOpportunityId=${OPPORTUNITY_ID}`,
      ),
    );
  });

  it('shows targeted company loading, error and retry states without posting', async () => {
    const request = jest.fn().mockResolvedValue([]);
    const targeted = createFindManyState<typeof company>([], {
      loading: true,
    });
    const rendered = renderPage(request, {
      companies: [],
      targetedCompanyQuery: targeted,
      initialEntry: `/erp-maroc/tiers?syncCompanyId=${COMPANY_ID}&resumeOpportunityId=${OPPORTUNITY_ID}`,
    });

    expect(
      await screen.findByText('Chargement de la société ciblée'),
    ).toBeVisible();
    expect(screen.getByRole('button', { name: 'Synchroniser' })).toBeDisabled();

    rendered.targetedCompanyQuery.loading = false;
    rendered.targetedCompanyQuery.error = new Error('GraphQL');
    rendered.rerenderPage();
    expect(
      await screen.findByText('Impossible de charger la société ciblée'),
    ).toBeVisible();
    await userEvent.click(
      screen.getByRole('button', { name: 'Réessayer la société ciblée' }),
    );
    expect(rendered.targetedCompanyQuery.refetch).toHaveBeenCalledTimes(1);
    expect(rendered.createMutationIntent).not.toHaveBeenCalled();

    rendered.targetedCompanyQuery.error = undefined;
    rendered.rerenderPage();
    expect(await screen.findByText('Société ciblée introuvable')).toBeVisible();
  });

  it('does not open or query a deep-linked sync without permission', async () => {
    const request = jest.fn().mockResolvedValue([]);
    const { rerenderPage } = renderPage(request, {
      access: { manageTiers: false },
      companies: [],
      initialEntry: `/erp-maroc/tiers?syncCompanyId=${COMPANY_ID}&resumeOpportunityId=${OPPORTUNITY_ID}`,
    });

    await screen.findByText('Aucun tiers sur la page chargée');
    expect(
      screen.queryByRole('dialog', { name: 'Synchroniser depuis Twenty' }),
    ).not.toBeInTheDocument();
    expect(
      jest
        .mocked(useFindManyRecords)
        .mock.calls.find(
          ([args]) => args.objectNameSingular === 'company' && args.limit === 1,
        )?.[0].skip,
    ).toBe(true);

    rerenderPage();
    expect(
      screen.queryByRole('dialog', { name: 'Synchroniser depuis Twenty' }),
    ).not.toBeInTheDocument();
  });

  it('drops invalid deep-link ids without opening or mutating', async () => {
    const request = jest.fn().mockResolvedValue([]);
    const { createMutationIntent } = renderPage(request, {
      companies: [],
      initialEntry:
        '/erp-maroc/tiers?syncCompanyId=invalid&resumeOpportunityId=invalid',
    });

    await screen.findByText('Aucun tiers sur la page chargée');
    await waitFor(() =>
      expect(screen.getByLabelText('URL courante')).toBeEmptyDOMElement(),
    );
    expect(
      screen.queryByRole('dialog', { name: 'Synchroniser depuis Twenty' }),
    ).not.toBeInTheDocument();
    expect(createMutationIntent).not.toHaveBeenCalled();
  });

  it('renders the router-compatible company record path for a valid linked UUID', async () => {
    const request = jest.fn().mockResolvedValue([tier]);

    renderPage(request, { companies: [], people: [] });

    expect(await screen.findByText('Atlas ERP')).toBeVisible();
    expect(
      screen.getByRole('link', {
        name: 'Ouvrir la société Twenty liée dans Twenty',
      }),
    ).toHaveAttribute('href', `/object/company/${COMPANY_ID}`);
  });

  it('does not render a company record link for an invalid linked id', async () => {
    const request = jest
      .fn()
      .mockResolvedValue([{ ...tier, twentyCompanyId: 'not-a-uuid' }]);

    renderPage(request, { companies: [], people: [] });

    expect(await screen.findByText('Atlas ERP')).toBeVisible();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('uses a keyboard-operable named Twenty select adapter', async () => {
    const request = jest.fn().mockResolvedValue([]);
    const user = userEvent.setup();

    renderPage(request);
    await screen.findByText('Aucun tiers sur la page chargée');
    await user.click(screen.getByRole('button', { name: 'Nouveau tiers' }));

    const typeSelect = screen.getByRole('button', { name: 'Type Client' });
    act(() => typeSelect.focus());
    expect(typeSelect).toHaveFocus();
    expect(typeSelect).toHaveAttribute('aria-haspopup', 'true');
    expect(typeSelect).toHaveAttribute('aria-expanded', 'false');
    await user.keyboard('{Enter}');
    expect(typeSelect).toHaveAttribute('aria-expanded', 'true');
    expect(
      screen.getAllByRole('option').map((option) => option.textContent),
    ).toEqual(['Client', 'Fournisseur', 'Mixte']);
    await user.click(screen.getByRole('option', { name: 'Fournisseur' }));
    expect(typeSelect).toHaveAccessibleName('Type Fournisseur');
    expect(screen.queryByRole('option')).toBeNull();
    act(() => typeSelect.focus());
    await user.keyboard(' ');
    expect(screen.getAllByRole('option')).toHaveLength(3);
  });

  it('consumes the shared drawer focus and Escape behavior', async () => {
    const request = jest.fn().mockResolvedValue([]);
    const user = userEvent.setup();

    renderPage(request);
    await screen.findByText('Aucun tiers sur la page chargée');
    const opener = screen.getByRole('button', { name: 'Nouveau tiers' });
    await user.click(opener);

    expect(screen.getByRole('dialog', { name: 'Nouveau tiers' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Type Client' })).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: 'Nouveau tiers' })).toBeNull();
    expect(opener).toHaveFocus();
  });

  it('keeps the shared drawer busy and uncloseable while a mutation is pending', async () => {
    let resolveMutation!: (value: typeof tier) => void;
    const request = jest
      .fn()
      .mockResolvedValueOnce([])
      .mockImplementationOnce(
        () =>
          new Promise<typeof tier>((resolve) => {
            resolveMutation = resolve;
          }),
      );
    const user = userEvent.setup();

    renderPage(request);
    await screen.findByText('Aucun tiers sur la page chargée');
    await user.click(screen.getByRole('button', { name: 'Nouveau tiers' }));
    await user.type(screen.getByRole('textbox', { name: /^Nom/ }), 'Atlas');
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

    const dialog = screen.getByRole('dialog', { name: 'Nouveau tiers' });
    expect(dialog).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('button', { name: 'Fermer' })).toBeDisabled();
    await user.keyboard('{Escape}');
    expect(dialog).toBeVisible();

    resolveMutation(tier);
    await waitFor(() =>
      expect(
        screen.queryByRole('dialog', { name: 'Nouveau tiers' }),
      ).toBeNull(),
    );
  });

  it('blocks a missing company and allows a missing person in the exact sync preview', async () => {
    const request = jest
      .fn()
      .mockResolvedValue([{ ...tier, twentyCompanyId: null }]);
    const user = userEvent.setup();

    renderPage(request);
    await screen.findByText('Atlas ERP');
    await user.click(
      screen.getByRole('button', { name: 'Synchroniser depuis Twenty' }),
    );

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Sélectionnez une société Twenty',
    );
    expect(screen.getByRole('button', { name: 'Synchroniser' })).toBeDisabled();

    await chooseOption(user, 'Société Twenty', 'Atlas CRM');

    expect(
      screen.getByRole('button', { name: 'Contact Twenty Aucun contact' }),
    ).toHaveTextContent('Aucun contact');
    const preview = screen.getByRole('table', {
      name: 'Aperçu de synchronisation',
    });
    const previewRegion = screen.getByRole('region', {
      name: 'Aperçu de synchronisation',
    });
    expect(previewRegion).toHaveAttribute('tabindex', '0');
    expect(previewRegion).toContainElement(preview);
    expect(
      within(preview)
        .getAllByRole('columnheader')
        .map((cell) => cell.textContent),
    ).toEqual(['Champ', 'CRM', 'ERP actuel', 'Valeur envoyée']);
    expect(
      within(preview).getByRole('button', {
        name: 'Source pour Nom Twenty',
      }),
    ).toHaveTextContent('Twenty');
    expect(
      within(preview).getByRole('button', {
        name: 'Source pour ICE ERP actuel',
      }),
    ).toHaveTextContent('ERP actuel');
    const iceRow = within(preview).getByRole('row', { name: /^ICE/ });
    expect(iceRow).toHaveTextContent('—');
    expect(iceRow).not.toHaveTextContent('001122334455667');
    for (const [label, value] of [
      ['Type', 'CLIENT'],
      ['Compte collectif', '3421'],
      ['Délai de paiement', '0'],
      ['Plafond de crédit', '0'],
    ]) {
      expect(
        within(preview).getByLabelText(`Valeur envoyée pour ${label}`),
      ).toHaveTextContent(value);
    }

    await chooseOption(user, 'Source pour Type', 'Valeur manuelle');
    await chooseOption(user, 'Valeur manuelle pour Type', 'Fournisseur');
    expect(
      within(preview).getByLabelText('Valeur envoyée pour Type'),
    ).toHaveTextContent('FOURNISSEUR');
  });

  it('invalidates overwrite confirmation when selected CRM data changes after a refetch', async () => {
    const request = jest
      .fn()
      .mockResolvedValue([{ ...tier, twentyCompanyId: null }]);
    const user = userEvent.setup();

    const { companyQuery, rerenderPage } = renderPage(request);
    await screen.findByText('Atlas ERP');
    await user.click(
      screen.getByRole('button', { name: 'Synchroniser depuis Twenty' }),
    );
    await chooseOption(user, 'Société Twenty', 'Atlas CRM');

    const confirmation = screen.getByRole('checkbox', {
      name: 'Je confirme les valeurs modifiées',
    });
    await user.click(confirmation);
    expect(confirmation).toBeChecked();

    companyQuery.records = [{ ...company, name: 'Atlas CRM actualisée' }];
    rerenderPage();

    await waitFor(() => expect(confirmation).not.toBeChecked());
  });

  it.each([
    [409, 'Conflit ERP'],
    [429, 'Limitation ERP'],
  ])(
    'reconciles a %i response and blocks a blind second tier mutation',
    async (statusCode, expectedMessage) => {
      const request = jest
        .fn()
        .mockResolvedValueOnce([])
        .mockRejectedValueOnce(new ErpMarocError('ERP_UNKNOWN', statusCode))
        .mockResolvedValueOnce([]);
      const user = userEvent.setup();

      const { createMutationIntent } = renderPage(request);
      await screen.findByText('Aucun tiers sur la page chargée');
      await user.click(screen.getByRole('button', { name: 'Nouveau tiers' }));
      await user.type(screen.getByRole('textbox', { name: /^Nom/ }), 'Atlas');
      await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

      expect(await screen.findByRole('alert')).toHaveTextContent(
        expectedMessage,
      );
      await waitFor(() => expect(request).toHaveBeenCalledTimes(3));
      const save = screen.getByRole('button', { name: 'Enregistrer' });
      expect(save).toBeDisabled();
      fireEvent.submit(save.closest('form') as HTMLFormElement);
      expect(createMutationIntent).toHaveBeenCalledTimes(1);
      expect(request.mock.calls.map(([input]) => input.method)).toEqual([
        'GET',
        'POST',
        'GET',
      ]);
    },
  );

  it('uses the loaded linked tier when page-level sync updates an existing company', async () => {
    const linkedSupplier = {
      ...supplier,
      twentyCompanyId: COMPANY_ID,
      email: 'supplier@atlas.example',
      phone: '+212511111111',
      ice: '009988776655443',
      identifiantFiscal: 'IF-SUPPLIER',
      address: 'Adresse fournisseur',
      city: 'Tanger',
      paymentDelayDays: 60,
      creditLimit: 40000.25,
    };
    const synced = {
      ...linkedSupplier,
      name: 'Atlas CRM',
      address: '12 avenue Hassan II, 20000',
      city: 'Casablanca',
    };
    const request = jest
      .fn()
      .mockResolvedValueOnce([linkedSupplier])
      .mockResolvedValueOnce(synced);
    const user = userEvent.setup();

    renderPage(request);
    await screen.findByText('Fournisseur Nord');
    await user.click(
      screen.getByRole('button', { name: 'Synchroniser depuis Twenty' }),
    );
    await chooseOption(user, 'Société Twenty', 'Atlas CRM');

    const preview = screen.getByRole('table', {
      name: 'Aperçu de synchronisation',
    });
    for (const [label, value] of [
      ['E-mail', 'supplier@atlas.example'],
      ['Téléphone', '+212511111111'],
      ['ICE', '009988776655443'],
      ['Identifiant fiscal', 'IF-SUPPLIER'],
      ['Type', 'FOURNISSEUR'],
      ['Compte collectif', '4411'],
      ['Délai de paiement', '60'],
      ['Plafond de crédit', '40000.25'],
    ]) {
      expect(
        within(preview).getByRole('row', { name: new RegExp(`^${label}`) }),
      ).toHaveTextContent(value);
    }

    await user.click(
      screen.getByRole('checkbox', {
        name: 'Je confirme les valeurs modifiées',
      }),
    );
    await user.click(screen.getByRole('button', { name: 'Synchroniser' }));

    await waitFor(() => expect(request).toHaveBeenCalledTimes(2));
    expect(request.mock.calls[1][0].body).toEqual({
      societeId: SOCIETE_ID,
      twentyCompanyId: COMPANY_ID,
      twentyPersonId: null,
      name: 'Atlas CRM',
      address: '12 avenue Hassan II, 20000',
      city: 'Casablanca',
      email: 'supplier@atlas.example',
      phone: '+212511111111',
      ice: '009988776655443',
      identifiantFiscal: 'IF-SUPPLIER',
      type: 'FOURNISSEUR',
      compteCollectifCode: '4411',
      paymentDelayDays: 60,
      creditLimit: 40000.25,
      isActive: false,
    });
    await waitFor(() =>
      expect(screen.queryByText('Fournisseur Nord')).not.toBeInTheDocument(),
    );
    expect(
      within(screen.getByRole('table', { name: 'Tiers' })).getAllByRole('row'),
    ).toHaveLength(2);
    expect(screen.getByText('Atlas CRM')).toBeVisible();
  });

  it('creates a new tier after a row-level sync switches to an unlinked company', async () => {
    const selectedCompany = {
      ...company,
      id: 'company-2',
      name: 'Nova CRM',
      address: {
        addressStreet1: '8 boulevard Zerktouni',
        addressStreet2: '',
        addressPostcode: '20250',
        addressCity: 'Casablanca',
      },
    };
    const synced = {
      ...tier,
      id: 'd57e23ef-b966-4469-aae6-7eeed54bd075',
      name: 'Nova CRM',
      email: null,
      phone: null,
      ice: null,
      identifiantFiscal: null,
      address: '8 boulevard Zerktouni, 20250',
      city: 'Casablanca',
      paymentDelayDays: 0,
      creditLimit: 0,
      twentyCompanyId: selectedCompany.id,
    };
    const request = jest
      .fn()
      .mockResolvedValueOnce([tier])
      .mockResolvedValueOnce(synced);
    const user = userEvent.setup();

    renderPage(request, { companies: [company, selectedCompany], people: [] });
    await screen.findByText('Atlas ERP');
    await user.click(
      screen.getByRole('button', { name: 'Synchroniser Atlas ERP' }),
    );
    await chooseOption(user, 'Société Twenty', 'Nova CRM');

    const preview = screen.getByRole('table', {
      name: 'Aperçu de synchronisation',
    });
    for (const [label, oldValue] of [
      ['E-mail', 'erp@atlas.example'],
      ['Téléphone', '+212500000000'],
      ['ICE', '001122334455667'],
      ['Identifiant fiscal', 'IF-42'],
      ['Délai de paiement', '30'],
      ['Plafond de crédit', '25000.5'],
    ]) {
      expect(
        within(preview).getByRole('row', { name: new RegExp(`^${label}`) }),
      ).not.toHaveTextContent(oldValue);
    }

    await user.click(
      screen.getByRole('checkbox', {
        name: 'Je confirme les valeurs modifiées',
      }),
    );
    await user.click(screen.getByRole('button', { name: 'Synchroniser' }));

    await waitFor(() => expect(request).toHaveBeenCalledTimes(2));
    expect(request.mock.calls[1][0].body).toEqual(
      expect.objectContaining({
        twentyCompanyId: selectedCompany.id,
        email: null,
        phone: null,
        ice: null,
        identifiantFiscal: null,
        type: 'CLIENT',
        compteCollectifCode: '3421',
        paymentDelayDays: 0,
        creditLimit: 0,
        isActive: true,
      }),
    );
    await waitFor(() => expect(screen.getByText('Nova CRM')).toBeVisible());
    expect(screen.getByText('Atlas ERP')).toBeVisible();
    expect(
      within(screen.getByRole('table', { name: 'Tiers' })).getAllByRole('row'),
    ).toHaveLength(3);
  });

  it.each([
    ['the linked tier id', TIER_ID],
    ['a new response id', '01243231-a9a7-424c-bd6a-f37e4bc7857d'],
  ])(
    'prefers the selected company linked tier and reconciles %s without loss or duplicates',
    async (_case, savedId) => {
      const synced = {
        ...tier,
        id: savedId,
        name: 'Atlas synchronisé',
        address: '12 avenue Hassan II, 20000',
        city: 'Casablanca',
      };
      const request = jest
        .fn()
        .mockResolvedValueOnce([supplier, tier])
        .mockResolvedValueOnce(synced);
      const user = userEvent.setup();

      renderPage(request, { people: [] });
      await screen.findByText('Fournisseur Nord');
      await user.click(
        screen.getByRole('button', { name: 'Synchroniser Fournisseur Nord' }),
      );
      await chooseOption(user, 'Société Twenty', 'Atlas CRM');

      const preview = screen.getByRole('table', {
        name: 'Aperçu de synchronisation',
      });
      expect(
        within(preview).getByRole('row', { name: /^E-mail/ }),
      ).toHaveTextContent('erp@atlas.example');
      expect(
        within(preview).getByRole('row', { name: /^Type/ }),
      ).toHaveTextContent('CLIENT');

      await user.click(
        screen.getByRole('checkbox', {
          name: 'Je confirme les valeurs modifiées',
        }),
      );
      await user.click(screen.getByRole('button', { name: 'Synchroniser' }));

      await waitFor(() =>
        expect(screen.getByText('Atlas synchronisé')).toBeVisible(),
      );
      expect(request.mock.calls[1][0].body).toEqual(
        expect.objectContaining({
          twentyCompanyId: COMPANY_ID,
          email: 'erp@atlas.example',
          type: 'CLIENT',
          isActive: true,
        }),
      );
      expect(screen.getByText('Fournisseur Nord')).toBeVisible();
      expect(screen.queryByText('Atlas ERP')).not.toBeInTheDocument();
      expect(screen.getAllByText('Atlas synchronisé')).toHaveLength(1);
      expect(
        within(screen.getByRole('table', { name: 'Tiers' })).getAllByRole(
          'row',
        ),
      ).toHaveLength(3);
    },
  );

  it.each([
    ['the drawer tier id', supplier.id, false],
    ['a new response id', 'bd060b94-c17c-4213-b4ed-132671b99346', true],
  ])(
    'falls back to the explicit unlinked drawer tier and reconciles %s authoritatively',
    async (_case, savedId, preservesUnlinkedSource) => {
      const synced = {
        ...supplier,
        id: savedId,
        name: 'Atlas nouvellement lié',
        twentyCompanyId: COMPANY_ID,
      };
      const request = jest
        .fn()
        .mockResolvedValueOnce([supplier])
        .mockResolvedValueOnce(synced);
      const user = userEvent.setup();

      renderPage(request, { people: [] });
      await screen.findByText('Fournisseur Nord');
      await user.click(
        screen.getByRole('button', { name: 'Synchroniser Fournisseur Nord' }),
      );
      await chooseOption(user, 'Société Twenty', 'Atlas CRM');

      const preview = screen.getByRole('table', {
        name: 'Aperçu de synchronisation',
      });
      expect(
        within(preview).getByRole('row', { name: /^Type/ }),
      ).toHaveTextContent('FOURNISSEUR');
      await user.click(
        screen.getByRole('checkbox', {
          name: 'Je confirme les valeurs modifiées',
        }),
      );
      await user.click(screen.getByRole('button', { name: 'Synchroniser' }));

      expect(await screen.findByText('Atlas nouvellement lié')).toBeVisible();
      expect(request.mock.calls[1][0].body).toEqual(
        expect.objectContaining({
          twentyCompanyId: COMPANY_ID,
          type: 'FOURNISSEUR',
          isActive: false,
        }),
      );
      if (preservesUnlinkedSource) {
        expect(screen.getByText('Fournisseur Nord')).toBeVisible();
      } else {
        expect(screen.queryByText('Fournisseur Nord')).not.toBeInTheDocument();
      }
      expect(screen.getAllByText('Atlas nouvellement lié')).toHaveLength(1);
      expect(
        within(screen.getByRole('table', { name: 'Tiers' })).getAllByRole(
          'row',
        ),
      ).toHaveLength(preservesUnlinkedSource ? 3 : 2);
    },
  );

  it('requires overwrite confirmation and sends only confirmed sync values', async () => {
    const synced = {
      ...tier,
      name: 'Atlas CRM',
      address: '12 avenue Hassan II, 20000',
      city: 'Casablanca',
    };
    const request = jest
      .fn()
      .mockResolvedValueOnce([tier])
      .mockResolvedValueOnce(synced);
    const user = userEvent.setup();

    const { createMutationIntent } = renderPage(request);
    await screen.findByText('Atlas ERP');
    await user.click(
      screen.getByRole('button', { name: 'Synchroniser Atlas ERP' }),
    );

    expect(screen.getByRole('button', { name: 'Synchroniser' })).toBeDisabled();
    await user.click(
      screen.getByRole('checkbox', {
        name: 'Je confirme les valeurs modifiées',
      }),
    );
    await user.click(screen.getByRole('button', { name: 'Synchroniser' }));

    await waitFor(() => expect(request).toHaveBeenCalledTimes(2));
    expect(createMutationIntent).toHaveBeenCalledTimes(1);
    expect(createMutationIntent).toHaveBeenCalledWith(expect.anything(), {
      idempotency: 'forbidden',
    });
    expect(request.mock.calls[1][0]).toEqual({
      method: 'POST',
      path: '/tiers/sync-from-twenty-company',
      schema: expect.anything(),
      body: {
        societeId: SOCIETE_ID,
        twentyCompanyId: COMPANY_ID,
        twentyPersonId: null,
        name: 'Atlas CRM',
        address: '12 avenue Hassan II, 20000',
        city: 'Casablanca',
        email: 'erp@atlas.example',
        phone: '+212500000000',
        ice: '001122334455667',
        identifiantFiscal: 'IF-42',
        type: 'CLIENT',
        compteCollectifCode: '3421',
        paymentDelayDays: 30,
        creditLimit: 25000.5,
        isActive: true,
      },
    });
    expect(request.mock.calls[1][0].body).not.toHaveProperty('preview');
    expect(request.mock.calls[1][0].body).not.toHaveProperty('selectedSources');
  });

  it('allows a manual final value for every mapped sync field, including a blank company name', async () => {
    const blankCompany = { ...company, name: '   ' };
    const synced = {
      ...tier,
      name: 'Atlas manuel',
      twentyPersonId: null,
    };
    const request = jest
      .fn()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(synced);
    const user = userEvent.setup();

    renderPage(request, { companies: [blankCompany], people: [] });
    await screen.findByText('Aucun tiers sur la page chargée');
    await user.click(
      screen.getByRole('button', { name: 'Synchroniser depuis Twenty' }),
    );
    await chooseOption(user, 'Société Twenty', 'Société sans nom');

    for (const label of [
      'Nom',
      'Adresse',
      'Ville',
      'E-mail',
      'Téléphone',
      'ICE',
      'Identifiant fiscal',
      'Type',
      'Compte collectif',
      'Délai de paiement',
      'Plafond de crédit',
    ]) {
      await chooseOption(user, `Source pour ${label}`, 'Valeur manuelle');
    }

    await replaceText(user, 'Valeur manuelle pour Nom', 'Atlas manuel');
    await replaceText(
      user,
      'Valeur manuelle pour Adresse',
      '24 boulevard Zerktouni',
    );
    await replaceText(user, 'Valeur manuelle pour Ville', 'Casablanca');
    await replaceText(
      user,
      'Valeur manuelle pour E-mail',
      'manuel@atlas.example',
    );
    await replaceText(user, 'Valeur manuelle pour Téléphone', '+212611111111');
    await replaceText(user, 'Valeur manuelle pour ICE', '009988776655443');
    await replaceText(
      user,
      'Valeur manuelle pour Identifiant fiscal',
      'IF-MANUEL',
    );
    await chooseOption(user, 'Valeur manuelle pour Type', 'Mixte');
    await chooseOption(user, 'Valeur manuelle pour Compte collectif', '4411');
    await replaceText(user, 'Valeur manuelle pour Délai de paiement', '45');
    await replaceText(user, 'Valeur manuelle pour Plafond de crédit', '0.29');
    await user.click(
      screen.getByRole('checkbox', {
        name: 'Je confirme les valeurs modifiées',
      }),
    );
    await user.click(screen.getByRole('button', { name: 'Synchroniser' }));

    await waitFor(() => expect(request).toHaveBeenCalledTimes(2));
    expect(request.mock.calls[1][0]).toEqual({
      method: 'POST',
      path: '/tiers/sync-from-twenty-company',
      schema: expect.anything(),
      body: {
        societeId: SOCIETE_ID,
        twentyCompanyId: COMPANY_ID,
        twentyPersonId: null,
        name: 'Atlas manuel',
        address: '24 boulevard Zerktouni',
        city: 'Casablanca',
        email: 'manuel@atlas.example',
        phone: '+212611111111',
        ice: '009988776655443',
        identifiantFiscal: 'IF-MANUEL',
        type: 'MIXTE',
        compteCollectifCode: '4411',
        paymentDelayDays: 45,
        creditLimit: 0.29,
        isActive: true,
      },
    });
  });

  it('requires reconfirmation after changing any selected sync source', async () => {
    const request = jest.fn().mockResolvedValue([tier]);
    const user = userEvent.setup();

    renderPage(request);
    await screen.findByText('Atlas ERP');
    await user.click(
      screen.getByRole('button', { name: 'Synchroniser Atlas ERP' }),
    );
    const confirmation = screen.getByRole('checkbox', {
      name: 'Je confirme les valeurs modifiées',
    });
    await user.click(confirmation);
    expect(confirmation).toBeChecked();

    await chooseOption(user, 'Source pour Nom', 'ERP actuel');

    expect(confirmation).not.toBeChecked();
    expect(screen.getByRole('button', { name: 'Synchroniser' })).toBeDisabled();
  });

  it('requires reconfirmation after changing a manual sync value', async () => {
    const request = jest.fn().mockResolvedValue([tier]);
    const user = userEvent.setup();

    renderPage(request);
    await screen.findByText('Atlas ERP');
    await user.click(
      screen.getByRole('button', { name: 'Synchroniser Atlas ERP' }),
    );
    await chooseOption(user, 'Source pour Nom', 'Valeur manuelle');
    const manualName = screen.getByRole('textbox', {
      name: 'Valeur manuelle pour Nom',
    });
    const confirmation = screen.getByRole('checkbox', {
      name: 'Je confirme les valeurs modifiées',
    });
    await user.click(confirmation);
    expect(confirmation).toBeChecked();

    await user.type(manualName, ' modifié');

    expect(confirmation).not.toBeChecked();
    expect(screen.getByRole('button', { name: 'Synchroniser' })).toBeDisabled();
  });

  it('resets manual sync values and confirmation when the drawer reopens', async () => {
    const request = jest.fn().mockResolvedValue([tier]);
    const user = userEvent.setup();

    renderPage(request);
    await screen.findByText('Atlas ERP');
    await user.click(
      screen.getByRole('button', { name: 'Synchroniser Atlas ERP' }),
    );
    await chooseOption(user, 'Source pour Nom', 'Valeur manuelle');
    await replaceText(user, 'Valeur manuelle pour Nom', 'Atlas temporaire');
    await user.click(
      screen.getByRole('checkbox', {
        name: 'Je confirme les valeurs modifiées',
      }),
    );
    await user.click(screen.getByRole('button', { name: 'Annuler' }));

    await user.click(
      screen.getByRole('button', { name: 'Synchroniser Atlas ERP' }),
    );

    expect(
      screen.queryByRole('textbox', { name: 'Valeur manuelle pour Nom' }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('checkbox', {
        name: 'Je confirme les valeurs modifiées',
      }),
    ).not.toBeChecked();
    expect(screen.getByRole('button', { name: 'Synchroniser' })).toBeDisabled();
  });

  it('resolves a linked person outside the current page and preserves it in sync', async () => {
    const linkedTier = { ...tier, twentyPersonId: person.id };
    const synced = { ...linkedTier, email: person.emails.primaryEmail };
    const request = jest
      .fn()
      .mockResolvedValueOnce([linkedTier])
      .mockResolvedValueOnce(synced);
    const user = userEvent.setup();

    renderPage(request, { people: [], linkedPeople: [person] });
    await screen.findByText('Atlas ERP');
    await user.click(
      screen.getByRole('button', { name: 'Synchroniser Atlas ERP' }),
    );

    expect(
      await screen.findByRole('button', { name: 'Contact Twenty Sara Amrani' }),
    ).toHaveTextContent('Sara Amrani');
    expect(getLastFindManyArgs('person', 'linked')).toEqual(
      expect.objectContaining({
        filter: { id: { eq: person.id } },
        limit: 1,
        skip: false,
      }),
    );

    await user.click(
      screen.getByRole('checkbox', {
        name: 'Je confirme les valeurs modifiées',
      }),
    );
    await user.click(screen.getByRole('button', { name: 'Synchroniser' }));

    await waitFor(() => expect(request).toHaveBeenCalledTimes(2));
    expect(request.mock.calls[1][0].body.twentyPersonId).toBe(person.id);
  });

  it.each([
    ['chargement', { loading: true }, 'Chargement du contact lié'],
    [
      'erreur',
      { error: new Error('linked person unavailable') },
      'Impossible de charger le contact lié',
    ],
    ['introuvable', {}, 'Contact lié introuvable'],
  ])(
    'blocks sync while the linked person is in %s',
    async (_state, linkedPersonQuery, expectedMessage) => {
      const linkedTier = { ...tier, twentyPersonId: person.id };
      const request = jest.fn().mockResolvedValue([linkedTier]);
      const user = userEvent.setup();

      const { createMutationIntent, linkedPersonQuery: linkedQuery } =
        renderPage(request, {
          people: [],
          linkedPeople: [],
          linkedPersonQuery,
        });
      await screen.findByText('Atlas ERP');
      await user.click(
        screen.getByRole('button', { name: 'Synchroniser Atlas ERP' }),
      );

      expect(await screen.findByText(expectedMessage)).toBeVisible();
      await user.click(
        screen.getByRole('checkbox', {
          name: 'Je confirme les valeurs modifiées',
        }),
      );
      const synchronize = screen.getByRole('button', { name: 'Synchroniser' });
      expect(synchronize).toBeDisabled();
      fireEvent.submit(synchronize.closest('form') as HTMLFormElement);
      expect(createMutationIntent).not.toHaveBeenCalled();
      expect(request).toHaveBeenCalledTimes(1);

      if (expectedMessage === 'Impossible de charger le contact lié') {
        await user.click(
          screen.getByRole('button', { name: 'Réessayer le contact lié' }),
        );
        expect(linkedQuery.refetch).toHaveBeenCalledTimes(1);
      }
    },
  );

  it('clears a resolved linked person only after explicitly choosing no contact', async () => {
    const linkedTier = { ...tier, twentyPersonId: person.id };
    const synced = { ...linkedTier, twentyPersonId: null };
    const request = jest
      .fn()
      .mockResolvedValueOnce([linkedTier])
      .mockResolvedValueOnce(synced);
    const user = userEvent.setup();

    renderPage(request, { people: [], linkedPeople: [person] });
    await screen.findByText('Atlas ERP');
    await user.click(
      screen.getByRole('button', { name: 'Synchroniser Atlas ERP' }),
    );
    await screen.findByRole('button', { name: 'Contact Twenty Sara Amrani' });
    await chooseOption(user, 'Contact Twenty', 'Aucun contact');
    await user.click(
      screen.getByRole('checkbox', {
        name: 'Je confirme les valeurs modifiées',
      }),
    );
    await user.click(screen.getByRole('button', { name: 'Synchroniser' }));

    await waitFor(() => expect(request).toHaveBeenCalledTimes(2));
    expect(request.mock.calls[1][0].body.twentyPersonId).toBeNull();
  });

  it.each([
    ['Délai de paiement', '-1'],
    ['Délai de paiement', '1.5'],
    ['Délai de paiement', '9007199254740992'],
    ['Plafond de crédit', '1e3'],
    ['Plafond de crédit', '1.234'],
    ['Plafond de crédit', '90071992547409.91'],
    ['Plafond de crédit', '90071992547409.92'],
  ])(
    'rejects invalid manual %s value %s before syncing',
    async (label, value) => {
      const request = jest.fn().mockResolvedValue([tier]);
      const user = userEvent.setup();

      const { createMutationIntent } = renderPage(request);
      await screen.findByText('Atlas ERP');
      await user.click(
        screen.getByRole('button', { name: 'Synchroniser Atlas ERP' }),
      );
      await chooseOption(user, `Source pour ${label}`, 'Valeur manuelle');
      await replaceText(user, `Valeur manuelle pour ${label}`, value);
      await user.click(
        screen.getByRole('checkbox', {
          name: 'Je confirme les valeurs modifiées',
        }),
      );
      await user.click(screen.getByRole('button', { name: 'Synchroniser' }));

      expect(await screen.findByRole('alert')).toHaveTextContent(
        'Vérifiez le délai et le plafond de crédit',
      );
      expect(createMutationIntent).not.toHaveBeenCalled();
      expect(request).toHaveBeenCalledTimes(1);
    },
  );

  it('keeps validation visible and submits corrected manual values', async () => {
    const synced = { ...tier, paymentDelayDays: 45 };
    const request = jest
      .fn()
      .mockResolvedValueOnce([tier])
      .mockResolvedValueOnce(synced);
    const user = userEvent.setup();

    renderPage(request);
    await screen.findByText('Atlas ERP');
    await user.click(
      screen.getByRole('button', { name: 'Synchroniser Atlas ERP' }),
    );
    await chooseOption(
      user,
      'Source pour Délai de paiement',
      'Valeur manuelle',
    );
    await replaceText(user, 'Valeur manuelle pour Délai de paiement', '-1');
    await user.click(
      screen.getByRole('checkbox', {
        name: 'Je confirme les valeurs modifiées',
      }),
    );
    await user.click(screen.getByRole('button', { name: 'Synchroniser' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Vérifiez le délai et le plafond de crédit',
    );
    expect(
      screen.getByRole('textbox', {
        name: 'Valeur manuelle pour Délai de paiement',
      }),
    ).toHaveValue('-1');

    await replaceText(user, 'Valeur manuelle pour Délai de paiement', '45');
    await user.click(
      screen.getByRole('checkbox', {
        name: 'Je confirme les valeurs modifiées',
      }),
    );
    await user.click(screen.getByRole('button', { name: 'Synchroniser' }));

    await waitFor(() => expect(request).toHaveBeenCalledTimes(2));
    expect(request.mock.calls[1][0].body.paymentDelayDays).toBe(45);
  });

  it.each(['1e3', '1.234', '90071992547409.91', '90071992547409.92'])(
    'rejects the non-exact MAD credit limit %s before creating a mutation intent',
    async (creditLimit) => {
      const request = jest.fn().mockResolvedValue([]);
      const user = userEvent.setup();

      const { createMutationIntent } = renderPage(request);
      await screen.findByText('Aucun tiers sur la page chargée');
      await user.click(screen.getByRole('button', { name: 'Nouveau tiers' }));
      await user.type(screen.getByRole('textbox', { name: /^Nom/ }), 'Atlas');
      await replaceNumber(user, 'Plafond de crédit (MAD)', creditLimit);
      await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

      expect(await screen.findByRole('alert')).toHaveTextContent(
        'Vérifiez le délai et le plafond de crédit',
      );
      expect(createMutationIntent).not.toHaveBeenCalled();
      expect(request).toHaveBeenCalledTimes(1);
    },
  );

  it('sends a validated exact MAD credit limit as a decimal number', async () => {
    const created = { ...tier, creditLimit: 0.29 };
    const request = jest
      .fn()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(created);
    const user = userEvent.setup();

    renderPage(request);
    await screen.findByText('Aucun tiers sur la page chargée');
    await user.click(screen.getByRole('button', { name: 'Nouveau tiers' }));
    await user.type(screen.getByRole('textbox', { name: /^Nom/ }), 'Atlas');
    expect(
      screen.getByRole('textbox', { name: 'Plafond de crédit (MAD)' }),
    ).toHaveAttribute('inputmode', 'decimal');
    await replaceNumber(user, 'Plafond de crédit (MAD)', '0.29');
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

    await waitFor(() => expect(request).toHaveBeenCalledTimes(2));
    expect(request.mock.calls[1][0].body.creditLimit).toBe(0.29);
    expect(typeof request.mock.calls[1][0].body.creditLimit).toBe('number');
  });

  it('creates every legal, contact, credit, and account field', async () => {
    const created = { ...tier, id: 'c20c90b7-ce76-45d3-a0b3-e4f015ead295' };
    const request = jest
      .fn()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(created);
    const user = userEvent.setup();

    const { createMutationIntent } = renderPage(request);
    await screen.findByText('Aucun tiers sur la page chargée');
    await user.click(screen.getByRole('button', { name: 'Nouveau tiers' }));
    await user.type(screen.getByRole('textbox', { name: /^Nom/ }), 'Atlas ERP');
    await user.type(
      screen.getByRole('textbox', { name: 'E-mail' }),
      'erp@atlas.example',
    );
    await user.type(
      screen.getByRole('textbox', { name: 'Téléphone' }),
      '+212500000000',
    );
    await user.type(
      screen.getByRole('textbox', { name: 'ICE' }),
      '001122334455667',
    );
    await user.type(
      screen.getByRole('textbox', { name: 'Identifiant fiscal' }),
      'IF-42',
    );
    await user.type(
      screen.getByRole('textbox', { name: 'Adresse' }),
      'Ancienne adresse',
    );
    await user.type(screen.getByRole('textbox', { name: 'Ville' }), 'Rabat');
    await user.clear(
      screen.getByRole('spinbutton', { name: 'Délai de paiement (jours)' }),
    );
    await user.type(
      screen.getByRole('spinbutton', { name: 'Délai de paiement (jours)' }),
      '30',
    );
    await replaceNumber(user, 'Plafond de crédit (MAD)', '25000.5');
    expect(
      screen.getByRole('button', { name: 'Type Client' }),
    ).toHaveTextContent('Client');
    expect(
      screen.getByRole('button', { name: 'Compte collectif 3421' }),
    ).toHaveTextContent('3421');
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

    await waitFor(() => expect(request).toHaveBeenCalledTimes(2));
    expect(request.mock.calls[1][0]).toMatchObject({
      method: 'POST',
      path: '/tiers',
      body: {
        societeId: SOCIETE_ID,
        type: 'CLIENT',
        name: 'Atlas ERP',
        email: 'erp@atlas.example',
        phone: '+212500000000',
        ice: '001122334455667',
        identifiantFiscal: 'IF-42',
        address: 'Ancienne adresse',
        city: 'Rabat',
        paymentDelayDays: 30,
        creditLimit: 25000.5,
        twentyCompanyId: null,
        twentyPersonId: null,
        compteCollectifCode: '3421',
        isActive: true,
      },
    });

    expect(
      createMutationIntent.mock.calls.map(([, options]) => options),
    ).toEqual([{ idempotency: 'forbidden' }]);
  });

  it('edits every legal, contact, credit, account, linkage, and active field exactly', async () => {
    const linkedTier = { ...tier, twentyPersonId: person.id };
    const edited = {
      ...linkedTier,
      type: 'FOURNISSEUR' as const,
      name: 'Atlas modifié',
      email: 'modifie@atlas.example',
      phone: '+212622222222',
      ice: '998877665544332',
      identifiantFiscal: 'IF-99',
      address: '99 rue des Fleurs',
      city: 'Marrakech',
      paymentDelayDays: 60,
      creditLimit: 40000.25,
      compteCollectifCode: '4411' as const,
      isActive: false,
    };
    const request = jest
      .fn()
      .mockResolvedValueOnce([linkedTier])
      .mockResolvedValueOnce(edited);
    const user = userEvent.setup();

    renderPage(request);
    await screen.findByText('Atlas ERP');
    await user.click(
      screen.getByRole('button', { name: 'Modifier Atlas ERP' }),
    );
    await enterEditedTierValues(user);
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

    await waitFor(() => expect(request).toHaveBeenCalledTimes(2));
    expect(request.mock.calls[1][0]).toEqual({
      method: 'PATCH',
      path: `/tiers/${TIER_ID}`,
      schema: expect.anything(),
      body: {
        societeId: SOCIETE_ID,
        type: 'FOURNISSEUR',
        name: 'Atlas modifié',
        email: 'modifie@atlas.example',
        phone: '+212622222222',
        ice: '998877665544332',
        identifiantFiscal: 'IF-99',
        address: '99 rue des Fleurs',
        city: 'Marrakech',
        paymentDelayDays: 60,
        creditLimit: 40000.25,
        twentyCompanyId: COMPANY_ID,
        twentyPersonId: person.id,
        compteCollectifCode: '4411',
        isActive: false,
      },
    });
  });

  it('preserves every edited value after an uncertain edit failure and refetch', async () => {
    const linkedTier = { ...tier, twentyPersonId: person.id };
    const request = jest
      .fn()
      .mockResolvedValueOnce([linkedTier])
      .mockRejectedValueOnce(new Error('connection lost'))
      .mockResolvedValueOnce([linkedTier]);
    const user = userEvent.setup();

    renderPage(request);
    await screen.findByText('Atlas ERP');
    await user.click(
      screen.getByRole('button', { name: 'Modifier Atlas ERP' }),
    );
    await enterEditedTierValues(user);
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'État à vérifier',
    );
    await waitFor(() => expect(request).toHaveBeenCalledTimes(3));
    expect(
      screen.getByRole('button', { name: 'Type Fournisseur' }),
    ).toHaveTextContent('Fournisseur');
    expect(
      screen.getByRole('button', { name: 'Compte collectif 4411' }),
    ).toHaveTextContent('4411');
    expect(screen.getByRole('textbox', { name: /^Nom/ })).toHaveValue(
      'Atlas modifié',
    );
    expect(screen.getByRole('textbox', { name: 'E-mail' })).toHaveValue(
      'modifie@atlas.example',
    );
    expect(screen.getByRole('textbox', { name: 'Téléphone' })).toHaveValue(
      '+212622222222',
    );
    expect(screen.getByRole('textbox', { name: 'ICE' })).toHaveValue(
      '998877665544332',
    );
    expect(
      screen.getByRole('textbox', { name: 'Identifiant fiscal' }),
    ).toHaveValue('IF-99');
    expect(screen.getByRole('textbox', { name: 'Adresse' })).toHaveValue(
      '99 rue des Fleurs',
    );
    expect(screen.getByRole('textbox', { name: 'Ville' })).toHaveValue(
      'Marrakech',
    );
    expect(
      screen.getByRole('spinbutton', { name: 'Délai de paiement (jours)' }),
    ).toHaveValue(60);
    expect(
      screen.getByRole('textbox', { name: 'Plafond de crédit (MAD)' }),
    ).toHaveValue('40000.25');
    expect(screen.getByRole('checkbox', { name: 'Actif' })).not.toBeChecked();
    expect(screen.getByRole('button', { name: 'Enregistrer' })).toBeDisabled();
  });

  it('preserves tier input and refetches before allowing an uncertain create retry', async () => {
    let rejectRefetch: (reason: unknown) => void = () => undefined;
    const request = jest
      .fn()
      .mockResolvedValueOnce([])
      .mockRejectedValueOnce(new Error('connection lost'))
      .mockImplementationOnce(
        () => new Promise((_resolve, reject) => (rejectRefetch = reject)),
      )
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(tier);
    const user = userEvent.setup();

    renderPage(request);
    await screen.findByText('Aucun tiers sur la page chargée');
    await user.click(screen.getByRole('button', { name: 'Nouveau tiers' }));
    await user.type(screen.getByRole('textbox', { name: /^Nom/ }), 'Atlas ERP');
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'État à vérifier',
    );
    expect(screen.getByRole('textbox', { name: /^Nom/ })).toHaveValue(
      'Atlas ERP',
    );
    expect(screen.getByRole('button', { name: 'Enregistrer' })).toBeDisabled();
    await waitFor(() => expect(request).toHaveBeenCalledTimes(3));
    rejectRefetch(new Error('reconciliation unavailable'));
    expect(await screen.findByText('Échec de vérification')).toBeVisible();
    const save = screen.getByRole('button', { name: 'Enregistrer' });
    fireEvent.submit(save.closest('form') as HTMLFormElement);
    expect(request).toHaveBeenCalledTimes(3);
    expect(
      screen.getByRole('button', { name: 'Réessayer l’actualisation' }),
    ).toBeVisible();
    await user.click(
      screen.getByRole('button', { name: 'Réessayer l’actualisation' }),
    );
    await waitFor(() => expect(request).toHaveBeenCalledTimes(4));
    expect(request.mock.calls.map(([input]) => input.method)).toEqual([
      'GET',
      'POST',
      'GET',
      'GET',
    ]);
    expect(save).toBeDisabled();
    await user.click(
      screen.getByRole('button', {
        name: 'J’ai vérifié, autoriser un nouvel essai',
      }),
    );
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));
    await waitFor(() => expect(request).toHaveBeenCalledTimes(5));
    expect(request.mock.calls.map(([input]) => input.method)).toEqual([
      'GET',
      'POST',
      'GET',
      'GET',
      'POST',
    ]);
  });

  it('keeps uncertain manual sync values mounted and retries them after refetch acknowledgement', async () => {
    let rejectRefetch: (reason: unknown) => void = () => undefined;
    const request = jest
      .fn()
      .mockResolvedValueOnce([tier])
      .mockRejectedValueOnce(new Error('connection lost'))
      .mockImplementationOnce(
        () => new Promise((_resolve, reject) => (rejectRefetch = reject)),
      )
      .mockResolvedValueOnce([tier])
      .mockResolvedValueOnce({ ...tier, name: 'Atlas CRM' });
    const user = userEvent.setup();

    renderPage(request);
    await screen.findByText('Atlas ERP');
    await user.click(
      screen.getByRole('button', { name: 'Synchroniser Atlas ERP' }),
    );
    await chooseOption(user, 'Source pour Nom', 'Valeur manuelle');
    await replaceText(user, 'Valeur manuelle pour Nom', 'Atlas préservé');
    await chooseOption(
      user,
      'Source pour Délai de paiement',
      'Valeur manuelle',
    );
    await replaceText(user, 'Valeur manuelle pour Délai de paiement', '45');
    await user.click(
      screen.getByRole('checkbox', {
        name: 'Je confirme les valeurs modifiées',
      }),
    );
    await user.click(screen.getByRole('button', { name: 'Synchroniser' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'État à vérifier',
    );
    expect(
      screen.getByRole('table', { name: 'Aperçu de synchronisation' }),
    ).toBeVisible();
    expect(
      screen.getByRole('textbox', { name: 'Valeur manuelle pour Nom' }),
    ).toHaveValue('Atlas préservé');
    expect(
      screen.getByRole('textbox', {
        name: 'Valeur manuelle pour Délai de paiement',
      }),
    ).toHaveValue('45');
    expect(screen.getByRole('button', { name: 'Synchroniser' })).toBeDisabled();
    await waitFor(() => expect(request).toHaveBeenCalledTimes(3));

    rejectRefetch(new Error('reconciliation unavailable'));
    expect(await screen.findByText('Échec de vérification')).toBeVisible();
    const synchronize = screen.getByRole('button', { name: 'Synchroniser' });
    fireEvent.submit(synchronize.closest('form') as HTMLFormElement);
    expect(request).toHaveBeenCalledTimes(3);
    await user.click(
      screen.getByRole('button', { name: 'Réessayer l’actualisation' }),
    );
    await waitFor(() => expect(request).toHaveBeenCalledTimes(4));
    expect(request.mock.calls.map(([input]) => input.method)).toEqual([
      'GET',
      'POST',
      'GET',
      'GET',
    ]);
    expect(synchronize).toBeDisabled();
    expect(
      screen.getByRole('textbox', { name: 'Valeur manuelle pour Nom' }),
    ).toHaveValue('Atlas préservé');

    await user.click(
      screen.getByRole('button', {
        name: 'J’ai vérifié, autoriser un nouvel essai',
      }),
    );
    await user.click(screen.getByRole('button', { name: 'Synchroniser' }));

    await waitFor(() => expect(request).toHaveBeenCalledTimes(5));
    expect(request.mock.calls.map(([input]) => input.method)).toEqual([
      'GET',
      'POST',
      'GET',
      'GET',
      'POST',
    ]);
    expect(request.mock.calls[1][0].body).toMatchObject({
      name: 'Atlas préservé',
      paymentDelayDays: 45,
    });
    expect(request.mock.calls[4][0].body).toMatchObject({
      name: 'Atlas préservé',
      paymentDelayDays: 45,
    });
  });
});
