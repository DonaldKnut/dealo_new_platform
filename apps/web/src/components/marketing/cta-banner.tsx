'use client';

import { motion } from 'framer-motion';
import { ArrowRight, Clock, MessageSquare, ShieldCheck, Sparkles, Zap } from 'lucide-react';

import { useModal } from '@/components/modals/modal-context';

import { CtaRow } from './cta-row';
import { MarketingPill } from './marketing-pill';
import { MarketingSection } from './marketing-section';

export function CtaBanner() {
  const { open } = useModal();

  return (
    <MarketingSection pad="cta">
        <motion.div
          className="relative overflow-hidden rounded-[1.5rem] border border-brand/30 px-4 py-8 shadow-2xl min-[340px]:rounded-[2.5rem] min-[340px]:px-8 min-[340px]:py-14 sm:px-14 sm:py-16"
          style={{
            background:
              'radial-gradient(ellipse 90% 60% at 20% 20%, color-mix(in srgb, var(--accent) 26%, transparent), transparent 50%), radial-gradient(ellipse 80% 60% at 85% 85%, color-mix(in srgb, var(--brand) 22%, transparent), transparent 55%), var(--surface-elevated)',
          }}
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.7 }}
        >
          {/* Animated decorative orbs */}
          <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-brand/20 blur-3xl animate-pulse-subtle" />
          <div className="pointer-events-none absolute -left-10 -bottom-10 h-64 w-64 rounded-full bg-accent/15 blur-3xl" />

          <div className="relative z-10 max-w-3xl">
            <MarketingPill icon={Sparkles} className="border-brand/40">
              Get Started In Minutes
            </MarketingPill>

            <h2 className="display-title mt-3 text-[1.55rem] leading-tight font-semibold text-foreground min-[340px]:mt-4 min-[340px]:text-3xl sm:text-5xl lg:text-6xl">
              Tell Dealo who you need.{' '}
              <span className="text-gradient-brand">We take the next operational step.</span>
            </h2>

            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted min-[340px]:mt-4 min-[340px]:text-base sm:text-lg">
              No endless resumes. No opaque recruiters. Submit your brief, receive a screened
              shortlist in 48 hours, and start interviewing top-tier candidates.
            </p>

            <CtaRow align="center">
              <button
                type="button"
                className="btn-primary px-5 py-3 text-sm shadow-lg shadow-brand/25 transition-all hover:shadow-brand/40 min-[340px]:px-6 min-[340px]:py-3.5 min-[340px]:text-base"
                onClick={() => open('hire')}
              >
                Open hiring request
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                className="btn-secondary px-5 py-3 text-sm min-[340px]:px-6 min-[340px]:py-3.5 min-[340px]:text-base"
                onClick={() => open('contact')}
              >
                <MessageSquare className="h-4 w-4" />
                Talk with our talent team
              </button>
            </CtaRow>

            <div className="mt-7 flex flex-col gap-3 border-t border-border/70 pt-6 text-[11px] text-muted min-[340px]:mt-10 min-[340px]:flex-row min-[340px]:flex-wrap min-[340px]:items-center min-[340px]:gap-6 min-[340px]:pt-8 min-[340px]:text-xs">
              <span className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-brand" />
                Average shortlist turnaround: <strong>36–48 hrs</strong>
              </span>
              <span className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-500" />
                90-day replacement guarantee
              </span>
              <span className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-500" />
                Zero upfront sourcing fees
              </span>
            </div>
          </div>
        </motion.div>
    </MarketingSection>
  );
}
