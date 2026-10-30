import { Global, Module } from '@nestjs/common';

import { EmailService } from './email.service';
import { NodemailerEmailProvider } from './nodemailer.provider';
import { ResendEmailProvider } from './resend.provider';

@Global()
@Module({
  providers: [ResendEmailProvider, NodemailerEmailProvider, EmailService],
  exports: [EmailService],
})
export class EmailModule {}
