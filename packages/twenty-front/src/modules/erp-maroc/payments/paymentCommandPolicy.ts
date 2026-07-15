import type { ErpContext, ErpPayment } from 'twenty-shared/erp-maroc';

export type PaymentCommandPolicyInput = {
  role: ErpContext['role'];
  capabilities: Pick<
    ErpContext['capabilities'],
    | 'createPendingPayment'
    | 'postPayment'
    | 'terminateOwnPendingPayment'
    | 'terminateAnyPayment'
  >;
  kind: ErpPayment['kind'];
  status: ErpPayment['status'];
  isOwnPayment: boolean;
};

export type PaymentCommandPolicy = {
  create: boolean;
  allocate: boolean;
  terminate: boolean;
  viewDetail: boolean;
};

const linkedRoles: ReadonlySet<ErpContext['role']> = new Set([
  'OWNER',
  'ADMIN',
  'COMPTABLE',
  'COMMERCIAL',
]);

const accountingRoles: ReadonlySet<ErpContext['role']> = new Set([
  'OWNER',
  'ADMIN',
  'COMPTABLE',
]);

export const getPaymentCommandPolicy = ({
  role,
  capabilities,
  kind,
  status,
  isOwnPayment,
}: PaymentCommandPolicyInput): PaymentCommandPolicy => {
  const hasLinkedRole = linkedRoles.has(role);
  const hasAccountingRole = accountingRoles.has(role);
  const isPendingReceipt =
    kind === 'RECEIPT' && status === 'PENDING_ALLOCATION';
  const isTerminableReceipt =
    kind === 'RECEIPT' &&
    (status === 'PENDING_ALLOCATION' || status === 'POSTED');

  return {
    create: hasLinkedRole && capabilities.createPendingPayment,
    allocate: hasAccountingRole && capabilities.postPayment && isPendingReceipt,
    terminate:
      isTerminableReceipt &&
      ((isOwnPayment &&
        status === 'PENDING_ALLOCATION' &&
        hasLinkedRole &&
        capabilities.terminateOwnPendingPayment) ||
        (hasAccountingRole && capabilities.terminateAnyPayment)),
    viewDetail: true,
  };
};
