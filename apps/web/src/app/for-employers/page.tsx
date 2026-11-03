'use client';

import {
  Building2,
  FileCheck2,
  Handshake,
  LineChart,
  ShieldCheck,
  TimerReset,
} from 'lucide-react';
import Link from 'next/link';

import { useLocale } from '@/components/i18n/locale-context';
import { CtaBanner } from '@/components/marketing/cta-banner';
import { FeatureAdGrid } from '@/components/marketing/feature-ad-grid';
import { IllustrationBand } from '@/components/marketing/illustration-band';
import { ImageSlider } from '@/components/marketing/image-slider';
import { PageHero } from '@/components/marketing/page-hero';
import { StatAdvert } from '@/components/marketing/stat-advert';
import { useModal } from '@/components/modals/modal-context';

const EMPLOYER_SLIDER = [
  {
    src: 'https://res.cloudinary.com/dyaetoldv/image/upload/v1793441205/Professionals_standing_together___b6db16f1_2K_hp4ylu.jpg',
    alt: 'Office and skilled trades professionals standing together',
  },
  {
    src: 'https://res.cloudinary.com/dyaetoldv/image/upload/v1793441204/Professionals_standing_together___406b9a05_2K_wj996r.jpg',
    alt: 'Diverse professionals across office and trade roles',
  },
  {
    src: 'https://res.cloudinary.com/dyaetoldv/image/upload/v1793441258/Professionals_standing_together___1044a441_2K_1_qjffw8.jpg',
    alt: 'Checked talent ready for Nigerian employers',
  },
] as const;

export default function ForEmployersPage() {
  const { open } = useModal();
  const { t } = useLocale();

  return (
    <div>
      <PageHero
        eyebrow={t('emp.eyebrow')}
        title={t('emp.title')}
        description={t('emp.body')}
        actions={
          <>
            <button type="button" className="btn-primary" onClick={() => open('hire')}>
              {t('emp.cta')}
            </button>
            <Link href="/auth/register" className="btn-secondary">
              {t('emp.register')}
            </Link>
          </>
        }
      />

      <section className="container-page pb-8 min-[340px]:pb-12">
        <ImageSlider
          images={[...EMPLOYER_SLIDER]}
          priority
          className="border border-border/70 shadow-lg"
        />
      </section>

      <StatAdvert
        items={[
          { value: t('emp.stat1v'), label: t('emp.stat1l') },
          { value: t('emp.stat2v'), label: t('emp.stat2l') },
          { value: t('emp.stat3v'), label: t('emp.stat3l') },
        ]}
      />

      <FeatureAdGrid
        eyebrow={t('emp.grid.eyebrow')}
        title={t('emp.grid.title')}
        description={t('emp.grid.body')}
        items={[
          {
            icon: Building2,
            title: t('emp.1.title'),
            body: t('emp.1.body'),
          },
          {
            icon: Handshake,
            title: t('emp.2.title'),
            body: t('emp.2.body'),
          },
          {
            icon: TimerReset,
            title: t('emp.3.title'),
            body: t('emp.3.body'),
          },
          {
            icon: FileCheck2,
            title: t('emp.4.title'),
            body: t('emp.4.body'),
          },
          {
            icon: ShieldCheck,
            title: t('emp.5.title'),
            body: t('emp.5.body'),
          },
          {
            icon: LineChart,
            title: t('emp.6.title'),
            body: t('emp.6.body'),
          },
        ]}
      />

      <IllustrationBand
        reverse
        eyebrow={t('emp.band.eyebrow')}
        title={t('emp.band.title')}
        description={t('emp.band.body')}
        actions={
          <button type="button" className="btn-primary" onClick={() => open('hire')}>
            {t('emp.band.cta')}
          </button>
        }
        illustration={
          <ol className="w-full max-w-sm space-y-3">
            {[
              t('emp.step.1'),
              t('emp.step.2'),
              t('emp.step.3'),
              t('emp.step.4'),
              t('emp.step.5'),
              t('emp.step.6'),
            ].map((label, index) => (
              <li
                key={label}
                className="flex items-center gap-3 rounded-xl border border-border bg-surface-elevated/90 px-4 py-2.5"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand text-xs font-bold text-white dark:text-[#071f14]">
                  {index + 1}
                </span>
                <span className="text-sm font-medium text-foreground">{label}</span>
              </li>
            ))}
          </ol>
        }
      />

      <CtaBanner />
    </div>
  );
}
