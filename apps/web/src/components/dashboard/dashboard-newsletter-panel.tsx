'use client';

import { LoaderCircle } from 'lucide-react';
import { useEffect, useState } from 'react';

import { ApiError } from '@/lib/api';
import {
  createNewsletterCampaign,
  fetchNewsletterCampaigns,
  sendNewsletterCampaign,
  type NewsletterCampaign,
} from '@/lib/dashboard-api';

export function DashboardNewsletterPanel() {
  const [campaigns, setCampaigns] = useState<NewsletterCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [subject, setSubject] = useState('');
  const [bodyHtml, setBodyHtml] = useState('');
  const [segment, setSegment] = useState('ALL');
  const [sendingId, setSendingId] = useState<string | null>(null);

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
        if (active) {
          setError(err instanceof ApiError ? err.message : 'Unable to load campaigns.');
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[30vh] items-center justify-center gap-2 text-sm text-muted">
        <LoaderCircle className="h-4 w-4 animate-spin" />
        Loading newsletter…
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="eyebrow">Outreach</p>
        <h1 className="display-title mt-2 text-[1.65rem] min-[340px]:text-3xl">Newsletter</h1>
        <p className="mt-2 text-sm text-muted">
          Compose and send email blasts to subscribers and verified users by segment.
        </p>
      </div>

      {error ? <p className="text-sm text-danger">{error}</p> : null}
      {message ? <p className="text-sm text-brand">{message}</p> : null}

      <form
        className="space-y-3 rounded-2xl border border-border p-4"
        onSubmit={async (event) => {
          event.preventDefault();
          setError(null);
          setMessage(null);
          try {
            await createNewsletterCampaign({ subject, bodyHtml, bodyText: '', segment });
            setSubject('');
            setBodyHtml('');
            setMessage('Campaign saved as draft.');
            await refresh();
          } catch (err) {
            setError(err instanceof ApiError ? err.message : 'Unable to create campaign.');
          }
        }}
      >
        <h2 className="font-display text-lg">Compose campaign</h2>
        <input
          className="w-full rounded-xl border border-border bg-surface-elevated px-3 py-2 text-sm"
          placeholder="Subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          required
        />
        <textarea
          className="min-h-[10rem] w-full rounded-xl border border-border bg-surface-elevated px-3 py-2 text-sm"
          placeholder="HTML body"
          value={bodyHtml}
          onChange={(e) => setBodyHtml(e.target.value)}
          required
        />
        <select
          className="w-full rounded-xl border border-border bg-surface-elevated px-3 py-2 text-sm"
          value={segment}
          onChange={(e) => setSegment(e.target.value)}
        >
          <option value="ALL">All</option>
          <option value="EMPLOYER">Employers</option>
          <option value="TALENT">Talent</option>
        </select>
        <button type="submit" className="btn-primary">
          Save campaign
        </button>
      </form>

      <section className="space-y-3">
        {campaigns.length === 0 ? (
          <p className="text-sm text-muted">No campaigns yet.</p>
        ) : (
          campaigns.map((campaign) => (
            <article
              key={campaign.id}
              className="flex flex-col gap-3 rounded-2xl border border-border p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-medium text-foreground">{campaign.subject}</p>
                <p className="mt-1 text-xs text-muted">
                  {campaign.segment} · {campaign.status}
                  {campaign._count ? ` · ${campaign._count.sends} sends` : ''}
                </p>
              </div>
              <button
                type="button"
                className="btn-secondary"
                disabled={sendingId === campaign.id}
                onClick={() => {
                  void (async () => {
                    setSendingId(campaign.id);
                    setError(null);
                    setMessage(null);
                    try {
                      const result = await sendNewsletterCampaign(campaign.id);
                      setMessage(
                        `Sent ${result.sent}/${result.recipientCount} (failed ${result.failed}).`,
                      );
                      await refresh();
                    } catch (err) {
                      setError(err instanceof ApiError ? err.message : 'Send failed.');
                    } finally {
                      setSendingId(null);
                    }
                  })();
                }}
              >
                {sendingId === campaign.id ? 'Sending…' : 'Send now'}
              </button>
            </article>
          ))
        )}
      </section>
    </div>
  );
}
