import {
  type ErpMarocConfigReader,
  ErpMarocProxyError,
  ErpMarocProxyService,
  type ErpMarocProxyRequest,
} from './erp-maroc-proxy.service';

const MiB = 1024 * 1024;
const identity = {
  twentyUserId: 'user-1',
  twentyWorkspaceId: 'workspace-1',
  twentyUserEmail: 'user@example.test',
} as const;

const contextPayload = {
  societeId: '11111111-1111-4111-8111-111111111111',
  timezone: 'Africa/Casablanca',
  role: 'OWNER',
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
    whatsappDelivery: false,
  },
} as const;

const productPayload = {
  id: '11111111-1111-4111-8111-111111111111',
  societeId: '22222222-2222-4222-8222-222222222222',
  code: 'CONSULT',
  name: 'Consulting',
  description: null,
  type: 'SERVICE',
  unit: 'DAY',
  defaultPriceHt: 1000,
  tvaRate: 20,
  incomeAccountCode: null,
  expenseAccountCode: null,
  isActive: true,
  createdAt: '2026-07-11T10:00:00Z',
  updatedAt: '2026-07-11T10:00:00Z',
} as const;

const jsonResponse = (body: unknown, init: ResponseInit = {}) => {
  const { headers, status = 200, ...rest } = init;

  return new Response(JSON.stringify(body), {
    ...rest,
    status,
    headers: { 'content-type': 'application/json', ...headers },
  });
};

const streamResponse = (
  chunks: Uint8Array[],
  init: ResponseInit,
  cancel?: jest.Mock,
) =>
  new Response(
    new ReadableStream<Uint8Array>({
      start(controller) {
        for (const chunk of chunks) controller.enqueue(chunk);
        controller.close();
      },
      cancel,
    }),
    init,
  );

const consume = async (stream: ReadableStream<Uint8Array>) => {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) return Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)));
    chunks.push(value);
  }
};

