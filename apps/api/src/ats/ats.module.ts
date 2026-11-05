import { Module } from '@nestjs/common';

import { AiModule } from '../ai/ai.module';
import { WebhooksModule } from '../webhooks/webhooks.module';
import { ApplicationsService } from './applications.service';
import { AtsAccessService } from './ats-access.service';
import { AtsController, CareersController } from './ats.controller';
import { JobsService } from './jobs.service';
import { WorkspacesService } from './workspaces.service';

@Module({
  imports: [AiModule, WebhooksModule],
  controllers: [AtsController, CareersController],
  providers: [AtsAccessService, WorkspacesService, JobsService, ApplicationsService],
  exports: [AtsAccessService, ApplicationsService],
})
export class AtsModule {}
