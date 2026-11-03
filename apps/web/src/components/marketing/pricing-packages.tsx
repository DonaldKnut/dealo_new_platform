'use client';

import { ArrowRight, Building2, Handshake, Sparkles } from 'lucide-react';
import Link from 'next/link';

import { useLocale } from '@/components/i18n/locale-context';
import { useModal } from '@/components/modals/modal-context';

import { MarketingPill } from './marketing-pill';
import { MarketingSection } from './marketing-section';
import { Reveal } from './reveal';

export function PricingPackages() {
  const { open } = useModal();
  const { t } = useLocale();

  const packages = [
    {
      icon: Building2,
      name: t('home.pricing.direct.name'),
      priceLabel: t('home.pricing.direct.price'),
      summary: t('home.pricing.direct.summary'),
      points: [
        t('home.pricing.direct.p1'),
        t('home.pricing.direct.p2'),
        t('home.pricing.direct.p3'),
        t('home.pricing.direct.p4'),
      ],
    },
    {
      icon: Handshake,
      name: t('home.pricing.managed.name'),
      priceLabel: t('home.pricing.managed.price'),
      summary: t('home.pricing.managed.summary'),
      points: [
        t('home.pricing.managed.p1'),
        t('home.pricing.managed.p2'),
        t('home.pricing.managed.p3'),
        t('home.pricing.managed.p4'),
      ],
    },
  ];

  return (
    <MarketingSection>
      <Reveal>
        <div className="mx-auto max-w-3xl text-center">
          <MarketingPill icon={Sparkles}>{t('home.pricing.pill')}</MarketingPill>
          <h2 className="display-title mt-3 text-[1.55rem] leading-tight text-foreground min-[340px]:mt-4 min-[340px]:text-3xl sm:text-4xl">
            {t('home.pricing.title')}
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-muted min-[340px]:mt-4 min-[340px]:text-base">
            {t('home.pricing.body')}
          </p>
        </div>
      </Reveal>

      <div className="card-grid mt-8 grid gap-4 min-[340px]:mt-12 min-[340px]:gap-5 lg:grid-cols-2">
        {packages.map((item, index) => {
          const Icon = item.icon;
          return (
            <Reveal key={item.name} delay={index * 0.06} className="h-full">
              <article className="ui-card p-4 min-[340px]:p-7">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft text-brand">
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 font-display text-2xl font-semibold text-foreground">
                  {item.name}
                </h3>
                <p className="mt-2 text-sm font-semibold text-brand">{item.priceLabel}</p>
                <p className="mt-2 text-sm leading-relaxed text-muted">{item.summary}</p>
                <ul className="mt-5 flex-1 space-y-2.5">
                  {item.points.map((point) => (
                    <li key={point} className="text-sm text-foreground/85">
                      • {point}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  className="btn-primary mt-6 w-full"
                  onClick={() => open('hire')}
                >
                  {t('home.pricing.quote')}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </article>
            </Reveal>
          );
        })}
      </div>

      <Reveal delay={0.1}>
        <p className="mt-6 text-center text-xs text-muted min-[340px]:mt-8 min-[340px]:text-sm">
          {t('home.pricing.talk')}{' '}
          <button
            type="button"
            className="font-semibold text-brand underline underline-offset-4"
            onClick={() => open('contact')}
          >
            {t('home.pricing.contact')}
          </button>
          {' · '}
          <Link href="/services" className="font-semibold text-brand underline underline-offset-4">
            {t('home.pricing.compare')}
          </Link>
        </p>
      </Reveal>
    </MarketingSection>
  );
}
