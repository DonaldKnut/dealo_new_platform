import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { blogPostInputSchema, type BlogPostInput } from '@dealo/shared';

import type { AuthUser } from '../auth/auth.types';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/current-user.decorator';
import { Public } from '../common/public.decorator';
import { Roles } from '../common/roles.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { BlogService } from './blog.service';

const STAFF = [
  UserRole.SUPER_ADMIN,
  UserRole.ADMIN,
  UserRole.RECRUITER,
  UserRole.OPERATIONS,
] as const;

@ApiTags('blog')
@Controller('blog')
@UseGuards(JwtAuthGuard)
export class BlogController {
  constructor(private readonly blogService: BlogService) {}

  @Public()
  @Get()
  listPublic() {
    return this.blogService.listPublic();
  }

  @Public()
  @Get('by-slug/:slug')
  getBySlug(@Param('slug') slug: string) {
    return this.blogService.getBySlugPublic(slug);
  }

  @Get('admin')
  @ApiCookieAuth()
  @Roles(...STAFF)
  listAdmin() {
    return this.blogService.listAdmin();
  }

  @Get('admin/:id')
  @ApiCookieAuth()
  @Roles(...STAFF)
  getAdmin(@Param('id') id: string) {
    return this.blogService.getAdmin(id);
  }

  @Post('admin')
  @ApiCookieAuth()
  @Roles(...STAFF)
  create(
    @Body(new ZodValidationPipe(blogPostInputSchema)) body: BlogPostInput,
    @CurrentUser() user: AuthUser,
  ) {
    return this.blogService.create(body, user.id);
  }

  @Patch('admin/:id')
  @ApiCookieAuth()
  @Roles(...STAFF)
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(blogPostInputSchema)) body: BlogPostInput,
    @CurrentUser() user: AuthUser,
  ) {
    return this.blogService.update(id, body, user.id);
  }

  @Delete('admin/:id')
  @ApiCookieAuth()
  @Roles(...STAFF)
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.blogService.remove(id, user.id);
  }
}
