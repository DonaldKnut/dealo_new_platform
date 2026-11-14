'use client';

import { ServiceType } from '@dealo/shared';
import { CalendarDays, Repeat2, Wrench } from 'lucide-react';

import { useLocale } from '@/components/i18n/locale-context';
import { CtaBanner } from '@/components/marketing/cta-banner';
import { FeatureAdGrid } from '@/components/marketing/feature-ad-grid';
import { PageHero } from '@/components/marketing/page-hero';
import { useModal } from '@/components/modals/modal-context';

export default function ContractCoverPage() {
  const { open } = useModal();
  const { t } = useLocale();

  return (
    <div>
      <PageHero
        eyebrow={t('cover.eyebrow')}
        title={t('cover.title')}
        description={t('cover.body')}
        typeTitle
        actions={
          <button
            type="button"
            className="btn-primary"
            onClick={() =>
              open('hire', {
                hirePrefill: {
                  serviceType: ServiceType.CONTRACT_COVER,
                  roleTitle: 'Temp cover',
                  requirements: 'Need temp/contract cover — please quote day rate + mark-up for our brief.',
                },
              })
            }
          >
            {t('cover.cta')}
          </button>
        }
      />
      <FeatureAdGrid
        eyebrow={t('mega.how.title')}
        title={t('svc.cover.title')}
        description={t('svc.cover.body')}
        items={[
          { icon: Wrench, title: t('cover.1.title'), body: t('cover.1.body') },
          { icon: CalendarDays, title: t('cover.2.title'), body: t('cover.2.body') },
          { icon: Repeat2, title: t('cover.3.title'), body: t('cover.3.body') },
        ]}
      />
      <CtaBanner />
    </div>
  );
}
