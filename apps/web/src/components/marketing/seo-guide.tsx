import Link from 'next/link';
import type { ReactNode } from 'react';

import { BreadcrumbsJsonLd } from '@/components/seo/breadcrumbs-json-ld';
import { JOB_CITY_HUBS, JOB_ROLE_HUBS } from '@/lib/seo-job-hubs';

export function SeoGuide({
  eyebrow,
  title,
  lead,
  path,
  children,
}: {
  eyebrow: string;
  title: string;
  lead: string;
  path: string;
  children: ReactNode;
}) {
  return (
    <article className="pb-20 pt-24 min-[340px]:pt-28">
      <BreadcrumbsJsonLd
        items={[
          { name: 'Guides', path: '/guides/jobs-in-nigeria' },
          { name: title, path },
        ]}
      />
      <div className="container-page max-w-3xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand">{eyebrow}</p>
        <h1 className="mt-3 font-display text-3xl leading-tight text-foreground min-[340px]:text-4xl sm:text-5xl">{title}</h1>
        <p className="mt-4 text-base leading-relaxed text-muted sm:text-lg">{lead}</p>
        <div className="prose-dealo mt-10 space-y-6 text-sm leading-relaxed text-muted sm:text-base">{children}</div>

        <nav className="mt-14 border-t border-border pt-8" aria-label="Related">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Keep exploring</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link href="/jobs" className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold hover:border-brand hover:text-brand">
              Job board
            </Link>
            <Link href="/job-agent" className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold hover:border-brand hover:text-brand">
              Job Agent
            </Link>
            <Link href="/resume-builder" className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold hover:border-brand hover:text-brand">
              CV builder
            </Link>
            <Link href="/hire" className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold hover:border-brand hover:text-brand">
              Hire talent
            </Link>
            {JOB_CITY_HUBS.slice(0, 3).map((c) => (
              <Link key={c.slug} href={`/jobs/in/${c.slug}`} className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold hover:border-brand hover:text-brand">
                Jobs in {c.name}
              </Link>
            ))}
            {JOB_ROLE_HUBS.slice(0, 2).map((r) => (
              <Link key={r.slug} href={`/jobs/role/${r.slug}`} className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold hover:border-brand hover:text-brand">
                {r.name} jobs
              </Link>
            ))}
          </div>
        </nav>
      </div>
    </article>
  );
}
