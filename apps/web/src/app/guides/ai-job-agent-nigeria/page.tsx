import type { Metadata } from 'next';
import Link from 'next/link';

import { SeoGuide } from '@/components/marketing/seo-guide';
import { pageMetadata } from '@/lib/seo';

export const metadata: Metadata = pageMetadata({
  path: '/guides/ai-job-agent-nigeria',
  title: 'AI Job Agent Nigeria — auto-apply without shady bots',
  description:
    'How Dealo Job Agent hunts Nigerian jobs overnight: Easy Apply and ATS auto-send where allowed; supervised Assist on Workday-style pages. You stay in control.',
  keywords: ['AI job agent Nigeria', 'auto apply jobs Nigeria', 'AI apply jobs Lagos', 'job application bot Nigeria'],
});

export default function AiJobAgentGuidePage() {
  return (
    <SeoGuide
      path="/guides/ai-job-agent-nigeria"
      eyebrow="Product"
      title="AI Job Agent for Nigeria — apply smarter, not darker"
      lead="Dealo does not bypass CAPTCHA or steal employer passwords. It auto-sends where channels allow, and fills career forms under your eyes."
    >
      <p>
        Open{' '}
        <Link href="/job-agent" className="font-semibold text-brand">
          Job Agent
        </Link>
        , attach a Dealo-built CV and/or upload, pick titles like accountant or software engineer, and choose Auto or Review.
      </p>
      <ul className="list-disc space-y-2 pl-5">
        <li>
          <strong className="text-foreground">Auto channels:</strong> Easy Apply, email, partner ATS (Greenhouse, Lever, Workable, Ashby, SmartRecruiters, BambooHR, Recruitee).
        </li>
        <li>
          <strong className="text-foreground">Assist:</strong> Workday, Teamtailor, and many career pages — Copilot fills; you submit. Extension optional; prep pack works without it.
        </li>
      </ul>
      <p>
        Morning digests tell you what went out and what is ready. Credits are pay-as-you-go after free daily sends — see the{' '}
        <Link href="/faq" className="font-semibold text-brand">
          Job Agent FAQ
        </Link>
        .
      </p>
      <p>
        Combine with the{' '}
        <Link href="/jobs" className="font-semibold text-brand">
          job board
        </Link>{' '}
        when you want to browse by hand, or hub pages like{' '}
        <Link href="/jobs/in/lagos/software-engineer" className="font-semibold text-brand">
          software engineer jobs in Lagos
        </Link>
        .
      </p>
    </SeoGuide>
  );
}
