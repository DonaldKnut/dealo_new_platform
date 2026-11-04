import { breadcrumbJsonLd } from '@/lib/seo';

export function BreadcrumbsJsonLd({ items }: { items: { name: string; path: string }[] }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd([{ name: 'Home', path: '/' }, ...items])) }}
    />
  );
}
