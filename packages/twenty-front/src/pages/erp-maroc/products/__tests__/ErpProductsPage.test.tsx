import { useErpMarocContext } from '@/erp-maroc/context/useErpMarocContext';
import { ErpMarocError } from '@/erp-maroc/api/erpMarocError';
import { useSnackBar } from '@/ui/feedback/snack-bar-manager/hooks/useSnackBar';
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation, useNavigationType } from 'react-router-dom';

// oxlint-disable-next-line eslint/no-restricted-imports -- Pages are outside the @/ modules alias.
import { ErpProductsPage } from '../ErpProductsPage';

jest.mock('@/erp-maroc/context/useErpMarocContext', () => ({
  useErpMarocContext: jest.fn(),
}));

jest.mock('@/ui/feedback/snack-bar-manager/hooks/useSnackBar', () => ({
  useSnackBar: jest.fn(),
}));

jest.mock('@/erp-maroc/components/ErpConfirmDialog', () => ({
  ErpConfirmDialog: ({
    isOpen,
    title,
    message,
    confirmLabel = 'Confirmer',
    cancelLabel = 'Annuler',
    confirmDisabled = false,
    isConfirming = false,
    onCancel,
    onConfirm,
  }: {
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    confirmDisabled?: boolean;
    isConfirming?: boolean;
    onCancel: () => void;
    onConfirm: () => void;
  }) =>
    isOpen ? (
      <div role="dialog" aria-label={title}>
        <p>{message}</p>
        <button type="button" disabled={isConfirming} onClick={onCancel}>
          {cancelLabel}
        </button>
        <button
          type="button"
          disabled={confirmDisabled || isConfirming}
          onClick={onConfirm}
        >
          {confirmLabel}
        </button>
      </div>
    ) : null,
}));

const SOCIETE_ID = '89c90690-4f4a-4f2e-91ce-3700f16a8ca1';
const PRODUCT_ID = '49b11318-8d30-43ab-bbf4-fb16ce1867ba';

const product = {
  id: PRODUCT_ID,
  societeId: SOCIETE_ID,
  code: 'SERV-001',
  name: 'Conseil Atlas',
  description: 'Mission de conseil',
  type: 'SERVICE',
  unit: 'jour',
  defaultPriceHt: 1200.5,
  tvaRate: 20,
  incomeAccountCode: '7124',
  isActive: true,
  createdAt: '2026-07-11T08:00:00Z',
  updatedAt: '2026-07-11T08:00:00Z',
};

const inactiveProduct = {
  ...product,
  id: 'b330b785-8784-4e59-b45b-37f4bf5f86ef',
  code: 'ARCH-001',
  name: 'Produit archivé',
  isActive: false,
};

const snackBar = {
  enqueueSuccessSnackBar: jest.fn(),
  enqueueErrorSnackBar: jest.fn(),
};

const LocationProbe = () => {
  const location = useLocation();
  const navigationType = useNavigationType();

  return (
    <output aria-label="URL courante">
      {location.pathname}
      {location.search}|{navigationType}
    </output>
  );
};

type CatalogAccess = { manageCatalog: boolean };

