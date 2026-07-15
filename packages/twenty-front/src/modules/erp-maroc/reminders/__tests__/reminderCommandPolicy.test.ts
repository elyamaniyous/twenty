import {
  getReminderCommandPolicy,
  getReminderMutationMessage,
} from '@/erp-maroc/reminders/reminderCommandPolicy';

describe('getReminderCommandPolicy', () => {
  it('allows approval only for a proposed reminder when delivery is enabled', () => {
    expect(
      getReminderCommandPolicy({
        status: 'PROPOSED',
        nextAttemptAt: null,
        canManageReminders: true,
        reminderDelivery: true,
      }),
    ).toEqual({ canApprove: true, canCancel: true });

    expect(
      getReminderCommandPolicy({
        status: 'PROPOSED',
        nextAttemptAt: null,
        canManageReminders: true,
        reminderDelivery: false,
      }).canApprove,
    ).toBe(false);
  });

  it.each([
    ['PROPOSED', null, true],
    ['APPROVED', '2026-07-15T10:00:00.000Z', true],
    ['FAILED', '2026-07-15T10:00:00.000Z', true],
    ['FAILED', null, false],
    ['PROCESSING', null, false],
    ['RECONCILIATION_REQUIRED', null, false],
    ['SENT', null, false],
    ['CANCELLED', null, false],
    ['SUPERSEDED', null, false],
  ] as const)(
    'derives cancellation for %s with next attempt %s',
    (status, nextAttemptAt, expected) => {
      expect(
        getReminderCommandPolicy({
          status,
          nextAttemptAt,
          canManageReminders: true,
          reminderDelivery: true,
        }).canCancel,
      ).toBe(expected);
    },
  );

  it('blocks every mutation without reminder management capability', () => {
    expect(
      getReminderCommandPolicy({
        status: 'PROPOSED',
        nextAttemptAt: null,
        canManageReminders: false,
        reminderDelivery: true,
      }),
    ).toEqual({ canApprove: false, canCancel: false });
  });

  it.each([
    ['cancel', 'CANCELLED', 1, 1, 'Relance annulée'],
    ['approve', 'APPROVED', 1, 1, 'Relance approuvée'],
    ['approve', 'SUPERSEDED', 1, 1, 'Relance devenue obsolète'],
    [
      'approve',
      'PROPOSED',
      1,
      2,
      'Contenu actualisé, nouvelle approbation requise',
    ],
  ] as const)(
    'describes the %s result %s without claiming the wrong outcome',
    (action, resultStatus, previousVersion, resultVersion, expected) => {
      expect(
        getReminderMutationMessage({
          action,
          resultStatus,
          previousVersion,
          resultVersion,
        }),
      ).toBe(expected);
    },
  );
});
