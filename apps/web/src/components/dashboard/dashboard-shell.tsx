'use client';

import { AnimatePresence, motion } from 'framer-motion';
import {
  Bell,
  Briefcase,
  Building2,
  ChevronRight,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  Users,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { BrandLogo } from '@/components/brand-logo';
import { ThemeToggle } from '@/components/theme-toggle';
import { apiFetch } from '@/lib/api';
import { fetchAuthMe } from '@/lib/dashboard-api';
import { cn } from '@/lib/utils';

const nav = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/dashboard/requests', label: 'Hiring requests', icon: Briefcase },
  { href: '/dashboard/talent', label: 'Talent pipeline', icon: Users },
  { href: '/dashboard/organization', label: 'Organization', icon: Building2 },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
];

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userName, setUserName] = useState('Dealo user');

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const me = await fetchAuthMe();
        if (active) setUserName(`${me.firstName} ${me.lastName}`.trim() || me.email);
      } catch {
        if (active) router.replace('/auth/login');
      }
    })();
    return () => {
      active = false;
    };
  }, [router]);

  const logout = async () => {
    try {
      await apiFetch('/auth/logout', { method: 'POST' });
    } catch {
      // still leave
    }
    router.push('/');
    router.refresh();
  };

  const NavItems = ({ onNavigate }: { onNavigate?: () => void }) => (
    <nav className="space-y-1">
      {nav.map((item) => {
        const Icon = item.icon;
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
              active
                ? 'bg-brand text-white dark:text-[#071f14]'
                : 'text-muted hover:bg-surface hover:text-foreground',
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex min-h-screen">
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-border bg-surface/40 p-4 lg:flex">
          <BrandLogo href="/dashboard" />
          <div className="mt-8 flex-1">
            <NavItems />
          </div>
          <button
            type="button"
            onClick={logout}
            className="mt-4 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted transition hover:bg-surface hover:text-foreground"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur-md">
            <div className="flex h-14 items-center justify-between gap-2 px-2.5 min-[230px]:px-3 min-[340px]:h-16 min-[340px]:gap-3 min-[340px]:px-5 sm:px-6">
              <div className="flex min-w-0 items-center gap-2 min-[340px]:gap-3">
                <button
                  type="button"
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border min-[340px]:h-10 min-[340px]:w-10 lg:hidden"
                  aria-label="Open navigation"
                  onClick={() => setMobileOpen(true)}
                >
                  <Menu className="h-4 w-4" />
                </button>
                <div className="min-w-0 lg:hidden">
                  <BrandLogo href="/dashboard" />
                </div>
                <div className="hidden text-sm text-muted sm:block">
                  Workspace
                  <ChevronRight className="mx-1 inline h-3.5 w-3.5" />
                  <span className="text-foreground">Dashboard</span>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1.5 min-[340px]:gap-2 sm:gap-3">
                <button
                  type="button"
                  className="hidden h-9 w-9 items-center justify-center rounded-full border border-border min-[280px]:inline-flex min-[340px]:h-10 min-[340px]:w-10"
                  aria-label="Notifications"
                >
                  <Bell className="h-4 w-4" />
                </button>
                <ThemeToggle />
                <div className="hidden max-w-[9rem] truncate rounded-full border border-border px-3 py-1.5 text-sm sm:block">
                  {userName}
                </div>
              </div>
            </div>
          </header>

          <main className="flex-1 px-2.5 py-5 min-[230px]:px-3 min-[340px]:px-5 min-[340px]:py-6 sm:px-6 sm:py-8">
            {children}
          </main>
        </div>
      </div>

      <AnimatePresence>
        {mobileOpen ? (
          <motion.div
            className="fixed inset-0 z-50 lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <button
              type="button"
              className="absolute inset-0 bg-black/40"
              aria-label="Close navigation"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
              className="absolute inset-y-0 left-0 flex w-[min(18rem,92vw)] flex-col border-r border-border bg-background p-4"
            >
              <div className="mb-6 flex items-center justify-between gap-2">
                <BrandLogo href="/dashboard" />
                <button
                  type="button"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border"
                  onClick={() => setMobileOpen(false)}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <NavItems onNavigate={() => setMobileOpen(false)} />
              <button
                type="button"
                onClick={logout}
                className="mt-auto flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </motion.aside>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
