import {
  type ArgumentsHost,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';

import { ErpMarocProxyError } from './erp-maroc-proxy.service';
import { ErpMarocAuthFilter } from './erp-maroc-auth.filter';

const createHost = (
  state: Partial<{
    headersSent: boolean;
    destroyed: boolean;
    writableEnded: boolean;
  }> = {},
) => {
  const response = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    destroy: jest.fn(),
    headersSent: false,
    destroyed: false,
    writableEnded: false,
    ...state,
  };
  const host = {
    switchToHttp: () => ({ getResponse: () => response }),
  } as unknown as ArgumentsHost;

  return { host, response };
};

describe('ErpMarocAuthFilter', () => {
  it.each([
    new UnauthorizedException('expired'),
    new ForbiddenException('guard'),
  ])(
    'normalizes guard failures without exposing their message',
    (exception) => {
      const { host, response } = createHost();

      new ErpMarocAuthFilter().catch(exception, host);

      expect(response.status).toHaveBeenCalledWith(401);
      expect(response.json).toHaveBeenCalledWith({
        statusCode: 401,
        code: 'AUTH_TOKEN_INVALID_OR_EXPIRED',
      });
      expect(response.json).not.toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.anything() }),
      );
    },
  );

  it('preserves stable proxy status and code only', () => {
    const { host, response } = createHost();

    new ErpMarocAuthFilter().catch(
      new ErpMarocProxyError('ERP_LINK_REQUIRED', 403),
      host,
    );

    expect(response.status).toHaveBeenCalledWith(403);
    expect(response.json).toHaveBeenCalledWith({
      statusCode: 403,
      code: 'ERP_LINK_REQUIRED',
    });
  });

  it('preserves a business 403 as ERP_UNKNOWN rather than an auth error', () => {
    const { host, response } = createHost();

    new ErpMarocAuthFilter().catch(
      new ErpMarocProxyError('ERP_UNKNOWN', 403),
      host,
    );

    expect(response.status).toHaveBeenCalledWith(403);
    expect(response.json).toHaveBeenCalledWith({
      statusCode: 403,
      code: 'ERP_UNKNOWN',
    });
  });

  it('normalizes unknown failures without exposing details', () => {
    const { host, response } = createHost();

    new ErpMarocAuthFilter().catch(new Error('upstream secret'), host);

    expect(response.status).toHaveBeenCalledWith(502);
    expect(response.json).toHaveBeenCalledWith({
      statusCode: 502,
      code: 'ERP_UNKNOWN',
    });
  });

  it.each([
    { headersSent: true },
    { writableEnded: true },
    { destroyed: true },
  ])('does not write after the response is no longer writable: %o', (state) => {
    const { host, response } = createHost(state);

    new ErpMarocAuthFilter().catch(new UnauthorizedException('late'), host);

    expect(response.status).not.toHaveBeenCalled();
    expect(response.json).not.toHaveBeenCalled();
    if (state.destroyed) expect(response.destroy).not.toHaveBeenCalled();
    else expect(response.destroy).toHaveBeenCalledTimes(1);
  });
});
