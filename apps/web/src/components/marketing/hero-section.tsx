'use client';

import { motion } from 'framer-motion';
import { ArrowRight, CheckCircle2, ShieldCheck, Zap } from 'lucide-react';
import Link from 'next/link';

import { useLocale } from '@/components/i18n/locale-context';
import { useModal } from '@/components/modals/modal-context';

import { CtaRow } from './cta-row';
import { HeroOrbs } from './hero-orbs';
import { TalentOpsConsole } from './talent-ops-console';

export function HeroSection() {
  const { open } = useModal();
  const { t } = useLocale();

  return (
    <section className="relative overflow-hidden pt-14 min-[230px]:pt-[4.25rem] min-[340px]:pt-[4.75rem] sm:pt-20">
      <HeroOrbs />

      <div className="container-page relative grid min-h-[calc(100svh-3.5rem)] items-center gap-8 py-8 min-[230px]:gap-10 min-[230px]:py-10 min-[340px]:py-14 sm:py-16 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14">
        <div className="max-w-2xl min-w-0">
          <motion.h1
            className="display-title text-[1.55rem] leading-[1.1] text-foreground min-[230px]:text-[1.75rem] min-[340px]:text-4xl sm:text-5xl lg:text-[3.75rem]"
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            {t('hero.titleBefore')}{' '}
            <span className="text-gradient-brand">{t('hero.titleAccent')}</span>
            {t('hero.titleAfter')}
          </motion.h1>

          <motion.p
            className="mt-3 max-w-xl text-sm leading-relaxed text-muted min-[340px]:mt-5 min-[340px]:text-base sm:text-xl"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.16 }}
          >
            {t('hero.subtitle')}
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
                {t('cta.hire')}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </button>
              <Link href="/auth/register" className="btn-secondary transition-all">
                {t('cta.join')}
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
              { icon: Zap, title: t('home.hero.f1.title'), sub: t('home.hero.f1.sub') },
              { icon: ShieldCheck, title: t('home.hero.f2.title'), sub: t('home.hero.f2.sub') },
              { icon: CheckCircle2, title: t('home.hero.f3.title'), sub: t('home.hero.f3.sub') },
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
