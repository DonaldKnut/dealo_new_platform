'use client';

import { AnimatePresence, motion } from 'framer-motion';
import {
  BookOpen,
  Building2,
  ChevronDown,
  Code2,
  Handshake,
  Newspaper,
  Route,
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

type MegaItemDef = {
  href: string;
  titleKey: TranslationKey;
  descKey: TranslationKey;
  icon: LucideIcon;
};

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
    href: '/how-it-works',
    titleKey: 'mega.how.title',
    descKey: 'mega.how.desc',
    icon: Route,
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
    href: '/developers',
    titleKey: 'mega.developers.title',
    descKey: 'mega.developers.desc',
    icon: Code2,
  },
];

const resourceDefs: MegaItemDef[] = [
  {
    href: '/blog',
    titleKey: 'mega.blog.title',
    descKey: 'mega.blog.desc',
    icon: Newspaper,
  },
  {
    href: '/for-employers',
    titleKey: 'mega.employerInsights.title',
    descKey: 'mega.employerInsights.desc',
    icon: BookOpen,
  },
  {
    href: '/for-professionals',
    titleKey: 'mega.careerInsights.title',
    descKey: 'mega.careerInsights.desc',
    icon: BookOpen,
  },
];

type MegaItem = {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
};

function MegaMenu({ label, items }: { label: string; items: MegaItem[] }) {
  const [open, setOpen] = useState(false);
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
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.98 }}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
              style={panelStyle}
              className="overflow-y-auto overscroll-contain rounded-2xl border border-border bg-surface-elevated/98 p-2 shadow-[0_24px_60px_rgba(4,47,46,0.18)] backdrop-blur-md sm:p-3"
              onMouseEnter={openMenu}
              onMouseLeave={scheduleClose}
              role="menu"
              aria-label={label}
            >
              <div
                className={`grid gap-1 ${columns === 2 ? 'min-[720px]:grid-cols-2' : 'grid-cols-1'}`}
              >
                {items.map((item, index) => {
                  const Icon = item.icon;
                  return (
                    <motion.div
                      key={item.href + item.title}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.04, duration: 0.22 }}
                    >
                      <Link
                        href={item.href}
                        role="menuitem"
                        className="group flex gap-3 rounded-xl p-2.5 transition hover:bg-surface sm:p-3"
                        onClick={() => setOpen(false)}
                      >
                        <motion.span
                          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand sm:h-10 sm:w-10"
                          whileHover={{ scale: 1.12, rotate: -6 }}
                          whileTap={{ scale: 0.95 }}
                          transition={{ type: 'spring', stiffness: 420, damping: 18 }}
                        >
                          <Icon className="h-4 w-4" />
                        </motion.span>
                        <span className="min-w-0">
                          <span className="block text-sm font-semibold text-foreground transition group-hover:text-brand">
                            {item.title}
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
        className="inline-flex cursor-pointer items-center gap-1 whitespace-nowrap transition hover:text-foreground"
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

function useTranslatedItems(defs: MegaItemDef[]): MegaItem[] {
  const { t } = useLocale();
  return useMemo(
    () =>
      defs.map((item) => ({
        href: item.href,
        icon: item.icon,
        title: t(item.titleKey),
        description: t(item.descKey),
      })),
    [defs, t],
  );
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
