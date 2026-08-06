import { useCreateAppRouter } from '@/app/hooks/useCreateAppRouter';
import { useAuth } from '@/auth/hooks/useAuth';
import { isErpMarocEnabledState } from '@/client-config/states/isErpMarocEnabledState';
import { ErpMarocError } from '@/erp-maroc/api/erpMarocError';
import { type ErpMarocClient } from '@/erp-maroc/api/erpMarocClient';
import { type ErpMarocContextState } from '@/erp-maroc/context/ErpMarocContextProvider';
import { useErpMarocContext } from '@/erp-maroc/context/useErpMarocContext';
import { erpMarocPaths } from '@/erp-maroc/navigation/erpMarocPaths';
import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { render, renderHook, screen } from '@testing-library/react';
import { createStore, Provider as JotaiProvider } from 'jotai';
import { type ReactNode } from 'react';
import { Outlet, RouterProvider, type RouteObject } from 'react-router-dom';
import { type ErpContext } from 'twenty-shared/erp-maroc';

class TestRequest {
  url: string;
  method: string;
  signal?: AbortSignal;

  constructor(url: string, init?: RequestInit) {
    this.url = url;
    this.method = init?.method ?? 'GET';
    this.signal = init?.signal ?? undefined;
  }
}

Object.defineProperty(globalThis, 'Request', {
  configurable: true,
  value: TestRequest,
});

jest.mock('@/app/components/AppRouterProviders', () => ({
  AppRouterProviders: () => <Outlet />,
}));

jest.mock('@/auth/hooks/useAuth', () => ({ useAuth: jest.fn() }));

jest.mock('@/erp-maroc/context/useErpMarocContext', () => ({
  useErpMarocContext: jest.fn(),
}));

jest.mock('~/pages/erp-maroc/ErpMarocCockpitPage', () => ({
  ErpMarocCockpitPage: () => <div>Task 12 cockpit</div>,
}));

jest.mock('~/pages/erp-maroc/products/ErpProductsPage', () => ({
  ErpProductsPage: () => <div>Task 12 products</div>,
}));

jest.mock('~/pages/erp-maroc/inventory/ErpInventoryPage', () => ({
  ErpInventoryPage: () => <div>Phase 3 inventory</div>,
}));

jest.mock('~/pages/erp-maroc/sales-orders/ErpSalesOperationsPage', () => ({
  ErpSalesOperationsPage: () => <div>Phase 3 sales operations</div>,
}));

jest.mock('~/pages/erp-maroc/tiers/ErpTiersPage', () => ({
  ErpTiersPage: () => <div>Task 12 tiers</div>,
}));

jest.mock('~/pages/erp-maroc/quotes/ErpQuotesPage', () => ({
  ErpQuotesPage: () => <div>Task 13 quotes list</div>,
}));

jest.mock('~/pages/erp-maroc/quotes/ErpQuoteEditorPage', () => ({
  ErpQuoteEditorPage: () => <div>Task 13 quote editor</div>,
}));

jest.mock('~/pages/erp-maroc/quotes/ErpQuoteDetailPage', () => ({
  ErpQuoteDetailPage: () => <div>Task 13 quote detail</div>,
}));

jest.mock('~/pages/erp-maroc/purchase-orders/ErpPurchaseOrdersPage', () => ({
  ErpPurchaseOrdersPage: () => <div>Phase 3 purchases list</div>,
}));

jest.mock(
  '~/pages/erp-maroc/purchase-orders/ErpPurchaseOrderEditorPage',
  () => ({
    ErpPurchaseOrderEditorPage: () => <div>Phase 3 purchase editor</div>,
  }),
);

jest.mock(
  '~/pages/erp-maroc/purchase-orders/ErpPurchaseOrderDetailPage',
  () => ({
    ErpPurchaseOrderDetailPage: () => <div>Phase 3 purchase detail</div>,
  }),
);

jest.mock('~/pages/erp-maroc/invoices/ErpInvoiceDetailPage', () => ({
  ErpInvoiceDetailPage: () => <div>Task 14-C2 invoice detail</div>,
}));

