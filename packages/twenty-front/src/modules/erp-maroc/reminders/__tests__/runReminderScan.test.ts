import type { ErpMarocClient } from '@/erp-maroc/api/erpMarocClient';

import {
  createReminderScanRunner,
  type ReminderScanSnapshot,
} from '@/erp-maroc/reminders/runReminderScan';

const emptyCounters = {
  examined: 0,
  eligible: 0,
  created: 0,
  skippedIneligible: 0,
  skippedAlreadyRecorded: 0,
  skippedActive: 0,
};

describe('createReminderScanRunner', () => {
  it('scans every page with an empty first body and a fresh intent per cursor', async () => {
    const nextCursor = '0193f6ea-7c39-7aa2-8000-000000000010';
    const executeFirst = jest.fn().mockResolvedValue({
      reminderIds: ['0193f6ea-7c39-7aa2-8000-000000000011'],
      hasMore: true,
      nextCursor,
      counters: { ...emptyCounters, examined: 500, eligible: 1, created: 1 },
    });
    const executeSecond = jest.fn().mockResolvedValue({
      reminderIds: [],
      hasMore: false,
      nextCursor: null,
      counters: {
        ...emptyCounters,
        examined: 25,
        skippedIneligible: 25,
      },
    });
    const createMutationIntent = jest
      .fn()
      .mockReturnValueOnce({ execute: executeFirst, retry: jest.fn() })
      .mockReturnValueOnce({ execute: executeSecond, retry: jest.fn() });
    const snapshots: ReminderScanSnapshot[] = [];
    const runner = createReminderScanRunner({
      client: { createMutationIntent } as unknown as ErpMarocClient,
      onChange: (snapshot) => snapshots.push(snapshot),
    });

    await runner.start();

    expect(createMutationIntent).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        method: 'POST',
        path: '/reminders/scan',
        body: {},
      }),
    );
    expect(createMutationIntent).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        method: 'POST',
        path: '/reminders/scan',
        body: { cursor: nextCursor },
      }),
    );
    expect(snapshots.at(-1)).toEqual(
      expect.objectContaining({
        status: 'completed',
        completedPages: 2,
        counters: expect.objectContaining({
          examined: 525,
          eligible: 1,
          created: 1,
          skippedIneligible: 25,
        }),
      }),
    );
  });

  it('retries a failed page with the same intent and idempotency key', async () => {
    const retry = jest.fn().mockResolvedValue({
      reminderIds: [],
      hasMore: false,
      nextCursor: null,
      counters: emptyCounters,
    });
    const createMutationIntent = jest.fn().mockReturnValue({
      execute: jest.fn().mockRejectedValue(new Error('offline')),
      retry,
    });
    const snapshots: ReminderScanSnapshot[] = [];
    const runner = createReminderScanRunner({
      client: { createMutationIntent } as unknown as ErpMarocClient,
      onChange: (snapshot) => snapshots.push(snapshot),
    });

    await runner.start();
    expect(snapshots.at(-1)?.status).toBe('error');

    await runner.retryPage();

    expect(retry).toHaveBeenCalledTimes(1);
    expect(createMutationIntent).toHaveBeenCalledTimes(1);
    expect(snapshots.at(-1)?.status).toBe('completed');
  });

  it('stops after the current completed page', async () => {
    const nextCursor = '0193f6ea-7c39-7aa2-8000-000000000010';
    let resolvePage: (value: unknown) => void = () => undefined;
    const execute = jest.fn(
      () =>
        new Promise((resolve) => {
          resolvePage = resolve;
        }),
    );
    const createMutationIntent = jest.fn().mockReturnValue({
      execute,
      retry: jest.fn(),
    });
    const snapshots: ReminderScanSnapshot[] = [];
    const runner = createReminderScanRunner({
      client: { createMutationIntent } as unknown as ErpMarocClient,
      onChange: (snapshot) => snapshots.push(snapshot),
    });

    const scan = runner.start();
    runner.stop();
    resolvePage({
      reminderIds: [],
      hasMore: true,
      nextCursor,
      counters: { ...emptyCounters, examined: 500 },
    });
    await scan;

    expect(createMutationIntent).toHaveBeenCalledTimes(1);
    expect(snapshots.at(-1)).toEqual(
      expect.objectContaining({
        status: 'stopped',
        completedPages: 1,
        currentCursor: nextCursor,
      }),
    );
  });
});
