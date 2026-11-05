'use client';

import { resumeDataSchema, type CoverLetterData, type ResumeData } from '@dealo/shared';
import { Loader2, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';

import { useToast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api';
import { DRAFT_KEY, resumeApi, type SavedResume } from '@/lib/resume-api';

import { AreaField, PremiumBadge, TextField } from './editor-parts';

export function CoverLetterEditor({
  letter,
  onChange,
  premium,
  signedIn,
  onLocked,
}: {
  letter: CoverLetterData;
  onChange: (l: CoverLetterData) => void;
  premium: boolean;
  signedIn: boolean;
  onLocked: () => void;
}) {
  const toast = useToast();
  const set = (key: keyof CoverLetterData) => (v: string) => onChange({ ...letter, [key]: v });
  const [cvs, setCvs] = useState<SavedResume[]>([]);
  const [cvId, setCvId] = useState('local');
  const [advert, setAdvert] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!signedIn) return;
    resumeApi
      .list()
      .then((list) => {
        const resumes = list.filter((r) => r.kind === 'RESUME');
        setCvs(resumes);
        if (resumes[0]) setCvId(resumes[0].id);
      })
      .catch(() => undefined);
  }, [signedIn]);

  const sourceCv = (): ResumeData | null => {
    if (cvId !== 'local') {
      const found = cvs.find((c) => c.id === cvId);
      return found ? resumeDataSchema.parse(found.data) : null;
    }
    try {
      const raw = window.localStorage.getItem(DRAFT_KEY);
      return raw ? resumeDataSchema.parse((JSON.parse(raw) as { data: unknown }).data) : null;
    } catch {
      return null;
    }
  };

  const write = async () => {
    if (!premium) {
      onLocked();
      return;
    }
    const cv = sourceCv();
    if (!cv) {
      toast.error('No CV found', 'Make a CV first so we have something to write from.');
      return;
    }
    if (letter.jobTitle.trim().length < 2 || letter.company.trim().length < 2) {
      toast.error('Add the job title and company first');
      return;
    }
    setBusy(true);
    try {
      const { body } = await resumeApi.aiCoverLetter(cv, letter.jobTitle, letter.company, advert);
      onChange({
        ...letter,
        body,
        fullName: letter.fullName || cv.personal.fullName,
        email: letter.email || cv.personal.email,
        phone: letter.phone || cv.personal.phone,
        location: letter.location || cv.personal.location,
      });
      toast.success('First draft ready', 'Read it and make it sound like you.');
    } catch (err) {
      toast.error('Could not write it', err instanceof ApiError ? err.message : '');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <TextField label="Your name" value={letter.fullName} onChange={set('fullName')} maxLength={120} />
        </div>
        <TextField label="Email" value={letter.email} onChange={set('email')} maxLength={200} />
        <TextField label="Phone" value={letter.phone} onChange={set('phone')} maxLength={40} />
        <TextField label="Where you live" value={letter.location} onChange={set('location')} />
        <TextField label="Date" value={letter.date} onChange={set('date')} placeholder="5 November 2026" maxLength={40} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField label="Job title" value={letter.jobTitle} onChange={set('jobTitle')} placeholder="Site supervisor" />
        <TextField label="Company" value={letter.company} onChange={set('company')} placeholder="Brightline Construction" />
        <div className="sm:col-span-2">
          <TextField label="Send to (optional)" value={letter.recipient} onChange={set('recipient')} placeholder="The Hiring Manager" />
        </div>
      </div>

      <div className="space-y-3 rounded-2xl border border-brand/30 bg-gradient-to-br from-brand-soft to-amber-400/10 p-3">
        <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-foreground">
          <Sparkles className="h-4 w-4 text-brand" /> Write it from my CV {!premium ? <PremiumBadge /> : null}
        </p>
        <label className="block space-y-1.5 text-sm">
          <span className="font-medium text-foreground">Use this CV</span>
          <select className="input-field" value={cvId} onChange={(e) => setCvId(e.target.value)}>
            {cvs.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
            <option value="local">CV on this device</option>
          </select>
        </label>
        <textarea className="input-field min-h-[6rem] text-sm" value={advert} onChange={(e) => setAdvert(e.target.value)} placeholder="Paste the job advert (optional, but it helps)" maxLength={8000} />
        <button type="button" className="btn-primary w-full text-sm" disabled={busy} onClick={write}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} {busy ? 'Writing…' : 'Write a first draft'}
        </button>
      </div>

      <AreaField
        label="Letter"
        value={letter.body}
        onChange={set('body')}
        rows={14}
        maxLength={6000}
        placeholder={'Dear Hiring Manager,\n\nI am writing to apply for…\n\nYours sincerely,'}
      />
    </div>
  );
}
