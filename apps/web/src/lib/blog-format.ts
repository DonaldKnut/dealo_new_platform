import type { BlogCard } from '@/components/blog/blog-explorer';
import type { BlogPost } from '@/lib/dashboard-api';

export function readMinutes(content: string) {
  const words = content
    .replace(/<[^>]+>/g, ' ')
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

export function toBlogCard(post: BlogPost): BlogCard {
  return {
    id: post.id,
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    coverImage: post.coverImage,
    category: post.category ?? null,
    tags: post.tags ?? [],
    featured: Boolean(post.featured),
    publishedAt: post.publishedAt,
    readMinutes: readMinutes(post.content),
  };
}

/**
 * Each picture belongs to one post so the blog never shows the same thumbnail twice. Featured posts
 * claim first (they are the biggest cards), then the newest; the others get generated cover art.
 */
export function withUniqueCovers<
  T extends { coverImage: string | null; publishedAt: string | null; featured?: boolean },
>(posts: T[]): T[] {
  const owner = new Map<string, T>();
  const byPriority = [...posts].sort(
    (a, b) =>
      Number(Boolean(b.featured)) - Number(Boolean(a.featured)) ||
      (b.publishedAt ?? '').localeCompare(a.publishedAt ?? ''),
  );
  for (const post of byPriority) {
    const key = post.coverImage?.trim();
    if (key && !owner.has(key)) owner.set(key, post);
  }
  return posts.map((post) => {
    const key = post.coverImage?.trim();
    return key && owner.get(key) !== post ? { ...post, coverImage: null } : post;
  });
}

/** Minimal HTML allowlist for admin-authored content. */
export function sanitizeBlogHtml(input: string) {
  const withoutScripts = input
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/<(iframe|object|embed|style)[\s\S]*?>[\s\S]*?<\/\1>/gi, '')
    .replace(/\son\w+=("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/(href|src)\s*=\s*(["'])\s*javascript:[^"']*\2/gi, '$1="#"');
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
