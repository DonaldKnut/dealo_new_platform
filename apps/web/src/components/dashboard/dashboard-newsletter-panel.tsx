'use client';

import { motion } from 'framer-motion';
import { Briefcase, FlaskConical, LoaderCircle, Mail, Newspaper, Plus, Send, UserRound, Users } from 'lucide-react';
import { useEffect, useState } from 'react';

import { DashHero, StatusChip } from '@/components/dashboard/dashboard-ui';
import { EmailComposer } from '@/components/dashboard/email-composer';
import { FormField } from '@/components/forms/form-field';
import { FormModal } from '@/components/ui/form-modal';
import { useToast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api';
import {
  createNewsletterCampaign,
  fetchNewsletterCampaigns,
  sendNewsletterCampaign,
  sendNewsletterTest,
  type NewsletterCampaign,
} from '@/lib/dashboard-api';
import { cn } from '@/lib/utils';

const SEGMENTS = [
  { id: 'ALL', label: 'Everyone', hint: 'Subscribers and users', icon: Users },
  { id: 'EMPLOYER', label: 'Employers', hint: 'Companies hiring', icon: Briefcase },
  { id: 'TALENT', label: 'Job seekers', hint: 'Professionals and trades', icon: UserRound },
];

export function DashboardNewsletterPanel() {
  const toast = useToast();
  const [campaigns, setCampaigns] = useState<NewsletterCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [composing, setComposing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [subject, setSubject] = useState('');
  const [bodyHtml, setBodyHtml] = useState('');
  const [segment, setSegment] = useState('ALL');
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);

  const refresh = async () => {
    setCampaigns(await fetchNewsletterCampaigns());
  };

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        await refresh();
        if (active) setError(null);
      } catch (err) {
        if (active) setError(err instanceof ApiError ? err.message : 'Unable to load campaigns.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const hasBody = Boolean(bodyHtml.replace(/<[^>]*>/g, '').trim()) || /<img/i.test(bodyHtml);

  const sendTest = async () => {
    setTesting(true);
    try {
      const result = await sendNewsletterTest({ subject, bodyHtml });
      toast.success('Test sent', `Check ${result.email} to see it in a real inbox.`);
    } catch (err) {
      toast.error('Could not send the test', err instanceof ApiError ? err.message : '');
    } finally {
      setTesting(false);
    }
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!hasBody) {
      toast.error('Write a message first', 'The email body is empty.');
      return;
    }
    setSaving(true);
    try {
      await createNewsletterCampaign({ subject, bodyHtml, bodyText: '', segment });
      setSubject('');
      setBodyHtml('');
      setComposing(false);
      toast.success('Campaign saved', 'It is a draft until you press Send.');
      await refresh();
    } catch (err) {
      toast.error('Could not save', err instanceof ApiError ? err.message : '');
    } finally {
      setSaving(false);
    }
  };

  const send = async (campaign: NewsletterCampaign) => {
    if (!window.confirm(`Send “${campaign.subject}” now?`)) return;
    setSendingId(campaign.id);
    try {
      const result = await sendNewsletterCampaign(campaign.id);
      toast.success('Campaign sent', `Sent ${result.sent} of ${result.recipientCount}${result.failed ? ` (${result.failed} failed)` : ''}`);
      await refresh();
    } catch (err) {
      toast.error('Send failed', err instanceof ApiError ? err.message : '');
    } finally {
      setSendingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[30vh] items-center justify-center gap-2 text-sm text-muted">
        <LoaderCircle className="h-4 w-4 animate-spin" />
        Loading newsletter…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <DashHero
        eyebrow="Outreach"
        title="Newsletter"
        subtitle="Write a campaign, save it as a draft, then send it to subscribers and verified users."
        actions={
          <button type="button" className="btn-primary" onClick={() => setComposing(true)}>
            <Plus className="h-4 w-4" /> New campaign
          </button>
        }
      />

      {error ? <p className="text-sm text-danger">{error}</p> : null}

      <section className="space-y-3">
        {campaigns.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center">
            <Newspaper className="mx-auto h-7 w-7 text-muted" />
            <p className="mt-2 font-display text-lg text-foreground">No campaigns yet</p>
            <button type="button" className="btn-primary mt-4 inline-flex text-sm" onClick={() => setComposing(true)}>
              <Plus className="h-4 w-4" /> New campaign
            </button>
          </div>
        ) : (
          campaigns.map((campaign, i) => (
            <motion.article
              key={campaign.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="flex flex-col gap-3 rounded-2xl border border-border bg-surface-elevated p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="break-words font-medium text-foreground">{campaign.subject}</p>
                <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
                  <StatusChip status={campaign.status} />
                  {SEGMENTS.find((s) => s.id === campaign.segment)?.label ?? campaign.segment}
                  {campaign._count ? ` · ${campaign._count.sends} sends` : ''}
                </p>
              </div>
              <button type="button" className="btn-secondary shrink-0 text-sm" disabled={sendingId === campaign.id} onClick={() => void send(campaign)}>
                <Send className="h-4 w-4" /> {sendingId === campaign.id ? 'Sending…' : 'Send now'}
              </button>
            </motion.article>
          ))
        )}
      </section>

      <FormModal
        open={composing}
        onClose={() => setComposing(false)}
        icon={Mail}
        title="New campaign"
        description="Saved as a draft. Nothing goes out until you press Send now."
        size="xl"
        footer={
          <>
            <button type="button" className="btn-secondary" onClick={() => setComposing(false)}>
              Cancel
            </button>
            <button type="button" className="btn-secondary" disabled={testing || !hasBody || subject.trim().length < 3} onClick={() => void sendTest()}>
              {testing ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <FlaskConical className="h-4 w-4" />}
              {testing ? 'Sending test…' : 'Send me a test'}
            </button>
            <button type="submit" form="newsletter-form" className="btn-primary" disabled={saving}>
              {saving ? 'Saving…' : 'Save campaign'}
            </button>
          </>
        }
      >
        <form id="newsletter-form" onSubmit={save} className="space-y-5">
          <FormField label="Audience">
            <div className="grid grid-cols-1 gap-2 min-[340px]:grid-cols-3">
              {SEGMENTS.map((s) => {
                const active = segment === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSegment(s.id)}
                    className={cn(
                      'flex items-start gap-2.5 rounded-2xl border p-3 text-left transition',
                      active ? 'border-brand bg-brand-soft shadow-md shadow-brand/10' : 'border-border hover:border-brand/40',
                    )}
                  >
                    <span className={cn('inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl', active ? 'bg-brand text-white dark:text-[#071f14]' : 'bg-surface text-muted')}>
                      <s.icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0">
                      <span className={cn('block text-sm font-semibold', active ? 'text-brand' : 'text-foreground')}>{s.label}</span>
                      <span className="block text-[11px] text-muted">{s.hint}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </FormField>
          <FormField label="Subject">
            <input className="input-field" placeholder="This month at Dealo" value={subject} onChange={(e) => setSubject(e.target.value)} required />
          </FormField>
          <FormField label="Message" hint="Add headings, pictures (upload, drag in or paste) and buttons. Preview shows it exactly as it lands in the inbox.">
            <EmailComposer id="newsletter" value={bodyHtml} onChange={setBodyHtml} subject={subject} />
          </FormField>
        </form>
      </FormModal>
    </div>
  );
}
