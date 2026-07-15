import { type ErpMarocPdfRequest } from '@/erp-maroc/api/erpMarocClient';
import { ErpMarocError } from '@/erp-maroc/api/erpMarocError';
import { useErpMarocContext } from '@/erp-maroc/context/useErpMarocContext';
import { pollInvoicePdf } from '@/erp-maroc/invoices/pollInvoicePdf';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { type ErpInvoiceRead } from 'twenty-shared/erp-maroc';

// oxlint-disable-next-line eslint/no-restricted-imports -- Pages are outside the @/ modules alias.
import { ErpInvoiceDetailPage } from '../ErpInvoiceDetailPage';

jest.mock('@/erp-maroc/context/useErpMarocContext', () => ({
  useErpMarocContext: jest.fn(),
}));

jest.mock('@/erp-maroc/invoices/pollInvoicePdf', () => ({
  pollInvoicePdf: jest.fn(),
}));

const SOCIETE_ID = '89c90690-4f4a-4e2e-91ce-3700f16a8ca1';
const TIER_ID = '49b11318-8d30-43ab-bbf4-fb16ce1867ba';
const INVOICE_ID = '89c90690-4f4a-4e2e-91ce-3700f16a8ca2';
const NEXT_INVOICE_ID = '89c90690-4f4a-4e2e-91ce-3700f16a8ca4';
const QUOTE_ID = '09c90690-4f4a-4e2e-91ce-3700f16a8ca3';

