import {
  All,
  Controller,
  type INestApplication,
  type MiddlewareConsumer,
  Module,
  type NestModule,
  Res,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { type Request, type Response } from 'express';
import request from 'supertest';

import { JwtTokenTypeEnum } from 'src/engine/core-modules/auth/types/jwt-token-type.enum';
import { AccessTokenService } from 'src/engine/core-modules/auth/token/services/access-token.service';
import { TwentyConfigService } from 'src/engine/core-modules/twenty-config/twenty-config.service';
import { JwtAuthGuard } from 'src/engine/guards/jwt-auth.guard';
import { RequireAccessTokenGuard } from 'src/engine/guards/require-access-token.guard';
import { WorkspaceAuthGuard } from 'src/engine/guards/workspace-auth.guard';
import { WorkspaceCacheStorageService } from 'src/engine/workspace-cache-storage/workspace-cache-storage.service';

import { ErpMarocActivatedUserGuard } from './erp-maroc-activated-user.guard';
import { ErpMarocAuthFilter } from './erp-maroc-auth.filter';
import { ErpMarocController } from './erp-maroc.controller';
import { ErpMarocEnabledMiddleware } from './erp-maroc-enabled.middleware';
import { ErpMarocModule } from './erp-maroc.module';
import {
  ErpMarocProxyError,
  ErpMarocProxyService,
} from './erp-maroc-proxy.service';
import { resolveErpRoute } from './erp-maroc-route-policy';

const userId = '20202020-1111-4111-8111-111111111111';
const workspaceId = '20202020-2222-4222-8222-222222222222';

@Controller('rest')
class RestWitnessController {
  @All('*path')
  handle(@Res() response: Response) {
    response.status(200).json({ route: 'rest' });
  }
}

describe('ERP Maroc HTTP authentication boundary', () => {
  let app: INestApplication;
  let enabled = true;
  const execute = jest.fn();
  const operationTransport = jest.fn();
  const validateTokenByRequest = jest.fn(async (incomingRequest: Request) => {
    const token = incomingRequest.headers.authorization?.replace('Bearer ', '');
    const workspace = { id: workspaceId };
    const user = { id: userId, email: 'commercial@example.com' };
    const activated = {
      user,
      userWorkspaceId: 'user-workspace-1',
      workspaceMemberId: 'member-1',
      workspaceMember: { id: 'member-1' },
      workspace,
    };

    switch (token) {
      case 'access':
        return { ...activated, tokenType: JwtTokenTypeEnum.ACCESS } as never;
      case 'api-key':
        return {
          apiKey: { id: 'api-key-1' },
          workspace,
          tokenType: JwtTokenTypeEnum.API_KEY,
        } as never;
      case 'application':
        return {
          application: { id: 'application-1' },
          workspace,
          tokenType: JwtTokenTypeEnum.APPLICATION_ACCESS,
        } as never;
      case 'system':
        return {
          workspace,
          tokenType: JwtTokenTypeEnum.REMOTE_SERVER,
        } as never;
      case 'pending':
        return {
          user,
          userWorkspaceId: 'user-workspace-1',
          workspace,
          tokenType: JwtTokenTypeEnum.ACCESS,
        } as never;
      case 'playground':
        return {
          ...activated,
          tokenType: JwtTokenTypeEnum.PLAYGROUND,
        } as never;
      case 'invalid':
      case 'expired':
      case undefined:
        throw new Error('invalid bearer');
      default:
        throw new Error('unexpected bearer');
    }
  });
  let jwtGuardSpy: jest.SpyInstance;

  @Module({
    controllers: [ErpMarocController, RestWitnessController],
    providers: [
      ErpMarocEnabledMiddleware,
      ErpMarocActivatedUserGuard,
      ErpMarocAuthFilter,
      RequireAccessTokenGuard,
      WorkspaceAuthGuard,
      JwtAuthGuard,
      { provide: AccessTokenService, useValue: { validateTokenByRequest } },
      {
        provide: WorkspaceCacheStorageService,
        useValue: { getMetadataVersion: jest.fn().mockResolvedValue(1) },
      },
      {
        provide: TwentyConfigService,
        useValue: { get: jest.fn(() => enabled) },
      },
      { provide: ErpMarocProxyService, useValue: { execute } },
    ],
  })
  class HttpTestModule implements NestModule {
    configure(consumer: MiddlewareConsumer) {
      ErpMarocModule.prototype.configure.call(this, consumer);
    }
  }

  beforeAll(async () => {
    const testingModule = await Test.createTestingModule({
      imports: [HttpTestModule],
    }).compile();

    app = testingModule.createNestApplication();
    await app.init();
    jwtGuardSpy = jest.spyOn(app.get(JwtAuthGuard), 'canActivate');
  });

  afterAll(async () => {
    await app?.close();
  });

  beforeEach(() => {
    enabled = true;
    jest.clearAllMocks();
    execute.mockImplementation(
      async ({
        method,
        path,
        query,
      }: {
        method: string;
        path: string;
        query: {};
      }) => {
        if (path === '/context') {
          return {
            kind: 'json',
            statusCode: 200,
            data: { userRole: 'COMMERCIAL' },
          };
        }
        try {
          resolveErpRoute(method, path, query);
        } catch {
          throw new ErpMarocProxyError('ERP_VALIDATION_ERROR', 400);
        }
        operationTransport();
        return { kind: 'json', statusCode: 200, data: { route: 'erp' } };
      },
    );
  });

  it('returns ERP_DISABLED before authentication when disabled', async () => {
    enabled = false;

    await request(app.getHttpServer())
      .get('/erp-maroc-api/products')
      .expect(404)
      .expect({ statusCode: 404, code: 'ERP_DISABLED' });

    expect(jwtGuardSpy).not.toHaveBeenCalled();
    expect(execute).not.toHaveBeenCalled();
  });

  it.each([
    ['missing', undefined],
    ['invalid', 'invalid'],
    ['expired', 'expired'],
    ['API key', 'api-key'],
    ['application', 'application'],
    ['system', 'system'],
    ['pending activation', 'pending'],
    ['PLAYGROUND', 'playground'],
  ])(
    'normalizes rejected %s authentication over HTTP',
    async (_label, token) => {
      const call = request(app.getHttpServer()).get('/erp-maroc-api/products');
      if (token !== undefined) call.set('Authorization', `Bearer ${token}`);

      await call.expect(401).expect({
        statusCode: 401,
        code: 'AUTH_TOKEN_INVALID_OR_EXPIRED',
      });
    },
  );

  it('accepts ACCESS and reaches the ERP controller', async () => {
    await request(app.getHttpServer())
      .get('/erp-maroc-api/products')
      .set('Authorization', 'Bearer access')
      .expect(200)
      .expect({ route: 'erp' });

    expect(execute).toHaveBeenCalledTimes(2);
  });

  it('does not capture the REST namespace', async () => {
    await request(app.getHttpServer())
      .get('/rest/companies')
      .expect(200)
      .expect({ route: 'rest' });

    expect(execute).not.toHaveBeenCalled();
  });

  it.each([
    `/products%2F${userId}`,
    '/products/%2e%2e',
    '/products/%2E%2E',
    '/products/%5ccontext',
    '/products/%252e%252e',
  ])(
    'keeps the encoded raw path visible for policy rejection: %s',
    async (path) => {
      await request(app.getHttpServer())
        .get(`/erp-maroc-api${path}`)
        .set('Authorization', 'Bearer access')
        .expect(400)
        .expect({ statusCode: 400, code: 'ERP_VALIDATION_ERROR' });

      expect(execute).toHaveBeenCalledTimes(2);
      expect(execute.mock.calls[1][0].path).toBe(path);
      expect(operationTransport).not.toHaveBeenCalled();
    },
  );

  it('keeps an uppercase namespace canonical for policy rejection', async () => {
    await request(app.getHttpServer())
      .get('/ERP-MAROC-API/products')
      .set('Authorization', 'Bearer access')
      .expect(400)
      .expect({ statusCode: 400, code: 'ERP_VALIDATION_ERROR' });

    expect(execute.mock.calls[1][0].path).toBe('/ERP-MAROC-API/products');
    expect(operationTransport).not.toHaveBeenCalled();
  });
});
