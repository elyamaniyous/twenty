import { type Request, type Response } from 'express';

import { ErpMarocPortalController } from './erp-maroc-portal.controller';

const portalToken = 'a'.repeat(43);

const responseMock = () => {
  const response = {
    status: jest.fn(),
    set: jest.fn(),
    send: jest.fn(),
    json: jest.fn(),
    end: jest.fn(),
  };
  response.status.mockReturnValue(response);
  response.set.mockReturnValue(response);
  response.send.mockReturnValue(response);
  response.json.mockReturnValue(response);
  response.end.mockReturnValue(response);
  return response as unknown as Response & {
    status: jest.Mock;
    set: jest.Mock;
    send: jest.Mock;
    json: jest.Mock;
    end: jest.Mock;
  };
};

const configMock = (enabled = true) => ({
  get: jest.fn((key: string) => {
    if (key === 'ERP_MAROC_ENABLED') return enabled;
    if (key === 'ERP_API_URL') return 'http://erp-api:3001/';
    return 'internal-secret';
  }),
});

describe('ErpMarocPortalController', () => {
  afterEach(() => jest.restoreAllMocks());

  it('serves the portal only when ERP Maroc is enabled', () => {
    const disabledResponse = responseMock();
    new ErpMarocPortalController(configMock(false)).page(disabledResponse);
    expect(disabledResponse.status).toHaveBeenCalledWith(404);

    const response = responseMock();
    new ErpMarocPortalController(configMock()).page(response);
    expect(response.set).toHaveBeenCalledWith(
      expect.objectContaining({
        'Cache-Control': 'no-store',
        'Content-Security-Policy':
          expect.stringContaining("default-src 'none'"),
      }),
    );
    expect(response.send).toHaveBeenCalledWith(
      expect.stringContaining('<title>Portail Zowka</title>'),
    );
  });

  it('rejects unknown routes and malformed portal tokens before forwarding', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch');
    const controller = new ErpMarocPortalController(configMock());

    const unknown = responseMock();
    await controller.proxy(
      {
        originalUrl: '/portal-api/admin',
        method: 'GET',
        headers: {},
      } as Request,
      unknown,
    );
    expect(unknown.status).toHaveBeenCalledWith(404);

    const unauthorized = responseMock();
    await controller.proxy(
      {
        originalUrl: '/portal-api/session',
        method: 'GET',
        headers: { authorization: 'Bearer too-short' },
      } as Request,
      unauthorized,
    );
    expect(unauthorized.status).toHaveBeenCalledWith(401);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('forwards allowlisted calls without exposing the token in the URL', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ customer: { name: 'Atlas' } }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    const response = responseMock();
    await new ErpMarocPortalController(configMock()).proxy(
      {
        originalUrl: '/portal-api/session',
        method: 'GET',
        headers: { authorization: `Bearer ${portalToken}` },
      } as Request,
      response,
    );

    expect(fetchSpy).toHaveBeenCalledWith(
      'http://erp-api:3001/portal-public/session',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          authorization: `Bearer ${portalToken}`,
          'x-erp-internal-key': 'internal-secret',
        }),
      }),
    );
    expect(response.status).toHaveBeenCalledWith(200);
  });
});
