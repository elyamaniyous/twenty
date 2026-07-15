import { type ExecutionContext, UnauthorizedException } from '@nestjs/common';

import { ErpMarocActivatedUserGuard } from './erp-maroc-activated-user.guard';

const validRequest = {
  user: { id: 'user-1', email: 'commercial@example.com' },
  userWorkspaceId: 'user-workspace-1',
  workspaceMemberId: 'member-1',
  workspaceMember: { id: 'member-1' },
};

const contextFor = (request: Record<string, unknown>) =>
  ({
    getType: () => 'http',
    switchToHttp: () => ({ getRequest: () => request }),
  }) as unknown as ExecutionContext;

describe('ErpMarocActivatedUserGuard', () => {
  const guard = new ErpMarocActivatedUserGuard();

  it('accepts a fully activated Twenty user context', () => {
    expect(guard.canActivate(contextFor(validRequest))).toBe(true);
  });

  it.each(['user', 'userWorkspaceId', 'workspaceMemberId', 'workspaceMember'])(
    'rejects when %s is missing',
    (field) => {
      const request = { ...validRequest } as Record<string, unknown>;
      delete request[field];

      expect(() => guard.canActivate(contextFor(request))).toThrow(
        UnauthorizedException,
      );
    },
  );

  it('does not trust browser identity headers', () => {
    expect(() =>
      guard.canActivate(
        contextFor({
          headers: {
            'x-twenty-user-id': 'forged',
            'x-twenty-workspace-id': 'forged',
          },
        }),
      ),
    ).toThrow(UnauthorizedException);
  });
});
