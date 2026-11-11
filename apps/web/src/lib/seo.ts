import type { Metadata } from 'next';

/** A missing env var on Vercel must never publish localhost canonicals or a localhost sitemap. */
export const APP_URL = (
  process.env.NEXT_PUBLIC_APP_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? 'https://dealonetwork.com' : 'http://localhost:3000')
).replace(/\/$/, '');
export const DEFAULT_OG_IMAGE = '/opengraph-image';

/** Per-page metadata with its own canonical URL and matching social cards. */
export function pageMetadata({
  path,
  title,
  description,
  keywords,
  noIndex = false,
}: {
  path: string;
  title: string;
  description: string;
  keywords?: string[];
  noIndex?: boolean;
}): Metadata {
  return {
    title,
    description,
    keywords,
    alternates: { canonical: path },
    robots: noIndex ? { index: false, follow: true } : undefined,
    openGraph: {
      type: 'website',
      siteName: 'Dealo',
      locale: 'en_NG',
      url: path,
      title,
      description,
      images: [{ url: DEFAULT_OG_IMAGE, width: 1200, height: 630, alt: 'Dealo — hire checked talent' }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [DEFAULT_OG_IMAGE],
    },
  };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: `${APP_URL}${item.path}`,
    })),
  };
}
