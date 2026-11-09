'use client';

import { AnimatePresence, motion } from 'framer-motion';
import {
  Building2,
  Camera,
  ChevronDown,
  IdCard,
  Loader2,
  LogOut,
  Settings,
  Trash2,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

import { useDashboardSession } from '@/components/dashboard/dashboard-session';
import { useToast } from '@/components/ui/toast';
import { getRoleGroup, type AuthSessionUser } from '@/hooks/use-auth-session';
import { ApiError, apiFetch, apiUpload } from '@/lib/api';
import { cn } from '@/lib/utils';

const MAX_BYTES = 3 * 1024 * 1024;
const TYPES = ['image/png', 'image/jpeg', 'image/webp'];

function initials(user: AuthSessionUser) {
  const fromName = `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase();
  return fromName || user.email.slice(0, 2).toUpperCase();
}

export function UserAvatar({ user, className }: { user: AuthSessionUser; className?: string }) {
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [user.avatarUrl]);
  if (user.avatarUrl && !broken) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={user.avatarUrl}
        alt=""
        referrerPolicy="no-referrer"
        onError={() => setBroken(true)}
        className={cn('shrink-0 rounded-full object-cover', className)}
      />
    );
  }
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#14b8a6] to-[#0f766e] font-semibold text-white',
        className,
      )}
    >
      {initials(user)}
    </span>
  );
}

export function UserMenu({ roleLabel, onLogout }: { roleLabel: string; onLogout: () => void }) {
  const session = useDashboardSession();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<'upload' | 'remove' | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (event: PointerEvent) =>
      !rootRef.current?.contains(event.target as Node) && setOpen(false);
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && setOpen(false);
    window.addEventListener('pointerdown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!session) return null;
  const { user, setUser } = session;
  const name = `${user.firstName} ${user.lastName}`.trim() || user.email;
  const group = getRoleGroup(user.roles);

  const setAvatar = (avatarUrl: string | null) =>
    setUser((current) => (current ? { ...current, avatarUrl } : current));

  const upload = async (file: File | undefined) => {
    if (!file) return;
    if (!TYPES.includes(file.type)) return toast.error('Use a PNG, JPG or WebP photo');
    if (file.size > MAX_BYTES) return toast.error('That photo is too big', 'Pick one under 3 MB.');
    setBusy('upload');
    try {
      const form = new FormData();
      form.append('file', file);
      const result = await apiUpload<{ avatarUrl: string }>('/users/me/avatar', form);
      setAvatar(result.avatarUrl);
      toast.success('Photo updated');
    } catch (error) {
      toast.error('Could not upload your photo', error instanceof ApiError ? error.message : '');
    } finally {
      setBusy(null);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const remove = async () => {
    setBusy('remove');
    try {
      await apiFetch('/users/me/avatar', { method: 'DELETE' });
      setAvatar(null);
      toast.success('Photo removed');
    } catch (error) {
      toast.error('Could not remove your photo', error instanceof ApiError ? error.message : '');
    } finally {
      setBusy(null);
    }
  };

  const links = [
    ...(group === 'talent'
      ? [{ href: '/dashboard/profile', label: 'My profile', icon: IdCard }]
      : []),
    ...(group === 'employer'
      ? [{ href: '/dashboard/organization', label: 'Company & team', icon: Building2 }]
      : []),
    { href: '/dashboard/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label="Account menu"
        aria-expanded={open}
        className={cn(
          'flex items-center gap-2 rounded-full border border-border bg-surface-elevated p-0.5 transition hover:border-brand sm:pr-2.5',
          open && 'border-brand',
        )}
      >
        <UserAvatar user={user} className="h-8 w-8 text-xs min-[340px]:h-9 min-[340px]:w-9" />
        <span className="hidden max-w-[9rem] truncate text-sm font-medium text-foreground md:block">
          {name}
        </span>
        <ChevronDown
          className={cn(
            'hidden h-3.5 w-3.5 text-muted transition-transform sm:block',
            open && 'rotate-180',
          )}
        />
      </button>

      <input
        ref={fileRef}
        type="file"
        accept={TYPES.join(',')}
        className="hidden"
        onChange={(event) => void upload(event.target.files?.[0])}
      />

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            style={{ transformOrigin: 'top right' }}
            className="absolute right-0 top-full z-50 mt-2.5 w-[min(18rem,calc(100vw-1rem))] overflow-hidden rounded-2xl border border-border bg-background/95 shadow-[0_24px_60px_-20px_rgba(4,47,46,0.45)] backdrop-blur-xl"
          >
            <div className="flex items-center gap-3 border-b border-border p-4">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={busy !== null}
                className="group relative shrink-0 rounded-full"
                aria-label="Change photo"
              >
                <UserAvatar user={user} className="h-14 w-14 text-base" />
                <span
                  className={cn(
                    'absolute inset-0 flex items-center justify-center rounded-full bg-black/45 text-white transition group-hover:opacity-100 group-focus-visible:opacity-100',
                    busy === 'upload' ? 'opacity-100' : 'opacity-0',
                  )}
                >
                  {busy === 'upload' ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Camera className="h-5 w-5" />
                  )}
                </span>
              </button>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">{name}</p>
                <p className="truncate text-xs text-muted">{user.email}</p>
                <span className="mt-1 inline-block rounded-full bg-brand-soft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-brand">
                  {roleLabel}
                </span>
              </div>
            </div>

            <div className="p-1.5">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={busy !== null}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-foreground transition hover:bg-surface disabled:opacity-60"
              >
                <Camera className="h-4 w-4 text-muted" />{' '}
                {user.avatarUrl ? 'Change photo' : 'Add a photo'}
              </button>
              {user.avatarUrl ? (
                <button
                  type="button"
                  onClick={() => void remove()}
                  disabled={busy !== null}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-foreground transition hover:bg-surface disabled:opacity-60"
                >
                  {busy === 'remove' ? (
                    <Loader2 className="h-4 w-4 animate-spin text-muted" />
                  ) : (
                    <Trash2 className="h-4 w-4 text-muted" />
                  )}{' '}
                  Remove photo
                </button>
              ) : null}
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-foreground transition hover:bg-surface"
                >
                  <link.icon className="h-4 w-4 text-muted" /> {link.label}
                </Link>
              ))}
            </div>
            <div className="border-t border-border p-1.5">
              <button
                type="button"
                onClick={onLogout}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-danger transition hover:bg-danger/10"
              >
                <LogOut className="h-4 w-4" /> Sign out
              </button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
