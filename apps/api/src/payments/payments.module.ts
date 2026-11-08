import { Global, Module } from '@nestjs/common';

import { PaymentRouterService } from './payment-router.service';
import { PaymentsController } from './payments.controller';
import { PaystackClient } from './paystack.client';

@Global()
@Module({
  controllers: [PaymentsController],
  providers: [PaystackClient, PaymentRouterService],
  exports: [PaystackClient, PaymentRouterService],
})
export class PaymentsModule {}
