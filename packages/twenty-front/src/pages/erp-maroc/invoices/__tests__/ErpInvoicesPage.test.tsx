import { useErpMarocContext } from '@/erp-maroc/context/useErpMarocContext';
import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';

// oxlint-disable-next-line eslint/no-restricted-imports -- Pages are outside the @/ modules alias.
import { ErpInvoicesPage } from '../ErpInvoicesPage';

jest.mock('@/erp-maroc/context/useErpMarocContext', () => ({
  useErpMarocContext: jest.fn(),
}));

const SOCIETE_ID = '89c90690-4f4a-4e2e-91ce-3700f16a8ca1';
const TIER_ID = '49b11318-8d30-43ab-bbf4-fb16ce1867ba';
const INVOICE_ID = '89c90690-4f4a-4e2e-91ce-3700f16a8ca2';
const SECOND_INVOICE_ID = '89c90690-4f4a-4e2e-91ce-3700f16a8ca3';
const FIRST_CURSOR = '89c90690-4f4a-4e2e-91ce-3700f16a8ca4';
const SECOND_CURSOR = '89c90690-4f4a-4e2e-91ce-3700f16a8ca5';

const invoice = {
  id: INVOICE_ID,
  societeId: SOCIETE_ID,
  tierId: TIER_ID,
  number: 'FAC-2026-0042',
  year: 2026,
  title: 'Déploiement CRM',
  currency: 'MAD' as const,
  status: 'VALIDATED' as const,
  issueDate: '2026-07-12',
  dueDate: '2026-08-12',
  notes: null,
  paymentMethod: null,
  paymentReference: null,
  totalHtCents: 100000,
  totalTvaCents: 20000,
  totalTtcCents: 120000,
  validatedAt: '2026-07-12T08:00:00Z',
  sentAt: null,
  emailRecipient: 'atlas@example.com',
  pdfGenerationStatus: 'GENERATED' as const,
  pdfDocumentReference: 'documents/fac-2026-0042.pdf',
  pdfGeneratedAt: '2026-07-12T08:00:00Z',
  sellerRaisonSocialeSnapshot: 'Zowka',
  sellerIceSnapshot: '001234567890123',
  sellerIdentifiantFiscalSnapshot: '12345678',
  sellerRcSnapshot: '123456',
  sellerCnssSnapshot: null,
  sellerAddressSnapshot: 'Casablanca',
  sellerCitySnapshot: 'Casablanca',
  sellerTaxeProfessionnelleArticleSnapshot: null,
  customerNameSnapshot: 'Atlas Conseil',
  customerEmailSnapshot: 'atlas@example.com',
  customerPhoneSnapshot: null,
  customerIceSnapshot: null,
  customerIdentifiantFiscalSnapshot: null,
  customerAddressSnapshot: 'Casablanca',
  customerCitySnapshot: 'Casablanca',
  legalSnapshotVerificationStatus: 'VERIFIED' as const,
  legalSnapshotVerifiedAt: '2026-07-12T08:00:00Z',
  legalSnapshotVerificationNote: null,
  createdAt: '2026-07-12T08:00:00Z',
  updatedAt: '2026-07-12T08:00:00Z',
  lines: [],
  tier: {
    id: TIER_ID,
    name: 'Atlas Conseil',
    email: 'atlas@example.com',
    phone: null,
  },
  societe: {
    id: SOCIETE_ID,
    raisonSociale: 'Zowka',
    ice: '001234567890123',
    identifiantFiscal: '12345678',
    rc: '123456',
    cnss: null,
    adresse: 'Casablanca',
    ville: 'Casablanca',
    taxeProfessionnelleArticle: null,
  },
  sourceQuote: null,
  emailDelivery: {
    status: 'SENT' as const,
    sentAt: '2026-07-12T08:00:00Z',
    providerAcceptedAt: '2026-07-12T08:00:01Z',
  },
  paidCents: 20000,
  outstandingCents: 100000,
  isOverdue: false,
};

