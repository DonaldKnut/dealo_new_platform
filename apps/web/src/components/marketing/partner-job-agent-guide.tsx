'use client';

import { ArrowRight, BookOpen, Check, Copy, KeyRound, Plug, Radar, Webhook } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { useModal } from '@/components/modals/modal-context';
import { cn } from '@/lib/utils';

function apiOrigin() {
  const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';
  return base.replace(/\/api\/v1\/?$/, '');
}

function CopyBlock({ label, code }: { label: string; code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-[#06140d] text-white shadow-sm">
      <div className="flex items-center justify-between gap-2 border-b border-white/10 px-3 py-2 min-[360px]:px-4">
        <p className="truncate font-mono text-[10.5px] text-white/55 min-[360px]:text-[11px]">{label}</p>
        <button
          type="button"
          className="inline-flex shrink-0 items-center gap-1 rounded-full border border-white/15 px-2.5 py-1 text-[11px] font-semibold text-white/80 transition hover:bg-white/10"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(code);
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1600);
            } catch {
              /* ignore */
            }
          }}
        >
          <Copy className="h-3 w-3" /> {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="max-h-[22rem] overflow-auto p-3 text-[11px] leading-relaxed text-[#d8f5e4] min-[360px]:p-4 min-[360px]:text-[12px]">
        <code>{code}</code>
      </pre>
    </div>
  );
}

const STEPS = [
  {
    n: '1',
    title: 'Get a key from Dealo',
    body: 'Message us and ask for a partner API key. You get a test key first (starts with dk_test_). Live keys start with dk_live_. Keep the key secret — it is shown once.',
  },
  {
    n: '2',
    title: 'Send us your open jobs',
    body: 'Call PUT /ats-api/jobs/sync with a list of jobs. Use your own id in externalId so you can update or close the same job later. Open jobs show on Dealo and Job Agents can apply.',
  },
  {
    n: '3',
    title: 'Listen for new applications',
    body: 'Add a webhook URL in your Dealo workspace. When someone (or their Job Agent) applies, we POST application.created to your URL. Then fetch the CV.',
  },
  {
    n: '4',
    title: 'Close jobs you filled',
    body: 'Sync the same externalId again with status CLOSED. It leaves the Dealo board. Agents stop applying.',
  },
] as const;

