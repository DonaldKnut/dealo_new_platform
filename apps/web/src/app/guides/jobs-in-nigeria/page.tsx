import type { Metadata } from 'next';
import Link from 'next/link';

import { SeoGuide } from '@/components/marketing/seo-guide';
import { pageMetadata } from '@/lib/seo';

export const metadata: Metadata = pageMetadata({
  path: '/guides/jobs-in-nigeria',
  title: 'Jobs in Nigeria — how to find & apply in 2026',
  description:
    'Where Nigerians actually find jobs: Lagos hubs, remote roles, Easy Apply, and AI Job Agent. A clear guide from Dealo.',
  keywords: ['jobs in Nigeria', 'how to find jobs in Lagos', 'vacancies Nigeria', 'remote jobs Nigeria'],
});

export default function JobsInNigeriaGuidePage() {
  return (
    <SeoGuide
      path="/guides/jobs-in-nigeria"
      eyebrow="Guide"
      title="Jobs in Nigeria — find work without the noise"
      lead="WhatsApp forwards and endless LinkedIn refreshes waste hours. Dealo puts Lagos, Abuja, and remote openings on crawlable pages — then helps you apply."
    >
      <p>
        Start on the{' '}
        <Link href="/jobs" className="font-semibold text-brand">
          Nigeria job board
        </Link>
        , then drill into cities that match you:
      </p>
      <ul className="list-disc space-y-2 pl-5">
        <li>
          <Link href="/jobs/in/lagos" className="font-semibold text-brand">
            Jobs in Lagos
          </Link>{' '}
          — Island, Mainland, hybrid
        </li>
        <li>
          <Link href="/jobs/in/abuja" className="font-semibold text-brand">
            Jobs in Abuja
          </Link>
        </li>
        <li>
          <Link href="/jobs/in/remote-nigeria" className="font-semibold text-brand">
            Remote jobs in Nigeria
          </Link>
        </li>
      </ul>
      <p>
        Every listing has its own URL (good for Google, good for sharing). Dealo-hosted roles support Easy Apply with the CV you built here; career-site roles can go through{' '}
        <Link href="/job-agent" className="font-semibold text-brand">
          Job Agent Assist
        </Link>{' '}
        — you still click Submit.
      </p>
      <p>
        Pair this with a clean{' '}
        <Link href="/guides/cv-builder-nigeria" className="font-semibold text-brand">
          Nigerian CV
        </Link>{' '}
        so ATS software and humans can both read you.
      </p>
    </SeoGuide>
  );
}
