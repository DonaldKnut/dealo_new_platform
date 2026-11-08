import { Module } from '@nestjs/common';

import { CloudinaryService } from '../talent/cloudinary.service';
import { MediaController } from './media.controller';

@Module({
  controllers: [MediaController],
  providers: [CloudinaryService],
})
export class MediaModule {}
