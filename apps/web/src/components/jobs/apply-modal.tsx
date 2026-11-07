'use client';

import {
  applySchema,
  isPremiumColor,
  isPremiumFont,
  isPremiumTemplate,
  RESUME_COLORS,
  resumeDataSchema,
  resumeStyleSchema,
  type JobListingDetail,
  type ResumeData,
  type ResumeStyle,
} from '@dealo/shared';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUpRight, CheckCircle2, Download, FileText, FileUp, Loader2, LogIn, Plus, Send, Sparkles, Target, X, Zap } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { FormField } from '@/components/forms/form-field';
import { ResumePreview } from '@/components/resume/resume-preview';
import { FormModal } from '@/components/ui/form-modal';
import { useToast } from '@/components/ui/toast';
import type { AuthSessionUser } from '@/hooks/use-auth-session';
import { ApiError } from '@/lib/api';
import { atsApi } from '@/lib/ats-api';
import { jobsApi, type TrackedApplication } from '@/lib/jobs-api';
import { rememberReturnTo, resumeApi, type ResumePlan, type SavedResume } from '@/lib/resume-api';
import { cn } from '@/lib/utils';

const ACCEPT = '.pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const MAX = 8 * 1024 * 1024;

type CvChoice = { kind: 'dealo'; id: string } | { kind: 'file'; file: File } | null;

function freeStyle(style: ResumeStyle): ResumeStyle {
  return {
    template: isPremiumTemplate(style.template) ? 'classic' : style.template,
    font: isPremiumFont(style.font) ? 'helvetica' : style.font,
    accentColor: isPremiumColor(style.accentColor) ? RESUME_COLORS[0] : style.accentColor,
  };
}

function freeData(data: ResumeData): ResumeData {
  return { ...data, design: { ...data.design, art: 'none' } };
}

function parseResume(r: SavedResume): { data: ResumeData; style: ResumeStyle } {
  return {
    data: resumeDataSchema.parse(r.data),
    style: resumeStyleSchema.parse({ template: r.template, accentColor: r.accentColor, font: r.font }),
  };
}