/** Step-by-step partner guide — written for a first-time API user. */
export function PartnerJobAgentGuide() {
  const { open } = useModal();
  const origin = apiOrigin();
  const base = `${origin}/api/v1`;
  const docsUrl = `${origin}/api/docs`;

  const syncExample = `curl -X PUT ${base}/ats-api/jobs/sync \\
  -H "Authorization: Bearer dk_test_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
  "jobs": [
    {
      "externalId": "your-job-4821",
      "title": "Sales Executive",
      "location": "Lagos, Nigeria",
      "roleFamily": "OFFICE_PROFESSIONAL",
      "workArrangement": "HYBRID",
      "employmentType": "FULL_TIME",
      "description": "Sell to retail accounts across Lagos. 2+ years in B2B sales preferred.",
      "mustHaves": ["2+ years sales", "Fluent English"],
      "currency": "NGN",
      "salaryMinMinor": 35000000,
      "salaryMaxMinor": 45000000,
      "status": "OPEN"
    }
  ]
}'`;

  const webhookSample = `{
  "event": "application.created",
  "deliveredAt": "2026-11-13T20:00:00.000Z",
  "data": {
    "application": {
      "id": "673abc…",
      "name": "Ada Okafor",
      "email": "ada@example.com",
      "phone": "+234…",
      "stage": "Applied",
      "source": "job_agent"
    },
    "job": {
      "id": "673def…",
      "title": "Sales Executive",
      "externalRef": "your-job-4821"
    }
  }
}`;

  const cvExample = `curl -L "${base}/ats-api/applications/APPLICATION_ID/cv" \\
  -H "Authorization: Bearer dk_test_YOUR_KEY" \\
  -o candidate-cv.pdf`;

  const closeExample = `curl -X PUT ${base}/ats-api/jobs/sync \\
  -H "Authorization: Bearer dk_test_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
  "jobs": [{
    "externalId": "your-job-4821",
    "title": "Sales Executive",
    "location": "Lagos, Nigeria",
    "roleFamily": "OFFICE_PROFESSIONAL",
    "workArrangement": "HYBRID",
    "employmentType": "FULL_TIME",
    "description": "Same description as before…",
    "mustHaves": ["2+ years sales"],
    "status": "CLOSED"
  }]
}'`;

  return (
    <div>
      <section className="relative overflow-hidden border-b border-border bg-[radial-gradient(ellipse_at_top,color-mix(in_srgb,var(--brand)_14%,transparent),transparent_55%)] pb-12 pt-24 min-[340px]:pt-28 sm:pb-16 sm:pt-32">
        <div className="container-page">
          <p className="eyebrow inline-flex items-center gap-1.5">
            <Plug className="h-3.5 w-3.5" /> Partner guide · Job Agent
          </p>
          <h1 className="mt-3 max-w-3xl break-words font-display text-[1.75rem] leading-[1.08] text-foreground min-[360px]:text-4xl sm:text-5xl">
            Send your jobs to Dealo. Job Agents apply. You get the CVs.
          </h1>
          <p className="mt-4 max-w-2xl text-[14px] leading-relaxed text-muted sm:text-base">
            This guide is for job boards and HR tools. You do not give Dealo your login. You push jobs with one API
            call. People on Dealo (and their Job Agents) apply. We tell your server, and you download the CV.
          </p>
          <div className="mt-7 flex flex-col gap-2.5 min-[400px]:flex-row min-[400px]:flex-wrap">
            <button type="button" className="btn-primary" onClick={() => open('contact')}>
              <KeyRound className="h-4 w-4" /> Ask for a partner key
            </button>
            <a href={docsUrl} target="_blank" rel="noopener noreferrer" className="btn-secondary">
              <BookOpen className="h-4 w-4" /> Open live API docs
            </a>
            <Link href="/job-agent" className="btn-secondary">
              <Radar className="h-4 w-4" /> What Job Agent is
            </Link>
          </div>
        </div>
      </section>

      <section className="container-page py-12 sm:py-16">
        <h2 className="font-display text-2xl text-foreground min-[360px]:text-3xl">The idea in one picture</h2>
        <ol className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            'Your board has open jobs',
            'You sync them to Dealo',
            'Job Agents apply with a CV',
            'Your server gets the applicant',
          ].map((text, i) => (
            <li key={text} className="rounded-2xl border border-border bg-surface-elevated p-4">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-brand/15 text-xs font-bold text-brand">
                {i + 1}
              </span>
              <p className="mt-3 text-sm font-semibold text-foreground">{text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="container-page pb-12 sm:pb-16">
        <h2 className="font-display text-2xl text-foreground min-[360px]:text-3xl">Follow these four steps</h2>
        <div className="mt-6 space-y-4">
          {STEPS.map((step) => (
            <div key={step.n} className="flex gap-3 rounded-2xl border border-border bg-surface-elevated p-4 min-[360px]:gap-4 min-[360px]:p-5">
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand text-sm font-bold text-white dark:text-[#071f14]">
                {step.n}
              </span>
              <div className="min-w-0">
                <h3 className="font-semibold text-foreground">{step.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted">{step.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="container-page space-y-8 pb-12 sm:pb-16">
        <div>
          <h2 className="font-display text-2xl text-foreground min-[360px]:text-3xl">Step 2 · copy-paste: sync jobs</h2>
          <p className="mt-2 max-w-2xl text-sm text-muted">
            Salaries use kobo (multiply Naira by 100). So ₦350,000 = <code className="rounded bg-surface px-1">35000000</code>.
            You can send up to 100 jobs per call. <code className="rounded bg-surface px-1">roleFamily</code> is{' '}
            <code className="rounded bg-surface px-1">OFFICE_PROFESSIONAL</code> or{' '}
            <code className="rounded bg-surface px-1">SKILLED_TRADE</code>.
          </p>
          <div className="mt-4">
            <CopyBlock label="PUT /api/v1/ats-api/jobs/sync" code={syncExample} />
          </div>
          <ul className="mt-4 space-y-2 text-sm text-foreground">
            {[
              'Need scopes on the key: jobs:write (and later applications:read).',
              'Same externalId again = update that job. Change status to CLOSED to take it down.',
              'If you hit your open-job limit, that job is skipped and the response says why.',
            ].map((line) => (
              <li key={line} className="flex gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand" /> <span className="min-w-0">{line}</span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="flex flex-wrap items-center gap-2 font-display text-2xl text-foreground min-[360px]:text-3xl">
            <Webhook className="h-6 w-6 text-brand" /> Step 3 · when someone applies
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-muted">
            Subscribe to <code className="rounded bg-surface px-1">application.created</code>. We sign each POST. Reply
            with HTTP 200 quickly. If your server is down, we retry for about an hour.
          </p>
          <div className="mt-4">
            <CopyBlock label="Example webhook body (simplified)" code={webhookSample} />
          </div>
          <p className="mt-4 text-sm text-muted">Then download the CV (PDF or Word):</p>
          <div className="mt-3">
            <CopyBlock label="GET /api/v1/ats-api/applications/{id}/cv" code={cvExample} />
          </div>
          <p className="mt-3 text-sm text-muted">
            Also useful: <code className="rounded bg-surface px-1">GET /ats-api/applications/{'{id}'}</code> for full
            details, and <code className="rounded bg-surface px-1">GET /ats-api/jobs/{'{jobId}'}/applications</code> to
            list applicants for one job.
          </p>
        </div>

        <div>
          <h2 className="font-display text-2xl text-foreground min-[360px]:text-3xl">Step 4 · close a filled job</h2>
          <p className="mt-2 max-w-2xl text-sm text-muted">Send the same job again with status CLOSED.</p>
          <div className="mt-4">
            <CopyBlock label="Close with the same externalId" code={closeExample} />
          </div>
        </div>
      </section>

      <section className="container-page pb-12 sm:pb-16">
        <div className="rounded-[1.5rem] border border-border bg-surface-elevated p-5 min-[360px]:p-8 sm:rounded-[2rem]">
          <h2 className="font-display text-2xl text-foreground">Pricing (early partners free)</h2>
          <p className="mt-2 max-w-2xl text-sm text-muted">
            While we prove volume together, early partners stay on free early access. When apply volume is real, you can move to a monthly plan or pay per apply — same sync and webhooks either way.
          </p>
          <ul className="mt-4 grid gap-3 sm:grid-cols-3">
            {[
              ['Early access', 'Free. Soft caps on open jobs and applies. No card.'],
              ['Monthly', 'Flat fee + a pool of included applications. Overage per apply.'],
              ['Pay per apply', 'No monthly fee. You pay only when someone applies to your synced job.'],
            ].map(([title, body]) => (
              <li key={title} className="rounded-xl border border-border bg-surface px-3 py-3">
                <p className="text-sm font-semibold text-foreground">{title}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted">{body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="container-page pb-12 sm:pb-16">
        <div className="rounded-[1.5rem] border border-border bg-surface-elevated p-5 min-[360px]:p-8 sm:rounded-[2rem]">
          <h2 className="font-display text-2xl text-foreground">Common mistakes</h2>
          <ul className="mt-4 space-y-3 text-sm text-foreground">
            {[
              ['Forgot Authorization header', 'Every call needs Authorization: Bearer YOUR_KEY'],
              ['Salary in Naira instead of kobo', 'Multiply by 100. ₦400k → 40000000'],
              ['New externalId every time', 'Reuse the same id to update or close'],
              ['Description too short', 'Write at least a few sentences (20+ characters)'],
              ['Expecting autofill on your website', 'We never log into your site. Sync jobs here; get applications back'],
            ].map(([title, body]) => (
              <li key={title} className="rounded-xl border border-border bg-surface px-3 py-2.5">
                <p className="font-semibold">{title}</p>
                <p className="mt-0.5 text-muted">{body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="container-page pb-16 sm:pb-24">
        <div
          className={cn(
            'relative overflow-hidden rounded-[1.5rem] bg-[#05170e] p-6 text-white min-[360px]:rounded-[2rem] min-[360px]:p-8 sm:p-10',
          )}
        >
          <span aria-hidden className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-[#7cff4d]/20 blur-3xl" />
          <h2 className="relative font-display text-2xl min-[360px]:text-3xl">Ready to connect?</h2>
          <p className="relative mt-3 max-w-xl text-sm text-white/70">
            Ask for a partner key. We help you make the first sync call. No card needed for the test key.
          </p>
          <div className="relative mt-6 flex flex-col gap-2.5 min-[400px]:flex-row">
            <button type="button" className="inline-flex items-center justify-center gap-2 rounded-full bg-[#7cff4d] px-5 py-3 text-sm font-semibold text-[#062417]" onClick={() => open('contact')}>
              Ask for API access <ArrowRight className="h-4 w-4" />
            </button>
            <a href={docsUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 rounded-full border border-white/20 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10">
              Try it in Swagger
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
