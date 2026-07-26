import {
  Controller,
  Inject,
  Post,
  Req,
  Res,
} from '@nestjs/common';

import { type Request, type Response } from 'express';

import { TwentyConfigService } from 'src/engine/core-modules/twenty-config/twenty-config.service';

type PublicMarketingConfig = Readonly<{
  get(
    key: 'ERP_MAROC_ENABLED' | 'ERP_API_URL' | 'ERP_INTERNAL_API_KEY',
  ): boolean | string;
}>;

const MAXIMUM_BODY_BYTES = 128 * 1024;
const REQUEST_TIMEOUT_MS = 10_000;

const readHeader = (request: Request, name: string): string => {
  const value = request.headers[name.toLowerCase()];
  return typeof value === 'string' ? value : '';
};

const validBearer = (authorization: string): boolean =>
  /^Bearer [A-Za-z0-9._~-]{32,512}$/.test(authorization);

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

@Controller('erp-maroc-public/marketing')
export class ErpMarocPublicMarketingController {
  constructor(
    @Inject(TwentyConfigService)
    private readonly config: PublicMarketingConfig,
  ) {}

  @Post('demo-submissions')
  demoSubmission(@Req() request: Request, @Res() response: Response) {
    return this.forward(
      request,
      response,
      '/marketing/public/forms/demo-submissions',
    );
  }

  @Post('brevo-webhook')
  brevoWebhook(@Req() request: Request, @Res() response: Response) {
    return this.forward(
      request,
      response,
      '/marketing/public/webhooks/brevo',
    );
  }

  private async forward(
    request: Request,
    response: Response,
    upstreamPath: string,
  ): Promise<void> {
    if (!this.config.get('ERP_MAROC_ENABLED')) {
      response.status(404).json({ accepted: false });
      return;
    }

    const authorization = readHeader(request, 'authorization');
    if (!validBearer(authorization)) {
      response.status(401).json({ accepted: false });
      return;
    }
    if (
      !/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(
        readHeader(request, 'content-type'),
      )
    ) {
      response.status(415).json({ accepted: false });
      return;
    }

    let body: string;
    try {
      body = JSON.stringify(request.body);
    } catch {
      response.status(400).json({ accepted: false });
      return;
    }
    if (Buffer.byteLength(body, 'utf8') > MAXIMUM_BODY_BYTES) {
      response.status(413).json({ accepted: false });
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const upstream = await fetch(
        buildUpstreamUrl(
          String(this.config.get('ERP_API_URL')),
          upstreamPath,
        ),
        {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            Authorization: authorization,
            'Content-Type': 'application/json',
            'x-erp-internal-key': String(
              this.config.get('ERP_INTERNAL_API_KEY'),
            ),
          },
          body,
          signal: controller.signal,
        },
      );
      const payload = (await upstream.json().catch(() => null)) as unknown;
      if (payload === null) {
        response.status(502).json({ accepted: false });
        return;
      }
      response.status(upstream.status).json(payload);
    } catch {
      response.status(502).json({ accepted: false });
    } finally {
      clearTimeout(timeout);
    }
  }
}
