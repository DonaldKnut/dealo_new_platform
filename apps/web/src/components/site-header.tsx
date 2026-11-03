'use client';

import { AnimatePresence, motion } from 'framer-motion';
import {
  ChevronDown,
  LayoutDashboard,
  LogOut,
  Settings,
  UserRound,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { AnimatedHamburger } from '@/components/animated-hamburger';
import { BrandLogo } from '@/components/brand-logo';
import {
  AiMegaMenu,
  ApiMegaMenu,
  HeaderMegaMenu,
  ResourcesMegaMenu,
  useAiItems,
  useApiItems,
  useOfferItems,
  useResourceItems,
} from '@/components/header-mega-menu';
import { LanguageSwitcher } from '@/components/i18n/language-switcher';
import { useLocale } from '@/components/i18n/locale-context';
import { useModal } from '@/components/modals/modal-context';
import {
  getPrimaryCta,
  useAuthSession,
} from '@/hooks/use-auth-session';
import { apiFetch } from '@/lib/api';

import { ThemeToggle } from './theme-toggle';

export function SiteHeader() {
  const { open } = useModal();
  const router = useRouter();
  const { t } = useLocale();
  const offerItems = useOfferItems();
  const resourceItems = useResourceItems();
  const aiItems = useAiItems();
  const apiItems = useApiItems();
  const { user, loading, refresh } = useAuthSession();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileSection, setMobileSection] = useState<string | null>(null);
  const [accountOpen, setAccountOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 18);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  useEffect(() => {
    if (!mobileOpen) setMobileSection(null);
  }, [mobileOpen]);

  const mobileSections = [
    { id: 'offer', label: t('nav.offer'), items: offerItems },
    { id: 'ai', label: t('nav.ai'), items: aiItems },
    { id: 'api', label: t('nav.api'), items: apiItems },
    { id: 'resources', label: t('nav.resources'), items: resourceItems },
  ];

  useEffect(() => {
    if (!accountOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!accountRef.current?.contains(event.target as Node)) setAccountOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [accountOpen]);

  const cta = user ? getPrimaryCta(user.roles) : null;
  const displayName = user
    ? `${user.firstName} ${user.lastName}`.trim() || user.email
    : '';

  const logout = async () => {
    try {
      await apiFetch('/auth/logout', { method: 'POST' });
    } catch {
      // continue
    }
    setAccountOpen(false);
    setMobileOpen(false);
    await refresh();
    router.push('/');
    router.refresh();
  };

  return (
    <header
      className={`fixed inset-x-0 top-0 z-40 pt-[var(--safe-top)] transition-[background,border-color,box-shadow,backdrop-filter] duration-300 ${
        scrolled || mobileOpen
          ? 'border-b border-border backdrop-blur-md'
          : 'border-b border-transparent bg-transparent'
      }`}
      style={
        scrolled || mobileOpen
          ? { background: 'var(--header-bg)', boxShadow: '0 8px 28px rgba(4, 47, 46, 0.06)' }
          : undefined
      }
    >
      <div className="container-page flex h-14 items-center justify-between gap-1.5 min-[230px]:gap-2 min-[340px]:h-[4.25rem] min-[340px]:gap-3 sm:h-20 sm:gap-4">
        <div className="flex min-w-0 flex-1 items-center gap-4 min-[340px]:gap-5 xl:gap-8">
          <div className="min-w-0 max-w-[46%] min-[280px]:max-w-[52%] min-[340px]:max-w-none">
            <BrandLogo priority />
          </div>

          <nav className="hidden items-center gap-4 text-sm text-muted xl:gap-6 lg:flex">
            <HeaderMegaMenu label={t('nav.offer')} />
            <AiMegaMenu label={t('nav.ai')} />
            <ApiMegaMenu label={t('nav.api')} />
            <ResourcesMegaMenu label={t('nav.resources')} />
            <button type="button" className="link-anim whitespace-nowrap py-1" onClick={() => open('faq')}>
              {t('nav.faq')}
            </button>
            <Link href="/contact" className="link-anim whitespace-nowrap py-1">
              {t('nav.contact')}
            </Link>
          </nav>
        </div>

        <div className="flex shrink-0 items-center gap-1 min-[230px]:gap-1.5 min-[340px]:gap-2 sm:gap-3">
          <LanguageSwitcher className="hidden sm:inline-flex" />
          <ThemeToggle />

          {!loading && user ? (
            <>
              <div ref={accountRef} className="relative hidden sm:block">
                <button
                  type="button"
                  className="inline-flex max-w-[10rem] items-center gap-2 rounded-full border border-border bg-surface-elevated px-3 py-1.5 text-sm font-medium text-foreground transition hover:border-brand/40"
                  onClick={() => setAccountOpen((value) => !value)}
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-soft text-xs font-bold text-brand">
                    {(user.firstName?.[0] || user.email[0] || 'D').toUpperCase()}
                  </span>
                  <span className="truncate">{user.firstName || 'Account'}</span>
                  <ChevronDown className="h-3.5 w-3.5 text-muted" />
                </button>
                <AnimatePresence>
                  {accountOpen ? (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 4 }}
                      className="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl border border-border bg-surface-elevated p-1.5 shadow-xl"
                    >
                      <p className="truncate px-3 py-2 text-xs text-muted">{displayName}</p>
                      <Link
                        href={cta?.href ?? '/dashboard'}
                        className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-foreground hover:bg-surface"
                        onClick={() => setAccountOpen(false)}
                      >
                        <LayoutDashboard className="h-4 w-4 text-brand" />
                        {t('nav.dashboard')}
                      </Link>
                      <Link
                        href="/dashboard/settings"
                        className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-foreground hover:bg-surface"
                        onClick={() => setAccountOpen(false)}
                      >
                        <Settings className="h-4 w-4 text-brand" />
                        {t('nav.settings')}
                      </Link>
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-foreground hover:bg-surface"
                        onClick={() => void logout()}
                      >
                        <LogOut className="h-4 w-4 text-brand" />
                        {t('nav.signOut')}
                      </button>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>
              {cta ? (
                <Link
                  href={cta.href}
                  className="btn-primary hidden px-4 py-2 text-sm sm:inline-flex"
                >
                  {cta.label}
                </Link>
              ) : null}
            </>
          ) : (
            <>
              <Link
                href="/auth/login"
                className="link-anim hidden py-1 text-sm font-medium text-muted sm:inline-flex"
              >
                {t('nav.signIn')}
              </Link>
              <button
                type="button"
                onClick={() => open('hire')}
                className="btn-primary hidden px-4 py-2 text-sm sm:inline-flex"
              >
                {t('nav.hireTalent')}
              </button>
            </>
          )}

          <AnimatedHamburger open={mobileOpen} onToggle={() => setMobileOpen((value) => !value)} />
        </div>
      </div>

      <AnimatePresence>
        {mobileOpen ? (
          <motion.div
            key="mobile-nav"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden border-t border-border bg-surface-elevated/95 backdrop-blur-md lg:hidden"
          >
            <div className="flex max-h-[calc(100svh-3.5rem)] flex-col gap-1 overflow-y-auto px-3 py-3 min-[340px]:px-4 min-[340px]:py-4">
              <LanguageSwitcher variant="row" />
              {mobileSections.map((section) => (
                <MobileSection
                  key={section.id}
                  label={section.label}
                  open={mobileSection === section.id}
                  onToggle={() =>
                    setMobileSection((current) => (current === section.id ? null : section.id))
                  }
                  items={section.items}
                  onNavigate={() => setMobileOpen(false)}
                />
              ))}
              <button
                type="button"
                className="rounded-xl px-2.5 py-2.5 text-left text-sm font-medium text-foreground transition hover:bg-surface min-[340px]:px-3 min-[340px]:py-3"
                onClick={() => {
                  setMobileOpen(false);
                  open('faq');
                }}
              >
                {t('nav.faq')}
              </button>
              <Link
                href="/contact"
                className="rounded-xl px-2.5 py-2.5 text-sm font-medium text-foreground transition hover:bg-surface min-[340px]:px-3 min-[340px]:py-3"
                onClick={() => setMobileOpen(false)}
              >
                {t('nav.contact')}
              </Link>

              <div className="my-2 h-px bg-border" />

              {user ? (
                <div className="mt-2 grid gap-2">
                  <p className="px-2 text-xs text-muted">{displayName}</p>
                  <Link
                    href={cta?.href ?? '/dashboard'}
                    className="btn-primary"
                    onClick={() => setMobileOpen(false)}
                  >
                    {cta?.label ?? t('nav.dashboard')}
                  </Link>
                  <Link
                    href="/dashboard/settings"
                    className="btn-secondary"
                    onClick={() => setMobileOpen(false)}
                  >
                    {t('nav.settings')}
                  </Link>
                  <button type="button" className="btn-secondary" onClick={() => void logout()}>
                    {t('nav.signOut')}
                  </button>
                </div>
              ) : (
                <div className="mt-2 grid gap-2">
                  <Link
                    href="/auth/login"
                    className="btn-secondary"
                    onClick={() => setMobileOpen(false)}
                  >
                    {t('nav.signIn')}
                  </Link>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => {
                      setMobileOpen(false);
                      open('hire');
                    }}
                  >
                    {t('nav.hireTalent')}
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </header>
  );
}

function MobileSection({
  label,
  open,
  onToggle,
  items,
  onNavigate,
}: {
  label: string;
  open: boolean;
  onToggle: () => void;
  items: Array<{ href: string; title: string; icon: typeof UserRound; external?: boolean; badge?: string }>;
  onNavigate: () => void;
}) {
  return (
    <>
      <button
        type="button"
        className="flex w-full items-center justify-between rounded-xl px-2.5 py-2.5 text-left text-sm font-medium text-foreground min-[340px]:px-3 min-[340px]:py-3"
        aria-expanded={open}
        onClick={onToggle}
      >
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-brand min-[340px]:text-[11px]">
          {label}
        </span>
        <ChevronDown
          className={`h-4 w-4 text-muted transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="space-y-1 pb-2">
              {items.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href + item.title}
                    href={item.href}
                    target={item.external ? '_blank' : undefined}
                    rel={item.external ? 'noopener noreferrer' : undefined}
                    className="group flex items-center gap-2.5 rounded-xl px-2.5 py-2.5 text-sm text-muted transition-colors hover:bg-surface hover:text-foreground min-[340px]:gap-3 min-[340px]:px-3 min-[340px]:py-3"
                    onClick={onNavigate}
                  >
                    <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand transition-transform duration-300 ease-out group-hover:-rotate-6 group-hover:scale-110">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 break-words transition-transform duration-300 ease-out group-hover:translate-x-1">
                      {item.title}
                    </span>
                    {item.badge ? (
                      <span className="ml-auto shrink-0 rounded-full bg-brand px-1.5 py-px text-[9px] font-bold uppercase text-white dark:text-[#071f14]">
                        {item.badge}
                      </span>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
