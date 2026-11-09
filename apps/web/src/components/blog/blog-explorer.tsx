'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, ArrowUpRight, Clock3, Search, Sparkles } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { BlogCoverArt } from '@/components/blog/blog-cover-art';
import type { ExternalRead } from '@/lib/blog-reading';
import { cn } from '@/lib/utils';

export type BlogCard = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  coverImage: string | null;
  category: string | null;
  tags: string[];
  featured: boolean;
  publishedAt: string | null;
  readMinutes: number;
};

function formatDate(iso: string | null) {
  return iso
    ? new Date(iso).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
    : 'Guide';
}

function Cover({ post, sizes, compact }: { post: BlogCard; sizes: string; compact?: boolean }) {
  if (!post.coverImage) {
    return (
      <BlogCoverArt
        slug={post.slug}
        category={post.category}
        compact={compact}
        className="transition-transform duration-700 ease-out group-hover:scale-105"
      />
    );
  }
  return (
    <Image
      src={post.coverImage}
      alt=""
      fill
      sizes={sizes}
      className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
    />
  );
}

function Meta({ post, light = false }: { post: BlogCard; light?: boolean }) {
  return (
    <p
      className={cn(
        'flex flex-wrap items-center gap-x-3 gap-y-1 text-xs',
        light ? 'text-white/75' : 'text-muted',
      )}
    >
      <span>{formatDate(post.publishedAt)}</span>
      <span className="inline-flex items-center gap-1">
        <Clock3 className="h-3 w-3" />
        {post.readMinutes} min read
      </span>
    </p>
  );
}

