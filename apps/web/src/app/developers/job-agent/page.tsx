import type { Metadata } from 'next';

import { PartnerJobAgentGuide } from '@/components/marketing/partner-job-agent-guide';
import { BreadcrumbsJsonLd } from '@/components/seo/breadcrumbs-json-ld';
import { pageMetadata } from '@/lib/seo';

export const metadata: Metadata = pageMetadata({
  path: '/developers/job-agent',
  title: 'Partner guide — send jobs to Dealo Job Agents',
  description:
    'Step-by-step for job boards and HR tools: sync open jobs to Dealo, let Job Agents apply, receive applications by webhook and download CVs.',
  keywords: ['job board API Nigeria', 'Easy Apply partner', 'recruitment webhook', 'Job Agent API', 'ATS job sync'],
});

export default function PartnerJobAgentDocsPage() {
  return (
    <>
      <BreadcrumbsJsonLd
        items={[
          { name: 'Developers', path: '/developers' },
          { name: 'Job Agent partner guide', path: '/developers/job-agent' },
        ]}
      />
      <PartnerJobAgentGuide />
    </>
  );
}
