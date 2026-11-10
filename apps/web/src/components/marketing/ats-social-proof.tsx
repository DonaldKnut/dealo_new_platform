'use client';

import { motion } from 'framer-motion';
import { ArrowRight, Quote, Star } from 'lucide-react';

import { MarketingPill } from './marketing-pill';
import { MarketingSection } from './marketing-section';
import { Reveal } from './reveal';

const TESTIMONIALS = [
  {
    quote:
      "We used to spend two full days just reading CVs for a single role. Dealo's AI cut that to under an hour. And unlike other tools, it tells you exactly why it scored each person — so we actually trust it.",
    name: 'Chinyere Obi',
    title: 'Head of People, Paystack-backed fintech',
    initials: 'CO',
    avatarBg: 'from-emerald-600 to-teal-800',
    stars: 5,
    tag: 'Fintech · 120 employees',
  },
  {
    quote:
      'The pipeline board alone was worth switching. Everyone on our team sees the same thing. No more "did you follow up with that candidate?" messages at 9pm.',
    name: 'Femi Adeyemi',
    title: 'Talent Acquisition Lead, Lagos startup',
    initials: 'FA',
    avatarBg: 'from-blue-600 to-indigo-800',
    stars: 5,
    tag: 'E-commerce · 60 employees',
  },
  {
    quote:
      'We hired a Finance Manager and a Senior Engineer in the same week. Dealo handled scheduling, reminders, the offer letter — everything. I barely touched my email.',
    name: 'Amaka Eze',
    title: 'COO, Abuja-based logistics company',
    initials: 'AE',
    avatarBg: 'from-violet-600 to-purple-800',
    stars: 5,
    tag: 'Logistics · 200+ employees',
  },
] as const;

export function AtsSocialProof({ onStart }: { onStart?: () => void }) {
  return (
    <MarketingSection className="bg-gradient-to-b from-surface-elevated/30 to-surface/60">
      <Reveal>
        <div className="flex flex-col items-start gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <MarketingPill icon={Star}>What teams say</MarketingPill>
            <h2 className="display-title mt-3 max-w-2xl text-[1.55rem] leading-tight text-foreground min-[340px]:mt-4 min-[340px]:text-3xl sm:text-4xl lg:text-5xl">
              Built for teams that hire seriously
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">
              Nigerian companies across fintech, logistics, and e-commerce are cutting hiring time
              in half.
            </p>
          </div>
          {onStart && (
            <button
              type="button"
              className="btn-primary w-full shrink-0 min-[400px]:w-auto"
              onClick={onStart}
            >
              Start free
              <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </Reveal>

      <div className="mt-10 grid grid-cols-1 gap-4 min-[340px]:mt-14 min-[560px]:grid-cols-2 min-[340px]:gap-5 lg:grid-cols-3">
        {TESTIMONIALS.map((t, i) => (
          <Reveal key={t.name} delay={i * 0.1} className="h-full">
            <motion.div
              whileHover={{ y: -5 }}
              transition={{ duration: 0.25 }}
              className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border/80 bg-surface-elevated p-5 shadow-sm transition-all hover:border-brand/30 hover:shadow-xl min-[340px]:p-6"
            >
              {/* Hover glow */}
              <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-brand/5 opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100" />

              {/* Stars */}
              <div className="flex items-center gap-0.5">
                {Array.from({ length: t.stars }).map((_, si) => (
                  <Star key={si} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                ))}
              </div>

              {/* Quote */}
              <div className="relative mt-4 flex-1">
                <Quote className="absolute -left-1 -top-1 h-5 w-5 text-brand/20" />
                <p className="relative pl-4 text-sm leading-relaxed text-foreground/80 min-[340px]:text-[15px]">
                  &ldquo;{t.quote}&rdquo;
                </p>
              </div>

              {/* Author */}
              <div className="mt-5 flex items-center gap-3 border-t border-border/60 pt-4">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${t.avatarBg} text-xs font-bold text-white shadow-sm`}
                >
                  {t.initials}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">{t.name}</p>
                  <p className="truncate text-[11px] text-muted">{t.title}</p>
                </div>
                <span className="ml-auto shrink-0 rounded-full bg-surface px-2 py-0.5 text-[9px] font-semibold text-muted ring-1 ring-border">
                  {t.tag}
                </span>
              </div>
            </motion.div>
          </Reveal>
        ))}
      </div>

      {/* Bottom trust row */}
      <Reveal delay={0.3}>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-6 rounded-2xl border border-border/70 bg-surface-elevated/60 px-5 py-5 text-center min-[340px]:mt-14 min-[340px]:gap-8 min-[340px]:px-8">
          {[
            { value: '400+', label: 'Companies hiring on Dealo' },
            { value: '10k+', label: 'Candidates screened by AI' },
            { value: '4.9 / 5', label: 'Average recruiter rating' },
            { value: 'Free', label: 'During early access' },
          ].map((s) => (
            <div key={s.label} className="flex flex-col items-center gap-0.5">
              <span className="font-display text-xl font-black text-foreground min-[340px]:text-2xl">
                {s.value}
              </span>
              <span className="text-[10px] font-medium text-muted min-[340px]:text-xs">
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </Reveal>
    </MarketingSection>
  );
}

