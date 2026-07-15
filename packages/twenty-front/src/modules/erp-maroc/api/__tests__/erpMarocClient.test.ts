import { tokenPairState } from '@/auth/states/tokenPairState';
import {
  createErpMarocClient,
  type ErpMarocRequest,
} from '@/erp-maroc/api/erpMarocClient';
import { ErpMarocError } from '@/erp-maroc/api/erpMarocError';
import { waitFor } from '@testing-library/react';
import { createStore } from 'jotai';
import { enableFetchMocks } from 'jest-fetch-mock';
import { z } from 'zod';

const responseSchema = z.object({ value: z.string() });

enableFetchMocks();

const mockJsonResponse = (body: unknown, status = 200) =>
  fetchMock.mockResponseOnce(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const setAccessToken = (
  store: ReturnType<typeof createStore>,
  token: string,
  refreshToken = 'refresh-token',
) => {
  store.set(tokenPairState.atom, {
    accessOrWorkspaceAgnosticToken: { token, expiresAt: '2099-01-01' },
    refreshToken: { token: refreshToken, expiresAt: '2099-01-01' },
  });
};

const createDeferred = <T>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((promiseResolve) => {
    resolve = promiseResolve;
  });

  return { promise, resolve };
};

const createClient = () => {
  const store = createStore();
  const renew = jest.fn<Promise<boolean>, [typeof store]>();
  const onAuthenticationLost = jest.fn();

  setAccessToken(store, 'access-token');

  return {
    client: createErpMarocClient({
      store,
      fetch: fetchMock as unknown as typeof globalThis.fetch,
      renew,
      onAuthenticationLost,
    }),
    fetchMock,
    onAuthenticationLost,
    renew,
    store,
  };
};

