'use client';

import { MailWarning } from 'lucide-react';
import { useState } from 'react';

import { useToast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api';
import { resendVerificationEmail } from '@/lib/dashboard-api';

export function VerifyEmailBanner({ email, onVerified }: { email: string; onVerified: () => void }) {
  const toast = useToast();
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const resend = async () => {
    setSending(true);
    try {
      const result = await resendVerificationEmail();
      if (result.alreadyVerified) {
        toast.success('Email already confirmed');
        onVerified();
        return;
      }
      setSent(true);
      toast.success('Link sent', `Check ${email}, including spam.`);
    } catch (error) {
      toast.error(
        'Could not send the link',
        error instanceof ApiError && error.status === 429 ? 'Please wait a few minutes and try again.' : 'Please try again.',
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      role="status"
      className="mb-5 flex flex-col gap-3 rounded-2xl border border-[#b54708]/30 bg-[#b54708]/10 p-3 text-sm min-[340px]:p-4 sm:flex-row sm:items-center"
    >
      <MailWarning className="hidden h-5 w-5 shrink-0 text-[#b54708] min-[300px]:block dark:text-[#fdb022]" aria-hidden />
      <p className="min-w-0 flex-1 text-foreground">
        <span className="font-semibold">Confirm your email to unlock sending.</span>{' '}
        <span className="break-words text-muted">
          {sent
            ? `We sent a new link to ${email}.`
            : `Until you confirm ${email}, you can't create a hiring workspace, invite people or email candidates.`}
        </span>
      </p>
      <button
        type="button"
        onClick={() => void resend()}
        disabled={sending}
        className="btn-secondary shrink-0 whitespace-nowrap"
      >
        {sending ? 'Sending…' : sent ? 'Send again' : 'Resend link'}
      </button>
    </div>
  );
}
