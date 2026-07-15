import { Inject, Injectable, type NestMiddleware } from '@nestjs/common';

import { type NextFunction, type Request, type Response } from 'express';

import { TwentyConfigService } from 'src/engine/core-modules/twenty-config/twenty-config.service';

type ErpMarocEnabledConfig = Readonly<{
  get(key: 'ERP_MAROC_ENABLED'): boolean;
}>;

@Injectable()
export class ErpMarocEnabledMiddleware implements NestMiddleware {
  constructor(
    @Inject(TwentyConfigService)
    private readonly config: ErpMarocEnabledConfig,
  ) {}

  use(_request: Request, response: Response, next: NextFunction): void {
    if (!this.config.get('ERP_MAROC_ENABLED')) {
      response.status(404).json({ statusCode: 404, code: 'ERP_DISABLED' });
      return;
    }

    next();
  }
}
