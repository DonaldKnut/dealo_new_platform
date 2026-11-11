import type { Metadata } from 'next';

import { FaqBrowser } from '@/components/faq/faq-browser';
import { BreadcrumbsJsonLd } from '@/components/seo/breadcrumbs-json-ld';
import { FAQ_CATEGORIES } from '@/lib/faq-content';
import { pageMetadata } from '@/lib/seo';

export const metadata: Metadata = pageMetadata({
  path: '/faq',
  title: 'Questions & answers about hiring and jobs on Dealo',
  description:
    'Simple answers about hiring with Dealo, joining as a professional, how our AI works, the Dealo API, prices and your privacy.',
});

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: FAQ_CATEGORIES.flatMap((category) =>
    category.items.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a.join(' ') },
    })),
  ),
};

export default function FaqPage() {
  return (
    <section className="container-page pb-16 pt-24 min-[340px]:pt-28 sm:pt-32">
      <BreadcrumbsJsonLd items={[{ name: 'FAQ', path: '/faq' }]} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <div className="mx-auto max-w-2xl text-center">
        <p className="eyebrow">Help centre</p>
        <h1 className="display-title mt-2 text-[1.75rem] text-foreground min-[340px]:text-4xl sm:text-5xl">
          Questions & answers
        </h1>
        <p className="mt-3 text-sm text-muted min-[340px]:text-base">
          Everything about Dealo in plain words: hiring, jobs, AI, the API, prices and privacy.
        </p>
      </div>
      <div className="mt-10">
        <FaqBrowser />
      </div>
    </section>
  );
}
