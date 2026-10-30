'use client';

import { AnimatePresence, motion } from 'framer-motion';
import {
  Building2,
  ChevronDown,
  Handshake,
  Route,
  UserRound,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { AnimatedHamburger } from '@/components/animated-hamburger';
import { BrandLogo } from '@/components/brand-logo';
import { HeaderMegaMenu } from '@/components/header-mega-menu';
import { useModal } from '@/components/modals/modal-context';

import { ThemeToggle } from './theme-toggle';

const links = [
  { href: '/how-it-works', label: 'How it works' },
  { href: '/for-employers', label: 'For employers' },
  { href: '/for-professionals', label: 'For professionals' },
];

const mobileSolutions = [
  { href: '/services/direct-recruitment', label: 'Direct recruitment', icon: Building2 },
  { href: '/services/managed-staffing', label: 'Managed staffing', icon: Handshake },
  { href: '/services', label: 'All services', icon: Route },
  { href: '/for-employers', label: 'For employers', icon: Users },
  { href: '/for-professionals', label: 'For professionals', icon: UserRound },
];

export function SiteHeader() {
  const { open } = useModal();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [solutionsOpen, setSolutionsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

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
    if (!mobileOpen) setSolutionsOpen(false);
  }, [mobileOpen]);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-40 transition-[background,border-color,box-shadow,backdrop-filter] duration-300 ${
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
        <div className="min-w-0 max-w-[46%] min-[280px]:max-w-[52%] min-[340px]:max-w-none">
          <BrandLogo priority />
        </div>

        <nav className="hidden items-center gap-7 text-sm text-muted lg:flex">
          <HeaderMegaMenu />
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="transition hover:text-foreground">
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-1 min-[230px]:gap-1.5 min-[340px]:gap-2 sm:gap-3">
          <ThemeToggle />
          <Link
            href="/auth/login"
            className="hidden text-sm font-medium text-muted transition hover:text-foreground sm:inline"
          >
            Sign in
          </Link>
          <button
            type="button"
            onClick={() => open('hire')}
            className="btn-primary hidden px-4 py-2 text-sm sm:inline-flex"
          >
            Hire talent
          </button>
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
              <button
                type="button"
                className="flex w-full items-center justify-between rounded-xl px-2.5 py-2.5 text-left text-sm font-medium text-foreground min-[340px]:px-3 min-[340px]:py-3"
                aria-expanded={solutionsOpen}
                onClick={() => setSolutionsOpen((value) => !value)}
              >
                <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-brand min-[340px]:text-[11px]">
                  Solutions
                </span>
                <ChevronDown
                  className={`h-4 w-4 text-muted transition-transform ${
                    solutionsOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              <AnimatePresence initial={false}>
                {solutionsOpen ? (
                  <motion.div
                    key="solutions-children"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-1 pb-2">
                      {mobileSolutions.map((item) => {
                        const Icon = item.icon;
                        return (
                          <Link
                            key={item.href + item.label}
                            href={item.href}
                            className="flex items-center gap-2.5 rounded-xl px-2.5 py-2.5 text-sm text-muted transition hover:bg-surface hover:text-foreground min-[340px]:gap-3 min-[340px]:px-3 min-[340px]:py-3"
                            onClick={() => setMobileOpen(false)}
                          >
                            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
                              <Icon className="h-4 w-4" />
                            </span>
                            <span className="min-w-0 break-words">{item.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>

              <div className="my-2 h-px bg-border" />
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="block rounded-xl px-2.5 py-2.5 text-sm text-muted transition hover:bg-surface hover:text-foreground min-[340px]:px-3 min-[340px]:py-3"
                  onClick={() => setMobileOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              <div className="mt-2 grid gap-2">
                <Link
                  href="/auth/login"
                  className="btn-secondary"
                  onClick={() => setMobileOpen(false)}
                >
                  Sign in
                </Link>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => {
                    setMobileOpen(false);
                    open('hire');
                  }}
                >
                  Hire talent
                </button>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </header>
  );
}
