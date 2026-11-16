'use client';

import {
  BadgeCheck,
  Briefcase,
  CalendarCheck2,
  FileUp,
  Sparkles,
  UserRoundCheck,
} from 'lucide-react';
import Link from 'next/link';

import { useLocale } from '@/components/i18n/locale-context';
import { CtaBanner } from '@/components/marketing/cta-banner';
import { FeatureAdGrid } from '@/components/marketing/feature-ad-grid';
import { IllustrationBand } from '@/components/marketing/illustration-band';
import { ProfessionalsHero } from '@/components/marketing/professionals-hero';
import { StatAdvert } from '@/components/marketing/stat-advert';

export default function ForProfessionalsPage() {
  const { t } = useLocale();

  return (
    <div>
      <ProfessionalsHero
        actions={
          <>
            <Link href="/auth/register" className="btn-primary justify-center shadow-lg shadow-black/30">
              {t('pro.register')}
            </Link>
            <Link
              href="/auth/login"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-white/25 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/15"
            >
              {t('pro.signIn')}
            </Link>
          </>
        }
      />

      <StatAdvert
        items={[
          { value: t('pro.stat1v'), label: t('pro.stat1l') },
          { value: t('pro.stat2v'), label: t('pro.stat2l') },
          { value: t('pro.stat3v'), label: t('pro.stat3l') },
        ]}
      />

      <FeatureAdGrid
        eyebrow={t('pro.grid.eyebrow')}
        title={t('pro.grid.title')}
        description={t('pro.grid.body')}
        items={[
          {
            icon: UserRoundCheck,
            title: t('pro.1.title'),
            body: t('pro.1.body'),
          },
          {
            icon: FileUp,
            title: t('pro.2.title'),
            body: t('pro.2.body'),
          },
          {
            icon: Briefcase,
            title: t('pro.3.title'),
            body: t('pro.3.body'),
          },
          {
            icon: CalendarCheck2,
            title: t('pro.4.title'),
            body: t('pro.4.body'),
          },
          {
            icon: BadgeCheck,
            title: t('pro.5.title'),
            body: t('pro.5.body'),
          },
          {
            icon: Sparkles,
            title: t('pro.6.title'),
            body: t('pro.6.body'),
          },
        ]}
      />

      <IllustrationBand
        eyebrow={t('pro.band.eyebrow')}
        title={t('pro.band.title')}
        description={t('pro.band.body')}
        actions={
          <Link href="/auth/register" className="btn-primary">
            {t('pro.band.cta')}
          </Link>
        }
        illustration={
          <div className="grid w-full max-w-sm gap-3">
            {[t('pro.path.1'), t('pro.path.2'), t('pro.path.3'), t('pro.path.4')].map(
              (label, index) => (
                <div
                  key={label}
                  className="rounded-xl border border-border bg-surface-elevated/90 px-4 py-3"
                >
                  <p className="text-xs font-semibold uppercase tracking-wider text-brand">
                    {t('pro.stage')} {index + 1}
                  </p>
                  <p className="mt-1 text-sm font-medium text-foreground">{label}</p>
                </div>
              ),
            )}
          </div>
        }
      />

      <CtaBanner />
    </div>
  );
}
