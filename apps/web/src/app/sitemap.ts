import type { MetadataRoute } from 'next';

import { fetchPublishedPosts } from '@/lib/blog-public';
import { fetchCareersIndex } from '@/lib/careers-public';
import { fetchSitemapJobIds } from '@/lib/jobs-public';
import { APP_URL } from '@/lib/seo';
import { JOB_CITY_HUBS, JOB_CITY_ROLE_PAIRS, JOB_ROLE_HUBS } from '@/lib/seo-job-hubs';

type Freq = NonNullable<MetadataRoute.Sitemap[number]['changeFrequency']>;

const STATIC_PAGES: { path: string; priority: number; freq: Freq }[] = [
  { path: '/', priority: 1, freq: 'weekly' },
  { path: '/jobs', priority: 0.95, freq: 'daily' },
  { path: '/hire', priority: 0.9, freq: 'monthly' },
  { path: '/services', priority: 0.9, freq: 'monthly' },
  { path: '/services/direct-recruitment', priority: 0.85, freq: 'monthly' },
  { path: '/services/managed-staffing', priority: 0.85, freq: 'monthly' },
  { path: '/services/contract-cover', priority: 0.8, freq: 'monthly' },
  { path: '/services/talent-training', priority: 0.8, freq: 'monthly' },
  { path: '/for-employers', priority: 0.85, freq: 'monthly' },
  { path: '/for-professionals', priority: 0.85, freq: 'monthly' },
  { path: '/resume-builder', priority: 0.9, freq: 'monthly' },
  { path: '/job-agent', priority: 0.9, freq: 'weekly' },
  { path: '/hiring-agents', priority: 0.8, freq: 'monthly' },
  { path: '/ats', priority: 0.8, freq: 'monthly' },
  { path: '/how-it-works', priority: 0.75, freq: 'monthly' },
  { path: '/blog', priority: 0.8, freq: 'weekly' },
  { path: '/faq', priority: 0.7, freq: 'monthly' },
  { path: '/about', priority: 0.6, freq: 'yearly' },
  { path: '/contact', priority: 0.6, freq: 'yearly' },
  { path: '/developers', priority: 0.5, freq: 'monthly' },
  { path: '/developers/job-agent', priority: 0.55, freq: 'monthly' },
  { path: '/guides/ai-job-agent-nigeria', priority: 0.85, freq: 'monthly' },
  { path: '/guides/cv-builder-nigeria', priority: 0.85, freq: 'monthly' },
  { path: '/guides/hire-talent-lagos', priority: 0.85, freq: 'monthly' },
  { path: '/guides/jobs-in-nigeria', priority: 0.9, freq: 'weekly' },
  { path: '/privacy', priority: 0.2, freq: 'yearly' },
  { path: '/terms', priority: 0.2, freq: 'yearly' },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [posts, careers, boardJobs] = await Promise.all([
    fetchPublishedPosts(),
    fetchCareersIndex(),
    fetchSitemapJobIds(2_000),
  ]);
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = STATIC_PAGES.map(({ path, priority, freq }) => ({
    url: `${APP_URL}${path}`,
    lastModified: now,
    changeFrequency: freq,
    priority,
  }));

  const cityHubs: MetadataRoute.Sitemap = JOB_CITY_HUBS.map((c) => ({
    url: `${APP_URL}/jobs/in/${c.slug}`,
    lastModified: now,
    changeFrequency: 'daily',
    priority: 0.92,
  }));

  const roleHubs: MetadataRoute.Sitemap = JOB_ROLE_HUBS.map((r) => ({
    url: `${APP_URL}/jobs/role/${r.slug}`,
    lastModified: now,
    changeFrequency: 'daily',
    priority: 0.9,
  }));

  const cityRoleHubs: MetadataRoute.Sitemap = JOB_CITY_ROLE_PAIRS.map((p) => ({
    url: `${APP_URL}/jobs/in/${p.city}/${p.role}`,
    lastModified: now,
    changeFrequency: 'daily',
    priority: 0.93,
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
  const careerJobs: MetadataRoute.Sitemap = careers.map((c) => ({
    url: `${APP_URL}/careers/${c.orgSlug}/${c.jobSlug}`,
    lastModified: new Date(c.updatedAt),
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  const listingEntries: MetadataRoute.Sitemap = boardJobs.map((j) => ({
    url: `${APP_URL}/jobs/${j.id}`,
    lastModified: new Date(j.postedAt),
    changeFrequency: 'daily',
    priority: 0.75,
  }));

  return [
    ...staticEntries,
    ...cityHubs,
    ...roleHubs,
    ...cityRoleHubs,
    ...listingEntries,
    ...blogEntries,
    ...careerPages,
    ...careerJobs,
  ];
}
