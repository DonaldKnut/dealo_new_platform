import { Module } from '@nestjs/common';

import { CandidatesModule } from '../candidates/candidates.module';
import { CloudinaryService } from './cloudinary.service';
import { TalentController, TalentFilesController } from './talent.controller';
import { TalentService } from './talent.service';

@Module({
  imports: [CandidatesModule],
  controllers: [TalentController, TalentFilesController],
  providers: [TalentService, CloudinaryService],
  exports: [TalentService],
})
export class TalentModule {}
