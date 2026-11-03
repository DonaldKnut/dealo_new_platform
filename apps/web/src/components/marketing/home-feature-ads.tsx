'use client';

import {
  BadgeCheck,
  Building2,
  Handshake,
  ShieldCheck,
  TimerReset,
  Workflow,
} from 'lucide-react';

import { FeatureAdGrid } from '@/components/marketing/feature-ad-grid';
import { useLocale } from '@/components/i18n/locale-context';

export function HomeFeatureAds() {
  const { t } = useLocale();

  return (
    <FeatureAdGrid
      eyebrow={t('home.why.eyebrow')}
      title={t('home.why.title')}
      description={t('home.why.body')}
      items={[
        {
          icon: Building2,
          title: t('home.why.1.title'),
          body: t('home.why.1.body'),
        },
        {
          icon: Handshake,
          title: t('home.why.2.title'),
          body: t('home.why.2.body'),
        },
        {
          icon: Workflow,
          title: t('home.why.3.title'),
          body: t('home.why.3.body'),
        },
        {
          icon: ShieldCheck,
          title: t('home.why.4.title'),
          body: t('home.why.4.body'),
        },
        {
          icon: TimerReset,
          title: t('home.why.5.title'),
          body: t('home.why.5.body'),
        },
        {
          icon: BadgeCheck,
          title: t('home.why.6.title'),
          body: t('home.why.6.body'),
        },
      ]}
    />
  );
}
