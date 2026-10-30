import { Module } from '@nestjs/common';

import { HireInquiryController } from './hire-inquiry.controller';
import { HireInquiryService } from './hire-inquiry.service';

@Module({
  controllers: [HireInquiryController],
  providers: [HireInquiryService],
})
export class HireInquiryModule {}
