import { ErpMarocPublicMarketingController } from './erp-maroc-public-marketing.controller';

class TestResponse {
  statusCode = 200;
  body: unknown;

  status(code: number) {
    this.statusCode = code;
    return this;
  }

  json(body: unknown) {
    this.body = body;
    return this;
  }
}

describe('ErpMarocPublicMarketingController', () => {
  const values = {
    ERP_MAROC_ENABLED: true,
    ERP_API_URL: 'http://erp-api:4000',
    ERP_INTERNAL_API_KEY: 'internal-key',
  };
  const controller = new ErpMarocPublicMarketingController({
    get: (key) => values[key],
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('forwards only the dedicated demo endpoint with server credentials', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ accepted: true }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    const response = new TestResponse();
    const authorization = `Bearer ${'a'.repeat(40)}`;

    await controller.demoSubmission(
      {
        headers: {
          authorization,
          'content-type': 'application/json',
        },
        body: { submissionId: 'request-1' },
      } as never,
      response as never,
    );

    expect(response.statusCode).toBe(201);
    expect(response.body).toEqual({ accepted: true });
    expect(fetchSpy).toHaveBeenCalledWith(
      new URL('http://erp-api:4000/marketing/public/forms/demo-submissions'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: authorization,
          'x-erp-internal-key': 'internal-key',
        }),
      }),
    );
  });

  it('rejects missing bearer credentials without contacting the ERP', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch');
    const response = new TestResponse();

    await controller.brevoWebhook(
      {
        headers: { 'content-type': 'application/json' },
        body: { event: 'opened' },
      } as never,
      response as never,
    );

    expect(response.statusCode).toBe(401);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