describe('ErpMarocProxyService', () => {
  let service: ErpMarocProxyService;
  let fetchMock: jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    const config: ErpMarocConfigReader = {
      get: jest.fn((key: 'ERP_API_URL' | 'ERP_INTERNAL_API_KEY') =>
        key === 'ERP_API_URL'
          ? 'https://erp.internal.test/api/'
          : 'server-secret',
      ),
    };
    service = new ErpMarocProxyService(config);
    fetchMock = jest.fn<Promise<Response>, Parameters<typeof fetch>>();
    global.fetch = fetchMock;
  });

  afterEach(() => {
    expect(jest.getTimerCount()).toBe(0);
  });

  const request = (
    overrides: Partial<ErpMarocProxyRequest> & {
      contentType?: string;
      contentLength?: string;
      transferEncoding?: string;
    } = {},
  ) => ({
    method: 'GET',
    path: '/context',
    query: {},
    identity,
    browserHeaders: {
      authorization: 'Bearer browser-token',
      cookie: 'session=browser',
      host: 'attacker.test',
      origin: 'https://attacker.test',
      referer: 'https://attacker.test/page',
      forwarded: 'for=203.0.113.7',
      'x-forwarded-for': '203.0.113.7',
      'x-internal-api-key': 'browser-secret',
      'x-erp-internal-key': 'browser-erp-secret',
      'x-twenty-user-id': 'fake-user',
      'x-twenty-workspace-id': 'fake-workspace',
      'x-twenty-workspace-member-id': 'fake-member',
      'x-twenty-user-email': 'fake@example.test',
      'x-idempotency-key': 'fake-x-key',
      'idempotency-key': 'fake-standard-key',
      'x-surprise': 'surprise',
    },
    ...overrides,
  });

  const mutationRequest = (
    overrides: Partial<ErpMarocProxyRequest> & {
      method: string;
      path: string;
      contentType?: string;
      contentLength?: string;
      transferEncoding?: string;
    },
  ) => {
    const body = overrides.body;
    return request({
      contentType: 'application/json; charset=utf-8',
      contentLength: String(
        body === undefined ? 0 : Buffer.byteLength(JSON.stringify(body)),
      ),
      ...overrides,
    });
  };

  it('builds exact design headers for JSON GET and breaks old names', async () => {
    fetchMock.mockResolvedValue(jsonResponse(contextPayload));

    await service.execute(request());

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://erp.internal.test/api/context');
    expect(init?.redirect).toBe('manual');
    expect(init?.headers).toEqual({
      accept: 'application/json',
      'content-type': 'application/json',
      'x-erp-internal-key': 'server-secret',
      'x-twenty-workspace-id': 'workspace-1',
      'x-twenty-user-id': 'user-1',
      'x-twenty-user-email': 'user@example.test',
    });
    expect(init?.headers).not.toHaveProperty('x-internal-api-key');
    expect(init?.headers).not.toHaveProperty('x-twenty-workspace-member-id');
    expect(init?.headers).not.toHaveProperty('x-idempotency-key');
  });

  it('never forwards browser-controlled headers', async () => {
    fetchMock.mockResolvedValue(jsonResponse(contextPayload));

    await service.execute(request());

    const headers = fetchMock.mock.calls[0][1]?.headers;
    for (const forbidden of [
      'authorization',
      'cookie',
      'host',
      'origin',
      'referer',
      'forwarded',
      'x-forwarded-for',
      'x-surprise',
    ]) {
      expect(headers).not.toHaveProperty(forbidden);
    }
  });

  it('forbids idempotency on ordinary mutations and sends Idempotency-Key only when required', async () => {
    await expect(
      service.execute(
        mutationRequest({
          method: 'POST',
          path: '/products',
          body: { name: 'Consulting' },
          idempotencyKey: 'forbidden-product-key',
        }),
      ),
    ).rejects.toMatchObject({ code: 'ERP_VALIDATION_ERROR' });

    await expect(
      service.execute(
        mutationRequest({ method: 'POST', path: '/payments', body: {} }),
      ),
    ).rejects.toMatchObject({ code: 'ERP_VALIDATION_ERROR' });

    fetchMock.mockResolvedValue(
      new Response('validation detail', { status: 422 }),
    );
    await expect(
      service.execute(
        mutationRequest({
          method: 'POST',
          path: '/payments',
          body: {},
          idempotencyKey: 'payment-create-0001',
        }),
      ),
    ).rejects.toMatchObject({ code: 'ERP_VALIDATION_ERROR', statusCode: 422 });

    expect(fetchMock.mock.calls[0][1]?.headers).toEqual({
      accept: 'application/json',
      'content-type': 'application/json',
      'x-erp-internal-key': 'server-secret',
      'x-twenty-workspace-id': 'workspace-1',
      'x-twenty-user-id': 'user-1',
      'x-twenty-user-email': 'user@example.test',
      'Idempotency-Key': 'payment-create-0001',
    });
  });

  it.each([
    ['missing content type', { contentType: undefined }],
    ['unsupported content type', { contentType: 'text/plain' }],
    ['near-match content type', { contentType: 'application/jsonp' }],
    ['missing length', { contentLength: undefined }],
    ['negative length', { contentLength: '-1' }],
    ['non-canonical length', { contentLength: '01' }],
    ['decimal length', { contentLength: '1.5' }],
    ['oversized declared length', { contentLength: String(MiB + 1) }],
    ['chunked transfer', { transferEncoding: 'chunked' }],
  ])('rejects mutation with %s before fetch', async (_label, metadata) => {
    await expect(
      service.execute(
        mutationRequest({
          method: 'POST',
          path: '/products',
          body: {},
          ...metadata,
        }),
      ),
    ).rejects.toMatchObject({ code: 'ERP_VALIDATION_ERROR' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('accepts JSON charset and canonical zero length for a bodyless mutation', async () => {
    fetchMock.mockResolvedValue(jsonResponse(productPayload, { status: 201 }));

    await expect(
      service.execute(
        mutationRequest({
          method: 'POST',
          path: '/products',
          body: undefined,
          contentLength: '0',
        }),
      ),
    ).resolves.toMatchObject({ kind: 'json', statusCode: 201 });
  });

  it('bounds the reserialized UTF-8 JSON body independently of declared length', async () => {
    const prefixBytes = Buffer.byteLength('{"value":""}');
    const exact = 'é'.repeat((MiB - prefixBytes) / 2);
    fetchMock.mockResolvedValue(jsonResponse({}));

    await expect(
      service.execute(
        mutationRequest({
          method: 'POST',
          path: '/products',
          body: { value: exact },
          contentLength: String(MiB),
        }),
      ),
    ).rejects.toMatchObject({ code: 'ERP_UPSTREAM_INVALID_RESPONSE' });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    fetchMock.mockClear();
    await expect(
      service.execute(
        mutationRequest({
          method: 'POST',
          path: '/products',
          body: { value: `${exact}é` },
          contentLength: String(MiB),
        }),
      ),
    ).rejects.toMatchObject({ code: 'ERP_VALIDATION_ERROR' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('forbids request bodies and idempotency metadata on GET/PDF routes', async () => {
    await expect(service.execute(request({ body: {} }))).rejects.toMatchObject({
      code: 'ERP_VALIDATION_ERROR',
    });
    await expect(
      service.execute(request({ idempotencyKey: 'forbidden-get-key' })),
    ).rejects.toMatchObject({ code: 'ERP_VALIDATION_ERROR' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('preserves upstream JSON 200 and 201 status codes', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(contextPayload, { status: 200 }),
    );
    await expect(service.execute(request())).resolves.toMatchObject({
      kind: 'json',
      statusCode: 200,
      data: contextPayload,
    });

    fetchMock.mockResolvedValueOnce(
      jsonResponse(productPayload, { status: 201 }),
    );
    await expect(
      service.execute(
        mutationRequest({
          method: 'POST',
          path: '/products',
          body: { name: 'Consulting' },
        }),
      ),
    ).resolves.toMatchObject({ kind: 'json', statusCode: 201 });
  });

  it.each([
    ['/context', 400, 'ERP_VALIDATION_ERROR', 400],
    ['/context', 422, 'ERP_VALIDATION_ERROR', 422],
    ['/context', 403, 'ERP_LINK_REQUIRED', 403],
    ['/products', 403, 'ERP_UNKNOWN', 403],
    ['/context', 404, 'ERP_NOT_FOUND', 404],
    ['/context', 409, 'ERP_STATE_CONFLICT', 409],
    ['/context', 429, 'ERP_RATE_LIMITED', 429],
    ['/context', 418, 'ERP_UNKNOWN', 418],
    ['/context', 503, 'ERP_UNKNOWN', 503],
  ] as const)(
    'maps %s status %s to %s without rewriting status',
    async (path, upstreamStatus, code, statusCode) => {
      fetchMock.mockResolvedValue(
        new Response('SECRET upstream detail', { status: upstreamStatus }),
      );
      let error: ErpMarocProxyError | undefined;
      try {
        await service.execute(request({ path }));
      } catch (caught) {
        if (!(caught instanceof ErpMarocProxyError)) throw caught;
        error = caught;
      }
      expect(error).toMatchObject({ code, statusCode });
      expect(JSON.stringify(error)).not.toContain('SECRET upstream detail');
    },
  );

  it.each([301, 302, 307, 308])(
    'rejects redirect %s as 502',
    async (status) => {
      fetchMock.mockResolvedValue(
        new Response(null, {
          status,
          headers: { location: 'https://attacker.test/leak' },
        }),
      );
      await expect(service.execute(request())).rejects.toMatchObject({
        code: 'ERP_UPSTREAM_INVALID_RESPONSE',
        statusCode: 502,
      });
      expect(fetchMock.mock.calls[0][1]?.redirect).toBe('manual');
    },
  );

  it('bounds upstream errors and maps network failures without leakage', async () => {
    fetchMock.mockResolvedValueOnce(
      streamResponse(
        [new TextEncoder().encode(`SECRET${'x'.repeat(100_000)}`)],
        { status: 500 },
      ),
    );
    await expect(service.execute(request())).rejects.toMatchObject({
      code: 'ERP_UNKNOWN',
      statusCode: 500,
    });

    fetchMock.mockRejectedValueOnce(new Error('SECRET DNS diagnostic'));
    let error: ErpMarocProxyError | undefined;
    try {
      await service.execute(request());
    } catch (caught) {
      if (!(caught instanceof ErpMarocProxyError)) throw caught;
      error = caught;
    }
    expect(error).toMatchObject({ code: 'ERP_UNKNOWN', statusCode: 502 });
    expect(JSON.stringify(error)).not.toContain('SECRET DNS diagnostic');
  });

  it('times JSON out after 15 seconds and propagates client abort', async () => {
    fetchMock.mockImplementation(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () =>
            reject(init.signal?.reason),
          );
        }),
    );
    const timeout = expect(service.execute(request())).rejects.toMatchObject({
      code: 'ERP_UPSTREAM_TIMEOUT',
      statusCode: 504,
    });
    await jest.advanceTimersByTimeAsync(15_000);
    await timeout;

    const controller = new AbortController();
    const aborted = expect(
      service.execute(request({ clientSignal: controller.signal })),
    ).rejects.toMatchObject({ code: 'ERP_UNKNOWN', statusCode: 499 });
    controller.abort();
    await aborted;
  });

  it.each([undefined, 'text/html'])(
    'cancels a 2xx body when JSON Content-Type is %s',
    async (contentType) => {
      const cancel = jest.fn();
      const headers =
        contentType === undefined ? undefined : { 'content-type': contentType };
      fetchMock.mockResolvedValue(
        new Response(new ReadableStream<Uint8Array>({ pull() {}, cancel }), {
          status: 200,
          headers,
        }),
      );

      await expect(service.execute(request())).rejects.toMatchObject({
        code: 'ERP_UPSTREAM_INVALID_RESPONSE',
        statusCode: 502,
      });
      expect(cancel).toHaveBeenCalledTimes(1);
    },
  );

  it('rejects oversized or schema-invalid JSON responses without Zod leakage', async () => {
    fetchMock.mockResolvedValueOnce(
      streamResponse([new Uint8Array(MiB + 1)], {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    await expect(service.execute(request())).rejects.toMatchObject({
      code: 'ERP_UPSTREAM_INVALID_RESPONSE',
    });

    fetchMock.mockResolvedValueOnce(
      jsonResponse({ societeId: 'SECRET-INVALID' }),
    );
    let error: ErpMarocProxyError | undefined;
    try {
      await service.execute(request());
    } catch (caught) {
      if (!(caught instanceof ErpMarocProxyError)) throw caught;
      error = caught;
    }
    expect(error).toMatchObject({ code: 'ERP_UPSTREAM_INVALID_RESPONSE' });
    expect(JSON.stringify(error)).not.toContain('SECRET-INVALID');
  });

  describe('PDF streaming', () => {
    const pdfRequest = (clientSignal?: AbortSignal) =>
      request({
        path: '/invoices/11111111-1111-4111-8111-111111111111/pdf',
        clientSignal,
      });

    it('returns a stream, status and only validated safe headers', async () => {
      const bytes = new TextEncoder().encode('%PDF-safe');
      fetchMock.mockResolvedValue(
        streamResponse([bytes], {
          status: 200,
          headers: {
            'content-type': 'application/pdf',
            'content-length': String(bytes.byteLength),
            'content-disposition': 'inline; filename="FAC-1.pdf"',
            'cache-control': 'private, no-store',
            pragma: 'no-cache',
            'x-content-type-options': 'nosniff',
            'x-upstream-secret': 'drop-me',
          },
        }),
      );

      const result = await service.execute(pdfRequest());
      expect(result.kind).toBe('pdf');
      if (result.kind !== 'pdf') throw new Error('Expected PDF result');
      expect(result).toMatchObject({
        statusCode: 200,
        contentLength: bytes.byteLength,
        headers: {
          'content-type': 'application/pdf',
          'content-length': String(bytes.byteLength),
          'content-disposition': 'inline; filename="FAC-1.pdf"',
          'cache-control': 'private, no-store',
          pragma: 'no-cache',
          'x-content-type-options': 'nosniff',
        },
      });
      expect(result.headers).not.toHaveProperty('x-upstream-secret');
      expect(await consume(result.body)).toEqual(Buffer.from(bytes));
      expect(fetchMock.mock.calls[0][1]?.headers).toEqual({
        accept: 'application/pdf',
        'x-erp-internal-key': 'server-secret',
        'x-twenty-workspace-id': 'workspace-1',
        'x-twenty-user-id': 'user-1',
        'x-twenty-user-email': 'user@example.test',
      });
    });

    it('adds mandatory no-cache protections when upstream omits them', async () => {
      const bytes = new TextEncoder().encode('%PDF-safe');
      fetchMock.mockResolvedValue(
        streamResponse([bytes], {
          status: 200,
          headers: {
            'content-type': 'application/pdf',
            'content-length': String(bytes.byteLength),
          },
        }),
      );

      const result = await service.execute(pdfRequest());
      if (result.kind !== 'pdf') throw new Error('Expected PDF result');

      expect(result.headers).toEqual({
        'content-type': 'application/pdf',
        'content-length': String(bytes.byteLength),
        'cache-control': 'private, no-store',
        pragma: 'no-cache',
        'x-content-type-options': 'nosniff',
      });
      expect(await consume(result.body)).toEqual(Buffer.from(bytes));
    });

    it.each([
      ['missing', undefined],
      ['invalid', 'abc'],
      ['negative', '-1'],
      ['non-canonical', '01'],
      ['too large', String(20 * MiB + 1)],
    ])(
      'cancels upstream immediately for %s Content-Length',
      async (_label, length) => {
        const cancel = jest.fn();
        const headers: Record<string, string> = {
          'content-type': 'application/pdf',
        };
        if (length !== undefined) headers['content-length'] = length;
        fetchMock.mockResolvedValue(
          new Response(new ReadableStream<Uint8Array>({ pull() {}, cancel }), {
            status: 200,
            headers,
          }),
        );

        await expect(service.execute(pdfRequest())).rejects.toMatchObject({
          code: 'ERP_UPSTREAM_INVALID_RESPONSE',
        });
        expect(cancel).toHaveBeenCalledTimes(1);
      },
    );

    it('rejects unsafe PDF response headers and cancels upstream', async () => {
      const cancel = jest.fn();
      const response = new Response(
        new ReadableStream<Uint8Array>({ pull() {}, cancel }),
        {
          status: 200,
          headers: {
            'content-type': 'application/pdf',
            'content-length': '4',
            'cache-control': 'public, max-age=31536000',
          },
        },
      );
      fetchMock.mockResolvedValue(response);

      await expect(service.execute(pdfRequest())).rejects.toMatchObject({
        code: 'ERP_UPSTREAM_INVALID_RESPONSE',
      });
      expect(cancel).toHaveBeenCalledTimes(1);
    });

    it('rejects CRLF content-disposition and cancels upstream', async () => {
      const cancel = jest.fn();
      const response = new Response(
        new ReadableStream<Uint8Array>({ pull() {}, cancel }),
        {
          status: 200,
          headers: {
            'content-type': 'application/pdf',
            'content-length': '4',
          },
        },
      );
      const getHeader = response.headers.get.bind(response.headers);
      jest
        .spyOn(response.headers, 'get')
        .mockImplementation((name) =>
          name.toLowerCase() === 'content-disposition'
            ? 'inline\r\nx-evil: yes'
            : getHeader(name),
        );
      fetchMock.mockResolvedValue(response);

      await expect(service.execute(pdfRequest())).rejects.toMatchObject({
        code: 'ERP_UPSTREAM_INVALID_RESPONSE',
      });
      expect(cancel).toHaveBeenCalledTimes(1);
    });

    it('errors and cancels when the stream exceeds declared length', async () => {
      const cancel = jest.fn();
      let sent = false;
      fetchMock.mockResolvedValue(
        new Response(
          new ReadableStream<Uint8Array>({
            pull(controller) {
              if (sent) return;
              sent = true;
              controller.enqueue(new TextEncoder().encode('%PDF-too-long'));
            },
            cancel,
          }),
          {
            status: 200,
            headers: {
              'content-type': 'application/pdf',
              'content-length': '4',
            },
          },
        ),
      );

      const result = await service.execute(pdfRequest());
      if (result.kind !== 'pdf') throw new Error('Expected PDF result');
      await expect(consume(result.body)).rejects.toMatchObject({
        code: 'ERP_UPSTREAM_INVALID_RESPONSE',
      });
      expect(cancel).toHaveBeenCalledTimes(1);
    });

    it('errors when the stream ends before declared length', async () => {
      const bytes = new TextEncoder().encode('%PDF');
      fetchMock.mockResolvedValue(
        streamResponse([bytes], {
          status: 200,
          headers: {
            'content-type': 'application/pdf',
            'content-length': '10',
          },
        }),
      );

      const result = await service.execute(pdfRequest());
      if (result.kind !== 'pdf') throw new Error('Expected PDF result');
      await expect(consume(result.body)).rejects.toMatchObject({
        code: 'ERP_UPSTREAM_INVALID_RESPONSE',
      });
    });

    it('propagates consumer cancellation and cleans up the timeout', async () => {
      const cancel = jest.fn();
      fetchMock.mockResolvedValue(
        new Response(new ReadableStream<Uint8Array>({ pull() {}, cancel }), {
          status: 200,
          headers: {
            'content-type': 'application/pdf',
            'content-length': '4',
          },
        }),
      );

      const result = await service.execute(pdfRequest());
      if (result.kind !== 'pdf') throw new Error('Expected PDF result');
      expect(jest.getTimerCount()).toBe(1);
      await result.body.cancel('downstream disconnected');
      expect(cancel).toHaveBeenCalledWith('downstream disconnected');
      expect(jest.getTimerCount()).toBe(0);
    });

    it('keeps PDF timeout active until stream completion', async () => {
      const cancel = jest.fn();
      fetchMock.mockResolvedValue(
        new Response(new ReadableStream<Uint8Array>({ pull() {}, cancel }), {
          status: 200,
          headers: {
            'content-type': 'application/pdf',
            'content-length': '4',
          },
        }),
      );

      const result = await service.execute(pdfRequest());
      if (result.kind !== 'pdf') throw new Error('Expected PDF result');
      const reader = result.body.getReader();
      const read = expect(reader.read()).rejects.toMatchObject({
        code: 'ERP_UPSTREAM_TIMEOUT',
        statusCode: 504,
      });
      await jest.advanceTimersByTimeAsync(30_000);
      await read;
      expect(cancel).toHaveBeenCalledTimes(1);
      expect(jest.getTimerCount()).toBe(0);
    });

    it('keeps client abort active until PDF stream completion', async () => {
      const cancel = jest.fn();
      const client = new AbortController();
      fetchMock.mockResolvedValue(
        new Response(new ReadableStream<Uint8Array>({ pull() {}, cancel }), {
          status: 200,
          headers: {
            'content-type': 'application/pdf',
            'content-length': '4',
          },
        }),
      );

      const result = await service.execute(pdfRequest(client.signal));
      if (result.kind !== 'pdf') throw new Error('Expected PDF result');
      const reader = result.body.getReader();
      const read = expect(reader.read()).rejects.toMatchObject({
        code: 'ERP_UNKNOWN',
        statusCode: 499,
      });
      client.abort();
      await read;
      expect(cancel).toHaveBeenCalledTimes(1);
      expect(jest.getTimerCount()).toBe(0);
    });
  });
});
