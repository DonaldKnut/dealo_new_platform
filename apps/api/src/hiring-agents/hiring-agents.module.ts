import { Module } from '@nestjs/common';

import { AiModule } from '../ai/ai.module';
import { AtsModule } from '../ats/ats.module';
import { AgentBrainsService } from './agent-brains';
import { HiringAgentsController } from './hiring-agents.controller';
import { HiringAgentsService } from './hiring-agents.service';

@Module({
  imports: [AtsModule, AiModule],
  controllers: [HiringAgentsController],
  providers: [HiringAgentsService, AgentBrainsService],
})
export class HiringAgentsModule {}
