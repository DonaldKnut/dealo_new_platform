'use client';

import { motion } from 'framer-motion';
import { ArrowRight, CheckCircle2, ShieldCheck, Zap } from 'lucide-react';
import Link from 'next/link';

import { useModal } from '@/components/modals/modal-context';

import { CtaRow } from './cta-row';
import { HeroOrbs } from './hero-orbs';
import { TalentOpsConsole } from './talent-ops-console';

export function HeroSection() {
  const { open } = useModal();

  return (
    <section className="relative overflow-hidden pt-14 min-[230px]:pt-[4.25rem] min-[340px]:pt-[4.75rem] sm:pt-20">
      <HeroOrbs />

      <div className="container-page relative grid min-h-[calc(100svh-3.5rem)] items-center gap-8 py-8 min-[230px]:gap-10 min-[230px]:py-10 min-[340px]:py-14 sm:py-16 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14">
        <div className="max-w-2xl min-w-0">
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55 }}
            className="mb-4 inline-flex max-w-full items-center gap-1.5 rounded-full border border-brand/30 bg-surface-elevated/80 px-2.5 py-1 text-[10px] font-medium text-foreground shadow-sm backdrop-blur-md min-[340px]:mb-5 min-[340px]:gap-2 min-[340px]:px-3.5 min-[340px]:py-1.5 min-[340px]:text-xs"
          >
            <span className="relative flex h-1.5 w-1.5 shrink-0 min-[340px]:h-2 min-[340px]:w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-full w-full rounded-full bg-emerald-500" />
            </span>
            <span className="shrink-0 font-semibold text-brand">Dealo 2.0</span>
            <span className="hidden text-muted min-[280px]:inline">•</span>
            <span className="min-w-0 truncate text-muted">Structured Recruitment & Staffing</span>
          </motion.div>

          <motion.h1
            className="display-title text-[1.55rem] leading-[1.1] text-foreground min-[230px]:text-[1.75rem] min-[340px]:text-4xl sm:text-5xl lg:text-[3.75rem]"
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            Find, place, and manage the{' '}
            <span className="text-gradient-brand">exceptional talent</span> your business needs.
          </motion.h1>

          <motion.p
            className="mt-3 max-w-xl text-sm leading-relaxed text-muted min-[340px]:mt-5 min-[340px]:text-base sm:text-xl"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.16 }}
          >
            A disciplined recruitment engine and managed staffing solution for high-growth African
            businesses — connecting employers with pre-vetted specialists in under 48 hours.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.24 }}
          >
            <CtaRow align="center" className="mt-6 min-[340px]:mt-8">
              <button
                type="button"
                className="btn-primary group shadow-lg shadow-brand/20 transition-all hover:shadow-brand/35"
                onClick={() => open('hire')}
              >
                Request talent
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </button>
              <Link href="/auth/register" className="btn-secondary transition-all">
                Join as a professional
              </Link>
            </CtaRow>
          </motion.div>

          <motion.div
            className="mt-7 grid grid-cols-1 gap-3 border-t border-border/80 pt-6 min-[280px]:grid-cols-2 min-[340px]:mt-10 min-[340px]:gap-4 min-[340px]:pt-8 sm:grid-cols-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.35 }}
          >
            {[
              { icon: Zap, title: '48h Shortlists', sub: 'Rapid role intake' },
              { icon: ShieldCheck, title: 'Pre-Vetted', sub: 'Technical & culture' },
              { icon: CheckCircle2, title: '98.4% Retention', sub: 'Placement protection' },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="flex min-w-0 items-center gap-2">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-foreground">{item.title}</p>
                    <p className="truncate text-[11px] text-muted">{item.sub}</p>
                  </div>
                </div>
              );
            })}
          </motion.div>
        </div>

        <motion.div
          className="relative min-w-0 lg:pl-4"
          initial={{ opacity: 0, scale: 0.94, x: 20 }}
          animate={{ opacity: 1, scale: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
        >
          <TalentOpsConsole />
        </motion.div>
      </div>
    </section>
  );
}
