import { pollInvoicePdf } from '@/erp-maroc/invoices/pollInvoicePdf';

import type { ErpInvoice } from 'twenty-shared/erp-maroc';

const invoice = (pdfGenerationStatus: ErpInvoice['pdfGenerationStatus']) =>
  ({ pdfGenerationStatus }) as ErpInvoice;

describe('pollInvoicePdf', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns a generated invoice immediately without scheduling a timer', async () => {
    const fetchInvoice = jest.fn().mockResolvedValue(invoice('GENERATED'));

    await expect(pollInvoicePdf({ fetchInvoice })).resolves.toEqual({
      status: 'generated',
      invoice: invoice('GENERATED'),
    });

    expect(fetchInvoice).toHaveBeenCalledTimes(1);
    expect(jest.getTimerCount()).toBe(0);
  });

  it('polls after 1s, 2s, then 5s until the PDF is generated', async () => {
    const fetchInvoice = jest
      .fn()
      .mockResolvedValueOnce(invoice('PENDING'))
      .mockResolvedValueOnce(invoice('PROCESSING'))
      .mockResolvedValueOnce(invoice('PENDING'))
      .mockResolvedValueOnce(invoice('GENERATED'));

    const result = pollInvoicePdf({ fetchInvoice });
    await Promise.resolve();
    expect(fetchInvoice).toHaveBeenCalledTimes(1);

    await jest.advanceTimersByTimeAsync(1_000);
    expect(fetchInvoice).toHaveBeenCalledTimes(2);
    await jest.advanceTimersByTimeAsync(2_000);
    expect(fetchInvoice).toHaveBeenCalledTimes(3);
    await jest.advanceTimersByTimeAsync(5_000);

    await expect(result).resolves.toEqual({
      status: 'generated',
      invoice: invoice('GENERATED'),
    });
    expect(fetchInvoice).toHaveBeenCalledTimes(4);
    expect(jest.getTimerCount()).toBe(0);
  });

  it('returns FAILED immediately and leaves no pending timer', async () => {
    const fetchInvoice = jest.fn().mockResolvedValue(invoice('FAILED'));

    await expect(pollInvoicePdf({ fetchInvoice })).resolves.toEqual({
      status: 'failed',
      invoice: invoice('FAILED'),
    });

    expect(jest.getTimerCount()).toBe(0);
  });

  it('stops after sixty seconds without fetching beyond the deadline', async () => {
    const fetchInvoice = jest.fn().mockResolvedValue(invoice('PROCESSING'));
    const result = pollInvoicePdf({ fetchInvoice });
    await Promise.resolve();

    await jest.advanceTimersByTimeAsync(60_000);

    await expect(result).resolves.toEqual({
      status: 'timeout',
      invoice: invoice('PROCESSING'),
    });
    expect(fetchInvoice).toHaveBeenCalledTimes(14);
    expect(jest.getTimerCount()).toBe(0);
  });

  it('forwards the abort signal and resolves aborted without retaining a timer', async () => {
    const controller = new AbortController();
    const fetchInvoice = jest.fn().mockResolvedValue(invoice('PENDING'));
    const result = pollInvoicePdf({
      fetchInvoice,
      signal: controller.signal,
    });
    await Promise.resolve();

    controller.abort();

    await expect(result).resolves.toEqual({ status: 'aborted' });
    expect(fetchInvoice).toHaveBeenCalledWith(controller.signal);
    expect(jest.getTimerCount()).toBe(0);
  });

  it('normalizes an in-flight abort error without retaining a timer', async () => {
    const controller = new AbortController();
    const fetchInvoice = jest.fn(
      () =>
        new Promise<ErpInvoice>((_resolve, reject) => {
          controller.signal.addEventListener(
            'abort',
            () => reject(new DOMException('Aborted', 'AbortError')),
            { once: true },
          );
        }),
    );
    const result = pollInvoicePdf({
      fetchInvoice,
      signal: controller.signal,
    });

    controller.abort();

    await expect(result).resolves.toEqual({ status: 'aborted' });
    expect(jest.getTimerCount()).toBe(0);
  });
});
