'use client';

import {
  BriefcaseBusiness,
  ClipboardCheck,
  MessageSquareQuote,
  SearchCheck,
  ShieldCheck,
  Sparkles,
  UsersRound,
} from 'lucide-react';

import { CtaBanner } from '@/components/marketing/cta-banner';
import { FeatureAdGrid } from '@/components/marketing/feature-ad-grid';
import { IllustrationBand } from '@/components/marketing/illustration-band';
import { PageHero } from '@/components/marketing/page-hero';
import { ProcessRail } from '@/components/marketing/process-rail';
import { StatAdvert } from '@/components/marketing/stat-advert';
import { useModal } from '@/components/modals/modal-context';

const steps = [
  {
    icon: MessageSquareQuote,
    title: 'Brief',
    body: 'You submit a hiring request with role, headcount, location, and commercial context.',
  },
  {
    icon: SearchCheck,
    title: 'Source & screen',
    body: 'Dealo sources and screens professionals against your requirements before shortlisting.',
  },
  {
    icon: ClipboardCheck,
    title: 'Interview & place',
    body: 'Coordinate interviews, confirm fit, place talent, and keep operational follow-through clear.',
  },
];

export default function HowItWorksPage() {
  const { open } = useModal();

  return (
    <div>
      <PageHero
        eyebrow="Process"
        title="How Dealo works"
        description="A structured recruitment and managed staffing path — from role brief to placement — built for companies that need reliable operating follow-through."
        actions={
          <>
            <button type="button" className="btn-primary" onClick={() => open('hire')}>
              Start a hiring request
            </button>
            <button type="button" className="btn-secondary" onClick={() => open('contact')}>
              Talk to Dealo
            </button>
          </>
        }
      />

      <StatAdvert
        items={[
          { value: '6-stage', label: 'Recruitment operating path' },
          { value: '2 modes', label: 'Direct hire or managed staffing' },
          { value: '1 workspace', label: 'Clear brief → shortlist → placement trail' },
        ]}
      />

      <FeatureAdGrid
        eyebrow="Operating path"
        title="Built around how serious hiring actually moves"
        description="No job-board noise. A recruiter-led process with commercial clarity."
        items={steps}
      />

      <IllustrationBand
        eyebrow="Visibility"
        title="Every stage stays accountable"
        description="From brief intake to screening notes and placement follow-through, Dealo keeps the hiring path structured so employers and professionals know what happens next."
        illustration={
          <div className="grid w-full max-w-sm gap-3">
            {[
              { icon: BriefcaseBusiness, label: 'Role brief locked' },
              { icon: UsersRound, label: 'Shortlist prepared' },
              { icon: ShieldCheck, label: 'Placement confirmed' },
            ].map((row) => {
              const Icon = row.icon;
              return (
                <div
                  key={row.label}
                  className="flex items-center gap-3 rounded-xl border border-border bg-surface-elevated/90 px-4 py-3"
                >
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-brand-soft text-brand">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="text-sm font-medium text-foreground">{row.label}</span>
                </div>
              );
            })}
          </div>
        }
      />

      <ProcessRail />

      <FeatureAdGrid
        eyebrow="Why teams choose Dealo"
        title="Clean process. Clear commercial terms."
        description="Whether you hire into your structure or let Dealo run staffing operations, the path stays intentional."
        items={[
          {
            icon: Sparkles,
            title: 'Direct recruitment',
            body: 'Role brief → sourcing → screening → shortlist → interviews → placement into your admin structure.',
          },
          {
            icon: ShieldCheck,
            title: 'Managed staffing',
            body: 'Agreed arrangements with commercial terms — Dealo’s platform carries the hiring load for you.',
          },
          {
            icon: ClipboardCheck,
            title: 'Operational follow-through',
            body: 'Not just introductions. Structured steps, ownership, and next actions at every stage.',
          },
        ]}
      />

      <CtaBanner />
    </div>
  );
}
