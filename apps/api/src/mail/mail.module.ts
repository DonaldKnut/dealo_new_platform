import { Module } from '@nestjs/common';

import { CommonModule } from '../common/common.module';
import { EmailModule } from '../email/email.module';
import { MailController } from './mail.controller';
import { MailService } from './mail.service';

@Module({
  imports: [CommonModule, EmailModule],
  controllers: [MailController],
  providers: [MailService],
})
export class MailModule {}
