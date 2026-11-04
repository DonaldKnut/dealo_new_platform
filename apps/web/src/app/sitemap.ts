import type { MetadataRoute } from 'next';

import { fetchPublishedPosts } from '@/lib/blog-public';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

const STATIC_PATHS = [
  '/',
  '/about',
  '/services',
  '/services/direct-recruitment',
  '/services/managed-staffing',
  '/how-it-works',
  '/for-employers',
  '/for-professionals',
  '/developers',
  '/ats',
  '/faq',
  '/hire',
  '/contact',
  '/blog',
  '/auth/login',
  '/auth/register',
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await fetchPublishedPosts();
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = STATIC_PATHS.map((path) => ({
    url: `${APP_URL}${path}`,
    lastModified: now,
    changeFrequency: path === '/' || path === '/blog' ? 'weekly' : 'monthly',
    priority:
      path === '/'
        ? 1
        : ['/hire', '/blog', '/services', '/for-employers'].includes(path)
          ? 0.9
          : path.startsWith('/auth')
            ? 0.3
            : 0.7,
  }));

  const blogEntries: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `${APP_URL}/blog/${post.slug}`,
    lastModified: post.updatedAt ? new Date(post.updatedAt) : now,
    changeFrequency: 'monthly',
    priority: 0.8,
  }));

  return [...staticEntries, ...blogEntries];
}
