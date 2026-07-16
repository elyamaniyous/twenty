import { Inject, Injectable } from '@nestjs/common';

import {
  type ErpErrorCode,
  type ErpMarocRouteId,
} from 'twenty-shared/erp-maroc';

import { TwentyConfigService } from 'src/engine/core-modules/twenty-config/twenty-config.service';

import {
  resolveErpRoute,
  type ErpMarocHttpMethod,
  type ErpMarocQuery,
} from './erp-maroc-route-policy';

const JSON_LIMIT_BYTES = 1024 * 1024;
const BANK_STATEMENT_JSON_LIMIT_BYTES = 21 * 1024 * 1024;
const ERROR_LIMIT_BYTES = 64 * 1024;
const PDF_LIMIT_BYTES = 20 * 1024 * 1024;
const JSON_TIMEOUT_MS = 15_000;
const PDF_TIMEOUT_MS = 30_000;
const CONTENT_DISPOSITION_LIMIT = 1024;

const stableMessages: Record<ErpErrorCode, string> = {
  AUTH_TOKEN_INVALID_OR_EXPIRED: 'Authentication failed',
  ERP_LINK_REQUIRED: 'ERP link is required',
  ERP_DISABLED: 'ERP Maroc is disabled',
  ERP_UPSTREAM_TIMEOUT: 'ERP upstream timed out',
  ERP_UPSTREAM_INVALID_RESPONSE: 'ERP upstream returned an invalid response',
  ERP_STATE_CONFLICT: 'ERP state conflict',
  ERP_VALIDATION_ERROR: 'ERP request validation failed',
  ERP_NOT_FOUND: 'ERP resource not found',
  ERP_RATE_LIMITED: 'ERP rate limit exceeded',
  ERP_UNKNOWN: 'ERP request failed',
};

export class ErpMarocProxyError extends Error {
  readonly name = 'ErpMarocProxyError';

  constructor(
    readonly code: ErpErrorCode,
    readonly statusCode: number,
  ) {
    super(stableMessages[code]);
  }

  toJSON() {
    return { statusCode: this.statusCode, code: this.code };
  }
}

export type ErpMarocServerIdentity = Readonly<{
  twentyUserId: string;
  twentyWorkspaceId: string;
  twentyUserEmail: string;
}>;

export type ErpMarocProxyRequest = Readonly<{
  method: ErpMarocHttpMethod | string;
  path: string;
  query: ErpMarocQuery;
  body?: unknown;
  contentType?: string;
  contentLength?: string;
  transferEncoding?: string | readonly string[];
  idempotencyKey?: string;
  identity: ErpMarocServerIdentity;
  clientSignal?: AbortSignal;
  browserHeaders?: Readonly<Record<string, unknown>>;
}>;

export type ErpMarocJsonProxyResult = Readonly<{
  kind: 'json';
  statusCode: number;
  data: unknown;
}>;

export type ErpMarocPdfHeaders = Readonly<{
  'content-type': 'application/pdf';
  'content-length': string;
  'content-disposition'?: string;
  'cache-control': 'private, no-store';
  pragma: 'no-cache';
  'x-content-type-options': 'nosniff';
}>;

export type ErpMarocPdfProxyResult = Readonly<{
  kind: 'pdf';
  statusCode: number;
  body: ReadableStream<Uint8Array>;
  contentLength: number;
  headers: ErpMarocPdfHeaders;
}>;

export type ErpMarocProxyResult =
  | ErpMarocJsonProxyResult
  | ErpMarocPdfProxyResult;

export type ErpMarocConfigReader = Readonly<{
  get(key: 'ERP_API_URL' | 'ERP_INTERNAL_API_KEY'): string;
}>;

type BoundedBody = Readonly<{
  bytes: Uint8Array;
  exceeded: boolean;
}>;

type AbortLifecycle = Readonly<{
  signal: AbortSignal;
  didTimeOut: () => boolean;
  cleanup: () => void;
}>;

