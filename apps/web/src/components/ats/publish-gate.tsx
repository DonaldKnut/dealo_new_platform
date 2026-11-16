'use client';

import { EMAIL_NOT_VERIFIED, ORG_NOT_VERIFIED } from '@dealo/shared';
import { MailWarning, ShieldAlert } from 'lucide-react';
import Link from 'next/link';

import { ApiError } from '@/lib/api';
import type { OrgVerificationStatus, Workspace } from '@/lib/ats-api';

export type PublishBlock =
  | { code: typeof EMAIL_NOT_VERIFIED; message: string }
  | { code: typeof ORG_NOT_VERIFIED; message: string }
  | null;

export function publishBlockReason(opts: {
  isEmailVerified?: boolean;
  workspace?: Pick<Workspace, 'verificationStatus' | 'workEmailVerifiedAt' | 'verificationNote'> | null;
  /** Dealo staff can publish without org verification. */
  staffOverride?: boolean;
}): PublishBlock {
  if (opts.isEmailVerified === false) {
    return {
      code: EMAIL_NOT_VERIFIED,
      message: 'Confirm your email address before publishing. Use the banner on your dashboard, or resend the link from Settings.',
    };
  }
  if (opts.staffOverride) return null;
  const status = (opts.workspace?.verificationStatus ?? 'UNVERIFIED') as OrgVerificationStatus;
  if (status === 'VERIFIED') return null;
  if (status === 'PENDING') {
    return {
      code: ORG_NOT_VERIFIED,
      message: opts.workspace?.workEmailVerifiedAt
        ? 'Dealo is still reviewing your company. You can save drafts meanwhile.'
        : 'Confirm your work email in ATS settings, then wait for Dealo to approve your company.',
    };
  }
  if (status === 'REJECTED') {
    return {
      code: ORG_NOT_VERIFIED,
      message: opts.workspace?.verificationNote
        ? `Company verification was declined: ${opts.workspace.verificationNote}`
        : 'Company verification was declined. Update your details in ATS settings and submit again.',
    };
  }
  return {
    code: ORG_NOT_VERIFIED,
    message: 'Verify your company in ATS settings (website + work email) before publishing a job.',
  };
}

export function errorPublishBlock(err: unknown): PublishBlock {
  if (!(err instanceof ApiError) || !err.details || typeof err.details !== 'object') return null;
  const code = (err.details as { code?: string }).code;
  if (code === EMAIL_NOT_VERIFIED || code === ORG_NOT_VERIFIED) {
    return { code, message: err.message };
  }
  return null;
}

export function PublishGateNotice({ block }: { block: PublishBlock }) {
  if (!block) return null;
  const email = block.code === EMAIL_NOT_VERIFIED;
  const Icon = email ? MailWarning : ShieldAlert;
  return (
    <div className="mb-3 rounded-xl border border-[#b54708]/30 bg-[#b54708]/10 px-3 py-2.5 text-sm text-foreground" role="status">
      <p className="flex items-start gap-2">
        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[#b54708]" aria-hidden />
        <span className="min-w-0">
          <span className="font-semibold">{email ? 'Confirm your email first' : 'Company not verified yet'}</span>
          <span className="mt-0.5 block text-xs text-muted">{block.message}</span>
          {!email ? (
            <Link href="/dashboard/ats/settings" className="mt-1 inline-block text-xs font-semibold text-brand hover:underline">
              Open ATS settings
            </Link>
          ) : (
            <Link href="/dashboard" className="mt-1 inline-block text-xs font-semibold text-brand hover:underline">
              Go to dashboard to resend the link
            </Link>
          )}
        </span>
      </p>
    </div>
  );
}
