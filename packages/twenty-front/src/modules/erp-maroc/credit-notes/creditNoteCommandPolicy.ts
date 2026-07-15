import type { ErpContext, ErpCreditNote } from 'twenty-shared/erp-maroc';

export type CreditNoteCommandPolicyInput = {
  role: ErpContext['role'];
  capabilities: Pick<
    ErpContext['capabilities'],
    'manageCreditNotes' | 'allocateCustomerCredit'
  >;
  status: ErpCreditNote['status'];
  lineCount: number;
  availableCreditCents: number;
};

export type CreditNoteCommandPolicy = {
  create: boolean;
  editDraft: boolean;
  validate: boolean;
  allocate: boolean;
  cancelDraft: boolean;
};

const accountingRoles: ReadonlySet<ErpContext['role']> = new Set([
  'OWNER',
  'ADMIN',
  'COMPTABLE',
]);

const hasPositiveSafeInteger = (value: number): boolean =>
  Number.isSafeInteger(value) && value > 0;

export const getCreditNoteCommandPolicy = ({
  role,
  capabilities,
  status,
  lineCount,
  availableCreditCents,
}: CreditNoteCommandPolicyInput): CreditNoteCommandPolicy => {
  const hasAccountingRole = accountingRoles.has(role);
  const canManageCreditNotes =
    hasAccountingRole && capabilities.manageCreditNotes;
  const isDraft = status === 'DRAFT';

  return {
    create: canManageCreditNotes,
    editDraft: canManageCreditNotes && isDraft,
    validate:
      canManageCreditNotes && isDraft && hasPositiveSafeInteger(lineCount),
    allocate:
      hasAccountingRole &&
      capabilities.allocateCustomerCredit &&
      status === 'VALIDATED' &&
      hasPositiveSafeInteger(availableCreditCents),
    cancelDraft: canManageCreditNotes && isDraft,
  };
};
