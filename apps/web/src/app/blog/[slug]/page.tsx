import { ArrowLeft, ArrowRight, Clock3 } from 'lucide-react';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { ReadingProgress, ShareRow } from '@/components/blog/article-tools';
import { BlogCoverArt } from '@/components/blog/blog-cover-art';
import { readMinutes, sanitizeBlogHtml, toBlogCard } from '@/lib/blog-format';
import { fetchPublishedPost, fetchPublishedPosts } from '@/lib/blog-public';

type Props = { params: Promise<{ slug: string }> };

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

export async function generateStaticParams() {
  const posts = await fetchPublishedPosts();
  return posts.map((post) => ({ slug: post.slug }));
}

/** The post with the same cover the blog list shows (a picture another post owns is dropped). */
async function loadPost(slug: string) {
  const [post, all] = await Promise.all([fetchPublishedPost(slug), fetchPublishedPosts()]);
  if (!post) return { post: null, all };
  const listed = all.find((item) => item.id === post.id);
  return { post: listed ? { ...post, coverImage: listed.coverImage } : post, all };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { post } = await loadPost(slug);
  if (!post) return { title: 'Article not found' };

  const title = post.seoTitle || post.title;
  const description = post.seoDescription || post.excerpt;

  return {
    title,
    description,
    alternates: { canonical: `${APP_URL}/blog/${post.slug}` },
    openGraph: {
      title,
      description,
      type: 'article',
      url: `${APP_URL}/blog/${post.slug}`,
      publishedTime: post.publishedAt ?? undefined,
      modifiedTime: post.updatedAt,
      section: post.category ?? undefined,
      tags: post.tags,
      images: post.coverImage ? [{ url: post.coverImage }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: post.coverImage ? [post.coverImage] : undefined,
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const { post, all } = await loadPost(slug);
  if (!post) notFound();

  const url = `${APP_URL}/blog/${post.slug}`;
  const minutes = readMinutes(post.content);
  const related = all
    .filter((item) => item.slug !== post.slug)
    .sort((a, b) => Number(b.category === post.category) - Number(a.category === post.category))
    .slice(0, 3)
    .map(toBlogCard);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.seoDescription || post.excerpt,
    image: post.coverImage ?? undefined,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
    articleSection: post.category ?? undefined,
    keywords: post.tags?.join(', '),
    mainEntityOfPage: url,
    author: { '@type': 'Organization', name: 'Dealo', url: APP_URL },
    publisher: { '@type': 'Organization', name: 'Dealo', url: APP_URL },
  };
  const breadcrumbs = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: APP_URL },
      { '@type': 'ListItem', position: 2, name: 'Blog', item: `${APP_URL}/blog` },
      { '@type': 'ListItem', position: 3, name: post.title, item: url },
    ],
  };

  return (
    <article className="pb-16">
      <ReadingProgress />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }}
      />

      <header className="relative overflow-hidden pt-20 min-[340px]:pt-24">
        {post.coverImage ? (
          <div className="absolute inset-0 -z-10">
            <Image
              src={post.coverImage}
              alt=""
              fill
              priority
              sizes="100vw"
              className="object-cover opacity-25 blur-[1px]"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/80 to-background" />
          </div>
        ) : null}
        <div className="container-page max-w-3xl py-10 min-[340px]:py-14">
          <Link href="/blog" className="link-anim text-sm font-semibold text-brand">
            <ArrowLeft className="h-4 w-4" /> All articles
          </Link>
          {post.category ? (
            <p className="mt-6">
              <span className="rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand">
                {post.category}
              </span>
            </p>
          ) : null}
          <h1 className="display-title mt-4 text-[1.75rem] text-foreground min-[340px]:text-4xl sm:text-5xl">
            {post.title}
          </h1>
          <p className="mt-4 text-base text-muted sm:text-lg">{post.excerpt}</p>
          <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted">
            <span className="font-semibold text-foreground">Dealo editorial team</span>
            {post.publishedAt ? (
              <span>
                {new Date(post.publishedAt).toLocaleDateString('en-NG', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </span>
            ) : null}
            <span className="inline-flex items-center gap-1">
              <Clock3 className="h-3.5 w-3.5" /> {minutes} min read
            </span>
          </div>
        </div>
      </header>

      <div className="container-page max-w-4xl">
        <div className="relative aspect-[16/8] overflow-hidden rounded-[1.5rem] border border-border">
          {post.coverImage ? (
            <Image
              src={post.coverImage}
              alt=""
              fill
              sizes="(max-width: 1024px) 100vw, 900px"
              className="object-cover"
            />
          ) : (
            <BlogCoverArt slug={post.slug} category={post.category ?? null} />
          )}
        </div>
      </div>

      <div className="container-page max-w-3xl">
        <div
          className="prose-dealo mt-10"
          dangerouslySetInnerHTML={{ __html: sanitizeBlogHtml(post.content) }}
        />

        {post.tags?.length ? (
          <div className="mt-8 flex flex-wrap gap-1.5">
            {post.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-border px-2.5 py-1 text-xs text-muted"
              >
                #{tag}
              </span>
            ))}
          </div>
        ) : null}

        <div className="mt-8 border-t border-border pt-6">
          <ShareRow url={url} title={post.title} />
        </div>

        <div className="mt-10 rounded-[1.5rem] border border-brand/30 bg-brand-soft/30 p-5 min-[340px]:p-7">
          <p className="font-display text-xl font-semibold text-foreground min-[340px]:text-2xl">
            Need people you can trust?
          </p>
          <p className="mt-2 text-sm text-muted">
            Tell us the role. We send checked people, usually within 48 hours.
          </p>
          <div className="mt-4 flex flex-col gap-2 min-[400px]:flex-row">
            <Link href="/hire" className="btn-primary">
              Request a hire <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/faq" className="btn-secondary">
              Read the FAQ
            </Link>
          </div>
        </div>
      </div>

      {related.length ? (
        <section className="container-page mt-16">
          <h2 className="display-title text-2xl text-foreground min-[340px]:text-3xl">
            Keep reading
          </h2>
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((item) => (
              <Link
                key={item.id}
                href={`/blog/${item.slug}`}
                className="group flex flex-col overflow-hidden rounded-[1.25rem] border border-border bg-surface-elevated/90 transition hover:-translate-y-1 hover:border-brand/40"
              >
                <div className="relative aspect-[16/10] overflow-hidden bg-brand-soft">
                  {item.coverImage ? (
                    <Image
                      src={item.coverImage}
                      alt=""
                      fill
                      sizes="(max-width: 640px) 100vw, 33vw"
                      className="object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                  ) : (
                    <BlogCoverArt
                      slug={item.slug}
                      category={item.category}
                      compact
                      className="transition-transform duration-700 group-hover:scale-105"
                    />
                  )}
                </div>
                <div className="p-4">
                  <p className="text-xs text-muted">
                    {item.category ?? 'Guide'} · {item.readMinutes} min read
                  </p>
                  <p className="mt-1 font-semibold leading-snug text-foreground group-hover:text-brand">
                    {item.title}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </article>
  );
}
