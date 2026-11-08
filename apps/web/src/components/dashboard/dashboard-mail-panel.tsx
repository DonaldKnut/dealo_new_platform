'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  mailAllUsersSchema,
  mailOneUserSchema,
  type MailAllUsersInput,
  type MailOneUserInput,
} from '@dealo/shared';
import { motion } from 'framer-motion';
import { ArrowRight, Briefcase, Eye, Mail, Megaphone, PenLine, Send, ShieldCheck, UserRound, Users } from 'lucide-react';
import { useState } from 'react';
import { useForm, type UseFormReturn } from 'react-hook-form';

import { DashHero } from '@/components/dashboard/dashboard-ui';
import { FormField } from '@/components/forms/form-field';
import { FormModal } from '@/components/ui/form-modal';
import { RichHtmlEditor } from '@/components/ui/rich-html-editor';
import { useToast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api';
import { logClientAudit } from '@/lib/client-audit';
import { mailAllUsers, mailOneUser } from '@/lib/dashboard-api';
import { cn } from '@/lib/utils';

const AUDIENCES: Array<{ id: MailAllUsersInput['roleFilter']; label: string; hint: string; icon: typeof Users }> = [
  { id: 'ALL', label: 'Everyone', hint: 'All active accounts', icon: Users },
  { id: 'EMPLOYER', label: 'Employers', hint: 'Companies hiring', icon: Briefcase },
  { id: 'TALENT', label: 'Job seekers', hint: 'Professionals and trades', icon: UserRound },
  { id: 'STAFF', label: 'Staff', hint: 'Dealo team only', icon: ShieldCheck },
];

/** Body editor with a sandboxed preview so admins see the email before it goes out. */
function BodyEditor({ form, id }: { form: UseFormReturn<MailOneUserInput> | UseFormReturn<MailAllUsersInput>; id: string }) {
  const [preview, setPreview] = useState(false);
  const typed = form as UseFormReturn<MailOneUserInput>;
  const body = typed.watch('bodyHtml');
  const error = form.formState.errors.bodyHtml?.message;
  return (
    <FormField label="Message" error={error} hint="Use the toolbar for headings, bold, lists and links. Preview shows the email as people will get it.">
      <div className="overflow-hidden rounded-2xl border border-border">
        <div className="flex items-center gap-1 border-b border-border bg-surface/60 p-1">
          {[
            { id: false, label: 'Write', icon: PenLine },
            { id: true, label: 'Preview', icon: Eye },
          ].map((t) => (
            <button
              key={t.label}
              type="button"
              onClick={() => setPreview(t.id)}
              className={cn(
                'relative inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition',
                preview === t.id ? 'text-white dark:text-[#071f14]' : 'text-muted hover:text-foreground',
              )}
            >
              {preview === t.id ? <motion.span layoutId={`mail-tab-${id}`} className="absolute inset-0 rounded-lg bg-brand" /> : null}
              <t.icon className="relative z-10 h-3.5 w-3.5" />
              <span className="relative z-10">{t.label}</span>
            </button>
          ))}
        </div>
        {preview ? (
          <iframe
            title="Email preview"
            sandbox=""
            className="h-64 w-full bg-white"
            srcDoc={`<div style="font-family:Arial,sans-serif;color:#0b1f1e;line-height:1.6;padding:16px;max-width:560px">${
              /<[a-z][\s\S]*>/i.test(body ?? '') ? body : (body ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c] ?? c).replace(/\n/g, '<br>')
            }</div>`}
          />
        ) : (
          <RichHtmlEditor
            bare
            allowFullscreen={false}
            minHeight={224}
            value={body ?? ''}
            onChange={(html) => typed.setValue('bodyHtml', html, { shouldValidate: Boolean(error), shouldDirty: true })}
            placeholder="Hello, write your message here…"
          />
        )}
      </div>
    </FormField>
  );
}

export function DashboardMailPanel() {
  const toast = useToast();
  const [open, setOpen] = useState<'one' | 'all' | null>(null);

  const oneForm = useForm<MailOneUserInput>({
    resolver: zodResolver(mailOneUserSchema),
    defaultValues: { email: '', subject: '', bodyHtml: '', bodyText: '' },
  });

  const allForm = useForm<MailAllUsersInput>({
    resolver: zodResolver(mailAllUsersSchema),
    defaultValues: { subject: '', bodyHtml: '', bodyText: '', roleFilter: 'ALL' },
  });

  const sendOne = oneForm.handleSubmit(async (values) => {
    try {
      const result = await mailOneUser(values);
      toast.success('Email sent', `Delivered to ${result.email}`);
      logClientAudit({ action: 'ADMIN_MAIL_ONE_UI', entityType: 'User' });
      oneForm.reset({ email: '', subject: '', bodyHtml: '', bodyText: '' });
      setOpen(null);
    } catch (error) {
      toast.error('Send failed', error instanceof ApiError ? error.message : undefined);
    }
  });

  const sendAll = allForm.handleSubmit(async (values) => {
    const audience = AUDIENCES.find((a) => a.id === values.roleFilter)?.label.toLowerCase() ?? 'everyone';
    if (!window.confirm(`Send this email to ${audience}? This cannot be undone.`)) return;
    try {
      const result = await mailAllUsers(values);
      toast.success('Broadcast sent', `Sent ${result.sent} of ${result.recipientCount}${result.failed ? ` (${result.failed} failed)` : ''}`);
      logClientAudit({ action: 'ADMIN_MAIL_ALL_UI', entityType: 'User', metadata: { roleFilter: values.roleFilter } });
      allForm.reset({ subject: '', bodyHtml: '', bodyText: '', roleFilter: 'ALL' });
      setOpen(null);
    } catch (error) {
      toast.error('Broadcast failed', error instanceof ApiError ? error.message : undefined);
    }
  });

  const audience = allForm.watch('roleFilter');

  return (
    <div className="space-y-6">
      <DashHero eyebrow="Admin" title="Mail users" subtitle="Email one person or everyone on the platform. Only Super Admin and Admin can use this." />

      <div className="grid gap-4 md:grid-cols-2">
        {[
          {
            id: 'one' as const,
            icon: Mail,
            title: 'Email one person',
            body: 'Write to a single user by their email address.',
            cta: 'Write an email',
          },
          {
            id: 'all' as const,
            icon: Megaphone,
            title: 'Email everyone',
            body: 'Send one message to all users, or only employers, job seekers or staff.',
            cta: 'Write a broadcast',
          },
        ].map((card, i) => (
          <motion.button
            key={card.id}
            type="button"
            onClick={() => setOpen(card.id)}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            whileHover={{ y: -4 }}
            className="group relative overflow-hidden rounded-[1.5rem] border border-border bg-surface-elevated p-5 text-left shadow-sm transition-shadow hover:border-brand/40 hover:shadow-xl sm:p-6"
          >
            <span className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-brand/10 blur-2xl transition group-hover:bg-brand/20" />
            <span className="relative inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand to-emerald-500 text-white shadow-lg shadow-brand/25 dark:text-[#071f14]">
              <card.icon className="h-5 w-5" />
            </span>
            <h2 className="relative mt-4 font-display text-xl text-foreground sm:text-2xl">{card.title}</h2>
            <p className="relative mt-1 text-sm text-muted">{card.body}</p>
            <span className="relative mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand">
              {card.cta} <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
            </span>
          </motion.button>
        ))}
      </div>

      <FormModal
        open={open === 'one'}
        onClose={() => setOpen(null)}
        icon={Mail}
        title="Email one person"
        description="Goes out from the Dealo address. Replies come back to the support inbox."
        size="lg"
        footer={
          <>
            <button type="button" className="btn-secondary" onClick={() => setOpen(null)}>
              Cancel
            </button>
            <button type="submit" form="mail-one-form" className="btn-primary" disabled={oneForm.formState.isSubmitting}>
              <Send className="h-4 w-4" /> {oneForm.formState.isSubmitting ? 'Sending…' : 'Send email'}
            </button>
          </>
        }
      >
        <form id="mail-one-form" onSubmit={sendOne} className="space-y-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="To" error={oneForm.formState.errors.email?.message}>
              <input className="input-field" type="email" placeholder="person@company.com" {...oneForm.register('email')} />
            </FormField>
            <FormField label="Subject" error={oneForm.formState.errors.subject?.message}>
              <input className="input-field" placeholder="A quick update from Dealo" {...oneForm.register('subject')} />
            </FormField>
          </div>
          <BodyEditor form={oneForm} id="one" />
        </form>
      </FormModal>

      <FormModal
        open={open === 'all'}
        onClose={() => setOpen(null)}
        icon={Megaphone}
        title="Email everyone"
        description="Only active accounts receive it. Check the audience before you send."
        size="lg"
        footer={
          <>
            <button type="button" className="btn-secondary" onClick={() => setOpen(null)}>
              Cancel
            </button>
            <button type="submit" form="mail-all-form" className="btn-primary" disabled={allForm.formState.isSubmitting}>
              <Megaphone className="h-4 w-4" /> {allForm.formState.isSubmitting ? 'Sending…' : 'Send broadcast'}
            </button>
          </>
        }
      >
        <form id="mail-all-form" onSubmit={sendAll} className="space-y-5" noValidate>
          <FormField label="Audience">
            <div className="grid grid-cols-1 gap-2 min-[340px]:grid-cols-2 lg:grid-cols-4">
              {AUDIENCES.map((a) => {
                const active = audience === a.id;
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => allForm.setValue('roleFilter', a.id, { shouldDirty: true })}
                    className={cn(
                      'relative flex items-start gap-2.5 rounded-2xl border p-3 text-left transition',
                      active ? 'border-brand bg-brand-soft shadow-md shadow-brand/10' : 'border-border hover:border-brand/40',
                    )}
                  >
                    <span className={cn('inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl', active ? 'bg-brand text-white dark:text-[#071f14]' : 'bg-surface text-muted')}>
                      <a.icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0">
                      <span className={cn('block text-sm font-semibold', active ? 'text-brand' : 'text-foreground')}>{a.label}</span>
                      <span className="block text-[11px] text-muted">{a.hint}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </FormField>
          <FormField label="Subject" error={allForm.formState.errors.subject?.message}>
            <input className="input-field" placeholder="News from Dealo" {...allForm.register('subject')} />
          </FormField>
          <BodyEditor form={allForm} id="all" />
        </form>
      </FormModal>
    </div>
  );
}
