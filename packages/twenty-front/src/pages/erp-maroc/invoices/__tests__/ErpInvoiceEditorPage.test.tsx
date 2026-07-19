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
import { type ErpInvoice } from 'twenty-shared/erp-maroc';

// oxlint-disable-next-line eslint/no-restricted-imports -- Pages are outside the @/ modules alias.
import { ErpInvoiceEditorPage } from '../ErpInvoiceEditorPage';

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

const SOCIETE_ID = '89c90690-4f4a-4e2e-91ce-3700f16a8ca1';
const TIER_ID = '49b11318-8d30-43ab-bbf4-fb16ce1867ba';
const INVOICE_ID = '89c90690-4f4a-4e2e-91ce-3700f16a8ca2';
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

const draftInvoice: ErpInvoice = {
  id: INVOICE_ID,
  societeId: SOCIETE_ID,
  tierId: TIER_ID,
  number: 'FAC-2026-0042',
  year: 2026,
  title: 'Déploiement CRM',
  currency: 'MAD' as const,
  status: 'DRAFT' as const,
  issueDate: '2026-07-12',
  dueDate: '2026-08-11',
  notes: 'Inclure la formation',
  paymentMethod: 'BANK_TRANSFER' as const,
  paymentReference: 'VIR-42',
  totalHtCents: 246_900,
  totalTvaCents: 49_380,
  totalTtcCents: 296_280,
  validatedAt: null,
  sentAt: null,
  emailRecipient: null,
  pdfGenerationStatus: 'NOT_REQUESTED' as const,
  pdfDocumentReference: null,
  pdfGeneratedAt: null,
  sellerRaisonSocialeSnapshot: null,
  sellerIceSnapshot: null,
  sellerIdentifiantFiscalSnapshot: null,
  sellerRcSnapshot: null,
  sellerCnssSnapshot: null,
  sellerAddressSnapshot: null,
  sellerCitySnapshot: null,
  sellerTaxeProfessionnelleArticleSnapshot: null,
  customerNameSnapshot: 'Atlas Conseil',
  customerEmailSnapshot: 'atlas@example.com',
  customerPhoneSnapshot: null,
  customerIceSnapshot: null,
  customerIdentifiantFiscalSnapshot: null,
  customerAddressSnapshot: null,
  customerCitySnapshot: null,
  legalSnapshotVerificationStatus: 'PENDING' as const,
  legalSnapshotVerifiedAt: null,
  legalSnapshotVerificationNote: null,
  createdAt: '2026-07-12T08:00:00Z',
  updatedAt: '2026-07-12T08:00:00Z',
  tier: {
    id: TIER_ID,
    name: 'Atlas Conseil',
    email: 'atlas@example.com',
    phone: null,
    ice: null,
    identifiantFiscal: null,
    address: null,
    city: 'Casablanca',
    paymentDelayDays: 30,
  },
  societe: {
    id: SOCIETE_ID,
    raisonSociale: 'Zowka',
    ice: null,
    identifiantFiscal: null,
    rc: null,
    cnss: null,
    address: null,
    city: 'Casablanca',
    taxeProfessionnelleArticle: null,
  },
  sourceQuote: null,
  sourceSalesOrderId: null,
  sourceSalesOrder: null,
  salesInvoiceAllocations: [],
  emailDelivery: null,
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
};

type MockRequestInput = {
  method: string;
  path: string;
  signal?: AbortSignal;
};

type RenderOptions = {
  invoiceId?: string;
  canManage?: boolean;
  now?: Date;
  onSaved?: jest.Mock;
  navigateOnSaved?: boolean;
};