jest.mock('~/pages/erp-maroc/invoices/ErpInvoicesPage', () => ({
  ErpInvoicesPage: () => <div>Task 14-D invoices list</div>,
}));

jest.mock('~/pages/erp-maroc/invoices/ErpInvoiceEditorPage', () => ({
  ErpInvoiceEditorPage: ({ invoiceId }: { invoiceId?: string }) => (
    <div data-invoice-id={invoiceId} data-testid="invoice-editor">
      Task 14-D invoice editor {invoiceId ?? 'new'}
    </div>
  ),
}));

jest.mock('~/pages/erp-maroc/payments/ErpPaymentsPage', () => ({
  ErpPaymentsPage: () => <div>Task 15 payments list</div>,
}));

jest.mock('~/pages/erp-maroc/payments/ErpPaymentEditorPage', () => ({
  ErpPaymentEditorPage: () => <div>Task 15 payment editor</div>,
}));

jest.mock('~/pages/erp-maroc/payments/ErpPaymentDetailPage', () => ({
  ErpPaymentDetailPage: () => <div>Task 15 payment detail</div>,
}));

jest.mock('@/app/components/SettingsRoutes', () => ({
  SettingsRoutes: () => <div data-testid="settings-routes" />,
}));

jest.mock('@/app/components/LazyRoute', () => {
  const { Suspense } = jest.requireActual('react');

  return {
    LazyRoute: ({ children }: { children: ReactNode }) => (
      <Suspense fallback={<div data-testid="lazy-route-loading" />}>
        {children}
      </Suspense>
    ),
  };
});

jest.mock('@/ui/layout/page/components/DefaultLayout', () => ({
  DefaultLayout: () => <Outlet />,
}));

jest.mock('@/ui/layout/page/components/BlankLayout', () => ({
  BlankLayout: () => <Outlet />,
}));

jest.mock('~/pages/not-found/NotFound', () => ({
  NotFound: () => <div data-testid="not-found">Not Found</div>,
}));

const getWrapper = (isEnabled: boolean) => {
  const store = createStore();
  store.set(isErpMarocEnabledState.atom, isEnabled);

  return ({ children }: { children: ReactNode }) => (
    <I18nProvider i18n={i18n}>
      <JotaiProvider store={store}>{children}</JotaiProvider>
    </I18nProvider>
  );
};

const flattenPaths = (routes: RouteObject[]): string[] =>
  routes.flatMap((route) => [
    ...(route.path ? [route.path] : []),
    ...flattenPaths(route.children ?? []),
  ]);

