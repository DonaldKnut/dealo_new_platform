import { Module } from '@nestjs/common';

import { AiModule } from '../ai/ai.module';
import { AtsModule } from '../ats/ats.module';
import { DeviceTokenModule } from './device-token.module';
import { JobAgentController } from './job-agent.controller';
import { JobAgentService } from './job-agent.service';

@Module({
  imports: [AiModule, AtsModule, DeviceTokenModule],
  controllers: [JobAgentController],
  providers: [JobAgentService],
  exports: [JobAgentService],
})
export class JobAgentModule {}
