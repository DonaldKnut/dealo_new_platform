import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { talentProfileSchema, type TalentProfileInput } from '@dealo/shared';
import { UserRole } from '@prisma/client';
import type { Response } from 'express';
import { memoryStorage } from 'multer';

import type { AuthUser } from '../auth/auth.types';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/current-user.decorator';
import { Roles } from '../common/roles.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { TalentService } from './talent.service';

const STAFF = [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.RECRUITER, UserRole.OPERATIONS] as const;

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

  @Patch('me/profile')
  @ApiOperation({ summary: 'Professional: save your profile' })
  updateProfile(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(talentProfileSchema)) body: TalentProfileInput,
  ) {
    return this.talentService.updateProfile(user, body);
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

@ApiTags('talent')
@Controller()
@UseGuards(JwtAuthGuard)
@ApiCookieAuth()
export class TalentFilesController {
  constructor(private readonly talentService: TalentService) {}

  @Get('files/candidate-documents/:id')
  @Roles(UserRole.TALENT, ...STAFF)
  @ApiOperation({ summary: 'Download a stored CV or document (owner or Dealo staff)' })
  async file(@CurrentUser() user: AuthUser, @Param('id') id: string, @Res() res: Response) {
    const file = await this.talentService.readStoredFile(user, id);
    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Length', String(file.data.length));
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(file.fileName)}"`);
    res.setHeader('Cache-Control', 'private, max-age=300');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.end(file.data);
  }

  @Get('talent-admin/profiles')
  @Roles(...STAFF)
  @ApiOperation({ summary: 'Staff: professionals who signed up, with profile and CV' })
  listProfiles(
    @Query('search') search?: string,
    @Query('roleFamily') roleFamily?: string,
    @Query('hasCv') hasCv?: string,
    @Query('openToWork') openToWork?: string,
  ) {
    return this.talentService.listProfiles({ search, roleFamily, hasCv, openToWork });
  }

  @Get('talent-admin/profiles/:id')
  @Roles(...STAFF)
  @ApiOperation({ summary: 'Staff: one professional profile with all documents' })
  getProfile(@Param('id') id: string) {
    return this.talentService.getProfile(id);
  }
}
