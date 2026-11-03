import type { Metadata } from 'next';
import Link from 'next/link';

import { fetchPublishedPosts } from '@/lib/blog-public';

export const metadata: Metadata = {
  title: 'Blog — Hire talent in Nigeria, Africa & globally',
  description:
    'Guides on hiring office staff and skilled trades in Nigeria and across Africa, plus inbound global recruitment tips from Dealo.',
  openGraph: {
    title: 'Dealo Blog — Hiring insights for Nigeria & Africa',
    description:
      'Practical recruitment guides for office professionals and skilled trades staffing.',
    type: 'website',
  },
};

export default async function BlogIndexPage() {
  const posts = await fetchPublishedPosts();

  return (
    <div className="container-page section-space">
      <div className="max-w-3xl">
        <p className="eyebrow">Resources</p>
        <h1 className="display-title mt-3 text-4xl text-foreground sm:text-5xl">
          Hiring insights for Nigeria, Africa, and global teams
        </h1>
        <p className="mt-4 text-base text-muted sm:text-lg">
          Learn how to hire talent in Nigeria, recruit office staff in Lagos, and staff skilled
          trades across Africa — with Dealo&apos;s checked shortlist approach.
        </p>
      </div>

      <div className="mt-12 grid gap-6 md:grid-cols-2">
        {posts.length === 0 ? (
          <p className="text-sm text-muted md:col-span-2">
            New articles are on the way. Meanwhile, explore{' '}
            <Link href="/for-employers" className="font-semibold text-brand">
              employer insights
            </Link>{' '}
            or{' '}
            <Link href="/contact" className="font-semibold text-brand">
              contact our team
            </Link>
            .
          </p>
        ) : (
          posts.map((post) => (
            <article key={post.id} className="border-b border-border pb-6">
              <p className="text-xs uppercase tracking-[0.14em] text-brand">
                {post.publishedAt
                  ? new Date(post.publishedAt).toLocaleDateString('en-NG', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })
                  : 'Guide'}
              </p>
              <h2 className="mt-2 font-display text-2xl text-foreground">
                <Link href={`/blog/${post.slug}`} className="hover:text-brand">
                  {post.title}
                </Link>
              </h2>
              <p className="mt-2 text-sm text-muted">{post.excerpt}</p>
              <Link
                href={`/blog/${post.slug}`}
                className="mt-4 inline-flex text-sm font-semibold text-brand"
              >
                Read article
              </Link>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
