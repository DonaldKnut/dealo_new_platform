import { Module } from '@nestjs/common';

import { AiModule } from '../ai/ai.module';
import { WebhooksModule } from '../webhooks/webhooks.module';
import { ApplicationsService } from './applications.service';
import { AtsAccessService } from './ats-access.service';
import { AtsController, CandidateLinksController, CareersController } from './ats.controller';
import { HiringService } from './hiring.service';
import { JobsService } from './jobs.service';
import { WorkspacesService } from './workspaces.service';

@Module({
  imports: [AiModule, WebhooksModule],
  controllers: [AtsController, CareersController, CandidateLinksController],
  providers: [AtsAccessService, WorkspacesService, JobsService, ApplicationsService, HiringService],
  exports: [AtsAccessService, ApplicationsService],
})
export class AtsModule {}
