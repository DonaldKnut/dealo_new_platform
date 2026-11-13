import { Module } from '@nestjs/common';

import { AiModule } from '../ai/ai.module';
import { AtsModule } from '../ats/ats.module';
import { JobAgentController } from './job-agent.controller';
import { JobAgentService } from './job-agent.service';

@Module({
  imports: [AiModule, AtsModule],
  controllers: [JobAgentController],
  providers: [JobAgentService],
})
export class JobAgentModule {}
