'use client';

import { motion } from 'framer-motion';
import { CalendarClock, Loader2, MapPin, UserRound } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { ApplicantDrawer } from '@/components/ats/applicant-drawer';
import { useAtsWorkspace } from '@/components/ats/ats-workspace';
import { DashPanel } from '@/components/dashboard/dashboard-ui';
import { KIND_LABEL, atsApi, whenLabel, type InterviewListItem } from '@/lib/ats-api';
import { cn } from '@/lib/utils';

const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();

export function AtsInterviewsPanel() {
  const { orgId } = useAtsWorkspace();
  const [items, setItems] = useState<InterviewListItem[] | null>(null);
  const [onlyMine, setOnlyMine] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!orgId) return;
    setItems(await atsApi.interviews(orgId).catch(() => []));
  }, [orgId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!items) {
    return (
      <div className="flex min-h-[30vh] items-center justify-center text-muted">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  const now = new Date();
  const list = onlyMine ? items.filter((i) => i.mine) : items;
  const groups = [
    { title: 'Today', items: list.filter((i) => i.status === 'SCHEDULED' && i.startsAt && sameDay(new Date(i.startsAt), now)) },
    {
      title: 'Coming up',
      items: list.filter((i) => i.status === 'SCHEDULED' && i.startsAt && new Date(i.startsAt) > now && !sameDay(new Date(i.startsAt), now)),
    },
    { title: 'Waiting for the candidate to pick a time', items: list.filter((i) => i.status === 'PROPOSED') },
    {
      title: 'Recent',
      items: list
        .filter((i) => i.status === 'COMPLETED' || (i.status === 'SCHEDULED' && i.startsAt && new Date(i.startsAt) < now && !sameDay(new Date(i.startsAt), now)))
        .reverse(),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted">{items.filter((i) => i.status === 'SCHEDULED' && i.startsAt && new Date(i.startsAt) > now).length} upcoming</p>
        <label className="inline-flex items-center gap-2 text-sm">
          <input type="checkbox" checked={onlyMine} onChange={(e) => setOnlyMine(e.target.checked)} className="accent-[var(--brand)]" />
          Only mine
        </label>
      </div>
      {list.length === 0 ? (
        <DashPanel>
          <div className="py-6 text-center">
            <CalendarClock className="mx-auto h-6 w-6 text-muted" />
            <p className="mt-2 font-display text-lg text-foreground">No interviews yet</p>
            <p className="mt-1 text-sm text-muted">Open a person on a job board and choose Interviews to send times.</p>
          </div>
        </DashPanel>
      ) : null}
      {groups.map((group) =>
        group.items.length ? (
          <section key={group.title}>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted">{group.title}</h2>
            <ul className="grid gap-2 md:grid-cols-2">
              {group.items.map((item, index) => (
                <motion.li key={item.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.03 }}>
                  <button
                    type="button"
                    onClick={() => setOpenId(item.applicant.id)}
                    className={cn(
                      'flex w-full flex-col gap-1 rounded-2xl border bg-surface-elevated p-3 text-left transition hover:border-brand/50',
                      item.mine ? 'border-brand/40' : 'border-border',
                    )}
                  >
                    <span className="flex flex-wrap items-center justify-between gap-1">
                      <span className="text-sm font-semibold text-foreground">
                        {item.startsAt ? whenLabel(item.startsAt) : `${item.slotOptions.length} times offered`}
                      </span>
                      <span className="text-[11px] text-muted">
                        {KIND_LABEL[item.kind]} · {item.durationMin} min
                      </span>
                    </span>
                    <span className="flex min-w-0 items-center gap-1.5 text-sm text-foreground">
                      <UserRound className="h-3.5 w-3.5 shrink-0 text-brand" />
                      <span className="truncate">{item.applicant.name}</span>
                    </span>
                    <span className="truncate text-xs text-muted">{item.applicant.jobTitle}</span>
                    {item.location ? (
                      <span className="flex min-w-0 items-center gap-1 text-xs text-muted">
                        <MapPin className="h-3 w-3 shrink-0" />
                        <span className="truncate">{item.location}</span>
                      </span>
                    ) : null}
                    {item.interviewers.length ? <span className="truncate text-[11px] text-muted">With {item.interviewers.join(', ')}</span> : null}
                  </button>
                </motion.li>
              ))}
            </ul>
          </section>
        ) : null,
      )}
      {orgId ? <ApplicantDrawer orgId={orgId} applicationId={openId} onClose={() => setOpenId(null)} onChanged={() => void load()} /> : null}
    </div>
  );
}
