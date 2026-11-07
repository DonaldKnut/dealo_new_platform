'use client';

import { AnimatePresence, motion } from 'framer-motion';
import {
  BadgeCheck,
  Briefcase,
  CircleOff,
  Copy,
  Crown,
  Download,
  FileText,
  LoaderCircle,
  Mail,
  MailWarning,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  UserCheck,
  UserRound,
  Users,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { FormField } from '@/components/forms/form-field';
import { FormModal } from '@/components/ui/form-modal';
import { useToast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api';
import { fetchAuthMe, fetchDashboardUsers, grantResumePremium, updateDashboardUser, type DashboardUser } from '@/lib/dashboard-api';
import { cn } from '@/lib/utils';

const ROLE_META: Record<string, { label: string; tone: string }> = {
  SUPER_ADMIN: { label: 'Super admin', tone: 'bg-rose-500/12 text-rose-700 dark:text-rose-300' },
  ADMIN: { label: 'Admin', tone: 'bg-violet-500/12 text-violet-700 dark:text-violet-300' },
  RECRUITER: { label: 'Recruiter', tone: 'bg-sky-500/12 text-sky-700 dark:text-sky-300' },
  FINANCE: { label: 'Finance', tone: 'bg-amber-500/12 text-amber-700 dark:text-amber-300' },
  OPERATIONS: { label: 'Operations', tone: 'bg-cyan-500/12 text-cyan-700 dark:text-cyan-300' },
  EMPLOYER: { label: 'Employer', tone: 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-300' },
  TALENT: { label: 'Job seeker', tone: 'bg-lime-500/15 text-lime-800 dark:text-lime-300' },
};
const ALL_ROLES = Object.keys(ROLE_META);
const STAFF = new Set(['SUPER_ADMIN', 'ADMIN', 'RECRUITER', 'FINANCE', 'OPERATIONS']);

type Segment = 'all' | 'employers' | 'talent' | 'staff';
type Status = 'all' | 'active' | 'inactive' | 'unverified' | 'premium' | 'dormant';
type Sort = 'newest' | 'active' | 'name';
const PAGE = 40;
const DAY = 86_400_000;

const fullName = (u: DashboardUser) => `${u.firstName} ${u.lastName}`.trim() || u.email.split('@')[0]!;
const segmentOf = (u: DashboardUser): Exclude<Segment, 'all'> => (u.roles.some((r) => STAFF.has(r)) ? 'staff' : u.roles.includes('EMPLOYER') ? 'employers' : 'talent');

function relative(iso: string | null) {
  if (!iso) return 'Never';
  const days = Math.floor((Date.now() - Date.parse(iso)) / DAY);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

function Avatar({ user, size = 'h-10 w-10' }: { user: DashboardUser; size?: string }) {
  const [broken, setBroken] = useState(false);
  const initials = fullName(user)
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');
  const hue = [...user.email].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7);
  if (user.avatarUrl && !broken) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={user.avatarUrl} alt="" referrerPolicy="no-referrer" onError={() => setBroken(true)} className={cn('shrink-0 rounded-full object-cover ring-2 ring-background', size)} />;
  }
  return (
    <span className={cn('inline-flex shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ring-2 ring-background', size)} style={{ background: `linear-gradient(135deg, hsl(${hue} 65% 45%), hsl(${(hue + 40) % 360} 70% 32%))` }}>
      {initials || <UserRound className="h-4 w-4" />}
    </span>
  );
}

export function DashboardUsersPanel() {
  const toast = useToast();
  const [users, setUsers] = useState<DashboardUser[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [me, setMe] = useState<{ id: string; roles: string[] } | null>(null);
  const [query, setQuery] = useState('');
  const [segment, setSegment] = useState<Segment>('all');
  const [status, setStatus] = useState<Status>('all');
  const [sort, setSort] = useState<Sort>('newest');
  const [shown, setShown] = useState(PAGE);
  const [openId, setOpenId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const [list, account] = await Promise.all([fetchDashboardUsers(), fetchAuthMe()]);
      setUsers(list);
      setMe(account);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to load users.');
      setUsers((u) => u ?? []);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const stats = useMemo(() => {
    const list = users ?? [];
    const now = Date.now();
    const counts = { employers: 0, talent: 0, staff: 0 };
    for (const u of list) counts[segmentOf(u)] += 1;
    return {
      total: list.length,
      active30: list.filter((u) => u.lastLoginAt && now - Date.parse(u.lastLoginAt) < 30 * DAY).length,
      newWeek: list.filter((u) => now - Date.parse(u.createdAt) < 7 * DAY).length,
      unverified: list.filter((u) => !u.isEmailVerified).length,
      premium: list.filter((u) => u.premiumUntil).length,
      ...counts,
    };
  }, [users]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = (users ?? []).filter((u) => {
      if (segment !== 'all' && segmentOf(u) !== segment) return false;
      if (status === 'active' && !u.isActive) return false;
      if (status === 'inactive' && u.isActive) return false;
      if (status === 'unverified' && u.isEmailVerified) return false;
      if (status === 'premium' && !u.premiumUntil) return false;
      if (status === 'dormant' && u.lastLoginAt && Date.now() - Date.parse(u.lastLoginAt) < 60 * DAY) return false;
      return !q || fullName(u).toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
    });
    return list.sort((a, b) =>
      sort === 'name' ? fullName(a).localeCompare(fullName(b)) : sort === 'active' ? Date.parse(b.lastLoginAt ?? '0') - Date.parse(a.lastLoginAt ?? '0') : Date.parse(b.createdAt) - Date.parse(a.createdAt),
    );
  }, [users, query, segment, status, sort]);

  useEffect(() => setShown(PAGE), [query, segment, status, sort]);

  const patchUser = (next: DashboardUser) => setUsers((list) => list?.map((u) => (u.id === next.id ? next : u)) ?? list);
  const open = users?.find((u) => u.id === openId) ?? null;

  const exportCsv = () => {
    const rows = [['Name', 'Email', 'Roles', 'Active', 'Email confirmed', 'CV premium until', 'Last sign-in', 'Joined']];
    for (const u of filtered) {
      rows.push([fullName(u), u.email, u.roles.join(' '), u.isActive ? 'yes' : 'no', u.isEmailVerified ? 'yes' : 'no', u.premiumUntil ?? '', u.lastLoginAt ?? '', u.createdAt]);
    }
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `dealo-users-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!users) {
    return (
      <div className="space-y-4">
        <div className="h-44 animate-pulse rounded-[1.75rem] bg-surface" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-surface" />
          ))}
        </div>
      </div>
    );
  }

  const segments: Array<{ id: Segment; label: string; count: number; icon: typeof Users }> = [
    { id: 'all', label: 'Everyone', count: stats.total, icon: Users },
    { id: 'employers', label: 'Employers', count: stats.employers, icon: Briefcase },
    { id: 'talent', label: 'Job seekers', count: stats.talent, icon: UserRound },
    { id: 'staff', label: 'Dealo staff', count: stats.staff, icon: ShieldCheck },
  ];
  const pct = (n: number) => (stats.total ? (n / stats.total) * 100 : 0);

  return (
    <div className="space-y-6">
      {/* ------------------------------------------------------------ hero */}
      <section className="relative overflow-hidden rounded-[1.75rem] border border-border bg-gradient-to-br from-brand-soft via-surface-elevated to-surface-elevated p-4 min-[340px]:p-6 sm:p-8">
        <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-brand/15 blur-3xl" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="eyebrow">Directory</p>
            <h1 className="display-title mt-2 text-[1.75rem] min-[340px]:text-4xl">People on Dealo</h1>
            <p className="mt-2 max-w-xl text-sm text-muted">Every employer, job seeker and staff account. Search, check who is active, confirm emails, manage roles and give CV premium.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => void load()} className="btn-secondary text-sm" disabled={refreshing}>
              <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} /> Refresh
            </button>
            <button type="button" onClick={exportCsv} className="btn-primary text-sm" disabled={!filtered.length}>
              <Download className="h-4 w-4" /> Export {filtered.length === stats.total ? 'all' : filtered.length}
            </button>
          </div>
        </div>
        <div className="relative mt-6">
          <div className="flex h-2.5 overflow-hidden rounded-full bg-border/50" aria-label="Accounts by type">
            <motion.span className="bg-emerald-500" initial={{ width: 0 }} animate={{ width: `${pct(stats.employers)}%` }} transition={{ duration: 0.8 }} />
            <motion.span className="bg-lime-400" initial={{ width: 0 }} animate={{ width: `${pct(stats.talent)}%` }} transition={{ duration: 0.8, delay: 0.1 }} />
            <motion.span className="bg-violet-500" initial={{ width: 0 }} animate={{ width: `${pct(stats.staff)}%` }} transition={{ duration: 0.8, delay: 0.2 }} />
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
            <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Employers {stats.employers}</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-lime-400" /> Job seekers {stats.talent}</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-violet-500" /> Staff {stats.staff}</span>
          </div>
        </div>
      </section>

      {error ? <p className="rounded-2xl bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p> : null}

      {/* ------------------------------------------------------------ KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Kpi icon={Users} label="Accounts" value={stats.total} />
        <Kpi icon={UserCheck} label="Active in 30 days" value={stats.active30} hint={stats.total ? `${Math.round(pct(stats.active30))}% of all` : undefined} />
        <Kpi icon={Sparkles} label="Joined this week" value={stats.newWeek} />
        <Kpi icon={MailWarning} label="Email not confirmed" value={stats.unverified} onClick={() => setStatus('unverified')} tone="amber" />
        <Kpi icon={Crown} label="CV premium" value={stats.premium} onClick={() => setStatus('premium')} tone="gold" />
      </div>

      {/* --------------------------------------------------------- toolbar */}
      <div className="space-y-3 rounded-[1.4rem] border border-border bg-surface-elevated p-3 min-[340px]:p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <label className="flex min-w-0 flex-1 items-center gap-2 rounded-full border border-border bg-background px-3 py-2 focus-within:border-brand">
            <Search className="h-4 w-4 shrink-0 text-muted" />
            <span className="sr-only">Search people</span>
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name or email" className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
            {query ? (
              <button type="button" aria-label="Clear search" onClick={() => setQuery('')} className="text-muted hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </label>
          <div className="grid grid-cols-2 gap-2 min-[400px]:flex">
            <select aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value as Status)} className="input-field py-2 text-sm lg:w-44">
              <option value="all">Any status</option>
              <option value="active">Active</option>
              <option value="inactive">Switched off</option>
              <option value="unverified">Email not confirmed</option>
              <option value="premium">CV premium</option>
              <option value="dormant">Not seen in 60 days</option>
            </select>
            <select aria-label="Sort" value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="input-field py-2 text-sm lg:w-40">
              <option value="newest">Newest first</option>
              <option value="active">Recently active</option>
              <option value="name">Name A–Z</option>
            </select>
          </div>
        </div>
        <div role="tablist" className="scrollbar-none -mx-1 flex gap-1 overflow-x-auto px-1">
          {segments.map((s) => {
            const Icon = s.icon;
            const active = segment === s.id;
            return (
              <button
                key={s.id}
                role="tab"
                type="button"
                aria-selected={active}
                onClick={() => setSegment(s.id)}
                className={cn('relative inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors', active ? 'text-white dark:text-[#071f14]' : 'text-muted hover:text-foreground')}
              >
                {active ? <motion.span layoutId="users-seg" className="absolute inset-0 rounded-full bg-brand" transition={{ type: 'spring', stiffness: 420, damping: 34 }} /> : null}
                <Icon className="relative z-10 h-4 w-4" />
                <span className="relative z-10">{s.label}</span>
                <span className={cn('relative z-10 rounded-full px-1.5 text-[10px] tabular-nums', active ? 'bg-white/20' : 'bg-surface')}>{s.count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ------------------------------------------------------------ list */}
      <p className="text-sm text-muted" aria-live="polite">
        {filtered.length.toLocaleString()} {filtered.length === 1 ? 'person' : 'people'}
        {status !== 'all' || segment !== 'all' || query ? (
          <button
            type="button"
            className="ml-2 font-semibold text-brand hover:underline"
            onClick={() => {
              setQuery('');
              setSegment('all');
              setStatus('all');
            }}
          >
            Clear filters
          </button>
        ) : null}
      </p>

      {filtered.length ? (
        <div className="overflow-hidden rounded-[1.4rem] border border-border bg-surface-elevated">
          <div className="hidden grid-cols-[minmax(0,2.2fr)_minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,0.8fr)_minmax(0,0.8fr)] gap-3 border-b border-border bg-surface px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-muted lg:grid">
            <span>Person</span>
            <span>Roles</span>
            <span>Status</span>
            <span>Last seen</span>
            <span>Joined</span>
          </div>
          <ul className="divide-y divide-border">
            <AnimatePresence initial={false}>
              {filtered.slice(0, shown).map((u, i) => (
                <motion.li key={u.id} layout="position" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 12) * 0.015 }}>
                  <button
                    type="button"
                    onClick={() => setOpenId(u.id)}
                    className="grid w-full gap-2 px-3 py-3 text-left transition hover:bg-surface min-[340px]:px-4 lg:grid-cols-[minmax(0,2.2fr)_minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,0.8fr)_minmax(0,0.8fr)] lg:items-center lg:gap-3"
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <span className="relative">
                        <Avatar user={u} />
                        {u.lastLoginAt && Date.now() - Date.parse(u.lastLoginAt) < 7 * DAY ? <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-surface-elevated" aria-label="Active this week" /> : null}
                      </span>
                      <span className="min-w-0">
                        <span className="flex items-center gap-1.5 truncate font-semibold text-foreground">
                          <span className="truncate">{fullName(u)}</span>
                          {u.premiumUntil ? <Crown className="h-3.5 w-3.5 shrink-0 text-amber-500" aria-label="CV premium" /> : null}
                          {me?.id === u.id ? <span className="shrink-0 rounded-full bg-brand-soft px-1.5 text-[10px] text-brand">You</span> : null}
                        </span>
                        <span className="block truncate text-xs text-muted">{u.email}</span>
                      </span>
                    </span>
                    <span className="flex flex-wrap gap-1">
                      {u.roles.map((r) => (
                        <span key={r} className={cn('rounded-full px-2 py-0.5 text-[11px] font-semibold', ROLE_META[r]?.tone ?? 'bg-surface text-muted')}>
                          {ROLE_META[r]?.label ?? r}
                        </span>
                      ))}
                    </span>
                    <span className="flex flex-wrap gap-1 text-[11px] font-semibold">
                      {u.isActive ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-emerald-700 dark:text-emerald-300"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Active</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-surface px-2 py-0.5 text-muted"><CircleOff className="h-3 w-3" /> Off</span>
                      )}
                      {!u.isEmailVerified ? <span className="rounded-full bg-amber-500/12 px-2 py-0.5 text-amber-700 dark:text-amber-300">Unconfirmed</span> : null}
                    </span>
                    <span className="text-xs text-muted"><span className="lg:hidden">Last seen </span>{relative(u.lastLoginAt)}</span>
                    <span className="hidden text-xs text-muted lg:block">{new Date(u.createdAt).toLocaleDateString()}</span>
                  </button>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
          {filtered.length > shown ? (
            <div className="border-t border-border p-3 text-center">
              <button type="button" onClick={() => setShown((n) => n + PAGE)} className="btn-secondary text-sm">
                Show {Math.min(PAGE, filtered.length - shown)} more
              </button>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="rounded-[1.4rem] border border-dashed border-border p-10 text-center">
          <Search className="mx-auto h-7 w-7 text-muted" />
          <p className="mt-3 font-display text-xl text-foreground">Nobody matches</p>
          <p className="mt-1 text-sm text-muted">Try another name, or clear the filters.</p>
        </div>
      )}

      <UserDrawer
        user={open}
        me={me}
        onClose={() => setOpenId(null)}
        onChanged={(next) => {
          patchUser(next);
          toast.success('Saved');
        }}
      />
    </div>
  );
}

function Kpi({ icon: Icon, label, value, hint, onClick, tone }: { icon: typeof Users; label: string; value: number; hint?: string; onClick?: () => void; tone?: 'amber' | 'gold' }) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cn('rounded-2xl border border-border bg-surface-elevated p-3 text-left transition min-[340px]:p-4', onClick && 'hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-md')}
    >
      <Icon className={cn('h-4 w-4', tone === 'amber' ? 'text-amber-600' : tone === 'gold' ? 'text-amber-500' : 'text-brand')} />
      <p className="mt-2 font-display text-2xl tabular-nums text-foreground min-[340px]:text-3xl">{value.toLocaleString()}</p>
      <p className="text-xs text-muted">{label}</p>
      {hint ? <p className="text-[11px] text-muted">{hint}</p> : null}
    </Tag>
  );
}

function UserDrawer({ user, me, onClose, onChanged }: { user: DashboardUser | null; me: { id: string; roles: string[] } | null; onClose: () => void; onChanged: (u: DashboardUser) => void }) {
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [days, setDays] = useState(30);

  useEffect(() => {
    setRoles(user?.roles ?? []);
    setDays(30);
  }, [user?.id, user?.roles]);

  if (!user) return null;
  const isSuper = Boolean(me?.roles.includes('SUPER_ADMIN'));
  const isAdmin = isSuper || Boolean(me?.roles.includes('ADMIN'));
  const isSelf = me?.id === user.id;
  const targetIsAdmin = user.roles.some((r) => r === 'SUPER_ADMIN' || r === 'ADMIN');
  const canEdit = isAdmin && !isSelf && (isSuper || !targetIsAdmin);
  const rolesChanged = roles.slice().sort().join() !== user.roles.slice().sort().join();

  const act = async (key: string, body: { isActive?: boolean; isEmailVerified?: true; roles?: string[] }) => {
    setBusy(key);
    try {
      const next = await updateDashboardUser(user.id, body);
      if (next) onChanged(next);
    } catch (err) {
      toast.error('Could not save', err instanceof ApiError ? err.message : '');
    } finally {
      setBusy(null);
    }
  };

  const premium = async (d: number) => {
    setBusy('premium');
    try {
      const result = await grantResumePremium(user.id, d);
      onChanged({ ...user, premiumUntil: result.premiumUntil });
    } catch (err) {
      toast.error('Could not change premium', err instanceof ApiError ? err.message : '');
    } finally {
      setBusy(null);
    }
  };

  return (
    <FormModal open onClose={onClose} size="md" title={fullName(user)} description={user.email} icon={UserRound}>
      <div className="space-y-5">
        <div className="flex items-center gap-4">
          <Avatar user={user} size="h-16 w-16" />
          <div className="grid flex-1 grid-cols-2 gap-2 text-xs">
            <Info label="Joined" value={new Date(user.createdAt).toLocaleDateString()} />
            <Info label="Last sign-in" value={user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : 'Never'} />
            <Info label="Signs in with" value={user.authProvider?.replace('local', 'password').replace('+', ' + ') ?? 'password'} />
            <Info label="CVs built" value={String(user.resumes ?? 0)} />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <a href={`mailto:${user.email}`} className="btn-secondary text-sm">
            <Mail className="h-4 w-4" /> Email
          </a>
          <button
            type="button"
            className="btn-secondary text-sm"
            onClick={() => void navigator.clipboard.writeText(user.email).then(() => toast.success('Email copied'))}
          >
            <Copy className="h-4 w-4" /> Copy email
          </button>
        </div>

        <Section title="Account">
          <div className="flex flex-col gap-2 min-[400px]:flex-row">
            {user.isActive ? (
              <button type="button" className="btn-secondary flex-1 justify-center text-sm text-danger" disabled={!canEdit || busy !== null} onClick={() => window.confirm(`Switch off ${fullName(user)}? They are signed out and cannot sign in until switched back on.`) && void act('active', { isActive: false })}>
                {busy === 'active' ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CircleOff className="h-4 w-4" />} Switch account off
              </button>
            ) : (
              <button type="button" className="btn-primary flex-1 justify-center text-sm" disabled={!canEdit || busy !== null} onClick={() => void act('active', { isActive: true })}>
                {busy === 'active' ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <UserCheck className="h-4 w-4" />} Switch account on
              </button>
            )}
            {!user.isEmailVerified ? (
              <button type="button" className="btn-secondary flex-1 justify-center text-sm" disabled={!canEdit || busy !== null} onClick={() => void act('verify', { isEmailVerified: true })}>
                {busy === 'verify' ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <BadgeCheck className="h-4 w-4" />} Mark email confirmed
              </button>
            ) : (
              <span className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                <BadgeCheck className="h-4 w-4" /> Email confirmed
              </span>
            )}
          </div>
          {!canEdit ? (
            <p className="mt-2 text-xs text-muted">{isSelf ? 'You cannot change your own account here.' : 'Only a super admin can change admin accounts.'}</p>
          ) : null}
        </Section>

        <Section title="Roles">
          <div className="flex flex-wrap gap-1.5">
            {ALL_ROLES.map((r) => {
              const on = roles.includes(r);
              return (
                <button
                  key={r}
                  type="button"
                  disabled={!isSuper || isSelf}
                  aria-pressed={on}
                  onClick={() => setRoles((list) => (on ? list.filter((x) => x !== r) : [...list, r]))}
                  className={cn(
                    'rounded-full border px-3 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed',
                    on ? cn('border-transparent', ROLE_META[r]!.tone) : 'border-border text-muted hover:border-brand/40',
                    (!isSuper || isSelf) && !on && 'opacity-50',
                  )}
                >
                  {ROLE_META[r]!.label}
                </button>
              );
            })}
          </div>
          {isSuper && !isSelf ? (
            <button type="button" className="btn-primary mt-3 text-sm" disabled={!rolesChanged || !roles.length || busy !== null} onClick={() => void act('roles', { roles })}>
              {busy === 'roles' ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />} Save roles
            </button>
          ) : (
            <p className="mt-2 text-xs text-muted">Only super admins change roles.</p>
          )}
          {rolesChanged ? <p className="mt-1 text-[11px] text-muted">They will be asked to sign in again so the new roles apply.</p> : null}
        </Section>

        <Section title="CV builder premium">
          <p className="flex items-center gap-1.5 text-sm">
            {user.premiumUntil ? (
              <>
                <Crown className="h-4 w-4 text-amber-500" /> Premium until <strong>{new Date(user.premiumUntil).toLocaleDateString()}</strong>
              </>
            ) : (
              <>
                <FileText className="h-4 w-4 text-muted" /> Free plan
              </>
            )}
          </p>
          <div className="mt-3 grid grid-cols-4 gap-2">
            {[7, 30, 90, 365].map((d) => (
              <button key={d} type="button" onClick={() => setDays(d)} className={cn('rounded-xl border px-2 py-2 text-xs font-semibold transition', days === d ? 'border-brand bg-brand-soft text-brand' : 'border-border text-muted hover:border-brand/40')}>
                {d === 365 ? '1 year' : `${d}d`}
              </button>
            ))}
          </div>
          <FormField label="Or any number of days">
            <input className="input-field" type="number" min={1} max={3650} value={days} onChange={(e) => setDays(Number(e.target.value))} />
          </FormField>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className="btn-primary text-sm" disabled={!isAdmin || busy !== null || !Number.isInteger(days) || days < 1 || days > 3650} onClick={() => void premium(days)}>
              {busy === 'premium' ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Crown className="h-4 w-4" />} Add {days} days
            </button>
            {user.premiumUntil ? (
              <button type="button" className="btn-secondary text-sm text-danger" disabled={!isAdmin || busy !== null} onClick={() => void premium(0)}>
                Remove premium
              </button>
            ) : null}
          </div>
        </Section>
      </div>
    </FormModal>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border p-3 min-[340px]:p-4">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">{title}</h3>
      {children}
    </section>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-surface px-2.5 py-2">
      <p className="text-[10px] text-muted">{label}</p>
      <p className="truncate font-semibold text-foreground">{value}</p>
    </div>
  );
}
