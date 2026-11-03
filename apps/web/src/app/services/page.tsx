'use client';

import { Building2, Handshake, ShieldCheck, Workflow } from 'lucide-react';
import Link from 'next/link';

import { useLocale } from '@/components/i18n/locale-context';
import { CtaBanner } from '@/components/marketing/cta-banner';
import { FeatureAdGrid } from '@/components/marketing/feature-ad-grid';
import { PageHero } from '@/components/marketing/page-hero';
import { StatAdvert } from '@/components/marketing/stat-advert';
import { useModal } from '@/components/modals/modal-context';

export default function ServicesPage() {
  const { open } = useModal();
  const { t } = useLocale();

  return (
    <div>
      <PageHero
        eyebrow={t('svc.eyebrow')}
        title={t('svc.title')}
        description={t('svc.body')}
        actions={
          <>
            <button type="button" className="btn-primary" onClick={() => open('hire')}>
              {t('svc.cta')}
            </button>
            <Link href="/how-it-works" className="btn-secondary">
              {t('svc.how')}
            </Link>
          </>
        }
      />

      <StatAdvert
        items={[
          { value: t('svc.stat1v'), label: t('svc.stat1l') },
          { value: t('svc.stat2v'), label: t('svc.stat2l') },
          { value: t('svc.stat3v'), label: t('svc.stat3l') },
        ]}
      />

      <section className="container-page card-grid grid gap-6 py-12 md:grid-cols-2 md:py-16">
        <Link
          href="/services/direct-recruitment"
          className="ui-card min-h-[11rem] p-6 transition hover:border-brand/40 min-[340px]:p-8"
        >
          <Building2 className="h-6 w-6 text-brand" />
          <h2 className="mt-4 font-display text-2xl text-foreground">{t('svc.direct.title')}</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted sm:text-base">
            {t('svc.direct.body')}
          </p>
        </Link>
        <Link
          href="/services/managed-staffing"
          className="ui-card min-h-[11rem] p-6 transition hover:border-brand/40 min-[340px]:p-8"
        >
          <Handshake className="h-6 w-6 text-brand" />
          <h2 className="mt-4 font-display text-2xl text-foreground">{t('svc.managed.title')}</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted sm:text-base">
            {t('svc.managed.body')}
          </p>
        </Link>
      </section>

      <FeatureAdGrid
        eyebrow={t('svc.share.eyebrow')}
        title={t('svc.share.title')}
        description={t('svc.share.body')}
        items={[
          {
            icon: Workflow,
            title: t('svc.share.1.title'),
            body: t('svc.share.1.body'),
          },
          {
            icon: ShieldCheck,
            title: t('svc.share.2.title'),
            body: t('svc.share.2.body'),
          },
          {
            icon: Handshake,
            title: t('svc.share.3.title'),
            body: t('svc.share.3.body'),
          },
        ]}
      />

      <CtaBanner />
    </div>
  );
}
