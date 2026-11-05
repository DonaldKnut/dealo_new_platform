'use client';

import { createWorkspaceSchema } from '@dealo/shared';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Check, Loader2, X } from 'lucide-react';
import { useEffect, useState } from 'react';

import { FormField } from '@/components/forms/form-field';
import { useToast } from '@/components/ui/toast';
import { atsApi, rememberWorkspace } from '@/lib/ats-api';
import { ApiError } from '@/lib/api';

const toSlug = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);

export function CreateWorkspaceForm({ onCreated }: { onCreated: (id: string) => void }) {
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
    <div className="mx-auto w-full max-w-xl">
      <div className="mb-5 flex items-center gap-2">
        {[1, 2].map((n) => (
          <span key={n} className="h-1.5 flex-1 overflow-hidden rounded-full bg-border">
            <motion.span
              className="block h-full bg-brand"
              initial={false}
              animate={{ width: step >= n ? '100%' : '0%' }}
              transition={{ duration: 0.35 }}
            />
          </span>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {step === 1 ? (
          <motion.div
            key="one"
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            className="space-y-4"
          >
            <FormField label="Company name" help="This shows on your careers page and in emails to applicants.">
              <input
                className="input-field"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Acme Logistics Ltd"
                maxLength={120}
                autoFocus
              />
            </FormField>
            <FormField
              label="Web address"
              help="Your public careers page lives here. Lowercase letters, numbers and dashes."
              hint={
                <span className="break-all">
                  dealo.africa/careers/<strong className="text-foreground">{slug || 'your-company'}</strong>
                </span>
              }
            >
              <div className="relative">
                <input
                  className="input-field pr-10"
                  value={slug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    setSlug(toSlug(e.target.value));
                  }}
                  placeholder="acme-logistics"
                  maxLength={60}
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                  {check === 'checking' ? <Loader2 className="h-4 w-4 animate-spin text-muted" /> : null}
                  {check === 'ok' ? <Check className="h-4 w-4 text-brand" /> : null}
                  {check === 'taken' ? <X className="h-4 w-4 text-danger" /> : null}
                </span>
              </div>
              {check === 'taken' ? <p className="text-xs text-danger">That address is taken. Try another.</p> : null}
            </FormField>
            <button type="button" className="btn-primary w-full" disabled={!stepOneValid} onClick={() => setStep(2)}>
              Next <ArrowRight className="h-4 w-4" />
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="two"
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            className="space-y-4"
          >
            <FormField label="Website" optional>
              <input className="input-field" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://acme.ng" />
            </FormField>
            <FormField label="Logo link" optional help="Paste a link to your logo image (PNG or SVG). You can change it later.">
              <input className="input-field" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://…/logo.png" />
            </FormField>
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="" className="h-12 w-auto max-w-full rounded-lg border border-border bg-white object-contain p-1" />
            ) : null}
            {error ? <p className="text-sm text-danger">{error}</p> : null}
            <div className="flex flex-col gap-2 min-[340px]:flex-row">
              <button type="button" className="btn-secondary min-[340px]:w-auto" onClick={() => setStep(1)}>
                <ArrowLeft className="h-4 w-4" /> Back
              </button>
              <button type="button" className="btn-primary flex-1" disabled={saving} onClick={submit}>
                {saving ? 'Creating…' : 'Create workspace'}
              </button>
            </div>
            <p className="text-xs leading-relaxed text-muted">
              Free during early access: up to 10 open jobs and 10 team members. You become the owner and can invite your team next.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
