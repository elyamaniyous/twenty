import { once } from 'node:events';

import {
  All,
  Controller,
  Inject,
  Req,
  Res,
  UseFilters,
  UseGuards,
} from '@nestjs/common';

import { type Request, type Response } from 'express';

import { TwentyConfigService } from 'src/engine/core-modules/twenty-config/twenty-config.service';
import { JwtAuthGuard } from 'src/engine/guards/jwt-auth.guard';
import { RequireAccessTokenGuard } from 'src/engine/guards/require-access-token.guard';
import { WorkspaceAuthGuard } from 'src/engine/guards/workspace-auth.guard';

import { ErpMarocActivatedUserGuard } from './erp-maroc-activated-user.guard';
import { ErpMarocAuthFilter } from './erp-maroc-auth.filter';
import {
  ErpMarocProxyError,
  ErpMarocProxyService,
  type ErpMarocProxyRequest,
  type ErpMarocProxyResult,
  type ErpMarocServerIdentity,
} from './erp-maroc-proxy.service';

type ErpMarocFeatureConfig = Readonly<{
  get(key: 'ERP_MAROC_ENABLED'): boolean;
}>;

type AuthenticatedErpRequest = Request & {
  user?: { id?: string; email?: string };
  workspace?: { id?: string };
  userWorkspaceId?: string;
  workspaceMemberId?: string;
  workspaceMember?: unknown;
  params: { path?: string | string[] };
};

type ClientAbort = Readonly<{
  signal: AbortSignal;
  cleanup: () => void;
}>;

const readHeader = (
  request: AuthenticatedErpRequest,
  name: string,
): string | undefined => {
  const value = request.headers[name.toLowerCase()];

  return typeof value === 'string' ? value : undefined;
};

const extractProxyPath = (request: AuthenticatedErpRequest): string => {
  if (typeof request.originalUrl === 'string' && request.originalUrl !== '') {
    const rawPathname = request.originalUrl.split('?', 1)[0];
    const prefix = '/erp-maroc-api';

    if (rawPathname === prefix) return '/';
    if (rawPathname.startsWith(`${prefix}/`)) {
      return rawPathname.slice(prefix.length);
    }

    return rawPathname;
  }

  const wildcard = request.params.path;

  if (Array.isArray(wildcard)) return `/${wildcard.join('/')}`;
  if (typeof wildcard === 'string') return `/${wildcard}`;

  return '/';
};

const deriveIdentity = (
  request: AuthenticatedErpRequest,
): ErpMarocServerIdentity => {
  const twentyUserId = request.user?.id;
  const twentyWorkspaceId = request.workspace?.id;
  const twentyUserEmail = request.user?.email;

  if (!twentyUserId || !twentyWorkspaceId || !twentyUserEmail) {
    throw new ErpMarocProxyError('AUTH_TOKEN_INVALID_OR_EXPIRED', 401);
  }

  return { twentyUserId, twentyWorkspaceId, twentyUserEmail };
};

const createClientAbort = (
  request: AuthenticatedErpRequest,
  response: Response,
): ClientAbort => {
  const controller = new AbortController();
  const abort = () => controller.abort();

  request.once('aborted', abort);
  response.once('close', abort);

  return {
    signal: controller.signal,
    cleanup: () => {
      request.removeListener('aborted', abort);
      response.removeListener('close', abort);
    },
  };
};

const errorPayload = (error: unknown) => {
  if (error instanceof ErpMarocProxyError) return error.toJSON();

  return { statusCode: 502, code: 'ERP_UNKNOWN' as const };
};

@Controller('erp-maroc-api')
@UseGuards(
  JwtAuthGuard,
  RequireAccessTokenGuard,
  WorkspaceAuthGuard,
  ErpMarocActivatedUserGuard,
)
@UseFilters(ErpMarocAuthFilter)
export class ErpMarocController {
  constructor(
    @Inject(TwentyConfigService)
    private readonly config: ErpMarocFeatureConfig,
    @Inject(ErpMarocProxyService)
    private readonly proxyService: Pick<ErpMarocProxyService, 'execute'>,
  ) {}

  @All('*path')
  async proxy(
    @Req() request: AuthenticatedErpRequest,
    @Res() response: Response,
  ): Promise<void> {
    if (!this.config.get('ERP_MAROC_ENABLED')) {
      response.status(404).json({ statusCode: 404, code: 'ERP_DISABLED' });
      return;
    }

    const clientAbort = createClientAbort(request, response);

    try {
      const identity = deriveIdentity(request);
      const path = extractProxyPath(request);
      const method = request.method.toUpperCase();
      const requestedContext = method === 'GET' && path === '/context';
      const contextResult = await this.proxyService.execute({
        method: 'GET',
        path: '/context',
        query: requestedContext
          ? (request.query as Record<string, unknown>)
          : {},
        identity,
        clientSignal: clientAbort.signal,
      });

      const result = requestedContext
        ? contextResult
        : await this.proxyService.execute(
            this.buildOperationRequest(
              request,
              method,
              path,
              identity,
              clientAbort.signal,
            ),
          );

      await this.sendResult(response, result, clientAbort);
    } catch (error) {
      const cannotWrite =
        clientAbort.signal.aborted ||
        response.destroyed ||
        response.writableEnded ||
        response.headersSent;
      clientAbort.cleanup();
      if (cannotWrite) {
        if (!response.destroyed) response.destroy();
        return;
      }
      const payload = errorPayload(error);
      response.status(payload.statusCode).json(payload);
    }
  }

  private buildOperationRequest(
    request: AuthenticatedErpRequest,
    method: string,
    path: string,
    identity: ErpMarocServerIdentity,
    clientSignal: AbortSignal,
  ): ErpMarocProxyRequest {
    const operation: ErpMarocProxyRequest = {
      method,
      path,
      query: request.query as Record<string, unknown>,
      identity,
      clientSignal,
      idempotencyKey: readHeader(request, 'idempotency-key'),
      ...(method === 'GET'
        ? {}
        : {
            body: request.body,
            contentType: readHeader(request, 'content-type'),
            contentLength: readHeader(request, 'content-length'),
            transferEncoding: request.headers['transfer-encoding'],
          }),
    };

    return operation;
  }

  private async sendResult(
    response: Response,
    result: ErpMarocProxyResult,
    clientAbort: ClientAbort,
  ): Promise<void> {
    if (result.kind === 'json') {
      clientAbort.cleanup();
      response.status(result.statusCode).json(result.data);
      return;
    }

    response.status(result.statusCode);
    for (const [name, value] of Object.entries(result.headers)) {
      if (value !== undefined) response.setHeader(name, value);
    }
    response.setHeader('cache-control', 'private, no-store');
    response.setHeader('pragma', 'no-cache');
    response.setHeader('x-content-type-options', 'nosniff');

    const reader = result.body.getReader();
    try {
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        if (!response.write(chunk.value)) {
          await once(response, 'drain', { signal: clientAbort.signal });
        }
      }
      clientAbort.cleanup();
      response.end();
    } catch (error) {
      await reader.cancel(error).catch(() => undefined);
      throw error;
    } finally {
      reader.releaseLock();
      clientAbort.cleanup();
    }
  }
}
