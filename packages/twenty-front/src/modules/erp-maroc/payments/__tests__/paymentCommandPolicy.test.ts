import type { ErpContext } from 'twenty-shared/erp-maroc';

import { getPaymentCommandPolicy } from '../paymentCommandPolicy';

type PolicyInput = Parameters<typeof getPaymentCommandPolicy>[0];
type PaymentCapabilities = Pick<
  ErpContext['capabilities'],
  | 'createPendingPayment'
  | 'postPayment'
  | 'terminateOwnPendingPayment'
  | 'terminateAnyPayment'
>;

const accountingRoles = ['OWNER', 'ADMIN', 'COMPTABLE'] as const;
const linkedRoles = [...accountingRoles, 'COMMERCIAL'] as const;

const paymentCapabilities = (
  overrides: Partial<PaymentCapabilities> = {},
): PaymentCapabilities => ({
  createPendingPayment: false,
  postPayment: false,
  terminateOwnPendingPayment: false,
  terminateAnyPayment: false,
  ...overrides,
});

const baseInput: PolicyInput = {
  role: 'COMMERCIAL',
  capabilities: paymentCapabilities(),
  kind: 'RECEIPT',
  status: 'PENDING_ALLOCATION',
  isOwnPayment: true,
};

const expectPolicy = (
  input: PolicyInput,
  expected: {
    create: boolean;
    allocate: boolean;
    terminate: boolean;
    viewDetail: boolean;
  },
) => {
  expect(getPaymentCommandPolicy(input)).toEqual(expected);
};

describe('getPaymentCommandPolicy', () => {
  it('exposes only the four payment commands for a commercial own pending receipt', () => {
    expectPolicy(
      {
        ...baseInput,
        capabilities: paymentCapabilities({
          createPendingPayment: true,
          postPayment: true,
          terminateOwnPendingPayment: true,
          terminateAnyPayment: true,
        }),
      },
      {
        create: true,
        allocate: false,
        terminate: true,
        viewDetail: true,
      },
    );
  });

  it.each(linkedRoles)(
    'allows %s to create a pending receipt only with createPendingPayment',
    (role) => {
      expectPolicy(
        {
          ...baseInput,
          role,
          capabilities: paymentCapabilities(),
        },
        {
          create: false,
          allocate: false,
          terminate: false,
          viewDetail: true,
        },
      );
      expectPolicy(
        {
          ...baseInput,
          role,
          capabilities: paymentCapabilities({ createPendingPayment: true }),
        },
        {
          create: true,
          allocate: false,
          terminate: false,
          viewDetail: true,
        },
      );
    },
  );

  it.each(accountingRoles)(
    'allows %s to allocate only with postPayment',
    (role) => {
      expectPolicy(
        {
          ...baseInput,
          role,
          capabilities: paymentCapabilities({ postPayment: true }),
        },
        {
          create: false,
          allocate: true,
          terminate: false,
          viewDetail: true,
        },
      );
      expectPolicy(
        {
          ...baseInput,
          role,
          capabilities: paymentCapabilities(),
        },
        {
          create: false,
          allocate: false,
          terminate: false,
          viewDetail: true,
        },
      );
    },
  );

  it('never lets COMMERCIAL allocate, even when postPayment is present', () => {
    expectPolicy(
      {
        ...baseInput,
        capabilities: paymentCapabilities({ postPayment: true }),
      },
      {
        create: false,
        allocate: false,
        terminate: false,
        viewDetail: true,
      },
    );
  });

  it('limits COMMERCIAL termination to their own pending receipt with its dedicated capability', () => {
    const commercialTerminationInput: PolicyInput = {
      ...baseInput,
      capabilities: paymentCapabilities({
        terminateOwnPendingPayment: true,
        terminateAnyPayment: true,
      }),
    };

    expectPolicy(commercialTerminationInput, {
      create: false,
      allocate: false,
      terminate: true,
      viewDetail: true,
    });
    expectPolicy(
      {
        ...commercialTerminationInput,
        capabilities: paymentCapabilities({ terminateAnyPayment: true }),
      },
      {
        create: false,
        allocate: false,
        terminate: false,
        viewDetail: true,
      },
    );
    expectPolicy(
      { ...commercialTerminationInput, isOwnPayment: false },
      {
        create: false,
        allocate: false,
        terminate: false,
        viewDetail: true,
      },
    );
  });

  it.each(['POSTED', 'REVERSED', 'CANCELLED'] as const)(
    'does not let COMMERCIAL terminate a %s receipt',
    (status) => {
      expectPolicy(
        {
          ...baseInput,
          status,
          capabilities: paymentCapabilities({
            terminateOwnPendingPayment: true,
            terminateAnyPayment: true,
          }),
        },
        {
          create: false,
          allocate: false,
          terminate: false,
          viewDetail: true,
        },
      );
    },
  );

  it.each(accountingRoles)(
    'lets %s terminate their own pending receipt with terminateOwnPendingPayment',
    (role) => {
      expectPolicy(
        {
          ...baseInput,
          role,
          capabilities: paymentCapabilities({
            terminateOwnPendingPayment: true,
          }),
        },
        {
          create: false,
          allocate: false,
          terminate: true,
          viewDetail: true,
        },
      );
      expectPolicy(
        {
          ...baseInput,
          role,
          isOwnPayment: false,
          capabilities: paymentCapabilities({
            terminateOwnPendingPayment: true,
          }),
        },
        {
          create: false,
          allocate: false,
          terminate: false,
          viewDetail: true,
        },
      );
    },
  );

  it.each(accountingRoles)(
    'lets %s terminate any pending or posted receipt only with terminateAnyPayment',
    (role) => {
      for (const input of [
        { isOwnPayment: false, status: 'PENDING_ALLOCATION' as const },
        { isOwnPayment: true, status: 'POSTED' as const },
      ]) {
        expectPolicy(
          {
            ...baseInput,
            ...input,
            role,
            capabilities: paymentCapabilities({ terminateAnyPayment: true }),
          },
          {
            create: false,
            allocate: false,
            terminate: true,
            viewDetail: true,
          },
        );
      }
    },
  );

  it.each(accountingRoles)(
    'never lets %s terminate a reversal, reversed receipt, or cancelled receipt',
    (role) => {
      for (const input of [
        { kind: 'REVERSAL' as const, status: 'POSTED' as const },
        { kind: 'RECEIPT' as const, status: 'REVERSED' as const },
        { kind: 'RECEIPT' as const, status: 'CANCELLED' as const },
      ]) {
        expectPolicy(
          {
            ...baseInput,
            ...input,
            role,
            capabilities: paymentCapabilities({
              terminateOwnPendingPayment: true,
              terminateAnyPayment: true,
            }),
          },
          {
            create: false,
            allocate: false,
            terminate: false,
            viewDetail: true,
          },
        );
      }
    },
  );
});
