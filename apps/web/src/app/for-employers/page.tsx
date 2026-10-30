'use client';

import {
  Building2,
  FileCheck2,
  Handshake,
  LineChart,
  ShieldCheck,
  TimerReset,
} from 'lucide-react';
import Link from 'next/link';

import { CtaBanner } from '@/components/marketing/cta-banner';
import { FeatureAdGrid } from '@/components/marketing/feature-ad-grid';
import { IllustrationBand } from '@/components/marketing/illustration-band';
import { PageHero } from '@/components/marketing/page-hero';
import { StatAdvert } from '@/components/marketing/stat-advert';
import { useModal } from '@/components/modals/modal-context';

export default function ForEmployersPage() {
  const { open } = useModal();

  return (
    <div>
      <PageHero
        eyebrow="Employers"
        title="Hire with an operational partner, not a job board"
        description="Submit role requirements, review shortlists, coordinate interviews, and track placements with a partner that understands administrative staffing."
        actions={
          <>
            <button type="button" className="btn-primary" onClick={() => open('hire')}>
              Request talent
            </button>
            <Link href="/auth/register" className="btn-secondary">
              Create employer account
            </Link>
          </>
        }
      />

      <StatAdvert
        items={[
          { value: 'Brief-first', label: 'Clear role intake before sourcing begins' },
          { value: 'Vetted', label: 'Screened professionals before interviews' },
          { value: 'Tracked', label: 'Placement and commercial follow-through' },
        ]}
      />

      <FeatureAdGrid
        eyebrow="Employer outcomes"
        title="Built for companies planning real hires"
        description="Ideal when you intend to bring staff into your administrative structure — or when you want Dealo to run staffing operations for you."
        items={[
          {
            icon: Building2,
            title: 'Into your structure',
            body: 'Direct recruitment places professionals into your org with a clear interview and offer path.',
          },
          {
            icon: Handshake,
            title: 'Managed for you',
            body: 'Managed staffing keeps commercial terms and operational follow-through on Dealo’s side.',
          },
          {
            icon: TimerReset,
            title: 'Faster shortlists',
            body: 'Skip open-ended posting cycles. Work from screened candidates matched to your brief.',
          },
          {
            icon: FileCheck2,
            title: 'Documented trail',
            body: 'Requirements, shortlists, and next steps stay organized for stakeholders and approvals.',
          },
          {
            icon: ShieldCheck,
            title: 'Trust signals',
            body: 'Verification-minded onboarding keeps the talent network professional and accountable.',
          },
          {
            icon: LineChart,
            title: 'Workspace ready',
            body: 'Employer dashboard foundations for requests, pipeline visibility, and team actions.',
          },
        ]}
      />

      <IllustrationBand
        reverse
        eyebrow="Direct recruitment"
        title="Role brief → sourcing → screening → shortlist → interviews → placement"
        description="For organizations that plan to hire staff into their administrative structure. Dealo runs a disciplined path from brief to placement."
        actions={
          <button type="button" className="btn-primary" onClick={() => open('hire')}>
            Start direct recruitment
          </button>
        }
        illustration={
          <ol className="w-full max-w-sm space-y-3">
            {['Brief', 'Source', 'Screen', 'Shortlist', 'Interview', 'Place'].map((label, index) => (
              <li
                key={label}
                className="flex items-center gap-3 rounded-xl border border-border bg-surface-elevated/90 px-4 py-2.5"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand text-xs font-bold text-white dark:text-[#071f14]">
                  {index + 1}
                </span>
                <span className="text-sm font-medium text-foreground">{label}</span>
              </li>
            ))}
          </ol>
        }
      />

      <CtaBanner />
    </div>
  );
}
