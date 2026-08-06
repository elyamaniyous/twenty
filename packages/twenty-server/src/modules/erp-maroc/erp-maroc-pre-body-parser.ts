import { json, type RequestHandler } from 'express';

const ERP_MAROC_PREFIX = '/erp-maroc-api';
const ERP_MAROC_PUBLIC_PORTAL_PREFIX = '/erp-maroc-public/portal';
const ERP_MAROC_JSON_LIMIT = 1024 * 1024;
const ERP_BANK_STATEMENT_JSON_LIMIT = 21 * 1024 * 1024;
const ERP_PORTAL_DOCUMENT_JSON_LIMIT = 20 * 1024 * 1024;

type ErpMarocEnabledConfig = Readonly<{
  get(key: 'ERP_MAROC_ENABLED'): boolean;
}>;

const isErpMarocRequest = (originalUrl: string): boolean => {
  const pathname = originalUrl.split('?', 1)[0];
  const normalizedPathname = pathname.toLowerCase();

  return (
    normalizedPathname === ERP_MAROC_PREFIX ||
    normalizedPathname.startsWith(`${ERP_MAROC_PREFIX}/`) ||
    normalizedPathname === ERP_MAROC_PUBLIC_PORTAL_PREFIX ||
    normalizedPathname.startsWith(`${ERP_MAROC_PUBLIC_PORTAL_PREFIX}/`)
  );
};

export const createErpMarocPreBodyParser = (
  config: ErpMarocEnabledConfig,
): RequestHandler => {
  const strictJsonParser = json({ limit: ERP_MAROC_JSON_LIMIT, strict: true });
  const bankStatementParser = json({
    limit: ERP_BANK_STATEMENT_JSON_LIMIT,
    strict: true,
  });
  const portalDocumentParser = json({
    limit: ERP_PORTAL_DOCUMENT_JSON_LIMIT,
    strict: true,
  });

  return (request, response, next) => {
    if (!isErpMarocRequest(request.originalUrl || request.url)) {
      next();
      return;
    }

    if (!config.get('ERP_MAROC_ENABLED')) {
      request.resume();
      const reply = () => {
        if (!response.headersSent) {
          response.status(404).json({ statusCode: 404, code: 'ERP_DISABLED' });
        }
      };
      if (request.readableEnded) reply();
      else request.once('end', reply);
      return;
    }

    const pathname = (request.originalUrl || request.url).split('?', 1)[0];
    if (
      request.method === 'POST' &&
      pathname.toLowerCase() === `${ERP_MAROC_PREFIX}/bank-statements`
    ) {
      bankStatementParser(request, response, next);
      return;
    }
    if (
      request.method === 'POST' &&
      new RegExp(
        `^${ERP_MAROC_PUBLIC_PORTAL_PREFIX}/requests/[0-9a-f-]+/documents$`,
        'i',
      ).test(pathname)
    ) {
      portalDocumentParser(request, response, next);
      return;
    }

    strictJsonParser(request, response, next);
  };
};
