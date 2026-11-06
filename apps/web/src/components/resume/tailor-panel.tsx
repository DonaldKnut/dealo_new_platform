'use client';

import type { ResumeAiTailorResult, ResumeData } from '@dealo/shared';
import { Check, Loader2, Target } from 'lucide-react';
import { useState } from 'react';

import { useToast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api';
import { resumeApi } from '@/lib/resume-api';

import { PremiumBadge } from './editor-parts';
import type { Update } from './section-editors';

export function TailorPanel({
  data,
  update,
  premium,
  onLocked,
  initialAdvert = '',
}: {
  data: ResumeData;
  update: Update;
  premium: boolean;
  onLocked: () => void;
  /** Prefilled when the person came from a job on the Dealo job board. */
  initialAdvert?: string;
}) {
  const toast = useToast();
  const [advert, setAdvert] = useState(initialAdvert);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<(ResumeAiTailorResult & { provider: string }) | null>(null);
  const [applied, setApplied] = useState<string[]>([]);

  const run = async () => {
    if (!premium) {
      onLocked();
      return;
    }
    setBusy(true);
    try {
      setResult(await resumeApi.aiTailor(data, advert));
      setApplied([]);
    } catch (err) {
      toast.error('Could not check', err instanceof ApiError ? err.message : '');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-brand/30 bg-gradient-to-br from-brand-soft to-amber-400/10 p-3">
        <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-foreground">
          <Target className="h-4 w-4 text-brand" /> Fit your CV to a job {!premium ? <PremiumBadge /> : null}
        </p>
        <p className="mt-1 text-xs text-muted">Paste the job advert. We show which words are missing and write a profile aimed at that job, using only what is true in your CV.</p>
      </div>
      <textarea
        className="input-field min-h-[9rem] resize-y text-sm"
        value={advert}
        onChange={(e) => setAdvert(e.target.value)}
        placeholder="Paste the job advert here…"
        maxLength={8000}
      />
      <button type="button" className="btn-primary w-full text-sm" disabled={busy || advert.trim().length < 30} onClick={run}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Target className="h-4 w-4" />} {busy ? 'Checking…' : 'Check my CV against this job'}
      </button>

      {result ? (
        <div className="space-y-4">
          {result.missingKeywords.length ? (
            <div>
              <p className="mb-1.5 text-xs font-semibold text-foreground">Words in the advert your CV does not use</p>
              <div className="flex flex-wrap gap-1.5">
                {result.missingKeywords.map((k) => (
                  <span key={k} className="rounded-full bg-amber-400/20 px-2 py-0.5 text-xs text-amber-800 dark:text-amber-200">
                    {k}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
          {result.skillsToAdd.length ? (
            <div>
              <p className="mb-1.5 text-xs font-semibold text-foreground">Skills you could add (only if true)</p>
              <div className="flex flex-wrap gap-1.5">
                {result.skillsToAdd.map((s) => {
                  const done = applied.includes(s) || data.skills.includes(s);
                  return (
                    <button
                      key={s}
                      type="button"
                      disabled={done}
                      onClick={() => {
                        update((d) => ({ ...d, skills: [...d.skills, s].slice(0, 40) }));
                        setApplied((a) => [...a, s]);
                      }}
                      className="inline-flex items-center gap-1 rounded-full border border-brand/40 px-2 py-0.5 text-xs text-brand disabled:opacity-50"
                    >
                      {done ? <Check className="h-3 w-3" /> : '+'} {s}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
          <div className="rounded-2xl border border-border p-3">
            <p className="text-xs font-semibold text-foreground">Profile written for this job</p>
            <p className="mt-1 text-sm leading-relaxed text-foreground">{result.summary}</p>
            <button
              type="button"
              className="mt-2 text-xs font-semibold text-brand"
              onClick={() => {
                update((d) => ({ ...d, summary: result.summary }));
                toast.success('Profile updated');
              }}
            >
              Use this profile
            </button>
          </div>
          {result.tips.length ? (
            <ul className="space-y-1 text-xs text-muted">
              {result.tips.map((t) => (
                <li key={t}>• {t}</li>
              ))}
            </ul>
          ) : null}
          <p className="text-[10px] text-muted">{result.provider === 'gemini' ? 'Written by Gemini AI.' : 'Checked with built-in rules.'} Always read it before you send.</p>
        </div>
      ) : null}
    </div>
  );
}
