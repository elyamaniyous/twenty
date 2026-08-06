import { Controller, Get, Inject, Param, Post, Req, Res } from '@nestjs/common';

import { type Request, type Response } from 'express';

import { TwentyConfigService } from 'src/engine/core-modules/twenty-config/twenty-config.service';

type PublicPortalConfig = Readonly<{
  get(
    key: 'ERP_MAROC_ENABLED' | 'ERP_API_URL' | 'ERP_INTERNAL_API_KEY',
  ): boolean | string;
}>;

const MAXIMUM_BODY_BYTES = 20 * 1024 * 1024;
const REQUEST_TIMEOUT_MS = 30_000;
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const readHeader = (request: Request, name: string): string => {
  const value = request.headers[name.toLowerCase()];
  return typeof value === 'string' ? value : '';
};

const validAuthorization = (authorization: string): boolean =>
  /^Bearer [A-Za-z0-9_-]{40,100}$/.test(authorization);

const buildUpstreamUrl = (baseValue: string, path: string): URL => {
  const base = new URL(baseValue);
  if (
    !['http:', 'https:'].includes(base.protocol) ||
    base.username !== '' ||
    base.password !== '' ||
    base.search !== '' ||
    base.hash !== ''
  ) {
    throw new Error('Invalid ERP API URL');
  }
  base.pathname = `${base.pathname.replace(/\/+$/, '')}/`;
  const upstream = new URL(path.replace(/^\/+/, ''), base);
  if (upstream.origin !== base.origin) throw new Error('Invalid ERP API URL');
  return upstream;
};

@Controller('erp-maroc-public/portal')
export class ErpMarocPublicPortalController {
  constructor(
    @Inject(TwentyConfigService)
    private readonly config: PublicPortalConfig,
  ) {}

  @Post('auth/request-otp')
  requestOtp(@Req() request: Request, @Res() response: Response) {
    return this.forward(
      request,
      response,
      'POST',
      '/portal-public/auth/request-otp',
      false,
    );
  }

  @Post('auth/verify-otp')
  verifyOtp(@Req() request: Request, @Res() response: Response) {
    return this.forward(
      request,
      response,
      'POST',
      '/portal-public/auth/verify-otp',
      false,
    );
  }

  @Get('session')
  session(@Req() request: Request, @Res() response: Response) {
    return this.forward(request, response, 'GET', '/portal-public/session');
  }

  @Get('invoices')
  invoices(@Req() request: Request, @Res() response: Response) {
    return this.forward(request, response, 'GET', '/portal-public/invoices');
  }

  @Get('invoices/:id/pdf')
  invoicePdf(
    @Req() request: Request,
    @Res() response: Response,
    @Param('id') id: string,
  ) {
    return this.forwardId(
      request,
      response,
      'GET',
      id,
      (safeId) => `/portal-public/invoices/${safeId}/pdf`,
    );
  }

  @Get('payments')
  payments(@Req() request: Request, @Res() response: Response) {
    return this.forward(request, response, 'GET', '/portal-public/payments');
  }

  @Post('invoices/:id/payment-checkout')
  paymentCheckout(
    @Req() request: Request,
    @Res() response: Response,
    @Param('id') id: string,
  ) {
    return this.forwardId(
      request,
      response,
      'POST',
      id,
      (safeId) => `/portal-public/invoices/${safeId}/payment-checkout`,
    );
  }

  @Get('credit-notes')
  creditNotes(@Req() request: Request, @Res() response: Response) {
    return this.forward(
      request,
      response,
      'GET',
      '/portal-public/credit-notes',
    );
  }

  @Get('requests')
  requests(@Req() request: Request, @Res() response: Response) {
    return this.forward(request, response, 'GET', '/portal-public/requests');
  }

  @Post('requests')
  createRequest(@Req() request: Request, @Res() response: Response) {
    return this.forward(request, response, 'POST', '/portal-public/requests');
  }

  @Post('requests/:id/comments')
  comment(
    @Req() request: Request,
    @Res() response: Response,
    @Param('id') id: string,
  ) {
    return this.forwardId(
      request,
      response,
      'POST',
      id,
      (safeId) => `/portal-public/requests/${safeId}/comments`,
    );
  }

