'use client';

import { AnimatePresence, motion } from 'framer-motion';
import {
  Bell,
  Briefcase,
  CalendarClock,
  CheckCheck,
  Inbox,
  LifeBuoy,
  ListChecks,
  Loader2,
  Mail,
  UserPlus,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { useToast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api';
import {
  notificationsApi,
  type AppNotification,
  type NotificationPage,
} from '@/lib/notifications-api';
import { cn } from '@/lib/utils';

const KINDS: Array<{ prefix: string; icon: LucideIcon; tone: string }> = [
  { prefix: 'hire_request', icon: Briefcase, tone: 'bg-brand-soft text-brand' },
  {
    prefix: 'shortlist',
    icon: ListChecks,
    tone: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  },
  {
    prefix: 'ats.application',
    icon: UserPlus,
    tone: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
  },
  {
    prefix: 'ats.interview',
    icon: CalendarClock,
    tone: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
  },
  { prefix: 'workspace', icon: Users, tone: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' },
  { prefix: 'mail', icon: Mail, tone: 'bg-rose-500/10 text-rose-600 dark:text-rose-400' },
  { prefix: 'newsletter', icon: Mail, tone: 'bg-rose-500/10 text-rose-600 dark:text-rose-400' },
  {
    prefix: 'support',
    icon: LifeBuoy,
    tone: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
  },
];
const FALLBACK_KIND = { icon: Bell, tone: 'bg-surface text-muted' };
const kindOf = (type: string) =>
  KINDS.find((kind) => type.startsWith(kind.prefix)) ?? FALLBACK_KIND;

const RELATIVE = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
function timeAgo(iso: string) {
  const seconds = Math.round((new Date(iso).getTime() - Date.now()) / 1000);
  const steps: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ['second', 60],
    ['minute', 60],
    ['hour', 24],
    ['day', 7],
    ['week', 4.35],
    ['month', 12],
  ];
  let value = seconds;
  for (const [unit, size] of steps) {
    if (Math.abs(value) < size)
      return unit === 'second' ? 'just now' : RELATIVE.format(Math.round(value), unit);
    value /= size;
  }
  return RELATIVE.format(Math.round(value), 'year');
}

function dayLabel(iso: string) {
  const date = new Date(iso);
  const today = new Date();
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOf(today) - startOf(date)) / 86_400_000);
  return days <= 0 ? 'Today' : days === 1 ? 'Yesterday' : 'Earlier';
}

