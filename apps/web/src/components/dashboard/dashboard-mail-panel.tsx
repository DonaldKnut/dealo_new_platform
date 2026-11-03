'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  mailAllUsersSchema,
  mailOneUserSchema,
  type MailAllUsersInput,
  type MailOneUserInput,
} from '@dealo/shared';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { DashHero, DashPanel } from '@/components/dashboard/dashboard-ui';
import { InfoTooltip } from '@/components/ui/info-tooltip';
import { useToast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api';
import { logClientAudit } from '@/lib/client-audit';
import { mailAllUsers, mailOneUser } from '@/lib/dashboard-api';

export function DashboardMailPanel() {
  const toast = useToast();
  const [tab, setTab] = useState<'one' | 'all'>('one');

  const oneForm = useForm<MailOneUserInput>({
    resolver: zodResolver(mailOneUserSchema),
    defaultValues: { email: '', subject: '', bodyHtml: '', bodyText: '' },
  });

  const allForm = useForm<MailAllUsersInput>({
    resolver: zodResolver(mailAllUsersSchema),
    defaultValues: {
      subject: '',
      bodyHtml: '',
      bodyText: '',
      roleFilter: 'ALL',
    },
  });

  const sendOne = oneForm.handleSubmit(async (values) => {
    try {
      const result = await mailOneUser(values);
      toast.success('Email sent', `Delivered to ${result.email}`);
      logClientAudit({ action: 'ADMIN_MAIL_ONE_UI', entityType: 'User' });
      oneForm.reset({ email: '', subject: '', bodyHtml: '', bodyText: '' });
    } catch (error) {
      toast.error('Send failed', error instanceof ApiError ? error.message : undefined);
    }
  });

  const sendAll = allForm.handleSubmit(async (values) => {
    try {
      const result = await mailAllUsers(values);
      toast.success(
        'Broadcast queued',
        `Sent ${result.sent}/${result.recipientCount} (failed ${result.failed})`,
      );
      logClientAudit({
        action: 'ADMIN_MAIL_ALL_UI',
        entityType: 'User',
        metadata: { roleFilter: values.roleFilter },
      });
      allForm.reset({
        subject: '',
        bodyHtml: '',
        bodyText: '',
        roleFilter: 'ALL',
      });
    } catch (error) {
      toast.error('Broadcast failed', error instanceof ApiError ? error.message : undefined);
    }
  });

  return (
    <div className="space-y-6">
      <DashHero
        eyebrow="Admin"
        title="Mail users"
        subtitle="Email one person or everyone on the platform. Only Super Admin and Admin can use this."
      />

      <div className="flex gap-2">
        <button
          type="button"
          className={tab === 'one' ? 'btn-primary' : 'btn-secondary'}
          onClick={() => setTab('one')}
        >
          Mail one
        </button>
        <button
          type="button"
          className={tab === 'all' ? 'btn-primary' : 'btn-secondary'}
          onClick={() => setTab('all')}
        >
          Mail all
        </button>
      </div>

      {tab === 'one' ? (
        <DashPanel>
          <div className="mb-4 flex items-center gap-2">
            <h2 className="font-display text-xl">Mail one user</h2>
            <InfoTooltip
              label="Mail one"
              content="Send a single email to a user by email address. HTML is supported in the body."
            />
          </div>
          <form onSubmit={sendOne} className="space-y-3">
            <label className="block text-sm">
              Email
              <input className="input-field mt-1" {...oneForm.register('email')} />
            </label>
            <label className="block text-sm">
              Subject
              <input className="input-field mt-1" {...oneForm.register('subject')} />
            </label>
            <label className="block text-sm">
              Body (HTML)
              <textarea className="input-field mt-1 min-h-[8rem]" {...oneForm.register('bodyHtml')} />
            </label>
            <button
              type="submit"
              className="btn-primary"
              disabled={oneForm.formState.isSubmitting}
            >
              Send
            </button>
          </form>
        </DashPanel>
      ) : (
        <DashPanel>
          <div className="mb-4 flex items-center gap-2">
            <h2 className="font-display text-xl">Mail all users</h2>
            <InfoTooltip
              label="Mail all"
              content="Broadcasts to active users. Use role filter to limit to employers, talent, or staff."
            />
          </div>
          <form onSubmit={sendAll} className="space-y-3">
            <label className="block text-sm">
              Audience
              <select className="input-field mt-1" {...allForm.register('roleFilter')}>
                <option value="ALL">Everyone</option>
                <option value="EMPLOYER">Employers</option>
                <option value="TALENT">Talent</option>
                <option value="STAFF">Staff</option>
              </select>
            </label>
            <label className="block text-sm">
              Subject
              <input className="input-field mt-1" {...allForm.register('subject')} />
            </label>
            <label className="block text-sm">
              Body (HTML)
              <textarea className="input-field mt-1 min-h-[8rem]" {...allForm.register('bodyHtml')} />
            </label>
            <button
              type="submit"
              className="btn-primary"
              disabled={allForm.formState.isSubmitting}
            >
              Send broadcast
            </button>
          </form>
        </DashPanel>
      )}
    </div>
  );
}
