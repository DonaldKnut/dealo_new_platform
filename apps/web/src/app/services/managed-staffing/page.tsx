'use client';

import { FileSignature, Headphones, Layers3 } from 'lucide-react';

import { useLocale } from '@/components/i18n/locale-context';
import { CtaBanner } from '@/components/marketing/cta-banner';
import { FeatureAdGrid } from '@/components/marketing/feature-ad-grid';
import { PageHero } from '@/components/marketing/page-hero';
import { useModal } from '@/components/modals/modal-context';

export default function ManagedStaffingPage() {
  const { open } = useModal();
  const { t } = useLocale();

  return (
    <div>
      <PageHero
        eyebrow={t('managed.eyebrow')}
        title={t('managed.title')}
        description={t('managed.body')}
        actions={
          <button type="button" className="btn-primary" onClick={() => open('hire')}>
            {t('managed.cta')}
          </button>
        }
      />
      <FeatureAdGrid
        eyebrow={t('mega.how.title')}
        title={t('svc.managed.title')}
        description={t('managed.body')}
        items={[
          {
            icon: FileSignature,
            title: t('svc.share.3.title'),
            body: t('svc.share.3.body'),
          },
          {
            icon: Layers3,
            title: t('home.services.managed.title'),
            body: t('home.services.managed.body'),
          },
          {
            icon: Headphones,
            title: t('how.why.3.title'),
            body: t('how.why.3.body'),
          },
        ]}
      />
      <CtaBanner />
    </div>
  );
}
