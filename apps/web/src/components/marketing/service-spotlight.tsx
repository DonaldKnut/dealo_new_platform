'use client';

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

import { useLocale } from '@/components/i18n/locale-context';
import { useModal } from '@/components/modals/modal-context';
import { InfoTooltip } from '@/components/ui/info-tooltip';

import { CtaRow } from './cta-row';
import { MarketingPill } from './marketing-pill';
import { Reveal } from './reveal';

export function ServiceSpotlight() {
  const { open } = useModal();
  const { t } = useLocale();

  const directSteps = [
    { step: '01', title: t('home.services.direct.s1'), desc: t('home.services.direct.s1d') },
    { step: '02', title: t('home.services.direct.s2'), desc: t('home.services.direct.s2d') },
    { step: '03', title: t('home.services.direct.s3'), desc: t('home.services.direct.s3d') },
    { step: '04', title: t('home.services.direct.s4'), desc: t('home.services.direct.s4d') },
  ];

  return (
    <section className="relative overflow-hidden border-t border-border/80 py-12 min-[340px]:py-16 sm:py-24 lg:py-28">
      <div className="pointer-events-none absolute top-1/4 left-1/3 h-96 w-96 rounded-full bg-brand/10 blur-[100px]" />

      <div className="container-page grid items-center gap-8 min-[340px]:gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-14">
        <Reveal>
          <MarketingPill icon={Sparkles}>{t('home.services.pill')}</MarketingPill>

          <h2 className="display-title mt-3 text-[1.55rem] leading-tight text-foreground min-[230px]:text-[1.75rem] min-[340px]:mt-4 min-[340px]:text-3xl sm:text-4xl lg:text-5xl">
            {t('home.services.titleBefore')}{' '}
            <span className="text-gradient-brand">{t('home.services.titleAccent')}</span>{' '}
            {t('home.services.titleAfter')}
          </h2>

          <p className="mt-4 max-w-lg text-sm leading-relaxed text-muted min-[340px]:mt-5 min-[340px]:text-base sm:text-lg">
            {t('home.services.body')}
          </p>

          <CtaRow>
            <button
              type="button"
              className="btn-primary shadow-md transition-all hover:shadow-brand/20"
              onClick={() => open('hire')}
            >
              {t('home.services.cta')}
            </button>
            <Link href="/services" className="btn-secondary">
              {t('home.services.link')}
            </Link>
          </CtaRow>
        </Reveal>

        <div className="card-grid grid gap-4 min-[340px]:gap-6">
          <Reveal delay={0.1} className="h-full">
            <div className="ui-card group relative min-h-[18rem] overflow-hidden p-4 shadow-sm backdrop-blur-sm transition-all duration-300 hover:border-brand/50 hover:shadow-xl min-[340px]:min-h-[20rem] min-[340px]:rounded-[1.75rem] min-[340px]:p-6 sm:p-8">
              <div className="flex items-start justify-between gap-2 min-[340px]:gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 min-[340px]:gap-2.5">
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-soft text-brand min-[340px]:h-9 min-[340px]:w-9">
                      <Briefcase className="h-4 w-4" />
                    </span>
                    <h3 className="font-display text-xl font-semibold text-foreground min-[340px]:text-2xl">
                      {t('home.services.direct.title')}
                    </h3>
                    <InfoTooltip
                      label={t('home.services.direct.title')}
                      content={t('home.services.direct.help')}
                    />
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-muted min-[340px]:mt-3 min-[340px]:text-sm">
                    {t('home.services.direct.body')}
                  </p>
                </div>

                <Link
                  href="/services/direct-recruitment"
                  aria-label={t('home.services.direct.title')}
                  className="shrink-0 rounded-full border border-border/70 p-1.5 text-brand transition hover:border-brand hover:bg-brand-soft min-[340px]:p-2"
                >
                  <ArrowUpRight className="h-4 w-4 min-[340px]:h-5 min-[340px]:w-5" />
                </Link>
              </div>

              <div className="mt-4 rounded-xl border border-border/70 bg-surface/70 p-3 min-[340px]:mt-6 min-[340px]:rounded-2xl min-[340px]:p-4 sm:p-5">
                <div className="mb-3 flex flex-col gap-1 text-[11px] font-semibold text-muted min-[300px]:flex-row min-[300px]:items-center min-[300px]:justify-between min-[340px]:mb-3.5 min-[340px]:text-xs">
                  <span className="flex items-center gap-1.5 text-foreground">
                    <Zap className="h-3.5 w-3.5 text-brand" />
                    {t('home.services.direct.stepsLabel')}
                  </span>
                  <span className="font-medium text-brand">{t('home.services.direct.ready')}</span>
                </div>

                <div className="card-grid grid grid-cols-1 gap-2 min-[280px]:grid-cols-2 sm:grid-cols-4">
                  {directSteps.map((s) => (
                    <div
                      key={s.step}
                      className="ui-card min-h-[4.75rem] rounded-xl p-2.5 transition-colors group-hover:border-brand/30"
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

          <Reveal delay={0.18} className="h-full">
            <div className="ui-card group relative min-h-[18rem] overflow-hidden p-4 shadow-sm backdrop-blur-sm transition-all duration-300 hover:border-brand/50 hover:shadow-xl min-[340px]:min-h-[20rem] min-[340px]:rounded-[1.75rem] min-[340px]:p-6 sm:p-8">
              <div className="flex items-start justify-between gap-2 min-[340px]:gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 min-[340px]:gap-2.5">
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-soft text-brand min-[340px]:h-9 min-[340px]:w-9">
                      <Users2 className="h-4 w-4" />
                    </span>
                    <h3 className="font-display text-xl font-semibold text-foreground min-[340px]:text-2xl">
                      {t('home.services.managed.title')}
                    </h3>
                    <InfoTooltip
                      label={t('home.services.managed.title')}
                      content={t('home.services.managed.help')}
                    />
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-muted min-[340px]:mt-3 min-[340px]:text-sm">
                    {t('home.services.managed.body')}
                  </p>
                </div>

                <Link
                  href="/services/managed-staffing"
                  aria-label={t('home.services.managed.title')}
                  className="shrink-0 rounded-full border border-border/70 p-1.5 text-brand transition hover:border-brand hover:bg-brand-soft min-[340px]:p-2"
                >
                  <ArrowUpRight className="h-4 w-4 min-[340px]:h-5 min-[340px]:w-5" />
                </Link>
              </div>

              <div className="mt-4 rounded-xl border border-border/70 bg-surface/70 p-3 min-[340px]:mt-6 min-[340px]:rounded-2xl min-[340px]:p-4 sm:p-5">
                <div className="mb-3 flex items-center gap-1.5 text-[11px] font-semibold text-foreground min-[340px]:text-xs">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                  <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                  {t('home.pricing.managed.p1')}
                </div>

                <div className="card-grid grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <div className="ui-card min-h-[4.5rem] flex-row items-center gap-2.5 rounded-xl p-2.5">
                    <FileCheck2 className="h-4 w-4 shrink-0 text-brand" />
                    <div>
                      <p className="text-xs font-semibold text-foreground">
                        {t('home.pricing.managed.p1')}
                      </p>
                    </div>
                  </div>
                  <div className="ui-card min-h-[4.5rem] flex-row items-center gap-2.5 rounded-xl p-2.5">
                    <Layers className="h-4 w-4 shrink-0 text-brand" />
                    <div>
                      <p className="text-xs font-semibold text-foreground">
                        {t('home.pricing.managed.p3')}
                      </p>
                    </div>
                  </div>
                  <div className="ui-card min-h-[4.5rem] flex-row items-center gap-2.5 rounded-xl p-2.5">
                    <Users2 className="h-4 w-4 shrink-0 text-brand" />
                    <div>
                      <p className="text-xs font-semibold text-foreground">
                        {t('home.pricing.managed.p2')}
                      </p>
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
