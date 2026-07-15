import { EventEmitter } from 'node:events';

import { type ExecutionContext, ForbiddenException } from '@nestjs/common';
import { GUARDS_METADATA, PATH_METADATA } from '@nestjs/common/constants';

import { RestApiCoreController } from 'src/engine/api/rest/core/controllers/rest-api-core.controller';
import { JwtAuthGuard } from 'src/engine/guards/jwt-auth.guard';
import { RequireAccessTokenGuard } from 'src/engine/guards/require-access-token.guard';
import { WorkspaceAuthGuard } from 'src/engine/guards/workspace-auth.guard';
import { JwtTokenTypeEnum } from 'src/engine/core-modules/auth/types/jwt-token-type.enum';

import { ErpMarocActivatedUserGuard } from './erp-maroc-activated-user.guard';
import {
  ErpMarocProxyError,
  type ErpMarocProxyRequest,
  type ErpMarocProxyResult,
} from './erp-maroc-proxy.service';
import { ErpMarocController } from './erp-maroc.controller';

const identity = {
  twentyUserId: '20202020-1111-4111-8111-111111111111',
  twentyWorkspaceId: '20202020-2222-4222-8222-222222222222',
  twentyUserEmail: 'commercial@example.com',
};

const contextResult: ErpMarocProxyResult = {
  kind: 'json',
  statusCode: 200,
  data: { userRole: 'COMMERCIAL' },
};

class TestResponse extends EventEmitter {
  statusCode = 200;
  jsonBody: unknown;
  headers = new Map<string, string>();
  chunks: Uint8Array[] = [];
  ended = false;
  writeResult = true;
  headersSent = false;
  destroyed = false;
  writableEnded = false;

  status(code: number) {
    this.statusCode = code;
    return this;
  }

  json(body: unknown) {
    this.jsonBody = body;
    return this;
  }

  setHeader(name: string, value: string) {
    this.headers.set(name.toLowerCase(), value);
    return this;
  }

  write(chunk: Uint8Array) {
    this.chunks.push(chunk);
    return this.writeResult;
  }

  end() {
    this.ended = true;
    this.writableEnded = true;
    return this;
  }

  destroy() {
    this.destroyed = true;
    return this;
  }
}

const createRequest = (overrides: Record<string, unknown> = {}) => {
  const request = new EventEmitter() as EventEmitter & Record<string, unknown>;
  Object.assign(request, {
    method: 'GET',
    params: { path: ['context'] },
    query: {},
    headers: {},
    user: { id: identity.twentyUserId, email: identity.twentyUserEmail },
    workspace: { id: identity.twentyWorkspaceId },
    userWorkspaceId: 'user-workspace-1',
    workspaceMemberId: 'member-1',
    workspaceMember: { id: 'member-1' },
    ...overrides,
  });
  return request as unknown as Parameters<ErpMarocController['proxy']>[0];
};

const contextFor = (request: Record<string, unknown>) =>
  ({
    getType: () => 'http',
    switchToHttp: () => ({ getRequest: () => request }),
  }) as unknown as ExecutionContext;

