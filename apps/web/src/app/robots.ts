import type { MetadataRoute } from 'next';

import { APP_URL } from '@/lib/seo';

const PRIVATE = [
  '/dashboard',
  '/api',
  '/auth/',
  '/offline',
  '/book/',
  '/offer/',
  '/ats/invite/',
  '/resume-builder/new',
  '/resume-builder/cover-letter',
  '/*?job=',
  '/*?apply=',
];

export default function robots(): MetadataRoute.Robots {
  const isProduction = APP_URL.startsWith('https://') && !process.env.VERCEL_ENV?.match(/preview|development/);
  return {
    // Preview deployments copy the whole site; keep them out of the index.
    rules: isProduction ? [{ userAgent: '*', allow: '/', disallow: PRIVATE }] : [{ userAgent: '*', disallow: '/' }],
    sitemap: `${APP_URL}/sitemap.xml`,
    host: APP_URL,
  };
}
