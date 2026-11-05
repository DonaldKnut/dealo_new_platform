import { Building2 } from 'lucide-react';
import type { CSSProperties, ReactNode } from 'react';

export function CandidateLinkCard({
  organization,
  children,
}: {
  organization?: { name: string; logoUrl: string | null; brandColor: string | null } | null;
  children: ReactNode;
}) {
  const style =
    organization?.brandColor && /^#[0-9a-f]{6}$/i.test(organization.brandColor)
      ? ({ '--brand': organization.brandColor } as CSSProperties)
      : undefined;
  return (
    <div style={style} className="mx-auto flex min-h-[75vh] w-full max-w-lg flex-col justify-center px-3 pb-16 pt-24 min-[340px]:px-5">
      <div className="rounded-[1.5rem] border border-border bg-surface-elevated p-4 shadow-sm min-[340px]:p-6">
        {organization ? (
          <div className="mb-5 flex min-w-0 items-center gap-3">
            {organization.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={organization.logoUrl} alt="" className="h-11 w-11 shrink-0 rounded-xl border border-border bg-white object-contain p-1" />
            ) : (
              <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand text-white dark:text-[#071f14]">
                <Building2 className="h-5 w-5" />
              </span>
            )}
            <p className="min-w-0 truncate font-display text-lg text-foreground">{organization.name}</p>
          </div>
        ) : null}
        {children}
      </div>
      <p className="mt-6 text-center text-[11px] text-muted">Sent with Dealo ATS. You never need to pay anyone to get a job.</p>
    </div>
  );
}
