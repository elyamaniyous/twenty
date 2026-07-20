import { All, Controller, Get, Inject, Req, Res } from '@nestjs/common';
import { type Request, type Response } from 'express';

import { TwentyConfigService } from 'src/engine/core-modules/twenty-config/twenty-config.service';

import { erpMarocPortalPage } from './erp-maroc-portal-page';

type PortalConfig = Readonly<{
  get(
    key: 'ERP_API_URL' | 'ERP_INTERNAL_API_KEY' | 'ERP_MAROC_ENABLED',
  ): string | boolean;
}>;

const UUID =
  '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}';
const allowedRoutes = [
  ['GET', /^\/session$/],
  ['GET', /^\/invoices$/],
  ['GET', /^\/requests$/],
  ['POST', /^\/requests$/],
  ['POST', new RegExp(`^/requests/${UUID}/comments$`)],
  ['POST', new RegExp(`^/requests/${UUID}/documents$`)],
  ['GET', new RegExp(`^/documents/${UUID}/content$`)],
  ['GET', /^\/notifications$/],
  ['POST', new RegExp(`^/notifications/${UUID}/read$`)],
] as const;

const portalPath = (request: Request) => {
  const pathname = request.originalUrl.split('?', 1)[0];
  return pathname.startsWith('/portal-api')
    ? pathname.slice('/portal-api'.length) || '/'
    : '/';
};

@Controller()
export class ErpMarocPortalController {
  constructor(
    @Inject(TwentyConfigService) private readonly config: PortalConfig,
  ) {}

  @Get('portal')
  page(@Res() response: Response) {
    if (!this.config.get('ERP_MAROC_ENABLED'))
      return response.status(404).end();
    response
      .set({
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
        'Content-Security-Policy':
          "default-src 'none'; script-src 'nonce-zowka-portal'; style-src 'unsafe-inline'; connect-src 'self'; img-src 'self' data:; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
        'Referrer-Policy': 'no-referrer',
        'X-Content-Type-Options': 'nosniff',
      })
      .send(erpMarocPortalPage);
  }

  @All('portal-api/*path')
  async proxy(@Req() request: Request, @Res() response: Response) {
    if (!this.config.get('ERP_MAROC_ENABLED'))
      return response.status(404).end();
    const path = portalPath(request);
    const method = request.method.toUpperCase();
    if (
      !allowedRoutes.some(
        ([allowedMethod, pattern]) =>
          allowedMethod === method && pattern.test(path),
      )
    ) {
      return response
        .status(404)
        .json({ statusCode: 404, code: 'PORTAL_ROUTE_NOT_FOUND' });
    }
    const authorization = request.headers.authorization;
    if (
      !authorization ||
      !/^Bearer [A-Za-z0-9_-]{40,100}$/.test(authorization)
    ) {
      return response
        .status(401)
        .json({ statusCode: 401, code: 'PORTAL_AUTH_REQUIRED' });
    }
    const base = String(this.config.get('ERP_API_URL')).replace(/\/+$/, '');
    const body =
      method === 'GET' ? undefined : JSON.stringify(request.body ?? {});
    if (body && Buffer.byteLength(body, 'utf8') > 20 * 1024 * 1024) {
      return response
        .status(413)
        .json({ statusCode: 413, code: 'PORTAL_BODY_TOO_LARGE' });
    }
    try {
      const upstream = await fetch(`${base}/portal-public${path}`, {
        method,
        headers: {
          authorization,
          accept: 'application/json',
          ...(body ? { 'content-type': 'application/json' } : {}),
          'x-erp-internal-key': String(this.config.get('ERP_INTERNAL_API_KEY')),
        },
        body,
        redirect: 'manual',
        signal: AbortSignal.timeout(30_000),
      });
      const text = await upstream.text();
      if (Buffer.byteLength(text, 'utf8') > 21 * 1024 * 1024) {
        return response
          .status(502)
          .json({ statusCode: 502, code: 'PORTAL_INVALID_RESPONSE' });
      }
      response
        .status(upstream.status)
        .set({
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'no-store',
          'X-Content-Type-Options': 'nosniff',
        })
        .send(text);
    } catch {
      response
        .status(502)
        .json({ statusCode: 502, code: 'PORTAL_UPSTREAM_FAILED' });
    }
  }
}
