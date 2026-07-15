import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
} from '@nestjs/common';

import { type Response } from 'express';

import { AuthException } from 'src/engine/core-modules/auth/auth.exception';

import { ErpMarocProxyError } from './erp-maroc-proxy.service';

@Catch()
export class ErpMarocAuthFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();

    if (response.headersSent || response.destroyed || response.writableEnded) {
      if (!response.destroyed) response.destroy();
      return;
    }

    if (exception instanceof ErpMarocProxyError) {
      return response.status(exception.statusCode).json(exception.toJSON());
    }

    if (
      exception instanceof HttpException ||
      exception instanceof AuthException
    ) {
      return response.status(401).json({
        statusCode: 401,
        code: 'AUTH_TOKEN_INVALID_OR_EXPIRED',
      });
    }

    return response.status(502).json({
      statusCode: 502,
      code: 'ERP_UNKNOWN',
    });
  }
}