const validationError = (statusCode = 400) =>
  new ErpMarocProxyError('ERP_VALIDATION_ERROR', statusCode);
const invalidResponse = () =>
  new ErpMarocProxyError('ERP_UPSTREAM_INVALID_RESPONSE', 502);

const normalizeHeaderValue = (value: string): string => {
  if (
    typeof value !== 'string' ||
    value.length === 0 ||
    value.length > 500 ||
    value.trim() !== value ||
    /[\r\n\u0000]/.test(value)
  ) {
    throw validationError();
  }

  return value;
};

const normalizeIdempotencyKey = (value: string | undefined): string => {
  if (
    typeof value !== 'string' ||
    !/^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/.test(value)
  ) {
    throw validationError();
  }

  return value;
};

const assertMutationMetadata = (
  contentType: string | undefined,
  contentLength: string | undefined,
  transferEncoding: string | readonly string[] | undefined,
  maximumBytes = JSON_LIMIT_BYTES,
): void => {
  if (
    transferEncoding !== undefined ||
    typeof contentType !== 'string' ||
    !/^application\/json(?:\s*;\s*charset=(?:utf-8|"utf-8"))?$/i.test(
      contentType,
    ) ||
    typeof contentLength !== 'string' ||
    !/^(?:0|[1-9]\d*)$/.test(contentLength)
  ) {
    throw validationError();
  }
  const declaredLength = Number(contentLength);
  if (!Number.isSafeInteger(declaredLength) || declaredLength > maximumBytes) {
    throw validationError();
  }
};

const serializeBody = (
  body: unknown,
  maximumBytes = JSON_LIMIT_BYTES,
): string | undefined => {
  if (body === undefined) return undefined;
  let serialized: string;
  try {
    serialized = JSON.stringify(body);
  } catch {
    throw validationError();
  }
  if (
    serialized === undefined ||
    Buffer.byteLength(serialized, 'utf8') > maximumBytes
  ) {
    throw validationError();
  }

  return serialized;
};

const readBoundedBody = async (
  response: Response,
  maximumBytes: number,
): Promise<BoundedBody> => {
  if (response.body === null)
    return { bytes: new Uint8Array(), exceeded: false };
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const available = maximumBytes + 1 - total;
      if (available > 0) chunks.push(value.subarray(0, available));
      total += value.byteLength;
      if (total > maximumBytes) {
        await reader.cancel().catch(() => undefined);
        return {
          bytes: Buffer.concat(chunks.map((chunk) => Buffer.from(chunk))),
          exceeded: true,
        };
      }
    }
  } finally {
    reader.releaseLock();
  }

  return {
    bytes: Buffer.concat(chunks.map((chunk) => Buffer.from(chunk))),
    exceeded: false,
  };
};

const upstreamStatusError = (
  status: number,
  routeId: ErpMarocRouteId,
): ErpMarocProxyError => {
  if (status === 403 && routeId === 'context') {
    return new ErpMarocProxyError('ERP_LINK_REQUIRED', 403);
  }
  if (status === 400 || status === 422) return validationError(status);
  if (status === 404) return new ErpMarocProxyError('ERP_NOT_FOUND', status);
  if (status === 409)
    return new ErpMarocProxyError('ERP_STATE_CONFLICT', status);
  if (status === 429) return new ErpMarocProxyError('ERP_RATE_LIMITED', status);

  return new ErpMarocProxyError('ERP_UNKNOWN', status);
};

const buildUpstreamUrl = (baseValue: string, upstreamPath: string): URL => {
  let base: URL;
  try {
    base = new URL(baseValue);
  } catch {
    throw new ErpMarocProxyError('ERP_UNKNOWN', 502);
  }
  if (
    !['http:', 'https:'].includes(base.protocol) ||
    base.username !== '' ||
    base.password !== '' ||
    base.search !== '' ||
    base.hash !== ''
  ) {
    throw new ErpMarocProxyError('ERP_UNKNOWN', 502);
  }
  base.pathname = `${base.pathname.replace(/\/+$/, '')}/`;
  const upstream = new URL(upstreamPath.slice(1), base);
  if (
    upstream.origin !== base.origin ||
    !upstream.pathname.startsWith(base.pathname) ||
    upstream.username !== '' ||
    upstream.password !== ''
  ) {
    throw new ErpMarocProxyError('ERP_UNKNOWN', 502);
  }

  return upstream;
};

