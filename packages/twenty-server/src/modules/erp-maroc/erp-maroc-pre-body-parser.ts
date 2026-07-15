import { json, type RequestHandler } from 'express';

const ERP_MAROC_PREFIX = '/erp-maroc-api';
const ERP_MAROC_JSON_LIMIT = 1024 * 1024;

type ErpMarocEnabledConfig = Readonly<{
  get(key: 'ERP_MAROC_ENABLED'): boolean;
}>;

const isErpMarocRequest = (originalUrl: string): boolean => {
  const pathname = originalUrl.split('?', 1)[0];
  const normalizedPathname = pathname.toLowerCase();

  return (
    normalizedPathname === ERP_MAROC_PREFIX ||
    normalizedPathname.startsWith(`${ERP_MAROC_PREFIX}/`)
  );
};

export const createErpMarocPreBodyParser = (
  config: ErpMarocEnabledConfig,
): RequestHandler => {
  const strictJsonParser = json({ limit: ERP_MAROC_JSON_LIMIT, strict: true });

  return (request, response, next) => {
    if (!isErpMarocRequest(request.originalUrl || request.url)) {
      next();
      return;
    }

    if (!config.get('ERP_MAROC_ENABLED')) {
      request.resume();
      response.status(404).json({ statusCode: 404, code: 'ERP_DISABLED' });
      return;
    }

    strictJsonParser(request, response, next);
  };
};
