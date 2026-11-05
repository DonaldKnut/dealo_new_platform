'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  supportTicketCreateSchema,
  supportTicketReplySchema,
  type SupportTicketCreateInput,
  type SupportTicketReplyInput,
} from '@dealo/shared';
import { LifeBuoy, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';

import { DashHero, DashPanel, formatStatus } from '@/components/dashboard/dashboard-ui';
import { FormField } from '@/components/forms/form-field';
import { FormModal } from '@/components/ui/form-modal';
import { useToast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';
import { getRoleGroup } from '@/hooks/use-auth-session';
import { ApiError } from '@/lib/api';
import { logClientAudit } from '@/lib/client-audit';
import {
  createSupportTicket,
  fetchAuthMe,
  fetchSupportTicket,
  fetchSupportTickets,
  replySupportTicket,
  updateSupportTicketStatus,
  type SupportTicketDetail,
  type SupportTicketRow,
} from '@/lib/dashboard-api';

export function DashboardSupportPanel() {
  const toast = useToast();
  const [tickets, setTickets] = useState<SupportTicketRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<SupportTicketDetail | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [creating, setCreating] = useState(false);

  const createForm = useForm<SupportTicketCreateInput>({
    resolver: zodResolver(supportTicketCreateSchema),
    defaultValues: {
      subject: '',
      body: '',
      priority: 'NORMAL',
      category: 'general',
    },
  });

  const replyForm = useForm<SupportTicketReplyInput>({
    resolver: zodResolver(supportTicketReplySchema),
    defaultValues: { body: '', internal: false },
  });

  const reload = async () => {
    const data = await fetchSupportTickets();
    setTickets(data);
  };

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const me = await fetchAuthMe();
        if (!active) return;
        setIsAdmin(getRoleGroup(me.roles) === 'admin');
        await reload();
      } catch (error) {
        toast.error(
          'Unable to load tickets',
          error instanceof ApiError ? error.message : undefined,
        );
      }
    })();
    return () => {
      active = false;
    };
  }, [toast]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    let active = true;
    (async () => {
      try {
        const data = await fetchSupportTicket(selectedId);
        if (active) setDetail(data);
      } catch (error) {
        toast.error(
          'Unable to open ticket',
          error instanceof ApiError ? error.message : undefined,
        );
      }
    })();
    return () => {
      active = false;
    };
  }, [selectedId, toast]);

  return (
    <div className="space-y-6">
      <DashHero
        eyebrow="Support"
        title="Support tickets"
        subtitle="Create tickets for user or client issues. Admins are emailed when a new ticket arrives, and can reply here."
        actions={
          <button type="button" className="btn-primary" onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" /> New ticket
          </button>
        }
      />

      <FormModal
        open={creating}
        onClose={() => setCreating(false)}
        icon={LifeBuoy}
        title="New ticket"
        description="Anyone signed in can open a ticket. Admins get an email straight away."
        footer={
          <>
            <button type="button" className="btn-secondary" onClick={() => setCreating(false)}>
              Cancel
            </button>
            <button type="submit" form="support-ticket-form" className="btn-primary" disabled={createForm.formState.isSubmitting}>
              {createForm.formState.isSubmitting ? 'Sending…' : 'Create ticket'}
            </button>
          </>
        }
      >
        <form
          id="support-ticket-form"
          className="space-y-4"
          onSubmit={createForm.handleSubmit(async (values) => {
            try {
              await createSupportTicket(values);
              toast.success('Ticket created', 'Admins were notified by email.');
              logClientAudit({ action: 'SUPPORT_TICKET_CREATED_DASH', entityType: 'SupportTicket' });
              createForm.reset({ subject: '', body: '', priority: 'NORMAL', category: 'general' });
              setCreating(false);
              await reload();
            } catch (error) {
              toast.error('Could not create ticket', error instanceof ApiError ? error.message : undefined);
            }
          })}
        >
          <FormField label="Subject" error={createForm.formState.errors.subject?.message}>
            <input className="input-field" placeholder="I cannot download my CV" {...createForm.register('subject')} />
          </FormField>
          <FormField label="What happened?" error={createForm.formState.errors.body?.message}>
            <textarea className="input-field min-h-[9rem]" placeholder="Tell us what you tried and what you saw." {...createForm.register('body')} />
          </FormField>
          <FormField label="How urgent?">
            <div className="grid grid-cols-2 gap-2 min-[400px]:grid-cols-4">
              {(['LOW', 'NORMAL', 'HIGH', 'URGENT'] as const).map((p) => {
                const active = createForm.watch('priority') === p;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => createForm.setValue('priority', p)}
                    className={cn(
                      'rounded-xl border px-2 py-2.5 text-xs font-semibold transition',
                      active
                        ? p === 'URGENT'
                          ? 'border-danger bg-danger/10 text-danger'
                          : p === 'HIGH'
                            ? 'border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-300'
                            : 'border-brand bg-brand-soft text-brand'
                        : 'border-border text-muted hover:border-brand/40',
                    )}
                  >
                    {formatStatus(p)}
                  </button>
                );
              })}
            </div>
          </FormField>
        </form>
      </FormModal>

      <div className="grid gap-4">
        <DashPanel>
          <h2 className="mb-4 font-display text-xl">Your queue</h2>
          <div className="space-y-2">
            {tickets.length === 0 ? (
              <p className="text-sm text-muted">No tickets yet.</p>
            ) : (
              tickets.map((ticket) => (
                <button
                  key={ticket.id}
                  type="button"
                  onClick={() => setSelectedId(ticket.id)}
                  className="flex w-full items-start justify-between gap-3 rounded-xl border border-border px-3 py-2.5 text-left transition hover:bg-surface"
                >
                  <span>
                    <span className="block text-sm font-medium text-foreground">{ticket.subject}</span>
                    <span className="mt-0.5 block text-xs text-muted">
                      {formatStatus(ticket.status)} · {ticket.priority}
                    </span>
                  </span>
                  <span className="text-[10px] text-muted">
                    {new Date(ticket.createdAt).toLocaleDateString()}
                  </span>
                </button>
              ))
            )}
          </div>
        </DashPanel>
      </div>

      {detail ? (
        <DashPanel>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-xl">{detail.subject}</h2>
              <p className="mt-1 text-xs text-muted">
                {formatStatus(detail.status)} · {detail.priority}
                {detail.requester
                  ? ` · ${detail.requester.email}`
                  : null}
              </p>
            </div>
            {isAdmin ? (
              <select
                className="input-field w-auto"
                value={detail.status}
                onChange={async (event) => {
                  try {
                    await updateSupportTicketStatus(detail.id, event.target.value);
                    toast.success('Status updated');
                    setSelectedId(detail.id);
                    await reload();
                    const fresh = await fetchSupportTicket(detail.id);
                    setDetail(fresh);
                  } catch (error) {
                    toast.error(
                      'Status update failed',
                      error instanceof ApiError ? error.message : undefined,
                    );
                  }
                }}
              >
                <option value="OPEN">Open</option>
                <option value="IN_PROGRESS">In progress</option>
                <option value="WAITING_ON_USER">Waiting on user</option>
                <option value="RESOLVED">Resolved</option>
                <option value="CLOSED">Closed</option>
              </select>
            ) : null}
          </div>

          <div className="mt-4 space-y-3">
            {detail.messages.map((message) => (
              <div
                key={message.id}
                className="rounded-xl border border-border bg-surface/60 px-3 py-2.5"
              >
                <p className="text-xs text-muted">
                  {message.author
                    ? `${message.author.firstName} ${message.author.lastName}`.trim() ||
                      message.author.email
                    : 'User'}
                  {message.internal ? ' · internal note' : ''} ·{' '}
                  {new Date(message.createdAt).toLocaleString()}
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">{message.body}</p>
              </div>
            ))}
          </div>

          <form
            className="mt-4 space-y-3"
            onSubmit={replyForm.handleSubmit(async (values) => {
              try {
                await replySupportTicket(detail.id, values);
                toast.success('Reply sent');
                replyForm.reset({ body: '', internal: false });
                const fresh = await fetchSupportTicket(detail.id);
                setDetail(fresh);
                await reload();
              } catch (error) {
                toast.error(
                  'Reply failed',
                  error instanceof ApiError ? error.message : undefined,
                );
              }
            })}
          >
            <textarea
              className="input-field min-h-[5rem]"
              placeholder="Write a reply"
              {...replyForm.register('body')}
            />
            {isAdmin ? (
              <label className="flex items-center gap-2 text-sm text-muted">
                <input type="checkbox" {...replyForm.register('internal')} />
                Internal note (hidden from requester)
              </label>
            ) : null}
            <button type="submit" className="btn-primary" disabled={replyForm.formState.isSubmitting}>
              Send reply
            </button>
          </form>
        </DashPanel>
      ) : null}
    </div>
  );
}