const createCombinedAbort = (
  timeoutMs: number,
  clientSignal?: AbortSignal,
): AbortLifecycle => {
  const timeoutController = new AbortController();
  const fallbackController = new AbortController();
  let timedOut = false;
  const timeout = setTimeout(() => {
    timedOut = true;
    timeoutController.abort();
  }, timeoutMs);
  const signals = clientSignal
    ? [timeoutController.signal, clientSignal]
    : [timeoutController.signal];
  const abortSignalConstructor = AbortSignal as typeof AbortSignal & {
    any?: (signals: AbortSignal[]) => AbortSignal;
  };
  const listeners: Array<readonly [AbortSignal, () => void]> = [];
  let signal: AbortSignal;

  if (abortSignalConstructor.any !== undefined) {
    signal = abortSignalConstructor.any(signals);
  } else {
    for (const source of signals) {
      const listener = () => fallbackController.abort(source.reason);
      listeners.push([source, listener]);
      if (source.aborted) listener();
      else source.addEventListener('abort', listener, { once: true });
    }
    signal = fallbackController.signal;
  }

  let cleaned = false;
  return {
    signal,
    didTimeOut: () => timedOut,
    cleanup: () => {
      if (cleaned) return;
      cleaned = true;
      clearTimeout(timeout);
      for (const [source, listener] of listeners) {
        source.removeEventListener('abort', listener);
      }
    },
  };
};

const abortError = (
  abort: AbortLifecycle,
  clientSignal?: AbortSignal,
): ErpMarocProxyError => {
  if (abort.didTimeOut()) {
    return new ErpMarocProxyError('ERP_UPSTREAM_TIMEOUT', 504);
  }
  if (clientSignal?.aborted) {
    return new ErpMarocProxyError('ERP_UNKNOWN', 499);
  }

  return new ErpMarocProxyError('ERP_UNKNOWN', 502);
};

const cancelInvalidPdf = async (response: Response): Promise<never> => {
  await response.body?.cancel().catch(() => undefined);
  throw invalidResponse();
};

const validatePdfHeaders = async (
  response: Response,
): Promise<{
  contentLength: number;
  headers: ErpMarocPdfHeaders;
  body: ReadableStream<Uint8Array>;
}> => {
  const contentType = response.headers
    .get('content-type')
    ?.trim()
    .toLowerCase();
  const lengthValue = response.headers.get('content-length');
  if (
    contentType !== 'application/pdf' ||
    lengthValue === null ||
    !/^[1-9]\d*$/.test(lengthValue)
  ) {
    return cancelInvalidPdf(response);
  }
  const contentLength = Number(lengthValue);
  if (
    !Number.isSafeInteger(contentLength) ||
    contentLength > PDF_LIMIT_BYTES ||
    response.body === null
  ) {
    return cancelInvalidPdf(response);
  }

  const contentDisposition = response.headers.get('content-disposition');
  if (
    contentDisposition !== null &&
    (contentDisposition.length === 0 ||
      contentDisposition.length > CONTENT_DISPOSITION_LIMIT ||
      !/^[\x20-\x7e]+$/.test(contentDisposition) ||
      /[\r\n]/.test(contentDisposition))
  ) {
    return cancelInvalidPdf(response);
  }
  const cacheControl = response.headers.get('cache-control');
  if (
    cacheControl !== null &&
    cacheControl !== 'private, no-store' &&
    cacheControl !== 'no-store'
  ) {
    return cancelInvalidPdf(response);
  }
  const pragma = response.headers.get('pragma');
  if (pragma !== null && pragma.toLowerCase() !== 'no-cache') {
    return cancelInvalidPdf(response);
  }
  const contentTypeOptions = response.headers.get('x-content-type-options');
  if (
    contentTypeOptions !== null &&
    contentTypeOptions.toLowerCase() !== 'nosniff'
  ) {
    return cancelInvalidPdf(response);
  }

  return {
    contentLength,
    body: response.body,
    headers: {
      'content-type': 'application/pdf',
      'content-length': lengthValue,
      ...(contentDisposition === null
        ? {}
        : { 'content-disposition': contentDisposition }),
      'cache-control': 'private, no-store',
      pragma: 'no-cache',
      'x-content-type-options': 'nosniff',
    },
  };
};

