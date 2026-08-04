import { currentWorkspaceState } from '@/auth/states/currentWorkspaceState';
import { tokenPairState } from '@/auth/states/tokenPairState';
import { ensureTokenRenewed } from '@/auth/utils/ensureTokenRenewed';
import { type createStore } from 'jotai';
import { jwtDecode } from 'jwt-decode';
import { type z } from 'zod';

import { createIdempotencyKey } from './createIdempotencyKey';
import { ErpMarocError, parseErpMarocError } from './erpMarocError';

type Store = ReturnType<typeof createStore>;
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

type RefreshTokenSessionClaims = {
  sub?: string;
  userId?: string;
  workspaceId?: string | null;
  authProvider?: string;
  targetedTokenType?: string;
  isImpersonating?: boolean;
  impersonatorUserWorkspaceId?: string;
  impersonatedUserWorkspaceId?: string;
};

type ClientDependencies = {
  store: Store;
  fetch?: typeof globalThis.fetch;
  renew?: typeof ensureTokenRenewed;
  onAuthenticationLost: () => void | Promise<void>;
};

export type ErpMarocRequest<TSchema extends z.ZodType> = {
  method: HttpMethod;
  path: string;
  query?: Readonly<Record<string, string>>;
  schema: TSchema;
  body?: unknown;
  idempotencyKey?: string;
  signal?: AbortSignal;
  responseType?: 'json';
};

export type ErpMarocPdfRequest = {
  method: 'GET';
  path: string;
  signal?: AbortSignal;
  responseType: 'pdf';
};

export type ErpMarocMutationIntentOptions =
  | { idempotency: 'forbidden' }
  | { idempotency: 'required' };

export type ErpMarocForbiddenMutationIntent<T> = {
  execute: () => Promise<T>;
};

export type ErpMarocRequiredMutationIntent<T> = {
  idempotencyKey: string;
  execute: () => Promise<T>;
  retry: () => Promise<T>;
};

