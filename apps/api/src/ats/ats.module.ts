import { Module } from '@nestjs/common';

import { AiModule } from '../ai/ai.module';
import { ApiKeysModule } from '../api-keys/api-keys.module';
import { OpsModule } from '../ops/ops.module';
import { WebhooksModule } from '../webhooks/webhooks.module';
import { ApplicationsService } from './applications.service';
import { AtsAccessService } from './ats-access.service';
import { AtsEventsService } from './ats-events.service';
import { AtsToolsService } from './ats-tools.service';
import { AtsApiController, AtsController, CandidateLinksController, CareersController } from './ats.controller';
import { HiringService } from './hiring.service';
import { JobsService } from './jobs.service';
import { WorkspacesService } from './workspaces.service';

@Module({
  imports: [AiModule, WebhooksModule, OpsModule, ApiKeysModule],
  controllers: [AtsController, AtsApiController, CareersController, CandidateLinksController],
  providers: [AtsAccessService, AtsEventsService, WorkspacesService, JobsService, ApplicationsService, HiringService, AtsToolsService],
  exports: [AtsAccessService, AtsEventsService, ApplicationsService, HiringService, JobsService, AtsToolsService],
})
export class AtsModule {}
