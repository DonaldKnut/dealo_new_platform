'use client';

import {
  BadgeCheck,
  Building2,
  ClipboardCheck,
  ClipboardList,
  MessageSquare,
  Search,
  ShieldCheck,
  UserCheck,
  UsersRound,
} from 'lucide-react';
import Link from 'next/link';

import { useLocale } from '@/components/i18n/locale-context';
import { CtaBanner } from '@/components/marketing/cta-banner';
import { FeatureAdGrid } from '@/components/marketing/feature-ad-grid';
import { IllustrationBand } from '@/components/marketing/illustration-band';
import { PageHero } from '@/components/marketing/page-hero';
import { ProcessRail } from '@/components/marketing/process-rail';
import { StatAdvert } from '@/components/marketing/stat-advert';
import { useModal } from '@/components/modals/modal-context';

export default function DirectRecruitmentPage() {
  const { open } = useModal();
  const { t } = useLocale();

  return (
    <div>
      <PageHero
        eyebrow={t('direct.eyebrow')}
        title={t('direct.title')}
        description={t('direct.body')}
        actions={
          <>
            <button type="button" className="btn-primary" onClick={() => open('hire')}>
              {t('direct.cta')}
            </button>
            <Link href="/auth/register" className="btn-secondary">
              {t('direct.register')}
            </Link>
          </>
        }
      />

      <StatAdvert
        items={[
          { value: t('direct.stat1v'), label: t('direct.stat1l') },
          { value: t('direct.stat2v'), label: t('direct.stat2l') },
          { value: t('direct.stat3v'), label: t('direct.stat3l') },
        ]}
      />

      <FeatureAdGrid
        eyebrow="Clear steps"
        title="What direct recruitment covers"
        description="A clear path to hire onto your team, with screened shortlists and clear follow-up."
        items={[
          {
            icon: ClipboardList,
            title: 'Role details',
            body: 'Lock requirements, headcount, location, and pricing expectations first.',
          },
          {
            icon: Search,
            title: 'Source & screen',
            body: 'Dealo sources and screens people against your role details before interviews.',
          },
          {
            icon: UserCheck,
            title: 'Interview & place',
            body: 'Coordinate interviews and place talent onto your team with clear next steps.',
          },
        ]}
      />

      <IllustrationBand
        eyebrow="Built for intentional hires"
        title="Not a job board. Clear steps."
        description="Direct recruitment is for companies that want to hire people onto their payroll — with Dealo running clear steps from role details to placement."
        actions={
          <button type="button" className="btn-primary" onClick={() => open('hire')}>
            Submit role details
          </button>
        }
        illustration={
          <ol className="w-full max-w-sm space-y-3">
            {['Details', 'Source', 'Screen', 'Shortlist', 'Interview', 'Place'].map((label, index) => (
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

      <FeatureAdGrid
        eyebrow="Employer advantages"
        title="Why teams choose direct recruitment"
        description="Clarity for your stakeholders, screened shortlists, and clear follow-up through placement."
        items={[
          {
            icon: Building2,
            title: 'Onto your team',
            body: 'People are hired onto your company payroll — not left as open-ended introductions.',
          },
          {
            icon: ShieldCheck,
            title: 'Quality gate',
            body: 'Screening happens before you spend interview time.',
          },
          {
            icon: ClipboardCheck,
            title: 'Documented trail',
            body: 'Role details, shortlist, and interview stages stay organized for approvals.',
          },
          {
            icon: UsersRound,
            title: 'Headcount ready',
            body: 'Request one role or several people against the same role details.',
          },
          {
            icon: MessageSquare,
            title: 'Clear communication',
            body: 'Dealo shares updates so hiring managers know what happens next.',
          },
          {
            icon: BadgeCheck,
            title: 'Clear pricing and terms',
            body: 'Pricing and terms sit with the clear steps — not as an afterthought.',
          },
        ]}
      />

      <ProcessRail />

      <IllustrationBand
        reverse
        eyebrow="Compare"
        title="Need Dealo to run staffing for you instead?"
        description="Managed staffing keeps pricing, terms, and hiring work on Dealo’s side — ideal when you want less load on your team."
        actions={
          <Link href="/services/managed-staffing" className="btn-secondary">
            Explore managed staffing
          </Link>
        }
        illustration={
          <div className="grid w-full max-w-sm gap-3">
            {[
              { title: 'Direct recruitment', body: 'You hire onto your company payroll.' },
              { title: 'Managed staffing', body: 'Dealo handles hiring for you.' },
            ].map((card) => (
              <div
                key={card.title}
                className="rounded-xl border border-border bg-surface-elevated/90 px-4 py-3"
              >
                <p className="text-sm font-semibold text-foreground">{card.title}</p>
                <p className="mt-1 text-xs text-muted">{card.body}</p>
              </div>
            ))}
          </div>
        }
      />

      <CtaBanner />
    </div>
  );
}
