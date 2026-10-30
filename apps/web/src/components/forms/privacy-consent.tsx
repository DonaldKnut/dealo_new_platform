import Link from 'next/link';
import type { UseFormRegisterReturn } from 'react-hook-form';

export function PrivacyConsent({
  registration,
  error,
  termsLabel = 'Terms',
}: {
  registration: UseFormRegisterReturn;
  error?: string;
  termsLabel?: string;
}) {
  return (
    <div className="space-y-1">
      <label className="flex items-start gap-2 text-sm text-muted">
        <input type="checkbox" className="mt-1 h-4 w-4 rounded border-border" {...registration} />
        <span>
          I agree to Dealo&apos;s{' '}
          <Link href="/privacy" className="font-semibold text-brand underline-offset-2 hover:underline">
            Privacy Policy
          </Link>{' '}
          and{' '}
          <Link href="/terms" className="font-semibold text-brand underline-offset-2 hover:underline">
            {termsLabel}
          </Link>
          .
        </span>
      </label>
      {error ? <span className="block text-sm text-danger">{error}</span> : null}
    </div>
  );
}
