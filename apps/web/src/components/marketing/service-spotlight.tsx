'use client';

import { motion } from 'framer-motion';
import {
  ArrowUpRight,
  Briefcase,
  CheckCircle2,
  FileCheck2,
  Layers,
  ShieldCheck,
  Sparkles,
  Users2,
  Zap,
} from 'lucide-react';
import Link from 'next/link';

import { useModal } from '@/components/modals/modal-context';
import { InfoTooltip } from '@/components/ui/info-tooltip';

import { CtaRow } from './cta-row';
import { MarketingPill } from './marketing-pill';
import { Reveal } from './reveal';

const DIRECT_RECRUITMENT_HELP =
  'Process: Role brief → sourcing → screening → shortlist → interviews → placement. Ideal for companies and organizations that intend to hire staff directly into their administrative payroll structure.';

const MANAGED_STAFFING_HELP =
  'Agreed staffing arrangements with clear commercial terms and operational follow-through. Dealo manages the talent operations, contracts, and payroll so you stay focused on execution.';

export function ServiceSpotlight() {
  const { open } = useModal();

  return (
    <section className="relative overflow-hidden border-t border-border/80 py-12 min-[340px]:py-16 sm:py-24 lg:py-28">
      <div className="pointer-events-none absolute top-1/4 left-1/3 h-96 w-96 rounded-full bg-brand/10 blur-[100px]" />

      <div className="container-page grid items-center gap-8 min-[340px]:gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-14">
        <Reveal>
          <MarketingPill icon={Sparkles}>Core Solutions</MarketingPill>

          <h2 className="display-title mt-3 text-[1.55rem] leading-tight text-foreground min-[230px]:text-[1.75rem] min-[340px]:mt-4 min-[340px]:text-3xl sm:text-4xl lg:text-5xl">
            Outcomes for employers. <span className="text-gradient-brand">Opportunity</span> for
            professionals.
          </h2>

          <p className="mt-4 max-w-lg text-sm leading-relaxed text-muted min-[340px]:mt-5 min-[340px]:text-base sm:text-lg">
            Dealo delivers recruitment and managed staffing results through a structured, transparent
            digital operating system — where quality is verified before you ever see a resume.
          </p>

          <CtaRow>
            <button
              type="button"
              className="btn-primary shadow-md transition-all hover:shadow-brand/20"
              onClick={() => open('hire')}
            >
              Start a hiring request
            </button>
            <Link href="/services" className="btn-secondary">
              Compare all services
            </Link>
          </CtaRow>
        </Reveal>

        <div className="space-y-4 min-[340px]:space-y-6">
          <Reveal delay={0.1}>
            <div className="group relative overflow-hidden rounded-[1.25rem] border border-border/80 bg-surface-elevated/90 p-4 shadow-sm backdrop-blur-sm transition-all duration-300 hover:border-brand/50 hover:shadow-xl min-[340px]:rounded-[1.75rem] min-[340px]:p-6 sm:p-8">
              <div className="flex items-start justify-between gap-2 min-[340px]:gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 min-[340px]:gap-2.5">
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-soft text-brand min-[340px]:h-9 min-[340px]:w-9">
                      <Briefcase className="h-4 w-4" />
                    </span>
                    <h3 className="font-display text-xl font-semibold text-foreground min-[340px]:text-2xl">
                      Direct recruitment
                    </h3>
                    <InfoTooltip label="Direct recruitment" content={DIRECT_RECRUITMENT_HELP} />
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-muted min-[340px]:mt-3 min-[340px]:text-sm">
                    Full-cycle recruitment: Intake brief → sourcing → technical screening → curated
                    shortlist → placement into your payroll.
                  </p>
                </div>

                <Link
                  href="/services/direct-recruitment"
                  aria-label="Learn more about direct recruitment"
                  className="shrink-0 rounded-full border border-border/70 p-1.5 text-brand transition hover:border-brand hover:bg-brand-soft min-[340px]:p-2"
                >
                  <ArrowUpRight className="h-4 w-4 min-[340px]:h-5 min-[340px]:w-5" />
                </Link>
              </div>

              <div className="mt-4 rounded-xl border border-border/70 bg-surface/70 p-3 min-[340px]:mt-6 min-[340px]:rounded-2xl min-[340px]:p-4 sm:p-5">
                <div className="mb-3 flex flex-col gap-1 text-[11px] font-semibold text-muted min-[300px]:flex-row min-[300px]:items-center min-[300px]:justify-between min-[340px]:mb-3.5 min-[340px]:text-xs">
                  <span className="flex items-center gap-1.5 text-foreground">
                    <Zap className="h-3.5 w-3.5 text-brand" />
                    Disciplined 4-Step Intake Path
                  </span>
                  <span className="font-medium text-brand">Avg. 48h Delivery</span>
                </div>

                <div className="grid grid-cols-1 gap-2 min-[280px]:grid-cols-2 sm:grid-cols-4">
                  {[
                    { step: '01', title: 'Role Intake', desc: 'Brief locked' },
                    { step: '02', title: 'Deep Sourcing', desc: 'Top 1% screened' },
                    { step: '03', title: 'Curated 3', desc: 'Ranked shortlist' },
                    { step: '04', title: 'Placement', desc: 'Offer & signed' },
                  ].map((s, idx) => (
                    <div
                      key={s.step}
                      className="rounded-xl border border-border/60 bg-surface-elevated/80 p-2.5 transition-colors group-hover:border-brand/30"
                    >
                      <span className="text-[10px] font-bold tracking-wider text-brand">
                        {s.step}
                      </span>
                      <p className="mt-1 text-xs font-semibold text-foreground">{s.title}</p>
                      <p className="text-[11px] text-muted">{s.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.18}>
            <div className="group relative overflow-hidden rounded-[1.25rem] border border-border/80 bg-surface-elevated/90 p-4 shadow-sm backdrop-blur-sm transition-all duration-300 hover:border-brand/50 hover:shadow-xl min-[340px]:rounded-[1.75rem] min-[340px]:p-6 sm:p-8">
              <div className="flex items-start justify-between gap-2 min-[340px]:gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 min-[340px]:gap-2.5">
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-soft text-brand min-[340px]:h-9 min-[340px]:w-9">
                      <Users2 className="h-4 w-4" />
                    </span>
                    <h3 className="font-display text-xl font-semibold text-foreground min-[340px]:text-2xl">
                      Managed staffing
                    </h3>
                    <InfoTooltip label="Managed staffing" content={MANAGED_STAFFING_HELP} />
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-muted min-[340px]:mt-3 min-[340px]:text-sm">
                    Turnkey workforce management: Dealo provides verified specialists and absorbs
                    the operational, payroll, and compliance overhead.
                  </p>
                </div>

                <Link
                  href="/services/managed-staffing"
                  aria-label="Learn more about managed staffing"
                  className="shrink-0 rounded-full border border-border/70 p-1.5 text-brand transition hover:border-brand hover:bg-brand-soft min-[340px]:p-2"
                >
                  <ArrowUpRight className="h-4 w-4 min-[340px]:h-5 min-[340px]:w-5" />
                </Link>
              </div>

              <div className="mt-4 rounded-xl border border-border/70 bg-surface/70 p-3 min-[340px]:mt-6 min-[340px]:rounded-2xl min-[340px]:p-4 sm:p-5">
                <div className="mb-3 flex flex-col gap-1 text-[11px] font-semibold text-muted min-[300px]:flex-row min-[300px]:items-center min-[300px]:justify-between min-[340px]:mb-3.5 min-[340px]:text-xs">
                  <span className="flex items-center gap-1.5 text-foreground">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                    Zero Admin Burden Architecture
                  </span>
                  <span className="inline-flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="h-3 w-3" /> SLA Guaranteed
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <div className="flex items-center gap-2.5 rounded-xl border border-border/60 bg-surface-elevated/80 p-2.5">
                    <FileCheck2 className="h-4 w-4 text-brand shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-foreground">Payroll & Taxes</p>
                      <p className="text-[10px] text-muted">100% Handled by Dealo</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 rounded-xl border border-border/60 bg-surface-elevated/80 p-2.5">
                    <Layers className="h-4 w-4 text-brand shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-foreground">Instant Backfill</p>
                      <p className="text-[10px] text-muted">48h replacement warranty</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 rounded-xl border border-border/60 bg-surface-elevated/80 p-2.5">
                    <Users2 className="h-4 w-4 text-brand shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-foreground">Dedicated PM</p>
                      <p className="text-[10px] text-muted">Direct escalation channel</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