const deliveredInvoice = {
  ...invoice,
  id: SECOND_INVOICE_ID,
  number: 'FAC-2026-0043',
  status: 'DRAFT' as const,
  pdfGenerationStatus: 'PENDING' as const,
  pdfDocumentReference: null,
  emailDelivery: {
    status: 'FAILED' as const,
    sentAt: null,
    providerAcceptedAt: null,
  },
  customerNameSnapshot: 'Riad Industrie',
  tier: { ...invoice.tier, id: SECOND_INVOICE_ID, name: 'Riad Industrie' },
};

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
};

const renderPage = (
  request: jest.Mock,
  {
    initialEntry = '/erp-maroc/invoices',
    canManage = true,
  }: RenderOptions = {},
) => {
  const access = { canManage };
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
    client: { request } as never,
  });

  const rendered = render(
    <MemoryRouter
      initialEntries={[initialEntry]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <ErpInvoicesPage />
      <LocationProbe />
    </MemoryRouter>,
  );

  return { ...rendered, access };
};

const response = (
  items = [invoice, deliveredInvoice],
  nextCursor: string | null = null,
) =>
  jest.fn(async ({ method, path }: { method: string; path: string }) => {
    if (method === 'GET') return { items, nextCursor };
    throw new Error(`Unexpected request ${method} ${path}`);
  });

