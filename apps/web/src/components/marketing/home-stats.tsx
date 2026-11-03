'use client';

import { useLocale } from '@/components/i18n/locale-context';

import { StatAdvert } from './stat-advert';

export function HomeStats() {
  const { t } = useLocale();

  return (
    <StatAdvert
      items={[
        {
          value: t('home.stat.1.value'),
          label: t('home.stat.1.label'),
          sub: t('home.stat.1.sub'),
        },
        {
          value: t('home.stat.2.value'),
          label: t('home.stat.2.label'),
          sub: t('home.stat.2.sub'),
        },
        {
          value: t('home.stat.3.value'),
          label: t('home.stat.3.label'),
          sub: t('home.stat.3.sub'),
        },
      ]}
    />
  );
}
