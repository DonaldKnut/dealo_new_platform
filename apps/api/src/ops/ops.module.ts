import { Module } from '@nestjs/common';

import { CandidatesModule } from '../candidates/candidates.module';
import { OpsController } from './ops.controller';
import { OpsService } from './ops.service';

@Module({
  imports: [CandidatesModule],
  controllers: [OpsController],
  providers: [OpsService],
})
export class OpsModule {}
