'use client';

import { AnimatePresence, motion } from 'framer-motion';
import {
  Bell,
  Briefcase,
  Building2,
  ChevronRight,
  FileText,
  Headphones,
  LayoutDashboard,
  LogOut,
  Mail,
  Menu,
  Newspaper,
  PanelLeftClose,
  PanelLeftOpen,
  ScrollText,
  Settings,
  UserRound,
  Users,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { BrandLogo } from '@/components/brand-logo';
import { DashboardTour } from '@/components/dashboard/dashboard-tour';
import type { TranslationKey } from '@/components/i18n/dictionaries';
import { LanguageSwitcher } from '@/components/i18n/language-switcher';
import { useLocale } from '@/components/i18n/locale-context';
import { ThemeToggle } from '@/components/theme-toggle';
import { InfoTooltip } from '@/components/ui/info-tooltip';
import { useToast } from '@/components/ui/toast';
import {
  getDashboardHome,
  getRoleGroup,
  type AuthSessionUser,
} from '@/hooks/use-auth-session';
import { apiFetch } from '@/lib/api';
import { logClientAudit } from '@/lib/client-audit';
import { fetchAuthMe } from '@/lib/dashboard-api';
import { cn } from '@/lib/utils';

type NavItem = {
  href: string;
  labelKey: TranslationKey;
  icon: typeof LayoutDashboard;
  help: string;
  /** Spotlight target group for the dashboard tour */
  tour?: 'hiring' | 'admin';
};

const adminNav: NavItem[] = [
  {
    href: '/dashboard',
    labelKey: 'dash.nav.overview',
    icon: LayoutDashboard,
    help: 'High-level counts and recent activity for the whole platform.',
  },
  {
    href: '/dashboard/requests',
    labelKey: 'dash.nav.requests',
    icon: Briefcase,
    help: 'All employer intake requests. Change status as you progress them.',
    tour: 'hiring',
  },
  {
    href: '/dashboard/talent',
    labelKey: 'dash.nav.candidates',
    icon: Users,
    help: 'Screen candidates and build shortlists for open roles.',
    tour: 'hiring',
  },
  {
    href: '/dashboard/blog',
    labelKey: 'dash.nav.blog',
    icon: Newspaper,
    help: 'Write and publish hiring guides for the public site.',
  },
  {
    href: '/dashboard/newsletter',
    labelKey: 'dash.nav.newsletter',
    icon: Mail,
    help: 'Create and send email campaigns to subscribers.',
  },
  {
    href: '/dashboard/mail',
    labelKey: 'dash.nav.mail',
    icon: Mail,
    help: 'Email one user or every user on the platform (admin only).',
    tour: 'admin',
  },
  {
    href: '/dashboard/support',
    labelKey: 'dash.nav.support',
    icon: Headphones,
    help: 'Read and reply to user/client support tickets.',
    tour: 'admin',
  },
  {
    href: '/dashboard/audit',
    labelKey: 'dash.nav.audit',
    icon: ScrollText,
    help: 'Backend and frontend activity trail for compliance review.',
    tour: 'admin',
  },
  {
    href: '/dashboard/users',
    labelKey: 'dash.nav.users',
    icon: UserRound,
    help: 'People with accounts on Dealo and their roles.',
  },
  {
    href: '/dashboard/settings',
    labelKey: 'dash.nav.settings',
    icon: Settings,
    help: 'Your account preferences and security.',
  },
];

const employerNav: NavItem[] = [
  {
    href: '/dashboard',
    labelKey: 'dash.nav.overview',
    icon: LayoutDashboard,
    help: 'A simple summary of your hiring pipeline.',
  },
  {
    href: '/dashboard/requests',
    labelKey: 'dash.nav.myRequests',
    icon: Briefcase,
    help: 'Hiring requests your organization submitted.',
    tour: 'hiring',
  },
  {
    href: '/dashboard/talent',
    labelKey: 'dash.nav.shortlists',
    icon: Users,
    help: 'Vetted candidates shared with you for open roles.',
    tour: 'hiring',
  },
  {
    href: '/dashboard/organization',
    labelKey: 'dash.nav.organization',
    icon: Building2,
    help: 'Company profile and team membership.',
  },
  {
    href: '/dashboard/support',
    labelKey: 'dash.nav.support',
    icon: Headphones,
    help: 'Tickets you opened with Dealo support.',
  },
  {
    href: '/dashboard/settings',
    labelKey: 'dash.nav.settings',
    icon: Settings,
    help: 'Profile and security for your account.',
  },
];

const talentNav: NavItem[] = [
  {
    href: '/dashboard/talent-home',
    labelKey: 'dash.nav.overview',
    icon: LayoutDashboard,
    help: 'Your talent home — profile health and next steps.',
  },
  {
    href: '/dashboard/matches',
    labelKey: 'dash.nav.matches',
    icon: Briefcase,
    help: 'Roles where you appear on an employer shortlist.',
    tour: 'hiring',
  },
  {
    href: '/dashboard/interviews',
    labelKey: 'dash.nav.interviews',
    icon: Users,
    help: 'Interview steps related to your matches.',
    tour: 'hiring',
  },
  {
    href: '/dashboard/documents',
    labelKey: 'dash.nav.documents',
    icon: FileText,
    help: 'Upload CV and certificates Dealo can share with employers.',
  },
  {
    href: '/dashboard/support',
    labelKey: 'dash.nav.support',
    icon: Headphones,
    help: 'Ask Dealo for help with your profile or matches.',
  },
  {
    href: '/dashboard/settings',
    labelKey: 'dash.nav.settings',
    icon: Settings,
    help: 'Account preferences and security.',
  },
];

const SIDEBAR_KEY = 'dealo.dashboard.sidebar.collapsed';

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const toast = useToast();
  const { t } = useLocale();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [user, setUser] = useState<AuthSessionUser | null>(null);

  useEffect(() => {
    setCollapsed(window.localStorage.getItem(SIDEBAR_KEY) === '1');
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const me = await fetchAuthMe();
        if (!active) return;
        setUser(me);
        const home = getDashboardHome(me.roles);
        const group = getRoleGroup(me.roles);
        if (group === 'talent' && pathname === '/dashboard') {
          router.replace(home);
        }
      } catch {
        if (active) {
          toast.error('Session expired', 'Please sign in again.');
          router.replace('/auth/login');
        }
      }
    })();
    return () => {
      active = false;
    };
    // toast is stable; omit from deps to avoid remount loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, router]);

  const nav = useMemo(() => {
    if (!user) return employerNav;
    const group = getRoleGroup(user.roles);
    if (group === 'admin') return adminNav;
    if (group === 'talent') return talentNav;
    return employerNav;
  }, [user]);

  const logout = async () => {
    try {
      await apiFetch('/auth/logout', { method: 'POST' });
      logClientAudit({ action: 'AUTH_LOGOUT_UI', entityType: 'Auth' });
    } catch {
      // still leave
    }
    toast.info('Signed out');
    router.push('/');
    router.refresh();
  };

  const toggleCollapsed = () => {
    setCollapsed((value) => {
      const next = !value;
      window.localStorage.setItem(SIDEBAR_KEY, next ? '1' : '0');
      return next;
    });
  };

  const userName = user
    ? `${user.firstName} ${user.lastName}`.trim() || user.email
    : 'Dealo user';
  const homeHref = user ? getDashboardHome(user.roles) : '/dashboard';
  const roleGroup = user ? getRoleGroup(user.roles) : 'employer';
  const roleLabel =
    roleGroup === 'admin'
      ? t('dash.admin')
      : roleGroup === 'talent'
        ? t('dash.talent')
        : t('dash.employer');

  const renderNavLink = (
    item: NavItem,
    opts: { onNavigate?: () => void; compact?: boolean },
  ) => {
    const Icon = item.icon;
    const label = t(item.labelKey);
    const active =
      pathname === item.href ||
      (item.href !== '/dashboard' &&
        item.href !== '/dashboard/talent-home' &&
        pathname.startsWith(item.href));
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={opts.onNavigate}
        title={opts.compact ? label : undefined}
        className={cn(
          'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
          opts.compact && 'justify-center px-2',
          active
            ? 'bg-brand text-white dark:text-[#071f14]'
            : 'text-muted hover:bg-surface hover:text-foreground',
        )}
      >
        <motion.span
          className="inline-flex shrink-0"
          whileHover={{ scale: 1.15, rotate: -8 }}
          transition={{ type: 'spring', stiffness: 420, damping: 16 }}
        >
          <Icon className="h-4 w-4" />
        </motion.span>
        {!opts.compact ? (
          <>
            <span className="min-w-0 flex-1 truncate">{label}</span>
            <InfoTooltip label={label} content={item.help} className="opacity-70" />
          </>
        ) : null}
      </Link>
    );
  };

  const NavItems = ({
    onNavigate,
    compact,
  }: {
    onNavigate?: () => void;
    compact?: boolean;
  }) => {
    const groups: Array<{ tour?: NavItem['tour']; items: NavItem[] }> = [];
    for (const item of nav) {
      const last = groups[groups.length - 1];
      if (last && last.tour === item.tour) {
        last.items.push(item);
      } else {
        groups.push({ tour: item.tour, items: [item] });
      }
    }

    return (
      <nav className="space-y-1">
        {groups.map((group, index) => {
          const wrapperTour =
            group.tour === 'hiring'
              ? 'nav-hiring'
              : group.tour === 'admin'
                ? 'nav-admin'
                : undefined;
          const content = group.items.map((item) =>
            renderNavLink(item, { onNavigate, compact }),
          );
          if (!wrapperTour) {
            return <div key={`nav-group-${index}`}>{content}</div>;
          }
          return (
            <div key={`nav-group-${index}`} data-tour={wrapperTour} className="space-y-1">
              {content}
            </div>
          );
        })}
      </nav>
    );
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex min-h-screen">
        <motion.aside
          data-tour="sidebar"
          animate={{ width: collapsed ? 84 : 256 }}
          transition={{ type: 'spring', stiffness: 280, damping: 30 }}
          className="sticky top-0 hidden h-screen shrink-0 flex-col overflow-hidden border-r border-border bg-surface/50 p-3 lg:flex"
        >
          <div data-tour="sidebar-controls" className={cn(collapsed ? 'space-y-2' : 'space-y-3')}>
            <div className={cn('flex items-center', collapsed ? 'justify-center' : 'justify-between')}>
              {!collapsed ? <BrandLogo href={homeHref} /> : null}
              <button
                type="button"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted transition hover:text-foreground"
                aria-label={collapsed ? t('dash.expand') : t('dash.collapse')}
                onClick={toggleCollapsed}
              >
                {collapsed ? (
                  <PanelLeftOpen className="h-4 w-4" />
                ) : (
                  <PanelLeftClose className="h-4 w-4" />
                )}
              </button>
            </div>

            {!collapsed ? (
              <div className="rounded-xl border border-border bg-surface-elevated/80 px-3 py-2.5">
                <div className="flex items-center gap-1.5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-brand">
                    {t('dash.workspace')}
                  </p>
                  <InfoTooltip
                    label="Workspace"
                    content="Your role decides which menu items you see. Admins see platform tools; employers and talent see their own workspace."
                  />
                </div>
                <p className="mt-1 text-sm font-medium text-foreground">{roleLabel}</p>
              </div>
            ) : null}
          </div>

          <div className="mt-6 flex-1 overflow-y-auto">
            <NavItems compact={collapsed} />
          </div>

          <button
            type="button"
            onClick={logout}
            className={cn(
              'mt-4 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted transition hover:bg-surface hover:text-foreground',
              collapsed && 'justify-center px-2',
            )}
          >
            <motion.span whileHover={{ x: 2 }}>
              <LogOut className="h-4 w-4" />
            </motion.span>
            {!collapsed ? t('dash.signOut') : null}
          </button>
        </motion.aside>

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
                  <BrandLogo href={homeHref} />
                </div>
                <div className="hidden items-center text-sm text-muted sm:flex">
                  {roleLabel}
                  <ChevronRight className="mx-1 inline h-3.5 w-3.5" />
                  <span className="text-foreground">Dashboard</span>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1.5 min-[340px]:gap-2 sm:gap-3">
                <div
                  data-tour="header-helpers"
                  className="flex items-center gap-1.5 min-[340px]:gap-2"
                >
                  <DashboardTour />
                  <LanguageSwitcher className="hidden md:inline-flex" />
                </div>
                <button
                  type="button"
                  className="hidden h-9 w-9 items-center justify-center rounded-full border border-border min-[280px]:inline-flex min-[340px]:h-10 min-[340px]:w-10"
                  aria-label="Notifications"
                >
                  <motion.span whileHover={{ rotate: 12 }}>
                    <Bell className="h-4 w-4" />
                  </motion.span>
                </button>
                <ThemeToggle />
                <div className="hidden max-w-[11rem] truncate rounded-full border border-border bg-surface-elevated px-3 py-1.5 text-sm sm:block">
                  {userName}
                </div>
              </div>
            </div>
          </header>

          <motion.main
            key={pathname}
            data-tour="main-content"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="dash-atmosphere flex-1 px-2.5 py-5 min-[230px]:px-3 min-[340px]:px-5 min-[340px]:py-6 sm:px-6 sm:py-8"
          >
            {children}
          </motion.main>
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
                <BrandLogo href={homeHref} />
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
                {t('dash.signOut')}
              </button>
            </motion.aside>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
