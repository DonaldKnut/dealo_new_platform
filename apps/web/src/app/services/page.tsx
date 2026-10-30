'use client';

import { Building2, Handshake, ShieldCheck, Workflow } from 'lucide-react';
import Link from 'next/link';

import { CtaBanner } from '@/components/marketing/cta-banner';
import { FeatureAdGrid } from '@/components/marketing/feature-ad-grid';
import { PageHero } from '@/components/marketing/page-hero';
import { StatAdvert } from '@/components/marketing/stat-advert';
import { useModal } from '@/components/modals/modal-context';

export default function ServicesPage() {
  const { open } = useModal();

  return (
    <div>
      <PageHero
        eyebrow="Services"
        title="Recruitment outcomes for growing teams"
        description="Choose direct recruitment into your structure, or managed staffing where Dealo runs the hiring operations for you."
        actions={
          <>
            <button type="button" className="btn-primary" onClick={() => open('hire')}>
              Request talent
            </button>
            <Link href="/how-it-works" className="btn-secondary">
              See how it works
            </Link>
          </>
        }
      />

      <StatAdvert
        items={[
          { value: 'Direct', label: 'Hire into your administrative structure' },
          { value: 'Managed', label: 'Dealo runs staffing with clear terms' },
          { value: 'Tracked', label: 'Brief → shortlist → placement trail' },
        ]}
      />

      <section className="container-page grid gap-6 py-12 md:grid-cols-2 md:py-16">
        <Link
          href="/services/direct-recruitment"
          className="rounded-2xl border border-border bg-surface-elevated/70 p-6 transition hover:border-brand/40 min-[340px]:p-8"
        >
          <Building2 className="h-6 w-6 text-brand" />
          <h2 className="mt-4 font-display text-2xl text-foreground">Direct recruitment</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted sm:text-base">
            Role brief → sourcing → screening → shortlist → interviews → placement into your
            organization.
          </p>
        </Link>
        <Link
          href="/services/managed-staffing"
          className="rounded-2xl border border-border bg-surface-elevated/70 p-6 transition hover:border-brand/40 min-[340px]:p-8"
        >
          <Handshake className="h-6 w-6 text-brand" />
          <h2 className="mt-4 font-display text-2xl text-foreground">Managed staffing</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted sm:text-base">
            Agreed staffing arrangements with commercial terms — Dealo’s platform carries the hiring
            load.
          </p>
        </Link>
      </section>

      <FeatureAdGrid
        eyebrow="Operating clarity"
        title="What both services share"
        description="A disciplined path, accountable follow-through, and professional communication."
        items={[
          {
            icon: Workflow,
            title: 'Structured stages',
            body: 'Every engagement moves through clear operating steps instead of open-ended posting.',
          },
          {
            icon: ShieldCheck,
            title: 'Trusted network',
            body: 'Professionals are screened against the brief before employers invest interview time.',
          },
          {
            icon: Handshake,
            title: 'Commercial clarity',
            body: 'Terms and next actions stay explicit — especially for managed staffing arrangements.',
          },
        ]}
      />

      <CtaBanner />
    </div>
  );
}
