import {
  type MiddlewareConsumer,
  Module,
  type NestModule,
  RequestMethod,
} from '@nestjs/common';

import { TokenModule } from 'src/engine/core-modules/auth/token/token.module';
import { TwentyConfigModule } from 'src/engine/core-modules/twenty-config/twenty-config.module';
import { JwtAuthGuard } from 'src/engine/guards/jwt-auth.guard';
import { RequireAccessTokenGuard } from 'src/engine/guards/require-access-token.guard';
import { WorkspaceAuthGuard } from 'src/engine/guards/workspace-auth.guard';
import { WorkspaceCacheStorageModule } from 'src/engine/workspace-cache-storage/workspace-cache-storage.module';

import { ErpMarocActivatedUserGuard } from './erp-maroc-activated-user.guard';
import { ErpMarocAuthFilter } from './erp-maroc-auth.filter';
import { ErpMarocController } from './erp-maroc.controller';
import { ErpMarocEnabledMiddleware } from './erp-maroc-enabled.middleware';
import { ErpMarocProxyService } from './erp-maroc-proxy.service';

@Module({
  imports: [TokenModule, TwentyConfigModule, WorkspaceCacheStorageModule],
  controllers: [ErpMarocController],
  providers: [
    ErpMarocProxyService,
    ErpMarocEnabledMiddleware,
    ErpMarocAuthFilter,
    ErpMarocActivatedUserGuard,
    JwtAuthGuard,
    RequireAccessTokenGuard,
    WorkspaceAuthGuard,
  ],
})
export class ErpMarocModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(ErpMarocEnabledMiddleware).forRoutes({
      path: 'erp-maroc-api/*path',
      method: RequestMethod.ALL,
    });
  }
}