const invoice: ErpInvoiceRead = {
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
  totalHtCents: 350_000,
  totalTvaCents: 70_000,
  totalTtcCents: 420_000,
  validatedAt: null,
  sentAt: null,
  emailRecipient: 'facturation@atlas.example',
  pdfGenerationStatus: 'NOT_REQUESTED' as const,
  pdfDocumentReference: null,
  pdfGeneratedAt: null,
  sellerRaisonSocialeSnapshot: 'Zowka SARL',
  sellerIceSnapshot: '001234567000089',
  sellerIdentifiantFiscalSnapshot: '12345678',
  sellerRcSnapshot: 'RC-12345',
  sellerCnssSnapshot: 'CNSS-1234',
  sellerAddressSnapshot: '10, rue Atlas',
  sellerCitySnapshot: 'Casablanca',
  sellerTaxeProfessionnelleArticleSnapshot: 'TP-42',
  customerNameSnapshot: 'Atlas Conseil',
  customerEmailSnapshot: 'facturation@atlas.example',
  customerPhoneSnapshot: '0522000000',
  customerIceSnapshot: '001234567000012',
  customerIdentifiantFiscalSnapshot: null,
  customerAddressSnapshot: '12, avenue Hassan II',
  customerCitySnapshot: 'Rabat',
  legalSnapshotVerificationStatus: 'PENDING' as const,
  legalSnapshotVerifiedAt: null,
  legalSnapshotVerificationNote: 'Mentions légales prêtes',
  createdAt: '2026-07-12T08:00:00Z',
  updatedAt: '2026-07-12T08:00:00Z',
  paidCents: 0,
  outstandingCents: 420_000,
  isOverdue: false,
  collections: {
    paymentCents: 100_000,
    creditAppliedCents: 50_000,
    creditNoteCents: 50_000,
    outstandingCents: 270_000,
  },
  tier: {
    id: TIER_ID,
    name: 'Atlas Conseil',
    email: 'facturation@atlas.example',
    phone: '0522000000',
    ice: '001234567000012',
    identifiantFiscal: null,
    address: '12, avenue Hassan II',
    city: 'Rabat',
    paymentDelayDays: 30,
  },
  societe: {
    id: SOCIETE_ID,
    raisonSociale: 'Zowka SARL',
    ice: '001234567000089',
    identifiantFiscal: '12345678',
    rc: 'RC-12345',
    cnss: 'CNSS-1234',
    address: '10, rue Atlas',
    city: 'Casablanca',
    taxeProfessionnelleArticle: 'TP-42',
  },
  sourceQuote: {
    id: QUOTE_ID,
    number: 'DEV-2026-0017',
    status: 'ACCEPTED' as const,
  },
  emailDelivery: {
    status: 'SENT' as const,
    sentAt: '2026-07-12T10:00:00Z',
    providerAcceptedAt: '2026-07-12T10:00:01Z',
  },
  lines: [
    {
      id: 'c24db3d3-6353-4f7c-a47e-6a1e44799e38',
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
      id: '510b8d2f-d0ce-4683-a348-c68a206a9845',
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
  ],
};

type MockRequestInput = {
  method: string;
  path: string;
  signal?: AbortSignal;
};

type MockPdfRequestInput = Pick<ErpMarocPdfRequest, 'path' | 'signal'>;

const LocationProbe = () => {
  const location = useLocation();

  return (
    <div data-testid="current-url">{`${location.pathname}${location.search}`}</div>
  );
};

const asInvoice = (extra: Partial<ErpInvoiceRead> = {}): ErpInvoiceRead => ({
  ...invoice,
  ...extra,
});

const ordinaryDraftInvoice: ErpInvoiceRead = {
  ...invoice,
  sellerRaisonSocialeSnapshot: null,
  sellerIceSnapshot: null,
  sellerIdentifiantFiscalSnapshot: null,
  sellerRcSnapshot: null,
  sellerCnssSnapshot: null,
  sellerAddressSnapshot: null,
  sellerCitySnapshot: null,
  sellerTaxeProfessionnelleArticleSnapshot: null,
  customerNameSnapshot: null,
  customerEmailSnapshot: null,
  customerPhoneSnapshot: null,
  customerIceSnapshot: null,
  customerIdentifiantFiscalSnapshot: null,
  customerAddressSnapshot: null,
  customerCitySnapshot: null,
};

const validatedInvoice = asInvoice({
  status: 'VALIDATED',
  number: 'FAC-2026-0042',
  validatedAt: '2026-07-12T11:30:00Z',
  legalSnapshotVerificationStatus: 'VERIFIED',
  legalSnapshotVerifiedAt: '2026-07-12T11:30:00Z',
  pdfGenerationStatus: 'PENDING',
});

const generatedInvoice = asInvoice({
  ...validatedInvoice,
  pdfGenerationStatus: 'GENERATED',
  pdfDocumentReference: 'invoices/FAC-2026-0042.pdf',
  pdfGeneratedAt: '2026-07-12T11:31:00Z',
});

const overdueInvoice = asInvoice({
  status: 'OVERDUE',
  validatedAt: '2026-07-12T11:30:00Z',
  legalSnapshotVerificationStatus: 'VERIFIED',
  legalSnapshotVerifiedAt: '2026-07-12T11:30:00Z',
  pdfGenerationStatus: 'PENDING',
});

const generatedOverdueInvoice = asInvoice({
  ...overdueInvoice,
  pdfGenerationStatus: 'GENERATED',
  pdfDocumentReference: 'invoices/FAC-2026-0042.pdf',
  pdfGeneratedAt: '2026-07-12T11:31:00Z',
});

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
  invoiceId?: string;
  contextStatus?: 'ready' | 'forbidden';
  role?: 'OWNER' | 'ADMIN' | 'COMPTABLE' | 'COMMERCIAL';
  canManage?: boolean;
  canCreatePendingPayment?: boolean;
  canManageCreditNotes?: boolean;
};

