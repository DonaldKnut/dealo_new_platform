import { Building2, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import type { CSSProperties, ReactNode } from 'react';

import type { PublicOrganization } from '@/lib/ats-api';

export const safeJsonLd = (data: unknown) => JSON.stringify(data).replace(/</g, '\\u003c');

export function brandStyle(org: Pick<PublicOrganization, 'brandColor'>): CSSProperties | undefined {
  return org.brandColor && /^#[0-9a-f]{6}$/i.test(org.brandColor) ? ({ '--brand': org.brandColor } as CSSProperties) : undefined;
}

export function CareersHeader({ org, children }: { org: PublicOrganization; children?: ReactNode }) {
  return (
    <header className="relative overflow-hidden border-b border-border pt-20 min-[340px]:pt-24">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_80%_at_20%_0%,color-mix(in_srgb,var(--brand)_18%,transparent),transparent)]" />
      <div className="relative mx-auto w-full max-w-5xl px-3 pb-8 min-[340px]:px-5 sm:px-6">
        <Link href={`/careers/${org.slug}`} className="inline-flex max-w-full items-center gap-3">
          {org.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={org.logoUrl} alt={`${org.name} logo`} className="h-12 w-12 shrink-0 rounded-2xl border border-border bg-white object-contain p-1.5" />
          ) : (
            <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand text-white dark:text-[#071f14]">
              <Building2 className="h-6 w-6" />
            </span>
          )}
          <span className="min-w-0">
            <span className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-brand">Careers</span>
            <span className="block truncate font-display text-xl text-foreground min-[340px]:text-2xl">{org.name}</span>
          </span>
        </Link>
        {children}
        {org.website ? (
          <a href={org.website} target="_blank" rel="noopener noreferrer nofollow" className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-brand">
            <ExternalLink className="h-3.5 w-3.5" /> {org.website.replace(/^https?:\/\//, '')}
          </a>
        ) : null}
      </div>
    </header>
  );
}

export function PoweredByDealo() {
  return (
    <p className="mt-12 text-center text-xs text-muted">
      Hiring with{' '}
      <Link href="/ats" className="font-semibold text-brand hover:underline">
        Dealo ATS
      </Link>{' '}
      · free for companies in early access
    </p>
  );
}
