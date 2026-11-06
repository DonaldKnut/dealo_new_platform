import { Module } from '@nestjs/common';

import { JobBoardController } from './job-board.controller';
import { JobBoardService } from './job-board.service';
import { JobFeedsService } from './job-feeds.service';

@Module({
  controllers: [JobBoardController],
  providers: [JobBoardService, JobFeedsService],
})
export class JobBoardModule {}
