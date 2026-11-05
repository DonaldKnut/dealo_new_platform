'use client';

import { motion } from 'framer-motion';
import { Building2, CalendarClock, Globe, Kanban, Loader2, Plus, Users } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, type ReactNode } from 'react';

import { AtsWorkspaceProvider, useAtsWorkspace } from '@/components/ats/ats-workspace';
import { CreateWorkspaceForm } from '@/components/ats/create-workspace-form';
import { DashHero, DashPanel } from '@/components/dashboard/dashboard-ui';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { ROLE_LABEL } from '@/lib/ats-api';
import { cn } from '@/lib/utils';

const TABS = [
  { href: '/dashboard/ats', label: 'Jobs', icon: Kanban },
  { href: '/dashboard/ats/interviews', label: 'Interviews', icon: CalendarClock },
  { href: '/dashboard/ats/team', label: 'Team', icon: Users },
  { href: '/dashboard/ats/settings', label: 'Careers page', icon: Globe },
];

function Frame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { loading, error, workspaces, current, orgId, select, reload } = useAtsWorkspace();
  const [creating, setCreating] = useState(false);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-muted">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (error && !workspaces.length) {
    return (
      <DashPanel>
        <p className="text-sm text-danger">{error}</p>
      </DashPanel>
    );
  }

  if (!workspaces.length) {
    return (
      <div className="space-y-6">
        <DashHero
          eyebrow="Dealo ATS · free early access"
          title="Set up your hiring workspace"
          subtitle="Post jobs, get a careers page, and move applicants from 'applied' to 'hired' with your team. Takes one minute."
        />
        <DashPanel>
          <CreateWorkspaceForm
            onCreated={async () => {
              await reload();
              router.refresh();
            }}
          />
        </DashPanel>
      </div>
    );
  }

  const isTab = (href: string) => (href === '/dashboard/ats' ? pathname === href || pathname.startsWith('/dashboard/ats/jobs') : pathname.startsWith(href));

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          {current?.workspace.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={current.workspace.logoUrl}
              alt=""
              className="h-10 w-10 shrink-0 rounded-xl border border-border bg-white object-contain p-1"
            />
          ) : (
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
              <Building2 className="h-5 w-5" />
            </span>
          )}
          <div className="min-w-0">
            <label className="sr-only" htmlFor="ats-workspace">
              Workspace
            </label>
            <select
              id="ats-workspace"
              value={orgId ?? ''}
              onChange={(e) => {
                if (e.target.value === '__new') setCreating(true);
                else select(e.target.value);
              }}
              className="w-full max-w-full truncate bg-transparent font-display text-xl text-foreground outline-none min-[340px]:text-2xl"
            >
              {workspaces.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
              <option value="__new">+ New workspace</option>
            </select>
            <p className="text-xs text-muted">
              {current ? (
                <>
                  {ROLE_LABEL[current.myRole]}
                  {current.support ? ' (Dealo support)' : ''} · {current.usage.openJobs}/{current.usage.maxOpenJobs} open jobs ·{' '}
                  {current.usage.seats}/{current.usage.maxSeats} seats
                </>
              ) : (
                'Loading…'
              )}
            </p>
          </div>
        </div>
        {current?.workspace.careersEnabled ? (
          <Link
            href={`/careers/${current.workspace.slug}`}
            target="_blank"
            className="btn-secondary w-full shrink-0 whitespace-nowrap text-sm sm:w-auto"
          >
            <Globe className="h-4 w-4" /> Careers page
          </Link>
        ) : null}
      </div>

      <nav className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1" aria-label="Hiring sections">
        {TABS.map((tab) => {
          const active = isTab(tab.href);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                'relative inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium transition-colors',
                active ? 'text-white dark:text-[#071f14]' : 'text-muted hover:text-foreground',
              )}
            >
              {active ? (
                <motion.span
                  layoutId="ats-tab"
                  className="absolute inset-0 rounded-full bg-brand"
                  transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                />
              ) : null}
              <Icon className="relative z-10 h-4 w-4" />
              <span className="relative z-10">{tab.label}</span>
            </Link>
          );
        })}
      </nav>

      {current ? (
        children
      ) : (
        <div className="flex min-h-[30vh] items-center justify-center text-muted">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      )}

      <BottomSheet
        open={creating}
        onClose={() => setCreating(false)}
        title={
          <span className="inline-flex items-center gap-1.5">
            <Plus className="h-4 w-4" /> New workspace
          </span>
        }
      >
        <div className="py-3">
          <CreateWorkspaceForm
            onCreated={async (id) => {
              setCreating(false);
              select(id);
              await reload();
            }}
          />
        </div>
      </BottomSheet>
    </div>
  );
}

export function AtsFrame({ children }: { children: ReactNode }) {
  return (
    <AtsWorkspaceProvider>
      <Frame>{children}</Frame>
    </AtsWorkspaceProvider>
  );
}
