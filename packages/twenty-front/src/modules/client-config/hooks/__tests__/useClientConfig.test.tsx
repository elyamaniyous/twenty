import { useClientConfig } from '@/client-config/hooks/useClientConfig';
import { isErpMarocEnabledState } from '@/client-config/states/isErpMarocEnabledState';
import { getClientConfig } from '@/client-config/utils/getClientConfig';
import { act, renderHook } from '@testing-library/react';
import { createStore, Provider as JotaiProvider } from 'jotai';
import { type ReactNode } from 'react';
import { mockedClientConfig } from '~/testing/mock-data/config';

jest.mock('@/client-config/utils/getClientConfig');

const mockedGetClientConfig = jest.mocked(getClientConfig);

const getWrapper = (store: ReturnType<typeof createStore>) =>
  function Wrapper({ children }: { children: ReactNode }) {
    return <JotaiProvider store={store}>{children}</JotaiProvider>;
  };

describe('useClientConfig', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('resets the ERP Maroc atom when a later client config omits the field', async () => {
    const store = createStore();
    const enabledClientConfig = {
      ...mockedClientConfig,
      erpMarocEnabled: true,
    };
    const {
      erpMarocEnabled: omittedErpMarocEnabled,
      ...clientConfigWithoutErpMaroc
    } = enabledClientConfig;

    expect(omittedErpMarocEnabled).toBe(true);
    expect(clientConfigWithoutErpMaroc).not.toHaveProperty('erpMarocEnabled');

    mockedGetClientConfig
      .mockResolvedValueOnce(enabledClientConfig)
      .mockResolvedValueOnce(clientConfigWithoutErpMaroc);

    const { result } = renderHook(() => useClientConfig(), {
      wrapper: getWrapper(store),
    });

    await act(async () => {
      await result.current.fetchClientConfig();
    });

    expect(store.get(isErpMarocEnabledState.atom)).toBe(true);

    await act(async () => {
      await result.current.refetch();
    });

    expect(store.get(isErpMarocEnabledState.atom)).toBe(false);
  });

  it('keeps the ERP Maroc atom disabled when the client field is false', async () => {
    const store = createStore();

    mockedGetClientConfig.mockResolvedValue({
      ...mockedClientConfig,
      erpMarocEnabled: false,
    });

    const { result } = renderHook(() => useClientConfig(), {
      wrapper: getWrapper(store),
    });

    await act(async () => {
      await result.current.fetchClientConfig();
    });

    expect(store.get(isErpMarocEnabledState.atom)).toBe(false);
  });
});