const createBoundedPdfStream = (
  upstreamBody: ReadableStream<Uint8Array>,
  expectedLength: number,
  abort: AbortLifecycle,
  clientSignal?: AbortSignal,
): ReadableStream<Uint8Array> => {
  const reader = upstreamBody.getReader();
  let controllerRef: ReadableStreamDefaultController<Uint8Array> | undefined;
  let total = 0;
  let settled = false;

  const releaseReader = () => {
    try {
      reader.releaseLock();
    } catch {
      // A pending read releases after cancellation settles.
    }
  };
  const cleanup = () => {
    abort.signal.removeEventListener('abort', onAbort);
    abort.cleanup();
  };
  const fail = (
    controller: ReadableStreamDefaultController<Uint8Array>,
    error: ErpMarocProxyError,
  ) => {
    if (settled) return Promise.resolve();
    settled = true;
    cleanup();
    controller.error(error);
    return reader
      .cancel(error)
      .catch(() => undefined)
      .finally(releaseReader);
  };
  const onAbort = () => {
    if (controllerRef !== undefined) {
      void fail(controllerRef, abortError(abort, clientSignal));
    }
  };

  return new ReadableStream<Uint8Array>({
    start(controller) {
      controllerRef = controller;
      abort.signal.addEventListener('abort', onAbort, { once: true });
      if (abort.signal.aborted) onAbort();
    },
    async pull(controller) {
      if (settled) return;
      try {
        const { done, value } = await reader.read();
        if (settled) return;
        if (done) {
          if (total !== expectedLength) {
            await fail(controller, invalidResponse());
            return;
          }
          settled = true;
          cleanup();
          controller.close();
          releaseReader();
          return;
        }
        total += value.byteLength;
        if (total > expectedLength || total > PDF_LIMIT_BYTES) {
          await fail(controller, invalidResponse());
          return;
        }
        controller.enqueue(value);
      } catch (error) {
        if (settled) return;
        await fail(
          controller,
          abort.signal.aborted
            ? abortError(abort, clientSignal)
            : error instanceof ErpMarocProxyError
              ? error
              : invalidResponse(),
        );
      }
    },
    async cancel(reason) {
      if (settled) return;
      settled = true;
      cleanup();
      await reader.cancel(reason).catch(() => undefined);
      releaseReader();
    },
  });
};

@Injectable()
export class ErpMarocProxyService {
  constructor(
    @Inject(TwentyConfigService)
    private readonly twentyConfigService: ErpMarocConfigReader,
  ) {}

