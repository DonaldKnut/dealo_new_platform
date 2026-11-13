'use client';

import { formatMinor, type PremiumOffer } from '@dealo/shared';
import { CreditCard, Crown, FileText, Loader2, Lock, MessageCircle, Palette, ShieldCheck, Sparkles, Stamp, Target, UserPlus } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { BottomSheet } from '@/components/ui/bottom-sheet';
import { useToast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api';
import { resumeApi } from '@/lib/resume-api';

const PREMIUM_FEATURES = [
  { icon: Palette, title: 'Premium templates & fonts', body: 'Executive to Compact, plus Source Serif, DM Sans and more.' },
  { icon: Sparkles, title: 'AI writing help', body: 'Stronger bullet points and a profile written for you.' },
  { icon: Target, title: 'Job Agent + tailor', body: 'More daily applies, AI cover notes, email apply, and job-fit tips.' },
  { icon: FileText, title: 'More CVs and cover letters', body: 'Keep up to 20 of each.' },
  { icon: Stamp, title: 'No Dealo footer', body: 'Your PDF carries only your name.' },
  { icon: Crown, title: 'Any colour and art', body: 'Match your industry with full colour and corner art.' },
];

export function PremiumSheet({
  open,
  onClose,
  reason,
  onUseFree,
  offer,
}: {
  open: boolean;
  onClose: () => void;
  reason?: string;
  onUseFree?: () => void;
  /** From the plan endpoint; without it (signed out or payments off) people are sent to WhatsApp. */
  offer?: PremiumOffer;
}) {
  const whatsapp = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER?.replace(/[^\d]/g, '');
  const toast = useToast();
  const [paying, setPaying] = useState(false);
  const canPay = Boolean(offer?.paymentsEnabled);

  const pay = async () => {
    setPaying(true);
    try {
      const { authorizationUrl } = await resumeApi.checkoutPremium();
      window.location.assign(authorizationUrl);
    } catch (err) {
      toast.error('Could not start the payment', err instanceof ApiError ? err.message : '');
      setPaying(false);
    }
  };
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
        {canPay && offer ? (
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-brand/30 bg-brand-soft/50 p-3">
            <div>
              <p className="font-display text-2xl text-foreground">{formatMinor(offer.priceMinor, offer.currency)}</p>
              <p className="text-xs text-muted">
                for {offer.periodDays} days · one payment, no automatic renewal
              </p>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-background px-2.5 py-1 text-[11px] font-semibold text-muted">
              <ShieldCheck className="h-3.5 w-3.5 text-brand" /> Secured by Paystack
            </span>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-brand/40 p-3 text-sm text-muted">
            Want premium now? Message us and we will switch it on for your account.
          </div>
        )}
        <div className="grid gap-2 min-[340px]:grid-cols-2">
          {canPay ? (
            <button type="button" className="btn-primary text-sm" onClick={() => void pay()} disabled={paying}>
              {paying ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
              {paying ? 'Opening Paystack…' : 'Pay and upgrade'}
            </button>
          ) : whatsapp ? (
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