/** Stored notifications plus the live stream. Falls back to polling while the stream is down. */
function useNotificationFeed(onLive: (notification: AppNotification) => void) {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [live, setLive] = useState(false);
  const onLiveRef = useRef(onLive);
  onLiveRef.current = onLive;

  const apply = useCallback((page: NotificationPage) => {
    setItems(page.items);
    setUnread(page.unread);
    setHasMore(page.hasMore);
  }, []);

  const refresh = useCallback(async () => {
    try {
      apply(await notificationsApi.list());
    } catch {
      // Keep what we have; the next refresh will try again.
    } finally {
      setLoading(false);
    }
  }, [apply]);

  useEffect(() => {
    void refresh();
    let source: EventSource | null = null;
    let retry: ReturnType<typeof setTimeout> | undefined;
    let delay = 5_000;
    let stopped = false;

    const connect = () => {
      if (stopped) return;
      source = new EventSource(notificationsApi.streamUrl(), { withCredentials: true });
      source.addEventListener('ready', () => {
        setLive(true);
        delay = 5_000;
      });
      source.addEventListener('notification', (event) => {
        const notification = JSON.parse((event as MessageEvent<string>).data) as AppNotification;
        setItems((current) =>
          current.some((item) => item.id === notification.id)
            ? current
            : [notification, ...current],
        );
        setUnread((count) => count + 1);
        onLiveRef.current(notification);
      });
      source.addEventListener('sync', () => void refresh());
      source.onerror = () => {
        setLive(false);
        source?.close();
        if (stopped) return;
        retry = setTimeout(async () => {
          // A normal API call renews an expired sign-in cookie before the stream reconnects.
          try {
            apply(await notificationsApi.list());
          } catch (error) {
            if (error instanceof ApiError && (error.status === 401 || error.status === 403)) return;
          }
          connect();
        }, delay);
        delay = Math.min(delay * 2, 60_000);
      };
    };

    connect();
    const onVisible = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      stopped = true;
      clearTimeout(retry);
      source?.close();
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [apply, refresh]);

  useEffect(() => {
    if (live) return;
    const timer = setInterval(() => void refresh(), 60_000);
    return () => clearInterval(timer);
  }, [live, refresh]);

  const markRead = useCallback((id: string) => {
    let changed = false;
    setItems((current) =>
      current.map((item) => {
        if (item.id !== id || item.readAt) return item;
        changed = true;
        return { ...item, readAt: new Date().toISOString() };
      }),
    );
    if (changed) setUnread((count) => Math.max(0, count - 1));
    void notificationsApi
      .markRead(id)
      .then((r) => setUnread(r.unread))
      .catch(() => undefined);
  }, []);

  const markAllRead = useCallback(() => {
    const now = new Date().toISOString();
    setItems((current) => current.map((item) => (item.readAt ? item : { ...item, readAt: now })));
    setUnread(0);
    void notificationsApi.markAllRead().catch(() => void refresh());
  }, [refresh]);

  const loadMore = useCallback(async () => {
    const last = items[items.length - 1];
    if (!last) return;
    const page = await notificationsApi.list(last.createdAt);
    setItems((current) => [
      ...current,
      ...page.items.filter((item) => !current.some((c) => c.id === item.id)),
    ]);
    setHasMore(page.hasMore);
  }, [items]);

  return { items, unread, hasMore, loading, live, markRead, markAllRead, loadMore };
}

function useIsDesktop() {
  const [desktop, setDesktop] = useState(false);
  useEffect(() => {
    const query = window.matchMedia('(min-width: 640px)');
    const update = () => setDesktop(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  return desktop;
}

function NotificationRow({
  item,
  onOpen,
}: {
  item: AppNotification;
  onOpen: (item: AppNotification) => void;
}) {
  const kind = kindOf(item.type);
  const Icon = kind.icon;
  const unread = !item.readAt;
  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <button
        type="button"
        onClick={() => onOpen(item)}
        className={cn(
          'group flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-surface',
          unread && 'bg-brand-soft/40',
        )}
      >
        <span
          className={cn(
            'mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-105',
            kind.tone,
          )}
        >
          <Icon className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span
            className={cn(
              'block text-sm leading-snug',
              unread ? 'font-semibold text-foreground' : 'text-foreground/90',
            )}
          >
            {item.title}
          </span>
          {item.body ? (
            <span className="mt-0.5 line-clamp-2 block text-xs leading-relaxed text-muted">
              {item.body}
            </span>
          ) : null}
          <span className="mt-1 block text-[11px] text-muted">{timeAgo(item.createdAt)}</span>
        </span>
        {unread ? (
          <span
            className="mt-2 h-2 w-2 shrink-0 rounded-full bg-brand shadow-[0_0_0_3px_color-mix(in_srgb,var(--brand)_18%,transparent)]"
            aria-label="Unread"
          />
        ) : null}
      </button>
    </motion.li>
  );
}

export function NotificationCenter() {
  const router = useRouter();
  const toast = useToast();
  const desktop = useIsDesktop();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'all' | 'unread'>('all');
  const [ring, setRing] = useState(0);
  const [moreLoading, setMoreLoading] = useState(false);
  const [anchor, setAnchor] = useState<{ top: number; right: number } | null>(null);
  const [mounted, setMounted] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const feed = useNotificationFeed((notification) => {
    setRing((n) => n + 1);
    toast.info(notification.title, notification.body ?? undefined);
  });

  useEffect(() => setMounted(true), []);

  const place = useCallback(() => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (rect)
      setAnchor({ top: rect.bottom + 10, right: Math.max(8, window.innerWidth - rect.right) });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    place();
    window.addEventListener('resize', place);
    return () => window.removeEventListener('resize', place);
  }, [open, place]);

  useEffect(() => {
    if (!open) return;
    const onDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!panelRef.current?.contains(target) && !buttonRef.current?.contains(target))
        setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && setOpen(false);
    window.addEventListener('pointerdown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const visible = useMemo(
    () => (tab === 'unread' ? feed.items.filter((item) => !item.readAt) : feed.items),
    [feed.items, tab],
  );
  const groups = useMemo(() => {
    const out: Array<{ label: string; items: AppNotification[] }> = [];
    for (const item of visible) {
      const label = dayLabel(item.createdAt);
      const last = out[out.length - 1];
      if (last?.label === label) last.items.push(item);
      else out.push({ label, items: [item] });
    }
    return out;
  }, [visible]);

  const openItem = (item: AppNotification) => {
    feed.markRead(item.id);
    if (item.link) {
      setOpen(false);
      router.push(item.link);
    }
  };

  const loadMore = async () => {
    setMoreLoading(true);
    await feed.loadMore().catch(() => undefined);
    setMoreLoading(false);
  };

  const badge = feed.unread > 99 ? '99+' : String(feed.unread);

  const panel = (
    <div className="flex max-h-full min-h-0 flex-col">
      <div className="flex items-center justify-between gap-2 px-4 pb-3 pt-4">
        <div className="flex items-center gap-2">
          <p className="font-display text-lg leading-none text-foreground">Notifications</p>
          {feed.unread ? (
            <span className="rounded-full bg-brand px-2 py-0.5 text-[11px] font-bold text-white dark:text-[#071f14]">
              {badge} new
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={feed.markAllRead}
            disabled={!feed.unread}
            className="inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-semibold text-brand transition hover:bg-brand-soft disabled:opacity-40"
          >
            <CheckCheck className="h-3.5 w-3.5" /> Mark all read
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close notifications"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted transition hover:bg-surface hover:text-foreground sm:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mx-4 mb-2 grid grid-cols-2 rounded-full bg-surface p-1 text-xs font-semibold">
        {(['all', 'unread'] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value)}
            className={cn(
              'relative rounded-full py-1.5 transition-colors',
              tab === value ? 'text-foreground' : 'text-muted hover:text-foreground',
            )}
          >
            {tab === value ? (
              <motion.span
                layoutId="notif-tab"
                className="absolute inset-0 rounded-full bg-surface-elevated shadow-sm"
                transition={{ type: 'spring', stiffness: 420, damping: 34 }}
              />
            ) : null}
            <span className="relative">
              {value === 'all' ? 'All' : `Unread${feed.unread ? ` · ${badge}` : ''}`}
            </span>
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-3">
        {feed.loading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-12 text-center">
            <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-soft text-brand">
              <Inbox className="h-6 w-6" />
            </span>
            <p className="mt-3 text-sm font-semibold text-foreground">
              {tab === 'unread' ? 'You are all caught up' : 'No notifications yet'}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-muted">
              New applicants, request updates, invites and replies will show up here the moment they
              happen.
            </p>
          </div>
        ) : (
          groups.map((group) => (
            <section key={group.label} className="mt-1">
              <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
                {group.label}
              </p>
              <ul className="space-y-0.5">
                <AnimatePresence initial={false}>
                  {group.items.map((item) => (
                    <NotificationRow key={item.id} item={item} onOpen={openItem} />
                  ))}
                </AnimatePresence>
              </ul>
            </section>
          ))
        )}
        {feed.hasMore && tab === 'all' ? (
          <button
            type="button"
            onClick={() => void loadMore()}
            disabled={moreLoading}
            className="mx-auto mt-2 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-brand hover:bg-brand-soft"
          >
            {moreLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null} Show older
          </button>
        ) : null}
      </div>

      <div className="flex items-center gap-1.5 border-t border-border px-4 py-2.5 text-[11px] text-muted">
        <span
          className={cn('h-1.5 w-1.5 rounded-full', feed.live ? 'bg-emerald-500' : 'bg-amber-500')}
        />
        {feed.live ? 'Live: updates arrive instantly' : 'Reconnecting… checking every minute'}
      </div>
    </div>
  );

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={feed.unread ? `Notifications, ${feed.unread} unread` : 'Notifications'}
        aria-expanded={open}
        className={cn(
          'relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-border transition hover:border-brand hover:text-brand min-[340px]:h-10 min-[340px]:w-10',
          open && 'border-brand text-brand',
        )}
      >
        <motion.span
          key={ring}
          animate={ring ? { rotate: [0, -16, 14, -10, 8, -4, 0] } : undefined}
          transition={{ duration: 0.7 }}
          whileHover={{ rotate: 12 }}
          className="inline-flex"
        >
          <Bell className="h-4 w-4" />
        </motion.span>
        <AnimatePresence>
          {feed.unread ? (
            <motion.span
              key="badge"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 26 }}
              className="absolute -right-1 -top-1 inline-flex min-w-[1.15rem] items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold leading-[1.15rem] text-white ring-2 ring-background"
            >
              {badge}
            </motion.span>
          ) : null}
        </AnimatePresence>
      </button>

      {mounted
        ? createPortal(
            <AnimatePresence>
              {open ? (
                desktop ? (
                  <motion.div
                    key="desktop"
                    ref={panelRef}
                    role="dialog"
                    aria-label="Notifications"
                    initial={{ opacity: 0, y: -8, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.98 }}
                    transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                    style={{
                      top: anchor?.top ?? 64,
                      right: anchor?.right ?? 16,
                      transformOrigin: 'top right',
                    }}
                    className="fixed z-[80] flex h-[min(36rem,calc(100dvh-6rem))] w-[24rem] max-w-[calc(100vw-1rem)] flex-col overflow-hidden rounded-2xl border border-border bg-background/95 shadow-[0_24px_60px_-20px_rgba(4,47,46,0.45)] backdrop-blur-xl"
                  >
                    {panel}
                  </motion.div>
                ) : (
                  <motion.div
                    key="mobile"
                    className="fixed inset-0 z-[80]"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" aria-hidden />
                    <motion.div
                      ref={panelRef}
                      role="dialog"
                      aria-label="Notifications"
                      initial={{ y: '100%' }}
                      animate={{ y: 0 }}
                      exit={{ y: '100%' }}
                      transition={{ type: 'spring', stiffness: 340, damping: 34 }}
                      drag="y"
                      dragConstraints={{ top: 0, bottom: 0 }}
                      dragElastic={{ top: 0, bottom: 0.6 }}
                      onDragEnd={(_, info) => {
                        if (info.offset.y > 120 || info.velocity.y > 600) setOpen(false);
                      }}
                      className="absolute inset-x-0 bottom-0 flex h-[85dvh] flex-col overflow-hidden rounded-t-3xl border-t border-border bg-background pb-[var(--safe-bottom)] shadow-2xl"
                    >
                      <div className="flex justify-center pt-2.5">
                        <span className="h-1.5 w-10 rounded-full bg-border" aria-hidden />
                      </div>
                      {panel}
                    </motion.div>
                  </motion.div>
                )
              ) : null}
            </AnimatePresence>,
            document.body,
          )
        : null}
    </>
  );
}
