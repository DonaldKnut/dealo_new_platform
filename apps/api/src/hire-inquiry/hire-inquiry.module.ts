import { Module } from '@nestjs/common';

import { WebhooksModule } from '../webhooks/webhooks.module';
import { HireInquiryController } from './hire-inquiry.controller';
import { HireInquiryService } from './hire-inquiry.service';

@Module({
  imports: [WebhooksModule],
  controllers: [HireInquiryController],
  providers: [HireInquiryService],
})
export class HireInquiryModule {}
