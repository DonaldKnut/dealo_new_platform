'use client';

import { Copy, MailPlus, Trash2, UserRound } from 'lucide-react';
import { useState } from 'react';

import { useAtsWorkspace } from '@/components/ats/ats-workspace';
import { DashPanel } from '@/components/dashboard/dashboard-ui';
import { FormField } from '@/components/forms/form-field';
import { useToast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api';
import { ROLE_LABEL, atsApi, isAdminRole, type WorkspaceRole } from '@/lib/ats-api';

const ROLE_HELP: Array<{ role: WorkspaceRole; text: string }> = [
  { role: 'ADMIN', text: 'Everything, including team, settings and careers page.' },
  { role: 'RECRUITER', text: 'Creates jobs, moves people, sends emails, interviews and offers.' },
  { role: 'HIRING_MANAGER', text: 'Sees only jobs they are added to. Reads CVs, adds notes and scorecards.' },
];

export function AtsTeamPanel() {
  const toast = useToast();
  const { orgId, current, reloadDetail } = useAtsWorkspace();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<WorkspaceRole>('RECRUITER');
  const [sending, setSending] = useState(false);
  const [lastLink, setLastLink] = useState<string | null>(null);
  if (!current || !orgId) return null;
  const admin = isAdminRole(current.myRole);

  const invite = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    try {
      const result = await atsApi.invite(orgId, email.trim(), role);
      setLastLink(result.link);
      setEmail('');
      toast.success('Invite sent', `We emailed ${result.email}. You can also copy the link.`);
      await reloadDetail();
    } catch (err) {
      toast.error('Could not invite', err instanceof ApiError ? err.message : '');
    } finally {
      setSending(false);
    }
  };

  const run = async (label: string, action: () => Promise<unknown>) => {
    try {
      await action();
      toast.success(label);
      await reloadDetail();
    } catch (err) {
      toast.error('That did not work', err instanceof ApiError ? err.message : '');
    }
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <DashPanel title={`Team · ${current.members.length}`}>
        <ul className="divide-y divide-border">
          {current.members.map((m) => (
            <li key={m.id} className="flex flex-col gap-2 py-3 min-[400px]:flex-row min-[400px]:items-center">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
                  <UserRound className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">{m.name}</p>
                  <p className="truncate text-xs text-muted">{m.email}</p>
                </div>
              </div>
              {admin && m.role !== 'OWNER' ? (
                <div className="flex items-center gap-2">
                  <select
                    aria-label={`Role for ${m.name}`}
                    value={m.role}
                    onChange={(e) => void run('Role updated', () => atsApi.changeRole(orgId, m.id, e.target.value as WorkspaceRole))}
                    className="input-field py-1.5 text-xs"
                  >
                    {ROLE_HELP.map((r) => (
                      <option key={r.role} value={r.role}>
                        {ROLE_LABEL[r.role]}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    aria-label={`Remove ${m.name}`}
                    onClick={() => window.confirm(`Remove ${m.name} from the workspace?`) && void run('Removed', () => atsApi.removeMember(orgId, m.id))}
                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border text-muted hover:border-danger hover:text-danger"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <span className="w-fit rounded-full border border-border px-2.5 py-1 text-[11px] font-semibold text-brand">{ROLE_LABEL[m.role]}</span>
              )}
            </li>
          ))}
        </ul>
        {current.invites.length ? (
          <div className="mt-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Waiting to join</p>
            <ul className="mt-2 space-y-2">
              {current.invites.map((inv) => (
                <li key={inv.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-border px-3 py-2 text-sm">
                  <span className="min-w-0 flex-1 truncate">{inv.email}</span>
                  <span className="text-xs text-muted">{ROLE_LABEL[inv.role]}</span>
                  {admin ? (
                    <button type="button" className="text-xs font-semibold text-danger" onClick={() => void run('Invite cancelled', () => atsApi.revokeInvite(orgId, inv.id))}>
                      Cancel
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </DashPanel>

      <div className="space-y-4">
        {admin ? (
          <DashPanel title="Invite someone">
            <form onSubmit={invite} className="space-y-3">
              <FormField label="Work email">
                <input className="input-field" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ada@company.com" required />
              </FormField>
              <FormField label="Role">
                <select className="input-field" value={role} onChange={(e) => setRole(e.target.value as WorkspaceRole)}>
                  {ROLE_HELP.map((r) => (
                    <option key={r.role} value={r.role}>
                      {ROLE_LABEL[r.role]}
                    </option>
                  ))}
                </select>
              </FormField>
              <p className="text-xs leading-relaxed text-muted">{ROLE_HELP.find((r) => r.role === role)?.text}</p>
              <button type="submit" className="btn-primary w-full" disabled={sending || !email}>
                <MailPlus className="h-4 w-4" /> {sending ? 'Sending…' : 'Send invite'}
              </button>
            </form>
            {lastLink ? (
              <button
                type="button"
                onClick={async () => {
                  await navigator.clipboard.writeText(lastLink).catch(() => undefined);
                  toast.success('Invite link copied');
                }}
                className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-brand/50 px-3 py-2 text-xs font-semibold text-brand"
              >
                <Copy className="h-3.5 w-3.5" /> Copy invite link (works for 7 days)
              </button>
            ) : null}
            <p className="mt-3 text-[11px] text-muted">
              {current.usage.seats} of {current.usage.maxSeats} seats used (free early access).
            </p>
          </DashPanel>
        ) : null}
        <DashPanel title="Who can do what">
          <ul className="space-y-2 text-xs leading-relaxed text-muted">
            <li>
              <strong className="text-foreground">Owner</strong> — everything, and cannot be removed.
            </li>
            {ROLE_HELP.map((r) => (
              <li key={r.role}>
                <strong className="text-foreground">{ROLE_LABEL[r.role]}</strong> — {r.text}
              </li>
            ))}
          </ul>
        </DashPanel>
      </div>
    </div>
  );
}