const renderPage = (
  request: jest.Mock,
  {
    invoiceId,
    canManage = true,
    now = new Date('2026-07-12T15:30:00+01:00'),
    onSaved = jest.fn(),
    navigateOnSaved = false,
  }: RenderOptions = {},
) => {
  const access = { canManage };
  const createMutationIntent = jest.fn((input, options) => ({
    execute: () => request(input),
    options,
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

  const EditorRoute = () => {
    const navigate = useNavigate();

    return (
      <ErpInvoiceEditorPage
        invoiceId={invoiceId}
        now={now}
        onSaved={(savedInvoice) => {
          onSaved(savedInvoice);
          if (navigateOnSaved) void navigate('/erp-maroc/invoices');
        }}
      />
    );
  };

  const router = createMemoryRouter(
    [
      { path: '/erp-maroc/invoices/new', element: <EditorRoute /> },
      { path: '/erp-maroc/invoices/:id/edit', element: <EditorRoute /> },
      { path: '/erp-maroc/invoices', element: <span>Liste factures</span> },
      { path: '/erp-maroc/invoices/:id', element: <span>Détail facture</span> },
    ],
    {
      initialEntries: [
        invoiceId === undefined
          ? '/erp-maroc/invoices/new'
          : `/erp-maroc/invoices/${invoiceId}/edit`,
      ],
      future: { v7_relativeSplatPath: true },
    },
  );
  const rendered = render(
    <RouterProvider router={router} future={{ v7_startTransition: true }} />,
  );

  return { access, createMutationIntent, onSaved, router, ...rendered };
};

const createRequest = (savedInvoice: ErpInvoice = draftInvoice) =>
  jest.fn(async ({ method, path }: MockRequestInput) => {
    if (method === 'GET' && path === '/tiers') return [tier];
    if (method === 'POST' && path === '/invoices') return savedInvoice;
    throw new Error(`Unexpected request ${method} ${path}`);
  });

const editRequest = (sourceInvoice: ErpInvoice = draftInvoice) =>
  jest.fn(async ({ method, path }: MockRequestInput) => {
    if (method === 'GET' && path === '/tiers') return [tier];
    if (method === 'GET' && path === `/invoices/${INVOICE_ID}`)
      return sourceInvoice;
    if (method === 'PATCH' && path === `/invoices/${INVOICE_ID}`)
      return sourceInvoice;
    throw new Error(`Unexpected request ${method} ${path}`);
  });

const fillRequiredFields = async () => {
  await userEvent.type(screen.getByLabelText('Titre'), 'Conseil CRM');
  await userEvent.type(screen.getByLabelText('Description 1'), 'Diagnostic');
  await userEvent.clear(screen.getByLabelText('Prix unitaire HT 1'));
  await userEvent.type(screen.getByLabelText('Prix unitaire HT 1'), '0.29');
};

const mutationCount = (request: jest.Mock, method: 'POST' | 'PATCH') =>
  request.mock.calls.filter(
    ([input]) => input.method === method && input.path.startsWith('/invoices'),
  ).length;

const attemptNavigation = async (
  router: ReturnType<typeof createMemoryRouter>,
) => {
  await act(async () => {
    await router.navigate('/erp-maroc/invoices');
  });
};

describe('ErpInvoiceEditorPage', () => {
  beforeEach(() => jest.clearAllMocks());

  it('creates an invoice with deterministic due date and exact MAD/payment payload', async () => {
    const request = createRequest();
    const { createMutationIntent, onSaved } = renderPage(request);
    await screen.findByLabelText('Titre');

    expect(screen.getByLabelText("Date d'émission")).toHaveValue('2026-07-12');
    expect(screen.getByLabelText("Date d'échéance")).toHaveValue('2026-08-11');
    await fillRequiredFields();
    await userEvent.selectOptions(
      screen.getByLabelText('Mode de paiement'),
      'BANK_TRANSFER',
    );
    await userEvent.type(
      screen.getByLabelText('Référence de paiement'),
      'VIR-99',
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Créer la facture' }),
    );

    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(draftInvoice));
    expect(createMutationIntent).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'POST',
        path: '/invoices',
        body: expect.objectContaining({
          societeId: SOCIETE_ID,
          issueDate: '2026-07-12',
          dueDate: '2026-08-11',
          paymentMethod: 'BANK_TRANSFER',
          paymentReference: 'VIR-99',
          lines: [
            expect.objectContaining({
              description: 'Diagnostic',
              unitPriceHt: 0.29,
            }),
          ],
        }),
      }),
      { idempotency: 'forbidden' },
    );
  });

  it('locks duplicate manual submissions before the create button rerenders', async () => {
    let resolveRequest: ((value: typeof draftInvoice) => void) | undefined;
    const request = jest.fn(({ method, path }: MockRequestInput) => {
      if (method === 'GET' && path === '/tiers') return Promise.resolve([tier]);
      if (method === 'POST' && path === '/invoices')
        return new Promise<typeof draftInvoice>((resolve) => {
          resolveRequest = resolve;
        });
      throw new Error(`Unexpected request ${method} ${path}`);
    });
    const { onSaved } = renderPage(request);
    await screen.findByLabelText('Titre');
    await fillRequiredFields();

    const submit = screen.getByRole('button', { name: 'Créer la facture' });
    fireEvent.click(submit);
    await waitFor(() => expect(mutationCount(request, 'POST')).toBe(1));
    fireEvent.click(submit);
    expect(mutationCount(request, 'POST')).toBe(1);

    await act(async () => {
      resolveRequest?.(draftInvoice);
    });
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(draftInvoice));
  });

  it('maps a draft invoice to editable MAD and payment fields then PATCHes it', async () => {
    const request = editRequest();
    const { createMutationIntent, onSaved } = renderPage(request, {
      invoiceId: INVOICE_ID,
    });
    expect(await screen.findByDisplayValue('1234.50')).toBeVisible();
    expect(screen.getByLabelText('Mode de paiement')).toHaveValue(
      'BANK_TRANSFER',
    );
    expect(screen.getByLabelText('Référence de paiement')).toHaveValue(
      'VIR-42',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));

    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(draftInvoice));
    expect(createMutationIntent).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'PATCH',
        path: `/invoices/${INVOICE_ID}`,
      }),
      { idempotency: 'forbidden' },
    );
  });

  it('blocks non-draft and unauthorised invoice editing without a mutation', async () => {
    const sentInvoice = { ...draftInvoice, status: 'SENT' as const };
    const nonDraftRequest = editRequest(sentInvoice);
    renderPage(nonDraftRequest, { invoiceId: INVOICE_ID });
    expect(
      await screen.findByText('Cette facture ne peut plus être modifiée.'),
    ).toBeVisible();
    expect(mutationCount(nonDraftRequest, 'PATCH')).toBe(0);

    const deniedRequest = createRequest();
    renderPage(deniedRequest, { canManage: false });
    expect(
      await screen.findByText(
        "Vous n'avez pas la permission de gérer les factures.",
      ),
    ).toBeVisible();
    expect(mutationCount(deniedRequest, 'POST')).toBe(0);
  });

  it('keeps ordinary failed values correctable and blocks dirty navigation', async () => {
    const request = jest.fn(async ({ method, path }: MockRequestInput) => {
      if (method === 'GET' && path === '/tiers') return [tier];
      if (method === 'POST' && path === '/invoices')
        throw new ErpMarocError('ERP_UNKNOWN', 400);
      throw new Error(`Unexpected request ${method} ${path}`);
    });
    const { router } = renderPage(request);
    await screen.findByLabelText('Titre');
    await fillRequiredFields();
    await userEvent.click(
      screen.getByRole('button', { name: 'Créer la facture' }),
    );
    expect(
      await screen.findByText("Impossible d'enregistrer la facture."),
    ).toBeVisible();
    expect(screen.getByLabelText('Titre')).toHaveValue('Conseil CRM');

    await attemptNavigation(router);
    expect(
      await screen.findByRole('dialog', { name: 'Quitter cette facture ?' }),
    ).toBeInTheDocument();
  });

  it('permanently locks an ambiguous create and only offers a safe return', async () => {
    const request = jest.fn(async ({ method, path }: MockRequestInput) => {
      if (method === 'GET' && path === '/tiers') return [tier];
      if (method === 'POST' && path === '/invoices') throw new Error('network');
      if (method === 'GET' && path === '/invoices')
        return { items: [], nextCursor: null };
      throw new Error(`Unexpected request ${method} ${path}`);
    });
    const { router } = renderPage(request);
    await screen.findByLabelText('Titre');
    await fillRequiredFields();
    await userEvent.click(
      screen.getByRole('button', { name: 'Créer la facture' }),
    );
    expect(await screen.findByText('Création à vérifier')).toBeVisible();
    expect(
      screen.getByRole('button', { name: 'Créer la facture' }),
    ).toBeDisabled();
    await userEvent.click(
      screen.getByRole('button', { name: 'Retour aux factures' }),
    );
    await waitFor(() =>
      expect(router.state.location.pathname).toBe('/erp-maroc/invoices'),
    );
    expect(mutationCount(request, 'POST')).toBe(1);
  });

  it('applies the authoritative non-draft state after an edit conflict', async () => {
    const sentInvoice = { ...draftInvoice, status: 'SENT' as const };
    let getCount = 0;
    const request = jest.fn(async ({ method, path }: MockRequestInput) => {
      if (method === 'GET' && path === '/tiers') return [tier];
      if (method === 'GET' && path === `/invoices/${INVOICE_ID}`) {
        getCount += 1;
        return getCount === 1 ? draftInvoice : sentInvoice;
      }
      if (method === 'PATCH' && path === `/invoices/${INVOICE_ID}`)
        throw new ErpMarocError('ERP_UNKNOWN', 409);
      throw new Error(`Unexpected request ${method} ${path}`);
    });
    renderPage(request, { invoiceId: INVOICE_ID });
    await screen.findByLabelText('Titre');
    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));
    expect(
      await screen.findByText('Cette facture ne peut plus être modifiée.'),
    ).toBeVisible();
  });

  it('uses the authoritative detail as the only safe exit after a 5xx edit reconciliation', async () => {
    const sentInvoice = { ...draftInvoice, status: 'SENT' as const };
    let readCount = 0;
    const request = jest.fn(async ({ method, path }: MockRequestInput) => {
      if (method === 'GET' && path === '/tiers') return [tier];
      if (method === 'GET' && path === `/invoices/${INVOICE_ID}`) {
        readCount += 1;
        return readCount === 1 ? draftInvoice : sentInvoice;
      }
      if (method === 'PATCH' && path === `/invoices/${INVOICE_ID}`)
        throw new ErpMarocError('ERP_UNKNOWN', 500);
      throw new Error(`Unexpected request ${method} ${path}`);
    });
    const { router } = renderPage(request, { invoiceId: INVOICE_ID });
    await screen.findByLabelText('Titre');
    await userEvent.clear(screen.getByLabelText('Titre'));
    await userEvent.type(screen.getByLabelText('Titre'), 'Valeur locale');

    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));

    expect(
      await screen.findByText('Cette facture ne peut plus être modifiée.'),
    ).toBeVisible();
    expect(
      screen.queryByRole('button', { name: 'Enregistrer' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Réessayer la vérification' }),
    ).not.toBeInTheDocument();

    await userEvent.click(
      screen.getByRole('link', { name: 'Retour à la facture' }),
    );

    await waitFor(() =>
      expect(router.state.location.pathname).toBe(
        `/erp-maroc/invoices/${INVOICE_ID}`,
      ),
    );
    expect(mutationCount(request, 'PATCH')).toBe(1);
  });

  it('resets the authoritative detail bypass when its navigation is prevented', async () => {
    const sentInvoice = { ...draftInvoice, status: 'SENT' as const };
    let readCount = 0;
    const request = jest.fn(async ({ method, path }: MockRequestInput) => {
      if (method === 'GET' && path === '/tiers') return [tier];
      if (method === 'GET' && path === `/invoices/${INVOICE_ID}`) {
        readCount += 1;
        return readCount === 1 ? draftInvoice : sentInvoice;
      }
      if (method === 'PATCH' && path === `/invoices/${INVOICE_ID}`)
        throw new ErpMarocError('ERP_UNKNOWN', 500);
      throw new Error(`Unexpected request ${method} ${path}`);
    });
    const { router } = renderPage(request, { invoiceId: INVOICE_ID });
    await screen.findByLabelText('Titre');
    await userEvent.clear(screen.getByLabelText('Titre'));
    await userEvent.type(screen.getByLabelText('Titre'), 'Valeur locale');
    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));

    const detailLink = await screen.findByRole('link', {
      name: 'Retour à la facture',
    });
    const preventNavigation = (event: Event) => event.preventDefault();
    detailLink.addEventListener('click', preventNavigation, { once: true });

    fireEvent.click(detailLink);
    expect(router.state.location.pathname).toBe(
      `/erp-maroc/invoices/${INVOICE_ID}/edit`,
    );

    await act(async () => {
      await Promise.resolve();
    });
    await attemptNavigation(router);

    expect(router.state.location.pathname).toBe(
      `/erp-maroc/invoices/${INVOICE_ID}/edit`,
    );
    expect(mutationCount(request, 'PATCH')).toBe(1);
  });

  it('keeps local draft values after a conflict until reconciliation is acknowledged', async () => {
    let patchCount = 0;
    let getCount = 0;
    const request = jest.fn(async ({ method, path }: MockRequestInput) => {
      if (method === 'GET' && path === '/tiers') return [tier];
      if (method === 'GET' && path === `/invoices/${INVOICE_ID}`) {
        getCount += 1;
        return draftInvoice;
      }
      if (method === 'PATCH' && path === `/invoices/${INVOICE_ID}`) {
        patchCount += 1;
        if (patchCount === 1) throw new ErpMarocError('ERP_UNKNOWN', 409);
        return draftInvoice;
      }
      throw new Error(`Unexpected request ${method} ${path}`);
    });
    const { onSaved } = renderPage(request, { invoiceId: INVOICE_ID });
    expect(await screen.findByLabelText('Titre')).toHaveValue(
      'Déploiement CRM',
    );
    await userEvent.clear(screen.getByLabelText('Titre'));
    await userEvent.type(screen.getByLabelText('Titre'), 'Valeur locale');
    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));

    expect(
      await screen.findByText('Conflit de facture détecté.'),
    ).toBeVisible();
    expect(screen.getByLabelText('Titre')).toHaveValue('Valeur locale');
    await userEvent.click(screen.getByRole('button', { name: "J'ai vérifié" }));
    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(draftInvoice));
    expect(getCount).toBe(2);
  });

  it('classifies an edit 5xx as an uncertain state before reconciliation', async () => {
    const request = jest.fn(async ({ method, path }: MockRequestInput) => {
      if (method === 'GET' && path === '/tiers') return [tier];
      if (method === 'GET' && path === `/invoices/${INVOICE_ID}`)
        return draftInvoice;
      if (method === 'PATCH' && path === `/invoices/${INVOICE_ID}`)
        throw new ErpMarocError('ERP_UNKNOWN', 500);
      throw new Error(`Unexpected request ${method} ${path}`);
    });
    renderPage(request, { invoiceId: INVOICE_ID });
    await screen.findByLabelText('Titre');
    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));

    expect(
      await screen.findByText('État de la facture à vérifier.'),
    ).toBeVisible();
    expect(screen.getByRole('button', { name: "J'ai vérifié" })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Enregistrer' })).toBeDisabled();
    expect(mutationCount(request, 'PATCH')).toBe(1);
  });
});
