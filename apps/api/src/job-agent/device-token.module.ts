import { Global, Module } from '@nestjs/common';

import { UsersModule } from '../users/users.module';
import { DeviceTokenService } from './device-token.service';

/** Global so ApiKeyOrJwtGuard can resolve `dja_…` without Auth↔JobAgent cycles. */
@Global()
@Module({
  imports: [UsersModule],
  providers: [DeviceTokenService],
  exports: [DeviceTokenService],
})
export class DeviceTokenModule {}
