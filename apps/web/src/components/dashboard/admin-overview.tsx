'use client';

import {
  ArrowUpRight,
  Gauge,
  Newspaper,
  Target,
  TrendingUp,
  UserRound,
  Users,
} from 'lucide-react';
import Link from 'next/link';

import {
  DashHero,
  DashKpi,
  DashPanel,
  QuickLink,
  StatusChip,
} from '@/components/dashboard/dashboard-ui';
import type { AdminWorkspace, DashboardUserCore } from '@/lib/dashboard-api';

export function AdminOverview({
  user,
  workspace,
}: {
  user: DashboardUserCore;
  workspace: AdminWorkspace;
}) {
  const pipelineMax = Math.max(workspace.pipeline.total, 1);
  const stages = [
    { key: 'New', value: workspace.pipeline.new },
    { key: 'Contacted', value: workspace.pipeline.contacted },
    { key: 'Qualified', value: workspace.pipeline.qualified },
    { key: 'Converted', value: workspace.pipeline.converted },
    { key: 'Closed', value: workspace.pipeline.closed },
  ];

  return (
    <div className="dash-atmosphere space-y-8">
      <DashHero
        eyebrow="Admin ops"
        title={`Good to see you, ${user.firstName}`}
        subtitle={workspace.subcopy}
        actions={
          <>
            <Link href="/dashboard/requests" className="btn-primary">
              Triage requests
              <ArrowUpRight className="h-4 w-4" />
            </Link>
            <Link href="/dashboard/talent" className="btn-secondary">
              Candidates
            </Link>
          </>
        }
      />

      <div className="grid gap-3 min-[400px]:grid-cols-2 xl:grid-cols-5">
        <DashKpi
          label="Open pipeline"
          value={String(workspace.kpis.openPipeline)}
          hint="New + contacted + qualified"
          icon={Gauge}
          delay={0.02}
        />
        <DashKpi
          label="Conversion"
          value={`${workspace.kpis.conversionRate}%`}
          hint="Converted vs all requests"
          icon={Target}
          delay={0.05}
        />
        <DashKpi
          label="New this week"
          value={String(workspace.kpis.newThisWeek)}
          hint="Inbound hire requests"
          icon={TrendingUp}
          delay={0.08}
        />
        <DashKpi
          label="Filled this week"
          value={String(workspace.kpis.convertedThisWeek)}
          hint="Moved to converted"
          icon={Users}
          delay={0.11}
        />
        <DashKpi
          label="Screened talent"
          value={String(workspace.kpis.activeTalentPool)}
          hint="Ready for shortlists"
          icon={UserRound}
          delay={0.14}
        />
      </div>

      {workspace.attention.length > 0 ? (
        <DashPanel title="Needs attention">
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {workspace.attention.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className={`rounded-xl border px-4 py-3 text-sm transition hover:border-brand/40 ${
                  item.tone === 'urgent'
                    ? 'border-danger/30 bg-danger/5 text-foreground'
                    : 'border-border bg-surface/60 text-foreground'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </DashPanel>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[1.35fr_1fr]">
        <DashPanel
          title="Hiring pipeline"
          action={
            <Link href="/dashboard/requests" className="text-sm font-semibold text-brand">
              View all
            </Link>
          }
        >
          <div className="space-y-4">
            {stages.map((stage) => (
              <div key={stage.key}>
                <div className="mb-1.5 flex items-center justify-between text-xs">
                  <span className="font-medium text-foreground">{stage.key}</span>
                  <span className="tabular-nums text-muted">{stage.value}</span>
                </div>
                <div className="dash-progress">
                  <span style={{ width: `${Math.max(4, (stage.value / pipelineMax) * 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 dash-rail">
            {workspace.recentRequests.length === 0 ? (
              <p className="text-sm text-muted">No hire inquiries yet.</p>
            ) : (
              workspace.recentRequests.map((item) => (
                <div key={item.id} className="dash-rail-item">
                  <div className="min-w-0 sm:col-span-1">
                    <p className="truncate text-sm font-medium text-foreground">{item.roleTitle}</p>
                    <p className="mt-0.5 truncate text-xs text-muted">
                      {item.companyName} · {item.numberOfProfessionals} seats
                    </p>
                  </div>
                  <StatusChip status={item.status} />
                </div>
              ))
            )}
          </div>
        </DashPanel>

        <div className="space-y-5">
          <DashPanel title="Platform pulse">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Users', value: workspace.users.total },
                { label: 'Employers', value: workspace.users.employers },
                { label: 'Talent', value: workspace.users.talent },
                { label: 'Staff', value: workspace.users.staff },
              ].map((stat) => (
                <div key={stat.label} className="rounded-xl border border-border px-3 py-3">
                  <p className="text-[11px] uppercase tracking-[0.12em] text-muted">{stat.label}</p>
                  <p className="mt-1 font-display text-2xl tabular-nums">{stat.value}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 grid gap-2">
              <QuickLink
                href="/dashboard/users"
                label="User directory"
                description="Accounts, roles, verification"
              />
              <QuickLink
                href="/dashboard/talent"
                label="Screening desk"
                description={`${workspace.talentOps.inScreening} in screening · ${workspace.talentOps.shortlists} shortlists`}
              />
            </div>
          </DashPanel>

          <DashPanel
            title="Content & outreach"
            action={<Newspaper className="h-4 w-4 text-brand" />}
          >
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl border border-border px-2 py-3">
                <p className="font-display text-xl tabular-nums">{workspace.content.publishedPosts}</p>
                <p className="mt-1 text-[11px] text-muted">Published</p>
              </div>
              <div className="rounded-xl border border-border px-2 py-3">
                <p className="font-display text-xl tabular-nums">{workspace.content.draftPosts}</p>
                <p className="mt-1 text-[11px] text-muted">Drafts</p>
              </div>
              <div className="rounded-xl border border-border px-2 py-3">
                <p className="font-display text-xl tabular-nums">{workspace.content.newsletterSent}</p>
                <p className="mt-1 text-[11px] text-muted">Blasts</p>
              </div>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <Link href="/dashboard/blog" className="btn-secondary justify-center">
                Blog CMS
              </Link>
              <Link href="/dashboard/newsletter" className="btn-secondary justify-center">
                Newsletter
              </Link>
            </div>
          </DashPanel>
        </div>
      </div>

      <DashPanel title="Newest accounts">
        <div className="dash-rail">
          {workspace.recentUsers.map((row) => (
            <div key={row.id} className="dash-rail-item">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-soft text-xs font-bold text-brand">
                {(row.firstName?.[0] || row.email[0] || 'U').toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {row.firstName} {row.lastName}
                </p>
                <p className="truncate text-xs text-muted">{row.email}</p>
              </div>
              <span className="text-[11px] text-muted">{row.roles[0] ?? 'USER'}</span>
            </div>
          ))}
        </div>
      </DashPanel>
    </div>
  );
}
