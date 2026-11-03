'use client';

import { motion, useReducedMotion } from 'framer-motion';
import {
  ArrowRight,
  CheckCircle2,
  FileSpreadsheet,
  Handshake,
  RotateCcw,
  Search,
  Sparkles,
  UsersRound,
} from 'lucide-react';
import { useState } from 'react';

import { useLocale } from '@/components/i18n/locale-context';
import { useModal } from '@/components/modals/modal-context';

import { MarketingPill } from './marketing-pill';
import { MarketingSection } from './marketing-section';
import { Reveal } from './reveal';

export function ProcessRail() {
  const { open } = useModal();
  const { t } = useLocale();
  const reduce = useReducedMotion();
  const [flipped, setFlipped] = useState<number | null>(null);

  const steps = [
    {
      num: '01',
      title: t('home.process.1.title'),
      timeline: t('home.process.1.time'),
      icon: FileSpreadsheet,
      copy: t('home.process.1.copy'),
      highlight: t('home.process.1.hi'),
    },
    {
      num: '02',
      title: t('home.process.2.title'),
      timeline: t('home.process.2.time'),
      icon: Search,
      copy: t('home.process.2.copy'),
      highlight: t('home.process.2.hi'),
    },
    {
      num: '03',
      title: t('home.process.3.title'),
      timeline: t('home.process.3.time'),
      icon: UsersRound,
      copy: t('home.process.3.copy'),
      highlight: t('home.process.3.hi'),
    },
    {
      num: '04',
      title: t('home.process.4.title'),
      timeline: t('home.process.4.time'),
      icon: Handshake,
      copy: t('home.process.4.copy'),
      highlight: t('home.process.4.hi'),
    },
  ];

  const toggleFlip = (index: number) => {
    setFlipped((current) => (current === index ? null : index));
  };

  return (
    <MarketingSection>
      <Reveal>
        <div className="flex flex-col gap-4 min-[340px]:gap-6 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <MarketingPill icon={Sparkles}>{t('home.process.pill')}</MarketingPill>
            <h2 className="display-title mt-3 max-w-2xl text-[1.55rem] leading-tight text-foreground min-[340px]:mt-4 min-[340px]:text-3xl sm:text-4xl lg:text-5xl">
              {t('home.process.title')}
            </h2>
            <p className="mt-2 max-w-xl text-xs text-muted min-[340px]:mt-3 min-[340px]:text-sm">
              {t('home.process.hint')}
            </p>
          </div>
          <button
            type="button"
            className="btn-primary w-full shrink-0 self-stretch min-[400px]:w-auto min-[400px]:self-start md:self-end"
            onClick={() => open('hire')}
          >
            {t('home.process.cta')}
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </Reveal>

      <div className="mt-8 min-[340px]:mt-14 sm:mt-16">
        <div className="card-grid grid gap-3 min-[340px]:gap-4 md:grid-cols-2 md:gap-5 xl:grid-cols-4">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isFlipped = flipped === index;

            return (
              <Reveal key={step.num} delay={index * 0.08} className="h-full">
                <div className="group h-full min-h-[14.5rem] [perspective:1200px] min-[340px]:min-h-[16.5rem]">
                  <button
                    type="button"
                    aria-pressed={isFlipped}
                    aria-label={step.title}
                    onClick={() => toggleFlip(index)}
                    className="relative block h-full min-h-[14.5rem] w-full text-left min-[340px]:min-h-[16.5rem]"
                  >
                    <motion.div
                      className="relative h-full min-h-[14.5rem] w-full [transform-style:preserve-3d] min-[340px]:min-h-[16.5rem]"
                      animate={reduce ? undefined : { rotateY: isFlipped ? 180 : 0 }}
                      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <div
                        className={`ui-card absolute inset-0 overflow-hidden p-3.5 shadow-sm [backface-visibility:hidden] min-[340px]:p-5 sm:p-6 ${
                          reduce && isFlipped ? 'invisible' : ''
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

                        <div className="mt-3 flex h-9 w-9 items-center justify-center rounded-xl border border-border/80 bg-surface-elevated text-brand shadow-sm min-[340px]:mt-4 min-[340px]:h-11 min-[340px]:w-11">
                          <Icon className="h-4 w-4 min-[340px]:h-5 min-[340px]:w-5" />
                        </div>

                        <h3 className="mt-3 font-display text-lg font-semibold text-foreground min-[340px]:mt-4 min-[340px]:text-xl">
                          {step.title}
                        </h3>
                        <p className="mt-1.5 line-clamp-3 text-[11px] leading-relaxed text-muted min-[340px]:mt-2 min-[340px]:text-xs sm:text-sm">
                          {step.copy}
                        </p>

                        <span className="mt-auto inline-flex items-center gap-1.5 pt-4 text-[10px] font-semibold text-brand min-[340px]:text-[11px]">
                          <RotateCcw className="h-3 w-3" />
                          {t('home.process.flip')}
                        </span>
                      </div>

                      <div
                        className={`ui-card absolute inset-0 overflow-hidden border-brand/40 bg-brand-soft/45 p-3.5 shadow-md [backface-visibility:hidden] [transform:rotateY(180deg)] min-[340px]:p-5 sm:p-6 dark:bg-brand/10 ${
                          reduce ? (isFlipped ? '' : 'invisible') : ''
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-[10px] font-bold tracking-wider text-brand min-[340px]:text-xs">
                            {step.num}
                          </span>
                          <span className="truncate rounded-full bg-surface-elevated px-2 py-0.5 text-[9px] font-semibold text-brand min-[340px]:px-2.5 min-[340px]:text-[10px]">
                            {step.timeline}
                          </span>
                        </div>

                        <h3 className="mt-4 font-display text-lg font-semibold text-foreground min-[340px]:text-xl">
                          {step.title}
                        </h3>

                        <div className="mt-4 flex flex-1 flex-col justify-center rounded-xl border border-brand/20 bg-surface-elevated/90 p-3 min-[340px]:p-4">
                          <div className="flex items-start gap-2 text-sm text-foreground">
                            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                            <span className="leading-relaxed">{step.highlight}</span>
                          </div>
                        </div>

                        <span className="mt-auto inline-flex items-center gap-1.5 pt-4 text-[10px] font-semibold text-brand min-[340px]:text-[11px]">
                          <RotateCcw className="h-3 w-3" />
                          {t('home.process.flipBack')}
                        </span>
                      </div>
                    </motion.div>
                  </button>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </MarketingSection>
  );
}
