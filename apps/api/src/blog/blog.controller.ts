import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { ApiScope, blogPostInputSchema, type BlogPostInput } from '@dealo/shared';

import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../common/current-user.decorator';
import { Public } from '../common/public.decorator';
import { RequireScopes } from '../common/scopes.decorator';
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
export class BlogController {
  constructor(private readonly blogService: BlogService) {}

  @Public()
  @Get()
  @ApiBearerAuth('api_key')
  @ApiOperation({
    summary: 'List published blog posts',
    description: 'Public. Partners may authenticate with blog:read for metered access later.',
  })
  @RequireScopes(ApiScope.BLOG_READ)
  listPublic() {
    return this.blogService.listPublic();
  }

  @Public()
  @Get('by-slug/:slug')
  @ApiBearerAuth('api_key')
  @RequireScopes(ApiScope.BLOG_READ)
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
