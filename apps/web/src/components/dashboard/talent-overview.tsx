'use client';

import {
  ArrowUpRight,
  CheckCircle2,
  Circle,
  FileText,
  Sparkles,
  Target,
} from 'lucide-react';
import Link from 'next/link';

import {
  DashHero,
  DashKpi,
  DashPanel,
  StatusChip,
} from '@/components/dashboard/dashboard-ui';
import type { DashboardUserCore, TalentWorkspace } from '@/lib/dashboard-api';

export function TalentOverview({
  user,
  workspace,
}: {
  user: DashboardUserCore;
  workspace: TalentWorkspace;
}) {
  return (
    <div className="dash-atmosphere space-y-8">
      <DashHero
        eyebrow="Talent"
        title={`${user.firstName}, stay shortlist-ready`}
        subtitle={workspace.subcopy}
        actions={
          <>
            <Link href="/dashboard/documents" className="btn-primary">
              Upload documents
              <ArrowUpRight className="h-4 w-4" />
            </Link>
            <Link href="/dashboard/matches" className="btn-secondary">
              View matches
            </Link>
          </>
        }
      />

      <div className="grid gap-3 min-[400px]:grid-cols-2 xl:grid-cols-4">
        <DashKpi
          label="Readiness"
          value={`${workspace.kpis.readiness}%`}
          hint="Profile + documents completion"
          icon={Sparkles}
          delay={0.02}
        />
        <DashKpi
          label="Matches"
          value={String(workspace.kpis.matches)}
          hint="Active shortlist placements"
          icon={Target}
          delay={0.05}
        />
        <DashKpi
          label="Documents"
          value={String(workspace.kpis.documents)}
          hint="Files on your talent profile"
          icon={FileText}
          delay={0.08}
        />
        <DashKpi
          label="Screening"
          value={workspace.kpis.screenStatus.replaceAll('_', ' ')}
          hint="Current recruiter status"
          icon={CheckCircle2}
          delay={0.11}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_1.15fr]">
        <DashPanel title="Profile checklist">
          <div className="mb-4">
            <div className="mb-2 flex items-center justify-between text-xs">
              <span className="text-muted">Completion</span>
              <span className="tabular-nums font-semibold text-foreground">
                {workspace.kpis.readiness}%
              </span>
            </div>
            <div className="dash-progress">
              <span style={{ width: `${Math.max(workspace.kpis.readiness, 4)}%` }} />
            </div>
          </div>
          <ul className="space-y-2.5">
            {workspace.checklist.map((item) => (
              <li
                key={item.id}
                className="flex items-center gap-3 rounded-xl border border-border px-3 py-2.5"
              >
                {item.done ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                ) : (
                  <Circle className="h-4 w-4 shrink-0 text-muted" />
                )}
                <span className={`text-sm ${item.done ? 'text-foreground' : 'text-muted'}`}>
                  {item.label}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/dashboard/documents" className="btn-primary">
              Manage documents
            </Link>
            <Link href="/dashboard/settings" className="btn-secondary">
              Settings
            </Link>
          </div>
        </DashPanel>

        <DashPanel
          title="Latest matches"
          action={
            <Link href="/dashboard/matches" className="text-sm font-semibold text-brand">
              All matches
            </Link>
          }
        >
          {workspace.recentMatches.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted">
              No shortlist matches yet. Complete your checklist so recruiters can place you faster.
            </div>
          ) : (
            <div className="dash-rail">
              {workspace.recentMatches.map((match) => (
                <div key={match.id} className="dash-rail-item">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{match.roleTitle}</p>
                    <p className="mt-0.5 truncate text-xs text-muted">
                      {match.companyName} · {match.location} · Rank #{match.rank + 1}
                    </p>
                  </div>
                  <StatusChip status={match.status} />
                </div>
              ))}
            </div>
          )}
        </DashPanel>
      </div>

      <DashPanel title="Your profile card">
        <div className="grid gap-4 sm:grid-cols-[auto_1fr] sm:items-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-soft font-display text-2xl text-brand">
            {(workspace.candidate.fullName?.[0] || user.firstName?.[0] || 'T').toUpperCase()}
          </div>
          <div>
            <p className="font-display text-2xl text-foreground">{workspace.candidate.fullName}</p>
            <p className="mt-1 text-sm text-muted">
              {workspace.candidate.roleTitle || 'Role title not set'} ·{' '}
              {workspace.candidate.location || 'Location not set'}
            </p>
            <p className="mt-2 text-xs text-muted">{workspace.candidate.email}</p>
          </div>
        </div>
      </DashPanel>
    </div>
  );
}
