import { fetchPublishedPosts } from '@/lib/blog-public';
import { APP_URL } from '@/lib/seo';

export const revalidate = 300;

export async function GET() {
  const posts = await fetchPublishedPosts();
  const items = posts
    .slice(0, 50)
    .map((post) => {
      const link = `${APP_URL}/blog/${post.slug}`;
      const date = post.publishedAt || post.updatedAt;
      return `
    <item>
      <title><![CDATA[${post.title}]]></title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <description><![CDATA[${post.excerpt || ''}]]></description>
      ${date ? `<pubDate>${new Date(date).toUTCString()}</pubDate>` : ''}
    </item>`;
    })
    .join('');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Dealo Journal — Jobs &amp; hiring in Nigeria</title>
    <link>${APP_URL}/blog</link>
    <description>Guides on jobs in Nigeria, hiring, and AI-assisted applying.</description>
    <language>en-ng</language>
    <atom:link href="${APP_URL}/rss.xml" rel="self" type="application/rss+xml"/>
    ${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
    },
  });
}
