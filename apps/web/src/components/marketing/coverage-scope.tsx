'use client';

import { BriefcaseBusiness, CheckCircle2, HardHat, Sparkles } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

import { useLocale } from '@/components/i18n/locale-context';
import { useModal } from '@/components/modals/modal-context';

import { CtaRow } from './cta-row';
import { MarketingPill } from './marketing-pill';
import { MarketingSection } from './marketing-section';
import { Reveal } from './reveal';

const SCOPE_BG_IMAGES = [
  {
    src: 'https://res.cloudinary.com/dyaetoldv/image/upload/v1793439562/Professionals_standing_together___8db5883f_2K_ghskpu.jpg',
    alt: 'Diverse professionals standing together',
  },
  {
    src: 'https://res.cloudinary.com/dyaetoldv/image/upload/v1793439563/Professionals_standing_in_modern__f14ac16f_2K_qq0tqz.jpg',
    alt: 'Professionals in a modern office',
  },
  {
    src: 'https://res.cloudinary.com/dyaetoldv/image/upload/v1793439563/Professionals_standing_in_modern__6ae13ee8_2K_joqlbm.jpg',
    alt: 'Office team standing together',
  },
  {
    src: 'https://res.cloudinary.com/dyaetoldv/image/upload/v1793439563/Diverse_professionals_standing_t__c5e95782_2K_ubufmr.jpg',
    alt: 'Office and skilled trades professionals',
  },
] as const;

export function CoverageScope() {
  const { open } = useModal();
  const { t } = useLocale();
  const slideImages = [...SCOPE_BG_IMAGES, ...SCOPE_BG_IMAGES];

  const scopeCards = [
    {
      title: t('home.scope.office'),
      icon: BriefcaseBusiness,
      items: [
        t('home.scope.office.1'),
        t('home.scope.office.2'),
        t('home.scope.office.3'),
        t('home.scope.office.4'),
      ],
    },
    {
      title: t('home.scope.trades'),
      icon: HardHat,
      items: [
        t('home.scope.trades.1'),
        t('home.scope.trades.2'),
        t('home.scope.trades.3'),
        t('home.scope.trades.4'),
        t('home.scope.trades.5'),
        t('home.scope.trades.6'),
      ],
    },
  ];

  return (
    <MarketingSection className="relative overflow-hidden bg-surface/40">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-1/2 z-0 h-[min(72%,28rem)] -translate-y-1/2 overflow-hidden opacity-40 min-[340px]:h-[min(78%,34rem)] sm:opacity-50"
      >
        <div className="scope-image-track flex h-full w-max gap-3 min-[340px]:gap-4">
          {slideImages.map((image, index) => (
            <div
              key={`${image.src}-${index}`}
              className="relative h-full w-[9.5rem] shrink-0 overflow-hidden rounded-2xl border border-border/40 min-[340px]:w-[12rem] sm:w-[14rem] lg:w-[16rem]"
            >
              <Image
                src={image.src}
                alt=""
                fill
                sizes="(max-width: 640px) 152px, (max-width: 1024px) 224px, 256px"
                className="object-cover"
              />
            </div>
          ))}
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-background via-transparent to-background" />
        <div className="absolute inset-0 bg-gradient-to-b from-background via-transparent to-background" />
      </div>

      <div className="relative z-10">
        <Reveal>
          <div className="mx-auto max-w-3xl text-center">
            <MarketingPill icon={Sparkles}>{t('home.scope.pill')}</MarketingPill>
            <h2 className="display-title mt-3 text-[1.55rem] leading-tight text-foreground min-[340px]:mt-4 min-[340px]:text-3xl sm:text-4xl">
              {t('home.scope.title')}
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-muted min-[340px]:mt-4 min-[340px]:text-base">
              {t('home.scope.body')}
            </p>
          </div>
        </Reveal>

        <div className="card-grid mt-8 grid gap-4 min-[340px]:mt-12 min-[340px]:gap-5 md:grid-cols-2">
          {scopeCards.map((card, index) => {
            const Icon = card.icon;
            return (
              <Reveal key={card.title} delay={index * 0.06} className="h-full">
                <div className="ui-card h-full border-border/90 bg-surface-elevated/95 p-4 shadow-lg backdrop-blur-md min-[340px]:p-6 dark:bg-surface-elevated/92">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft text-brand">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-4 font-display text-xl font-semibold text-foreground">
                    {card.title}
                  </h3>
                  <ul className="mt-3 flex flex-1 flex-col gap-2">
                    {card.items.map((item) => (
                      <li key={item} className="flex items-start gap-2 text-sm text-foreground">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            );
          })}
        </div>

        <Reveal delay={0.08}>
          <CtaRow align="center" className="mt-8 justify-center min-[340px]:mt-10">
            <button type="button" className="btn-primary" onClick={() => open('hire')}>
              {t('home.scope.cta')}
            </button>
            <Link href="/services" className="btn-secondary">
              {t('home.scope.link')}
            </Link>
          </CtaRow>
        </Reveal>
      </div>
    </MarketingSection>
  );
}
