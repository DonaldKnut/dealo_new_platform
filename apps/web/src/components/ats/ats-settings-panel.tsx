'use client';

import { updateWorkspaceSchema } from '@dealo/shared';
import { ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { useAtsWorkspace } from '@/components/ats/ats-workspace';
import { DashPanel } from '@/components/dashboard/dashboard-ui';
import { FormField } from '@/components/forms/form-field';
import { useToast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api';
import { atsApi, isAdminRole } from '@/lib/ats-api';

export function AtsSettingsPanel() {
  const toast = useToast();
  const { orgId, current, reloadDetail, reload } = useAtsWorkspace();
  const [form, setForm] = useState({ name: '', website: '', logoUrl: '', about: '', brandColor: '#0f766e', careersEnabled: true });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!current) return;
    const w = current.workspace;
    setForm({
      name: w.name,
      website: w.website ?? '',
      logoUrl: w.logoUrl ?? '',
      about: w.about ?? '',
      brandColor: w.brandColor ?? '#0f766e',
      careersEnabled: w.careersEnabled,
    });
  }, [current]);

  if (!current || !orgId) return null;
  const admin = isAdminRole(current.myRole);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = updateWorkspaceSchema.safeParse({ ...form, about: form.about || null });
    if (!parsed.success) {
      toast.error('Check the form', parsed.error.issues[0]?.message);
      return;
    }
    setSaving(true);
    try {
      await atsApi.updateWorkspace(orgId, parsed.data);
      toast.success('Saved');
      await Promise.all([reloadDetail(), reload()]);
    } catch (err) {
      toast.error('Could not save', err instanceof ApiError ? err.message : '');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
      <DashPanel title="Careers page">
        <form onSubmit={save} className="space-y-4">
          <fieldset disabled={!admin} className="space-y-4">
            <FormField label="Company name">
              <input className="input-field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </FormField>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Website" optional>
                <input className="input-field" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="https://" />
              </FormField>
              <FormField label="Logo link" optional>
                <input className="input-field" value={form.logoUrl} onChange={(e) => setForm({ ...form, logoUrl: e.target.value })} placeholder="https://…/logo.png" />
              </FormField>
            </div>
            <FormField label="About the company" optional hint="Two or three sentences applicants see at the top of your careers page.">
              <textarea className="input-field min-h-[7rem]" value={form.about} onChange={(e) => setForm({ ...form, about: e.target.value })} maxLength={2000} />
            </FormField>
            <FormField label="Brand colour">
              <div className="flex items-center gap-2">
                <input type="color" value={form.brandColor} onChange={(e) => setForm({ ...form, brandColor: e.target.value })} className="h-10 w-12 shrink-0 cursor-pointer rounded-lg border border-border bg-transparent" />
                <input className="input-field" value={form.brandColor} onChange={(e) => setForm({ ...form, brandColor: e.target.value })} maxLength={7} />
              </div>
            </FormField>
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" checked={form.careersEnabled} onChange={(e) => setForm({ ...form, careersEnabled: e.target.checked })} className="mt-1 accent-[var(--brand)]" />
              <span>
                Careers page is public
                <span className="block text-xs text-muted">Turn off to hide all jobs while you get ready.</span>
              </span>
            </label>
          </fieldset>
          {admin ? (
            <button type="submit" className="btn-primary w-full sm:w-auto" disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          ) : (
            <p className="text-xs text-muted">Only owners and admins can change these settings.</p>
          )}
        </form>
      </DashPanel>
      <DashPanel title="Your link">
        <p className="break-all text-sm text-foreground">/careers/{current.workspace.slug}</p>
        <p className="mt-2 text-xs leading-relaxed text-muted">
          Put this link on your website, LinkedIn and WhatsApp status. Every open job shows here, and Google can list them in job search.
        </p>
        <Link href={`/careers/${current.workspace.slug}`} target="_blank" className="btn-secondary mt-3 w-full text-sm">
          <ExternalLink className="h-4 w-4" /> Open careers page
        </Link>
      </DashPanel>
    </div>
  );
}
