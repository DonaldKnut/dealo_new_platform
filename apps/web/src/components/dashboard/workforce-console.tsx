'use client';

import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle,
  ArrowLeft,
  BadgeCheck,
  Bot,
  CheckCircle2,
  Clock3,
  Loader2,
  LogOut,
  MapPin,
  MessageSquarePlus,
  Phone,
  Plus,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Timer,
  UserCheck,
  UserPlus,
  Users,
  UserX,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { DashPanel } from '@/components/dashboard/dashboard-ui';
import { useToast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api';
import { AiReviewBar } from '@/components/ai/ai-review-bar';
import {
  addSiteNote,
  addSitePlacement,
  aiOpsBrief,
  assignCover,
  type AiOpsBrief,
  fetchAuthMe,
  fetchSiteConsole,
  fetchStaffTalentProfiles,
  runSiteMuster,
  updatePlacement,
  type OpsFeedEvent,
  type RosterStatus,
  type SiteConsole,
  type StaffTalentRow,
} from '@/lib/dashboard-api';
import { cn } from '@/lib/utils';

const REFRESH_MS = 15_000;

const STATUS_STYLE: Record<RosterStatus, { label: string; className: string; icon: LucideIcon }> = {
  ON_SITE: { label: 'On site', className: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300', icon: UserCheck },
  LATE: { label: 'Late', className: 'bg-amber-500/15 text-amber-600 dark:text-amber-300', icon: Clock3 },
  CHECKED_OUT: { label: 'Checked out', className: 'bg-surface text-muted', icon: LogOut },
  EXPECTED: { label: 'Expected', className: 'bg-surface text-muted', icon: Timer },
  NO_SHOW: { label: 'No-show', className: 'bg-red-500/15 text-red-600 dark:text-red-300', icon: UserX },
  STANDBY: { label: 'Standby', className: 'bg-brand-soft text-brand', icon: ShieldCheck },
  COVERING: { label: 'Covering', className: 'bg-brand-soft text-brand', icon: BadgeCheck },
};

const FEED_DOT: Record<OpsFeedEvent['severity'], string> = {
  info: 'bg-sky-400',
  success: 'bg-emerald-400',
  warn: 'bg-amber-400',
  critical: 'bg-red-500',
};

const ROLE_LABEL: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Admin',
  OPERATIONS: 'Ops Lead',
  RECRUITER: 'Recruiter',
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

function timeAt(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function countdown(minutes: number) {
  if (minutes <= 0) return 'Overdue';
  if (minutes < 60) return `${minutes}m left`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m left`;
}

function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.06] px-3 py-3 backdrop-blur-md">
      <p className="truncate text-[10px] font-semibold uppercase tracking-[0.14em] text-white/60">{label}</p>
      <p className="mt-1 truncate font-display text-xl font-semibold text-white min-[340px]:text-2xl">{value}</p>
      {hint ? <p className="truncate text-[10px] text-white/55">{hint}</p> : null}
    </div>
  );
}

export function WorkforceConsole({ siteId }: { siteId: string }) {
  const toast = useToast();
  const [data, setData] = useState<SiteConsole | null>(null);
  const [reviewer, setReviewer] = useState<string>('');
  const [refreshing, setRefreshing] = useState(false);
  const [musterBusy, setMusterBusy] = useState(false);
  const [note, setNote] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [people, setPeople] = useState<StaffTalentRow[] | null>(null);
  const [newPlacement, setNewPlacement] = useState({ candidateId: '', roleTitle: '', isStandby: false });
  const [coverPick, setCoverPick] = useState<Record<string, string>>({});
  const [brief, setBrief] = useState<AiOpsBrief | null>(null);
  const [briefBusy, setBriefBusy] = useState(false);

  const onBrief = async () => {
    setBriefBusy(true);
    try {
      setBrief(await aiOpsBrief(siteId));
    } catch (error) {
      toast.error('AI brief failed', error instanceof ApiError ? error.message : undefined);
    } finally {
      setBriefBusy(false);
    }
  };

  const fail = useCallback(
    (title: string, error: unknown) => toast.error(title, error instanceof ApiError ? error.message : undefined),
    [toast],
  );

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      setData(await fetchSiteConsole(siteId));
    } catch (error) {
      fail('Could not load the console', error);
    } finally {
      setRefreshing(false);
    }
  }, [siteId, fail]);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void load();
    }, REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [load]);

  useEffect(() => {
    fetchAuthMe()
      .then((me) => {
        const name = `${me.firstName} ${me.lastName?.[0] ? `${me.lastName[0]}.` : ''}`.trim() || me.email;
        const role = me.roles.map((r) => ROLE_LABEL[r]).find(Boolean) ?? 'Staff';
        setReviewer(`${name} (${role})`);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!showAdd || people) return;
    fetchStaffTalentProfiles({})
      .then(setPeople)
      .catch((error) => fail('Could not load professionals', error));
  }, [showAdd, people, fail]);

  const freeStandby = useMemo(
    () => data?.roster.filter((row) => row.isStandby && row.status === 'STANDBY') ?? [],
    [data],
  );
  const onSite = data?.roster.filter((row) => row.status === 'ON_SITE' || row.status === 'LATE') ?? [];

  const onMuster = async () => {
    setMusterBusy(true);
    try {
      const result = await runSiteMuster(siteId);
      if (result.skipped) toast.info(result.skipped);
      else toast.success(result.noShows ? `${result.noShows} no-show(s) found, cover opened` : 'Full crew confirmed');
      await load();
    } catch (error) {
      fail('Muster failed', error);
    } finally {
      setMusterBusy(false);
    }
  };

  const onAssign = async (coverId: string) => {
    const standbyId = coverPick[coverId] ?? freeStandby[0]?.placementId;
    if (!standbyId) {
      toast.error('No free standby worker. Add one to this site first.');
      return;
    }
    try {
      await assignCover(coverId, standbyId);
      toast.success('Standby sent to cover');
      await load();
    } catch (error) {
      fail('Could not assign cover', error);
    }
  };

  const onAddPlacement = async () => {
    if (!newPlacement.candidateId || newPlacement.roleTitle.trim().length < 2) {
      toast.error('Pick a professional and enter their role');
      return;
    }
    try {
      await addSitePlacement(siteId, newPlacement);
      toast.success(newPlacement.isStandby ? 'Standby worker added' : 'Worker added to the crew');
      setNewPlacement({ candidateId: '', roleTitle: '', isStandby: false });
      setShowAdd(false);
      await load();
    } catch (error) {
      fail('Could not add worker', error);
    }
  };

  const onNote = async () => {
    if (note.trim().length < 2) return;
    try {
      await addSiteNote(siteId, note.trim());
      setNote('');
      await load();
    } catch (error) {
      fail('Could not save note', error);
    }
  };

  const onEnd = async (placementId: string) => {
    try {
      await updatePlacement(placementId, { ended: true });
      toast.success('Placement ended');
      await load();
    } catch (error) {
      fail('Could not end placement', error);
    }
  };

  if (!data) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading console…
      </p>
    );
  }

  const { site, metrics, clock } = data;
  const placed = people?.filter((p) => !data.roster.some((row) => row.candidateId === p.id)) ?? [];

  return (
    <div className="space-y-5">
      <Link href="/dashboard/workforce" className="link-anim text-sm text-muted">
        <ArrowLeft className="h-4 w-4" /> All sites
      </Link>

      {/* Agent header — the "live" card */}
      <section className="relative overflow-hidden rounded-[1.5rem] border border-[#1e4a30] bg-[linear-gradient(150deg,#0b3324,#071f14_55%,#0a2a1b)] p-3 text-white shadow-[0_30px_70px_-30px_rgba(4,47,46,0.8)] min-[340px]:p-5 sm:p-6">
        <div aria-hidden className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(124,255,77,0.18),transparent_65%)]" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <span className="relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#7cff4d] text-[#071f14]">
              <Bot className="h-5 w-5" />
              <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-[#071f14] bg-emerald-400" />
            </span>
            <div className="min-w-0">
              <p className="flex flex-wrap items-center gap-2 font-semibold">
                Placement agent
                <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-white/70">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  </span>
                  Live activity
                </span>
              </p>
              <p className="text-xs text-white/65">Keeps hires on track after day one</p>
            </div>
          </div>
          <div className="flex flex-col items-start gap-1 sm:items-end">
            <span className="inline-flex items-center gap-1 rounded-full border border-[#7cff4d]/40 bg-[#7cff4d]/10 px-2.5 py-1 text-[11px] font-semibold text-[#a8ff70]">
              <BadgeCheck className="h-3.5 w-3.5" /> Human-reviewed
            </span>
            {reviewer ? <p className="text-[11px] text-white/60">Reviewer: {reviewer}</p> : null}
          </div>
        </div>

        <div className="relative mt-5 flex flex-wrap items-center gap-3">
          <div className="flex -space-x-2">
            {onSite.slice(0, 4).map((row) => (
              <span
                key={row.placementId}
                title={row.name}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#071f14] bg-[#123825] text-[10px] font-bold text-[#a8ff70]"
              >
                {initials(row.name)}
              </span>
            ))}
            {onSite.length > 4 ? (
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#071f14] bg-white/10 text-[10px] font-bold">
                +{onSite.length - 4}
              </span>
            ) : null}
            {onSite.length === 0 ? <span className="text-xs text-white/50">Nobody on site yet</span> : null}
          </div>
          <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold">
            Standby · {metrics.standbyActive}
          </span>
        </div>

        <div className="relative mt-4">
          <p className="font-display text-xl font-semibold min-[340px]:text-2xl">{site.name}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px]">
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/15 px-2 py-0.5 font-semibold text-emerald-300">
              <ShieldCheck className="h-3 w-3" /> Geofence locked ({site.radiusMeters}m)
            </span>
            {site.address ? (
              <span className="inline-flex items-center gap-1 text-white/60">
                <MapPin className="h-3 w-3" /> {site.address}
              </span>
            ) : null}
            <span className="text-white/60">
              {clock.now} {clock.zone} · shift {site.shiftStart}–{site.shiftEnd}
            </span>
          </div>
          <p className="mt-2 max-w-2xl text-xs leading-relaxed text-white/65">
            Live check-ins from inside the fence, a morning muster after {site.graceMinutes} minutes of grace, and
            standby cover sent before work stops.
          </p>
        </div>

        <div className="relative mt-5 grid grid-cols-2 gap-2 lg:grid-cols-4">
          <Kpi
            label="Attendance"
            value={metrics.attendanceRate === null ? '—' : `${metrics.attendanceRate}%`}
            hint={`${metrics.attendanceSample.present}/${metrics.attendanceSample.scheduled} shifts · ${metrics.attendanceSample.days}d`}
          />
          <Kpi label="Avg arrival" value={metrics.avgArrival ? `${metrics.avgArrival}` : '—'} hint={`${clock.zone} · last 7 days`} />
          <Kpi label="Standby" value={`${metrics.standbyActive} active`} hint={`${metrics.onSite}/${metrics.expected} crew on site`} />
          <Kpi
            label="SLA guard"
            value={`${metrics.slaCoverHours}h cover`}
            hint={
              metrics.breachedCovers
                ? `${metrics.breachedCovers} breached`
                : metrics.openCovers
                  ? `${metrics.openCovers} open`
                  : 'All covered'
            }
          />
        </div>

        <div className="relative mt-4">
          {brief ? (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-[#7cff4d]/25 bg-white/[0.05] p-3 backdrop-blur-md"
            >
              <p className="flex items-center gap-2 text-sm font-semibold text-[#a8ff70]">
                <Sparkles className="h-4 w-4" /> {brief.headline}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-white/75">{brief.summary}</p>
              {brief.actions.length ? (
                <ul className="mt-2 space-y-1 text-xs text-white/85">
                  {brief.actions.map((action) => (
                    <li key={action} className="flex gap-1.5">
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#7cff4d]" /> {action}
                    </li>
                  ))}
                </ul>
              ) : null}
              <div className="mt-2 [&_*]:text-white/80 [&_button]:text-white">
                <AiReviewBar runId={brief.runId} provider={brief.provider} className="border-white/10" />
              </div>
            </motion.div>
          ) : (
            <button
              type="button"
              disabled={briefBusy}
              onClick={() => void onBrief()}
              className="inline-flex items-center gap-2 rounded-full border border-[#7cff4d]/40 bg-[#7cff4d]/10 px-3.5 py-2 text-xs font-semibold text-[#a8ff70] transition hover:bg-[#7cff4d]/20"
            >
              {briefBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              {briefBusy ? 'Writing brief…' : 'AI brief for this site'}
            </button>
          )}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          <DashPanel
            title="Crew today"
            action={
              <div className="flex gap-2">
                <button type="button" className="btn-secondary px-3 py-2 text-xs" onClick={() => setShowAdd((v) => !v)}>
                  <UserPlus className="h-3.5 w-3.5" /> Add
                </button>
                <button type="button" className="btn-primary px-3 py-2 text-xs" disabled={musterBusy} onClick={onMuster}>
                  {musterBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Users className="h-3.5 w-3.5" />}
                  Run muster
                </button>
              </div>
            }
          >
            <AnimatePresence initial={false}>
              {showAdd ? (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="mb-4 grid grid-cols-1 gap-2 rounded-2xl border border-dashed border-brand/40 bg-brand-soft/20 p-3 sm:grid-cols-2">
                    <select
                      className="input-field sm:col-span-2"
                      value={newPlacement.candidateId}
                      onChange={(e) => {
                        const person = people?.find((p) => p.id === e.target.value);
                        setNewPlacement((cur) => ({
                          ...cur,
                          candidateId: e.target.value,
                          roleTitle: cur.roleTitle || person?.roleTitle || '',
                        }));
                      }}
                    >
                      <option value="">{people ? 'Choose a professional' : 'Loading professionals…'}</option>
                      {placed.map((person) => (
                        <option key={person.id} value={person.id}>
                          {person.fullName} · {person.roleTitle || 'no title'}
                        </option>
                      ))}
                    </select>
                    <input
                      className="input-field"
                      placeholder="Role on this site"
                      value={newPlacement.roleTitle}
                      onChange={(e) => setNewPlacement((cur) => ({ ...cur, roleTitle: e.target.value }))}
                    />
                    <label className="flex items-center gap-2 rounded-xl border border-border bg-surface-elevated px-3 text-sm">
                      <input
                        type="checkbox"
                        checked={newPlacement.isStandby}
                        onChange={(e) => setNewPlacement((cur) => ({ ...cur, isStandby: e.target.checked }))}
                      />
                      Standby (backup) worker
                    </label>
                    <button type="button" className="btn-primary sm:col-span-2" onClick={onAddPlacement}>
                      <Plus className="h-4 w-4" /> Place on site
                    </button>
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>

            {data.roster.length === 0 ? (
              <p className="text-sm text-muted">No workers placed yet. Tap “Add” to place your first worker.</p>
            ) : (
              <ul className="space-y-2">
                {data.roster.map((row) => {
                  const style = STATUS_STYLE[row.status];
                  const Icon = style.icon;
                  return (
                    <li
                      key={row.placementId}
                      className="group flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-surface-elevated/70 px-3 py-2.5"
                    >
                      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-xs font-bold text-brand">
                        {initials(row.name)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-foreground">{row.name}</p>
                        <p className="truncate text-xs text-muted">
                          {row.roleTitle}
                          {row.checkInLocal ? ` · in at ${row.checkInLocal}` : ''}
                          {row.distanceMeters !== null ? ` · ${row.distanceMeters}m from centre` : ''}
                        </p>
                      </div>
                      <span className={cn('inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold', style.className)}>
                        <Icon className="h-3 w-3" />
                        {style.label}
                        {row.status === 'LATE' ? ` ${row.lateMinutes}m` : ''}
                      </span>
                      <div className="flex shrink-0 gap-1">
                        {row.phone ? (
                          <a
                            href={`tel:${row.phone}`}
                            aria-label={`Call ${row.name}`}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-surface hover:text-brand"
                          >
                            <Phone className="h-3.5 w-3.5" />
                          </a>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => void onEnd(row.placementId)}
                          className="rounded-full px-2 text-[11px] text-muted opacity-0 transition hover:text-red-600 group-hover:opacity-100 focus:opacity-100"
                        >
                          End
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </DashPanel>

          <DashPanel title="Cover requests">
            {data.covers.length === 0 ? (
              <p className="flex items-center gap-2 text-sm text-muted">
                <CheckCircle2 className="h-4 w-4 text-brand" /> No cover needed today.
              </p>
            ) : (
              <ul className="space-y-2">
                {data.covers.map((cover) => {
                  const open = cover.status === 'OPEN' || cover.status === 'BREACHED';
                  return (
                    <li
                      key={cover.id}
                      className={cn(
                        'rounded-2xl border px-3 py-3',
                        cover.status === 'BREACHED'
                          ? 'border-red-500/40 bg-red-500/5'
                          : cover.status === 'OPEN'
                            ? 'border-amber-500/40 bg-amber-500/5'
                            : 'border-border bg-surface/60',
                      )}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="flex min-w-0 items-center gap-2 text-sm font-semibold text-foreground">
                          {cover.status === 'BREACHED' ? (
                            <ShieldAlert className="h-4 w-4 shrink-0 text-red-500" />
                          ) : open ? (
                            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
                          ) : (
                            <CheckCircle2 className="h-4 w-4 shrink-0 text-brand" />
                          )}
                          <span className="truncate">Cover for {cover.absentName}</span>
                        </p>
                        <span className="text-[11px] font-semibold text-muted">
                          {open ? countdown(cover.minutesLeft) : cover.status === 'FILLED' ? `Filled by ${cover.standbyName}` : 'Cancelled'}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-muted">{cover.reason}</p>
                      {open ? (
                        <div className="mt-2 flex flex-col gap-2 min-[400px]:flex-row">
                          <select
                            className="input-field py-2 text-sm"
                            value={coverPick[cover.id] ?? freeStandby[0]?.placementId ?? ''}
                            onChange={(e) => setCoverPick((cur) => ({ ...cur, [cover.id]: e.target.value }))}
                          >
                            {freeStandby.length === 0 ? <option value="">No free standby</option> : null}
                            {freeStandby.map((row) => (
                              <option key={row.placementId} value={row.placementId}>
                                {row.name} · {row.roleTitle}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            className="btn-primary shrink-0 px-3 py-2 text-xs"
                            disabled={freeStandby.length === 0}
                            onClick={() => void onAssign(cover.id)}
                          >
                            Send standby
                          </button>
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </DashPanel>
        </div>

        <DashPanel
          title="Real-time operation feed"
          action={
            <button
              type="button"
              aria-label="Refresh"
              onClick={() => void load()}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted hover:text-brand"
            >
              <RefreshCw className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')} />
            </button>
          }
        >
          <div className="mb-3 flex gap-2">
            <input
              className="input-field py-2 text-sm"
              placeholder="Add a note for the team"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void onNote();
              }}
            />
            <button type="button" aria-label="Add note" className="btn-secondary shrink-0 px-3 py-2" onClick={() => void onNote()}>
              <MessageSquarePlus className="h-4 w-4" />
            </button>
          </div>
          {data.feed.length === 0 ? (
            <p className="text-sm text-muted">Activity will appear here as workers check in.</p>
          ) : (
            <ol className="relative max-h-[38rem] space-y-1 overflow-y-auto pr-1">
              <AnimatePresence initial={false}>
                {data.feed.map((event) => (
                  <motion.li
                    key={event.id}
                    layout
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="relative flex gap-3 rounded-xl px-2 py-2 hover:bg-surface"
                  >
                    <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', FEED_DOT[event.severity])} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline justify-between gap-x-2">
                        <p className="text-sm font-medium text-foreground">{event.title}</p>
                        <span className="text-[10px] tabular-nums text-muted">
                          {timeAt(event.createdAt)} {clock.zone}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted">
                        <span className="font-semibold uppercase tracking-wide">
                          {event.actor === 'agent' ? 'Automated log' : event.actor === 'staff' ? 'Staff' : 'Worker'}
                        </span>
                        {event.detail ? ` · ${event.detail}` : ''}
                      </p>
                    </div>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ol>
          )}
        </DashPanel>
      </div>
    </div>
  );
}
