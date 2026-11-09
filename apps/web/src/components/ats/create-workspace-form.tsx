'use client';

import { createWorkspaceSchema } from '@dealo/shared';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Building2, Check, Globe, ImageIcon, Loader2, MapPin, Sparkles, X } from 'lucide-react';
import { useEffect, useState } from 'react';

import { FormField } from '@/components/forms/form-field';
import { useToast } from '@/components/ui/toast';
import { atsApi, rememberWorkspace } from '@/lib/ats-api';
import { ApiError } from '@/lib/api';
import { cn } from '@/lib/utils';

const toSlug = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);

const STEPS = [
  { n: 1 as const, label: 'Your company' },
  { n: 2 as const, label: 'Brand', optional: true },
];

function initials(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? '')
      .join('') || 'Co'
  );
}

/** Live preview of the public careers page while the workspace is being set up. */
function CareersPreview({ name, slug, logoUrl }: { name: string; slug: string; logoUrl: string }) {
  const [logoOk, setLogoOk] = useState(true);
  useEffect(() => setLogoOk(true), [logoUrl]);
  const showLogo = Boolean(logoUrl) && logoOk;

  return (
    <div className="relative overflow-hidden rounded-3xl border border-border bg-[radial-gradient(120%_80%_at_100%_0%,rgba(20,184,166,0.18),transparent_60%),linear-gradient(180deg,var(--surface),var(--surface-elevated))] p-4 sm:p-5">
      <p className="mb-3 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-brand">
        <Sparkles className="h-3.5 w-3.5" /> Live preview
      </p>
      <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-[0_18px_40px_rgba(4,47,46,0.12)] dark:bg-[#0b1f17]">
        <div className="flex items-center gap-1.5 border-b border-slate-200/80 bg-slate-50 px-3 py-2 dark:border-white/10 dark:bg-white/5">
          <span className="h-2 w-2 rounded-full bg-rose-300" />
          <span className="h-2 w-2 rounded-full bg-amber-300" />
          <span className="h-2 w-2 rounded-full bg-emerald-300" />
          <span className="ml-2 min-w-0 flex-1 truncate rounded-md bg-white px-2 py-0.5 text-[10px] text-slate-500 dark:bg-white/10 dark:text-slate-300">
            dealonetwork.com/careers/<strong className="text-slate-800 dark:text-white">{slug || 'your-company'}</strong>
          </span>
        </div>
        <div className="p-4">
          <div className="flex items-center gap-3">
            <motion.span
              key={showLogo ? logoUrl : initials(name)}
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="inline-flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-gradient-to-br from-[#14b8a6] to-[#0f766e] text-sm font-bold text-white dark:border-white/10"
            >
              {showLogo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt="" onError={() => setLogoOk(false)} className="h-full w-full bg-white object-contain p-1" />
              ) : (
                initials(name)
              )}
            </motion.span>
            <div className="min-w-0">
              <p className="truncate font-display text-lg leading-tight text-slate-900 dark:text-white">{name.trim() || 'Your company'}</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Careers · We are hiring</p>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            {['Operations Manager', 'Site Electrician', 'Sales Executive'].map((role, i) => (
              <motion.div
                key={role}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08 * i }}
                className="flex items-center justify-between gap-2 rounded-xl border border-slate-200/80 px-3 py-2 dark:border-white/10"
              >
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-slate-800 dark:text-slate-100">{role}</p>
                  <p className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400">
                    <MapPin className="h-2.5 w-2.5" /> Lagos · Full time
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-[#0f766e] px-2.5 py-1 text-[10px] font-semibold text-white">Apply</span>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
      <p className="mt-3 text-[11px] leading-relaxed text-muted">Applicants see this page when you share a job link. You can add an intro and change the look later.</p>
    </div>
  );
}

export function CreateWorkspaceForm({ onCreated, onCancel }: { onCreated: (id: string) => void; onCancel?: () => void }) {
  const toast = useToast();
  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [website, setWebsite] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [check, setCheck] = useState<'idle' | 'checking' | 'ok' | 'taken'>('idle');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slugTouched) setSlug(toSlug(name));
  }, [name, slugTouched]);

  useEffect(() => {
    if (slug.length < 2) {
      setCheck('idle');
      return;
    }
    setCheck('checking');
    const timer = window.setTimeout(async () => {
      try {
        const result = await atsApi.slugCheck(slug);
        setCheck(result.available ? 'ok' : 'taken');
      } catch {
        setCheck('idle');
      }
    }, 350);
    return () => window.clearTimeout(timer);
  }, [slug]);

  const stepOneValid = name.trim().length >= 2 && check === 'ok';

  const submit = async () => {
    setError(null);
    const parsed = createWorkspaceSchema.safeParse({ name, slug, website, logoUrl });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Check the details');
      return;
    }
    setSaving(true);
    try {
      const workspace = await atsApi.createWorkspace(parsed.data);
      rememberWorkspace(workspace.id);
      toast.success('Workspace ready', `${workspace.name} is set up. Post your first job.`);
      onCreated(workspace.id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create the workspace');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.92fr)] lg:items-start">
      <div className="min-w-0">
        <ol className="mb-6 flex items-center gap-2" aria-label="Steps">
          {STEPS.map((s, i) => {
            const done = step > s.n;
            const current = step === s.n;
            return (
              <li key={s.n} className="flex min-w-0 flex-1 items-center gap-2">
                <span
                  className={cn(
                    'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition',
                    done ? 'bg-brand text-white dark:text-[#071f14]' : current ? 'bg-brand-soft text-brand ring-2 ring-brand' : 'bg-surface text-muted',
                  )}
                >
                  {done ? <Check className="h-3.5 w-3.5" /> : s.n}
                </span>
                <span className={cn('truncate text-xs font-semibold', current ? 'text-foreground' : 'text-muted')}>
                  {s.label}
                  {s.optional ? <span className="font-normal text-muted"> · optional</span> : null}
                </span>
                {i < STEPS.length - 1 ? <span className={cn('h-px flex-1 transition', done ? 'bg-brand' : 'bg-border')} /> : null}
              </li>
            );
          })}
        </ol>

        <AnimatePresence mode="wait">
          {step === 1 ? (
            <motion.div key="one" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} className="space-y-4">
              <FormField label="Company name" help="Shown on your careers page and in emails to applicants.">
                <div className="relative">
                  <Building2 className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                  <input className="input-field pl-10" value={name} onChange={(e) => setName(e.target.value)} placeholder="Acme Logistics Ltd" maxLength={120} autoFocus />
                </div>
              </FormField>
              <FormField
                label="Careers page address"
                help="Lowercase letters, numbers and dashes. You can share this link anywhere."
                hint={
                  check === 'taken' ? (
                    <span className="text-danger">That address is taken. Try another.</span>
                  ) : check === 'ok' ? (
                    <span className="text-brand">Available</span>
                  ) : undefined
                }
              >
                <div
                  className={cn(
                    'flex items-center overflow-hidden rounded-xl border bg-surface-elevated transition focus-within:ring-2 focus-within:ring-brand/20',
                    check === 'taken' ? 'border-danger' : check === 'ok' ? 'border-brand/60' : 'border-border',
                  )}
                >
                  <span className="hidden shrink-0 border-r border-border bg-surface px-3 py-2.5 text-xs text-muted min-[400px]:block">dealonetwork.com/careers/</span>
                  <input
                    className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-sm outline-none"
                    value={slug}
                    onChange={(e) => {
                      setSlugTouched(true);
                      setSlug(toSlug(e.target.value));
                    }}
                    placeholder="acme-logistics"
                    maxLength={60}
                    aria-label="Careers page address"
                  />
                  <span className="shrink-0 pr-3">
                    {check === 'checking' ? <Loader2 className="h-4 w-4 animate-spin text-muted" /> : null}
                    {check === 'ok' ? <Check className="h-4 w-4 text-brand" /> : null}
                    {check === 'taken' ? <X className="h-4 w-4 text-danger" /> : null}
                  </span>
                </div>
              </FormField>
              <div className="flex flex-col-reverse gap-2 pt-2 min-[340px]:flex-row">
                {onCancel ? (
                  <button type="button" className="btn-secondary min-[340px]:w-auto" onClick={onCancel}>
                    Cancel
                  </button>
                ) : null}
                <button type="button" className="btn-primary flex-1" disabled={!stepOneValid} onClick={() => setStep(2)}>
                  Continue <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div key="two" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} className="space-y-4">
              <FormField label="Website" optional>
                <div className="relative">
                  <Globe className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                  <input className="input-field pl-10" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://acme.ng" />
                </div>
              </FormField>
              <FormField label="Logo link" optional help="A link to your logo (PNG or SVG). The preview updates as you paste.">
                <div className="relative">
                  <ImageIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                  <input className="input-field pl-10" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://…/logo.png" />
                </div>
              </FormField>
              {error ? <p className="rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p> : null}
              <div className="flex flex-col-reverse gap-2 pt-2 min-[340px]:flex-row">
                <button type="button" className="btn-secondary min-[340px]:w-auto" onClick={() => setStep(1)}>
                  <ArrowLeft className="h-4 w-4" /> Back
                </button>
                <button type="button" className="btn-primary flex-1" disabled={saving} onClick={submit}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  {saving ? 'Creating…' : 'Create workspace'}
                </button>
              </div>
              <p className="text-xs leading-relaxed text-muted">Free during early access. You become the owner and can invite your team straight after.</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="hidden min-w-0 sm:block">
        <CareersPreview name={name} slug={slug} logoUrl={logoUrl} />
      </div>
    </div>
  );
}
