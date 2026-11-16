'use client';

import { ClipboardCheck, Shield, Wallet } from 'lucide-react';

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
        eyebrow={t('managed.section.eyebrow')}
        title={t('managed.section.title')}
        description={t('managed.section.body')}
        items={[
          {
            icon: ClipboardCheck,
            title: t('managed.1.title'),
            body: t('managed.1.body'),
          },
          {
            icon: Wallet,
            title: t('managed.2.title'),
            body: t('managed.2.body'),
          },
          {
            icon: Shield,
            title: t('managed.3.title'),
            body: t('managed.3.body'),
          },
        ]}
      />
      <CtaBanner />
    </div>
  );
}
