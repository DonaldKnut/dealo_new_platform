'use client';

import { ArrowRight, CheckCircle2, Sparkles, UserCheck } from 'lucide-react';
import Link from 'next/link';

import { useLocale } from '@/components/i18n/locale-context';
import { useModal } from '@/components/modals/modal-context';

import { CtaRow } from './cta-row';
import { MarketingPill } from './marketing-pill';
import { MarketingSection } from './marketing-section';
import { Reveal } from './reveal';

export function AudienceSplit() {
  const { open } = useModal();
  const { t } = useLocale();

  const employerBullets = [
    t('home.audience.emp.b1'),
    t('home.audience.emp.b2'),
    t('home.audience.emp.b3'),
    t('home.audience.emp.b4'),
  ];
  const proBullets = [
    t('home.audience.pro.b1'),
    t('home.audience.pro.b2'),
    t('home.audience.pro.b3'),
    t('home.audience.pro.b4'),
  ];

  return (
    <MarketingSection containerClassName="card-grid grid gap-4 min-[340px]:gap-8 lg:grid-cols-2">
      <Reveal className="ui-card group relative min-h-[22rem] overflow-hidden bg-gradient-to-br from-surface to-surface-elevated p-4 shadow-sm transition-all duration-300 hover:border-brand/40 hover:shadow-xl min-[340px]:min-h-[24rem] min-[340px]:rounded-[2rem] min-[340px]:p-8 sm:p-10">
        <div className="flex flex-col gap-2 min-[280px]:flex-row min-[280px]:items-center min-[280px]:justify-between">
          <MarketingPill icon={Sparkles} variant="soft" className="normal-case tracking-normal">
            {t('home.audience.emp.pill')}
          </MarketingPill>
          <span className="font-mono text-[10px] text-muted min-[340px]:text-xs">
            {t('home.audience.emp.tag')}
          </span>
        </div>

        <h2 className="display-title mt-3 text-[1.45rem] leading-tight font-semibold text-foreground min-[340px]:mt-4 min-[340px]:text-3xl sm:text-4xl">
          {t('home.audience.emp.title')}
        </h2>

        <p className="mt-2 text-xs leading-relaxed text-muted min-[340px]:mt-3 min-[340px]:text-sm sm:text-base">
          {t('home.audience.emp.body')}
        </p>

        <div className="mt-5 space-y-2 min-[340px]:mt-6 min-[340px]:space-y-2.5">
          {employerBullets.map((text) => (
            <div
              key={text}
              className="flex items-start gap-2 text-[11px] text-foreground/85 min-[340px]:items-center min-[340px]:gap-2.5 min-[340px]:text-xs sm:text-sm"
            >
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500 min-[340px]:mt-0 min-[340px]:h-4 min-[340px]:w-4" />
              <span>{text}</span>
            </div>
          ))}
        </div>

        <CtaRow className="mt-auto">
          <button
            type="button"
            className="btn-primary shadow-md transition-all hover:shadow-brand/20"
            onClick={() => open('hire')}
          >
            {t('home.audience.emp.cta')}
            <ArrowRight className="h-4 w-4" />
          </button>
          <Link href="/auth/register" className="btn-secondary">
            {t('home.audience.emp.link')}
          </Link>
        </CtaRow>
      </Reveal>

      <Reveal
        delay={0.1}
        className="group relative flex h-full min-h-[22rem] min-w-0 flex-col overflow-hidden rounded-[1.25rem] border border-[#1e4a30] bg-[#071f14] bg-gradient-to-br from-[#071f14] via-[#0c2c1a] to-[#052818] p-4 text-[#eaffdf] shadow-xl transition-all duration-300 hover:border-lime-400/50 min-[340px]:min-h-[24rem] min-[340px]:rounded-[2rem] min-[340px]:p-8 sm:p-10 dark:border-lime-400/25 dark:from-[#04150e] dark:via-[#0a2416] dark:to-[#03120c]"
      >
        <div className="pointer-events-none absolute -top-12 -right-12 h-44 w-44 rounded-full bg-lime-400/25 blur-3xl" />

        <div className="relative z-10 flex flex-col gap-2 min-[280px]:flex-row min-[280px]:items-center min-[280px]:justify-between">
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-lime-400/30 bg-[#0f3d22] px-2.5 py-1 text-[10px] font-semibold text-[#9dff6b] min-[340px]:px-3 min-[340px]:text-xs">
            <UserCheck className="h-3 w-3" />
            {t('home.audience.pro.pill')}
          </span>
          <span className="font-mono text-[10px] font-medium text-[#c8efb0] min-[340px]:text-xs">
            {t('home.audience.pro.tag')}
          </span>
        </div>

        <h2 className="relative z-10 mt-3 font-display text-[1.45rem] font-semibold tracking-tight text-[#f5ffe9] min-[340px]:mt-4 min-[340px]:text-3xl sm:text-4xl">
          {t('home.audience.pro.title')}
        </h2>

        <p className="relative z-10 mt-2 text-xs leading-relaxed text-[#d4f0c0] min-[340px]:mt-3 min-[340px]:text-sm sm:text-base">
          {t('home.audience.pro.body')}
        </p>

        <div className="relative z-10 mt-5 space-y-2 min-[340px]:mt-6 min-[340px]:space-y-2.5">
          {proBullets.map((text) => (
            <div
              key={text}
              className="flex items-start gap-2 text-[11px] text-[#eaffdf] min-[340px]:items-center min-[340px]:gap-2.5 min-[340px]:text-xs sm:text-sm"
            >
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#9dff6b] min-[340px]:mt-0 min-[340px]:h-4 min-[340px]:w-4" />
              <span>{text}</span>
            </div>
          ))}
        </div>

        <CtaRow className="relative z-10 mt-auto">
          <Link
            href="/auth/register"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-[#7cff4d] px-5 py-2.5 text-sm font-semibold text-[#071f14] shadow-md transition-all hover:bg-[#a8ff70] hover:shadow-lime-400/20 min-[340px]:px-6 min-[340px]:py-3"
          >
            {t('home.audience.pro.cta')}
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/for-professionals"
            className="inline-flex items-center justify-center rounded-full border border-lime-400/45 bg-[#0f3d22]/60 px-4 py-2.5 text-sm font-semibold text-[#eaffdf] transition hover:border-lime-400/70 hover:bg-[#0f3d22] min-[340px]:px-5 min-[340px]:py-3"
          >
            {t('home.audience.pro.link')}
          </Link>
        </CtaRow>
      </Reveal>
    </MarketingSection>
  );
}
