'use client';

import { LoaderCircle } from 'lucide-react';
import { useEffect, useState } from 'react';

import { ApiError } from '@/lib/api';
import { fetchTalentMatches, type TalentMatch } from '@/lib/dashboard-api';

function formatStatus(status: string) {
  return status
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function TalentMatchesPanel() {
  const [matches, setMatches] = useState<TalentMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await fetchTalentMatches();
        if (active) {
          setMatches(data);
          setError(null);
        }
      } catch (err) {
        if (active) {
          setError(err instanceof ApiError ? err.message : 'Unable to load matches.');
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[30vh] items-center justify-center gap-2 text-sm text-muted">
        <LoaderCircle className="h-4 w-4 animate-spin" />
        Loading matches…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">Matches</p>
        <h1 className="display-title mt-2 text-3xl">Role matches</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Roles where Dealo has shortlisted you. Ranking updates as recruiters refine the list.
        </p>
      </div>

      {error ? <p className="text-sm text-danger">{error}</p> : null}

      {matches.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted">
          No matches yet. Keep your profile and documents up to date so recruiters can shortlist
          you.
        </div>
      ) : (
        <ul className="space-y-3">
          {matches.map((match) => (
            <li
              key={match.id}
              className="rounded-2xl border border-border bg-surface-elevated/70 p-4 sm:p-5"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="font-medium text-foreground">{match.inquiry.roleTitle}</p>
                  <p className="mt-1 text-sm text-muted">
                    {match.inquiry.companyName} · {match.inquiry.location}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    {match.shortlistTitle} ·{' '}
                    {match.inquiry.serviceType.replaceAll('_', ' ').toLowerCase()} ·{' '}
                    {match.inquiry.roleFamily.replaceAll('_', ' ').toLowerCase()}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <span className="rounded-full border border-border px-2.5 py-1 text-xs font-semibold text-brand">
                    Rank #{match.rank + 1}
                  </span>
                  <span className="rounded-full border border-border px-2.5 py-1 text-xs font-semibold text-muted">
                    {formatStatus(match.inquiry.status)}
                  </span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