const renderPage = (
  request: jest.Mock,
  initialEntry = '/erp-maroc/products',
  access: CatalogAccess = { manageCatalog: true },
) => {
  const createMutationIntent = jest.fn((input, _options) => ({
    idempotencyKey: 'stable-test-intent',
    execute: () => request(input),
    retry: jest.fn(),
  }));
  jest.mocked(useSnackBar).mockReturnValue(snackBar as never);
  jest.mocked(useErpMarocContext).mockReturnValue({
    status: 'ready',
    context: {
      societeId: SOCIETE_ID,
      capabilities: {
        get manageCatalog() {
          return access.manageCatalog;
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
      <ErpProductsPage />
      <LocationProbe />
    </MemoryRouter>
  );
  const rendered = render(renderTree());

  return {
    ...rendered,
    rerenderPage: () => rendered.rerender(renderTree()),
    access,
    createMutationIntent,
  };
};

const fillProductForm = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.type(screen.getByRole('textbox', { name: /^Code/ }), 'P-42');
  await user.type(screen.getByRole('textbox', { name: /^Nom/ }), 'Pack Atlas');
  await user.type(
    screen.getByRole('textbox', { name: 'Description' }),
    'Description précise',
  );
  await user.clear(screen.getByRole('textbox', { name: /^Type/ }));
  await user.type(screen.getByRole('textbox', { name: /^Type/ }), 'SERVICE');
  await user.clear(screen.getByRole('textbox', { name: /^Unité/ }));
  await user.type(screen.getByRole('textbox', { name: /^Unité/ }), 'heure');
  await user.type(screen.getByRole('textbox', { name: /^Prix HT/ }), '99.95');
  await user.clear(screen.getByRole('spinbutton', { name: /^TVA/ }));
  await user.type(screen.getByRole('spinbutton', { name: /^TVA/ }), '20');
  await user.type(
    screen.getByRole('textbox', { name: 'Compte de produit' }),
    '7124',
  );
};

describe('ErpProductsPage', () => {
  afterEach(() => jest.clearAllMocks());

  it('loads products and applies search and active filters to the loaded page', async () => {
    const request = jest.fn().mockResolvedValue([product, inactiveProduct]);
    const user = userEvent.setup();

    renderPage(request);

    expect(await screen.findByText('Conseil Atlas')).toBeVisible();
    expect(screen.getByText('Produit archivé')).toBeVisible();
    expect(screen.getAllByText('1 200,50 MAD')).toHaveLength(2);
    expect(screen.getByText('Page chargée')).toBeVisible();
    expect(
      screen.getAllByRole('columnheader').map((header) => header.textContent),
    ).toEqual([
      'Code',
      'Nom',
      'Type',
      'Unité',
      'Prix HT',
      'TVA',
      'État',
      'Actions',
    ]);
    expect(screen.getByRole('button', { name: 'Tous' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: 'Actifs' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    expect(screen.getByRole('button', { name: 'Inactifs' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );

    await user.type(
      screen.getByRole('textbox', { name: 'Rechercher des produits' }),
      'arch',
    );
    expect(screen.queryByText('Conseil Atlas')).toBeNull();
    expect(screen.getByText('Produit archivé')).toBeVisible();

    await user.clear(
      screen.getByRole('textbox', { name: 'Rechercher des produits' }),
    );
    await user.click(screen.getByRole('button', { name: 'Actifs' }));
    expect(screen.getByRole('button', { name: 'Tous' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    expect(screen.getByRole('button', { name: 'Actifs' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByText('Conseil Atlas')).toBeVisible();
    expect(screen.queryByText('Produit archivé')).toBeNull();
  });

  it('retries an initial list failure without entering mutation reconciliation', async () => {
    const request = jest
      .fn()
      .mockRejectedValueOnce(new Error('list unavailable'))
      .mockResolvedValueOnce([product]);
    const user = userEvent.setup();

    renderPage(request);

    expect(
      await screen.findByText('Impossible de charger les produits'),
    ).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Réessayer' }));

    expect(await screen.findByText('Conseil Atlas')).toBeVisible();
    expect(
      screen.queryByRole('button', {
        name: 'J’ai vérifié, autoriser un nouvel essai',
      }),
    ).toBeNull();
    expect(
      screen.getByRole('button', { name: 'Nouveau produit' }),
    ).toBeEnabled();
    expect(request).toHaveBeenCalledTimes(2);
  });

  it('keeps products readable while catalog mutation controls and forged drawer opens are blocked', async () => {
    const request = jest.fn().mockResolvedValue([product]);
    const user = userEvent.setup();
    const access = { manageCatalog: true };

    const { rerenderPage } = renderPage(request, '/erp-maroc/products', access);
    expect(await screen.findByText('Conseil Atlas')).toBeVisible();
    const staleOpener = screen.getByRole('button', { name: 'Nouveau produit' });

    access.manageCatalog = false;
    await user.click(staleOpener);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    rerenderPage();
    expect(screen.getByText('Conseil Atlas')).toBeVisible();
    expect(
      screen.queryByRole('button', { name: 'Nouveau produit' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Modifier Conseil Atlas' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Désactiver Conseil Atlas' }),
    ).not.toBeInTheDocument();
  });

  it('blocks a forged product submit after catalog permission is revoked', async () => {
    const request = jest.fn().mockResolvedValue([]);
    const user = userEvent.setup();
    const access = { manageCatalog: true };

    const { createMutationIntent } = renderPage(
      request,
      '/erp-maroc/products',
      access,
    );
    await screen.findByText('Aucun produit sur la page chargée');
    await user.click(screen.getByRole('button', { name: 'Nouveau produit' }));
    await fillProductForm(user);
    const save = screen.getByRole('button', { name: 'Enregistrer' });

    access.manageCatalog = false;
    fireEvent.submit(save.closest('form') as HTMLFormElement);

    await waitFor(() => expect(request).toHaveBeenCalledTimes(1));
    expect(createMutationIntent).not.toHaveBeenCalled();
    expect(
      screen.getByRole('dialog', { name: 'Nouveau produit' }),
    ).toBeVisible();
  });

  it('renders contract-valid backend decimal prices with two MAD decimals', async () => {
    const request = jest.fn().mockResolvedValue([
      { ...product, id: 'price-decimal', defaultPriceHt: 1.01 },
      {
        ...product,
        id: 'price-grouping',
        code: 'SERV-002',
        name: 'Conseil Rif',
        defaultPriceHt: 1_234_567.9,
      },
    ]);

    renderPage(request);

    expect(await screen.findByText('1,01 MAD')).toBeVisible();
    expect(screen.getByText('1 234 567,90 MAD')).toBeVisible();
  });

  it('canonically replaces malformed initial filters while preserving canonical search', async () => {
    const request = jest.fn().mockResolvedValue([product, inactiveProduct]);

    renderPage(
      request,
      '/erp-maroc/products?unknown=drop&active=all&active=bogus&search=%20Atlas%20',
    );

    expect(await screen.findByText('Conseil Atlas')).toBeVisible();
    expect(screen.queryByText('Produit archivé')).not.toBeInTheDocument();
    await waitFor(() =>
      expect(
        screen.getByRole('status', { name: 'URL courante' }),
      ).toHaveTextContent('/erp-maroc/products?search=Atlas|REPLACE'),
    );
  });

  it.each(['1e3', '12.345', '90071992547409.91', '90071992547409.92'])(
    'rejects the non-exact MAD price %s before creating a mutation intent',
    async (invalidPrice) => {
      const request = jest
        .fn()
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce(product);
      const user = userEvent.setup();

      const { createMutationIntent } = renderPage(request);
      await screen.findByText('Aucun produit sur la page chargée');
      await user.click(screen.getByRole('button', { name: 'Nouveau produit' }));
      await user.type(screen.getByRole('textbox', { name: /^Code/ }), 'P-1');
      await user.type(screen.getByRole('textbox', { name: /^Nom/ }), 'Atlas');
      fireEvent.change(screen.getByRole('textbox', { name: /^Prix HT/ }), {
        target: { value: invalidPrice },
      });
      await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

      expect(await screen.findByRole('alert')).toHaveTextContent(
        'Vérifiez le prix HT et le taux de TVA',
      );
      expect(request).toHaveBeenCalledTimes(1);
      expect(createMutationIntent).not.toHaveBeenCalled();
    },
  );

  it.each([
    ['0.29', 0.29],
    ['1 234,50', 1234.5],
  ])(
    'accepts the local MAD input %s and sends the exact number %s',
    async (inputValue, expectedValue) => {
      const created = { ...product, defaultPriceHt: expectedValue };
      const request = jest
        .fn()
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce(created);
      const user = userEvent.setup();

      renderPage(request);
      await screen.findByText('Aucun produit sur la page chargée');
      await user.click(screen.getByRole('button', { name: 'Nouveau produit' }));
      await user.type(screen.getByRole('textbox', { name: /^Code/ }), 'P-1');
      await user.type(screen.getByRole('textbox', { name: /^Nom/ }), 'Atlas');
      const priceInput = screen.getByRole('textbox', { name: /^Prix HT/ });
      expect(priceInput).toHaveAttribute('type', 'text');
      expect(priceInput).toHaveAttribute('inputmode', 'decimal');
      fireEvent.change(priceInput, { target: { value: inputValue } });
      await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

      await waitFor(() => expect(request).toHaveBeenCalledTimes(2));
      expect(request.mock.calls[1][0].body.defaultPriceHt).toBe(expectedValue);
      expect(typeof request.mock.calls[1][0].body.defaultPriceHt).toBe(
        'number',
      );
    },
  );

  it.each(['1', '5', '21'])(
    'rejects unsupported integer TVA rate %s before creating a mutation intent',
    async (invalidTvaRate) => {
      const request = jest.fn().mockResolvedValue([]);
      const user = userEvent.setup();

      const { createMutationIntent } = renderPage(request);
      await screen.findByText('Aucun produit sur la page chargée');
      await user.click(screen.getByRole('button', { name: 'Nouveau produit' }));
      await fillProductForm(user);
      const tvaRate = screen.getByRole('spinbutton', { name: /^TVA/ });
      await user.clear(tvaRate);
      await user.type(tvaRate, invalidTvaRate);
      await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

      expect(await screen.findByRole('alert')).toHaveTextContent(
        'Vérifiez le prix HT et le taux de TVA',
      );
      expect(createMutationIntent).not.toHaveBeenCalled();
    },
  );

  it.each([
    ['Code', /^Code/],
    ['Nom', /^Nom/],
    ['Type', /^Type/],
    ['Unité', /^Unité/],
  ] as const)(
    'rejects required %s containing only whitespace before mutation',
    async (label, name) => {
      const request = jest.fn().mockResolvedValue([]);
      const user = userEvent.setup();

      const { createMutationIntent } = renderPage(request);
      await screen.findByText('Aucun produit sur la page chargée');
      await user.click(screen.getByRole('button', { name: 'Nouveau produit' }));
      await fillProductForm(user);
      const field = screen.getByRole('textbox', { name });
      fireEvent.change(field, { target: { value: '\u00a0' } });
      expect(field).toHaveValue('');
      await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

      expect(
        screen.getByRole('dialog', { name: 'Nouveau produit' }),
      ).toBeVisible();
      expect(createMutationIntent).not.toHaveBeenCalled();
    },
  );

  it('uses the shared drawer focus lifecycle from the product opener', async () => {
    const request = jest.fn().mockResolvedValue([]);
    const user = userEvent.setup();

    renderPage(request);
    await screen.findByText('Aucun produit sur la page chargée');
    const opener = screen.getByRole('button', { name: 'Nouveau produit' });
    await user.click(opener);

    expect(
      screen.getByRole('dialog', { name: 'Nouveau produit' }),
    ).toHaveAccessibleDescription('Renseignez les informations du produit.');
    expect(screen.getByRole('textbox', { name: /^Code/ })).toHaveFocus();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });

  it('creates once under duplicate submit and sends the exact MAD-decimal payload', async () => {
    let resolveCreate: (value: unknown) => void = () => undefined;
    const request = jest
      .fn()
      .mockResolvedValueOnce([])
      .mockImplementationOnce(
        () => new Promise((resolve) => (resolveCreate = resolve)),
      );
    const user = userEvent.setup();

    const { createMutationIntent } = renderPage(request);
    await screen.findByText('Aucun produit sur la page chargée');
    await user.click(screen.getByRole('button', { name: 'Nouveau produit' }));
    await fillProductForm(user);
    fireEvent.change(screen.getByRole('textbox', { name: /^Code/ }), {
      target: { value: '  P-42  ' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: /^Nom/ }), {
      target: { value: '  Pack Atlas  ' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: /^Type/ }), {
      target: { value: '  SERVICE  ' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: /^Unité/ }), {
      target: { value: '  heure  ' },
    });

    const save = screen.getByRole('button', { name: 'Enregistrer' });
    await user.dblClick(save);

    await waitFor(() => expect(request).toHaveBeenCalledTimes(2));
    expect(createMutationIntent).toHaveBeenCalledTimes(1);
    expect(createMutationIntent).toHaveBeenCalledWith(expect.anything(), {
      idempotency: 'forbidden',
    });
    expect(save).toBeDisabled();
    expect(request.mock.calls[1][0]).toEqual({
      method: 'POST',
      path: '/products',
      schema: expect.anything(),
      body: {
        societeId: SOCIETE_ID,
        code: 'P-42',
        name: 'Pack Atlas',
        description: 'Description précise',
        type: 'SERVICE',
        unit: 'heure',
        defaultPriceHt: 99.95,
        tvaRate: 20,
        incomeAccountCode: '7124',
        isActive: true,
      },
    });

    resolveCreate({ ...product, code: 'P-42', name: 'Pack Atlas' });
    expect(await screen.findByText('Pack Atlas')).toBeVisible();
  });

  it('keeps the create drawer mounted and refetches before a second uncertain create', async () => {
    let rejectRefetch: (reason: unknown) => void = () => undefined;
    const request = jest
      .fn()
      .mockResolvedValueOnce([])
      .mockRejectedValueOnce(new Error('connection lost'))
      .mockImplementationOnce(
        () => new Promise((_resolve, reject) => (rejectRefetch = reject)),
      )
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce({ ...product, code: 'P-42', name: 'Pack Atlas' });
    const user = userEvent.setup();

    renderPage(request);
    await screen.findByText('Aucun produit sur la page chargée');
    await user.click(screen.getByRole('button', { name: 'Nouveau produit' }));
    await fillProductForm(user);
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'État à vérifier',
    );
    expect(screen.getByRole('textbox', { name: /^Nom/ })).toHaveValue(
      'Pack Atlas',
    );
    expect(screen.getByRole('button', { name: 'Enregistrer' })).toBeDisabled();
    await waitFor(() => expect(request).toHaveBeenCalledTimes(3));

    rejectRefetch(new Error('reconciliation unavailable'));
    expect(await screen.findByText('Échec de vérification')).toBeVisible();
    const save = screen.getByRole('button', { name: 'Enregistrer' });
    fireEvent.submit(save.closest('form') as HTMLFormElement);
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

  it.each([
    [409, 'Conflit ERP'],
    [429, 'Limitation ERP'],
  ])(
    'reconciles a %i response and blocks a blind second product mutation',
    async (statusCode, expectedMessage) => {
      const request = jest
        .fn()
        .mockResolvedValueOnce([])
        .mockRejectedValueOnce(new ErpMarocError('ERP_UNKNOWN', statusCode))
        .mockResolvedValueOnce([]);
      const user = userEvent.setup();

      const { createMutationIntent } = renderPage(request);
      await screen.findByText('Aucun produit sur la page chargée');
      await user.click(screen.getByRole('button', { name: 'Nouveau produit' }));
      await fillProductForm(user);
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

  it('sends the full edit payload once and retains every entered value after an uncertain failure', async () => {
    let rejectEdit: (reason: unknown) => void = () => undefined;
    const request = jest
      .fn()
      .mockResolvedValueOnce([product])
      .mockImplementationOnce(
        () => new Promise((_resolve, reject) => (rejectEdit = reject)),
      )
      .mockResolvedValueOnce([product]);
    const user = userEvent.setup();

    const { createMutationIntent } = renderPage(request);
    expect(await screen.findByText('Conseil Atlas')).toBeVisible();
    await user.click(
      screen.getByRole('button', { name: 'Modifier Conseil Atlas' }),
    );

    const textChanges = [
      [/^Code/, 'EDIT-42'],
      [/^Nom/, 'Pack Rif'],
      ['Description', 'Nouvelle description'],
      [/^Type/, 'PRODUIT'],
      [/^Unité/, 'boîte'],
      ['Compte de produit', '7111'],
    ] as const;
    for (const [name, value] of textChanges) {
      const input = screen.getByRole('textbox', { name });
      await user.clear(input);
      await user.type(input, value);
    }
    const price = screen.getByRole('textbox', { name: /^Prix HT/ });
    await user.clear(price);
    await user.type(price, '1999.99');
    const tva = screen.getByRole('spinbutton', { name: /^TVA/ });
    await user.clear(tva);
    await user.type(tva, '7');
    await user.click(screen.getByRole('checkbox', { name: 'Actif' }));

    const save = screen.getByRole('button', { name: 'Enregistrer' });
    await user.dblClick(save);
    await waitFor(() => expect(request).toHaveBeenCalledTimes(2));
    expect(save).toBeDisabled();
    expect(createMutationIntent).toHaveBeenCalledTimes(1);
    expect(request.mock.calls[1][0]).toEqual({
      method: 'PATCH',
      path: `/products/${PRODUCT_ID}`,
      schema: expect.anything(),
      body: {
        societeId: SOCIETE_ID,
        code: 'EDIT-42',
        name: 'Pack Rif',
        description: 'Nouvelle description',
        type: 'PRODUIT',
        unit: 'boîte',
        defaultPriceHt: 1999.99,
        tvaRate: 7,
        incomeAccountCode: '7111',
        isActive: false,
      },
    });

    rejectEdit(new Error('connection lost after write'));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'État à vérifier',
    );
    await waitFor(() => expect(request).toHaveBeenCalledTimes(3));

    expect(screen.getByRole('textbox', { name: /^Code/ })).toHaveValue(
      'EDIT-42',
    );
    expect(screen.getByRole('textbox', { name: /^Nom/ })).toHaveValue(
      'Pack Rif',
    );
    expect(screen.getByRole('textbox', { name: 'Description' })).toHaveValue(
      'Nouvelle description',
    );
    expect(screen.getByRole('textbox', { name: /^Type/ })).toHaveValue(
      'PRODUIT',
    );
    expect(screen.getByRole('textbox', { name: /^Unité/ })).toHaveValue(
      'boîte',
    );
    expect(screen.getByRole('textbox', { name: /^Prix HT/ })).toHaveValue(
      '1999.99',
    );
    expect(screen.getByRole('spinbutton', { name: /^TVA/ })).toHaveValue(7);
    expect(
      screen.getByRole('textbox', { name: 'Compte de produit' }),
    ).toHaveValue('7111');
    expect(screen.getByRole('checkbox', { name: 'Actif' })).not.toBeChecked();
  });

  it('holds an uncertain deactivation target through refetch and acknowledgement before allowing retry', async () => {
    let rejectRefetch: (reason: unknown) => void = () => undefined;
    const deactivated = { ...product, isActive: false };
    const request = jest
      .fn()
      .mockResolvedValueOnce([product])
      .mockRejectedValueOnce(new Error('connection lost after delete'))
      .mockImplementationOnce(
        () => new Promise((_resolve, reject) => (rejectRefetch = reject)),
      )
      .mockResolvedValueOnce([product])
      .mockResolvedValueOnce(deactivated);
    const user = userEvent.setup();

    renderPage(request);
    expect(await screen.findByText('Conseil Atlas')).toBeVisible();
    await user.click(
      screen.getByRole('button', { name: 'Désactiver Conseil Atlas' }),
    );
    const dialog = screen.getByRole('dialog', {
      name: 'Désactiver le produit',
    });
    const confirm = within(dialog).getByRole('button', { name: 'Désactiver' });
    await user.click(confirm);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'État à vérifier',
    );
    expect(dialog).toBeVisible();
    expect(confirm).toBeDisabled();
    expect(screen.getByText('Conseil Atlas')).toBeVisible();
    await user.click(confirm);
    expect(request).toHaveBeenCalledTimes(3);

    rejectRefetch(new Error('reconciliation unavailable'));
    expect(await screen.findByText('Échec de vérification')).toBeVisible();
    expect(dialog).toBeVisible();
    await user.click(
      screen.getByRole('button', { name: 'Réessayer l’actualisation' }),
    );
    await waitFor(() => expect(request).toHaveBeenCalledTimes(4));
    expect(request.mock.calls.map(([input]) => input.method)).toEqual([
      'GET',
      'DELETE',
      'GET',
      'GET',
    ]);
    const acknowledge = await screen.findByRole('button', {
      name: 'J’ai vérifié, autoriser un nouvel essai',
    });
    expect(confirm).toBeDisabled();
    await user.click(acknowledge);
    expect(confirm).toBeEnabled();
    await user.click(confirm);

    await waitFor(() => expect(request).toHaveBeenCalledTimes(5));
    expect(request.mock.calls.map(([input]) => input.method)).toEqual([
      'GET',
      'DELETE',
      'GET',
      'GET',
      'DELETE',
    ]);
    expect(screen.getByText('Conseil Atlas')).toBeVisible();
  });

  it.each([
    [409, 'Conflit ERP'],
    [429, 'Limitation ERP'],
  ])(
    'shows the explicit %i deactivation message and keeps the target locked until acknowledgement',
    async (statusCode, expectedMessage) => {
      const deactivated = { ...product, isActive: false };
      const request = jest
        .fn()
        .mockResolvedValueOnce([product])
        .mockRejectedValueOnce(new ErpMarocError('ERP_UNKNOWN', statusCode))
        .mockResolvedValueOnce([product])
        .mockResolvedValueOnce(deactivated);
      const user = userEvent.setup();

      const { createMutationIntent } = renderPage(request);
      expect(await screen.findByText('Conseil Atlas')).toBeVisible();
      await user.click(
        screen.getByRole('button', { name: 'Désactiver Conseil Atlas' }),
      );
      const dialog = screen.getByRole('dialog', {
        name: 'Désactiver le produit',
      });
      const confirm = within(dialog).getByRole('button', {
        name: 'Désactiver',
      });
      await user.click(confirm);

      expect(await screen.findByRole('alert')).toHaveTextContent(
        expectedMessage,
      );
      await waitFor(() => expect(request).toHaveBeenCalledTimes(3));
      expect(dialog).toBeVisible();
      expect(confirm).toBeDisabled();
      await user.click(confirm);
      expect(createMutationIntent).toHaveBeenCalledTimes(1);
      expect(request.mock.calls.map(([input]) => input.method)).toEqual([
        'GET',
        'DELETE',
        'GET',
      ]);

      await user.click(
        screen.getByRole('button', {
          name: 'J’ai vérifié, autoriser un nouvel essai',
        }),
      );
      expect(dialog).toBeVisible();
      expect(confirm).toBeEnabled();
      await user.click(confirm);

      await waitFor(() => expect(request).toHaveBeenCalledTimes(4));
      expect(request.mock.calls.map(([input]) => input.method)).toEqual([
        'GET',
        'DELETE',
        'GET',
        'DELETE',
      ]);
    },
  );

  it('edits with PATCH and deactivates with confirmed DELETE without removing the row', async () => {
    const updated = { ...product, defaultPriceHt: 1500 };
    const deactivated = { ...updated, isActive: false };
    const request = jest
      .fn()
      .mockResolvedValueOnce([product])
      .mockResolvedValueOnce(updated)
      .mockResolvedValueOnce(deactivated);
    const user = userEvent.setup();

    const { createMutationIntent } = renderPage(request);
    expect(await screen.findByText('Conseil Atlas')).toBeVisible();
    await user.click(
      screen.getByRole('button', { name: 'Modifier Conseil Atlas' }),
    );
    const price = screen.getByRole('textbox', { name: /^Prix HT/ });
    await user.clear(price);
    await user.type(price, '1500');
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

    await waitFor(() => expect(request).toHaveBeenCalledTimes(2));
    expect(request.mock.calls[1][0]).toMatchObject({
      method: 'PATCH',
      path: `/products/${PRODUCT_ID}`,
      body: expect.objectContaining({
        societeId: SOCIETE_ID,
        defaultPriceHt: 1500,
      }),
    });

    await user.click(
      screen.getByRole('button', { name: 'Désactiver Conseil Atlas' }),
    );
    const dialog = screen.getByRole('dialog', {
      name: 'Désactiver le produit',
    });
    await user.click(
      within(dialog).getByRole('button', { name: 'Désactiver' }),
    );

    await waitFor(() => expect(request).toHaveBeenCalledTimes(3));
    expect(request.mock.calls[2][0]).toMatchObject({
      method: 'DELETE',
      path: `/products/${PRODUCT_ID}`,
    });
    expect(
      createMutationIntent.mock.calls.map(([, options]) => options),
    ).toEqual([{ idempotency: 'forbidden' }, { idempotency: 'forbidden' }]);
    expect(screen.getByText('Conseil Atlas')).toBeVisible();
    expect(screen.getByText('Inactif')).toBeVisible();
  });
});
