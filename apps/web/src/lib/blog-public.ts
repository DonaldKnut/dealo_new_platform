import { getApiBaseUrl } from '@/lib/api-base';
import { withUniqueCovers } from '@/lib/blog-format';
import type { BlogPost } from '@/lib/dashboard-api';

export async function fetchPublishedPosts(): Promise<BlogPost[]> {
  try {
    const response = await fetch(`${getApiBaseUrl()}/blog`, {
      next: { revalidate: 60 },
    });
    if (!response.ok) return [];
    return withUniqueCovers((await response.json()) as BlogPost[]);
  } catch {
    return [];
  }
}

export async function fetchPublishedPost(slug: string): Promise<BlogPost | null> {
  try {
    const response = await fetch(`${getApiBaseUrl()}/blog/by-slug/${encodeURIComponent(slug)}`, {
      next: { revalidate: 60 },
    });
    if (!response.ok) return null;
    return (await response.json()) as BlogPost;
  } catch {
    return null;
  }
}
