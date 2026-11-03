import { Module } from '@nestjs/common';

import { CandidatesModule } from '../candidates/candidates.module';
import { CloudinaryService } from './cloudinary.service';
import { TalentController } from './talent.controller';
import { TalentService } from './talent.service';

@Module({
  imports: [CandidatesModule],
  controllers: [TalentController],
  providers: [TalentService, CloudinaryService],
  exports: [TalentService],
})
export class TalentModule {}
