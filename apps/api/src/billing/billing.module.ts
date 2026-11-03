import { Module } from '@nestjs/common';

import { ApiKeysModule } from '../api-keys/api-keys.module';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { PaystackClient } from './paystack.client';

@Module({
  imports: [ApiKeysModule],
  controllers: [BillingController],
  providers: [BillingService, PaystackClient],
})
export class BillingModule {}
