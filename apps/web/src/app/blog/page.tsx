import type { Metadata } from 'next';
import Link from 'next/link';

import { BlogExplorer } from '@/components/blog/blog-explorer';
import { toBlogCard } from '@/lib/blog-format';
import { fetchPublishedPosts } from '@/lib/blog-public';
import { FURTHER_READING } from '@/lib/blog-reading';
import { pageMetadata } from '@/lib/seo';

export const metadata: Metadata = pageMetadata({
  path: '/blog',
  title: 'Blog — Hiring & jobs in Nigeria and Africa',
  description:
    'Plain-English guides on jobs in Nigeria, hiring office staff and skilled trades, pay, AI in hiring, and managing workers on site.',
  keywords: ['hiring Nigeria', 'jobs in Nigeria blog', 'recruitment Africa', 'managed staffing', 'AI hiring'],
});

export default async function BlogIndexPage() {
  const posts = (await fetchPublishedPosts()).map(toBlogCard);

  return (
    <div className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 h-[30rem] w-[min(70rem,160%)] -translate-x-1/2 bg-[radial-gradient(ellipse_at_top,var(--hero-glow),transparent_65%)]"
      />
      <div className="container-page relative pb-16 pt-24 min-[340px]:pt-28 sm:pt-32">
        <div className="mx-auto max-w-3xl text-center">
          <p className="eyebrow">Dealo journal</p>
          <h1 className="display-title mt-3 text-[1.75rem] text-foreground min-[340px]:text-4xl sm:text-5xl lg:text-6xl">
            Hiring in Nigeria and Africa, <span className="text-gradient-brand">made simple</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-sm text-muted min-[340px]:text-base">
            Short, clear guides on finding good people, paying them fairly, using AI safely and keeping work on track.
          </p>
          <p className="mt-3 text-xs text-muted">
            <a href="/rss.xml" className="font-semibold text-brand hover:underline">
              RSS feed
            </a>
            {' · '}
            <Link href="/guides/jobs-in-nigeria" className="font-semibold text-brand hover:underline">
              Jobs in Nigeria guide
            </Link>
          </p>
        </div>

        {posts.length === 0 ? (
          <p className="mx-auto mt-16 max-w-md text-center text-sm text-muted">New guides are on the way. Check back soon.</p>
        ) : (
          <div className="mt-12">
            <BlogExplorer posts={posts} reading={FURTHER_READING} />
          </div>
        )}
      </div>
    </div>
  );
}
