'use client';

import { ApiScope, SANDBOX_KEY_POLICY } from '@dealo/shared';
import { Code2, ExternalLink, KeyRound, LifeBuoy, PlugZap, ShieldCheck, Webhook } from 'lucide-react';
import Link from 'next/link';

import { useLocale } from '@/components/i18n/locale-context';
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
        title="API surface for office hiring and skilled trades"
        description="Designed for product teams, staffing platforms, and enterprise HR tools that need checked talent flows — not a public job board dump."
        items={[
          {
            icon: PlugZap,
            title: 'Hiring request intake',
            body: 'Create and track hire inquiries with role family, service type, and site or office details.',
          },
          {
            icon: Webhook,
            title: 'Status webhooks',
            body: 'Coming in Phase 2 — get notified when shortlists are ready or placements change.',
          },
          {
            icon: ShieldCheck,
            title: 'Scoped credentials',
            body: `API keys with scopes such as ${ApiScope.HIRE_INQUIRIES_READ} and ${ApiScope.HIRE_INQUIRIES_WRITE}.`,
          },
          {
            icon: KeyRound,
            title: 'Bearer API keys',
            body: 'Use Authorization: Bearer dk_live_… or dk_test_…. Keys are hashed at rest.',
          },
          {
            icon: Code2,
            title: 'Partner integrations',
            body: 'Connect Dealo into ATS, payroll, or ops tools under a commercial API plan.',
          },
          {
            icon: LifeBuoy,
            title: 'Developer support',
            body: 'Implementation help, sandbox guidance, and a clear path from pilot to production.',
          },
        ]}
      />

      <section className="container-page py-10 min-[340px]:py-14">
        <div className="rounded-[1.25rem] border border-border bg-surface-elevated/80 p-4 min-[340px]:rounded-[1.5rem] min-[340px]:p-7">
          <p className="eyebrow">Quickstart</p>
          <h2 className="display-title mt-2 text-[1.45rem] text-foreground min-[340px]:text-3xl">
            Call the API with a partner key
          </h2>
          <pre className="mt-4 overflow-x-auto rounded-xl border border-border bg-surface p-4 text-xs text-foreground">
            {curl}
          </pre>
          <p className="mt-3 text-sm text-muted">
            Sign in as an employer to create a free sandbox key ({SANDBOX_KEY_POLICY.rateLimitPerMin}{' '}
            requests/min, test data only). Live keys are issued by Dealo. Available scopes:{' '}
            {Object.values(ApiScope).join(', ')}.
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
