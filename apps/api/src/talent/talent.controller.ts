import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  Body,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { memoryStorage } from 'multer';

import type { AuthUser } from '../auth/auth.types';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/current-user.decorator';
import { Roles } from '../common/roles.decorator';
import { TalentService } from './talent.service';

@ApiTags('talent')
@Controller('talent')
@UseGuards(JwtAuthGuard)
@ApiCookieAuth()
@Roles(UserRole.TALENT)
export class TalentController {
  constructor(private readonly talentService: TalentService) {}

  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return this.talentService.me(user);
  }

  @Get('matches')
  matches(@CurrentUser() user: AuthUser) {
    return this.talentService.matches(user);
  }

  @Get('documents')
  listDocuments(@CurrentUser() user: AuthUser) {
    return this.talentService.listDocuments(user);
  }

  @Post('documents')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 8 * 1024 * 1024 },
    }),
  )
  uploadDocument(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file: Express.Multer.File,
    @Body('kind') kind?: string,
  ) {
    return this.talentService.uploadDocument(user, file, kind);
  }

  @Delete('documents/:id')
  deleteDocument(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.talentService.deleteDocument(user, id);
  }
}