describe('useCreateAppRouter ERP Maroc registration', () => {
  const refetch = jest.fn();
  const client = {} as ErpMarocClient;
  const mockedUseErpMarocContext = jest.mocked(useErpMarocContext);

  const renderEnabledErpRoute = (
    state: ErpMarocContextState,
    path: string = erpMarocPaths.cockpit,
  ) => {
    window.history.pushState({}, '', path);
    mockedUseErpMarocContext.mockReturnValue(state);
    const { result } = renderHook(() => useCreateAppRouter(), {
      wrapper: getWrapper(true),
    });
    const view = render(
      <RouterProvider
        router={result.current}
        future={{ v7_startTransition: true }}
      />,
      { wrapper: getWrapper(true) },
    );

    return { router: result.current, view };
  };

  beforeEach(() => {
    jest.mocked(useAuth).mockReturnValue({ signOut: jest.fn() } as never);
  });

  afterEach(() => {
    jest.clearAllMocks();
    window.history.pushState({}, '', '/');
  });

  it('does not register ERP routes when the feature flag is disabled', () => {
    const { result } = renderHook(() => useCreateAppRouter(), {
      wrapper: getWrapper(false),
    });

    expect(flattenPaths(result.current.routes)).not.toEqual(
      expect.arrayContaining(Object.values(erpMarocPaths)),
    );
    result.current.dispose();
  });

  it('registers every canonical ERP route when the feature flag is enabled', () => {
    const { result } = renderHook(() => useCreateAppRouter(), {
      wrapper: getWrapper(true),
    });

    expect(flattenPaths(result.current.routes)).toEqual(
      expect.arrayContaining(Object.values(erpMarocPaths)),
    );
    result.current.dispose();
  });

  it('registers payment creation before the dynamic payment detail route', () => {
    const { result } = renderHook(() => useCreateAppRouter(), {
      wrapper: getWrapper(true),
    });
    const paths = flattenPaths(result.current.routes);
    const paymentNewIndex = paths.indexOf(erpMarocPaths.paymentNew);
    const paymentDetailIndex = paths.indexOf(erpMarocPaths.paymentDetail);

    expect(erpMarocPaths.paymentNew).toBe('/erp-maroc/payments/new');
    expect(erpMarocPaths.paymentDetail).toBe('/erp-maroc/payments/:id');
    expect(paymentNewIndex).toBeGreaterThanOrEqual(0);
    expect(paymentDetailIndex).toBeGreaterThan(paymentNewIndex);

    result.current.dispose();
  });

  it('registers purchase creation before the dynamic purchase detail route', () => {
    const { result } = renderHook(() => useCreateAppRouter(), {
      wrapper: getWrapper(true),
    });
    const paths = flattenPaths(result.current.routes);

    expect(
      paths.indexOf(erpMarocPaths.purchaseOrderNew),
    ).toBeGreaterThanOrEqual(0);
    expect(paths.indexOf(erpMarocPaths.purchaseOrderDetail)).toBeGreaterThan(
      paths.indexOf(erpMarocPaths.purchaseOrderNew),
    );

    result.current.dispose();
  });

  it('resolves a direct disabled ERP URL through NotFound', async () => {
    window.history.pushState({}, '', erpMarocPaths.quoteNew);
    const { result } = renderHook(() => useCreateAppRouter(), {
      wrapper: getWrapper(false),
    });

    const view = render(
      <RouterProvider
        router={result.current}
        future={{ v7_startTransition: true }}
      />,
    );

    expect(await screen.findByTestId('not-found')).toBeInTheDocument();
    view.unmount();
    result.current.dispose();
  });

  it.each([
    [
      'loading',
      {
        status: 'loading',
        context: null,
        error: null,
        refetch,
        client,
      } satisfies ErpMarocContextState,
      'Loading ERP data',
    ],
    [
      'ERP_LINK_REQUIRED',
      {
        status: 'forbidden',
        context: null,
        error: null,
        refetch,
        client,
      } satisfies ErpMarocContextState,
      'ERP access is not configured',
    ],
    [
      'error',
      {
        status: 'error',
        context: null,
        error: new ErpMarocError('ERP_UNKNOWN', 502),
        refetch,
        client,
      } satisfies ErpMarocContextState,
      'ERP is temporarily unavailable',
    ],
  ])(
    'renders the neutral %s boundary without a business placeholder',
    async (_status, state, message) => {
      const { router, view } = renderEnabledErpRoute(state);

      expect(await screen.findByText(message)).toBeInTheDocument();
      expect(screen.queryByText('Vue ventes')).toBeNull();

      view.unmount();
      router.dispose();
    },
  );

  it('renders the Task 12 cockpit module only when context is ready', async () => {
    const { router, view } = renderEnabledErpRoute({
      status: 'ready',
      context: {} as ErpContext,
      error: null,
      refetch,
      client,
    });

    expect(await screen.findByText('Task 12 cockpit')).toBeInTheDocument();
    expect(screen.queryByText('Loading ERP data')).toBeNull();
    expect(screen.queryByText('ERP access is not configured')).toBeNull();
    expect(screen.queryByText('ERP is temporarily unavailable')).toBeNull();

    view.unmount();
    router.dispose();
  });

  it.each([
    [erpMarocPaths.products, 'Task 12 products'],
    [erpMarocPaths.inventory, 'Phase 3 inventory'],
    [erpMarocPaths.salesOperations, 'Phase 3 sales operations'],
    [erpMarocPaths.tiers, 'Task 12 tiers'],
  ])('resolves %s to its Task 12 page module', async (path, expectedText) => {
    const { router, view } = renderEnabledErpRoute(
      {
        status: 'ready',
        context: {} as ErpContext,
        error: null,
        refetch,
        client,
      },
      path,
    );

    expect(await screen.findByText(expectedText)).toBeInTheDocument();

    view.unmount();
    router.dispose();
  });

  it.each([
    [erpMarocPaths.quotes, 'Task 13 quotes list'],
    [erpMarocPaths.quoteNew, 'Task 13 quote editor'],
    [
      '/erp-maroc/quotes/ac4fab7d-0ea2-4102-839e-50be33a1d2aa/edit',
      'Task 13 quote editor',
    ],
    [
      '/erp-maroc/quotes/ac4fab7d-0ea2-4102-839e-50be33a1d2aa',
      'Task 13 quote detail',
    ],
  ])(
    'resolves %s to its real Task 13 page module',
    async (path, expectedText) => {
      const { router, view } = renderEnabledErpRoute(
        {
          status: 'ready',
          context: {} as ErpContext,
          error: null,
          refetch,
          client,
        },
        path,
      );

      expect(await screen.findByText(expectedText)).toBeInTheDocument();

      view.unmount();
      router.dispose();
    },
  );

  it.each([
    [erpMarocPaths.invoices, 'Task 14-D invoices list'],
    [erpMarocPaths.invoiceNew, 'Task 14-D invoice editor new'],
    [
      '/erp-maroc/invoices/ac4fab7d-0ea2-4102-839e-50be33a1d2aa/edit',
      'Task 14-D invoice editor ac4fab7d-0ea2-4102-839e-50be33a1d2aa',
    ],
    [
      '/erp-maroc/invoices/ac4fab7d-0ea2-4102-839e-50be33a1d2aa',
      'Task 14-C2 invoice detail',
    ],
  ])('resolves %s to its intended Task 14 page module', async (path, text) => {
    const { router, view } = renderEnabledErpRoute(
      {
        status: 'ready',
        context: {} as ErpContext,
        error: null,
        refetch,
        client,
      },
      path,
    );

    expect(await screen.findByText(text)).toBeInTheDocument();

    view.unmount();
    router.dispose();
  });

  it.each([
    [erpMarocPaths.purchaseOrders, 'Phase 3 purchases list'],
    [erpMarocPaths.purchaseOrderNew, 'Phase 3 purchase editor'],
    [
      '/erp-maroc/purchase-orders/ac4fab7d-0ea2-4102-839e-50be33a1d2aa',
      'Phase 3 purchase detail',
    ],
  ])('resolves %s to its Phase 3 purchase page', async (path, text) => {
    const { router, view } = renderEnabledErpRoute(
      {
        status: 'ready',
        context: {} as ErpContext,
        error: null,
        refetch,
        client,
      },
      path,
    );

    expect(await screen.findByText(text)).toBeInTheDocument();

    view.unmount();
    router.dispose();
  });

  it.each([
    [erpMarocPaths.payments, 'Task 15 payments list'],
    ['/erp-maroc/payments/new', 'Task 15 payment editor'],
    [
      '/erp-maroc/payments/ac4fab7d-0ea2-4102-839e-50be33a1d2aa',
      'Task 15 payment detail',
    ],
  ])('resolves %s to its real Task 15 page module', async (path, text) => {
    const { router, view } = renderEnabledErpRoute(
      {
        status: 'ready',
        context: {} as ErpContext,
        error: null,
        refetch,
        client,
      },
      path,
    );

    expect(await screen.findByText(text)).toBeInTheDocument();

    view.unmount();
    router.dispose();
  });

  it.each([
    [erpMarocPaths.invoiceNew, undefined],
    [
      '/erp-maroc/invoices/ac4fab7d-0ea2-4102-839e-50be33a1d2aa/edit',
      'ac4fab7d-0ea2-4102-839e-50be33a1d2aa',
    ],
  ])('passes %s invoiceId to the invoice editor', async (path, invoiceId) => {
    const { router, view } = renderEnabledErpRoute(
      {
        status: 'ready',
        context: {} as ErpContext,
        error: null,
        refetch,
        client,
      },
      path,
    );

    const invoiceEditor = await screen.findByTestId('invoice-editor');

    expect(invoiceEditor.getAttribute('data-invoice-id') ?? undefined).toBe(
      invoiceId,
    );

    view.unmount();
    router.dispose();
  });
});