export function ApplyModal({
  job,
  open,
  onClose,
  me,
  tracked,
  onTracked,
}: {
  job: JobListingDetail;
  open: boolean;
  onClose: () => void;
  me: AuthSessionUser | null;
  tracked: TrackedApplication | null;
  onTracked: (app: TrackedApplication) => void;
}) {
  const toast = useToast();
  const router = useRouter();
  const [resumes, setResumes] = useState<SavedResume[] | null>(null);
  const [plan, setPlan] = useState<ResumePlan | null>(null);
  const [choice, setChoice] = useState<CvChoice>(null);
  const [values, setValues] = useState({ name: '', email: '', phone: '', location: '', coverNote: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<null | 'send' | 'pdf' | 'track'>(null);
  const [done, setDone] = useState(false);
  const [opened, setOpened] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const premium = Boolean(plan?.premium);
  const cvs = resumes?.filter((r) => r.kind === 'RESUME') ?? [];
  const selected = choice?.kind === 'dealo' ? cvs.find((r) => r.id === choice.id) ?? null : null;
  const selectedDoc = selected ? parseResume(selected) : null;
  const downgraded = Boolean(selectedDoc && !premium && freeStyle(selectedDoc.style).template !== selectedDoc.style.template);

  useEffect(() => {
    if (!open) return;
    setDone(false);
    setOpened(false);
    setErrors({});
    if (!me) {
      setResumes([]);
      return;
    }
    let active = true;
    Promise.all([resumeApi.list(), resumeApi.plan()])
      .then(([list, p]) => {
        if (!active) return;
        setResumes(list);
        setPlan(p);
        const first = list.find((r) => r.kind === 'RESUME');
        if (first) setChoice((c) => c ?? { kind: 'dealo', id: first.id });
      })
      .catch(() => active && setResumes([]));
    return () => {
      active = false;
    };
  }, [open, me]);

  // Fill the form from the chosen CV, falling back to the account.
  useEffect(() => {
    const personal = selectedDoc?.data.personal;
    setValues((v) => ({
      ...v,
      name: personal?.fullName || v.name || (me ? `${me.firstName} ${me.lastName}`.trim() : ''),
      email: personal?.email || v.email || me?.email || '',
      phone: personal?.phone || v.phone,
      location: personal?.location || v.location,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id, me?.id]);

  const signIn = () => {
    rememberReturnTo(`/jobs?job=${job.id}&apply=1`);
    router.push(`/auth/login?next=${encodeURIComponent(`/jobs?job=${job.id}&apply=1`)}`);
  };

  const pickFile = (file: File | null) => {
    if (!file) return;
    if (file.size > MAX) {
      setErrors((e) => ({ ...e, cv: 'Your CV must be 8 MB or smaller' }));
      return;
    }
    setErrors(({ cv: _cv, ...rest }) => rest);
    setChoice({ kind: 'file', file });
  };

  const makePdf = async (resume: SavedResume) => {
    const { buildPdf, pdfFileName } = await import('@/components/resume/resume-pdf');
    const parsed = parseResume(resume);
    const doc = { kind: 'RESUME' as const, data: premium ? parsed.data : freeData(parsed.data), style: premium ? parsed.style : freeStyle(parsed.style) };
    const blob = await buildPdf(doc, !premium, resume.title);
    return new File([blob], pdfFileName(doc), { type: 'application/pdf' });
  };

  const track = async (resumeId?: string) => {
    const app = await jobsApi.track(job.id, resumeId);
    onTracked(app);
    return app;
  };

  // ------------------------------------------------------------- easy apply

  const sendEasyApply = async () => {
    if (!job.careers) return;
    const parsed = applySchema.safeParse(values);
    const next: Record<string, string> = {};
    if (!parsed.success) for (const issue of parsed.error.issues) next[String(issue.path[0])] ??= issue.message;
    if (!choice) next.cv = 'Choose a CV to send';
    setErrors(next);
    if (!parsed.success || !choice) return;

    setBusy('send');
    try {
      const file = choice.kind === 'file' ? choice.file : await makePdf(selected!);
      await atsApi.apply(job.careers.orgSlug, job.careers.jobSlug, parsed.data, file);
      if (me) await track(choice.kind === 'dealo' ? choice.id : undefined).catch(() => undefined);
      setDone(true);
    } catch (err) {
      toast.error('Could not send your application', err instanceof ApiError ? err.message : 'Please try again.');
    } finally {
      setBusy(null);
    }
  };

  // --------------------------------------------------------- external apply

  const downloadPdf = async () => {
    if (!selected) return;
    setBusy('pdf');
    try {
      const file = await makePdf(selected);
      const { saveBlob } = await import('@/components/resume/resume-pdf');
      saveBlob(file, file.name);
      void resumeApi.downloaded(selected.id).catch(() => undefined);
      toast.success('CV downloaded', 'Attach it on the application page.');
    } catch (err) {
      toast.error('Could not make the PDF', err instanceof Error ? err.message : '');
    } finally {
      setBusy(null);
    }
  };

  const markApplied = async () => {
    if (!me) return signIn();
    setBusy('track');
    try {
      await track(selected?.id);
      setDone(true);
    } catch (err) {
      toast.error('Could not save it', err instanceof ApiError ? err.message : '');
    } finally {
      setBusy(null);
    }
  };

  const bind = (key: keyof typeof values) => ({
    value: values[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setValues((v) => ({ ...v, [key]: e.target.value })),
  });

  // ------------------------------------------------------------------ views

  const cvPicker = (
    <div className="space-y-2">
      {!me ? (
        <button
          type="button"
          onClick={signIn}
          className="flex w-full items-center gap-3 rounded-2xl border border-brand/40 bg-brand-soft/50 p-3 text-left transition hover:border-brand"
        >
          <LogIn className="h-5 w-5 shrink-0 text-brand" />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-foreground">Sign in to use a CV you built on Dealo</span>
            <span className="block text-xs text-muted">We bring you straight back to this job.</span>
          </span>
        </button>
      ) : resumes === null ? (
        <div className="h-16 animate-pulse rounded-2xl bg-surface" />
      ) : cvs.length ? (
        <div className="grid gap-2">
          {cvs.map((r) => {
            const active = choice?.kind === 'dealo' && choice.id === r.id;
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => setChoice({ kind: 'dealo', id: r.id })}
                className={cn(
                  'flex items-center gap-3 rounded-2xl border p-3 text-left transition',
                  active ? 'border-brand bg-brand-soft/50 ring-1 ring-brand/30' : 'border-border hover:border-brand/50',
                )}
              >
                <span className={cn('inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', active ? 'bg-brand text-white dark:text-[#071f14]' : 'bg-surface text-brand')}>
                  <FileText className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-foreground">{r.title}</span>
                  <span className="block text-[11px] text-muted">
                    {r.template} design · edited {new Date(r.updatedAt).toLocaleDateString()}
                  </span>
                </span>
                {active ? <CheckCircle2 className="h-5 w-5 shrink-0 text-brand" /> : null}
              </button>
            );
          })}
        </div>
      ) : (
        <Link href="/resume-builder/new" className="flex items-center gap-3 rounded-2xl border border-dashed border-brand/50 p-3 transition hover:bg-brand-soft/40">
          <Plus className="h-5 w-5 shrink-0 text-brand" />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-foreground">Build a CV in about 10 minutes</span>
            <span className="block text-xs text-muted">Free, works on your phone, and you can apply with it straight after.</span>
          </span>
        </Link>
      )}

      {selectedDoc ? (
        <div className="overflow-hidden rounded-2xl border border-border bg-[#e9eef0] p-2 dark:bg-[#0c1a16]">
          <div className="pointer-events-none mx-auto max-h-44 max-w-[16rem] overflow-hidden rounded shadow-lg">
            <ResumePreview doc={{ kind: 'RESUME', data: premium ? selectedDoc.data : freeData(selectedDoc.data), style: premium ? selectedDoc.style : freeStyle(selectedDoc.style) }} branding={!premium} />
          </div>
        </div>
      ) : null}
      {selected ? (
        <Link
          href={`/resume-builder/${selected.id}?job=${job.id}`}
          className="flex items-center gap-2 rounded-xl border border-amber-400/40 bg-amber-300/10 px-3 py-2 text-xs transition hover:border-amber-400"
        >
          <Target className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <span className="min-w-0 flex-1 text-foreground">
            <span className="font-semibold">Tailor this CV to the job</span> <span className="text-muted">— see missing keywords and get a matching profile{premium ? '' : ' (Premium)'}</span>
          </span>
        </Link>
      ) : null}
      {downgraded ? (
        <p className="flex items-start gap-1.5 text-[11px] text-muted">
          <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" /> This CV uses a Premium design, so it goes out in the free Classic design. Go Premium to send it as designed.
        </p>
      ) : null}
    </div>
  );

  const uploadOption =
    job.easyApply ? (
      <div>
        <input ref={fileRef} type="file" accept={ACCEPT} className="sr-only" onChange={(e) => pickFile(e.target.files?.[0] ?? null)} />
        {choice?.kind === 'file' ? (
          <div className="flex items-center gap-2 rounded-xl border border-brand/40 bg-brand-soft px-3 py-2.5 text-sm">
            <FileUp className="h-4 w-4 shrink-0 text-brand" />
            <span className="min-w-0 flex-1 truncate text-foreground">{choice.file.name}</span>
            <button
              type="button"
              aria-label="Remove file"
              onClick={() => {
                setChoice(cvs[0] ? { kind: 'dealo', id: cvs[0].id } : null);
                if (fileRef.current) fileRef.current.value = '';
              }}
              className="text-muted hover:text-danger"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => fileRef.current?.click()} className="text-xs font-semibold text-brand hover:underline">
            Or upload a PDF / Word file instead
          </button>
        )}
      </div>
    ) : null;

  const success = (
    <motion.div key="done" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="py-6 text-center">
      <motion.span
        initial={{ scale: 0, rotate: -30 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 14, delay: 0.1 }}
        className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-full bg-brand-soft text-brand"
      >
        <CheckCircle2 className="h-8 w-8" />
      </motion.span>
      <h3 className="mt-4 font-display text-2xl text-foreground">{job.easyApply ? 'Application sent' : 'Saved to your applications'}</h3>
      <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
        {job.easyApply
          ? `${job.company} has your CV. We emailed you a copy. Good luck!`
          : `We'll keep ${job.title} in your list so you can follow up and track replies.`}
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        {me ? (
          <Link href="/dashboard/applications" className="btn-primary text-sm">
            My applications
          </Link>
        ) : null}
        <button type="button" className="btn-secondary text-sm" onClick={onClose}>
          Keep browsing
        </button>
      </div>
    </motion.div>
  );

  const alreadyApplied = tracked && !done;

  return (
    <FormModal
      open={open}
      onClose={onClose}
      icon={job.easyApply ? Zap : ArrowUpRight}
      title={job.easyApply ? 'Easy apply' : `Apply on ${job.source.name}`}
      description={`${job.title} · ${job.company}`}
      size="md"
      footer={
        done ? undefined : job.easyApply ? (
          <button type="button" className="btn-primary w-full" disabled={busy !== null} onClick={() => void sendEasyApply()}>
            {busy === 'send' ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Sending…
              </>
            ) : (
              <>
                <Send className="h-4 w-4" /> Send application
              </>
            )}
          </button>
        ) : (
          <button type="button" className="btn-primary w-full" disabled={busy !== null || (!opened && !tracked)} onClick={() => void markApplied()}>
            {busy === 'track' ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            {me ? "I've applied, track it" : 'Sign in to track this application'}
          </button>
        )
      }
    >
      <AnimatePresence mode="wait">
        {done ? (
          success
        ) : (
          <motion.div key="form" exit={{ opacity: 0 }} className="space-y-5">
            {alreadyApplied ? (
              <p className="rounded-2xl border border-brand/30 bg-brand-soft/50 p-3 text-xs text-foreground">
                You marked this job as applied on {new Date(tracked.appliedAt).toLocaleDateString()}.{' '}
                <Link href="/dashboard/applications" className="font-semibold text-brand underline">
                  See it in My applications
                </Link>
              </p>
            ) : null}

            {job.easyApply ? (
              <>
                <FormField label="Your CV" error={errors.cv}>
                  {cvPicker}
                  <div className="mt-2">{uploadOption}</div>
                </FormField>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField label="Full name" error={errors.name}>
                    <input className="input-field" autoComplete="name" maxLength={140} {...bind('name')} />
                  </FormField>
                  <FormField label="Email" error={errors.email}>
                    <input className="input-field" type="email" autoComplete="email" {...bind('email')} />
                  </FormField>
                  <FormField label="Phone" optional error={errors.phone}>
                    <input className="input-field" type="tel" autoComplete="tel" maxLength={30} placeholder="0803 000 0000" {...bind('phone')} />
                  </FormField>
                  <FormField label="Where you live" optional error={errors.location}>
                    <input className="input-field" autoComplete="address-level2" maxLength={140} placeholder="Ikeja, Lagos" {...bind('location')} />
                  </FormField>
                </div>
                <FormField label="Note to the employer" optional error={errors.coverNote} hint="Two or three lines on why you fit this job.">
                  <textarea className="input-field min-h-[5rem]" maxLength={3000} {...bind('coverNote')} />
                </FormField>
                <p className="text-[11px] leading-relaxed text-muted">
                  Your details go only to {job.company}. An AI helper may give their team a first summary of your CV; it never sees your name, age, gender or photo, and a person makes every decision.
                </p>
              </>
            ) : (
              <ol className="space-y-4">
                <Step n={1} title="Get your CV ready" done={busy === null && Boolean(selected)}>
                  {cvPicker}
                  {selected ? (
                    <button type="button" className="btn-secondary mt-2 text-sm" disabled={busy !== null} onClick={() => void downloadPdf()}>
                      {busy === 'pdf' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Download as PDF
                    </button>
                  ) : null}
                </Step>
                <Step n={2} title={`Apply on ${job.source.name}`} done={opened}>
                  <p className="text-xs text-muted">The application opens in a new tab. Attach your CV there.</p>
                  <a href={job.applyUrl} target="_blank" rel="noopener noreferrer" onClick={() => setOpened(true)} className="btn-primary mt-2 inline-flex text-sm">
                    Open application <ArrowUpRight className="h-4 w-4" />
                  </a>
                </Step>
                <Step n={3} title="Track it on Dealo" done={false}>
                  <p className="text-xs text-muted">Come back and tap the button below. We keep every job you apply for in one list.</p>
                </Step>
              </ol>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </FormModal>
  );
}

function Step({ n, title, done, children }: { n: number; title: string; done: boolean; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span
        className={cn(
          'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold',
          done ? 'bg-brand text-white dark:text-[#071f14]' : 'border border-border text-muted',
        )}
      >
        {done ? <CheckCircle2 className="h-4 w-4" /> : n}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <div className="mt-2">{children}</div>
      </div>
    </li>
  );
}
