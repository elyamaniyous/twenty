import { useAuth } from '@/auth/hooks/useAuth';
import {
  type CurrentWorkspace,
  currentWorkspaceState,
} from '@/auth/states/currentWorkspaceState';
import { tokenPairState } from '@/auth/states/tokenPairState';
import { ensureTokenRenewed } from '@/auth/utils/ensureTokenRenewed';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { createStore, Provider as JotaiProvider } from 'jotai';
import { enableFetchMocks } from 'jest-fetch-mock';
import { type ReactNode, useRef, useState } from 'react';
import { erpProductListSchema } from 'twenty-shared/erp-maroc';

import { ErpMarocContextProvider } from '../ErpMarocContextProvider';
import { useErpMarocContext } from '../useErpMarocContext';

jest.mock('@/auth/hooks/useAuth', () => ({ useAuth: jest.fn() }));
jest.mock('@/auth/utils/ensureTokenRenewed', () => ({
  ensureTokenRenewed: jest.fn(),
}));

enableFetchMocks();

const ERP_CONTEXT = {
  societeId: '89c90690-4f4a-4f2e-91ce-3700f16a8ca1',
  twentyUserId: 'twenty-user-1',
  timezone: 'Africa/Casablanca',
  role: 'ADMIN' as const,
  capabilities: {
    manageCatalog: true,
    manageTiers: true,
    manageSalesDocuments: true,
    createPendingPayment: true,
    postPayment: true,
    terminateOwnPendingPayment: true,
    terminateAnyPayment: true,
    manageReminders: true,
    manageCreditNotes: true,
    allocateCustomerCredit: true,
    manageSupplierAccounting: true,
  },
  features: {
    salesUi: true,
    pdfGeneration: true,
    invoiceValidation: true,
    invoiceEmail: true,
    reminderManagement: true,
    reminderDelivery: true,
    whatsappDelivery: false as const,
  },
};

const mockJsonResponse = (body: unknown, status = 200) =>
  fetchMock.mockResponseOnce(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const workspace = (id: string) => ({ id }) as CurrentWorkspace;

const initializeStore = (workspaceId = 'workspace-1') => {
  const store = createStore();
  store.set(currentWorkspaceState.atom, workspace(workspaceId));
  store.set(tokenPairState.atom, {
    accessOrWorkspaceAgnosticToken: {
      token: 'access-token',
      expiresAt: '2099-01-01',
    },
    refreshToken: { token: 'refresh-token', expiresAt: '2099-01-01' },
  });
  return store;
};

const ContextProbe = () => {
  const state = useErpMarocContext();
  const firstClient = useRef(state.client);
  const [productCount, setProductCount] = useState<number | null>(null);

  return (
    <>
      <div data-testid="status">{state.status}</div>
      <div data-testid="role">
        {state.status === 'ready' ? state.context.role : ''}
      </div>
      <div data-testid="error">
        {state.status === 'error' ? state.error.code : ''}
      </div>
      <div data-testid="client-identity">
        {firstClient.current === state.client ? 'stable' : 'changed'}
      </div>
      <button type="button" onClick={state.refetch}>
        Refetch
      </button>
      <button
        type="button"
        onClick={() =>
          state.client
            .request({
              method: 'GET',
              path: '/products',
              schema: erpProductListSchema,
            })
            .then((products) => setProductCount(products.length))
        }
      >
        Load products
      </button>
      <output aria-label="Product count">{productCount}</output>
    </>
  );
};

const renderProvider = (store = initializeStore()) => {
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <JotaiProvider store={store}>
      <ErpMarocContextProvider>{children}</ErpMarocContextProvider>
    </JotaiProvider>
  );

  return { ...render(<ContextProbe />, { wrapper: Wrapper }), store };
};