const renderPage = (
  request: jest.Mock,
  pdf: jest.Mock = jest.fn(),
  {
    invoiceId = INVOICE_ID,
    contextStatus = 'ready',
    role = 'COMMERCIAL',
    canManage = true,
    canCreatePendingPayment = false,
    canManageCreditNotes = false,
  }: RenderOptions = {},
) => {
  const access = {
    canManage,
    canCreatePendingPayment,
    canManageCreditNotes,
  };
  const createMutationIntent = jest.fn((input, options) => ({
    execute: () => request(input),
    options,
  }));

  jest.mocked(useErpMarocContext).mockReturnValue(
    contextStatus === 'forbidden'
      ? ({
          status: 'forbidden',
          context: null,
          error: null,
          refetch: jest.fn(),
          client: { request, pdf, createMutationIntent },
        } as never)
      : ({
          status: 'ready',
          context: {
            role,
            societeId: SOCIETE_ID,
            capabilities: {
              get manageSalesDocuments() {
                return access.canManage;
              },
              get createPendingPayment() {
                return access.canCreatePendingPayment;
              },
              get manageCreditNotes() {
                return access.canManageCreditNotes;
              },
            },
            features: { invoiceValidation: true, invoiceEmail: true },
          },
          error: null,
          refetch: jest.fn(),
          client: { request, pdf, createMutationIntent },
        } as never),
  );

  const renderInvoice = (currentInvoiceId: string) => (
    <MemoryRouter
      future={{ v7_relativeSplatPath: true, v7_startTransition: true }}
    >
      <ErpInvoiceDetailPage invoiceId={currentInvoiceId} />
      <LocationProbe />
    </MemoryRouter>
  );
  const rendered = render(renderInvoice(invoiceId));

  return {
    access,
    createMutationIntent,
    pdf,
    rerenderInvoice: (nextInvoiceId: string) =>
      rendered.rerender(renderInvoice(nextInvoiceId)),
    ...rendered,
  };
};

const getRequest = (loadedInvoice: ErpInvoiceRead = asInvoice()) =>
  jest.fn(async ({ method, path }: MockRequestInput) => {
    if (method === 'GET' && path === `/invoices/${INVOICE_ID}`)
      return loadedInvoice;
    throw new Error(`Unexpected request ${method} ${path}`);
  });

const validationPosts = (request: jest.Mock) =>
  request.mock.calls.filter(
    ([input]) =>
      input.method === 'POST' &&
      input.path === `/invoices/${INVOICE_ID}/validate`,
  );

const confirmValidation = async () => {
  await userEvent.click(await screen.findByRole('button', { name: 'Valider' }));
  return screen.getByTestId('erp-confirm-dialog-confirm');
};

