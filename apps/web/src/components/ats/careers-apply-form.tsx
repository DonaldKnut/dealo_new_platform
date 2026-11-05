'use client';

import { applySchema } from '@dealo/shared';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, FileUp, Loader2, X } from 'lucide-react';
import { useRef, useState } from 'react';

import { FormField } from '@/components/forms/form-field';
import { ApiError } from '@/lib/api';
import { atsApi } from '@/lib/ats-api';

const ACCEPT = '.pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const MAX = 8 * 1024 * 1024;

export function CareersApplyForm({ orgSlug, jobSlug, orgName }: { orgSlug: string; jobSlug: string; orgName: string }) {
  const [values, setValues] = useState({ name: '', email: '', phone: '', location: '', coverNote: '', website: '' });
  const [cv, setCv] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const pickFile = (file: File | null) => {
    if (file && file.size > MAX) {
      setErrors((e) => ({ ...e, cv: 'Your CV must be 8 MB or smaller' }));
      return;
    }
    setErrors((current) => {
      const next = { ...current };
      delete next.cv;
      return next;
    });
    setCv(file);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setServerError(null);
    const parsed = applySchema.safeParse(values);
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) next[String(issue.path[0])] ??= issue.message;
      setErrors(next);
      return;
    }
    if (!cv) {
      setErrors({ cv: 'Please attach your CV' });
      return;
    }
    setErrors({});
    setSending(true);
    try {
      await atsApi.apply(orgSlug, jobSlug, parsed.data, cv);
      setDone(true);
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : 'Could not send your application. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const bind = (key: keyof typeof values) => ({
    value: values[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setValues((v) => ({ ...v, [key]: e.target.value })),
  });

  return (
    <AnimatePresence mode="wait">
      {done ? (
        <motion.div key="done" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="py-6 text-center">
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 14, delay: 0.1 }}
            className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-brand-soft text-brand"
          >
            <CheckCircle2 className="h-7 w-7" />
          </motion.span>
          <h3 className="mt-4 font-display text-2xl text-foreground">Application sent</h3>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
            Thank you. {orgName} will review it and contact you. We emailed you a copy. You never need to pay anyone to be considered.
          </p>
        </motion.div>
      ) : (
        <motion.form key="form" onSubmit={submit} className="space-y-4" noValidate exit={{ opacity: 0 }}>
          <FormField label="Full name" error={errors.name}>
            <input className="input-field" autoComplete="name" {...bind('name')} maxLength={140} />
          </FormField>
          <FormField label="Email" error={errors.email}>
            <input className="input-field" type="email" autoComplete="email" {...bind('email')} />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Phone" optional error={errors.phone}>
              <input className="input-field" type="tel" autoComplete="tel" {...bind('phone')} placeholder="0803 000 0000" maxLength={30} />
            </FormField>
            <FormField label="Where you live" optional error={errors.location}>
              <input className="input-field" autoComplete="address-level2" {...bind('location')} placeholder="Ikeja, Lagos" maxLength={140} />
            </FormField>
          </div>

          <FormField label="CV" error={errors.cv} hint="PDF or Word, up to 8 MB.">
            <input ref={fileRef} type="file" accept={ACCEPT} className="sr-only" onChange={(e) => pickFile(e.target.files?.[0] ?? null)} />
            {cv ? (
              <div className="flex items-center gap-2 rounded-xl border border-brand/40 bg-brand-soft px-3 py-2.5 text-sm">
                <FileUp className="h-4 w-4 shrink-0 text-brand" />
                <span className="min-w-0 flex-1 truncate text-foreground">{cv.name}</span>
                <button
                  type="button"
                  aria-label="Remove CV"
                  onClick={() => {
                    setCv(null);
                    if (fileRef.current) fileRef.current.value = '';
                  }}
                  className="text-muted hover:text-danger"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  pickFile(e.dataTransfer.files?.[0] ?? null);
                }}
                className="flex w-full flex-col items-center gap-1 rounded-xl border-2 border-dashed border-border px-3 py-5 text-center text-sm text-muted transition hover:border-brand hover:text-brand"
              >
                <FileUp className="h-5 w-5" />
                <span className="font-semibold">Upload your CV</span>
                <span className="text-xs">Tap to choose a file</span>
              </button>
            )}
          </FormField>

          <FormField label="Anything else?" optional error={errors.coverNote} hint="A few lines on why you fit. Mention licences, tools or experience.">
            <textarea className="input-field min-h-[6rem]" {...bind('coverNote')} maxLength={3000} />
          </FormField>

          <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
            <label>
              Website
              <input tabIndex={-1} autoComplete="off" {...bind('website')} />
            </label>
          </div>

          {serverError ? <p className="rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">{serverError}</p> : null}

          <button type="submit" className="btn-primary w-full" disabled={sending}>
            {sending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Sending…
              </>
            ) : (
              'Send application'
            )}
          </button>
          <p className="text-[11px] leading-relaxed text-muted">
            Your details go only to {orgName}. An AI helper may give the team a first summary of your CV; it never sees your name, age, gender or photo, and a person makes every decision.
          </p>
        </motion.form>
      )}
    </AnimatePresence>
  );
}
