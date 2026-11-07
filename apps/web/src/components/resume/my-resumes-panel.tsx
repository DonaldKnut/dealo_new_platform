'use client';

import { coverLetterDataSchema, resumeDataSchema, resumeStyleSchema } from '@dealo/shared';
import { motion } from 'framer-motion';
import { Copy, Crown, Download, FileText, Mail, MoreHorizontal, Pencil, Plus, Smartphone, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

import { DashHero } from '@/components/dashboard/dashboard-ui';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { useToast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api';
import { DRAFT_KEY, resumeApi, type ResumePlan, type SavedResume } from '@/lib/resume-api';

import { ResumePreview, type PreviewDoc } from './resume-preview';
import { PremiumSheet } from './resume-sheets';

function toDoc(r: SavedResume): PreviewDoc {
  const style = resumeStyleSchema.parse({ template: r.template, accentColor: r.accentColor, font: r.font });
  return r.kind === 'RESUME'
    ? { kind: 'RESUME', data: resumeDataSchema.parse(r.data), style }
    : { kind: 'COVER_LETTER', letter: coverLetterDataSchema.parse(r.data), style };
}

export function MyResumesPanel() {
  const toast = useToast();
  const [items, setItems] = useState<SavedResume[] | null>(null);
  const [plan, setPlan] = useState<ResumePlan | null>(null);
  const [menu, setMenu] = useState<SavedResume | null>(null);
  const [premiumOpen, setPremiumOpen] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);

  const load = useCallback(async () => {
    const [list, p] = await Promise.all([resumeApi.list(), resumeApi.plan()]);
    setItems(list);
    setPlan(p);
  }, []);

  useEffect(() => {
    void load().catch(() => setItems([]));
    setHasDraft(Boolean(window.localStorage.getItem(DRAFT_KEY)));
  }, [load]);

  const run = async (label: string, action: () => Promise<unknown>) => {
    setMenu(null);
    try {
      await action();
      toast.success(label);
      await load();
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) setPremiumOpen(true);
      else toast.error('That did not work', err instanceof ApiError ? err.message : '');
    }
  };

  const resumes = items?.filter((i) => i.kind === 'RESUME') ?? [];
  const canAddResume = plan ? plan.used.resumes < plan.limits.resumes : false;

  return (
    <div className="space-y-6">
      <DashHero
        eyebrow={plan?.premium ? 'CV builder · Premium' : 'CV builder · Free'}
        title="My CVs"
        subtitle="Make, edit and download your CVs and cover letters. Recruiters can find you when you share a CV with Dealo."
        actions={
          <>
            {canAddResume || !resumes.length ? (
              <Link href="/resume-builder/new" className="btn-primary text-sm">
                <Plus className="h-4 w-4" /> New CV
              </Link>
            ) : (
              <button type="button" className="btn-primary text-sm" onClick={() => setPremiumOpen(true)}>
                <Plus className="h-4 w-4" /> New CV
              </button>
            )}
            {plan?.premium ? (
              <Link href="/resume-builder/cover-letter/new" className="btn-secondary text-sm">
                <Mail className="h-4 w-4" /> Cover letter
              </Link>
            ) : (
              <button type="button" className="btn-secondary text-sm" onClick={() => setPremiumOpen(true)}>
                <Crown className="h-4 w-4 text-amber-500" /> Cover letter
              </button>
            )}
          </>
        }
      />

      {hasDraft ? (
        <Link
          href="/resume-builder/new"
          className="flex items-center gap-3 rounded-2xl border border-brand/40 bg-brand-soft/60 p-3 text-sm transition hover:border-brand"
        >
          <Smartphone className="h-5 w-5 shrink-0 text-brand" />
          <span className="min-w-0 flex-1">
            <span className="block font-semibold text-foreground">You have a CV on this device</span>
            <span className="block text-xs text-muted">Open it to save it to your account and download it.</span>
          </span>
        </Link>
      ) : null}

      {plan && !plan.premium ? (
        <button
          type="button"
          onClick={() => setPremiumOpen(true)}
          className="flex w-full items-center gap-3 rounded-2xl border border-amber-400/40 bg-gradient-to-r from-amber-300/15 to-brand/10 p-3 text-left"
        >
          <Crown className="h-5 w-5 shrink-0 text-amber-500" />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-foreground">
              {plan.used.resumes} of {plan.limits.resumes} free CV used
            </span>
            <span className="block text-xs text-muted">Premium: 20 CVs, cover letters, AI writing and 4 more templates.</span>
          </span>
        </button>
      ) : null}

      {items === null ? (
        <div className="grid grid-cols-1 gap-4 min-[400px]:grid-cols-2 xl:grid-cols-4">
          {[0, 1].map((i) => (
            <div key={i} className="aspect-[3/4] animate-pulse rounded-2xl bg-surface" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center">
          <FileText className="mx-auto h-8 w-8 text-muted" />
          <p className="mt-3 font-display text-xl text-foreground">No CVs yet</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted">It takes about ten minutes, and you can do it all on your phone.</p>
          <Link href="/resume-builder/new" className="btn-primary mt-4 inline-flex text-sm">
            <Plus className="h-4 w-4" /> Build my CV
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 min-[400px]:grid-cols-2 xl:grid-cols-4">
          {items.map((item, i) => (
            <motion.div key={item.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="group relative overflow-hidden rounded-2xl border border-border bg-surface-elevated shadow-sm transition hover:shadow-lg">
              <Link href={`/resume-builder/${item.id}`} className="block">
                <div className="max-h-72 overflow-hidden bg-slate-100/80 p-3 dark:bg-[#071f14]">
                  <div className="pointer-events-none overflow-hidden rounded-lg bg-white shadow-md ring-1 ring-slate-900/10">
                    <ResumePreview doc={toDoc(item)} branding={false} />
                  </div>
                </div>
              </Link>
              <div className="flex items-center gap-2 border-t border-border p-3">
                <Link href={`/resume-builder/${item.id}`} className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                    {item.kind === 'COVER_LETTER' ? <Mail className="h-3.5 w-3.5 shrink-0 text-brand" /> : <FileText className="h-3.5 w-3.5 shrink-0 text-brand" />}
                    <span className="truncate">{item.title}</span>
                  </span>
                  <span className="mt-0.5 flex items-center gap-2 text-[11px] text-muted">
                    <span>Edited {new Date(item.updatedAt).toLocaleDateString()}</span>
                    {item.downloadCount ? (
                      <span className="inline-flex items-center gap-0.5">
                        <Download className="h-3 w-3" /> {item.downloadCount}
                      </span>
                    ) : null}
                  </span>
                </Link>
                <button type="button" aria-label="More" onClick={() => setMenu(item)} className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border text-muted hover:text-brand">
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <BottomSheet open={Boolean(menu)} onClose={() => setMenu(null)} title={menu?.title}>
        {menu ? (
          <div className="grid gap-1 py-2">
            <Link href={`/resume-builder/${menu.id}`} className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium hover:bg-surface">
              <Pencil className="h-4 w-4 text-brand" /> Edit and download
            </Link>
            <button type="button" onClick={() => void run('Copy made', () => resumeApi.duplicate(menu.id))} className="flex items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium hover:bg-surface">
              <Copy className="h-4 w-4 text-brand" /> Make a copy
            </button>
            <button
              type="button"
              onClick={() => window.confirm(`Delete “${menu.title}”? This cannot be undone.`) && void run('Deleted', () => resumeApi.remove(menu.id))}
              className="flex items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium text-danger hover:bg-surface"
            >
              <Trash2 className="h-4 w-4" /> Delete
            </button>
          </div>
        ) : null}
      </BottomSheet>

      <PremiumSheet open={premiumOpen} onClose={() => setPremiumOpen(false)} />
    </div>
  );
}
