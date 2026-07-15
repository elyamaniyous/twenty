import type { ErpInvoice } from 'twenty-shared/erp-maroc';

export type PollInvoicePdfResult<TInvoice extends ErpInvoice = ErpInvoice> =
  | { status: 'generated'; invoice: TInvoice }
  | { status: 'failed'; invoice: TInvoice }
  | { status: 'timeout'; invoice: TInvoice }
  | { status: 'aborted' };

export type PollInvoicePdfInput<TInvoice extends ErpInvoice = ErpInvoice> = {
  fetchInvoice: (signal?: AbortSignal) => Promise<TInvoice>;
  signal?: AbortSignal;
};

const TIMEOUT_MS = 60_000;
const pollingDelaysMs = [1_000, 2_000, 5_000] as const;

const waitFor = (delayMs: number, signal?: AbortSignal): Promise<boolean> =>
  new Promise((resolve) => {
    if (signal?.aborted) {
      resolve(false);
      return;
    }

    const timeout = globalThis.setTimeout(() => {
      signal?.removeEventListener('abort', abort);
      resolve(true);
    }, delayMs);

    const abort = () => {
      globalThis.clearTimeout(timeout);
      signal?.removeEventListener('abort', abort);
      resolve(false);
    };

    signal?.addEventListener('abort', abort, { once: true });
  });

const isGenerated = (invoice: ErpInvoice) =>
  invoice.pdfGenerationStatus === 'GENERATED';

const isFailed = (invoice: ErpInvoice) =>
  invoice.pdfGenerationStatus === 'FAILED';

export const pollInvoicePdf = async <TInvoice extends ErpInvoice>({
  fetchInvoice,
  signal,
}: PollInvoicePdfInput<TInvoice>): Promise<PollInvoicePdfResult<TInvoice>> => {
  if (signal?.aborted) {
    return { status: 'aborted' };
  }

  const startedAt = Date.now();
  const readInvoice = async (): Promise<TInvoice | null> => {
    try {
      return await fetchInvoice(signal);
    } catch (error) {
      if (signal?.aborted) {
        return null;
      }
      throw error;
    }
  };
  let invoice = await readInvoice();

  if (signal?.aborted || invoice === null) {
    return { status: 'aborted' };
  }
  if (isGenerated(invoice)) {
    return { status: 'generated', invoice };
  }
  if (isFailed(invoice)) {
    return { status: 'failed', invoice };
  }

  let delayIndex = 0;
  while (Date.now() - startedAt < TIMEOUT_MS) {
    const elapsedMs = Date.now() - startedAt;
    const nextDelayMs = Math.min(
      pollingDelaysMs[Math.min(delayIndex, pollingDelaysMs.length - 1)],
      TIMEOUT_MS - elapsedMs,
    );
    delayIndex += 1;

    if (!(await waitFor(nextDelayMs, signal))) {
      return { status: 'aborted' };
    }

    if (Date.now() - startedAt >= TIMEOUT_MS || signal?.aborted) {
      return signal?.aborted
        ? { status: 'aborted' }
        : { status: 'timeout', invoice };
    }

    invoice = await readInvoice();
    if (signal?.aborted || invoice === null) {
      return { status: 'aborted' };
    }
    if (isGenerated(invoice)) {
      return { status: 'generated', invoice };
    }
    if (isFailed(invoice)) {
      return { status: 'failed', invoice };
    }
  }

  return { status: 'timeout', invoice };
};
