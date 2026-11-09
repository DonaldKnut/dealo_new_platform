import {
  BadRequestException,
  Controller,
  Delete,
  HttpCode,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { randomBytes } from 'crypto';
import { memoryStorage } from 'multer';

import type { AuthUser } from '../auth/auth.types';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/current-user.decorator';
import { verifiedMime } from '../common/file-signature';
import { PrismaService } from '../prisma/prisma.service';
import { CloudinaryService } from '../talent/cloudinary.service';

const AVATAR_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);
const MAX_BYTES = 3 * 1024 * 1024;

@ApiTags('users')
@ApiCookieAuth()
@Controller('users/me')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  @Post('avatar')
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload your profile photo (PNG, JPG or WebP, up to 3 MB)' })
  @UseInterceptors(
    FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: MAX_BYTES } }),
  )
  async uploadAvatar(
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() user: AuthUser,
  ) {
    if (!file?.buffer?.length) throw new BadRequestException('Choose a photo to upload');
    const mime = verifiedMime(file.buffer, AVATAR_TYPES);
    if (!mime) throw new BadRequestException('Use a PNG, JPG or WebP photo');
    const result = await this.cloudinary.uploadBuffer(file.buffer, {
      folder: 'dealo/avatars',
      filename: `${user.id}-${randomBytes(4).toString('hex')}`,
      mimeType: mime,
    });
    // A square crop centred on the face keeps every avatar circle looking right.
    const avatarUrl = result.secure_url.replace(
      '/upload/',
      '/upload/c_fill,g_face,w_256,h_256,q_auto,f_auto/',
    );
    await this.prisma.user.update({ where: { id: user.id }, data: { avatarUrl } });
    return { avatarUrl };
  }

  @Delete('avatar')
  @HttpCode(200)
  @ApiOperation({ summary: 'Remove your profile photo' })
  async removeAvatar(@CurrentUser() user: AuthUser) {
    await this.prisma.user.update({ where: { id: user.id }, data: { avatarUrl: null } });
    return { avatarUrl: null };
  }
}
