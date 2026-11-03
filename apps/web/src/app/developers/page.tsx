'use client';

import { Code2, KeyRound, LifeBuoy, PlugZap, ShieldCheck, Webhook } from 'lucide-react';
import Link from 'next/link';

import { useLocale } from '@/components/i18n/locale-context';
import { CtaBanner } from '@/components/marketing/cta-banner';
import { FeatureAdGrid } from '@/components/marketing/feature-ad-grid';
import { PageHero } from '@/components/marketing/page-hero';
import { useModal } from '@/components/modals/modal-context';

export default function DevelopersPage() {
  const { open } = useModal();
  const { t } = useLocale();

  return (
    <div>
      <PageHero
        eyebrow={t('dev.eyebrow')}
        title={t('dev.title')}
        description={t('dev.body')}
        actions={
          <>
            <button type="button" className="btn-primary" onClick={() => open('contact')}>
              {t('dev.cta')}
            </button>
            <Link href="/contact" className="btn-secondary">
              {t('dev.support')}
            </Link>
          </>
        }
      />

      <FeatureAdGrid
        eyebrow="What you can build"
        title="API surface for office hiring and skilled trades"
        description="Designed for product teams, staffing platforms, and enterprise HR tools that need checked talent flows — not a public job board dump."
        items={[
          {
            icon: PlugZap,
            title: 'Hiring request intake',
            body: 'Create and track hire inquiries with role family, service type, and site or office details.',
          },
          {
            icon: Webhook,
            title: 'Status webhooks',
            body: 'Get notified when shortlists are ready, interviews are booked, or placements change.',
          },
          {
            icon: ShieldCheck,
            title: 'Scoped credentials',
            body: 'API keys with permission scopes for recruiters, partners, and internal tools.',
          },
          {
            icon: KeyRound,
            title: 'Auth for your apps',
            body: 'Secure token flows so your product can act on behalf of an employer organization.',
          },
          {
            icon: Code2,
            title: 'Partner integrations',
            body: 'Connect Dealo into ATS, payroll, or ops tools under a commercial API plan.',
          },
          {
            icon: LifeBuoy,
            title: 'Developer support',
            body: 'Implementation help, sandbox guidance, and a clear path from pilot to production.',
          },
        ]}
      />

      <section className="container-page py-10 min-[340px]:py-14">
        <div className="rounded-[1.25rem] border border-border bg-surface-elevated/80 p-4 min-[340px]:rounded-[1.5rem] min-[340px]:p-7">
          <p className="eyebrow">Commercial API</p>
          <h2 className="display-title mt-2 text-[1.45rem] text-foreground min-[340px]:text-3xl">
            API access is sold with support — not left open.
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted min-[340px]:text-base">
            We recommend a partner or enterprise API plan: sandbox keys, usage limits, and a named
            support contact. That keeps quality high for employers and talent while giving your
            product a reliable hiring backend.
          </p>
          <div className="mt-5 flex flex-col gap-2 min-[400px]:flex-row">
            <button type="button" className="btn-primary" onClick={() => open('contact')}>
              Ask about API pricing
            </button>
            <Link href="/for-employers" className="btn-secondary">
              See employer product
            </Link>
          </div>
        </div>
      </section>

      <CtaBanner />
    </div>
  );
}