describe('createErpMarocClient', () => {
  beforeEach(() => {
    fetchMock.resetMocks();
  });

  it('sends the current access token as a bearer token', async () => {
    const { client, fetchMock } = createClient();
    mockJsonResponse({ value: 'ok' });

    await expect(
      client.request({
        method: 'GET',
        path: '/products',
        schema: responseSchema,
      }),
    ).resolves.toEqual({ value: 'ok' });

    expect(fetchMock).toHaveBeenCalledWith('/erp-maroc-api/products', {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: 'Bearer access-token',
      },
      body: undefined,
      signal: undefined,
      credentials: 'omit',
    });
  });

  it('serializes a GET request query into the ERP API URL', async () => {
    const { client, fetchMock } = createClient();
    mockJsonResponse({ value: 'ok' });

    await expect(
      client.request({
        method: 'GET',
        path: '/products',
        query: { cursor: 'cursor-value' },
        schema: responseSchema,
      }),
    ).resolves.toEqual({ value: 'ok' });

    expect(fetchMock).toHaveBeenCalledWith(
      '/erp-maroc-api/products?cursor=cursor-value',
      expect.anything(),
    );
  });

  it('renews an expired token and replays a GET once with the new token', async () => {
    const { client, fetchMock, renew, store } = createClient();
    mockJsonResponse(
      { code: 'AUTH_TOKEN_INVALID_OR_EXPIRED', statusCode: 401 },
      401,
    );
    mockJsonResponse({ value: 'renewed' });
    renew.mockImplementation(async () => {
      setAccessToken(store, 'renewed-access-token');
      return true;
    });

    await expect(
      client.request({
        method: 'GET',
        path: '/products',
        schema: responseSchema,
      }),
    ).resolves.toEqual({ value: 'renewed' });

    expect(renew).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][1]?.headers).toEqual(
      expect.objectContaining({ Authorization: 'Bearer access-token' }),
    );
    expect(fetchMock.mock.calls[1][1]?.headers).toEqual(
      expect.objectContaining({
        Authorization: 'Bearer renewed-access-token',
      }),
    );
  });

  it('replays a concurrent GET with the token renewed by another request', async () => {
    const { client, fetchMock, onAuthenticationLost, renew, store } =
      createClient();
    const renewal = createDeferred<boolean>();
    const releaseSecondAuthenticationError = createDeferred<void>();
    let responseIndex = 0;
    fetchMock.mockResponse(async () => {
      const currentResponseIndex = responseIndex++;

      if (currentResponseIndex === 1) {
        await releaseSecondAuthenticationError.promise;
      }

      if (currentResponseIndex < 2) {
        return {
          body: JSON.stringify({
            code: 'AUTH_TOKEN_INVALID_OR_EXPIRED',
            statusCode: 401,
          }),
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        };
      }

      return {
        body: JSON.stringify({
          value: currentResponseIndex === 2 ? 'first' : 'second',
        }),
        headers: { 'Content-Type': 'application/json' },
      };
    });
    renew.mockReturnValue(renewal.promise);

    const firstRequest = client.request({
      method: 'GET',
      path: '/products/first',
      schema: responseSchema,
    });
    const secondRequest = client.request({
      method: 'GET',
      path: '/products/second',
      schema: responseSchema,
    });
    await waitFor(() => expect(renew).toHaveBeenCalledTimes(1));
    setAccessToken(store, 'renewed-access-token');
    renewal.resolve(true);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    releaseSecondAuthenticationError.resolve(undefined);

    await expect(Promise.all([firstRequest, secondRequest])).resolves.toEqual([
      { value: 'first' },
      { value: 'second' },
    ]);
    expect(renew).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(fetchMock.mock.calls[0][1]?.headers).toEqual(
      expect.objectContaining({ Authorization: 'Bearer access-token' }),
    );
    expect(fetchMock.mock.calls[1][1]?.headers).toEqual(
      expect.objectContaining({ Authorization: 'Bearer access-token' }),
    );
    expect(fetchMock.mock.calls[2][1]?.headers).toEqual(
      expect.objectContaining({
        Authorization: 'Bearer renewed-access-token',
      }),
    );
    expect(fetchMock.mock.calls[3][1]?.headers).toEqual(
      expect.objectContaining({
        Authorization: 'Bearer renewed-access-token',
      }),
    );
    expect(onAuthenticationLost).not.toHaveBeenCalled();
  });

  it('does not renew again when the replayed GET also returns an authentication error', async () => {
    const { client, fetchMock, renew, store } = createClient();
    mockJsonResponse(
      { code: 'AUTH_TOKEN_INVALID_OR_EXPIRED', statusCode: 401 },
      401,
    );
    mockJsonResponse(
      { code: 'AUTH_TOKEN_INVALID_OR_EXPIRED', statusCode: 401 },
      401,
    );
    renew.mockImplementation(async () => {
      setAccessToken(store, 'renewed-access-token');
      return true;
    });

    await expect(
      client.request({
        method: 'GET',
        path: '/products',
        schema: responseSchema,
      }),
    ).rejects.toMatchObject({
      code: 'AUTH_TOKEN_INVALID_OR_EXPIRED',
      statusCode: 401,
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(renew).toHaveBeenCalledTimes(1);
  });

  it('does not logout or replay when the request is aborted during renewal', async () => {
    const { client, fetchMock, onAuthenticationLost, renew } = createClient();
    const renewal = createDeferred<boolean>();
    const abortController = new AbortController();
    mockJsonResponse(
      { code: 'AUTH_TOKEN_INVALID_OR_EXPIRED', statusCode: 401 },
      401,
    );
    renew.mockReturnValue(renewal.promise);

    const request = client.request({
      method: 'GET',
      path: '/products',
      schema: responseSchema,
      signal: abortController.signal,
    });
    await waitFor(() => expect(renew).toHaveBeenCalledTimes(1));
    abortController.abort();
    renewal.resolve(false);

    await expect(request).rejects.toMatchObject({
      code: 'AUTH_TOKEN_INVALID_OR_EXPIRED',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(onAuthenticationLost).not.toHaveBeenCalled();
  });

  it('does not logout after failed renewal when the token was replaced', async () => {
    const { client, fetchMock, onAuthenticationLost, renew, store } =
      createClient();
    const renewal = createDeferred<boolean>();
    mockJsonResponse(
      { code: 'AUTH_TOKEN_INVALID_OR_EXPIRED', statusCode: 401 },
      401,
    );
    renew.mockReturnValue(renewal.promise);

    const request = client.request({
      method: 'GET',
      path: '/products',
      schema: responseSchema,
    });
    await waitFor(() => expect(renew).toHaveBeenCalledTimes(1));
    setAccessToken(store, 'new-session-token');
    renewal.resolve(false);

    await expect(request).rejects.toMatchObject({
      code: 'AUTH_TOKEN_INVALID_OR_EXPIRED',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(onAuthenticationLost).not.toHaveBeenCalled();
  });

  it('does not replay an obsolete request after session replacement', async () => {
    const { client, fetchMock, onAuthenticationLost, renew, store } =
      createClient();
    const renewal = createDeferred<boolean>();
    mockJsonResponse(
      { code: 'AUTH_TOKEN_INVALID_OR_EXPIRED', statusCode: 401 },
      401,
    );
    renew.mockReturnValue(renewal.promise);

    const request = client.request({
      method: 'GET',
      path: '/products',
      schema: responseSchema,
    });
    await waitFor(() => expect(renew).toHaveBeenCalledTimes(1));
    setAccessToken(store, 'new-session-token', 'new-session-refresh-token');
    renewal.resolve(true);

    await expect(request).rejects.toMatchObject({
      code: 'AUTH_TOKEN_INVALID_OR_EXPIRED',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(onAuthenticationLost).not.toHaveBeenCalled();
  });

  it('logs out after failed renewal while the request snapshot is current', async () => {
    const { client, fetchMock, onAuthenticationLost, renew } = createClient();
    mockJsonResponse(
      { code: 'AUTH_TOKEN_INVALID_OR_EXPIRED', statusCode: 401 },
      401,
    );
    renew.mockResolvedValue(false);

    await expect(
      client.request({
        method: 'GET',
        path: '/products',
        schema: responseSchema,
      }),
    ).rejects.toMatchObject({ code: 'AUTH_TOKEN_INVALID_OR_EXPIRED' });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(onAuthenticationLost).toHaveBeenCalledTimes(1);
  });

  it('does not automatically replay a mutation after token renewal', async () => {
    const { client, fetchMock, renew, store } = createClient();
    mockJsonResponse(
      { code: 'AUTH_TOKEN_INVALID_OR_EXPIRED', statusCode: 401 },
      401,
    );
    renew.mockImplementation(async () => {
      setAccessToken(store, 'renewed-access-token');
      return true;
    });

    await expect(
      client.request({
        method: 'POST',
        path: '/products',
        schema: responseSchema,
        body: { name: 'Desk' },
      }),
    ).rejects.toMatchObject({
      code: 'AUTH_TOKEN_INVALID_OR_EXPIRED',
      statusCode: 401,
    });

    expect(renew).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('reuses the same idempotency key when a mutation intent is retried', async () => {
    const { client, fetchMock } = createClient();
    mockJsonResponse({ code: 'ERP_STATE_CONFLICT', statusCode: 409 }, 409);
    mockJsonResponse({ value: 'created' });

    const intent = client.createMutationIntent({
      method: 'POST',
      path: '/products',
      schema: responseSchema,
      body: { name: 'Desk' },
    });
    const idempotencyKey: string = intent.idempotencyKey;

    await expect(intent.execute()).rejects.toBeInstanceOf(ErpMarocError);
    await expect(intent.retry()).resolves.toEqual({ value: 'created' });

    const firstHeaders = fetchMock.mock.calls[0][1]?.headers;
    const secondHeaders = fetchMock.mock.calls[1][1]?.headers;
    expect(firstHeaders).toEqual(
      expect.objectContaining({ 'Idempotency-Key': idempotencyKey }),
    );
    expect(secondHeaders).toEqual(
      expect.objectContaining({ 'Idempotency-Key': idempotencyKey }),
    );
  });

  it('exposes only execute for a non-idempotent mutation intent', () => {
    const { client, fetchMock } = createClient();

    const intent = client.createMutationIntent(
      {
        method: 'POST',
        path: '/products',
        schema: responseSchema,
        body: { name: 'Desk' },
      },
      { idempotency: 'forbidden' },
    );

    expect(intent).toEqual({ execute: expect.any(Function) });
    expect(intent).not.toHaveProperty('retry');
    expect(intent).not.toHaveProperty('idempotencyKey');
    expect(fetchMock).not.toHaveBeenCalled();

    if (false) {
      // @ts-expect-error Forbidden mutation intents cannot be retried.
      intent.retry();
      // @ts-expect-error Forbidden mutation intents have no idempotency key.
      String(intent.idempotencyKey);
    }
  });

  it('requires a fresh non-idempotent intent to repeat an operation', async () => {
    const { client, fetchMock } = createClient();
    const input = {
      method: 'POST' as const,
      path: '/products',
      schema: responseSchema,
      body: { name: 'Desk' },
    };
    mockJsonResponse({ code: 'ERP_STATE_CONFLICT', statusCode: 409 }, 409);
    mockJsonResponse({ value: 'created' });

    const firstIntent = client.createMutationIntent(input, {
      idempotency: 'forbidden',
    });
    await expect(firstIntent.execute()).rejects.toBeInstanceOf(ErpMarocError);

    const freshIntent = client.createMutationIntent(input, {
      idempotency: 'forbidden',
    });
    await expect(freshIntent.execute()).resolves.toEqual({ value: 'created' });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][1]?.headers).not.toHaveProperty(
      'Idempotency-Key',
    );
    expect(fetchMock.mock.calls[1][1]?.headers).not.toHaveProperty(
      'Idempotency-Key',
    );
  });

  it('does not automatically replay a non-idempotent intent after auth recovery', async () => {
    const { client, fetchMock, renew, store } = createClient();
    mockJsonResponse(
      { code: 'AUTH_TOKEN_INVALID_OR_EXPIRED', statusCode: 401 },
      401,
    );
    renew.mockImplementation(async () => {
      setAccessToken(store, 'renewed-access-token');
      return true;
    });
    const intent = client.createMutationIntent(
      {
        method: 'POST',
        path: '/products',
        schema: responseSchema,
        body: { name: 'Desk' },
      },
      { idempotency: 'forbidden' },
    );

    await expect(intent.execute()).rejects.toMatchObject({
      code: 'AUTH_TOKEN_INVALID_OR_EXPIRED',
      statusCode: 401,
    });

    expect(renew).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('does not automatically replay a non-idempotent intent after a network failure', async () => {
    const { client, fetchMock, renew } = createClient();
    const networkError = new TypeError('Network request failed');
    fetchMock.mockRejectOnce(networkError);
    const intent = client.createMutationIntent(
      {
        method: 'POST',
        path: '/products',
        schema: responseSchema,
        body: { name: 'Desk' },
      },
      { idempotency: 'forbidden' },
    );

    await expect(intent.execute()).rejects.toBe(networkError);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(renew).not.toHaveBeenCalled();
  });

  it('snapshots the complete mutation intent when it is created', async () => {
    const { client, fetchMock } = createClient();
    const originalSignal = new AbortController().signal;
    const query = { cursor: 'original-cursor' };
    const input: Omit<ErpMarocRequest<z.ZodType>, 'idempotencyKey'> = {
      method: 'POST',
      path: '/orders',
      schema: responseSchema,
      signal: originalSignal,
      query,
      body: {
        customer: { name: 'Original customer' },
        lines: [{ quantity: 1 }],
      },
    };
    const intent = client.createMutationIntent(input);
    query.cursor = 'changed-before-execute';
    input.method = 'DELETE';
    input.path = '/changed-before-execute';
    input.schema = z.never();
    input.signal = new AbortController().signal;
    input.body = { changed: true };
    mockJsonResponse({ code: 'ERP_STATE_CONFLICT', statusCode: 409 }, 409);
    mockJsonResponse({ value: 'created' });

    await expect(intent.execute()).rejects.toBeInstanceOf(ErpMarocError);
    query.cursor = 'changed-before-retry';
    input.method = 'PATCH';
    input.path = '/changed-before-retry';
    input.body = { changedAgain: true };
    await expect(intent.retry()).resolves.toEqual({ value: 'created' });

    const expectedPayload = JSON.stringify({
      customer: { name: 'Original customer' },
      lines: [{ quantity: 1 }],
    });
    expect(fetchMock.mock.calls[0][0]).toBe(
      '/erp-maroc-api/orders?cursor=original-cursor',
    );
    expect(fetchMock.mock.calls[1][0]).toBe(
      '/erp-maroc-api/orders?cursor=original-cursor',
    );
    expect(fetchMock.mock.calls[0][1]?.method).toBe('POST');
    expect(fetchMock.mock.calls[1][1]?.method).toBe('POST');
    expect(fetchMock.mock.calls[0][1]?.body).toBe(expectedPayload);
    expect(fetchMock.mock.calls[1][1]?.body).toBe(expectedPayload);
    expect(fetchMock.mock.calls[0][1]?.signal).toBe(originalSignal);
    expect(fetchMock.mock.calls[1][1]?.signal).toBe(originalSignal);
    expect(fetchMock.mock.calls[0][1]?.headers).toEqual(
      expect.objectContaining({ 'Idempotency-Key': intent.idempotencyKey }),
    );
    expect(fetchMock.mock.calls[1][1]?.headers).toEqual(
      expect.objectContaining({ 'Idempotency-Key': intent.idempotencyKey }),
    );
  });

  it('snapshots a GET before renewal so replay ignores input mutation', async () => {
    const { client, fetchMock, renew, store } = createClient();
    const renewal = createDeferred<boolean>();
    const query = { cursor: 'original-cursor' };
    const input: ErpMarocRequest<typeof responseSchema> = {
      method: 'GET',
      path: '/products',
      query,
      schema: responseSchema,
    };
    mockJsonResponse(
      { code: 'AUTH_TOKEN_INVALID_OR_EXPIRED', statusCode: 401 },
      401,
    );
    mockJsonResponse({ value: 'renewed' });
    renew.mockReturnValue(renewal.promise);

    const request = client.request(input);
    await waitFor(() => expect(renew).toHaveBeenCalledTimes(1));
    input.path = '/metadata';
    query.cursor = 'changed-cursor';
    setAccessToken(store, 'renewed-access-token');
    renewal.resolve(true);

    await expect(request).resolves.toEqual({ value: 'renewed' });
    expect(fetchMock.mock.calls[0][0]).toBe(
      '/erp-maroc-api/products?cursor=original-cursor',
    );
    expect(fetchMock.mock.calls[1][0]).toBe(
      '/erp-maroc-api/products?cursor=original-cursor',
    );
  });

  it.each([
    [
      'cyclic',
      () => {
        const body: Record<string, unknown> = {};
        body.self = body;
        return body;
      },
    ],
    ['BigInt', () => ({ amount: BigInt(1) })],
  ])('rejects a non-JSON %s mutation body', (_label, createBody) => {
    const { client, fetchMock } = createClient();

    expect(() =>
      client.createMutationIntent({
        method: 'POST',
        path: '/orders',
        schema: responseSchema,
        body: createBody(),
      }),
    ).toThrow('ERP_VALIDATION_ERROR');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects a non-JSON direct request body as a validation error', async () => {
    const { client, fetchMock } = createClient();

    await expect(
      client.request({
        method: 'POST',
        path: '/orders',
        schema: responseSchema,
        body: { amount: BigInt(1) },
      }),
    ).rejects.toMatchObject({
      code: 'ERP_VALIDATION_ERROR',
      statusCode: 400,
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    '/../metadata',
    '/%2e%2e/metadata',
    '/products//metadata',
    '/./metadata',
    '/products%20archive',
    '/products/\u0000metadata',
  ])('rejects unsafe path %p before fetch', async (path) => {
    const { client, fetchMock } = createClient();

    await expect(
      client.request({ method: 'GET', path, schema: responseSchema }),
    ).rejects.toMatchObject({
      code: 'ERP_VALIDATION_ERROR',
      statusCode: 400,
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects a JSON request path containing a query before fetch', async () => {
    const { client, fetchMock } = createClient();

    await expect(
      client.request({
        method: 'GET',
        path: '/products?cursor=cursor-value',
        schema: responseSchema,
      }),
    ).rejects.toMatchObject({
      code: 'ERP_VALIDATION_ERROR',
      statusCode: 400,
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('surfaces the structured ERP error returned by the API', async () => {
    const { client, fetchMock } = createClient();
    mockJsonResponse({ code: 'ERP_NOT_FOUND', statusCode: 404 }, 404);

    await expect(
      client.request({
        method: 'GET',
        path: '/products/missing',
        schema: responseSchema,
      }),
    ).rejects.toMatchObject({ code: 'ERP_NOT_FOUND', statusCode: 404 });
  });

  it.each([Number.MAX_SAFE_INTEGER + 1, 502.5, '502'])(
    'rejects an ERP error payload with invalid status code %p',
    async (statusCode) => {
      const { client } = createClient();
      mockJsonResponse(
        {
          code: 'ERP_NOT_FOUND',
          statusCode,
        },
        502,
      );

      await expect(
        client.request({
          method: 'GET',
          path: '/products/missing',
          schema: responseSchema,
        }),
      ).rejects.toMatchObject({ code: 'ERP_UNKNOWN', statusCode: 502 });
    },
  );

  it('returns a PDF blob and requests the PDF media type', async () => {
    const { client, fetchMock } = createClient();
    fetchMock.mockResponseOnce('pdf-content', {
      headers: { 'Content-Type': ' Application/PDF ; charset=binary' },
    });

    const result = await client.pdf({
      method: 'GET',
      path: '/invoices/1/pdf',
      responseType: 'pdf',
    });

    expect(result.size).toBeGreaterThan(0);
    expect(await result.text()).toBe('pdf-content');
    expect(fetchMock.mock.calls[0][0]).toBe('/erp-maroc-api/invoices/1/pdf');
    expect(fetchMock.mock.calls[0][1]?.headers).toEqual(
      expect.objectContaining({ Accept: 'application/pdf' }),
    );
  });

  it('rejects a non-PDF response from a PDF endpoint', async () => {
    const { client, fetchMock } = createClient();
    mockJsonResponse({ value: 'not-a-pdf' });

    await expect(
      client.pdf({
        method: 'GET',
        path: '/invoices/1/pdf',
        responseType: 'pdf',
      }),
    ).rejects.toMatchObject({
      code: 'ERP_UPSTREAM_INVALID_RESPONSE',
      statusCode: 502,
    });
  });

  it('forwards aborts to fetch without normalizing the abort error', async () => {
    const { client, fetchMock } = createClient();
    const abortController = new AbortController();
    fetchMock.mockImplementation(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            reject(
              new DOMException('The operation was aborted.', 'AbortError'),
            );
          });
        }),
    );

    const request = client.request({
      method: 'GET',
      path: '/products',
      schema: responseSchema,
      signal: abortController.signal,
    });
    abortController.abort();

    await expect(request).rejects.toMatchObject({ name: 'AbortError' });
    expect(fetchMock.mock.calls[0][1]?.signal).toBe(abortController.signal);
  });
});
