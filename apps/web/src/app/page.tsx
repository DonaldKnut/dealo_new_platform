import { AiAgentsShowcase } from '@/components/marketing/ai-agents-showcase';
import { AudienceSplit } from '@/components/marketing/audience-split';
import { CoverageScope } from '@/components/marketing/coverage-scope';
import { CtaBanner } from '@/components/marketing/cta-banner';
import { HeroSection } from '@/components/marketing/hero-section';
import { HomeFeatureAds } from '@/components/marketing/home-feature-ads';
import { HomeStats } from '@/components/marketing/home-stats';
import { MarqueeStrip } from '@/components/marketing/marquee-strip';
import { PricingPackages } from '@/components/marketing/pricing-packages';
import { ProcessRail } from '@/components/marketing/process-rail';
import { ServiceSpotlight } from '@/components/marketing/service-spotlight';
import { TalentShowcaseGrid } from '@/components/marketing/talent-showcase-grid';

export default function HomePage() {
  return (
    <div>
      <HeroSection />
      <MarqueeStrip />
      <HomeStats />
      <AiAgentsShowcase />
      <CoverageScope />
      <ServiceSpotlight />
      <TalentShowcaseGrid />
      <PricingPackages />
      <HomeFeatureAds />
      <ProcessRail />
      <AudienceSplit />
      <CtaBanner />
    </div>
  );
}