describe('ErpMarocController', () => {
  const execute = jest.fn<
    Promise<ErpMarocProxyResult>,
    [ErpMarocProxyRequest]
  >();
  const config = { get: jest.fn().mockReturnValue(true) };
  let controller: ErpMarocController;

  beforeEach(() => {
    jest.clearAllMocks();
    config.get.mockReturnValue(true);
    execute.mockResolvedValue(contextResult);
    controller = new ErpMarocController(config, { execute });
  });

  it('uses a dedicated namespace and exact guard order without colliding with REST', () => {
    expect(Reflect.getMetadata(PATH_METADATA, ErpMarocController)).toBe(
      'erp-maroc-api',
    );
    expect(Reflect.getMetadata(PATH_METADATA, RestApiCoreController)).toBe(
      'rest',
    );
    expect(Reflect.getMetadata(GUARDS_METADATA, ErpMarocController)).toEqual([
      JwtAuthGuard,
      RequireAccessTokenGuard,
      WorkspaceAuthGuard,
      ErpMarocActivatedUserGuard,
    ]);
  });

  it('accepts only ACCESS token types before workspace activation checks', () => {
    const guard = new RequireAccessTokenGuard();

    expect(
      guard.canActivate(contextFor({ tokenType: JwtTokenTypeEnum.ACCESS })),
    ).toBe(true);

    for (const tokenType of [
      undefined,
      JwtTokenTypeEnum.API_KEY,
      JwtTokenTypeEnum.APPLICATION_ACCESS,
      JwtTokenTypeEnum.REMOTE_SERVER,
      JwtTokenTypeEnum.PLAYGROUND,
      JwtTokenTypeEnum.REFRESH,
    ]) {
      expect(() => guard.canActivate(contextFor({ tokenType }))).toThrow();
    }
  });

  it.each(['missing', 'invalid', 'expired'])(
    'rejects a %s bearer through the real JWT guard behavior',
    async () => {
      const jwtGuard = new JwtAuthGuard(
        {
          validateTokenByRequest: jest
            .fn()
            .mockRejectedValue(new ForbiddenException('invalid token')),
        } as never,
        { getMetadataVersion: jest.fn() } as never,
      );

      await expect(jwtGuard.canActivate(contextFor({}))).resolves.toBe(false);
    },
  );

  it('returns 404 without upstream access when ERP Maroc is disabled', async () => {
    config.get.mockReturnValue(false);
    const response = new TestResponse();

    await controller.proxy(createRequest(), response as never);

    expect(execute).not.toHaveBeenCalled();
    expect(response.statusCode).toBe(404);
    expect(response.jsonBody).toEqual({
      statusCode: 404,
      code: 'ERP_DISABLED',
    });
  });

  it('reuses the single context preflight result for GET /context', async () => {
    const response = new TestResponse();

    await controller.proxy(createRequest(), response as never);

    expect(execute).toHaveBeenCalledTimes(1);
    expect(execute).toHaveBeenCalledWith(
      expect.objectContaining({ method: 'GET', path: '/context', identity }),
    );
    expect(response.statusCode).toBe(200);
    expect(response.jsonBody).toEqual(contextResult.data);
  });

  it('preflights then executes with server identity and ignores forged headers', async () => {
    execute.mockResolvedValueOnce(contextResult).mockResolvedValueOnce({
      kind: 'json',
      statusCode: 201,
      data: { id: 'p1' },
    });
    const response = new TestResponse();
    const request = createRequest({
      method: 'POST',
      params: { path: ['products'] },
      body: { sku: 'SKU-1' },
      headers: {
        'content-type': 'application/json',
        'content-length': '15',
        'idempotency-key': 'browser-intent',
        'x-twenty-user-id': 'forged-user',
        'x-twenty-workspace-id': 'forged-workspace',
        'x-twenty-user-email': 'forged@example.com',
      },
    });

    await controller.proxy(request, response as never);

    expect(execute).toHaveBeenCalledTimes(2);
    expect(execute.mock.calls[0][0]).toEqual(
      expect.objectContaining({ method: 'GET', path: '/context', identity }),
    );
    expect(execute.mock.calls[1][0]).toEqual(
      expect.objectContaining({
        method: 'POST',
        path: '/products',
        body: { sku: 'SKU-1' },
        contentType: 'application/json',
        contentLength: '15',
        idempotencyKey: 'browser-intent',
        identity,
      }),
    );
    expect(execute.mock.calls[1][0]).not.toHaveProperty('browserHeaders');
    expect(response.statusCode).toBe(201);
    expect(response.jsonBody).toEqual({ id: 'p1' });
    expect(request.listenerCount('aborted')).toBe(0);
    expect(response.listenerCount('close')).toBe(0);
  });

  it('passes transfer-encoding metadata without trusting any other header', async () => {
    execute.mockResolvedValueOnce(contextResult).mockResolvedValueOnce({
      kind: 'json',
      statusCode: 200,
      data: { ok: true },
    });
    const response = new TestResponse();

    await controller.proxy(
      createRequest({
        method: 'PATCH',
        params: { path: ['products', identity.twentyUserId] },
        body: { label: 'A' },
        headers: {
          'content-type': 'application/json',
          'transfer-encoding': 'chunked',
          authorization: 'Bearer forged',
          cookie: 'secret',
          origin: 'https://attacker.test',
        },
      }),
      response as never,
    );

    expect(execute.mock.calls[1][0]).toEqual(
      expect.objectContaining({
        transferEncoding: 'chunked',
        contentType: 'application/json',
      }),
    );
    expect(execute.mock.calls[1][0]).not.toHaveProperty('authorization');
    expect(execute.mock.calls[1][0]).not.toHaveProperty('cookie');
    expect(execute.mock.calls[1][0]).not.toHaveProperty('origin');
  });

  it.each([
    [
      new ErpMarocProxyError('ERP_LINK_REQUIRED', 403),
      403,
      'ERP_LINK_REQUIRED',
    ],
    [
      new ErpMarocProxyError('ERP_VALIDATION_ERROR', 422),
      422,
      'ERP_VALIDATION_ERROR',
    ],
    [new ErpMarocProxyError('ERP_UNKNOWN', 502), 502, 'ERP_UNKNOWN'],
    [new Error('secret diagnostic'), 502, 'ERP_UNKNOWN'],
  ] as const)(
    'returns stable sanitized errors',
    async (error, statusCode, code) => {
      execute.mockRejectedValueOnce(error);
      const response = new TestResponse();

      await controller.proxy(createRequest(), response as never);

      expect(response.statusCode).toBe(statusCode);
      expect(response.jsonBody).toEqual({ statusCode, code });
    },
  );

  it('streams PDF bytes and forwards only safe PDF headers', async () => {
    const bytes = new Uint8Array([1, 2, 3]);
    execute.mockResolvedValueOnce(contextResult).mockResolvedValueOnce({
      kind: 'pdf',
      statusCode: 200,
      contentLength: 3,
      headers: {
        'content-type': 'application/pdf',
        'content-length': '3',
        'content-disposition': 'attachment; filename="invoice.pdf"',
        'x-content-type-options': 'nosniff',
      } as never,
      body: new ReadableStream({
        start(streamController) {
          streamController.enqueue(bytes);
          streamController.close();
        },
      }),
    });
    const response = new TestResponse();

    await controller.proxy(
      createRequest({
        params: { path: ['invoices', identity.twentyUserId, 'pdf'] },
      }),
      response as never,
    );

    expect(Buffer.concat(response.chunks)).toEqual(Buffer.from([1, 2, 3]));
    expect(response.chunks[0]).toBe(bytes);
    expect(response.headers.get('content-type')).toBe('application/pdf');
    expect(response.headers.get('content-disposition')).toBe(
      'attachment; filename="invoice.pdf"',
    );
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(response.headers.get('pragma')).toBe('no-cache');
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
    expect(response.ended).toBe(true);
  });

  it('cancels PDF streaming when close arrives before drain', async () => {
    const cancel = jest.fn();
    let operationSignal: AbortSignal | undefined;
    const body = new ReadableStream<Uint8Array>({
      start(streamController) {
        streamController.enqueue(new Uint8Array([1, 2, 3]));
      },
      cancel,
    });
    execute.mockImplementation(async (input) => {
      if (input.path === '/context') return contextResult;
      operationSignal = input.clientSignal;
      return {
        kind: 'pdf',
        statusCode: 200,
        contentLength: 3,
        headers: {
          'content-type': 'application/pdf',
          'content-length': '3',
          'cache-control': 'private, no-store',
          pragma: 'no-cache',
          'x-content-type-options': 'nosniff',
        },
        body,
      };
    });
    const response = new TestResponse();
    response.writeResult = false;
    const pending = controller.proxy(
      createRequest({
        params: { path: ['invoices', identity.twentyUserId, 'pdf'] },
      }),
      response as never,
    );

    for (let index = 0; index < 10 && response.chunks.length === 0; index++) {
      await Promise.resolve();
    }
    expect(response.chunks).toHaveLength(1);
    response.emit('close');

    let completed = false;
    void pending.then(() => {
      completed = true;
    });
    for (let index = 0; index < 10 && !completed; index++) {
      await Promise.resolve();
    }

    expect(completed).toBe(true);
    await pending;
    expect(operationSignal?.aborted).toBe(true);
    expect(cancel).toHaveBeenCalledTimes(1);
    expect(response.listenerCount('drain')).toBe(0);
    expect(response.listenerCount('close')).toBe(0);
  }, 1_000);

  it('aborts the upstream signal when the client disconnects', async () => {
    let operationSignal: AbortSignal | undefined;
    execute.mockImplementation(async (input) => {
      if (input.path === '/context') return contextResult;
      operationSignal = input.clientSignal;
      return await new Promise<ErpMarocProxyResult>((_resolve, reject) => {
        input.clientSignal?.addEventListener('abort', () =>
          reject(new Error('closed')),
        );
      });
    });
    const request = createRequest({ params: { path: ['products'] } });
    const response = new TestResponse();
    const pending = controller.proxy(request, response as never);

    await Promise.resolve();
    request.emit('aborted');
    await pending;

    expect(operationSignal?.aborted).toBe(true);
    expect(response.jsonBody).toBeUndefined();
    expect(response.destroyed).toBe(true);
  });

  it('also aborts the upstream signal on response close', async () => {
    let operationSignal: AbortSignal | undefined;
    execute.mockImplementation(async (input) => {
      if (input.path === '/context') return contextResult;
      operationSignal = input.clientSignal;
      return await new Promise<ErpMarocProxyResult>((_resolve, reject) => {
        input.clientSignal?.addEventListener('abort', () =>
          reject(new Error('closed')),
        );
      });
    });
    const response = new TestResponse();
    const pending = controller.proxy(
      createRequest({ params: { path: ['products'] } }),
      response as never,
    );

    await Promise.resolve();
    response.emit('close');
    await pending;

    expect(operationSignal?.aborted).toBe(true);
    expect(response.jsonBody).toBeUndefined();
    expect(response.destroyed).toBe(true);
  });
});
