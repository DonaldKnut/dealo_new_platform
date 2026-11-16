import type { Metadata } from 'next';

import { pageMetadata } from '@/lib/seo';
import { AudienceSplit } from '@/components/marketing/audience-split';
import { CoverageScope } from '@/components/marketing/coverage-scope';
import { CtaBanner } from '@/components/marketing/cta-banner';
import { HeroSection } from '@/components/marketing/hero-section';
import { HomeStats } from '@/components/marketing/home-stats';
import { JobAgentPromo } from '@/components/marketing/job-agent-promo';
import { JobBoardPromo } from '@/components/marketing/job-board-promo';
import { MarqueeStrip } from '@/components/marketing/marquee-strip';
import { ProcessRail } from '@/components/marketing/process-rail';
import { ResumeBuilderPromo } from '@/components/marketing/resume-builder-promo';
import { ServiceSpotlight } from '@/components/marketing/service-spotlight';
import { TalentShowcaseGrid } from '@/components/marketing/talent-showcase-grid';

export const metadata: Metadata = {
  ...pageMetadata({
    path: '/',
    title: 'Dealo — Jobs in Nigeria, AI Job Agent & checked hiring',
    description:
      'Find jobs in Lagos and across Nigeria, apply with one CV, or hire checked office staff and skilled trades. AI Job Agent plus real recruiters — shortlists in 48 hours.',
    keywords: [
      'jobs in Nigeria',
      'jobs in Lagos',
      'hire talent Nigeria',
      'AI job agent Nigeria',
      'recruitment agency Lagos',
      'skilled trades staffing',
      'CV builder Nigeria',
    ],
  }),
  title: { absolute: 'Dealo — Jobs in Nigeria, AI Job Agent & checked hiring' },
};

export default function HomePage() {
  return (
    <div>
      <HeroSection />
      <MarqueeStrip />
      <HomeStats />
      <JobAgentPromo />
      <JobBoardPromo />
      <ResumeBuilderPromo />
      <CoverageScope />
      <ServiceSpotlight />
      <TalentShowcaseGrid />
      <ProcessRail />
      <AudienceSplit />
      <CtaBanner />
    </div>
  );
}