describe('ErpInvoicesPage', () => {
  beforeEach(() => jest.clearAllMocks());

  it('uses only canonical cursor and limit in its invoice request while retaining local filters in the URL', async () => {
    const request = response();
    renderPage(request, {
      initialEntry: `/erp-maroc/invoices?status=VALIDATED&delivery=SENT&cursor=${FIRST_CURSOR}&limit=025&unknown=x`,
    });

    await screen.findByRole('table', { name: 'Factures' });
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'GET',
        path: `/invoices?cursor=${FIRST_CURSOR}&limit=25`,
        signal: expect.any(AbortSignal),
      }),
    );
    expect(screen.getByLabelText('URL courante')).toHaveTextContent(
      `/erp-maroc/invoices?status=VALIDATED&delivery=SENT&cursor=${FIRST_CURSOR}&limit=25`,
    );
  });

  it('moves forward with nextCursor and returns to the preceding cursor with accessible stable controls', async () => {
    const request = jest.fn(({ path }: { path: string }) => {
      if (path === '/invoices')
        return Promise.resolve({ items: [invoice], nextCursor: FIRST_CURSOR });
      if (path === `/invoices?cursor=${FIRST_CURSOR}`)
        return Promise.resolve({
          items: [deliveredInvoice],
          nextCursor: SECOND_CURSOR,
        });
      throw new Error(`Unexpected request ${path}`);
    });
    renderPage(request);

    expect(await screen.findByText('FAC-2026-0042')).toBeVisible();
    const previous = screen.getByRole('button', { name: 'Page précédente' });
    expect(previous).toBeDisabled();
    await userEvent.click(
      screen.getByRole('button', { name: 'Page suivante' }),
    );
    expect(await screen.findByText('FAC-2026-0043')).toBeVisible();
    expect(screen.getByLabelText('URL courante')).toHaveTextContent(
      `/erp-maroc/invoices?cursor=${FIRST_CURSOR}`,
    );
    expect(screen.getByRole('button', { name: 'Page suivante' })).toBeEnabled();
    await userEvent.click(
      screen.getByRole('button', { name: 'Page précédente' }),
    );
    expect(await screen.findByText('FAC-2026-0042')).toBeVisible();
    expect(screen.getByLabelText('URL courante')).toHaveTextContent(
      '/erp-maroc/invoices',
    );
    expect(
      screen.getByRole('button', { name: 'Page précédente' }),
    ).toBeDisabled();
  });

  it('resets the cursor history when status, delivery or limit changes', async () => {
    const request = response([invoice], FIRST_CURSOR);
    renderPage(request, {
      initialEntry: `/erp-maroc/invoices?cursor=${FIRST_CURSOR}`,
    });

    await screen.findByRole('table', { name: 'Factures' });
    await userEvent.click(screen.getByRole('button', { name: 'Validées' }));
    expect(screen.getByLabelText('URL courante')).toHaveTextContent(
      '/erp-maroc/invoices?status=VALIDATED',
    );
    expect(
      screen.getByRole('button', { name: 'Page précédente' }),
    ).toBeDisabled();
    await userEvent.click(
      screen.getByRole('button', { name: 'Courriels envoyés' }),
    );
    expect(screen.getByLabelText('URL courante')).toHaveTextContent(
      '/erp-maroc/invoices?status=VALIDATED&delivery=SENT',
    );
    await userEvent.selectOptions(
      screen.getByLabelText('Factures par page'),
      '25',
    );
    expect(screen.getByLabelText('URL courante')).toHaveTextContent(
      '/erp-maroc/invoices?status=VALIDATED&delivery=SENT&limit=25',
    );
  });

  it('filters only the loaded page by status and email delivery and marks that scope visibly', async () => {
    renderPage(response());

    expect(await screen.findByText('FAC-2026-0042')).toBeVisible();
    expect(screen.getByText('Page chargée')).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: 'Brouillons' }));
    expect(screen.queryByText('FAC-2026-0042')).not.toBeInTheDocument();
    expect(screen.getByText('FAC-2026-0043')).toBeVisible();
    await userEvent.click(
      screen.getByRole('button', { name: 'Courriels échoués' }),
    );
    expect(screen.getByText('FAC-2026-0043')).toBeVisible();
  });

  it('renders operational invoice columns, deliveries and detail navigation', async () => {
    renderPage(response([invoice]));

    await screen.findByRole('table', { name: 'Factures' });
    expect(screen.getByText('FAC-2026-0042')).toBeVisible();
    expect(screen.getByText('Atlas Conseil')).toBeVisible();
    expect(screen.getByText('2026-07-12')).toBeVisible();
    expect(screen.getByText('2026-08-12')).toBeVisible();
    expect(screen.getByText('1 200,00 MAD')).toBeVisible();
    expect(screen.getByText('1 000,00 MAD')).toBeVisible();
    expect(screen.getByText('PDF généré')).toBeVisible();
    expect(screen.getByText('Courriel envoyé')).toBeVisible();
    await userEvent.click(
      screen.getByRole('link', { name: 'Ouvrir FAC-2026-0042' }),
    );
    expect(screen.getByLabelText('URL courante')).toHaveTextContent(
      `/erp-maroc/invoices/${INVOICE_ID}`,
    );
  });

  it('shows loading, error and retry without claiming an empty page is exhaustive', async () => {
    let rejectFirst: (error: Error) => void = () => undefined;
    const pending = new Promise((_, reject) => {
      rejectFirst = reject;
    });
    const request = jest
      .fn()
      .mockImplementationOnce(() => pending)
      .mockResolvedValue({ items: [], nextCursor: null });
    renderPage(request);

    expect(screen.getByText('Chargement des factures')).toBeVisible();
    expect(screen.queryByText('Page chargée')).not.toBeInTheDocument();
    await act(async () => rejectFirst(new Error('offline')));
    expect(
      await screen.findByText('Impossible de charger les factures'),
    ).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: 'Réessayer' }));
    expect(
      await screen.findByText('Aucune facture sur la page chargée'),
    ).toBeVisible();
    expect(screen.queryByText(/toutes les factures/i)).not.toBeInTheDocument();
  });

  it('exposes manual creation only to permitted users, blocks a forged handler and navigates to the canonical page', async () => {
    const request = response([invoice]);
    const { access, unmount } = renderPage(request);

    const newButton = await screen.findByRole('button', {
      name: 'Nouvelle facture',
    });
    access.canManage = false;
    fireEvent.click(newButton);
    expect(screen.getByLabelText('URL courante')).toHaveTextContent(
      '/erp-maroc/invoices',
    );

    unmount();
    renderPage(response([invoice]), { canManage: false });
    await screen.findByRole('table', { name: 'Factures' });
    expect(
      screen.queryByRole('button', { name: 'Nouvelle facture' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /devis/i }),
    ).not.toBeInTheDocument();
  });
});
