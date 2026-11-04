'use client';

import { motion } from 'framer-motion';
import { Copy, Loader2, MapPin, Radar, X } from 'lucide-react';
import { useEffect, useState } from 'react';

import { useToast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api';
import { aiSource, type AiSource } from '@/lib/dashboard-api';

import { AiReviewBar } from './ai-review-bar';

export function SourcingPanel({
  hireInquiryId,
  title,
  onClose,
}: {
  hireInquiryId: string;
  title: string;
  onClose: () => void;
}) {
  const toast = useToast();
  const [result, setResult] = useState<AiSource | null>(null);

  useEffect(() => {
    setResult(null);
    aiSource(hireInquiryId)
      .then(setResult)
      .catch((error) => {
        toast.error('Sourcing agent failed', error instanceof ApiError ? error.message : undefined);
        onClose();
      });
  }, [hireInquiryId, onClose, toast]);

  const copy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    toast.success('Copied');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-brand/30 bg-brand-soft/20 p-3 min-[340px]:p-5"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="flex min-w-0 items-center gap-2 font-semibold text-foreground">
          <Radar className="h-4 w-4 shrink-0 text-brand" />
          <span className="truncate">Sourcing agent · {title}</span>
        </p>
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border hover:text-brand"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {!result ? (
        <p className="mt-4 flex items-center gap-2 text-sm text-muted">
          <Loader2 className="h-4 w-4 animate-spin" /> Searching the talent pool…
        </p>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="space-y-3">
            <div className="flex flex-wrap gap-1.5">
              {result.keywords.map((keyword) => (
                <span key={keyword} className="rounded-full bg-surface-elevated px-2.5 py-1 text-xs text-foreground">
                  {keyword}
                </span>
              ))}
            </div>
            <div className="rounded-xl border border-border bg-surface-elevated p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Search string</p>
                <button type="button" aria-label="Copy search" onClick={() => void copy(result.searchString)} className="text-muted hover:text-brand">
                  <Copy className="h-3.5 w-3.5" />
                </button>
              </div>
              <p className="mt-1 break-words font-mono text-xs text-foreground">{result.searchString}</p>
            </div>
            <div className="rounded-xl border border-border bg-surface-elevated p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Outreach message</p>
                <button type="button" aria-label="Copy message" onClick={() => void copy(result.outreachMessage)} className="text-muted hover:text-brand">
                  <Copy className="h-3.5 w-3.5" />
                </button>
              </div>
              <p className="mt-1 whitespace-pre-line text-sm text-foreground">{result.outreachMessage}</p>
            </div>
          </div>

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Best matches in your talent pool</p>
            {result.matches.length === 0 ? (
              <p className="mt-2 text-sm text-muted">No close matches yet. Use the search string and message above to find new people.</p>
            ) : (
              <ul className="mt-2 space-y-1.5">
                {result.matches.map((match) => (
                  <li key={match.candidateId} className="flex items-center gap-3 rounded-xl border border-border bg-surface-elevated px-3 py-2">
                    <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-bold text-brand">
                      {match.score}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">{match.fullName}</p>
                      <p className="flex items-center gap-1 truncate text-xs text-muted">
                        {match.roleTitle ?? 'No title'}
                        {match.location ? (
                          <>
                            <MapPin className="h-3 w-3 shrink-0" /> {match.location}
                          </>
                        ) : null}
                      </p>
                      {match.reasons.length ? <p className="truncate text-[11px] text-brand">{match.reasons.join(' · ')}</p> : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <AiReviewBar runId={result.runId} provider={result.provider} className="lg:col-span-2" />
        </div>
      )}
    </motion.div>
  );
}
