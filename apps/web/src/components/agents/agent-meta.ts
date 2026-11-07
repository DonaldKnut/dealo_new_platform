import type { HiringAgentId } from '@dealo/shared';
import { Activity, CalendarClock, ClipboardCheck, MessageCircleHeart, PenLine, Radar, ScanSearch, type LucideIcon } from 'lucide-react';

/** Each agent's icon and colour, so it is recognisable everywhere it appears. */
export const AGENT_LOOK: Record<HiringAgentId, { icon: LucideIcon; gradient: string; tint: string; text: string }> = {
  screening: { icon: ScanSearch, gradient: 'from-emerald-500 to-teal-600', tint: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-300' },
  job_post: { icon: PenLine, gradient: 'from-sky-500 to-indigo-600', tint: 'bg-sky-500/10', text: 'text-sky-600 dark:text-sky-300' },
  sourcing: { icon: Radar, gradient: 'from-violet-500 to-fuchsia-600', tint: 'bg-violet-500/10', text: 'text-violet-600 dark:text-violet-300' },
  follow_up: { icon: MessageCircleHeart, gradient: 'from-rose-500 to-orange-500', tint: 'bg-rose-500/10', text: 'text-rose-600 dark:text-rose-300' },
  scheduling: { icon: CalendarClock, gradient: 'from-amber-500 to-orange-600', tint: 'bg-amber-500/10', text: 'text-amber-600 dark:text-amber-300' },
  interview_kit: { icon: ClipboardCheck, gradient: 'from-cyan-500 to-blue-600', tint: 'bg-cyan-500/10', text: 'text-cyan-600 dark:text-cyan-300' },
  pipeline_digest: { icon: Activity, gradient: 'from-lime-500 to-emerald-600', tint: 'bg-lime-500/10', text: 'text-lime-700 dark:text-lime-300' },
};

export function formatNaira(minor: number) {
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(minor / 100);
}
