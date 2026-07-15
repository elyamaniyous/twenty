import type {
  ErpMarocClient,
  ErpMarocRequiredMutationIntent,
} from '@/erp-maroc/api/erpMarocClient';
import {
  erpReminderScanResultSchema,
  type ErpReminderScanResult,
} from 'twenty-shared/erp-maroc';

type ReminderScanCounters = ErpReminderScanResult['counters'];

export type ReminderScanStatus =
  | 'idle'
  | 'running'
  | 'stopped'
  | 'completed'
  | 'error';

export type ReminderScanSnapshot = {
  status: ReminderScanStatus;
  completedPages: number;
  counters: ReminderScanCounters;
  currentCursor: string | null;
  stopRequested: boolean;
  error: unknown | null;
};

type ReminderScanRunnerOptions = {
  client: ErpMarocClient;
  onChange?: (snapshot: ReminderScanSnapshot) => void;
};

const EMPTY_COUNTERS: ReminderScanCounters = {
  examined: 0,
  eligible: 0,
  created: 0,
  skippedIneligible: 0,
  skippedAlreadyRecorded: 0,
  skippedActive: 0,
};

const addCounters = (
  current: ReminderScanCounters,
  page: ReminderScanCounters,
): ReminderScanCounters => ({
  examined: current.examined + page.examined,
  eligible: current.eligible + page.eligible,
  created: current.created + page.created,
  skippedIneligible: current.skippedIneligible + page.skippedIneligible,
  skippedAlreadyRecorded:
    current.skippedAlreadyRecorded + page.skippedAlreadyRecorded,
  skippedActive: current.skippedActive + page.skippedActive,
});

const cloneSnapshot = (
  snapshot: ReminderScanSnapshot,
): ReminderScanSnapshot => ({
  ...snapshot,
  counters: { ...snapshot.counters },
});

export const createReminderScanRunner = ({
  client,
  onChange,
}: ReminderScanRunnerOptions) => {
  let snapshot: ReminderScanSnapshot = {
    status: 'idle',
    completedPages: 0,
    counters: { ...EMPTY_COUNTERS },
    currentCursor: null,
    stopRequested: false,
    error: null,
  };
  let pageIntent: ErpMarocRequiredMutationIntent<ErpReminderScanResult> | null =
    null;
  let activeRun: Promise<void> | null = null;

  const update = (changes: Partial<ReminderScanSnapshot>) => {
    snapshot = { ...snapshot, ...changes };
    onChange?.(cloneSnapshot(snapshot));
  };

  const createPageIntent = () =>
    client.createMutationIntent({
      method: 'POST',
      path: '/reminders/scan',
      body:
        snapshot.currentCursor === null
          ? {}
          : { cursor: snapshot.currentCursor },
      schema: erpReminderScanResultSchema,
    });

  const runPages = async (retryCurrentPage: boolean) => {
    update({ status: 'running', error: null });
    let retry = retryCurrentPage;

    while (true) {
      pageIntent ??= createPageIntent();

      let result: ErpReminderScanResult;
      try {
        result = await (retry ? pageIntent.retry() : pageIntent.execute());
      } catch (error) {
        update({ status: 'error', error });
        return;
      }

      retry = false;
      pageIntent = null;
      update({
        completedPages: snapshot.completedPages + 1,
        counters: addCounters(snapshot.counters, result.counters),
        currentCursor: result.nextCursor,
      });

      if (!result.hasMore) {
        update({ status: 'completed', stopRequested: false });
        return;
      }

      if (result.nextCursor === null) {
        update({
          status: 'error',
          error: new Error('Reminder scan returned no continuation cursor'),
        });
        return;
      }

      if (snapshot.stopRequested) {
        update({ status: 'stopped', stopRequested: false });
        return;
      }
    }
  };

  const run = (retryCurrentPage: boolean) => {
    if (activeRun !== null) return activeRun;

    activeRun = runPages(retryCurrentPage).finally(() => {
      activeRun = null;
    });
    return activeRun;
  };

  return {
    start: () => {
      if (snapshot.status === 'running') return activeRun ?? Promise.resolve();

      pageIntent = null;
      snapshot = {
        status: 'idle',
        completedPages: 0,
        counters: { ...EMPTY_COUNTERS },
        currentCursor: null,
        stopRequested: false,
        error: null,
      };
      onChange?.(cloneSnapshot(snapshot));
      return run(false);
    },
    stop: () => {
      if (snapshot.status === 'running') {
        update({ stopRequested: true });
      }
    },
    retryPage: () => {
      if (snapshot.status !== 'error' || pageIntent === null) {
        return Promise.resolve();
      }

      update({ stopRequested: false });
      return run(true);
    },
    getSnapshot: () => cloneSnapshot(snapshot),
  };
};

export type ReminderScanRunner = ReturnType<typeof createReminderScanRunner>;