describe('ErpMarocContextProvider', () => {
  const signOut = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    fetchMock.resetMocks();
    (useAuth as jest.Mock).mockReturnValue({ signOut });
    (ensureTokenRenewed as jest.Mock).mockResolvedValue(false);
  });

  it('exposes the validated ERP context when loading succeeds', async () => {
    mockJsonResponse(ERP_CONTEXT);

    renderProvider();

    expect(screen.getByTestId('status')).toHaveTextContent('loading');
    await waitFor(() =>
      expect(screen.getByTestId('status')).toHaveTextContent('ready'),
    );
    expect(screen.getByTestId('role')).toHaveTextContent('ADMIN');
  });

  it('keeps one client when useAuth returns a new signOut on every render', async () => {
    let renderCount = 0;
    (useAuth as jest.Mock).mockImplementation(() => {
      renderCount += 1;
      if (renderCount > 5) {
        throw new Error('ERP client recreated from unstable signOut');
      }
      return { signOut: jest.fn() };
    });
    fetchMock.mockResponse(JSON.stringify(ERP_CONTEXT), {
      headers: { 'Content-Type': 'application/json' },
    });

    renderProvider();

    await waitFor(() =>
      expect(screen.getByTestId('status')).toHaveTextContent('ready'),
    );
    expect(renderCount).toBeGreaterThan(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('exposes the same authenticated client across provider state and refetches', async () => {
    mockJsonResponse(ERP_CONTEXT);
    mockJsonResponse([]);
    mockJsonResponse(ERP_CONTEXT);

    renderProvider();

    await waitFor(() =>
      expect(screen.getByTestId('status')).toHaveTextContent('ready'),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Load products' }));
    await waitFor(() =>
      expect(
        screen.getByRole('status', { name: 'Product count' }),
      ).toHaveTextContent('0'),
    );
    expect(fetchMock.mock.calls[1]).toEqual([
      '/erp-maroc-api/products',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer access-token',
        }),
      }),
    ]);

    fireEvent.click(screen.getByRole('button', { name: 'Refetch' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    await waitFor(() =>
      expect(screen.getByTestId('status')).toHaveTextContent('ready'),
    );
    expect(screen.getByTestId('client-identity')).toHaveTextContent('stable');
  });

  it('maps ERP_LINK_REQUIRED to the forbidden state', async () => {
    mockJsonResponse({ code: 'ERP_LINK_REQUIRED', statusCode: 403 }, 403);

    renderProvider();

    await waitFor(() =>
      expect(screen.getByTestId('status')).toHaveTextContent('forbidden'),
    );
    expect(screen.getByTestId('error')).toBeEmptyDOMElement();
  });

  it('exposes other ERP failures through the error state', async () => {
    mockJsonResponse({ code: 'ERP_UPSTREAM_TIMEOUT', statusCode: 504 }, 504);

    renderProvider();

    await waitFor(() =>
      expect(screen.getByTestId('status')).toHaveTextContent('error'),
    );
    expect(screen.getByTestId('error')).toHaveTextContent(
      'ERP_UPSTREAM_TIMEOUT',
    );
  });

  it('aborts the context request when the provider unmounts', async () => {
    let requestSignal: AbortSignal | null | undefined;
    fetchMock.mockImplementation((_url, init) => {
      requestSignal = init?.signal;
      return new Promise<Response>(() => undefined);
    });

    const { unmount } = renderProvider();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    unmount();

    expect(requestSignal?.aborted).toBe(true);
  });

  it('aborts the previous request and reloads when the workspace changes', async () => {
    let firstSignal: AbortSignal | null | undefined;
    fetchMock
      .mockImplementationOnce((_url, init) => {
        firstSignal = init?.signal;
        return new Promise<Response>(() => undefined);
      })
      .mockResponseOnce(JSON.stringify(ERP_CONTEXT), {
        headers: { 'Content-Type': 'application/json' },
      });
    const { store } = renderProvider();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    act(() => {
      store.set(currentWorkspaceState.atom, workspace('workspace-2'));
    });

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(firstSignal?.aborted).toBe(true);
    await waitFor(() =>
      expect(screen.getByTestId('status')).toHaveTextContent('ready'),
    );
  });

  it('reloads the context when refetch is requested', async () => {
    fetchMock.mockResponse(JSON.stringify(ERP_CONTEXT), {
      headers: { 'Content-Type': 'application/json' },
    });
    renderProvider();
    await waitFor(() =>
      expect(screen.getByTestId('status')).toHaveTextContent('ready'),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Refetch' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    await waitFor(() =>
      expect(screen.getByTestId('status')).toHaveTextContent('ready'),
    );
  });

  it('signs out only once across repeated authentication failures', async () => {
    fetchMock.mockResponse(
      JSON.stringify({
        code: 'AUTH_TOKEN_INVALID_OR_EXPIRED',
        statusCode: 401,
      }),
      { status: 401, headers: { 'Content-Type': 'application/json' } },
    );
    renderProvider();

    await waitFor(() => expect(signOut).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(screen.getByTestId('status')).toHaveTextContent('error'),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Refetch' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(signOut).toHaveBeenCalledTimes(1);
    expect(ensureTokenRenewed).toHaveBeenCalledTimes(2);
  });
});
