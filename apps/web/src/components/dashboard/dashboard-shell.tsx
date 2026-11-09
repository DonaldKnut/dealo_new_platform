'use client';

import { AnimatePresence, motion } from 'framer-motion';
import {
  Briefcase,
  Building2,
  ChevronRight,
  FileText,
  Headphones,
  IdCard,
  Kanban,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Mail,
  Menu,
  Newspaper,
  PanelLeftClose,
  MapPinCheck,
  PanelLeftOpen,
  Plus,
  Radar,
  ScrollText,
  Send,
  Settings,
  UserRound,
  UserSearch,
  Users,
  Webhook,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { BrandLogo } from '@/components/brand-logo';
import { DashboardSessionContext } from '@/components/dashboard/dashboard-session';
import { DashboardTour } from '@/components/dashboard/dashboard-tour';
import { NotificationCenter } from '@/components/dashboard/notification-center';
import { OnboardingModal } from '@/components/dashboard/onboarding-modal';
import { UserAvatar, UserMenu } from '@/components/dashboard/user-menu';
import { useModal } from '@/components/modals/modal-context';
import type { TranslationKey } from '@/components/i18n/dictionaries';
import { LanguageSwitcher } from '@/components/i18n/language-switcher';
import { useLocale } from '@/components/i18n/locale-context';
import { ThemeToggle } from '@/components/theme-toggle';
import { InfoTooltip } from '@/components/ui/info-tooltip';
import { useToast } from '@/components/ui/toast';
import { getDashboardHome, getRoleGroup, type AuthSessionUser } from '@/hooks/use-auth-session';
import { ApiError, apiFetch } from '@/lib/api';
import { atsApi } from '@/lib/ats-api';
import { logClientAudit } from '@/lib/client-audit';
import { fetchAuthMe } from '@/lib/dashboard-api';
import { VerifyEmailBanner } from '@/components/dashboard/verify-email-banner';
import { WhatsAppIcon } from '@/components/whatsapp-icon';
import { whatsappHref, whatsappMessageFor } from '@/lib/whatsapp';
import { takeReturnTo } from '@/lib/resume-api';
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
    href: '/dashboard/ats',
    labelKey: 'dash.nav.ats',
    icon: Kanban,
    help: 'Dealo ATS: jobs, applicants, the hiring board and your team.',
    tour: 'hiring',
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
    href: '/dashboard/professionals',
    labelKey: 'dash.nav.professionals',
    icon: UserSearch,
    help: 'Everyone who signed up as a professional, with their profile and CV.',
    tour: 'hiring',
  },
  {
    href: '/dashboard/resumes',
    labelKey: 'dash.nav.resumes',
    icon: FileText,
    help: 'The CV builder as job seekers see it. Give premium from Users.',
    tour: 'hiring',
  },
  {
    href: '/dashboard/workforce',
    labelKey: 'dash.nav.workforce',
    icon: Radar,
    help: 'Live sites: check-ins, no-shows, standby cover and the placement agent feed.',
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
    href: '/dashboard/api-keys',
    labelKey: 'dash.nav.apiKeys',
    icon: KeyRound,
    help: 'Create and revoke partner API keys for the commercial Dealo API.',
    tour: 'admin',
  },
  {
    href: '/dashboard/developer',
    labelKey: 'dash.nav.developer',
    icon: Webhook,
    help: 'Sandbox keys and signed webhooks (admins can add global webhooks).',
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
    href: '/dashboard/ats',
    labelKey: 'dash.nav.ats',
    icon: Kanban,
    help: 'Post jobs, get applicants and move them through your hiring steps. Free in early access.',
    tour: 'hiring',
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
    href: '/dashboard/developer',
    labelKey: 'dash.nav.developer',
    icon: KeyRound,
    help: 'Sandbox API keys to connect Dealo to your own tools.',
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
    href: '/dashboard/check-in',
    labelKey: 'dash.nav.checkIn',
    icon: MapPinCheck,
    help: 'Check in and out at your work site from your phone.',
  },
  {
    href: '/dashboard/profile',
    labelKey: 'dash.nav.profile',
    icon: IdCard,
    help: 'Your details, skills and CV. Recruiters use this to match you.',
  },
  {
    href: '/dashboard/resumes',
    labelKey: 'dash.nav.resumes',
    icon: FileText,
    help: 'Build, edit and download CVs and cover letters.',
  },
  {
    href: '/dashboard/applications',
    labelKey: 'dash.nav.applications',
    icon: Send,
    help: 'Jobs you applied for or saved on the Dealo job board.',
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
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [companyName, setCompanyName] = useState<string | null>(null);
  const { open: openModal } = useModal();

  useEffect(() => {
    setCollapsed(window.localStorage.getItem(SIDEBAR_KEY) === '1');
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const me = await fetchAuthMe();
        if (!active) return;
        setSessionError(null);
        setUser(me);
        const returnTo = takeReturnTo();
        if (returnTo) {
          router.replace(returnTo);
          return;
        }
        const home = getDashboardHome(me.roles);
        const group = getRoleGroup(me.roles);
        if (group === 'talent' && pathname === '/dashboard') {
          router.replace(home);
        }
      } catch (error) {
        if (!active) return;
        // Only a real "not signed in" answer signs you out; a slow or broken server gets a retry screen instead.
        if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
          toast.error('Session expired', 'Please sign in again.');
          router.replace(`/auth/login?next=${encodeURIComponent(pathname)}`);
        } else {
          setSessionError(error instanceof ApiError ? error.message : 'Could not reach Dealo.');
        }
      }
    })();
    return () => {
      active = false;
    };
    // toast is stable; omit from deps to avoid remount loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, router, attempt]);

  const userId = user?.id;
  const isEmployer = user ? getRoleGroup(user.roles) === 'employer' : false;
  const onboarding = Boolean(user?.needsOnboarding);
  useEffect(() => {
    if (!userId || !isEmployer || onboarding) return;
    let active = true;
    atsApi
      .workspaces()
      .then((list) => active && setCompanyName(list[0]?.name ?? null))
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [userId, isEmployer, onboarding]);

  const finishOnboarding = async () => {
    const me = await fetchAuthMe();
    setUser(me);
    router.replace(
      getRoleGroup(me.roles) === 'employer'
        ? '/dashboard/organization'
        : getDashboardHome(me.roles),
    );
  };

  const openHireRequest = () =>
    openModal('hire', {
      hirePrefill: user
        ? {
            contactName: `${user.firstName} ${user.lastName}`.trim(),
            email: user.email,
            companyName: companyName ?? undefined,
          }
        : undefined,
    });

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

  const userName = user ? `${user.firstName} ${user.lastName}`.trim() || user.email : 'Dealo user';
  const homeHref = user ? getDashboardHome(user.roles) : '/dashboard';
  const whatsapp = whatsappHref(whatsappMessageFor(pathname, t('wa.prefill')));
  const roleGroup = user ? getRoleGroup(user.roles) : 'employer';
  const roleLabel =
    roleGroup === 'admin'
      ? t('dash.admin')
      : roleGroup === 'talent'
        ? t('dash.talent')
        : t('dash.employer');

  const isActive = (href: string) =>
    pathname === href ||
    (href !== '/dashboard' && href !== '/dashboard/talent-home' && pathname.startsWith(href));

  const renderNavLink = (
    item: NavItem,
    opts: { onNavigate?: () => void; compact?: boolean; scope: string; index: number },
  ) => {
    const Icon = item.icon;
    const label = t(item.labelKey);
    const active = isActive(item.href);
    return (
      <motion.div
        key={item.href}
        initial={opts.scope === 'drawer' ? { opacity: 0, x: -12 } : false}
        animate={{ opacity: 1, x: 0 }}
        transition={{
          delay: opts.scope === 'drawer' ? 0.04 + opts.index * 0.03 : 0,
          duration: 0.24,
        }}
      >
        <Link
          href={item.href}
          onClick={opts.onNavigate}
          title={opts.compact ? label : undefined}
          aria-current={active ? 'page' : undefined}
          className={cn(
            'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors duration-200',
            opts.compact && 'justify-center px-2',
            active ? 'text-white dark:text-[#071f14]' : 'text-muted hover:text-foreground',
          )}
        >
          {active ? (
            <motion.span
              layoutId={`dash-nav-active-${opts.scope}`}
              className="absolute inset-0 rounded-xl bg-brand shadow-[0_10px_24px_-12px_color-mix(in_srgb,var(--brand)_90%,transparent)]"
              transition={{ type: 'spring', stiffness: 420, damping: 34 }}
            />
          ) : (
            <>
              <span className="absolute inset-0 rounded-xl bg-surface opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
              <span className="absolute left-0 top-1/2 h-0 w-[3px] -translate-y-1/2 rounded-full bg-brand transition-all duration-300 ease-out group-hover:h-5" />
            </>
          )}
          <span className="relative z-10 inline-flex shrink-0 transition-transform duration-300 ease-out group-hover:scale-110 group-hover:-rotate-6">
            <Icon className="h-4 w-4" />
          </span>
          {!opts.compact ? (
            <>
              <span className="relative z-10 min-w-0 flex-1 truncate transition-transform duration-300 ease-out group-hover:translate-x-0.5">
                {label}
              </span>
              <InfoTooltip label={label} content={item.help} className="relative z-10 opacity-70" />
            </>
          ) : null}
        </Link>
      </motion.div>
    );
  };

  const NavItems = ({
    onNavigate,
    compact,
    scope,
  }: {
    onNavigate?: () => void;
    compact?: boolean;
    scope: string;
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
            renderNavLink(item, { onNavigate, compact, scope, index: nav.indexOf(item) }),
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

  if (!user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-6 text-center text-foreground">
        <BrandLogo href="/" />
        {sessionError ? (
          <div className="max-w-sm space-y-3">
            <p className="font-display text-xl">We can’t reach Dealo right now</p>
            <p className="text-sm text-muted">
              {sessionError} Our servers may be waking up; this can take up to a minute.
            </p>
            <div className="flex justify-center gap-2">
              <button
                type="button"
                className="btn-primary text-sm"
                onClick={() => {
                  setSessionError(null);
                  setAttempt((n) => n + 1);
                }}
              >
                Try again
              </button>
              <Link href="/" className="btn-secondary text-sm">
                Go home
              </Link>
            </div>
          </div>
        ) : (
          <p className="flex items-center gap-2 text-sm text-muted" role="status">
            <span
              className="h-4 w-4 animate-spin rounded-full border-2 border-brand border-t-transparent"
              aria-hidden
            />{' '}
            Checking your account…
          </p>
        )}
      </div>
    );
  }

  return (
    <DashboardSessionContext.Provider value={{ user, setUser, companyName }}>
      <div className="min-h-screen bg-background text-foreground">
        {user.needsOnboarding ? <OnboardingModal user={user} onDone={finishOnboarding} /> : null}
        <div className="flex min-h-screen">
          <motion.aside
            data-tour="sidebar"
            animate={{ width: collapsed ? 84 : 256 }}
            transition={{ type: 'spring', stiffness: 280, damping: 30 }}
            className="sticky top-0 hidden h-screen shrink-0 flex-col overflow-hidden border-r border-border bg-surface/50 p-3 lg:flex"
          >
            <div data-tour="sidebar-controls" className={cn(collapsed ? 'space-y-2' : 'space-y-3')}>
              <div
                className={cn(
                  'flex items-center',
                  collapsed ? 'justify-center' : 'justify-between',
                )}
              >
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
              <NavItems compact={collapsed} scope="sidebar" />
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
            <header className="sticky top-0 z-30 border-b border-border bg-background/90 pt-[var(--safe-top)] backdrop-blur-md">
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
                  {whatsapp ? (
                    <a
                      href={whatsapp}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Chat with us on WhatsApp"
                      title="Chat with us on WhatsApp"
                      className="hidden h-9 items-center justify-center gap-1.5 rounded-full bg-[#25D366] px-2.5 text-sm font-semibold text-[#073b1f] transition hover:brightness-95 min-[300px]:inline-flex min-[340px]:h-10 min-[340px]:px-3"
                    >
                      <WhatsAppIcon className="h-4 w-4" />
                      <span className="hidden xl:inline">Chat with us</span>
                    </a>
                  ) : null}
                  {roleGroup === 'employer' ? (
                    <button
                      type="button"
                      onClick={openHireRequest}
                      className="btn-primary hidden h-10 px-4 text-sm lg:inline-flex"
                    >
                      <Plus className="h-4 w-4" /> Request a hire
                    </button>
                  ) : null}
                  <NotificationCenter />
                  <span className="hidden min-[380px]:inline-flex">
                    <ThemeToggle />
                  </span>
                  <UserMenu roleLabel={roleLabel} onLogout={() => void logout()} />
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
              {user && user.isEmailVerified === false ? (
                <VerifyEmailBanner
                  email={user.email}
                  onVerified={() =>
                    setUser((current) =>
                      current ? { ...current, isEmailVerified: true } : current,
                    )
                  }
                />
              ) : null}
              {children}
            </motion.main>
            <div className="h-[calc(4.25rem+var(--safe-bottom))] lg:hidden" aria-hidden />
          </div>
        </div>

        <nav
          aria-label="Primary"
          className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/90 pb-[var(--safe-bottom)] backdrop-blur-md lg:hidden"
        >
          <div className="mx-auto flex max-w-lg items-stretch px-0.5 min-[340px]:px-2">
            {nav.slice(0, 4).map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'relative flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-colors',
                    active ? 'text-brand' : 'text-muted hover:text-foreground',
                  )}
                >
                  {active ? (
                    <motion.span
                      layoutId="dash-tab-active"
                      className="absolute inset-x-2 top-0 h-[3px] rounded-b-full bg-brand"
                      transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                    />
                  ) : null}
                  <motion.span whileTap={{ scale: 0.85 }} className="inline-flex">
                    <Icon className="h-[18px] w-[18px]" />
                  </motion.span>
                  <span className="hidden max-w-full truncate px-0.5 min-[300px]:block">
                    {t(item.labelKey)}
                  </span>
                </Link>
              );
            })}
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium text-muted transition-colors hover:text-foreground"
            >
              <motion.span whileTap={{ scale: 0.85 }} className="inline-flex">
                <Menu className="h-[18px] w-[18px]" />
              </motion.span>
              <span className="hidden min-[300px]:block">{t('dash.more')}</span>
            </button>
          </div>
        </nav>

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
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', stiffness: 320, damping: 32 }}
                className="safe-bottom absolute inset-y-0 left-0 flex w-[min(18rem,88vw)] flex-col border-r border-border bg-background p-3 pt-[max(0.75rem,var(--safe-top))] min-[340px]:p-4"
              >
                <div className="mb-4 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <BrandLogo href={homeHref} />
                  </div>
                  <button
                    type="button"
                    aria-label="Close navigation"
                    className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border transition hover:border-brand hover:text-brand"
                    onClick={() => setMobileOpen(false)}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="mb-3 flex items-center gap-3 rounded-xl border border-border bg-surface-elevated/80 px-3 py-2">
                  <UserAvatar user={user} className="h-9 w-9 text-xs" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{userName}</p>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-brand">
                      {roleLabel}
                    </p>
                  </div>
                </div>
                {roleGroup === 'employer' ? (
                  <button
                    type="button"
                    onClick={() => {
                      setMobileOpen(false);
                      openHireRequest();
                    }}
                    className="btn-primary mb-3 w-full text-sm"
                  >
                    <Plus className="h-4 w-4" /> Request a hire
                  </button>
                ) : null}
                <div className="-mx-1 min-h-0 flex-1 overflow-y-auto overscroll-contain px-1">
                  <NavItems scope="drawer" onNavigate={() => setMobileOpen(false)} />
                </div>
                <div className="mt-3 space-y-1 border-t border-border pt-3">
                  {whatsapp ? (
                    <a
                      href={whatsapp}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted transition hover:bg-surface hover:text-foreground"
                    >
                      <WhatsAppIcon className="h-4 w-4 text-[#25D366]" />
                      Chat with us on WhatsApp
                    </a>
                  ) : null}
                  <LanguageSwitcher variant="row" />
                  <button
                    type="button"
                    onClick={logout}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted transition hover:bg-surface hover:text-foreground"
                  >
                    <LogOut className="h-4 w-4" />
                    {t('dash.signOut')}
                  </button>
                </div>
              </motion.aside>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </DashboardSessionContext.Provider>
  );
}
