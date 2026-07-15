import type { ErpReminder } from 'twenty-shared/erp-maroc';

type ReminderCommandPolicyInput = Pick<
  ErpReminder,
  'status' | 'nextAttemptAt'
> & {
  canManageReminders: boolean;
  reminderDelivery: boolean;
};

export const getReminderCommandPolicy = ({
  status,
  nextAttemptAt,
  canManageReminders,
  reminderDelivery,
}: ReminderCommandPolicyInput) => {
  const canCancelStatus =
    status === 'PROPOSED' ||
    status === 'APPROVED' ||
    (status === 'FAILED' && nextAttemptAt !== null);

  return {
    canApprove: canManageReminders && reminderDelivery && status === 'PROPOSED',
    canCancel: canManageReminders && canCancelStatus,
  };
};

type ReminderMutationMessageInput = {
  action: 'approve' | 'cancel';
  resultStatus: ErpReminder['status'];
  previousVersion: number;
  resultVersion: number;
};

export const getReminderMutationMessage = ({
  action,
  resultStatus,
  previousVersion,
  resultVersion,
}: ReminderMutationMessageInput) => {
  if (action === 'cancel') return 'Relance annulée';
  if (resultStatus === 'SUPERSEDED') return 'Relance devenue obsolète';
  if (resultStatus === 'PROPOSED') {
    return resultVersion > previousVersion
      ? 'Contenu actualisé, nouvelle approbation requise'
      : 'Relance toujours en attente d’approbation';
  }

  return 'Relance approuvée';
};
