'use client';

import {
  ArrowUpRight,
  Briefcase,
  Building2,
  CheckCircle2,
  Clock3,
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
import { useOpenHireRequest } from '@/components/dashboard/dashboard-session';
import type { DashboardUserCore, EmployerWorkspace } from '@/lib/dashboard-api';

export function EmployerOverview({
  user,
  workspace,
}: {
  user: DashboardUserCore;
  workspace: EmployerWorkspace;
}) {
  const openHireRequest = useOpenHireRequest();
  return (
    <div className="dash-atmosphere space-y-8">
      <DashHero
        eyebrow="Employer"
        title={`Welcome, ${user.firstName}`}
        subtitle={workspace.subcopy}
        actions={
          <>
            <button type="button" onClick={openHireRequest} className="btn-primary">
              Request talent
              <ArrowUpRight className="h-4 w-4" />
            </button>
            <Link href="/dashboard/requests" className="btn-secondary">
              My requests
            </Link>
          </>
        }
      />

      <div className="grid gap-3 min-[400px]:grid-cols-2 xl:grid-cols-4">
        <DashKpi
          label="Open requests"
          value={String(workspace.kpis.activeRequests)}
          hint="Dealo is working on these"
          icon={Clock3}
          delay={0.02}
        />
        <DashKpi
          label="Roles open"
          value={String(workspace.kpis.rolesInFlight)}
          hint="Jobs from your recent requests"
          icon={Briefcase}
          delay={0.05}
        />
        <DashKpi
          label="People needed"
          value={String(workspace.kpis.peopleRequested)}
          hint="Across your recent roles"
          icon={Users}
          delay={0.08}
        />
        <DashKpi
          label="Filled"
          value={String(workspace.kpis.filled)}
          hint="Roles we helped you fill"
          icon={CheckCircle2}
          delay={0.11}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.25fr_1fr]">
        <DashPanel
          title="Your requests"
          action={
            <Link href="/dashboard/requests" className="text-sm font-semibold text-brand">
              View all
            </Link>
          }
        >
          {workspace.recentRequests.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center">
              <p className="text-sm font-medium text-foreground">No requests yet</p>
              <p className="mt-1 text-sm text-muted">Send a request → Dealo sends a shortlist of checked people.</p>
              <button type="button" onClick={openHireRequest} className="btn-primary mt-4 inline-flex">
                Request talent
              </button>
            </div>
          ) : (
            <div className="dash-rail">
              {workspace.recentRequests.map((item) => (
                <div key={item.id} className="dash-rail-item">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{item.roleTitle}</p>
                    <p className="mt-0.5 text-xs text-muted">
                      {item.companyName} · {item.serviceType.replaceAll('_', ' ').toLowerCase()} ·{' '}
                      {item.numberOfProfessionals} people
                    </p>
                  </div>
                  <StatusChip status={item.status} />
                </div>
              ))}
            </div>
          )}
        </DashPanel>

        <div className="space-y-5">
          <DashPanel title="Next best actions">
            {workspace.nextActions.length === 0 ? (
              <p className="text-sm text-muted">You are up to date. We will tell you when a shortlist is ready.</p>
            ) : (
              <div className="grid gap-2">
                {workspace.nextActions.map((action) => (
                  <QuickLink key={action.label} href={action.href} label={action.label} description="Recommended next step" />
                ))}
              </div>
            )}
          </DashPanel>

          <DashPanel
            title="Shortlists"
            action={
              <Link href="/dashboard/talent" className="text-sm font-semibold text-brand">
                Open
              </Link>
            }
          >
            {workspace.shortlists.length === 0 ? (
              <p className="text-sm text-muted">
                When Dealo finds people for your roles, their shortlists show up here.
              </p>
            ) : (
              <div className="space-y-3">
                {workspace.shortlists.map((list) => (
                  <div key={list.id} className="rounded-xl border border-border px-3 py-3">
                    <p className="text-sm font-medium text-foreground">{list.title}</p>
                    <p className="mt-1 text-xs text-muted">
                      {list.hireInquiry.roleTitle} · {list.candidateCount} candidate
                      {list.candidateCount === 1 ? '' : 's'}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </DashPanel>
        </div>
      </div>

      <DashPanel
        title="Organization"
        action={<Building2 className="h-4 w-4 text-brand" />}
      >
        {workspace.organizations.length === 0 ? (
          <p className="text-sm text-muted">
            No company yet. Create one to invite teammates and share talent requests.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {workspace.organizations.map((org) => (
              <div key={org.id} className="rounded-xl border border-border px-4 py-3">
                <p className="font-medium text-foreground">{org.name}</p>
                <p className="mt-1 text-xs text-muted">
                  {org.members.length} member{org.members.length === 1 ? '' : 's'}
                  {org.isOwner ? ' · Owner' : ''}
                </p>
              </div>
            ))}
          </div>
        )}
        <Link href="/dashboard/organization" className="btn-secondary mt-4 inline-flex">
          {workspace.organizations.length === 0 ? 'Create company' : 'Organization settings'}
        </Link>
      </DashPanel>
    </div>
  );
}
