'use client';

import { useLocale } from '@/components/i18n/locale-context';

export default function AboutPage() {
  const { t } = useLocale();

  return (
    <section className="container-page max-w-3xl pt-24 pb-20">
      <p className="eyebrow">{t('about.eyebrow')}</p>
      <h1 className="display-title mt-3 text-4xl sm:text-5xl">Dealo</h1>
      <p className="mt-6 text-lg leading-relaxed text-muted">{t('about.body')}</p>
    </section>
  );
}
