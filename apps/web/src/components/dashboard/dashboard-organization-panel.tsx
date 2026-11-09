'use client';

import { Briefcase, Globe, Loader2, MailCheck, Plus, Settings2, UsersRound } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { AtsTeamPanel } from '@/components/ats/ats-team-panel';
import { AtsWorkspaceProvider, useAtsWorkspace } from '@/components/ats/ats-workspace';
import { CreateWorkspaceForm } from '@/components/ats/create-workspace-form';
import { WorkspaceSwitcher } from '@/components/ats/workspace-switcher';
import { useOpenHireRequest } from '@/components/dashboard/dashboard-session';
import { DashHero, DashPanel } from '@/components/dashboard/dashboard-ui';
import { FormModal } from '@/components/ui/form-modal';
import { ROLE_LABEL } from '@/lib/ats-api';

const STEPS = [
  {
    icon: Plus,
    title: 'Create your company',
    text: 'One account for your business, with its own careers page.',
  },
  {
    icon: MailCheck,
    title: 'Invite your team',
    text: 'Each person gets an email link. They join once they click it and sign in.',
  },
  {
    icon: Briefcase,
    title: 'Hire together',
    text: 'Everyone sees your hire requests, jobs and applicants.',
  },
];

function OrganizationContent() {
  const { loading, error, workspaces, current, orgId, select, reload } = useAtsWorkspace();
  const openHireRequest = useOpenHireRequest();
  const [creating, setCreating] = useState(false);

  if (loading) {
    return (
      <div className="flex min-h-[30vh] items-center justify-center gap-2 text-sm text-muted">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading your company…
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
          eyebrow="Organization"
          title="Set up your company account"
          subtitle="Bring your team onto Dealo. Teammates join through an email invite and see the same requests, jobs and applicants."
        />
        <div className="grid gap-3 sm:grid-cols-3">
          {STEPS.map((step, i) => (
            <div
              key={step.title}
              className="rounded-2xl border border-border bg-surface-elevated/70 p-4"
            >
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-brand-soft text-brand">
                <step.icon className="h-4 w-4" />
              </span>
              <p className="mt-3 text-sm font-semibold text-foreground">
                {i + 1}. {step.title}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted">{step.text}</p>
            </div>
          ))}
        </div>
        <DashPanel title="Your company">
          <CreateWorkspaceForm onCreated={() => void reload()} />
        </DashPanel>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <DashHero
        eyebrow="Organization"
        title={current?.workspace.name ?? 'Company account'}
        subtitle="Your company on Dealo. Invite teammates by email; they join as soon as they open the link and sign in."
        actions={
          <>
            <button type="button" onClick={openHireRequest} className="btn-primary">
              <Briefcase className="h-4 w-4" /> Request a hire
            </button>
            <Link href="/dashboard/ats/settings" className="btn-secondary">
              <Settings2 className="h-4 w-4" /> Company profile
            </Link>
          </>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <WorkspaceSwitcher
          workspaces={workspaces}
          currentId={orgId}
          onSelect={select}
          onCreate={() => setCreating(true)}
          meta={
            current
              ? `${ROLE_LABEL[current.myRole]} · ${current.usage.seats}/${current.usage.maxSeats} seats`
              : 'Loading…'
          }
        />
        {current?.workspace.careersEnabled ? (
          <Link
            href={`/careers/${current.workspace.slug}`}
            target="_blank"
            className="btn-secondary w-full text-sm sm:w-auto"
          >
            <Globe className="h-4 w-4" /> Careers page
          </Link>
        ) : null}
      </div>

      {current ? (
        <AtsTeamPanel />
      ) : (
        <div className="flex min-h-[20vh] items-center justify-center text-muted">
          <UsersRound className="h-5 w-5 animate-pulse" />
        </div>
      )}

      <FormModal
        open={creating}
        onClose={() => setCreating(false)}
        size="xl"
        icon={Plus}
        title="Add another company"
        description="A separate company or brand, with its own team, jobs and careers page."
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

export function DashboardOrganizationPanel() {
  return (
    <AtsWorkspaceProvider>
      <OrganizationContent />
    </AtsWorkspaceProvider>
  );
}
