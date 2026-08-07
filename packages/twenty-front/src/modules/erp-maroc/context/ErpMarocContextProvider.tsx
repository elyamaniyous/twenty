import { useAuth } from '@/auth/hooks/useAuth';
import { currentWorkspaceState } from '@/auth/states/currentWorkspaceState';
import { ensureTokenRenewed } from '@/auth/utils/ensureTokenRenewed';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { useStore } from 'jotai';
import {
  createContext,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  erpContextSchema,
  hrAccessContextSchema,
  type ErpContext,
} from 'twenty-shared/erp-maroc';

import {
  createErpMarocClient,
  type ErpMarocClient,
} from '../api/erpMarocClient';
import { ErpMarocError } from '../api/erpMarocError';
import { type ZowkaSpaceAccess } from '../navigation/zowkaSpaces';

type ErpMarocContextValue = {
  client: ErpMarocClient;
  refetch: () => void;
};

type ErpMarocLoadState =
  | { status: 'loading'; context: null; error: null }
  | {
      status: 'ready';
      context: ErpContext;
      spaceAccess?: ZowkaSpaceAccess;
      error: null;
    }
  | { status: 'forbidden'; context: null; error: null }
  | {
      status: 'error';
      context: null;
      error: ErpMarocError;
    };

export type ErpMarocContextState = ErpMarocContextValue & ErpMarocLoadState;

export const ErpMarocContext = createContext<ErpMarocContextState | null>(null);

const resolveSpaceAccess = async (
  context: ErpContext,
  client: ErpMarocClient,
  signal: AbortSignal,
): Promise<ZowkaSpaceAccess> => {
  if (context.role === 'OWNER' || context.role === 'ADMIN') {
    return { crm: true, finance: true, hr: true };
  }

  try {
    await client.request({
      method: 'GET',
      path: '/hr-core/access/me',
      schema: hrAccessContextSchema,
      signal,
    });

    return { crm: true, finance: true, hr: true };
  } catch {
    return { crm: true, finance: true, hr: false };
  }
};

export const ErpMarocContextProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const store = useStore();
  const workspaceId = useAtomStateValue(currentWorkspaceState)?.id;
  const { signOut } = useAuth();
  const [generation, setGeneration] = useState(0);
  const [state, setState] = useState<ErpMarocLoadState>({
    status: 'loading',
    context: null,
    error: null,
  });
  const requestGeneration = useRef(0);
  const signOutRef = useRef(signOut);
  signOutRef.current = signOut;

  const client = useMemo(
    () =>
      createErpMarocClient({
        store,
        renew: ensureTokenRenewed,
        onAuthenticationLost: () => signOutRef.current(),
      }),
    [store],
  );

  const refetch = useCallback(() => setGeneration((value) => value + 1), []);

  useEffect(() => {
    const currentGeneration = ++requestGeneration.current;
    const abortController = new AbortController();
    setState({ status: 'loading', context: null, error: null });

    if (!workspaceId) return () => abortController.abort();

    client
      .request({
        method: 'GET',
        path: '/context',
        schema: erpContextSchema,
        signal: abortController.signal,
      })
      .then(async (context) => {
        const spaceAccess = await resolveSpaceAccess(
          context,
          client,
          abortController.signal,
        );

        if (
          !abortController.signal.aborted &&
          requestGeneration.current === currentGeneration
        ) {
          setState({ status: 'ready', context, spaceAccess, error: null });
        }
      })
      .catch((error: unknown) => {
        if (
          abortController.signal.aborted ||
          requestGeneration.current !== currentGeneration
        )
          return;
        const normalized =
          error instanceof ErpMarocError
            ? error
            : new ErpMarocError('ERP_UNKNOWN', 502);
        setState(
          normalized.code === 'ERP_LINK_REQUIRED'
            ? { status: 'forbidden', context: null, error: null }
            : { status: 'error', context: null, error: normalized },
        );
      });

    return () => abortController.abort();
  }, [client, generation, workspaceId]);

  const value = useMemo(
    () => ({ ...state, client, refetch }) as ErpMarocContextState,
    [client, refetch, state],
  );

  return (
    <ErpMarocContext.Provider value={value}>
      {children}
    </ErpMarocContext.Provider>
  );
};
