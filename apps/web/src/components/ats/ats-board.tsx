'use client';

import { AnimatePresence, LayoutGroup, motion } from 'framer-motion';
import { ArrowLeft, CheckSquare, Link2, Loader2, Mail, Pencil, Search, UserPlus, X, XCircle } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { ApplicantDrawer } from '@/components/ats/applicant-drawer';
import { ApplicationCardView } from '@/components/ats/application-card';
import { AddApplicantForm } from '@/components/ats/add-applicant-form';
import { useAtsWorkspace } from '@/components/ats/ats-workspace';
import { EmailComposeSheet } from '@/components/ats/email-compose-sheet';
import { StatusChip } from '@/components/dashboard/dashboard-ui';
import { BottomSheet, useCompactViewport } from '@/components/ui/bottom-sheet';
import { useToast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api';
import { atsApi, canManage, type ApplicationCard, type AtsJob, type WorkspaceRole } from '@/lib/ats-api';
import { cn } from '@/lib/utils';

type View = 'ACTIVE' | 'HIRED' | 'REJECTED';

export function AtsBoard({ jobId }: { jobId: string }) {
  const toast = useToast();
  const compact = useCompactViewport();
  const { orgId, current } = useAtsWorkspace();
  const [job, setJob] = useState<AtsJob | null>(null);
  const [role, setRole] = useState<WorkspaceRole | undefined>(current?.myRole);
  const [cards, setCards] = useState<ApplicationCard[] | null>(null);
  const [view, setView] = useState<View>('ACTIVE');
  const [query, setQuery] = useState('');
  const [mobileStage, setMobileStage] = useState<string | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [moveTarget, setMoveTarget] = useState<string[] | null>(null);
  const [rejectTarget, setRejectTarget] = useState<string[] | null>(null);
  const [emailTarget, setEmailTarget] = useState<string[] | null>(null);
  const [adding, setAdding] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const manage = canManage(role);

  const load = useCallback(async () => {
    if (!orgId) return;
    try {
      const data = await atsApi.board(orgId, jobId, view);
      setJob(data.job);
      setRole(data.myRole);
      setCards(data.applications);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load the board');
    }
  }, [orgId, jobId, view]);

  useEffect(() => {
    setCards(null);
    void load();
  }, [load]);

  // AI screening runs in the background after someone applies; refresh until scores land.
  useEffect(() => {
    if (!cards?.some((c) => c.aiScore === null)) return;
    const timer = window.setTimeout(() => void load(), 6000);
    return () => window.clearTimeout(timer);
  }, [cards, load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return cards ?? [];
    return (cards ?? []).filter(
      (c) => c.name.toLowerCase().includes(q) || c.email.includes(q) || c.tags.some((t) => t.includes(q)) || (c.location ?? '').toLowerCase().includes(q),
    );
  }, [cards, query]);

  const stages = job?.stages ?? [];
  const activeStage = mobileStage && stages.includes(mobileStage) ? mobileStage : stages[0];
  const byStage = (stage: string) => filtered.filter((c) => c.stage === stage);

  const move = async (ids: string[], stage: string) => {
    if (!orgId || !job) return;
    const isFinal = stage === stages[stages.length - 1];
    if (isFinal && !window.confirm(`Mark ${ids.length === 1 ? 'this person' : `${ids.length} people`} as hired?`)) return;
    const previous = cards;
    setCards((list) =>
      (list ?? [])
        .map((c) => (ids.includes(c.id) ? { ...c, stage, stageChangedAt: new Date().toISOString(), status: isFinal ? ('HIRED' as const) : c.status } : c))
        .filter((c) => view !== 'ACTIVE' || c.status === 'ACTIVE'),
    );
    setMoveTarget(null);
    setSelected(new Set());
    try {
      await atsApi.move(orgId, ids, stage);
      toast.success(isFinal ? 'Marked as hired' : `Moved to ${stage}`);
    } catch (err) {
      setCards(previous);
      toast.error('Could not move', err instanceof ApiError ? err.message : '');
    }
  };

  const reject = async (ids: string[], notify: boolean, reason: string) => {
    if (!orgId) return;
    setRejectTarget(null);
    setSelected(new Set());
    setCards((list) => (list ?? []).filter((c) => !ids.includes(c.id)));
    try {
      await atsApi.reject(orgId, ids, notify, reason || undefined);
      toast.success(notify ? 'Rejected and emailed' : 'Rejected');
    } catch (err) {
      toast.error('Could not reject', err instanceof ApiError ? err.message : '');
      void load();
    }
  };

  const toggle = (id: string) =>
    setSelected((set) => {
      const next = new Set(set);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const selectAll = (list: ApplicationCard[]) =>
    setSelected((set) => {
      const next = new Set(set);
      const allIn = list.every((c) => next.has(c.id));
      for (const c of list) {
        if (allIn) next.delete(c.id);
        else next.add(c.id);
      }
      return next;
    });

  const copyLink = async () => {
    if (!job || !current) return;
    await navigator.clipboard.writeText(`${window.location.origin}/careers/${current.workspace.slug}/${job.slug}`).catch(() => undefined);
    toast.success('Apply link copied');
  };

  if (error) return <p className="text-sm text-danger">{error}</p>;
  if (!job || !cards) {
    return (
      <div className="flex min-h-[30vh] items-center justify-center text-muted">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  const renderCard = (card: ApplicationCard) => (
    <ApplicationCardView
      key={card.id}
      card={card}
      selected={selected.has(card.id)}
      selectMode={selectMode}
      draggable={manage && !compact && !selectMode && view === 'ACTIVE'}
      onOpen={() => setOpenId(card.id)}
      onToggle={() => toggle(card.id)}
      onMove={manage && view === 'ACTIVE' ? () => setMoveTarget([card.id]) : undefined}
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', card.id);
        e.dataTransfer.effectAllowed = 'move';
      }}
    />
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3">
        <Link href="/dashboard/ats" className="inline-flex w-fit items-center gap-1 text-sm text-muted hover:text-brand">
          <ArrowLeft className="h-4 w-4" /> All jobs
        </Link>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="break-words font-display text-2xl text-foreground min-[340px]:text-3xl">{job.title}</h1>
              <StatusChip status={job.status} />
            </div>
            <p className="mt-1 text-sm text-muted">
              {job.location} · {cards.length} {view === 'ACTIVE' ? 'in progress' : view.toLowerCase()}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {job.status === 'OPEN' ? (
              <button type="button" onClick={copyLink} className="btn-secondary flex-1 text-sm sm:flex-none">
                <Link2 className="h-4 w-4" /> Apply link
              </button>
            ) : null}
            {manage ? (
              <>
                <Link href={`/dashboard/ats/jobs/${job.id}/edit`} className="btn-secondary flex-1 text-sm sm:flex-none">
                  <Pencil className="h-4 w-4" /> Edit
                </Link>
                <button type="button" onClick={() => setAdding(true)} className="btn-primary flex-1 text-sm sm:flex-none">
                  <UserPlus className="h-4 w-4" /> Add person
                </button>
              </>
            ) : null}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            className="input-field pl-9"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, email, tag"
          />
        </div>
        <div className="flex gap-1 overflow-x-auto">
          {(['ACTIVE', 'HIRED', 'REJECTED'] as View[]).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => {
                setView(v);
                setSelected(new Set());
              }}
              className={cn(
                'shrink-0 rounded-full border px-3 py-2 text-xs font-semibold transition',
                view === v ? 'border-brand bg-brand-soft text-brand' : 'border-border text-muted hover:text-foreground',
              )}
            >
              {v === 'ACTIVE' ? 'In progress' : v === 'HIRED' ? 'Hired' : 'Rejected'}
            </button>
          ))}
          {manage && view === 'ACTIVE' ? (
            <button
              type="button"
              onClick={() => {
                setSelectMode((s) => !s);
                setSelected(new Set());
              }}
              className={cn(
                'inline-flex shrink-0 items-center gap-1 rounded-full border px-3 py-2 text-xs font-semibold transition',
                selectMode ? 'border-brand bg-brand text-white dark:text-[#071f14]' : 'border-border text-muted hover:text-foreground',
              )}
            >
              <CheckSquare className="h-3.5 w-3.5" /> Select
            </button>
          ) : null}
        </div>
      </div>

      {view !== 'ACTIVE' ? (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence>{filtered.map(renderCard)}</AnimatePresence>
          {!filtered.length ? <p className="text-sm text-muted">Nobody here yet.</p> : null}
        </div>
      ) : compact ? (
        <div className="space-y-3">
          <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
            {stages.map((stage) => (
              <button
                key={stage}
                type="button"
                onClick={() => setMobileStage(stage)}
                className={cn(
                  'relative shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold',
                  stage === activeStage ? 'text-white dark:text-[#071f14]' : 'border border-border text-muted',
                )}
              >
                {stage === activeStage ? (
                  <motion.span layoutId="ats-mobile-stage" className="absolute inset-0 rounded-full bg-brand" />
                ) : null}
                <span className="relative z-10">
                  {stage} <span className="tabular-nums opacity-80">{byStage(stage).length}</span>
                </span>
              </button>
            ))}
          </div>
          <div className="space-y-2">
            {selectMode && byStage(activeStage ?? '').length ? (
              <button type="button" onClick={() => selectAll(byStage(activeStage ?? ''))} className="text-xs font-semibold text-brand">
                Select everyone in {activeStage}
              </button>
            ) : null}
            <AnimatePresence mode="popLayout">{byStage(activeStage ?? '').map(renderCard)}</AnimatePresence>
            {!byStage(activeStage ?? '').length ? <p className="py-6 text-center text-sm text-muted">Nobody in {activeStage} yet.</p> : null}
          </div>
        </div>
      ) : (
        <LayoutGroup>
          <div className="-mx-2 flex gap-3 overflow-x-auto px-2 pb-3">
            {stages.map((stage, index) => {
              const list = byStage(stage);
              const final = index === stages.length - 1;
              return (
                <section
                  key={stage}
                  onDragOver={(e) => {
                    if (!manage) return;
                    e.preventDefault();
                    setDragOver(stage);
                  }}
                  onDragLeave={() => setDragOver((s) => (s === stage ? null : s))}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOver(null);
                    const id = e.dataTransfer.getData('text/plain');
                    const card = cards.find((c) => c.id === id);
                    if (card && card.stage !== stage) void move([id], stage);
                  }}
                  className={cn(
                    'flex w-[16.5rem] shrink-0 flex-col rounded-2xl border bg-surface/50 p-2 transition-colors',
                    dragOver === stage ? 'border-brand bg-brand-soft/50' : 'border-border',
                  )}
                >
                  <header className="flex items-center justify-between px-1.5 pb-2 pt-1">
                    <h2 className={cn('text-xs font-semibold uppercase tracking-[0.12em]', final ? 'text-brand' : 'text-muted')}>{stage}</h2>
                    <span className="flex items-center gap-1.5">
                      {selectMode && list.length ? (
                        <button type="button" onClick={() => selectAll(list)} className="text-[11px] font-semibold text-brand">
                          All
                        </button>
                      ) : null}
                      <span className="rounded-full bg-surface-elevated px-2 py-0.5 text-[11px] font-semibold tabular-nums text-foreground">{list.length}</span>
                    </span>
                  </header>
                  <div className="flex min-h-[8rem] flex-1 flex-col gap-2">
                    <AnimatePresence mode="popLayout">{list.map(renderCard)}</AnimatePresence>
                    {!list.length ? (
                      <p className="m-auto px-2 py-6 text-center text-[11px] text-muted">{manage ? 'Drag people here' : 'Empty'}</p>
                    ) : null}
                  </div>
                </section>
              );
            })}
          </div>
        </LayoutGroup>
      )}

      <AnimatePresence>
        {selectMode && selected.size ? (
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            className="fixed inset-x-2 bottom-[calc(4.75rem+var(--safe-bottom))] z-40 mx-auto flex max-w-xl flex-wrap items-center gap-2 rounded-2xl border border-border bg-surface-elevated p-2 shadow-xl lg:bottom-6"
          >
            <span className="px-2 text-sm font-semibold text-foreground">{selected.size} selected</span>
            <span className="flex-1" />
            <button type="button" className="btn-secondary px-3 py-2 text-xs" onClick={() => setMoveTarget([...selected])}>
              Move to…
            </button>
            <button type="button" className="btn-secondary px-3 py-2 text-xs" onClick={() => setEmailTarget([...selected])}>
              <Mail className="h-3.5 w-3.5" /> Email
            </button>
            <button type="button" className="btn-secondary px-3 py-2 text-xs text-danger" onClick={() => setRejectTarget([...selected])}>
              <XCircle className="h-3.5 w-3.5" /> Reject
            </button>
            <button type="button" aria-label="Clear selection" className="p-2 text-muted" onClick={() => setSelected(new Set())}>
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <BottomSheet open={Boolean(moveTarget)} onClose={() => setMoveTarget(null)} title="Move to">
        <div className="grid gap-1 py-2">
          {stages.map((stage) => (
            <button
              key={stage}
              type="button"
              onClick={() => moveTarget && void move(moveTarget, stage)}
              className="flex items-center justify-between rounded-xl px-3 py-3 text-left text-sm font-medium text-foreground transition hover:bg-surface"
            >
              {stage}
              <span className="text-xs text-muted">{byStage(stage).length}</span>
            </button>
          ))}
          {moveTarget ? (
            <button
              type="button"
              onClick={() => {
                setRejectTarget(moveTarget);
                setMoveTarget(null);
              }}
              className="mt-1 flex items-center gap-2 rounded-xl border-t border-border px-3 py-3 text-left text-sm font-medium text-danger hover:bg-surface"
            >
              <XCircle className="h-4 w-4" /> Reject
            </button>
          ) : null}
        </div>
      </BottomSheet>

      <RejectSheet target={rejectTarget} onClose={() => setRejectTarget(null)} onConfirm={reject} />

      {orgId ? (
        <EmailComposeSheet
          orgId={orgId}
          applicationIds={emailTarget}
          onClose={() => setEmailTarget(null)}
          onSent={() => {
            setSelected(new Set());
            setSelectMode(false);
          }}
        />
      ) : null}

      <BottomSheet open={adding} onClose={() => setAdding(false)} title="Add a person to this job">
        {orgId ? (
          <AddApplicantForm
            orgId={orgId}
            jobId={job.id}
            onAdded={() => {
              setAdding(false);
              void load();
            }}
          />
        ) : null}
      </BottomSheet>

      {orgId ? (
        <ApplicantDrawer
          orgId={orgId}
          applicationId={openId}
          onClose={() => setOpenId(null)}
          onChanged={() => void load()}
        />
      ) : null}
    </div>
  );
}

function RejectSheet({
  target,
  onClose,
  onConfirm,
}: {
  target: string[] | null;
  onClose: () => void;
  onConfirm: (ids: string[], notify: boolean, reason: string) => void;
}) {
  const [notify, setNotify] = useState(true);
  const [reason, setReason] = useState('');
  useEffect(() => {
    if (target) {
      setNotify(true);
      setReason('');
    }
  }, [target]);
  return (
    <BottomSheet open={Boolean(target)} onClose={onClose} title={`Reject ${target?.length === 1 ? 'this person' : `${target?.length ?? 0} people`}`}>
      <div className="space-y-3 py-2">
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} className="mt-1 accent-[var(--brand)]" />
          <span>
            Send a polite email
            <span className="block text-xs text-muted">Thanks them and says you will not move forward. People appreciate hearing back.</span>
          </span>
        </label>
        {notify ? (
          <textarea
            className="input-field min-h-[5rem]"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={500}
            placeholder="Optional extra line, e.g. 'We chose someone with more site experience.'"
          />
        ) : null}
        <button type="button" className="btn-primary w-full" onClick={() => target && onConfirm(target, notify, reason)}>
          Reject
        </button>
      </div>
    </BottomSheet>
  );
}
