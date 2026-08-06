import { ErpMarocPublicPortalController } from './erp-maroc-public-portal.controller';

class TestResponse {
  statusCode = 200;
  body: unknown;
  headers = new Map<string, string>();

  status(code: number) {
    this.statusCode = code;
    return this;
  }

  json(body: unknown) {
    this.body = body;
    return this;
  }

  setHeader(name: string, value: string) {
    this.headers.set(name, value);
    return this;
  }
}

describe('ErpMarocPublicPortalController', () => {
  const values = {
    ERP_MAROC_ENABLED: true,
    ERP_API_URL: 'http://erp-api:4000',
    ERP_INTERNAL_API_KEY: 'internal-key',
  };
  const controller = new ErpMarocPublicPortalController({
    get: (key) => values[key],
  });

  afterEach(() => jest.restoreAllMocks());

  it('forwards a portal request without cookies or arbitrary paths', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ customer: { name: 'Atlas' } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    const response = new TestResponse();
    const authorization = `Bearer ${'a'.repeat(43)}`;

    await controller.session(
      { headers: { authorization } } as never,
      response as never,
    );

    expect(response.statusCode).toBe(200);
    expect(fetchSpy).toHaveBeenCalledWith(
      new URL('http://erp-api:4000/portal-public/session'),
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          Authorization: authorization,
          'x-erp-internal-key': 'internal-key',
        }),
      }),
    );
  });

  it('rejects missing credentials before contacting the ERP', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch');
    const response = new TestResponse();

    await controller.invoices({ headers: {} } as never, response as never);

    expect(response.statusCode).toBe(401);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('forwards OTP requests without requiring an existing session token', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ accepted: true, retryAfterSeconds: 60 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    const response = new TestResponse();

    await controller.requestOtp(
      {
        headers: { 'content-type': 'application/json' },
        body: { email: 'client@example.com' },
      } as never,
      response as never,
    );

    expect(response.statusCode).toBe(200);
    expect(fetchSpy).toHaveBeenCalledWith(
      new URL('http://erp-api:4000/portal-public/auth/request-otp'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.not.objectContaining({
          Authorization: expect.anything(),
        }),
      }),
    );
  });

  it('rejects an unsafe resource identifier', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch');
    const response = new TestResponse();

    await controller.documentContent(
      { headers: { authorization: `Bearer ${'a'.repeat(43)}` } } as never,
      response as never,
      '../secret',
    );

    expect(response.statusCode).toBe(400);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('forwards payment checkout and electronic signature commands', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ accepted: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    const authorization = `Bearer ${'a'.repeat(43)}`;
    const id = '33333333-3333-4333-8333-333333333333';

    await controller.paymentCheckout(
      {
        headers: { authorization, 'content-type': 'application/json' },
        body: {},
      } as never,
      new TestResponse() as never,
      id,
    );
    await controller.signature(
      {
        headers: { authorization, 'content-type': 'application/json' },
        body: { signerName: 'Sara Benali', consent: true },
      } as never,
      new TestResponse() as never,
      id,
    );

    expect(fetchSpy).toHaveBeenNthCalledWith(
      1,
      new URL(
        `http://erp-api:4000/portal-public/invoices/${id}/payment-checkout`,
      ),
      expect.objectContaining({ method: 'POST' }),
    );
    expect(fetchSpy).toHaveBeenNthCalledWith(
      2,
      new URL(`http://erp-api:4000/portal-public/requests/${id}/signatures`),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ signerName: 'Sara Benali', consent: true }),
      }),
    );
  });
});
