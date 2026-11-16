'use client';

import { submitOrgVerificationSchema, updateWorkspaceSchema } from '@dealo/shared';
import { Building2, Copy, ExternalLink, Globe, Pencil, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { AtsIntegrationsPanel } from '@/components/ats/ats-integrations-panel';
import { AtsTemplatesPanel } from '@/components/ats/ats-templates-panel';
import { AtsUsageCard } from '@/components/ats/ats-usage';
import { useAtsWorkspace } from '@/components/ats/ats-workspace';
import { DashPanel } from '@/components/dashboard/dashboard-ui';
import { FormField } from '@/components/forms/form-field';
import { FormModal } from '@/components/ui/form-modal';
import { useToast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api';
import { atsApi, canManage, isAdminRole, type OrgVerificationStatus } from '@/lib/ats-api';
import { cn } from '@/lib/utils';

const VERIFY_LABEL: Record<OrgVerificationStatus, string> = {
  UNVERIFIED: 'Not submitted',
  PENDING: 'Pending review',
  VERIFIED: 'Verified',
  REJECTED: 'Declined',
};

export function AtsSettingsPanel() {
  const toast = useToast();
  const { orgId, current, reloadDetail, reload } = useAtsWorkspace();
  const [editing, setEditing] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [form, setForm] = useState({ name: '', website: '', logoUrl: '', about: '', brandColor: '#0f766e', careersEnabled: true });
  const [verifyForm, setVerifyForm] = useState({ name: '', website: '', workEmail: '', cacNumber: '' });
  const [saving, setSaving] = useState(false);
  const [verifySaving, setVerifySaving] = useState(false);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (!current || editing) return;
    const w = current.workspace;
    setForm({
      name: w.name,
      website: w.website ?? '',
      logoUrl: w.logoUrl ?? '',
      about: w.about ?? '',
      brandColor: w.brandColor ?? '#0f766e',
      careersEnabled: w.careersEnabled,
    });
  }, [current, editing]);

  useEffect(() => {
    if (!current || verifying) return;
    const w = current.workspace;
    setVerifyForm({
      name: w.name,
      website: w.website ?? '',
      workEmail: w.workEmail ?? '',
      cacNumber: w.cacNumber ?? '',
    });
  }, [current, verifying]);

  if (!current || !orgId) return null;
  const admin = isAdminRole(current.myRole);
  const w = current.workspace;
  const status = (w.verificationStatus ?? 'UNVERIFIED') as OrgVerificationStatus;
  const url = typeof window === 'undefined' ? `/careers/${w.slug}` : `${window.location.origin}/careers/${w.slug}`;

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
      toast.success('Careers page updated');
      setEditing(false);
      await Promise.all([reloadDetail(), reload()]);
    } catch (err) {
      toast.error('Could not save', err instanceof ApiError ? err.message : '');
    } finally {
      setSaving(false);
    }
  };

  const submitVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = submitOrgVerificationSchema.safeParse(verifyForm);
    if (!parsed.success) {
      toast.error('Check the form', parsed.error.issues[0]?.message);
      return;
    }
    setVerifySaving(true);
    try {
      await atsApi.submitVerification(orgId, parsed.data);
      toast.success('Verification submitted', `We sent a confirmation link to ${parsed.data.workEmail}.`);
      setVerifying(false);
      await Promise.all([reloadDetail(), reload()]);
    } catch (err) {
      toast.error('Could not submit', err instanceof ApiError ? err.message : '');
    } finally {
      setVerifySaving(false);
    }
  };

  const resendWorkEmail = async () => {
    setResending(true);
    try {
      const result = await atsApi.resendWorkEmailVerification(orgId);
      if (result.alreadyVerified) toast.success('Work email already confirmed');
      else toast.success('Link sent', `Check ${w.workEmail}, including spam.`);
      await reloadDetail();
    } catch (err) {
      toast.error('Could not send', err instanceof ApiError ? err.message : '');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
      <DashPanel
        title="Careers page"
        action={
          admin ? (
            <button type="button" onClick={() => setEditing(true)} className="btn-secondary px-3 py-2 text-xs">
              <Pencil className="h-3.5 w-3.5" /> Edit
            </button>
          ) : null
        }
      >
        <div className="overflow-hidden rounded-2xl border border-border">
          <div className="relative p-4 sm:p-5" style={{ background: `linear-gradient(135deg, ${w.brandColor ?? '#0f766e'}22, transparent 70%)` }}>
            <div className="flex min-w-0 items-center gap-3">
              {w.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={w.logoUrl} alt="" className="h-12 w-12 shrink-0 rounded-2xl border border-border bg-white object-contain p-1.5" />
              ) : (
                <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white" style={{ backgroundColor: w.brandColor ?? '#0f766e' }}>
                  <Building2 className="h-6 w-6" />
                </span>
              )}
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: w.brandColor ?? '#0f766e' }}>
                  Careers
                </p>
                <p className="truncate font-display text-xl text-foreground">{w.name}</p>
              </div>
              <span
                className={cn(
                  'ml-auto hidden shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold min-[400px]:inline-flex',
                  w.careersEnabled ? 'bg-brand-soft text-brand' : 'bg-surface text-muted',
                )}
              >
                {w.careersEnabled ? 'Public' : 'Hidden'}
              </span>
            </div>
            <p className="mt-3 line-clamp-3 text-sm text-muted">{w.about || 'No company description yet. Add two or three sentences so applicants know who you are.'}</p>
          </div>
          <div className="flex flex-col gap-2 border-t border-border bg-surface/50 p-3 min-[400px]:flex-row min-[400px]:items-center">
            <Globe className="hidden h-4 w-4 shrink-0 text-brand min-[400px]:block" />
            <span className="min-w-0 flex-1 break-all text-xs text-foreground">{url}</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={async () => {
                  await navigator.clipboard.writeText(url).catch(() => undefined);
                  toast.success('Link copied');
                }}
                className="btn-secondary flex-1 px-3 py-2 text-xs"
              >
                <Copy className="h-3.5 w-3.5" /> Copy
              </button>
              <Link href={`/careers/${w.slug}`} target="_blank" className="btn-secondary flex-1 px-3 py-2 text-xs">
                <ExternalLink className="h-3.5 w-3.5" /> Open
              </Link>
            </div>
          </div>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-muted">
          Put this link on your website, LinkedIn and WhatsApp status. Every open job shows here, and Google can list them in job search.
        </p>
      </DashPanel>

      <DashPanel title="Plan and limits">
        <AtsUsageCard detail={current} />
      </DashPanel>

      <DashPanel
        title="Company verification"
        className="xl:col-span-2"
        action={
          admin && status !== 'VERIFIED' ? (
            <button type="button" onClick={() => setVerifying(true)} className="btn-secondary px-3 py-2 text-xs">
              <ShieldCheck className="h-3.5 w-3.5" /> {status === 'UNVERIFIED' || status === 'REJECTED' ? 'Submit' : 'Update'}
            </button>
          ) : null
        }
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-1">
            <p className="text-sm text-foreground">
              Status:{' '}
              <span
                className={cn(
                  'font-semibold',
                  status === 'VERIFIED' ? 'text-brand' : status === 'REJECTED' ? 'text-danger' : 'text-[#b54708]',
                )}
              >
                {VERIFY_LABEL[status]}
              </span>
            </p>
            <p className="text-xs leading-relaxed text-muted">
              Before you publish a job, confirm a work email on your company website domain. Dealo reviews the company; optional CAC helps.
            </p>
            {w.workEmail ? (
              <p className="text-xs text-muted">
                Work email: <span className="text-foreground">{w.workEmail}</span>
                {w.workEmailVerifiedAt ? ' · confirmed' : ' · waiting for confirmation'}
              </p>
            ) : null}
            {status === 'REJECTED' && w.verificationNote ? (
              <p className="text-xs text-danger">Declined: {w.verificationNote}</p>
            ) : null}
          </div>
          {admin && status === 'PENDING' && w.workEmail && !w.workEmailVerifiedAt ? (
            <button type="button" className="btn-secondary shrink-0 text-xs" disabled={resending} onClick={() => void resendWorkEmail()}>
              {resending ? 'Sending…' : 'Resend work-email link'}
            </button>
          ) : null}
        </div>
      </DashPanel>

      <div className="grid gap-4 lg:grid-cols-2 xl:col-span-2">
        {canManage(current.myRole) ? (
          <DashPanel title="Email templates">
            <AtsTemplatesPanel orgId={orgId} />
          </DashPanel>
        ) : null}
        {admin ? (
          <DashPanel title="API and webhooks">
            <AtsIntegrationsPanel orgId={orgId} />
          </DashPanel>
        ) : null}
      </div>

      <FormModal
        open={editing}
        onClose={() => setEditing(false)}
        icon={Globe}
        title="Edit careers page"
        description="What applicants see before they apply."
        size="lg"
        footer={
          <>
            <button type="button" className="btn-secondary" onClick={() => setEditing(false)}>
              Cancel
            </button>
            <button type="submit" form="careers-settings-form" className="btn-primary" disabled={saving}>
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </>
        }
      >
        <form id="careers-settings-form" onSubmit={save} className="space-y-4">
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
              <input
                type="color"
                value={form.brandColor}
                onChange={(e) => setForm({ ...form, brandColor: e.target.value })}
                className="h-10 w-12 shrink-0 cursor-pointer rounded-lg border border-border bg-transparent"
              />
              <input className="input-field" value={form.brandColor} onChange={(e) => setForm({ ...form, brandColor: e.target.value })} maxLength={7} />
            </div>
          </FormField>
          <label className="flex items-start gap-3 rounded-2xl border border-border p-3 text-sm">
            <input type="checkbox" checked={form.careersEnabled} onChange={(e) => setForm({ ...form, careersEnabled: e.target.checked })} className="mt-1 accent-[var(--brand)]" />
            <span>
              <span className="font-semibold text-foreground">Careers page is public</span>
              <span className="block text-xs text-muted">Turn off to hide all jobs while you get ready.</span>
            </span>
          </label>
        </form>
      </FormModal>

      <FormModal
        open={verifying}
        onClose={() => setVerifying(false)}
        icon={ShieldCheck}
        title="Verify your company"
        description="We need your website and a work email on that domain before you can publish jobs."
        size="lg"
        footer={
          <>
            <button type="button" className="btn-secondary" onClick={() => setVerifying(false)}>
              Cancel
            </button>
            <button type="submit" form="org-verify-form" className="btn-primary" disabled={verifySaving}>
              {verifySaving ? 'Submitting…' : 'Submit and email me'}
            </button>
          </>
        }
      >
        <form id="org-verify-form" onSubmit={submitVerification} className="space-y-4">
          <FormField label="Company name">
            <input className="input-field" value={verifyForm.name} onChange={(e) => setVerifyForm({ ...verifyForm, name: e.target.value })} />
          </FormField>
          <FormField label="Company website" hint="Use the real company site, for example https://acme.com">
            <input
              className="input-field"
              value={verifyForm.website}
              onChange={(e) => setVerifyForm({ ...verifyForm, website: e.target.value })}
              placeholder="https://"
            />
          </FormField>
          <FormField label="Work email" hint="Must match your website domain (for example you@acme.com).">
            <input
              className="input-field"
              type="email"
              value={verifyForm.workEmail}
              onChange={(e) => setVerifyForm({ ...verifyForm, workEmail: e.target.value })}
              placeholder="you@company.com"
            />
          </FormField>
          <FormField label="CAC number" optional hint="Optional. Helps Dealo approve faster in Nigeria.">
            <input
              className="input-field"
              value={verifyForm.cacNumber}
              onChange={(e) => setVerifyForm({ ...verifyForm, cacNumber: e.target.value })}
              placeholder="RC / BN number"
            />
          </FormField>
        </form>
      </FormModal>
    </div>
  );
}
