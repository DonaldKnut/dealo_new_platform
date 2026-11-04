import type { Metadata } from 'next';

import { BlogExplorer } from '@/components/blog/blog-explorer';
import { toBlogCard } from '@/lib/blog-format';
import { fetchPublishedPosts } from '@/lib/blog-public';
import { FURTHER_READING } from '@/lib/blog-reading';

export const metadata: Metadata = {
  title: 'Blog — Hiring in Nigeria & Africa, made simple',
  description:
    'Simple guides on hiring office staff and skilled trades in Nigeria and across Africa: pay, the law, AI in hiring and managing workers on site.',
  alternates: { canonical: '/blog' },
  openGraph: {
    title: 'Dealo Journal — Hiring in Nigeria & Africa, made simple',
    description: 'Practical guides for employers and professionals, written in plain English.',
    type: 'website',
  },
};

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
        </div>

        {posts.length === 0 ? (
          <p className="mt-12 text-center text-sm text-muted">New articles are on the way. Check back soon.</p>
        ) : (
          <BlogExplorer posts={posts} reading={FURTHER_READING} />
        )}
      </div>
    </div>
  );
}
