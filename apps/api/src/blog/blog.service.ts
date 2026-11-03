import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BlogPostStatus } from '@prisma/client';
import type { BlogPostInput } from '@dealo/shared';

import { AuditLogService } from '../common/audit-log.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BlogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
  ) {}

  listPublic() {
    return this.prisma.blogPost.findMany({
      where: { status: BlogPostStatus.PUBLISHED },
      orderBy: { publishedAt: 'desc' },
      take: 100,
    });
  }

  async getBySlugPublic(slug: string) {
    const post = await this.prisma.blogPost.findFirst({
      where: { slug, status: BlogPostStatus.PUBLISHED },
    });
    if (!post) throw new NotFoundException('Post not found');
    return post;
  }

  listAdmin() {
    return this.prisma.blogPost.findMany({
      orderBy: { updatedAt: 'desc' },
      take: 200,
    });
  }

  async getAdmin(id: string) {
    const post = await this.prisma.blogPost.findUnique({ where: { id } });
    if (!post) throw new NotFoundException('Post not found');
    return post;
  }

  async create(input: BlogPostInput, authorId?: string) {
    await this.ensureUniqueSlug(input.slug);
    const published = input.status === 'PUBLISHED';
    const post = await this.prisma.blogPost.create({
      data: {
        title: input.title,
        slug: input.slug,
        excerpt: input.excerpt,
        content: input.content,
        coverImage: emptyToNull(input.coverImage),
        seoTitle: emptyToNull(input.seoTitle),
        seoDescription: emptyToNull(input.seoDescription),
        status: input.status,
        publishedAt: published ? new Date() : null,
        authorId,
      },
    });

    await this.auditLog.record({
      action: 'BLOG_POST_CREATED',
      entityType: 'BlogPost',
      entityId: post.id,
      actorId: authorId,
      metadata: { slug: post.slug, status: post.status },
    });

    return post;
  }

  async update(id: string, input: BlogPostInput, actorId?: string) {
    const existing = await this.getAdmin(id);
    if (existing.slug !== input.slug) {
      await this.ensureUniqueSlug(input.slug, id);
    }

    const becomingPublished =
      input.status === 'PUBLISHED' && existing.status !== BlogPostStatus.PUBLISHED;

    const post = await this.prisma.blogPost.update({
      where: { id },
      data: {
        title: input.title,
        slug: input.slug,
        excerpt: input.excerpt,
        content: input.content,
        coverImage: emptyToNull(input.coverImage),
        seoTitle: emptyToNull(input.seoTitle),
        seoDescription: emptyToNull(input.seoDescription),
        status: input.status,
        publishedAt: becomingPublished
          ? new Date()
          : input.status === 'PUBLISHED'
            ? existing.publishedAt ?? new Date()
            : null,
      },
    });

    await this.auditLog.record({
      action: 'BLOG_POST_UPDATED',
      entityType: 'BlogPost',
      entityId: post.id,
      actorId,
      metadata: { slug: post.slug, status: post.status },
    });

    return post;
  }

  async remove(id: string, actorId?: string) {
    await this.getAdmin(id);
    await this.prisma.blogPost.delete({ where: { id } });
    await this.auditLog.record({
      action: 'BLOG_POST_DELETED',
      entityType: 'BlogPost',
      entityId: id,
      actorId,
    });
    return { ok: true };
  }

  private async ensureUniqueSlug(slug: string, excludeId?: string) {
    const found = await this.prisma.blogPost.findUnique({ where: { slug } });
    if (found && found.id !== excludeId) {
      throw new ConflictException('A post with this slug already exists');
    }
  }
}

function emptyToNull(value?: string | null) {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}
