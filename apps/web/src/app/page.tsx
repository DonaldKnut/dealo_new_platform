import { AudienceSplit } from '@/components/marketing/audience-split';
import { CtaBanner } from '@/components/marketing/cta-banner';
import { HeroSection } from '@/components/marketing/hero-section';
import { HomeFeatureAds } from '@/components/marketing/home-feature-ads';
import { MarqueeStrip } from '@/components/marketing/marquee-strip';
import { ProcessRail } from '@/components/marketing/process-rail';
import { ServiceSpotlight } from '@/components/marketing/service-spotlight';
import { StatAdvert } from '@/components/marketing/stat-advert';
import { TalentShowcaseGrid } from '@/components/marketing/talent-showcase-grid';

export default function HomePage() {
  return (
    <div>
      <HeroSection />
      <MarqueeStrip />
      <StatAdvert
        items={[
          {
            value: '< 48 Hours',
            label: 'Rapid Shortlist Turnaround',
            sub: 'Disciplined role intake to 3 vetted candidates in your inbox.',
          },
          {
            value: 'Top 2%',
            label: 'Rigorous Multi-Tier Vetting',
            sub: 'Technical code audits, portfolio validation & background checks.',
          },
          {
            value: '98.4%',
            label: 'Long-Term Placement Retention',
            sub: 'Backed by commercial SLAs and 90-day replacement guarantees.',
          },
        ]}
      />
      <ServiceSpotlight />
      <TalentShowcaseGrid />
      <HomeFeatureAds />
      <ProcessRail />
      <AudienceSplit />
      <CtaBanner />
    </div>
  );
}
