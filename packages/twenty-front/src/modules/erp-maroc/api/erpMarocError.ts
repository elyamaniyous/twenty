import { erpErrorSchema, type ErpErrorCode } from 'twenty-shared/erp-maroc';

export class ErpMarocError extends Error {
  constructor(
    readonly code: ErpErrorCode,
    readonly statusCode: number,
  ) {
    super(code);
    this.name = 'ErpMarocError';
  }
}

export const parseErpMarocError = async (
  response: Response,
): Promise<ErpMarocError> => {
  try {
    const payload: unknown = await response.json();
    const parsed = erpErrorSchema.safeParse(payload);
    if (parsed.success) {
      return new ErpMarocError(parsed.data.code, parsed.data.statusCode);
    }
  } catch {
    // Upstream text and malformed payloads are intentionally not exposed.
  }

  return new ErpMarocError('ERP_UNKNOWN', response.status || 502);
};
