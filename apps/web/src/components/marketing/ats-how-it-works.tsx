'use client';

import { motion } from 'framer-motion';
import {
  ArrowRight,
  Bot,
  Briefcase,
  CalendarCheck2,
  FileSignature,
  Globe2,
} from 'lucide-react';
import { useState } from 'react';

import { MarketingPill } from './marketing-pill';
import { MarketingSection } from './marketing-section';
import { Reveal } from './reveal';

const STEPS = [
  {
    num: '01',
    icon: Globe2,
    title: 'Post your job in 2 minutes',
    body: 'Write a job description, set your must-haves, and go live. Your Dealo careers page updates automatically — share one clean link everywhere.',
    highlight: 'Free careers page included',
    accent: 'from-sky-500 to-cyan-600',
    ring: 'ring-sky-500/20',
    bg: 'bg-sky-500/10',
    text: 'text-sky-600 dark:text-sky-400',
  },
  {
    num: '02',
    icon: Briefcase,
    title: 'Applications flow in automatically',
    body: 'CVs arrive from your careers page, LinkedIn, job boards, and direct referrals. Every application lands in one board — nothing gets buried in email.',
    highlight: 'Multi-source aggregation',
    accent: 'from-violet-500 to-purple-600',
    ring: 'ring-violet-500/20',
    bg: 'bg-violet-500/10',
    text: 'text-violet-600 dark:text-violet-400',
  },
  {
    num: '03',
    icon: Bot,
    title: 'AI reads every CV for you',
    body: "Dealo's AI scores each candidate against your must-haves and shows you exactly why. You see the reasoning — not just a number. Skip the 90% that don't fit; focus on the ones that do.",
    highlight: '94% of CVs screened automatically',
    accent: 'from-emerald-500 to-teal-600',
    ring: 'ring-emerald-500/20',
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-600 dark:text-emerald-400',
  },
  {
    num: '04',
    icon: CalendarCheck2,
    title: 'Book interviews without the back-and-forth',
    body: 'Share your calendar. Candidates pick a slot that suits them. Reminders go out automatically. No more "does Thursday at 2pm work for you?" threads.',
    highlight: 'Zero-friction scheduling',
    accent: 'from-amber-500 to-orange-600',
    ring: 'ring-amber-500/20',
    bg: 'bg-amber-500/10',
    text: 'text-amber-600 dark:text-amber-400',
  },
  {
    num: '05',
    icon: FileSignature,
    title: 'Send offers and close the hire',
    body: 'Draft and send offer letters inside Dealo. Collect e-signatures and onboarding documents without a single email attachment.',
    highlight: 'Full offer & document workflow',
    accent: 'from-rose-500 to-pink-600',
    ring: 'ring-rose-500/20',
    bg: 'bg-rose-500/10',
    text: 'text-rose-600 dark:text-rose-400',
  },
] as const;

export function AtsHowItWorks({ onStart }: { onStart?: () => void }) {
  const [active, setActive] = useState<number>(0);

  const step = STEPS[active];
  const StepIcon = step.icon;

  return (
    <MarketingSection id="how-it-works">
      <Reveal>
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <MarketingPill icon={ArrowRight}>How it works</MarketingPill>
            <h2 className="display-title mt-3 max-w-2xl text-[1.55rem] leading-tight text-foreground min-[340px]:mt-4 min-[340px]:text-3xl sm:text-4xl lg:text-5xl">
              From job post to signed offer — in one place
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">
              Five steps. One tool. No spreadsheet, no email thread, no missed candidate.
            </p>
          </div>
          {onStart && (
            <button
              type="button"
              className="btn-primary w-full shrink-0 self-stretch min-[400px]:w-auto min-[400px]:self-start md:self-end"
              onClick={onStart}
            >
              Start free
              <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </Reveal>

      <div className="mt-10 grid grid-cols-1 gap-5 min-[340px]:mt-14 lg:grid-cols-[auto_1fr]">
        {/* Step selector sidebar */}
        <div className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-x-visible lg:pb-0">
          {STEPS.map((s, i) => {
            const SIcon = s.icon;
            const isActive = active === i;
            return (
              <button
                key={s.num}
                type="button"
                onClick={() => setActive(i)}
                className={`group flex shrink-0 items-center gap-3 rounded-xl border px-3.5 py-2.5 text-left transition-all duration-200 lg:w-64 ${
                  isActive
                    ? `border-brand/40 bg-brand-soft/60 shadow-sm`
                    : 'border-border/70 bg-surface-elevated/60 hover:border-brand/20 hover:bg-surface-elevated'
                }`}
              >
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${s.bg} transition-transform group-hover:scale-110`}
                >
                  <SIcon className={`h-4 w-4 ${s.text}`} />
                </span>
                <div className="min-w-0 hidden sm:block lg:block">
                  <p
                    className={`font-mono text-[9px] font-bold tracking-widest ${isActive ? 'text-brand' : 'text-muted'}`}
                  >
                    STEP {s.num}
                  </p>
                  <p
                    className={`mt-0.5 truncate text-xs font-semibold ${isActive ? 'text-foreground' : 'text-muted'}`}
                  >
                    {s.title}
                  </p>
                </div>
                {/* Mobile: just show step number */}
                <span className="font-mono text-xs font-bold text-muted sm:hidden">
                  {s.num}
                </span>
              </button>
            );
          })}
        </div>

        {/* Detail panel */}
        <motion.div
          key={active}
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className={`relative overflow-hidden rounded-2xl border ${step.ring} bg-surface-elevated p-5 shadow-lg min-[340px]:p-7 sm:p-10`}
        >
          {/* Ambient gradient */}
          <div
            className={`pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-gradient-to-br ${step.accent} opacity-10 blur-3xl`}
          />

          <div className="relative">
            {/* Step badge + icon row */}
            <div className="flex items-center gap-4">
              <span
                className={`inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${step.accent} shadow-lg`}
              >
                <StepIcon className="h-7 w-7 text-white" />
              </span>
              <span
                className={`font-mono text-4xl font-black tracking-tight ${step.text} opacity-20`}
              >
                {step.num}
              </span>
            </div>

            <h3 className="mt-5 font-display text-xl font-bold text-foreground min-[340px]:text-2xl sm:text-3xl">
              {step.title}
            </h3>

            <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted min-[340px]:text-base">
              {step.body}
            </p>

            {/* Highlight pill */}
            <div
              className={`mt-6 inline-flex items-center gap-2 rounded-xl ${step.bg} px-4 py-2 ring-1 ${step.ring}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full bg-gradient-to-br ${step.accent}`} />
              <span className={`text-xs font-bold ${step.text}`}>{step.highlight}</span>
            </div>

            {/* Step navigator dots */}
            <div className="mt-8 flex items-center gap-2">
              {STEPS.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setActive(i)}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === active
                      ? `w-6 bg-gradient-to-r ${step.accent}`
                      : 'w-1.5 bg-border hover:bg-muted'
                  }`}
                  aria-label={`Go to step ${i + 1}`}
                />
              ))}
              <span className="ml-2 text-[10px] font-medium text-muted">
                {active + 1} / {STEPS.length}
              </span>
            </div>
          </div>
        </motion.div>
      </div>
    </MarketingSection>
  );
}

