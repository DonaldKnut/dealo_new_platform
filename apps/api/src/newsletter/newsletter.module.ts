import { Module } from '@nestjs/common';

import { EmailPreferencesService } from './email-preferences.service';
import { NewsletterController } from './newsletter.controller';
import { NewsletterService } from './newsletter.service';

@Module({
  controllers: [NewsletterController],
  providers: [NewsletterService, EmailPreferencesService],
  exports: [NewsletterService, EmailPreferencesService],
})
export class NewsletterModule {}
