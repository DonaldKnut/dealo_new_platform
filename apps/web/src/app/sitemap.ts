import type { MetadataRoute } from 'next';

import { fetchPublishedPosts } from '@/lib/blog-public';
import { fetchCareersIndex } from '@/lib/careers-public';

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
  '/resume-builder',
  '/faq',
  '/hire',
  '/contact',
  '/blog',
  '/auth/login',
  '/auth/register',
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [posts, careers] = await Promise.all([fetchPublishedPosts(), fetchCareersIndex()]);
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = STATIC_PATHS.map((path) => ({
    url: `${APP_URL}${path}`,
    lastModified: now,
    changeFrequency: path === '/' || path === '/blog' ? 'weekly' : 'monthly',
    priority:
      path === '/'
        ? 1
        : ['/hire', '/blog', '/services', '/for-employers', '/resume-builder'].includes(path)
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

  const careerPages: MetadataRoute.Sitemap = [...new Set(careers.map((c) => c.orgSlug))].map((orgSlug) => ({
    url: `${APP_URL}/careers/${orgSlug}`,
    lastModified: now,
    changeFrequency: 'daily',
    priority: 0.6,
  }));
  const jobEntries: MetadataRoute.Sitemap = careers.map((c) => ({
    url: `${APP_URL}/careers/${c.orgSlug}/${c.jobSlug}`,
    lastModified: new Date(c.updatedAt),
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  return [...staticEntries, ...blogEntries, ...careerPages, ...jobEntries];
}