  @Post('requests/:id/documents')
  document(
    @Req() request: Request,
    @Res() response: Response,
    @Param('id') id: string,
  ) {
    return this.forwardId(
      request,
      response,
      'POST',
      id,
      (safeId) => `/portal-public/requests/${safeId}/documents`,
    );
  }

  @Post('requests/:id/signatures')
  signature(
    @Req() request: Request,
    @Res() response: Response,
    @Param('id') id: string,
  ) {
    return this.forwardId(
      request,
      response,
      'POST',
      id,
      (safeId) => `/portal-public/requests/${safeId}/signatures`,
    );
  }

  @Get('documents/:id/content')
  documentContent(
    @Req() request: Request,
    @Res() response: Response,
    @Param('id') id: string,
  ) {
    return this.forwardId(
      request,
      response,
      'GET',
      id,
      (safeId) => `/portal-public/documents/${safeId}/content`,
    );
  }

  @Get('notifications')
  notifications(@Req() request: Request, @Res() response: Response) {
    return this.forward(
      request,
      response,
      'GET',
      '/portal-public/notifications',
    );
  }

  @Get('history')
  history(@Req() request: Request, @Res() response: Response) {
    return this.forward(request, response, 'GET', '/portal-public/history');
  }

  @Post('notifications/:id/read')
  readNotification(
    @Req() request: Request,
    @Res() response: Response,
    @Param('id') id: string,
  ) {
    return this.forwardId(
      request,
      response,
      'POST',
      id,
      (safeId) => `/portal-public/notifications/${safeId}/read`,
    );
  }

  private forwardId(
    request: Request,
    response: Response,
    method: 'GET' | 'POST',
    id: string,
    path: (safeId: string) => string,
  ) {
    if (!uuidPattern.test(id)) {
      response.status(400).json({ message: 'Invalid identifier' });
      return;
    }
    return this.forward(request, response, method, path(id.toLowerCase()));
  }

  private async forward(
    request: Request,
    response: Response,
    method: 'GET' | 'POST',
    upstreamPath: string,
    requiresAuthorization = true,
  ): Promise<void> {
    response.setHeader('Cache-Control', 'private, no-store');
    response.setHeader('Pragma', 'no-cache');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    if (!this.config.get('ERP_MAROC_ENABLED')) {
      response.status(404).json({ message: 'Portal unavailable' });
      return;
    }

    const authorization = readHeader(request, 'authorization');
    if (requiresAuthorization && !validAuthorization(authorization)) {
      response
        .status(401)
        .json({ message: 'Invalid or expired portal access' });
      return;
    }

    let body: string | undefined;
    if (method === 'POST') {
      if (
        !/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(
          readHeader(request, 'content-type'),
        )
      ) {
        response.status(415).json({ message: 'JSON body required' });
        return;
      }
      try {
        body = JSON.stringify(request.body);
      } catch {
        response.status(400).json({ message: 'Invalid JSON body' });
        return;
      }
      if (body === undefined) {
        response.status(400).json({ message: 'Invalid JSON body' });
        return;
      }
      if (Buffer.byteLength(body, 'utf8') > MAXIMUM_BODY_BYTES) {
        response.status(413).json({ message: 'Request body is too large' });
        return;
      }
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const upstream = await fetch(
        buildUpstreamUrl(String(this.config.get('ERP_API_URL')), upstreamPath),
        {
          method,
          headers: {
            Accept: 'application/json',
            ...(requiresAuthorization ? { Authorization: authorization } : {}),
            ...(method === 'POST'
              ? { 'Content-Type': 'application/json' }
              : {}),
            'x-erp-internal-key': String(
              this.config.get('ERP_INTERNAL_API_KEY'),
            ),
          },
          ...(method === 'POST' ? { body } : {}),
          signal: controller.signal,
        },
      );
      const payload = (await upstream.json().catch(() => null)) as unknown;
      if (payload === null) {
        response.status(502).json({ message: 'Invalid portal response' });
        return;
      }
      response.status(upstream.status).json(payload);
    } catch {
      response.status(502).json({ message: 'Portal temporarily unavailable' });
    } finally {
      clearTimeout(timeout);
    }
  }
}