const assertPath = (path: string) => {
  const hasUnsafeSegment = path
    .split('/')
    .some((segment) => segment === '.' || segment === '..');

  if (
    !path.startsWith('/') ||
    path.includes('//') ||
    path.includes('%') ||
    hasUnsafeSegment ||
    /[\\?#\u0000-\u001f\u007f-\u009f]/.test(path)
  ) {
    throw new ErpMarocError('ERP_VALIDATION_ERROR', 400);
  }
};

const snapshotJsonBody = (body: unknown): unknown => {
  if (body === undefined) return undefined;

  try {
    const serialized = JSON.stringify(body);
    if (serialized === undefined) {
      throw new Error('Body is not JSON serializable');
    }
    return JSON.parse(serialized) as unknown;
  } catch {
    throw new ErpMarocError('ERP_VALIDATION_ERROR', 400);
  }
};

const snapshotQuery = (
  query: Readonly<Record<string, string>> | undefined,
): Readonly<Record<string, string>> | undefined =>
  query === undefined ? undefined : { ...query };

const snapshotRequest = <TSchema extends z.ZodType>(
  input: ErpMarocRequest<TSchema>,
): ErpMarocRequest<TSchema> => ({
  method: input.method,
  path: input.path,
  query: snapshotQuery(input.query),
  schema: input.schema,
  body: snapshotJsonBody(input.body),
  idempotencyKey: input.idempotencyKey,
  signal: input.signal,
  responseType: input.responseType,
});

const snapshotPdfRequest = (input: ErpMarocPdfRequest): ErpMarocPdfRequest => ({
  method: input.method,
  path: input.path,
  signal: input.signal,
  responseType: input.responseType,
});

const refreshTokenSessionIdentity = (token: string | undefined) => {
  if (token === undefined) return undefined;

  try {
    const claims = jwtDecode<RefreshTokenSessionClaims>(token);
    return JSON.stringify([
      claims.sub,
      claims.userId,
      claims.workspaceId,
      claims.authProvider,
      claims.targetedTokenType,
      claims.isImpersonating,
      claims.impersonatorUserWorkspaceId,
      claims.impersonatedUserWorkspaceId,
    ]);
  } catch {
    return token;
  }
};

export const createErpMarocClient = ({
  store,
  fetch: fetchImplementation = globalThis.fetch,
  renew = ensureTokenRenewed,
  onAuthenticationLost,
}: ClientDependencies) => {
  let authenticationLost = false;

  const authenticationSnapshot = () => {
    const tokenPair = store.get(tokenPairState.atom);

    return {
      accessToken: tokenPair?.accessOrWorkspaceAgnosticToken?.token,
      refreshTokenSessionIdentity: refreshTokenSessionIdentity(
        tokenPair?.refreshToken.token,
      ),
      workspaceId: store.get(currentWorkspaceState.atom)?.id,
    };
  };

  const isSameSession = (
    initial: ReturnType<typeof authenticationSnapshot>,
    current: ReturnType<typeof authenticationSnapshot>,
  ) =>
    initial.refreshTokenSessionIdentity ===
      current.refreshTokenSessionIdentity &&
    initial.workspaceId === current.workspaceId;

  const send = async <TSchema extends z.ZodType>(
    input: ErpMarocRequest<TSchema> | ErpMarocPdfRequest,
    allowAuthenticationRecovery: boolean,
  ): Promise<z.infer<TSchema> | Blob> => {
    assertPath(input.path);
    const initialAuthentication = authenticationSnapshot();
    const token = initialAuthentication.accessToken;
    if (!token) {
      if (!authenticationLost) {
        authenticationLost = true;
        await onAuthenticationLost();
      }
      throw new ErpMarocError('AUTH_TOKEN_INVALID_OR_EXPIRED', 401);
    }

    const headers: Record<string, string> = {
      Accept:
        input.responseType === 'pdf' ? 'application/pdf' : 'application/json',
      Authorization: `Bearer ${token}`,
    };
    if (input.method !== 'GET') headers['Content-Type'] = 'application/json';
    if ('idempotencyKey' in input && input.idempotencyKey) {
      headers['Idempotency-Key'] = input.idempotencyKey;
    }

    const query =
      'query' in input && input.query !== undefined
        ? new URLSearchParams(input.query).toString()
        : '';
    const response = await fetchImplementation(
      `/erp-maroc-api${input.path}${query === '' ? '' : `?${query}`}`,
      {
        method: input.method,
        headers,
        body:
          'body' in input && input.body !== undefined
            ? JSON.stringify(input.body)
            : undefined,
        signal: input.signal,
        credentials: 'omit',
      },
    );

    if (!response.ok) {
      const error = await parseErpMarocError(response);
      if (
        error.code === 'AUTH_TOKEN_INVALID_OR_EXPIRED' &&
        allowAuthenticationRecovery
      ) {
        const beforeRenewal = authenticationSnapshot();
        if (
          input.signal?.aborted ||
          !isSameSession(initialAuthentication, beforeRenewal)
        ) {
          throw error;
        }
        if (beforeRenewal.accessToken !== token) {
          if (input.method === 'GET' && beforeRenewal.accessToken) {
            return send(input, false);
          }
          throw error;
        }
        const renewed = await renew(store);
        const afterRenewal = authenticationSnapshot();
        const replacement = afterRenewal.accessToken;
        if (
          input.signal?.aborted ||
          !isSameSession(initialAuthentication, afterRenewal) ||
          (!renewed && replacement !== token)
        ) {
          throw error;
        }
        if (!renewed || !replacement || replacement === token) {
          if (!authenticationLost) {
            authenticationLost = true;
            await onAuthenticationLost();
          }
        } else if (input.method === 'GET') {
          return send(input, false);
        }
      }
      throw error;
    }

    if (input.responseType === 'pdf') {
      const mediaType = response.headers
        .get('content-type')
        ?.split(';', 1)[0]
        .trim()
        .toLowerCase();
      if (mediaType !== 'application/pdf') {
        throw new ErpMarocError('ERP_UPSTREAM_INVALID_RESPONSE', 502);
      }
      return response.blob();
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      throw new ErpMarocError('ERP_UPSTREAM_INVALID_RESPONSE', 502);
    }
    const parsed = input.schema.safeParse(payload);
    if (!parsed.success) {
      throw new ErpMarocError('ERP_UPSTREAM_INVALID_RESPONSE', 502);
    }
    return parsed.data;
  };

  function createMutationIntent<TSchema extends z.ZodType>(
    input: Omit<ErpMarocRequest<TSchema>, 'idempotencyKey'>,
    options: { idempotency: 'forbidden' },
  ): ErpMarocForbiddenMutationIntent<z.infer<TSchema>>;
  function createMutationIntent<TSchema extends z.ZodType>(
    input: Omit<ErpMarocRequest<TSchema>, 'idempotencyKey'>,
    options?: { idempotency: 'required' },
  ): ErpMarocRequiredMutationIntent<z.infer<TSchema>>;
  function createMutationIntent<TSchema extends z.ZodType>(
    input: Omit<ErpMarocRequest<TSchema>, 'idempotencyKey'>,
    options: ErpMarocMutationIntentOptions = { idempotency: 'required' },
  ):
    | ErpMarocForbiddenMutationIntent<z.infer<TSchema>>
    | ErpMarocRequiredMutationIntent<z.infer<TSchema>> {
    if (options.idempotency === 'forbidden') {
      const request = snapshotRequest(input);
      return {
        execute: () => send(request, true) as Promise<z.infer<TSchema>>,
      };
    }

    const idempotencyKey = createIdempotencyKey();
    const request = snapshotRequest({ ...input, idempotencyKey });
    const execute = () => send(request, true) as Promise<z.infer<TSchema>>;

    return { idempotencyKey, execute, retry: execute };
  }

  return {
    request: async <TSchema extends z.ZodType>(
      input: ErpMarocRequest<TSchema>,
    ) => send(snapshotRequest(input), true) as Promise<z.infer<TSchema>>,
    pdf: (input: ErpMarocPdfRequest) =>
      send(snapshotPdfRequest(input), true) as Promise<Blob>,
    createMutationIntent,
  };
};

export type ErpMarocClient = ReturnType<typeof createErpMarocClient>;
