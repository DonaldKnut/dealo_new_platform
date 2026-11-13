'use client';

import { BadgeCheck, BriefcaseBusiness, WalletCards } from 'lucide-react';

import { useLocale } from '@/components/i18n/locale-context';
import { CtaBanner } from '@/components/marketing/cta-banner';
import { FeatureAdGrid } from '@/components/marketing/feature-ad-grid';
import { PageHero } from '@/components/marketing/page-hero';
import { useModal } from '@/components/modals/modal-context';

export default function TalentTrainingPage() {
  const { open } = useModal();
  const { t } = useLocale();

  return (
    <div>
      <PageHero
        eyebrow={t('train.eyebrow')}
        title={t('train.title')}
        description={t('train.body')}
        actions={
          <button type="button" className="btn-primary" onClick={() => open('hire')}>
            {t('train.cta')}
          </button>
        }
      />
      <FeatureAdGrid
        eyebrow={t('mega.how.title')}
        title={t('svc.train.title')}
        description={t('svc.train.body')}
        items={[
          { icon: WalletCards, title: t('train.1.title'), body: t('train.1.body') },
          { icon: BriefcaseBusiness, title: t('train.2.title'), body: t('train.2.body') },
          { icon: BadgeCheck, title: t('train.3.title'), body: t('train.3.body') },
        ]}
      />
      <CtaBanner />
    </div>
  );
}