export function BlogExplorer({ posts, reading }: { posts: BlogCard[]; reading: ExternalRead[] }) {
  const [category, setCategory] = useState('All');
  const [query, setQuery] = useState('');

  // Supports /blog?q=… (used by the site-search structured data).
  useEffect(() => {
    const initial = new URLSearchParams(window.location.search).get('q');
    if (initial) setQuery(initial.slice(0, 100));
  }, []);

  const categories = useMemo(
    () => [
      'All',
      ...Array.from(new Set(posts.map((post) => post.category).filter(Boolean) as string[])),
    ],
    [posts],
  );

  const term = query.trim().toLowerCase();
  const filtered = posts.filter(
    (post) =>
      (category === 'All' || post.category === category) &&
      (!term ||
        `${post.title} ${post.excerpt} ${post.tags.join(' ')}`.toLowerCase().includes(term)),
  );
  const showFeature = category === 'All' && !term;
  const featured = showFeature ? posts.filter((post) => post.featured).slice(0, 2) : [];
  const rest = filtered.filter((post) => !featured.some((f) => f.id === post.id));

  return (
    <div>
      <label className="relative mx-auto mt-8 block max-w-xl">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input
          className="input-field rounded-full pl-10 shadow-sm"
          placeholder="Search articles, e.g. minimum wage, electricians, AI"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>

      <div className="scrollbar-none mt-6 flex gap-1.5 overflow-x-auto pb-1 sm:justify-center">
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setCategory(cat)}
            className={cn(
              'relative shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors',
              category === cat
                ? 'text-white dark:text-[#071f14]'
                : 'text-muted hover:text-foreground',
            )}
          >
            {category === cat ? (
              <motion.span
                layoutId="blog-cat"
                className="absolute inset-0 rounded-full bg-brand"
                transition={{ type: 'spring', stiffness: 420, damping: 34 }}
              />
            ) : null}
            <span className="relative z-10 whitespace-nowrap">{cat}</span>
          </button>
        ))}
      </div>

      {featured.length ? (
        <div className="mt-10 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          {featured.map((post, index) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08, duration: 0.45 }}
            >
              <Link
                href={`/blog/${post.slug}`}
                className={cn(
                  'group relative flex h-full min-h-[20rem] flex-col justify-end overflow-hidden rounded-[1.5rem] border border-border p-4 text-white min-[340px]:p-6',
                  index === 0 && 'lg:min-h-[26rem]',
                )}
              >
                <Cover post={post} sizes="(max-width: 1024px) 100vw, 60vw" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#071f14] via-[#071f14]/60 to-transparent" />
                <div className="relative z-10">
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#7cff4d] px-2.5 py-0.5 text-[11px] font-bold text-[#071f14]">
                    <Sparkles className="h-3 w-3" /> Featured · {post.category ?? 'Guide'}
                  </span>
                  <h2
                    className={cn(
                      'mt-3 font-display font-semibold leading-tight',
                      index === 0
                        ? 'text-2xl min-[340px]:text-3xl sm:text-4xl'
                        : 'text-xl min-[340px]:text-2xl',
                    )}
                  >
                    {post.title}
                  </h2>
                  <p className="mt-2 line-clamp-2 max-w-xl text-sm text-white/80">{post.excerpt}</p>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <Meta post={post} light />
                    <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15 backdrop-blur transition group-hover:bg-[#7cff4d] group-hover:text-[#071f14]">
                      <ArrowUpRight className="h-4 w-4" />
                    </span>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      ) : null}

      {rest.length === 0 && featured.length === 0 ? (
        <p className="mt-12 text-center text-sm text-muted">
          No articles match. Try another word or topic.
        </p>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {rest.map((post, index) => (
              <motion.article
                key={post.id}
                layout
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ delay: Math.min(index, 6) * 0.05, duration: 0.35 }}
              >
                <Link
                  href={`/blog/${post.slug}`}
                  className="group flex h-full flex-col overflow-hidden rounded-[1.25rem] border border-border bg-surface-elevated/90 transition hover:-translate-y-1 hover:border-brand/40 hover:shadow-[0_24px_50px_-28px_rgba(4,47,46,0.45)]"
                >
                  <div className="relative aspect-[16/10] overflow-hidden">
                    <Cover
                      post={post}
                      compact
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    />
                    {post.category && post.coverImage ? (
                      <span className="absolute left-3 top-3 rounded-full bg-background/90 px-2.5 py-0.5 text-[11px] font-semibold text-brand backdrop-blur">
                        {post.category}
                      </span>
                    ) : null}
                  </div>
                  <div className="flex flex-1 flex-col p-4 min-[340px]:p-5">
                    <Meta post={post} />
                    <h3 className="mt-2 font-display text-lg font-semibold leading-snug text-foreground transition-colors group-hover:text-brand min-[340px]:text-xl">
                      {post.title}
                    </h3>
                    <p className="mt-2 line-clamp-3 flex-1 text-sm text-muted">{post.excerpt}</p>
                    <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand">
                      Read article
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </span>
                  </div>
                </Link>
              </motion.article>
            ))}
          </AnimatePresence>
        </div>
      )}

      {reading.length ? (
        <section className="mt-16">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="eyebrow">Further reading</p>
              <h2 className="display-title mt-2 text-2xl text-foreground min-[340px]:text-3xl">
                From trusted sources
              </h2>
            </div>
            <p className="max-w-sm text-xs text-muted">
              Reports and guides we use ourselves. Links open the original source.
            </p>
          </div>
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {reading.map((item) => (
              <a
                key={item.href}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex flex-col rounded-2xl border border-border bg-surface/70 p-4 transition hover:border-brand/40 hover:bg-surface-elevated"
              >
                <div className="flex items-center justify-between gap-2 text-[11px] text-muted">
                  <span className="font-semibold uppercase tracking-wide text-brand">
                    {item.topic}
                  </span>
                  <span>{item.year}</span>
                </div>
                <p className="mt-2 font-semibold leading-snug text-foreground">{item.title}</p>
                <p className="mt-1 flex-1 text-sm text-muted">{item.summary}</p>
                <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-foreground">
                  {item.source}
                  <ArrowUpRight className="h-3.5 w-3.5 text-brand transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </span>
              </a>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
