'use client';

import { motion } from 'framer-motion';
import { Bot, CalendarClock, ChartColumn, Globe, HelpCircle, Kanban, Loader2, Plus, Users } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, type ReactNode } from 'react';

import { ATS_TAB_HELP, AtsGuide } from '@/components/ats/ats-guide';
import { AtsWorkspaceProvider, useAtsWorkspace } from '@/components/ats/ats-workspace';
import { Tooltip } from '@/components/ui/tooltip';
import { CreateWorkspaceForm } from '@/components/ats/create-workspace-form';
import { DashHero, DashPanel } from '@/components/dashboard/dashboard-ui';
import { WorkspaceSwitcher } from '@/components/ats/workspace-switcher';
import { FormModal } from '@/components/ui/form-modal';
import { ROLE_LABEL } from '@/lib/ats-api';
import { cn } from '@/lib/utils';

const TABS = [
  { href: '/dashboard/ats', label: 'Jobs', icon: Kanban },
  { href: '/dashboard/ats/agents', label: 'AI agents', icon: Bot },
  { href: '/dashboard/ats/interviews', label: 'Interviews', icon: CalendarClock },
  { href: '/dashboard/ats/reports', label: 'Reports', icon: ChartColumn },
  { href: '/dashboard/ats/team', label: 'Team', icon: Users },
  { href: '/dashboard/ats/settings', label: 'Careers page', icon: Globe },
];

function Frame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { loading, error, workspaces, current, orgId, select, reload } = useAtsWorkspace();
  const [creating, setCreating] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [highlight, setHighlight] = useState<string | null>(null);

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
        <div className="min-w-0">
          <WorkspaceSwitcher
            workspaces={workspaces}
            currentId={orgId}
            onSelect={select}
            onCreate={() => setCreating(true)}
            meta={
              current ? (
                <>
                  {ROLE_LABEL[current.myRole]}
                  {current.support ? ' (Dealo support)' : ''} · {current.usage.openJobs}/{current.usage.maxOpenJobs} open jobs · {current.usage.seats}/
                  {current.usage.maxSeats} seats
                </>
              ) : (
                'Loading…'
              )
            }
          />
        </div>
        <div className="flex w-full shrink-0 items-center gap-2 sm:w-auto">
          <Tooltip content="Take the quick guide again: what each section does and where to start.">
            <button
              type="button"
              onClick={() => setGuideOpen(true)}
              aria-label="Show me around"
              className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full border border-border px-3 text-sm font-medium text-muted transition hover:border-brand hover:text-brand"
            >
              <HelpCircle className="h-4 w-4" />
              <span className="hidden min-[400px]:inline">Guide</span>
            </button>
          </Tooltip>
          {current?.workspace.careersEnabled ? (
            <Tooltip content="Open your public careers page in a new tab. This is what applicants see." className="flex-1 sm:flex-none">
              <Link
                href={`/careers/${current.workspace.slug}`}
                target="_blank"
                className="btn-secondary w-full whitespace-nowrap text-sm"
              >
                <Globe className="h-4 w-4" /> Careers page
              </Link>
            </Tooltip>
          ) : null}
        </div>
      </div>

      <nav className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1" aria-label="Hiring sections">
        {TABS.map((tab) => {
          const active = isTab(tab.href);
          const Icon = tab.icon;
          return (
            <Tooltip key={tab.href} content={ATS_TAB_HELP[tab.href]} className="shrink-0">
              <Link
                href={tab.href}
                className={cn(
                  'relative inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium transition-colors',
                  active ? 'text-white dark:text-[#071f14]' : 'text-muted hover:text-foreground',
                  highlight === tab.href && 'z-[170] bg-surface-elevated text-brand ring-2 ring-brand ring-offset-2 ring-offset-background',
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
            </Tooltip>
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

      <AtsGuide open={guideOpen} onOpenChange={setGuideOpen} onHighlight={setHighlight} />

      <FormModal
        open={creating}
        onClose={() => setCreating(false)}
        size="xl"
        icon={Plus}
        title="New workspace"
        description="A separate hiring space with its own jobs, team and careers page. Good for another company, brand or branch."
      >
        <CreateWorkspaceForm
          onCancel={() => setCreating(false)}
          onCreated={async (id) => {
            setCreating(false);
            select(id);
            await reload();
          }}
        />
      </FormModal>
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
