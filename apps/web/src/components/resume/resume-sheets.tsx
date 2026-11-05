'use client';

import { Crown, FileText, Lock, MessageCircle, Palette, Sparkles, Stamp, Target, UserPlus } from 'lucide-react';
import Link from 'next/link';

import { BottomSheet } from '@/components/ui/bottom-sheet';

const PREMIUM_FEATURES = [
  { icon: Palette, title: '4 premium templates', body: 'Executive, Minimal, Artisan and Compact.' },
  { icon: Sparkles, title: 'AI writing help', body: 'Stronger bullet points and a profile written for you.' },
  { icon: Target, title: 'Tailor to a job', body: 'Paste a job advert and see what to change.' },
  { icon: FileText, title: 'More CVs and cover letters', body: 'Keep up to 20 of each.' },
  { icon: Stamp, title: 'No Dealo footer', body: 'Your PDF carries only your name.' },
  { icon: Crown, title: 'Any colour and font', body: 'Match your style or industry.' },
];

export function PremiumSheet({
  open,
  onClose,
  reason,
  onUseFree,
}: {
  open: boolean;
  onClose: () => void;
  reason?: string;
  onUseFree?: () => void;
}) {
  const whatsapp = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER?.replace(/[^\d]/g, '');
  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={
        <span className="inline-flex items-center gap-1.5">
          <Crown className="h-4 w-4 text-amber-500" /> Dealo Premium
        </span>
      }
    >
      <div className="space-y-4 py-2">
        {reason ? <p className="rounded-xl bg-amber-400/15 px-3 py-2 text-sm text-amber-800 dark:text-amber-200">{reason}</p> : null}
        <ul className="grid gap-2 min-[400px]:grid-cols-2">
          {PREMIUM_FEATURES.map((f) => (
            <li key={f.title} className="flex gap-2.5 rounded-xl border border-border p-2.5">
              <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-amber-300/40 to-brand/20 text-amber-700 dark:text-amber-300">
                <f.icon className="h-4 w-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-foreground">{f.title}</span>
                <span className="block text-xs text-muted">{f.body}</span>
              </span>
            </li>
          ))}
        </ul>
        <div className="rounded-2xl border border-dashed border-brand/40 p-3 text-sm text-muted">
          Paid plans open soon with Paystack. Want premium now? Message us and we will switch it on for your account.
        </div>
        <div className="grid gap-2 min-[340px]:grid-cols-2">
          {whatsapp ? (
            <a href={`https://wa.me/${whatsapp}?text=${encodeURIComponent('Hi Dealo, I would like CV builder premium.')}`} target="_blank" rel="noreferrer" className="btn-primary text-sm">
              <MessageCircle className="h-4 w-4" /> Ask on WhatsApp
            </a>
          ) : (
            <Link href="/contact" className="btn-primary text-sm">
              <MessageCircle className="h-4 w-4" /> Ask for premium
            </Link>
          )}
          {onUseFree ? (
            <button type="button" className="btn-secondary text-sm" onClick={onUseFree}>
              Use a free design
            </button>
          ) : (
            <button type="button" className="btn-secondary text-sm" onClick={onClose}>
              Not now
            </button>
          )}
        </div>
      </div>
    </BottomSheet>
  );
}

export function AuthGateSheet({ open, onClose, onGo }: { open: boolean; onClose: () => void; onGo: (to: 'register' | 'login') => void }) {
  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={
        <span className="inline-flex items-center gap-1.5">
          <Lock className="h-4 w-4 text-brand" /> One quick step
        </span>
      }
    >
      <div className="space-y-4 py-2">
        <p className="text-sm text-foreground">Create a free Dealo account to download your CV as a PDF.</p>
        <ul className="space-y-1.5 text-xs text-muted">
          <li>• Your CV is saved on this phone, so nothing is lost.</li>
          <li>• Edit and download it again any time.</li>
          <li>• Choose to let Dealo recruiters find you for jobs.</li>
        </ul>
        <div className="grid gap-2 min-[340px]:grid-cols-2">
          <button type="button" className="btn-primary text-sm" onClick={() => onGo('register')}>
            <UserPlus className="h-4 w-4" /> Create free account
          </button>
          <button type="button" className="btn-secondary text-sm" onClick={() => onGo('login')}>
            I have an account
          </button>
        </div>
      </div>
    </BottomSheet>
  );
}
