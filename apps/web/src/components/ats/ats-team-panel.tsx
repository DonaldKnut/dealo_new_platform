'use client';

import { motion } from 'framer-motion';
import { Check, Copy, Eye, MailPlus, ShieldCheck, Trash2, UserCog, UserRound } from 'lucide-react';
import { useState } from 'react';

import { useAtsWorkspace } from '@/components/ats/ats-workspace';
import { DashPanel } from '@/components/dashboard/dashboard-ui';
import { FormField } from '@/components/forms/form-field';
import { FormModal } from '@/components/ui/form-modal';
import { useToast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api';
import { ROLE_LABEL, atsApi, isAdminRole, type WorkspaceRole } from '@/lib/ats-api';
import { cn } from '@/lib/utils';

const ROLE_HELP: Array<{ role: WorkspaceRole; text: string; icon: typeof UserRound }> = [
  { role: 'ADMIN', text: 'Everything, including team, settings and careers page.', icon: ShieldCheck },
  { role: 'RECRUITER', text: 'Creates jobs, moves people, sends emails, interviews and offers.', icon: UserCog },
  { role: 'HIRING_MANAGER', text: 'Sees only jobs they are added to. Reads CVs, adds notes and scorecards.', icon: Eye },
];

export function AtsTeamPanel() {
  const toast = useToast();
  const { orgId, current, reloadDetail } = useAtsWorkspace();
  const [inviting, setInviting] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<WorkspaceRole>('RECRUITER');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState<{ email: string; link: string } | null>(null);
  if (!current || !orgId) return null;
  const admin = isAdminRole(current.myRole);

  const openInvite = () => {
    setSent(null);
    setEmail('');
    setRole('RECRUITER');
    setInviting(true);
  };

  const invite = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    try {
      const result = await atsApi.invite(orgId, email.trim(), role);
      setSent({ email: result.email, link: result.link });
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

  const seatsLeft = current.usage.maxSeats - current.usage.seats;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted">
          {current.usage.seats} of {current.usage.maxSeats} seats used{current.invites.length ? ` · ${current.invites.length} waiting to join` : ''}
        </p>
        {admin ? (
          <button type="button" onClick={openInvite} disabled={seatsLeft <= 0} className="btn-primary w-full text-sm sm:w-auto">
            <MailPlus className="h-4 w-4" /> Invite someone
          </button>
        ) : null}
      </div>

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

        <DashPanel title="Who can do what">
          <ul className="space-y-3 text-xs leading-relaxed text-muted">
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

      <FormModal
        open={inviting}
        onClose={() => setInviting(false)}
        icon={MailPlus}
        title={sent ? 'Invite sent' : 'Invite someone'}
        description={sent ? undefined : `They get an email with a link that works for 7 days. ${seatsLeft} seat${seatsLeft === 1 ? '' : 's'} left.`}
        footer={
          sent ? (
            <>
              <button type="button" className="btn-secondary" onClick={openInvite}>
                Invite another
              </button>
              <button type="button" className="btn-primary" onClick={() => setInviting(false)}>
                Done
              </button>
            </>
          ) : (
            <>
              <button type="button" className="btn-secondary" onClick={() => setInviting(false)}>
                Cancel
              </button>
              <button type="submit" form="ats-invite-form" className="btn-primary" disabled={sending || !email.trim()}>
                <MailPlus className="h-4 w-4" /> {sending ? 'Sending…' : 'Send invite'}
              </button>
            </>
          )
        }
      >
        {sent ? (
          <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4 text-center">
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 14 }}
              className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-brand-soft text-brand"
            >
              <Check className="h-7 w-7" />
            </motion.span>
            <p className="text-sm text-foreground">
              We emailed <strong>{sent.email}</strong>. You can also send the link yourself, for example on WhatsApp.
            </p>
            <button
              type="button"
              onClick={async () => {
                await navigator.clipboard.writeText(sent.link).catch(() => undefined);
                toast.success('Invite link copied');
              }}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-brand/50 px-3 py-3 text-sm font-semibold text-brand"
            >
              <Copy className="h-4 w-4" /> Copy invite link
            </button>
          </motion.div>
        ) : (
          <form id="ats-invite-form" onSubmit={invite} className="space-y-5">
            <FormField label="Work email">
              <input className="input-field" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ada@company.com" required />
            </FormField>
            <FormField label="Role">
              <div className="grid gap-2">
                {ROLE_HELP.map((r) => {
                  const active = role === r.role;
                  return (
                    <button
                      key={r.role}
                      type="button"
                      onClick={() => setRole(r.role)}
                      className={cn(
                        'flex items-start gap-3 rounded-2xl border p-3 text-left transition',
                        active ? 'border-brand bg-brand-soft shadow-md shadow-brand/10' : 'border-border hover:border-brand/40',
                      )}
                    >
                      <span className={cn('inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', active ? 'bg-brand text-white dark:text-[#071f14]' : 'bg-surface text-muted')}>
                        <r.icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className={cn('block text-sm font-semibold', active ? 'text-brand' : 'text-foreground')}>{ROLE_LABEL[r.role]}</span>
                        <span className="block text-xs text-muted">{r.text}</span>
                      </span>
                      {active ? <Check className="h-4 w-4 shrink-0 text-brand" /> : null}
                    </button>
                  );
                })}
              </div>
            </FormField>
          </form>
        )}
      </FormModal>
    </div>
  );
}
