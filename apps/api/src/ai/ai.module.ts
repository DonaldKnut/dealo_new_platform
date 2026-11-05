import { Module } from '@nestjs/common';

import { OpsModule } from '../ops/ops.module';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { GeminiClient } from './gemini.client';

@Module({
  imports: [OpsModule],
  controllers: [AiController],
  providers: [AiService, GeminiClient],
  exports: [AiService],
})
export class AiModule {}
