'use client';

import {
  BriefcaseBusiness,
  ClipboardCheck,
  MessageSquareQuote,
  SearchCheck,
  ShieldCheck,
  Sparkles,
  UsersRound,
} from 'lucide-react';

import { useLocale } from '@/components/i18n/locale-context';
import { CtaBanner } from '@/components/marketing/cta-banner';
import { FeatureAdGrid } from '@/components/marketing/feature-ad-grid';
import { IllustrationBand } from '@/components/marketing/illustration-band';
import { PageHero } from '@/components/marketing/page-hero';
import { ProcessRail } from '@/components/marketing/process-rail';
import { StatAdvert } from '@/components/marketing/stat-advert';
import { useModal } from '@/components/modals/modal-context';

export default function HowItWorksPage() {
  const { open } = useModal();
  const { t } = useLocale();

  const steps = [
    {
      icon: MessageSquareQuote,
      title: t('how.s1.title'),
      body: t('how.s1.body'),
    },
    {
      icon: SearchCheck,
      title: t('how.s2.title'),
      body: t('how.s2.body'),
    },
    {
      icon: ClipboardCheck,
      title: t('how.s3.title'),
      body: t('how.s3.body'),
    },
  ];

  return (
    <div>
      <PageHero
        eyebrow={t('how.eyebrow')}
        title={t('how.title')}
        description={t('how.body')}
        actions={
          <>
            <button type="button" className="btn-primary" onClick={() => open('hire')}>
              {t('how.cta')}
            </button>
            <button type="button" className="btn-secondary" onClick={() => open('contact')}>
              {t('how.talk')}
            </button>
          </>
        }
      />

      <StatAdvert
        items={[
          { value: t('how.stat1v'), label: t('how.stat1l') },
          { value: t('how.stat2v'), label: t('how.stat2l') },
          { value: t('how.stat3v'), label: t('how.stat3l') },
        ]}
      />

      <FeatureAdGrid
        eyebrow={t('how.steps.eyebrow')}
        title={t('how.steps.title')}
        description={t('how.steps.body')}
        items={steps}
      />

      <IllustrationBand
        eyebrow={t('how.vis.eyebrow')}
        title={t('how.vis.title')}
        description={t('how.vis.body')}
        illustration={
          <div className="grid w-full max-w-sm gap-3">
            {[
              { icon: BriefcaseBusiness, label: t('how.vis.1') },
              { icon: UsersRound, label: t('how.vis.2') },
              { icon: ShieldCheck, label: t('how.vis.3') },
            ].map((row) => {
              const Icon = row.icon;
              return (
                <div
                  key={row.label}
                  className="flex items-center gap-3 rounded-xl border border-border bg-surface-elevated/90 px-4 py-3"
                >
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-brand-soft text-brand">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="text-sm font-medium text-foreground">{row.label}</span>
                </div>
              );
            })}
          </div>
        }
      />

      <ProcessRail />

      <FeatureAdGrid
        eyebrow={t('how.why.eyebrow')}
        title={t('how.why.title')}
        description={t('how.why.body')}
        items={[
          {
            icon: Sparkles,
            title: t('how.why.1.title'),
            body: t('how.why.1.body'),
          },
          {
            icon: ShieldCheck,
            title: t('how.why.2.title'),
            body: t('how.why.2.body'),
          },
          {
            icon: ClipboardCheck,
            title: t('how.why.3.title'),
            body: t('how.why.3.body'),
          },
        ]}
      />

      <CtaBanner />
    </div>
  );
}
