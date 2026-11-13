import type { Metadata } from 'next';

import { pageMetadata } from '@/lib/seo';
import { AiAgentsShowcase } from '@/components/marketing/ai-agents-showcase';
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
    title: 'Dealo — Hire checked office staff & skilled trades in Nigeria',
    description:
      'Hire checked office workers and skilled trades in Nigeria and across Africa. AI agents plus real recruiters send a shortlist in 48 hours, with a 90-day replacement.',
    keywords: ['hire talent Nigeria', 'recruitment agency Lagos', 'skilled trades staffing', 'managed staffing Nigeria', 'AI recruitment Africa'],
  }),
  title: { absolute: 'Dealo — Hire checked office staff & skilled trades in Nigeria' },
};

export default function HomePage() {
  return (
    <div>
      <HeroSection />
      <MarqueeStrip />
      <HomeStats />
      <AiAgentsShowcase />
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
