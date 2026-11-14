'use client';

import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowUpRight,
  BookOpen,
  Bot,
  Briefcase,
  Building2,
  ChevronDown,
  Code2,
  FileText,
  GraduationCap,
  Handshake,
  Kanban,
  KeyRound,
  Newspaper,
  Radar,
  Route,
  Timer,
  UserRound,
  Users,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import { createPortal } from 'react-dom';

import { useLocale } from '@/components/i18n/locale-context';
import type { TranslationKey } from '@/components/i18n/dictionaries';
import { isStaffRole, useAuthSession } from '@/hooks/use-auth-session';

type MegaItemDef = {
  href: string;
  titleKey: TranslationKey;
  descKey: TranslationKey;
  icon: LucideIcon;
  external?: boolean;
  badge?: string;
  /** Staff-only: ATS, hiring agents, API sandbox. */
  staffOnly?: boolean;
};

const API_ORIGIN = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1').replace(
  /\/api\/v1\/?$/,
  '',
);

/** AI products — talent Job Agent is public; hiring agents + ATS stay staff-gated. */
const aiDefs: MegaItemDef[] = [
  { href: '/job-agent', titleKey: 'mega.ai.jobAgent.title', descKey: 'mega.ai.jobAgent.desc', icon: Radar, badge: 'New' },
  { href: '/hiring-agents', titleKey: 'mega.ai.agents.title', descKey: 'mega.ai.agents.desc', icon: Bot, staffOnly: true },
  { href: '/ats', titleKey: 'mega.ai.ats.title', descKey: 'mega.ai.ats.desc', icon: Kanban, badge: 'New', staffOnly: true },
];

/** Partner / developer API — no #anchors that duplicate the portal page. */
const apiDefs: MegaItemDef[] = [
  { href: '/developers', titleKey: 'mega.api.portal.title', descKey: 'mega.api.portal.desc', icon: Code2 },
  {
    href: '/developers/job-agent',
    titleKey: 'mega.api.jobAgent.title',
    descKey: 'mega.api.jobAgent.desc',
    icon: Radar,
    badge: 'New',
  },
  {
    href: `${API_ORIGIN}/api/docs`,
    titleKey: 'mega.api.docs.title',
    descKey: 'mega.api.docs.desc',
    icon: BookOpen,
    external: true,
  },
  {
    href: '/dashboard/developer',
    titleKey: 'mega.api.sandbox.title',
    descKey: 'mega.api.sandbox.desc',
    icon: KeyRound,
    badge: 'Free',
    staffOnly: true,
  },
];

/** Hiring services only — audience landings live under Resources. */
const offerDefs: MegaItemDef[] = [
  {
    href: '/services/direct-recruitment',
    titleKey: 'mega.direct.title',
    descKey: 'mega.direct.desc',
    icon: Building2,
  },
  {
    href: '/services/managed-staffing',
    titleKey: 'mega.managed.title',
    descKey: 'mega.managed.desc',
    icon: Handshake,
  },
  {
    href: '/services/contract-cover',
    titleKey: 'mega.cover.title',
    descKey: 'mega.cover.desc',
    icon: Timer,
  },
  {
    href: '/services/talent-training',
    titleKey: 'mega.train.title',
    descKey: 'mega.train.desc',
    icon: GraduationCap,
  },
];

/** Tools, guides, and who-it's-for pages. */
const resourceDefs: MegaItemDef[] = [
  {
    href: '/jobs',
    titleKey: 'mega.jobs.title',
    descKey: 'mega.jobs.desc',
    icon: Briefcase,
    badge: 'New',
  },
  {
    href: '/resume-builder',
    titleKey: 'mega.cv.title',
    descKey: 'mega.cv.desc',
    icon: FileText,
  },
  {
    href: '/for-employers',
    titleKey: 'mega.employers.title',
    descKey: 'mega.employers.desc',
    icon: Users,
  },
  {
    href: '/for-professionals',
    titleKey: 'mega.professionals.title',
    descKey: 'mega.professionals.desc',
    icon: UserRound,
  },
  {
    href: '/how-it-works',
    titleKey: 'mega.how.title',
    descKey: 'mega.how.desc',
    icon: Route,
  },
  {
    href: '/blog',
    titleKey: 'mega.blog.title',
    descKey: 'mega.blog.desc',
    icon: Newspaper,
  },
];

