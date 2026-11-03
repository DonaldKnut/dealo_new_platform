import { Module } from '@nestjs/common';

import { CommonModule } from '../common/common.module';
import { EmailModule } from '../email/email.module';
import { SupportController } from './support.controller';
import { SupportService } from './support.service';

@Module({
  imports: [CommonModule, EmailModule],
  controllers: [SupportController],
  providers: [SupportService],
  exports: [SupportService],
})
export class SupportModule {}
