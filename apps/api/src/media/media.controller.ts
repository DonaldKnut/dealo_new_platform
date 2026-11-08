import { BadRequestException, Controller, HttpCode, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { UserRole } from '@prisma/client';
import { randomBytes } from 'crypto';
import { memoryStorage } from 'multer';

import type { AuthUser } from '../auth/auth.types';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/current-user.decorator';
import { verifiedMime } from '../common/file-signature';
import { Roles } from '../common/roles.decorator';
import { CloudinaryService } from '../talent/cloudinary.service';

const IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);
const MAX_BYTES = 5 * 1024 * 1024;

@ApiTags('media')
@ApiCookieAuth()
@Controller('media')
@UseGuards(JwtAuthGuard)
export class MediaController {
  constructor(private readonly cloudinary: CloudinaryService) {}

  /** Pictures placed inside newsletters, staff emails and blog posts. Returns a public HTTPS link. */
  @Post('images')
  @HttpCode(200)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.RECRUITER, UserRole.OPERATIONS)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload an image for emails and blog posts (PNG, JPG, WebP or GIF, up to 5 MB)' })
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: MAX_BYTES } }))
  async uploadImage(@UploadedFile() file: Express.Multer.File | undefined, @CurrentUser() user: AuthUser) {
    if (!file?.buffer?.length) throw new BadRequestException('Choose an image to upload');
    const mime = verifiedMime(file.buffer, IMAGE_TYPES);
    if (!mime) throw new BadRequestException('Use a PNG, JPG, WebP or GIF image');
    const result = await this.cloudinary.uploadBuffer(file.buffer, {
      folder: 'dealo/content',
      filename: `${user.id.slice(-6)}-${randomBytes(6).toString('hex')}`,
      mimeType: mime,
    });
    return { url: result.secure_url, width: result.width, height: result.height };
  }
}
