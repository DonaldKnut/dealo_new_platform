'use client';

import { ApiScope, SANDBOX_KEY_POLICY } from '@dealo/shared';
import { Code2, ExternalLink, KeyRound, LifeBuoy, PlugZap, ShieldCheck, Webhook } from 'lucide-react';
import Link from 'next/link';

import { useLocale } from '@/components/i18n/locale-context';
import { ApiPlansSection } from '@/components/marketing/api-plans-section';
import { CtaBanner } from '@/components/marketing/cta-banner';
import { FeatureAdGrid } from '@/components/marketing/feature-ad-grid';
import { PageHero } from '@/components/marketing/page-hero';
import { useModal } from '@/components/modals/modal-context';

function apiOrigin() {
  const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';
  return base.replace(/\/api\/v1\/?$/, '');
}

export default function DevelopersPage() {
  const { open } = useModal();
  const { t } = useLocale();
  const origin = apiOrigin();
  const docsUrl = `${origin}/api/docs`;
  const openApiUrl = `${origin}/api/openapi.json`;
  const healthUrl = `${origin}/health`;

  const curl = `curl -s ${origin}/api/v1/hire-inquiries \\
  -H "Authorization: Bearer dk_test_YOUR_KEY" \\
  -H "Content-Type: application/json"`;

  return (
    <div>
      <PageHero
        eyebrow={t('dev.eyebrow')}
        title={t('dev.title')}
        description={t('dev.body')}
        actions={
          <>
            <a href={docsUrl} target="_blank" rel="noopener noreferrer" className="btn-primary">
              Open Swagger docs
              <ExternalLink className="h-4 w-4" />
            </a>
            <button type="button" className="btn-secondary" onClick={() => open('contact')}>
              {t('dev.cta')}
            </button>
          </>
        }
      />

      <section className="container-page py-8 min-[340px]:py-12">
        <div className="grid gap-4 md:grid-cols-3">
          <a
            href={docsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="ui-card p-5 transition hover:border-brand/40"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-brand">Swagger UI</p>
            <p className="mt-2 font-display text-lg text-foreground">Interactive API explorer</p>
            <p className="mt-1 break-all text-xs text-muted">{docsUrl}</p>
          </a>
          <a
            href={openApiUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="ui-card p-5 transition hover:border-brand/40"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-brand">OpenAPI</p>
            <p className="mt-2 font-display text-lg text-foreground">Machine-readable spec</p>
            <p className="mt-1 break-all text-xs text-muted">{openApiUrl}</p>
          </a>
          <a
            href={healthUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="ui-card p-5 transition hover:border-brand/40"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-brand">Health</p>
            <p className="mt-2 font-display text-lg text-foreground">Live status JSON</p>
            <p className="mt-1 break-all text-xs text-muted">{healthUrl}</p>
          </a>
        </div>
      </section>

      <FeatureAdGrid
        eyebrow="What you can build"
        title="Plug Dealo hiring into your own app"
        description="For HR tools, staffing platforms and product teams. Send hiring requests in, get updates back."
        items={[
          {
            icon: PlugZap,
            title: 'Send hiring requests',
            body: 'Create a request with the role, location and how many people you need.',
          },
          {
            icon: Webhook,
            title: 'Get live updates',
            body: 'We call your URL when a request is created or its status changes. Signed and retried.',
          },
          {
            icon: ShieldCheck,
            title: 'Keys with limits',
            body: `Each key only does what you allow, like ${ApiScope.HIRE_INQUIRIES_READ}.`,
          },
          {
            icon: KeyRound,
            title: 'Simple sign-in',
            body: 'Send Authorization: Bearer dk_test_… with each call. We never store keys in plain text.',
          },
          {
            icon: Code2,
            title: 'Works with your tools',
            body: 'Connect Dealo to your ATS, payroll or operations tools.',
          },
          {
            icon: LifeBuoy,
            title: 'Real people to help',
            body: 'We help you test in the sandbox and go live safely.',
          },
        ]}
      />

      <section id="webhooks" className="container-page scroll-mt-24 py-10 min-[340px]:py-14">
        <div className="grid grid-cols-1 gap-4 rounded-[1.25rem] border border-border bg-surface-elevated/80 p-4 min-[340px]:rounded-[1.5rem] min-[340px]:p-7 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div>
            <p className="eyebrow">Webhooks</p>
            <h2 className="display-title mt-2 text-[1.45rem] text-foreground min-[340px]:text-3xl">
              We tell you when things change
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              Add your URL in Dashboard → Developer API. We send a signed message each time a
              hiring request is created or moves to a new status. If your server is down, we try
              again for about an hour.
            </p>
          </div>
          <ul className="grid gap-2 text-sm">
            {[
              ['hire_inquiry.created', 'A new hiring request came in'],
              ['hire_inquiry.status_updated', 'A request moved to a new status'],
              ['ping', 'A test you sent from the dashboard'],
            ].map(([event, meaning]) => (
              <li key={event} className="rounded-xl border border-border bg-surface px-3 py-2.5">
                <code className="break-all text-xs font-semibold text-brand">{event}</code>
                <p className="mt-0.5 text-xs text-muted">{meaning}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <ApiPlansSection />

      <section className="container-page py-10 min-[340px]:py-14">
        <div className="rounded-[1.25rem] border border-border bg-surface-elevated/80 p-4 min-[340px]:rounded-[1.5rem] min-[340px]:p-7">
          <p className="eyebrow">Quickstart</p>
          <h2 className="display-title mt-2 text-[1.45rem] text-foreground min-[340px]:text-3xl">
            Make your first call
          </h2>
          <pre className="mt-4 overflow-x-auto rounded-xl border border-border bg-surface p-4 text-xs text-foreground">
            {curl}
          </pre>
          <p className="mt-3 text-sm text-muted">
            Sign in as a company to get a free test key ({SANDBOX_KEY_POLICY.rateLimitPerMin} calls a
            minute, test data only). Pick a paid plan when you are ready to go live.
          </p>
          <div className="mt-5 flex flex-col gap-2 min-[400px]:flex-row">
            <Link href="/dashboard/developer" className="btn-primary">
              Get a sandbox key
            </Link>
            <a href={docsUrl} target="_blank" rel="noopener noreferrer" className="btn-secondary">
              Explore in Swagger
            </a>
            <button type="button" className="btn-secondary" onClick={() => open('contact')}>
              Ask about API pricing
            </button>
          </div>
        </div>
      </section>

      <CtaBanner />
    </div>
  );
}
