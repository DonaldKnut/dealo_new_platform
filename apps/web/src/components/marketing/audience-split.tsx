'use client';

import { ArrowRight, CheckCircle2, Sparkles, UserCheck } from 'lucide-react';
import Link from 'next/link';

import { useModal } from '@/components/modals/modal-context';

import { CtaRow } from './cta-row';
import { MarketingPill } from './marketing-pill';
import { MarketingSection } from './marketing-section';
import { Reveal } from './reveal';

export function AudienceSplit() {
  const { open } = useModal();

  return (
    <MarketingSection containerClassName="grid gap-4 min-[340px]:gap-8 lg:grid-cols-2">
        <Reveal className="group relative overflow-hidden rounded-[1.25rem] border border-border/80 bg-gradient-to-br from-surface to-surface-elevated p-4 shadow-sm transition-all duration-300 hover:border-brand/40 hover:shadow-xl min-[340px]:rounded-[2rem] min-[340px]:p-8 sm:p-10">
          <div className="flex flex-col gap-2 min-[280px]:flex-row min-[280px]:items-center min-[280px]:justify-between">
            <MarketingPill icon={Sparkles} variant="soft" className="normal-case tracking-normal">
              For Employers
            </MarketingPill>
            <span className="font-mono text-[10px] text-muted min-[340px]:text-xs">
              Intake → Shortlist
            </span>
          </div>

          <h2 className="display-title mt-3 text-[1.45rem] font-semibold leading-tight text-foreground min-[340px]:mt-4 min-[340px]:text-3xl sm:text-4xl">
            Hire with total operational clarity
          </h2>

          <p className="mt-2 text-xs leading-relaxed text-muted min-[340px]:mt-3 min-[340px]:text-sm sm:text-base">
            Submit requirements, review ranked shortlists, coordinate interviews, and track
            placements without losing commercial control.
          </p>

          <div className="mt-5 space-y-2 min-[340px]:mt-6 min-[340px]:space-y-2.5">
            {[
              'Screened shortlists delivered within 48 hours',
              'Direct recruitment or fully managed staffing arrangements',
              '0 upfront sourcing fees — pay only on successful placement',
              '90-day replacement warranty for every placement',
            ].map((text) => (
              <div
                key={text}
                className="flex items-start gap-2 text-[11px] text-foreground/85 min-[340px]:items-center min-[340px]:gap-2.5 min-[340px]:text-xs sm:text-sm"
              >
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500 min-[340px]:mt-0 min-[340px]:h-4 min-[340px]:w-4" />
                <span>{text}</span>
              </div>
            ))}
          </div>

          <CtaRow>
            <button
              type="button"
              className="btn-primary shadow-md transition-all hover:shadow-brand/20"
              onClick={() => open('hire')}
            >
              Request talent
              <ArrowRight className="h-4 w-4" />
            </button>
            <Link href="/auth/register" className="btn-secondary">
              Create employer account
            </Link>
          </CtaRow>
        </Reveal>

        <Reveal
          delay={0.1}
          className="group relative overflow-hidden rounded-[1.25rem] border border-emerald-900/50 bg-gradient-to-br from-[#071f14] via-[#0c2c1a] to-[#071f14] p-4 text-[#eaffdf] shadow-xl transition-all duration-300 hover:border-lime-400/40 min-[340px]:rounded-[2rem] min-[340px]:p-8 sm:p-10"
        >
          <div className="pointer-events-none absolute -top-12 -right-12 h-44 w-44 rounded-full bg-lime-400/20 blur-3xl" />

          <div className="flex flex-col gap-2 min-[280px]:flex-row min-[280px]:items-center min-[280px]:justify-between">
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-[#0f3d22] px-2.5 py-1 text-[10px] font-semibold text-[#7cff4d] min-[340px]:px-3 min-[340px]:text-xs">
              <UserCheck className="h-3 w-3" />
              For Professionals
            </span>
            <span className="font-mono text-[10px] text-[#9cbc9a] min-[340px]:text-xs">
              100% Free to Join
            </span>
          </div>

          <h2 className="mt-3 font-display text-[1.45rem] font-semibold tracking-tight text-white min-[340px]:mt-4 min-[340px]:text-3xl sm:text-4xl">
            Build a career profile that works for you
          </h2>

          <p className="mt-2 text-xs leading-relaxed text-[#9cbc9a] min-[340px]:mt-3 min-[340px]:text-sm sm:text-base">
            Create your verified profile, get matched directly with hiring managers, and secure
            top-tier roles across Nigeria and Pan-Africa.
          </p>

          <div className="mt-5 space-y-2 min-[340px]:mt-6 min-[340px]:space-y-2.5">
            {[
              'Zero fees — you never pay to be considered or placed',
              'Access to verified scale-ups and established enterprises',
              'Fast feedback cycles directly from recruitment specialists',
              'Credential verification and recognized talent rating badges',
            ].map((text) => (
              <div
                key={text}
                className="flex items-start gap-2 text-[11px] text-lime-100 min-[340px]:items-center min-[340px]:gap-2.5 min-[340px]:text-xs sm:text-sm"
              >
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-lime-400 min-[340px]:mt-0 min-[340px]:h-4 min-[340px]:w-4" />
                <span>{text}</span>
              </div>
            ))}
          </div>

          <CtaRow>
            <Link
              href="/auth/register"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[#7cff4d] px-5 py-2.5 text-sm font-semibold text-[#071f14] shadow-md transition-all hover:bg-[#a8ff70] hover:shadow-lime-400/20 min-[340px]:px-6 min-[340px]:py-3"
            >
              Join as talent
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/for-professionals"
              className="inline-flex items-center justify-center rounded-full border border-lime-500/30 px-4 py-2.5 text-sm font-semibold text-lime-100 transition hover:bg-lime-950/40 min-[340px]:px-5 min-[340px]:py-3"
            >
              Learn more
            </Link>
          </CtaRow>
        </Reveal>
    </MarketingSection>
  );
}
