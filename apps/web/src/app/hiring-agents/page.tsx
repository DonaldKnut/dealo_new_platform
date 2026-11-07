import { AGENT_PLANS } from '@dealo/shared';
import type { Metadata } from 'next';

import { HiringAgentsLanding } from '@/components/agents/hiring-agents-landing';
import { safeJsonLd } from '@/components/ats/careers-shell';
import { APP_URL, pageMetadata } from '@/lib/seo';

export const metadata: Metadata = pageMetadata({
  path: '/hiring-agents',
  title: 'Hiring Agents — your AI recruiting team for Nigerian hiring',
  description:
    'Seven AI agents that screen CVs, write fair job posts, source candidates, follow up, book interviews and brief your team every morning. A person approves every step. Free to start.',
  keywords: ['AI recruiting agents', 'AI hiring Nigeria', 'automated CV screening', 'recruitment automation', 'ATS Nigeria', 'interview scheduling automation'],
});

export default function HiringAgentsPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Dealo Hiring Agents',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    url: `${APP_URL}/hiring-agents`,
    description: 'AI agents for screening, job posts, sourcing, candidate follow-up, interview scheduling, interview kits and daily hiring briefings.',
    offers: [
      { '@type': 'Offer', name: 'Free', price: '0', priceCurrency: 'NGN' },
      { '@type': 'Offer', name: 'Pro', price: String(AGENT_PLANS.PRO.priceMinor / 100), priceCurrency: 'NGN' },
    ],
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />
      <HiringAgentsLanding />
    </>
  );
}
