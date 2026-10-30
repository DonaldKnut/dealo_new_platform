'use client';

import {
  ArrowRight,
  CheckCircle2,
  FileSpreadsheet,
  Handshake,
  Search,
  Sparkles,
  UsersRound,
} from 'lucide-react';
import { useState } from 'react';

import { useModal } from '@/components/modals/modal-context';

import { MarketingPill } from './marketing-pill';
import { MarketingSection } from './marketing-section';
import { Reveal } from './reveal';

const steps = [
  {
    num: '01',
    title: 'Brief Intake',
    timeline: 'Within 2 Hours',
    icon: FileSpreadsheet,
    copy: 'Submit role requirements, tech stack, seniority, budget, and commercial terms in our structured intake.',
    highlight: 'Role requirements calibration with senior talent strategist',
  },
  {
    num: '02',
    title: 'Screen & Verify',
    timeline: 'Within 24-36 Hours',
    icon: Search,
    copy: 'Dealo recruiters conduct technical assessments, live code reviews, and reference checks against your brief.',
    highlight: 'Only candidates in the top 2% make the shortlist',
  },
  {
    num: '03',
    title: 'Interview & Calibrate',
    timeline: 'Within 48 Hours',
    icon: UsersRound,
    copy: 'Receive a curated shortlist of 2–3 ranked professionals with full vetting scorecards and video intros.',
    highlight: 'One-click interview booking & standardized rubric',
  },
  {
    num: '04',
    title: 'Place & Guarantee',
    timeline: 'Offer & Onboarding',
    icon: Handshake,
    copy: 'Seamless contracting, automated billing, and ongoing retention guarantee for total hiring confidence.',
    highlight: 'Protected by our 90-day replacement warranty',
  },
];

export function ProcessRail() {
  const { open } = useModal();
  const [activeStep, setActiveStep] = useState<number>(0);

  return (
    <MarketingSection>
      <Reveal>
        <div className="flex flex-col gap-4 min-[340px]:gap-6 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <MarketingPill icon={Sparkles}>The Dealo Engine</MarketingPill>
            <h2 className="display-title mt-3 max-w-2xl text-[1.55rem] leading-tight text-foreground min-[340px]:mt-4 min-[340px]:text-3xl sm:text-4xl lg:text-5xl">
              A recruitment operating system, not an open job board.
            </h2>
          </div>
          <button
            type="button"
            className="btn-primary w-full shrink-0 self-stretch min-[400px]:w-auto min-[400px]:self-start md:self-end"
            onClick={() => open('hire')}
          >
            Start hiring now
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </Reveal>

      <div className="mt-8 min-[340px]:mt-14 sm:mt-16">
        <div className="grid gap-3 min-[340px]:gap-4 md:grid-cols-2 md:gap-5 xl:grid-cols-4">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isActive = activeStep === index;
            return (
              <Reveal key={step.title} delay={index * 0.08}>
                <div
                  onClick={() => setActiveStep(index)}
                  className={`group relative h-full cursor-pointer rounded-xl border p-3.5 transition-all duration-300 min-[340px]:rounded-2xl min-[340px]:p-5 sm:p-6 ${
                    isActive
                      ? 'border-brand bg-surface-elevated shadow-lg ring-1 ring-brand/30'
                      : 'border-border/70 bg-surface/50 hover:border-brand/40 hover:bg-surface-elevated/70'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[10px] font-bold tracking-wider text-brand min-[340px]:text-xs">
                      {step.num}
                    </span>
                    <span className="truncate rounded-full bg-brand-soft/70 px-2 py-0.5 text-[9px] font-semibold text-brand min-[340px]:px-2.5 min-[340px]:text-[10px]">
                      {step.timeline}
                    </span>
                  </div>

                  <div className="mt-3 flex h-9 w-9 items-center justify-center rounded-xl border border-border/80 bg-surface-elevated text-brand shadow-sm transition-transform group-hover:scale-105 min-[340px]:mt-4 min-[340px]:h-11 min-[340px]:w-11">
                    <Icon className="h-4 w-4 min-[340px]:h-5 min-[340px]:w-5" />
                  </div>

                  <h3 className="mt-3 font-display text-lg font-semibold text-foreground min-[340px]:mt-4 min-[340px]:text-xl">
                    {step.title}
                  </h3>
                  <p className="mt-1.5 text-[11px] leading-relaxed text-muted min-[340px]:mt-2 min-[340px]:text-xs sm:text-sm">
                    {step.copy}
                  </p>

                  <div className="mt-4 flex items-start gap-1.5 border-t border-border/60 pt-3 text-[10px] font-medium text-teal-700 min-[340px]:mt-5 min-[340px]:text-[11px] dark:text-teal-300">
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                    <span>{step.highlight}</span>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </MarketingSection>
  );
}
