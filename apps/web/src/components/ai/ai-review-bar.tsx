'use client';

import { Bot, Check, Cpu, X } from 'lucide-react';
import { useState } from 'react';

import { useToast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api';
import { reviewAiRun, type AiProvider } from '@/lib/dashboard-api';
import { cn } from '@/lib/utils';

/** Every AI result ends with a person accepting or dismissing it. */
export function AiReviewBar({ runId, provider, className }: { runId: string; provider: AiProvider; className?: string }) {
  const toast = useToast();
  const [state, setState] = useState<'pending' | 'ACCEPTED' | 'DISMISSED'>('pending');

  const decide = async (decision: 'ACCEPTED' | 'DISMISSED') => {
    try {
      await reviewAiRun(runId, decision);
      setState(decision);
      toast.success(decision === 'ACCEPTED' ? 'Marked as reviewed and accepted' : 'Suggestion dismissed');
    } catch (error) {
      toast.error('Could not save review', error instanceof ApiError ? error.message : undefined);
    }
  };

  return (
    <div className={cn('flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3', className)}>
      <span className="inline-flex items-center gap-1.5 text-[11px] text-muted">
        {provider === 'gemini' ? <Bot className="h-3.5 w-3.5 text-brand" /> : <Cpu className="h-3.5 w-3.5 text-brand" />}
        {provider === 'gemini' ? 'Gemini AI suggestion' : 'Built-in rules suggestion'} · needs a human decision
      </span>
      {state === 'pending' ? (
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => void decide('ACCEPTED')}
            className="inline-flex items-center gap-1 rounded-full bg-brand px-3 py-1.5 text-xs font-semibold text-white dark:text-[#071f14]"
          >
            <Check className="h-3.5 w-3.5" /> Accept
          </button>
          <button
            type="button"
            onClick={() => void decide('DISMISSED')}
            className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-muted hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" /> Dismiss
          </button>
        </div>
      ) : (
        <span className={cn('text-xs font-semibold', state === 'ACCEPTED' ? 'text-brand' : 'text-muted')}>
          {state === 'ACCEPTED' ? 'Accepted by you' : 'Dismissed by you'}
        </span>
      )}
    </div>
  );
}
