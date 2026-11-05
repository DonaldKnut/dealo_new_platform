import { Module } from '@nestjs/common';

import { AiModule } from '../ai/ai.module';
import { CandidatesModule } from '../candidates/candidates.module';
import { ResumeAiService } from './resume-ai.service';
import { ResumesController } from './resumes.controller';
import { ResumesService } from './resumes.service';

@Module({
  imports: [AiModule, CandidatesModule],
  controllers: [ResumesController],
  providers: [ResumesService, ResumeAiService],
})
export class ResumesModule {}
