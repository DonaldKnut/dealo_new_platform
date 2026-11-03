import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { fetchPublishedPost, fetchPublishedPosts } from '@/lib/blog-public';

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const posts = await fetchPublishedPosts();
  return posts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await fetchPublishedPost(slug);
  if (!post) return { title: 'Article not found' };

  const title = post.seoTitle || post.title;
  const description = post.seoDescription || post.excerpt;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  return {
    title,
    description,
    alternates: { canonical: `${appUrl}/blog/${post.slug}` },
    openGraph: {
      title,
      description,
      type: 'article',
      url: `${appUrl}/blog/${post.slug}`,
      images: post.coverImage ? [{ url: post.coverImage }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = await fetchPublishedPost(slug);
  if (!post) notFound();

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.seoDescription || post.excerpt,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
    mainEntityOfPage: `${appUrl}/blog/${post.slug}`,
    publisher: {
      '@type': 'Organization',
      name: 'Dealo',
      url: appUrl,
    },
  };

  return (
    <article className="container-page section-space">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Link href="/blog" className="text-sm font-semibold text-brand">
        ← All articles
      </Link>
      <p className="eyebrow mt-6">Blog</p>
      <h1 className="display-title mt-3 max-w-3xl text-4xl text-foreground sm:text-5xl">
        {post.title}
      </h1>
      <p className="mt-4 max-w-2xl text-base text-muted">{post.excerpt}</p>
      {post.publishedAt ? (
        <p className="mt-3 text-xs text-muted">
          {new Date(post.publishedAt).toLocaleDateString('en-NG', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </p>
      ) : null}
      <div
        className="prose-dealo mt-10 max-w-3xl whitespace-pre-wrap text-base leading-relaxed text-foreground"
        dangerouslySetInnerHTML={{ __html: sanitizeBlogHtml(post.content) }}
      />
    </article>
  );
}

/** Minimal HTML allowlist for admin-authored content. */
function sanitizeBlogHtml(input: string) {
  const withoutScripts = input
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/on\w+=["'][^"']*["']/gi, '');
  if (/<[a-z][\s\S]*>/i.test(withoutScripts)) return withoutScripts;
  return withoutScripts
    .split(/\n{2,}/)
    .map((block) => `<p>${escapeHtml(block).replace(/\n/g, '<br />')}</p>`)
    .join('');
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}
