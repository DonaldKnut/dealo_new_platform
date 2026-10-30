'use client';

import {
  BadgeCheck,
  Building2,
  ClipboardCheck,
  ClipboardList,
  MessageSquare,
  Search,
  ShieldCheck,
  UserCheck,
  UsersRound,
} from 'lucide-react';
import Link from 'next/link';

import { CtaBanner } from '@/components/marketing/cta-banner';
import { FeatureAdGrid } from '@/components/marketing/feature-ad-grid';
import { IllustrationBand } from '@/components/marketing/illustration-band';
import { PageHero } from '@/components/marketing/page-hero';
import { ProcessRail } from '@/components/marketing/process-rail';
import { StatAdvert } from '@/components/marketing/stat-advert';
import { useModal } from '@/components/modals/modal-context';

export default function DirectRecruitmentPage() {
  const { open } = useModal();

  return (
    <div>
      <PageHero
        eyebrow="Direct recruitment"
        title="Placement built around your role brief"
        description="Ideal for companies that plan to hire staff into their administrative structure. Role brief → sourcing → screening → shortlist → interviews → placement."
        actions={
          <>
            <button type="button" className="btn-primary" onClick={() => open('hire')}>
              Start a hiring request
            </button>
            <Link href="/auth/register" className="btn-secondary">
              Create employer account
            </Link>
          </>
        }
      />

      <StatAdvert
        items={[
          { value: '6 stages', label: 'Clear path from brief to placement' },
          { value: 'Screened', label: 'Candidates reviewed before interviews' },
          { value: 'Into your org', label: 'Hires land in your admin structure' },
        ]}
      />

      <FeatureAdGrid
        eyebrow="Path"
        title="What direct recruitment covers"
        description="A disciplined hire-into-your-org path with screened shortlists and accountable follow-through."
        items={[
          {
            icon: ClipboardList,
            title: 'Role brief',
            body: 'Lock requirements, headcount, location, and commercial expectations first.',
          },
          {
            icon: Search,
            title: 'Source & screen',
            body: 'Dealo sources and screens professionals against your brief before interviews.',
          },
          {
            icon: UserCheck,
            title: 'Interview & place',
            body: 'Coordinate interviews and place talent into your structure with clear next steps.',
          },
        ]}
      />

      <IllustrationBand
        eyebrow="Built for intentional hires"
        title="Not a job board. An operating path."
        description="Direct recruitment is for organizations that intend to incorporate professionals into their administrative structure — with Dealo running a structured path from brief to placement."
        actions={
          <button type="button" className="btn-primary" onClick={() => open('hire')}>
            Submit a role brief
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

      <FeatureAdGrid
        eyebrow="Employer advantages"
        title="Why teams choose direct recruitment"
        description="Clarity for stakeholders, screened shortlists, and placement follow-through."
        items={[
          {
            icon: Building2,
            title: 'Into your structure',
            body: 'Professionals are hired into your organization — not left as open-ended introductions.',
          },
          {
            icon: ShieldCheck,
            title: 'Quality gate',
            body: 'Screening happens before you invest interview cycles.',
          },
          {
            icon: ClipboardCheck,
            title: 'Documented trail',
            body: 'Brief, shortlist, and interview stages stay organized for approvals.',
          },
          {
            icon: UsersRound,
            title: 'Headcount ready',
            body: 'Request one role or multiple professionals against the same brief.',
          },
          {
            icon: MessageSquare,
            title: 'Clear communication',
            body: 'Dealo coordinates updates so hiring managers know what happens next.',
          },
          {
            icon: BadgeCheck,
            title: 'Commercial clarity',
            body: 'Engagement terms sit alongside the operating process — not afterthoughts.',
          },
        ]}
      />

      <ProcessRail />

      <IllustrationBand
        reverse
        eyebrow="Compare"
        title="Need Dealo to run staffing for you instead?"
        description="Managed staffing keeps commercial terms and hiring operations on Dealo’s platform — ideal when you want less operational burden on your team."
        actions={
          <Link href="/services/managed-staffing" className="btn-secondary">
            Explore managed staffing
          </Link>
        }
        illustration={
          <div className="grid w-full max-w-sm gap-3">
            {[
              { title: 'Direct recruitment', body: 'You hire into your admin structure.' },
              { title: 'Managed staffing', body: 'Dealo carries hiring operations for you.' },
            ].map((card) => (
              <div
                key={card.title}
                className="rounded-xl border border-border bg-surface-elevated/90 px-4 py-3"
              >
                <p className="text-sm font-semibold text-foreground">{card.title}</p>
                <p className="mt-1 text-xs text-muted">{card.body}</p>
              </div>
            ))}
          </div>
        }
      />

      <CtaBanner />
    </div>
  );
}