  async execute(input: ErpMarocProxyRequest): Promise<ErpMarocProxyResult> {
    let route;
    try {
      route = resolveErpRoute(input.method, input.path, input.query);
    } catch {
      throw validationError();
    }

    if (
      route.idempotency === 'forbidden' &&
      input.idempotencyKey !== undefined
    ) {
      throw validationError();
    }
    const idempotencyKey =
      route.idempotency === 'required'
        ? normalizeIdempotencyKey(input.idempotencyKey)
        : undefined;
    const bodyLimit =
      route.routeId === 'bank-statements.collection' && input.method === 'POST'
        ? BANK_STATEMENT_JSON_LIMIT_BYTES
        : JSON_LIMIT_BYTES;
    if (input.method === 'GET') {
      if (input.body !== undefined) throw validationError();
    } else {
      assertMutationMetadata(
        input.contentType,
        input.contentLength,
        input.transferEncoding,
        bodyLimit,
      );
    }
    const serializedBody = serializeBody(input.body, bodyLimit);
    const identity = input.identity;
    const headers: Record<string, string> = {
      accept: route.kind === 'pdf' ? 'application/pdf' : 'application/json',
      ...(route.kind === 'json' ? { 'content-type': 'application/json' } : {}),
      'x-erp-internal-key': normalizeHeaderValue(
        this.twentyConfigService.get('ERP_INTERNAL_API_KEY'),
      ),
      'x-twenty-workspace-id': normalizeHeaderValue(identity.twentyWorkspaceId),
      'x-twenty-user-id': normalizeHeaderValue(identity.twentyUserId),
      'x-twenty-user-email': normalizeHeaderValue(identity.twentyUserEmail),
    };
    if (idempotencyKey !== undefined) {
      headers['Idempotency-Key'] = idempotencyKey;
    }

    const url = buildUpstreamUrl(
      this.twentyConfigService.get('ERP_API_URL'),
      route.upstreamPath,
    );
    const abort = createCombinedAbort(
      route.kind === 'pdf' ? PDF_TIMEOUT_MS : JSON_TIMEOUT_MS,
      input.clientSignal,
    );
    let pdfOwnsAbortLifecycle = false;

    try {
      const response = await fetch(url.toString(), {
        method: input.method,
        headers,
        body: serializedBody,
        redirect: 'manual',
        signal: abort.signal,
      });

      if (response.status >= 300 && response.status < 400) {
        await readBoundedBody(response, ERROR_LIMIT_BYTES);
        throw invalidResponse();
      }
      if (!response.ok) {
        await readBoundedBody(response, ERROR_LIMIT_BYTES);
        throw upstreamStatusError(response.status, route.routeId);
      }
      if (route.kind === 'pdf') {
        const {
          contentLength,
          headers: pdfHeaders,
          body: upstreamBody,
        } = await validatePdfHeaders(response);
        const body = createBoundedPdfStream(
          upstreamBody,
          contentLength,
          abort,
          input.clientSignal,
        );
        pdfOwnsAbortLifecycle = true;
        return {
          kind: 'pdf',
          statusCode: response.status,
          body,
          contentLength,
          headers: pdfHeaders,
        };
      }
      return await this.parseJson(response, route.responseSchema);
    } catch (error) {
      if (error instanceof ErpMarocProxyError) throw error;
      if (abort.signal.aborted) throw abortError(abort, input.clientSignal);
      throw new ErpMarocProxyError('ERP_UNKNOWN', 502);
    } finally {
      if (!pdfOwnsAbortLifecycle) abort.cleanup();
    }
  }

  private async parseJson(
    response: Response,
    responseSchema: {
      safeParse(value: unknown): { success: boolean; data?: unknown };
    },
  ): Promise<ErpMarocJsonProxyResult> {
    const contentType = response.headers
      .get('content-type')
      ?.split(';', 1)[0]
      .trim()
      .toLowerCase();
    if (contentType !== 'application/json') {
      await response.body?.cancel().catch(() => undefined);
      throw invalidResponse();
    }
    const body = await readBoundedBody(response, JSON_LIMIT_BYTES);
    if (body.exceeded) throw invalidResponse();
    let parsed: unknown;
    try {
      parsed = JSON.parse(
        new TextDecoder('utf-8', { fatal: true }).decode(body.bytes),
      );
    } catch {
      throw invalidResponse();
    }
    const validated = responseSchema.safeParse(parsed);
    if (!validated.success) throw invalidResponse();

    return { kind: 'json', statusCode: response.status, data: validated.data };
  }
}
