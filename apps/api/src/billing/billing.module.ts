import { Module } from '@nestjs/common';

import { ApiKeysModule } from '../api-keys/api-keys.module';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';

@Module({
  imports: [ApiKeysModule],
  controllers: [BillingController],
  providers: [BillingService],
})
export class BillingModule {}
