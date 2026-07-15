import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { getRequest } from 'src/utils/extract-request';

@Injectable()
export class ErpMarocActivatedUserGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = getRequest(context);

    if (
      request?.user === undefined ||
      request.userWorkspaceId === undefined ||
      request.workspaceMemberId === undefined ||
      request.workspaceMember === undefined
    ) {
      throw new UnauthorizedException('Invalid ERP Maroc session');
    }

    return true;
  }
}