type MegaItem = {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
  external?: boolean;
  badge?: string;
};

function MegaMenu({ label, items }: { label: string; items: MegaItem[] }) {
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);
  const [panelStyle, setPanelStyle] = useState<CSSProperties>({});
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeTimerRef = useRef<number | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const openMenu = useCallback(() => {
    clearCloseTimer();
    setOpen(true);
  }, [clearCloseTimer]);

  const scheduleClose = useCallback(() => {
    clearCloseTimer();
    closeTimerRef.current = window.setTimeout(() => setOpen(false), 160);
  }, [clearCloseTimer]);

  const positionPanel = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const margin = 16;
    const gap = 14;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const idealWidth = items.length <= 3 ? 22 * 16 : 40 * 16;
    const width = Math.min(idealWidth, Math.max(288, vw - margin * 2));

    let top = Math.max(rect.bottom + gap, margin);
    const maxHeight = Math.max(180, vh - top - margin);

    if (top + 200 > vh - margin) {
      top = Math.max(margin, Math.min(top, vh - margin - 200));
    }

    let left = rect.left + rect.width / 2 - width / 2;
    left = Math.max(margin, Math.min(left, vw - margin - width));

    setPanelStyle({
      position: 'fixed',
      top,
      left,
      width,
      maxHeight,
      zIndex: 80,
    });
  }, [items.length]);

  useLayoutEffect(() => {
    if (!open) return;
    positionPanel();
  }, [open, positionPanel]);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (rootRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    const onReposition = () => positionPanel();

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('resize', onReposition);
    window.addEventListener('scroll', onReposition, true);

    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', onReposition);
      window.removeEventListener('scroll', onReposition, true);
    };
  }, [open, positionPanel]);

  useEffect(() => () => clearCloseTimer(), [clearCloseTimer]);

  const columns = items.length <= 3 ? 1 : 2;

  const panel = mounted
    ? createPortal(
        <AnimatePresence>
          {open ? (
            <motion.div
              key={`mega-${label}`}
              ref={panelRef}
              initial={{ opacity: 0, y: 12, scale: 0.97, clipPath: 'inset(0% 0% 100% 0% round 1rem)' }}
              animate={{ opacity: 1, y: 0, scale: 1, clipPath: 'inset(0% 0% 0% 0% round 1rem)' }}
              exit={{ opacity: 0, y: 6, scale: 0.98, clipPath: 'inset(0% 0% 100% 0% round 1rem)' }}
              transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
              style={{ ...panelStyle, transformOrigin: 'top center' }}
              className="relative overflow-y-auto overscroll-contain rounded-2xl border border-border bg-surface-elevated/98 p-2 shadow-[0_24px_60px_rgba(4,47,46,0.18)] backdrop-blur-md sm:p-3"
              onMouseEnter={openMenu}
              onMouseLeave={scheduleClose}
              role="menu"
              aria-label={label}
            >
              <motion.span
                aria-hidden
                className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-brand to-transparent"
                initial={{ scaleX: 0, opacity: 0 }}
                animate={{ scaleX: 1, opacity: 1 }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              />
              <div
                className={`grid gap-1 ${columns === 2 ? 'min-[720px]:grid-cols-2' : 'grid-cols-1'}`}
                onMouseLeave={() => setHovered(null)}
              >
                {items.map((item, index) => {
                  const Icon = item.icon;
                  const isHovered = hovered === index;
                  return (
                    <motion.div
                      key={item.href + item.title}
                      initial={{ opacity: 0, y: 10, filter: 'blur(4px)' }}
                      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                      transition={{ delay: 0.03 + index * 0.045, duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <Link
                        href={item.href}
                        role="menuitem"
                        target={item.external ? '_blank' : undefined}
                        rel={item.external ? 'noopener noreferrer' : undefined}
                        className="group relative flex gap-3 rounded-xl p-2.5 sm:p-3"
                        onClick={() => setOpen(false)}
                        onMouseEnter={() => setHovered(index)}
                        onFocus={() => setHovered(index)}
                      >
                        {isHovered ? (
                          <motion.span
                            layoutId={`mega-hover-${label}`}
                            className="absolute inset-0 rounded-xl border border-brand/15 bg-surface"
                            transition={{ type: 'spring', stiffness: 480, damping: 38 }}
                          />
                        ) : null}
                        <span className="relative z-10 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand transition-transform duration-300 ease-out group-hover:-rotate-6 group-hover:scale-110 sm:h-10 sm:w-10">
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className="relative z-10 min-w-0 flex-1">
                          <span className="flex items-center gap-1 text-sm font-semibold text-foreground transition-colors duration-200 group-hover:text-brand">
                            {item.title}
                            {item.badge ? (
                              <span className="rounded-full bg-brand px-1.5 py-px text-[9px] font-bold uppercase tracking-wide text-white dark:text-[#071f14]">
                                {item.badge}
                              </span>
                            ) : null}
                            <ArrowUpRight className="h-3.5 w-3.5 -translate-x-1 translate-y-0.5 opacity-0 transition-all duration-300 ease-out group-hover:translate-x-0 group-hover:translate-y-0 group-hover:opacity-100" />
                          </span>
                          <span className="mt-0.5 block text-xs leading-relaxed text-muted">
                            {item.description}
                          </span>
                        </span>
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>,
        document.body,
      )
    : null;

  return (
    <div ref={rootRef} className="relative" onMouseEnter={openMenu} onMouseLeave={scheduleClose}>
      <button
        ref={triggerRef}
        type="button"
        className="link-anim cursor-pointer whitespace-nowrap py-1"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((value) => !value)}
      >
        {label}
        <ChevronDown
          className={`h-3.5 w-3.5 shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {panel}
    </div>
  );
}

function useTranslatedItems(defs: MegaItemDef[], staffOnlyVisible = false): MegaItem[] {
  const { t } = useLocale();
  return useMemo(
    () =>
      defs
        .filter((item) => staffOnlyVisible || !item.staffOnly)
        .map((item) => ({
          href: item.href,
          icon: item.icon,
          external: item.external,
          badge: item.badge,
          title: t(item.titleKey),
          description: t(item.descKey),
        })),
    [defs, staffOnlyVisible, t],
  );
}

function useStaffMenu() {
  const { user } = useAuthSession();
  return Boolean(user && isStaffRole(user.roles));
}

export function HeaderMegaMenu({ label }: { label?: string }) {
  const { t } = useLocale();
  const items = useTranslatedItems(offerDefs);
  return <MegaMenu label={label ?? t('nav.offer')} items={items} />;
}

export function ResourcesMegaMenu({ label }: { label?: string }) {
  const { t } = useLocale();
  const items = useTranslatedItems(resourceDefs);
  return <MegaMenu label={label ?? t('nav.resources')} items={items} />;
}

export function AiMegaMenu({ label }: { label?: string }) {
  const { t } = useLocale();
  const staff = useStaffMenu();
  const items = useTranslatedItems(aiDefs, staff);
  return <MegaMenu label={label ?? t('nav.ai')} items={items} />;
}

export function ApiMegaMenu({ label }: { label?: string }) {
  const { t } = useLocale();
  const staff = useStaffMenu();
  const items = useTranslatedItems(apiDefs, staff);
  return <MegaMenu label={label ?? t('nav.api')} items={items} />;
}

export function useAiItems() {
  const staff = useStaffMenu();
  return useTranslatedItems(aiDefs, staff);
}

export function useApiItems() {
  const staff = useStaffMenu();
  return useTranslatedItems(apiDefs, staff);
}

export function useOfferItems() {
  return useTranslatedItems(offerDefs);
}

export function useResourceItems() {
  return useTranslatedItems(resourceDefs);
}

/** @deprecated Prefer useOfferItems / useResourceItems for live translations */
export const offerItems = offerDefs.map((item) => ({
  href: item.href,
  title: item.titleKey,
  description: item.descKey,
  icon: item.icon,
}));

/** @deprecated Prefer useOfferItems / useResourceItems for live translations */
export const resourceItems = resourceDefs.map((item) => ({
  href: item.href,
  title: item.titleKey,
  description: item.descKey,
  icon: item.icon,
}));
