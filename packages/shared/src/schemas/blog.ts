import { z } from 'zod';

export const blogPostStatusSchema = z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']);

export const blogPostInputSchema = z.object({
  title: z.string().trim().min(3).max(200),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(200)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase kebab-case'),
  excerpt: z.string().trim().min(10).max(500),
  content: z.string().trim().min(20).max(50_000),
  coverImage: z.string().url().optional().or(z.literal('')),
  seoTitle: z.string().trim().max(200).optional().or(z.literal('')),
  seoDescription: z.string().trim().max(320).optional().or(z.literal('')),
  status: blogPostStatusSchema.default('DRAFT'),
});

export type BlogPostInput = z.infer<typeof blogPostInputSchema>;