describe('ErpInvoiceDetailPage', () => {
  const originalCreateObjectURL = URL.createObjectURL;
  const originalRevokeObjectURL = URL.revokeObjectURL;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(pollInvoicePdf).mockResolvedValue({
      status: 'generated',
      invoice: generatedInvoice,
    });
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: jest.fn(() => 'blob:invoice-pdf'),
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: jest.fn(),
    });
  });

  afterAll(() => {
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: originalCreateObjectURL,
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: originalRevokeObjectURL,
    });
  });

  it('loads the legal, payment, delivery, source and line-item detail', async () => {
    renderPage(getRequest());

    expect(screen.getByRole('status')).toHaveTextContent(
      'Chargement de la facture',
    );
    expect(
      await screen.findByRole('heading', { name: 'FAC-2026-0042' }),
    ).toBeVisible();
    expect(screen.getAllByText('Atlas Conseil')[0]).toBeVisible();
    expect(screen.getByText('12/07/2026')).toBeVisible();
    expect(screen.getByText('11/08/2026')).toBeVisible();
    expect(screen.getByText('Virement bancaire')).toBeVisible();
    expect(screen.getByText('VIR-42')).toBeVisible();
    expect(screen.getByText('Vérification en attente')).toBeVisible();
    expect(screen.getByText('Mentions légales prêtes')).toBeVisible();
    expect(screen.getByText('Courriel envoyé')).toBeVisible();
    expect(screen.getByRole('link', { name: 'DEV-2026-0017' })).toHaveAttribute(
      'href',
      `/erp-maroc/quotes/${QUOTE_ID}`,
    );
    expect(screen.getByText('Audit et configuration')).toBeVisible();
    expect(screen.getByText('Formation utilisateurs')).toBeVisible();
    expect(screen.getByTestId('invoice-total-ht')).toHaveTextContent(
      '3 500,00 MAD',
    );
    expect(screen.getByTestId('invoice-tax-20')).toHaveTextContent(
      '700,00 MAD',
    );
    expect(screen.getByTestId('invoice-total-ttc')).toHaveTextContent(
      '4 200,00 MAD',
    );
    expect(screen.getByText('Total légal TTC')).toBeVisible();
    expect(screen.getByTestId('invoice-collection-payments')).toHaveTextContent(
      '1 000,00 MAD',
    );
    expect(screen.getByTestId('invoice-collection-credits')).toHaveTextContent(
      '500,00 MAD',
    );
    expect(
      screen.getByTestId('invoice-collection-outstanding'),
    ).toHaveTextContent('2 700,00 MAD');
  });

  it('navigates to a new payment for an unpaid invoice', async () => {
    renderPage(getRequest(validatedInvoice), jest.fn(), {
      canCreatePendingPayment: true,
    });

    await userEvent.click(
      await screen.findByRole('button', {
        name: 'Enregistrer un règlement',
      }),
    );

    expect(screen.getByTestId('current-url')).toHaveTextContent(
      `/erp-maroc/payments/new?invoiceId=${INVOICE_ID}&tierId=${TIER_ID}`,
    );
  });

  it('navigates to a new credit note from an eligible invoice', async () => {
    renderPage(getRequest(validatedInvoice), jest.fn(), {
      role: 'COMPTABLE',
      canManageCreditNotes: true,
    });

    await userEvent.click(
      await screen.findByRole('button', { name: 'Créer un avoir' }),
    );

    expect(screen.getByTestId('current-url')).toHaveTextContent(
      `/erp-maroc/credit-notes/new?invoiceId=${INVOICE_ID}`,
    );
  });

  it('renders missing, failed and permission-denied states', async () => {
    const missingRequest = jest.fn(async () => {
      throw new ErpMarocError('ERP_NOT_FOUND', 404);
    });
    const { unmount } = renderPage(missingRequest);
    expect(await screen.findByText('Facture introuvable')).toBeVisible();
    unmount();

    const failedRequest = jest.fn(async () => {
      throw new Error('offline');
    });
    const failed = renderPage(failedRequest);
    expect(
      await screen.findByText('Impossible de charger la facture'),
    ).toBeVisible();
    failed.unmount();

    renderPage(jest.fn(), jest.fn(), { contextStatus: 'forbidden' });
    expect(
      await screen.findByText(
        "Vous n'avez pas la permission de consulter cette facture.",
      ),
    ).toBeVisible();
  });

  it('validates once, applies the authoritative response and starts PDF polling', async () => {
    const mutation = deferred<ErpInvoiceRead>();
    const request = jest.fn(({ method, path }: MockRequestInput) => {
      if (method === 'GET' && path === `/invoices/${INVOICE_ID}`)
        return Promise.resolve(asInvoice());
      if (method === 'POST' && path === `/invoices/${INVOICE_ID}/validate`)
        return mutation.promise;
      throw new Error(`Unexpected request ${method} ${path}`);
    });
    const { createMutationIntent } = renderPage(request);
    const confirm = await confirmValidation();

    fireEvent.click(confirm);
    fireEvent.click(confirm);
    expect(validationPosts(request)).toHaveLength(1);
    expect(createMutationIntent).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'POST',
        path: `/invoices/${INVOICE_ID}/validate`,
      }),
      { idempotency: 'forbidden' },
    );

    await act(async () => mutation.resolve(validatedInvoice));
    expect(await screen.findByText('Validée')).toBeVisible();
    await waitFor(() => expect(pollInvoicePdf).toHaveBeenCalledTimes(1));
    expect(screen.getByText('PDF généré')).toBeVisible();
  });

  it('validates an ordinary DRAFT before legal snapshots are captured', async () => {
    const request = jest.fn(async ({ method, path }: MockRequestInput) => {
      if (method === 'GET' && path === `/invoices/${INVOICE_ID}`)
        return ordinaryDraftInvoice;
      if (method === 'POST' && path === `/invoices/${INVOICE_ID}/validate`)
        return validatedInvoice;
      throw new Error(`Unexpected request ${method} ${path}`);
    });
    renderPage(request);

    fireEvent.click(await confirmValidation());

    expect(await screen.findByText('Validée')).toBeVisible();
    expect(validationPosts(request)).toHaveLength(1);
  });

  it('accepts an OVERDUE validation response as authoritative and starts PDF polling', async () => {
    jest.mocked(pollInvoicePdf).mockResolvedValueOnce({
      status: 'generated',
      invoice: generatedOverdueInvoice,
    });
    const request = jest.fn(async ({ method, path }: MockRequestInput) => {
      if (method === 'GET' && path === `/invoices/${INVOICE_ID}`)
        return asInvoice();
      if (method === 'POST' && path === `/invoices/${INVOICE_ID}/validate`)
        return overdueInvoice;
      throw new Error(`Unexpected request ${method} ${path}`);
    });
    renderPage(request);
    fireEvent.click(await confirmValidation());

    expect(await screen.findByText('Échue')).toBeVisible();
    await waitFor(() => expect(pollInvoicePdf).toHaveBeenCalledTimes(1));
    expect(
      screen.queryByText('Validation à vérifier.'),
    ).not.toBeInTheDocument();
  });

  it('reconciles a validation conflict from the authoritative invoice without another POST', async () => {
    let reads = 0;
    const request = jest.fn(async ({ method, path }: MockRequestInput) => {
      if (method === 'GET' && path === `/invoices/${INVOICE_ID}`) {
        reads += 1;
        return reads === 1 ? asInvoice() : validatedInvoice;
      }
      if (method === 'POST' && path === `/invoices/${INVOICE_ID}/validate`)
        throw new ErpMarocError('ERP_STATE_CONFLICT', 409);
      throw new Error(`Unexpected request ${method} ${path}`);
    });
    renderPage(request);
    fireEvent.click(await confirmValidation());

    expect(await screen.findByText('Validée')).toBeVisible();
    expect(screen.getByText('Conflit de validation détecté.')).toBeVisible();
    expect(validationPosts(request)).toHaveLength(1);
    expect(reads).toBe(2);
  });

  it('keeps a 5xx validation result uncertain until the user acknowledges it', async () => {
    let reads = 0;
    const request = jest.fn(async ({ method, path }: MockRequestInput) => {
      if (method === 'GET' && path === `/invoices/${INVOICE_ID}`) {
        reads += 1;
        return asInvoice();
      }
      if (method === 'POST' && path === `/invoices/${INVOICE_ID}/validate`)
        throw new ErpMarocError('ERP_UNKNOWN', 503);
      throw new Error(`Unexpected request ${method} ${path}`);
    });
    renderPage(request);
    fireEvent.click(await confirmValidation());

    expect(await screen.findByText('Validation à vérifier.')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Valider' })).toBeDisabled();
    expect(validationPosts(request)).toHaveLength(1);
    expect(reads).toBe(2);
  });

  it('cancels reconciliation and lets the next DRAFT invoice validate', async () => {
    const pendingReconciliation = deferred<ErpInvoiceRead>();
    const nextInvoice = asInvoice({
      id: NEXT_INVOICE_ID,
      number: 'FAC-2026-0043',
    });
    let firstInvoiceReads = 0;
    const request = jest.fn(({ method, path }: MockRequestInput) => {
      if (method === 'GET' && path === `/invoices/${INVOICE_ID}`) {
        firstInvoiceReads += 1;
        return firstInvoiceReads === 1
          ? Promise.resolve(asInvoice())
          : pendingReconciliation.promise;
      }
      if (method === 'POST' && path === `/invoices/${INVOICE_ID}/validate`)
        return Promise.reject(new ErpMarocError('ERP_UNKNOWN', 503));
      if (method === 'GET' && path === `/invoices/${NEXT_INVOICE_ID}`)
        return Promise.resolve(nextInvoice);
      if (method === 'POST' && path === `/invoices/${NEXT_INVOICE_ID}/validate`)
        return Promise.resolve(
          asInvoice({ ...nextInvoice, status: 'VALIDATED' }),
        );
      throw new Error(`Unexpected request ${method} ${path}`);
    });
    const { rerenderInvoice } = renderPage(request);

    fireEvent.click(await confirmValidation());
    await waitFor(() => expect(firstInvoiceReads).toBe(2));
    const reconciliationRequest = request.mock.calls
      .filter(
        ([input]) =>
          input.method === 'GET' && input.path === `/invoices/${INVOICE_ID}`,
      )
      .at(-1)?.[0];

    await act(async () => {
      rerenderInvoice(NEXT_INVOICE_ID);
    });

    expect(reconciliationRequest?.signal?.aborted).toBe(true);
    expect(
      await screen.findByRole('heading', { name: 'FAC-2026-0043' }),
    ).toBeVisible();
    const nextValidation = screen.getAllByRole('button', {
      name: 'Valider',
    })[0];
    expect(nextValidation).not.toBeDisabled();

    fireEvent.click(nextValidation);
    fireEvent.click(screen.getByTestId('erp-confirm-dialog-confirm'));
    expect(await screen.findByText('Validée')).toBeVisible();
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'POST',
        path: `/invoices/${NEXT_INVOICE_ID}/validate`,
      }),
    );
  });

  it('does not offer validation for a non-draft invoice and reports a PDF timeout honestly', async () => {
    jest.mocked(pollInvoicePdf).mockResolvedValueOnce({
      status: 'timeout',
      invoice: validatedInvoice,
    });
    const request = jest.fn(async ({ method, path }: MockRequestInput) => {
      if (method === 'GET' && path === `/invoices/${INVOICE_ID}`)
        return asInvoice();
      if (method === 'POST' && path === `/invoices/${INVOICE_ID}/validate`)
        return validatedInvoice;
      throw new Error(`Unexpected request ${method} ${path}`);
    });
    const { unmount } = renderPage(request);
    fireEvent.click(await confirmValidation());
    expect(
      await screen.findByText('La génération du PDF est toujours en cours.'),
    ).toBeVisible();
    expect(
      screen.queryByRole('button', { name: 'Valider' }),
    ).not.toBeInTheDocument();
    unmount();

    renderPage(getRequest(validatedInvoice));
    expect(
      await screen.findByRole('heading', { name: 'FAC-2026-0042' }),
    ).toBeVisible();
    expect(
      screen.queryByRole('button', { name: 'Valider' }),
    ).not.toBeInTheDocument();
  });

  it('aborts an in-flight PDF poll when the detail page unmounts', async () => {
    const pendingPoll = deferred<{ status: 'aborted' }>();
    jest.mocked(pollInvoicePdf).mockImplementationOnce(({ signal }) => {
      signal?.addEventListener('abort', () =>
        pendingPoll.resolve({ status: 'aborted' }),
      );
      return pendingPoll.promise;
    });
    const request = jest.fn(async ({ method, path }: MockRequestInput) => {
      if (method === 'GET' && path === `/invoices/${INVOICE_ID}`)
        return asInvoice();
      if (method === 'POST' && path === `/invoices/${INVOICE_ID}/validate`)
        return validatedInvoice;
      throw new Error(`Unexpected request ${method} ${path}`);
    });
    const { unmount } = renderPage(request);
    fireEvent.click(await confirmValidation());
    await waitFor(() => expect(pollInvoicePdf).toHaveBeenCalledTimes(1));
    const [[{ signal }]] = jest.mocked(pollInvoicePdf).mock.calls;

    unmount();
    expect(signal?.aborted).toBe(true);
  });

  it('downloads the generated PDF once through the authenticated client and revokes its object URL', async () => {
    const pdfResult = deferred<Blob>();
    const pdf = jest.fn(() => pdfResult.promise);
    const request = getRequest(generatedInvoice);
    const click = jest
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);
    renderPage(request, pdf);

    const download = await screen.findByRole('button', {
      name: 'Télécharger le PDF',
    });
    fireEvent.click(download);
    fireEvent.click(download);
    expect(pdf).toHaveBeenCalledTimes(1);
    expect(pdf).toHaveBeenCalledWith({
      method: 'GET',
      path: `/invoices/${INVOICE_ID}/pdf`,
      responseType: 'pdf',
      signal: expect.any(AbortSignal),
    });

    await act(async () =>
      pdfResult.resolve(new Blob(['pdf'], { type: 'application/pdf' })),
    );
    await waitFor(() => expect(URL.createObjectURL).toHaveBeenCalledTimes(1));
    expect(click).toHaveBeenCalledTimes(1);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:invoice-pdf');
    click.mockRestore();
  });

  it('aborts a stale PDF download and releases download state for the next invoice', async () => {
    const pendingDownload = deferred<Blob>();
    const nextInvoice = asInvoice({
      id: NEXT_INVOICE_ID,
      number: 'FAC-2026-0043',
      pdfGenerationStatus: 'GENERATED',
      pdfDocumentReference: 'invoices/FAC-2026-0043.pdf',
    });
    const request = jest.fn(async ({ method, path }: MockRequestInput) => {
      if (method !== 'GET')
        throw new Error(`Unexpected request ${method} ${path}`);
      if (path === `/invoices/${INVOICE_ID}`) return generatedInvoice;
      if (path === `/invoices/${NEXT_INVOICE_ID}`) return nextInvoice;
      throw new Error(`Unexpected request ${method} ${path}`);
    });
    const pdf = jest.fn(({ path }: MockPdfRequestInput) =>
      path === `/invoices/${INVOICE_ID}/pdf`
        ? pendingDownload.promise
        : Promise.resolve(new Blob(['pdf'], { type: 'application/pdf' })),
    );
    const click = jest
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);
    const { rerenderInvoice } = renderPage(request, pdf);

    fireEvent.click(
      await screen.findByRole('button', { name: 'Télécharger le PDF' }),
    );
    const [downloadRequest] = pdf.mock.calls[0];

    await act(async () => {
      rerenderInvoice(NEXT_INVOICE_ID);
    });

    expect(downloadRequest.signal?.aborted).toBe(true);
    expect(
      await screen.findByRole('heading', { name: 'FAC-2026-0043' }),
    ).toBeVisible();
    const nextDownload = screen.getByRole('button', {
      name: 'Télécharger le PDF',
    });
    expect(nextDownload).not.toBeDisabled();

    await act(async () =>
      pendingDownload.resolve(new Blob(['stale'], { type: 'application/pdf' })),
    );
    expect(URL.createObjectURL).not.toHaveBeenCalled();

    fireEvent.click(nextDownload);
    await waitFor(() => expect(pdf).toHaveBeenCalledTimes(2));
    expect(pdf).toHaveBeenLastCalledWith({
      method: 'GET',
      path: `/invoices/${NEXT_INVOICE_ID}/pdf`,
      responseType: 'pdf',
      signal: expect.any(AbortSignal),
    });
    click.mockRestore();
  });

  it('keeps a PDF download failure visible and releases the command for a later retry', async () => {
    const pdf = jest.fn().mockRejectedValue(new Error('network'));
    renderPage(getRequest(generatedInvoice), pdf);
    await userEvent.click(
      await screen.findByRole('button', { name: 'Télécharger le PDF' }),
    );

    expect(
      await screen.findByText('Impossible de télécharger le PDF.'),
    ).toBeVisible();
    expect(
      screen.getByRole('button', { name: 'Télécharger le PDF' }),
    ).not.toBeDisabled();
  });

  it('does not render a span directly inside a definition list', async () => {
    renderPage(getRequest());

    await screen.findByRole('heading', { name: 'FAC-2026-0042' });

    expect(document.querySelectorAll('dl > span')).toHaveLength(0);
  });
});
