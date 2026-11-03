'use client';

import { AnimatePresence, motion, useInView, useReducedMotion } from 'framer-motion';
import {
  AlertTriangle,
  ArrowRight,
  Award,
  BadgeCheck,
  Bot,
  CalendarClock,
  CheckCheck,
  CheckCircle2,
  Clock,
  Database,
  FileSearch,
  FileText,
  Fingerprint,
  MapPin,
  Pause,
  PhoneCall,
  Play,
  Radar,
  Radio,
  ScanSearch,
  Search,
  Send,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  UserCheck,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import type { TranslationKey } from '@/components/i18n/dictionaries';
import { useLocale } from '@/components/i18n/locale-context';
import { useModal } from '@/components/modals/modal-context';
import { cn } from '@/lib/utils';

import { MarketingSection } from './marketing-section';

type AgentId = 'sourcing' | 'screening' | 'verify' | 'match' | 'manage';

const AGENTS: { id: AgentId; icon: LucideIcon }[] = [
  { id: 'sourcing', icon: Radar },
  { id: 'screening', icon: ScanSearch },
  { id: 'verify', icon: ShieldCheck },
  { id: 'match', icon: Users },
  { id: 'manage', icon: BadgeCheck },
];

const CYCLE_MS = 6000;

interface ActivityCardConfig {
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
  borderHover: string;
  badge: string;
  badgeColor: string;
  time: string;
  subtitle: string;
  chips: string[];
  showStreak?: boolean;
}

const AGENT_ACTIVITIES: Record<AgentId, ActivityCardConfig[]> = {
  manage: [
    {
      icon: CalendarClock,
      iconBg: 'bg-sky-500/10 dark:bg-sky-500/20',
      iconColor: 'text-sky-600 dark:text-sky-400',
      borderHover: 'hover:border-sky-500/40',
      badge: 'Post-Shift Sync',
      badgeColor: 'border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-400',
      time: '17:30 WAT',
      subtitle:
        'Interviews scheduled outside core construction hours via SMS & WhatsApp to prevent active site halts.',
      chips: ['17:30 WAT Window', 'SMS + WhatsApp Synced', 'Zero Site Downtime'],
    },
    {
      icon: Fingerprint,
      iconBg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      borderHover: 'hover:border-emerald-500/40',
      badge: 'Geofence Verified',
      badgeColor: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
      time: '07:42 WAT',
      subtitle:
        'Lekki Site Gate 3 GPS perimeter confirmed 2 of 2 workers on site 18 min before morning muster.',
      chips: ['Lekki Gate 3', '07:42 Check-in', '100% On-Time'],
      showStreak: true,
    },
    {
      icon: AlertTriangle,
      iconBg: 'bg-amber-500/10 dark:bg-amber-500/20',
      iconColor: 'text-amber-600 dark:text-amber-400',
      borderHover: 'hover:border-amber-500/40',
      badge: 'Proactive Alert',
      badgeColor: 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400',
      time: '06:14 WAT',
      subtitle:
        'Lekki-Epe expressway bottleneck flagged. Recruiter Amaka dispatched site shuttle stipend automatically.',
      chips: ['Transit Bottleneck', 'Recruiter Handled', 'Resolved in 14 min'],
    },
    {
      icon: UserCheck,
      iconBg: 'bg-teal-500/10 dark:bg-teal-500/20',
      iconColor: 'text-brand',
      borderHover: 'hover:border-brand/40',
      badge: '48h Guarantee',
      badgeColor: 'border-brand/30 bg-brand-soft/70 text-brand',
      time: 'Standing SLA',
      subtitle:
        'Pre-vetted standby electrician Emmanuel O. (NABTEB certified) on 45-min notice if replacement is required.',
      chips: ['Standby: Emmanuel O.', '45m Notice', 'Zero Replacement Fee'],
    },
  ],
  sourcing: [
    {
      icon: Radar,
      iconBg: 'bg-teal-500/10 dark:bg-teal-500/20',
      iconColor: 'text-brand',
      borderHover: 'hover:border-brand/40',
      badge: 'Role Spec Parsed',
      badgeColor: 'border-brand/30 bg-brand-soft/70 text-brand',
      time: '09:00 WAT',
      subtitle: 'Analyzed employer requirements: 2 × Senior Site Electricians, 8-week Lekki contract.',
      chips: ['Lekki Scheme 1', '8 Weeks', '2 Positions'],
    },
    {
      icon: Database,
      iconBg: 'bg-sky-500/10 dark:bg-sky-500/20',
      iconColor: 'text-sky-600 dark:text-sky-400',
      borderHover: 'hover:border-sky-500/40',
      badge: 'Talent Pool Scan',
      badgeColor: 'border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-400',
      time: '09:04 WAT',
      subtitle: 'Queried Dealo vetted artisan graph and alumni network across Lagos & Ogun State.',
      chips: ['146 Profiles', 'Lagos Network', 'Verified Hires'],
    },
    {
      icon: MapPin,
      iconBg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      borderHover: 'hover:border-emerald-500/40',
      badge: '15km Geofence',
      badgeColor: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
      time: '09:07 WAT',
      subtitle: 'Filtered candidates within 15 km of Lekki with proven commercial estate installation track records.',
      chips: ['31 Local Trades', 'Estate Experience', '<45m Commute'],
    },
    {
      icon: Send,
      iconBg: 'bg-purple-500/10 dark:bg-purple-500/20',
      iconColor: 'text-purple-600 dark:text-purple-400',
      borderHover: 'hover:border-purple-500/40',
      badge: 'Recruiter Approval',
      badgeColor: 'border-purple-500/30 bg-purple-500/10 text-purple-600 dark:text-purple-400',
      time: '09:12 WAT',
      subtitle: 'Outreach communications drafted and presented to Lead Recruiter Amaka for single-click dispatch.',
      chips: ['Recruiter Queued', 'WhatsApp & SMS', '100% Human Signed'],
    },
  ],
  screening: [
    {
      icon: FileText,
      iconBg: 'bg-sky-500/10 dark:bg-sky-500/20',
      iconColor: 'text-sky-600 dark:text-sky-400',
      borderHover: 'hover:border-sky-500/40',
      badge: 'Credentials Read',
      badgeColor: 'border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-400',
      time: '10:15 WAT',
      subtitle: 'Extracted NABTEB, trade apprenticeship records, and past site project summaries for 31 applicants.',
      chips: ['31 Trade CVs', 'NABTEB Modular', 'Apprenticeships'],
    },
    {
      icon: CheckCheck,
      iconBg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      borderHover: 'hover:border-emerald-500/40',
      badge: '6 Must-Haves',
      badgeColor: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
      time: '10:22 WAT',
      subtitle: 'Evaluated against high-voltage wiring, conduit piping, 3-phase circuits, and safety compliance.',
      chips: ['6 Criteria', '3-Phase Circuits', 'OSHA Certified'],
    },
    {
      icon: Search,
      iconBg: 'bg-amber-500/10 dark:bg-amber-500/20',
      iconColor: 'text-amber-600 dark:text-amber-400',
      borderHover: 'hover:border-amber-500/40',
      badge: 'Discrepancy Audit',
      badgeColor: 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400',
      time: '10:31 WAT',
      subtitle: 'Flagged 4 project tenure gaps for recruiter follow-up phone interview before advancement.',
      chips: ['4 Gaps Flagged', 'Recruiter Probed', 'Audit Passed'],
    },
    {
      icon: ShieldCheck,
      iconBg: 'bg-teal-500/10 dark:bg-teal-500/20',
      iconColor: 'text-brand',
      borderHover: 'hover:border-brand/40',
      badge: 'Advanced to Tier 2',
      badgeColor: 'border-brand/30 bg-brand-soft/70 text-brand',
      time: '10:45 WAT',
      subtitle: '9 top-scoring candidates qualified and forwarded to formal document & reference verification.',
      chips: ['9 Cleared', 'Top 29%', 'Ready for Verification'],
    },
  ],
  verify: [
    {
      icon: ShieldCheck,
      iconBg: 'bg-teal-500/10 dark:bg-teal-500/20',
      iconColor: 'text-brand',
      borderHover: 'hover:border-brand/40',
      badge: 'Biometric & NIN',
      badgeColor: 'border-brand/30 bg-brand-soft/70 text-brand',
      time: '11:30 WAT',
      subtitle: 'Matched National Identity Numbers (NIN), voter cards, and certified trade licenses to applicant profiles.',
      chips: ['NIN Validated', 'Trade License Active', 'Anti-Fraud Pass'],
    },
    {
      icon: FileSearch,
      iconBg: 'bg-amber-500/10 dark:bg-amber-500/20',
      iconColor: 'text-amber-600 dark:text-amber-400',
      borderHover: 'hover:border-amber-500/40',
      badge: 'Recruiter Escalated',
      badgeColor: 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400',
      time: '11:42 WAT',
      subtitle: 'Discovered a 6-month date inconsistency on an apprenticeship letter; human recruiter phoned past contractor.',
      chips: ['1 Date Variance', 'Contractor Called', 'Resolved Clean'],
    },
    {
      icon: PhoneCall,
      iconBg: 'bg-sky-500/10 dark:bg-sky-500/20',
      iconColor: 'text-sky-600 dark:text-sky-400',
      borderHover: 'hover:border-sky-500/40',
      badge: 'Site Lead Checks',
      badgeColor: 'border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-400',
      time: '12:05 WAT',
      subtitle: 'Past project foremen from Eko Atlantic and Ikoyi sites completed audio and written reference surveys.',
      chips: ['3 Site Leads', 'Reliability: 5/5', 'Safety Verified'],
    },
    {
      icon: Award,
      iconBg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      borderHover: 'hover:border-emerald-500/40',
      badge: 'Vetted Seal',
      badgeColor: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
      time: '12:30 WAT',
      subtitle: '6 candidates cleared with complete verification dossier, zero red flags, and recruiter endorsement.',
      chips: ['6 Cleared', '100% Background Pass', 'Dealo Shield Active'],
    },
  ],
  match: [
    {
      icon: SlidersHorizontal,
      iconBg: 'bg-sky-500/10 dark:bg-sky-500/20',
      iconColor: 'text-sky-600 dark:text-sky-400',
      borderHover: 'hover:border-sky-500/40',
      badge: 'Multi-Factor Weight',
      badgeColor: 'border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-400',
      time: '13:00 WAT',
      subtitle: 'Scored against travel distance to Lekki, immediate availability, and approved client pay band.',
      chips: ['Distance (15km)', '48h Start Date', 'Budget Aligned'],
    },
    {
      icon: Sparkles,
      iconBg: 'bg-teal-500/10 dark:bg-teal-500/20',
      iconColor: 'text-brand',
      borderHover: 'hover:border-brand/40',
      badge: 'Top 3 Shortlist',
      badgeColor: 'border-brand/30 bg-brand-soft/70 text-brand',
      time: '13:14 WAT',
      subtitle: 'Ranked top 3 candidates with plain-English rationales explaining trade strengths and past project sizes.',
      chips: ['1. Oluwaseun (99%)', '2. Chinedu (98%)', '3. Ibrahim (97%)'],
    },
    {
      icon: BadgeCheck,
      iconBg: 'bg-purple-500/10 dark:bg-purple-500/20',
      iconColor: 'text-purple-600 dark:text-purple-400',
      borderHover: 'hover:border-purple-500/40',
      badge: 'Recruiter Signed',
      badgeColor: 'border-purple-500/30 bg-purple-500/10 text-purple-600 dark:text-purple-400',
      time: '13:40 WAT',
      subtitle: 'Lead recruiter Amaka reviewed scores, confirmed candidate standby readiness, and approved shortlist.',
      chips: ['Human Approved', 'Zero Guesswork', 'Recruiter Signed'],
    },
    {
      icon: Clock,
      iconBg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      borderHover: 'hover:border-emerald-500/40',
      badge: 'SLA Smashed',
      badgeColor: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
      time: '31 Hours',
      subtitle: 'Final candidate profiles delivered to employer portal in 31 hours, comfortably beating the 48h guarantee.',
      chips: ['Delivered in 31h', '48h SLA Beat', 'Ready to Deploy'],
    },
  ],
};

function PlacementTelemetryIllustration() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-surface/60 p-3.5 backdrop-blur-sm sm:p-4">
      {/* Visual radar & telemetry diagram */}
      <div className="relative flex flex-col items-center justify-between gap-3 sm:flex-row">
        {/* Radar Graphic */}
        <div className="relative flex h-32 w-32 shrink-0 items-center justify-center sm:h-36 sm:w-36">
          {/* Subtle radar rings */}
          <div className="absolute inset-0 rounded-full border border-brand/20 bg-brand-soft/20 dark:bg-brand-soft/10" />
          <div className="absolute inset-3 rounded-full border border-brand/25" />
          <div className="absolute inset-7 rounded-full border border-dashed border-brand/35" />
          <div className="absolute inset-11 rounded-full border border-brand/40 bg-brand/5" />

          {/* Radar Sweep Beam */}
          <div className="pointer-events-none absolute inset-0 animate-[spin_6s_linear_infinite] rounded-full bg-[conic-gradient(from_0deg,transparent_0_300deg,rgba(15,118,110,0.35)_360deg)] dark:bg-[conic-gradient(from_0deg,transparent_0_300deg,rgba(124,255,77,0.35)_360deg)]" />

          {/* Central Site Marker */}
          <div className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full border border-brand bg-brand text-white shadow-lg shadow-brand/30 dark:text-[#071f14]">
            <Radio className="h-4 w-4 animate-pulse" />
          </div>

          {/* Worker Node 1: Oluwaseun */}
          <div className="absolute left-6 top-5 z-10 flex items-center gap-1">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            <span className="rounded bg-surface-elevated/90 px-1 py-0.5 text-[9px] font-bold text-foreground shadow-sm">
              OA
            </span>
          </div>

          {/* Worker Node 2: Chinedu */}
          <div className="absolute bottom-5 right-6 z-10 flex items-center gap-1">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            <span className="rounded bg-surface-elevated/90 px-1 py-0.5 text-[9px] font-bold text-foreground shadow-sm">
              CO
            </span>
          </div>

          {/* Standby Worker Node: Emmanuel (Outer ring) */}
          <div className="absolute right-2 top-7 z-10 flex items-center gap-1">
            <span className="relative flex h-2 w-2">
              <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-400" />
            </span>
            <span className="rounded border border-amber-500/30 bg-surface-elevated/90 px-1 py-0.5 text-[8px] font-semibold text-amber-600 dark:text-amber-400 shadow-sm">
              Standby
            </span>
          </div>
        </div>

        {/* Telemetry live status info */}
        <div className="min-w-0 flex-1 space-y-2 text-left">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-md border border-brand/30 bg-brand-soft/70 px-2 py-0.5 text-[10px] font-semibold text-brand">
              <MapPin className="h-2.5 w-2.5" />
              Lekki Scheme 1 · Gate 3
            </span>
            <span className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
              Geofence Locked (200m)
            </span>
          </div>

          <p className="text-[11px] leading-relaxed text-muted">
            Live telemetry synchronizing on-site attendance, morning muster confirmation, and instant standby backup cover.
          </p>

          <div className="grid grid-cols-2 gap-2 pt-1 sm:grid-cols-4">
            <div className="rounded-lg border border-border/80 bg-surface-elevated/70 px-2 py-1.5">
              <p className="text-[9px] font-medium uppercase tracking-wider text-muted">Attendance</p>
              <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">99.4%</p>
            </div>
            <div className="rounded-lg border border-border/80 bg-surface-elevated/70 px-2 py-1.5">
              <p className="text-[9px] font-medium uppercase tracking-wider text-muted">Avg Arrival</p>
              <p className="text-xs font-bold text-foreground">07:42 WAT</p>
            </div>
            <div className="rounded-lg border border-border/80 bg-surface-elevated/70 px-2 py-1.5">
              <p className="text-[9px] font-medium uppercase tracking-wider text-muted">Standby</p>
              <p className="text-xs font-bold text-brand">1 Active</p>
            </div>
            <div className="rounded-lg border border-border/80 bg-surface-elevated/70 px-2 py-1.5">
              <p className="text-[9px] font-medium uppercase tracking-wider text-muted">SLA Guard</p>
              <p className="text-xs font-bold text-foreground">48h Cover</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SourcingTelemetryIllustration() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-surface/60 p-3.5 backdrop-blur-sm sm:p-4">
      <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
        <div className="relative flex h-28 w-28 shrink-0 items-center justify-center">
          <div className="absolute inset-0 rounded-2xl border border-brand/20 bg-brand-soft/20" />
          <Radar className="h-10 w-10 text-brand animate-pulse" />
          <div className="absolute bottom-2 right-2 rounded bg-surface-elevated px-1 text-[8px] font-bold text-brand">
            15km
          </div>
        </div>
        <div className="min-w-0 flex-1 space-y-1.5 text-left">
          <div className="flex items-center gap-1.5">
            <span className="rounded-md border border-brand/30 bg-brand-soft/80 px-2 py-0.5 text-[10px] font-semibold text-brand">
              Talent Pool Radar Active
            </span>
            <span className="text-[10px] text-muted">Lagos & Regional Network</span>
          </div>
          <p className="text-[11px] leading-relaxed text-muted">
            146 profiles scanned across verified trade databases. 31 qualified site electricians identified within 15 km radius.
          </p>
          <div className="flex gap-2 pt-1 text-[10px] font-semibold">
            <span className="rounded border border-border bg-surface-elevated/80 px-2 py-1">146 Scanned</span>
            <span className="rounded border border-brand/30 bg-brand-soft px-2 py-1 text-brand">31 Within 15km</span>
            <span className="rounded border border-border bg-surface-elevated/80 px-2 py-1">4 Outreach Drafts</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function ScreeningTelemetryIllustration() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-surface/60 p-3.5 backdrop-blur-sm sm:p-4">
      <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
        <div className="relative flex h-28 w-28 shrink-0 items-center justify-center rounded-2xl border border-border/80 bg-surface-elevated p-2">
          <div className="space-y-1.5 w-full">
            <div className="h-1.5 w-full rounded-full bg-brand" />
            <div className="h-1.5 w-4/5 rounded-full bg-brand/70" />
            <div className="h-1.5 w-3/5 rounded-full bg-brand/40" />
            <div className="flex items-center justify-between text-[9px] font-bold text-brand pt-1">
              <span>Must-Haves</span>
              <span>6/6</span>
            </div>
          </div>
        </div>
        <div className="min-w-0 flex-1 space-y-1.5 text-left">
          <div className="flex items-center gap-1.5">
            <span className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
              Skills Scored & Audited
            </span>
            <span className="text-[10px] text-muted">Trade & Experience Match</span>
          </div>
          <p className="text-[11px] leading-relaxed text-muted">
            Parsed 31 CVs and trade certifications against client brief. Flagged 4 gaps for recruiter phone probe. 9 candidates advanced.
          </p>
          <div className="flex gap-2 pt-1 text-[10px] font-semibold">
            <span className="rounded border border-border bg-surface-elevated/80 px-2 py-1">31 Analyzed</span>
            <span className="rounded border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-amber-600 dark:text-amber-400">4 Gaps Probed</span>
            <span className="rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-emerald-600 dark:text-emerald-400">9 Advanced</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function VerifyTelemetryIllustration() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-surface/60 p-3.5 backdrop-blur-sm sm:p-4">
      <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
        <div className="relative flex h-28 w-28 shrink-0 items-center justify-center">
          <div className="absolute inset-0 rounded-2xl border border-emerald-500/30 bg-emerald-500/10" />
          <ShieldCheck className="h-10 w-10 text-emerald-500 animate-pulse" />
          <div className="absolute bottom-2 right-2 rounded bg-surface-elevated px-1 text-[8px] font-bold text-emerald-600 dark:text-emerald-400">
            NIN Verified
          </div>
        </div>
        <div className="min-w-0 flex-1 space-y-1.5 text-left">
          <div className="flex items-center gap-1.5">
            <span className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
              ID & Reference Ledger Cleared
            </span>
            <span className="text-[10px] text-muted">Past Site Foremen Endorsed</span>
          </div>
          <p className="text-[11px] leading-relaxed text-muted">
            IDs and certifications cross-referenced with federal databases. Past site leads called for reference checks. 6 candidates cleared.
          </p>
          <div className="flex gap-2 pt-1 text-[10px] font-semibold">
            <span className="rounded border border-border bg-surface-elevated/80 px-2 py-1">100% ID Match</span>
            <span className="rounded border border-border bg-surface-elevated/80 px-2 py-1">Site Leads Called</span>
            <span className="rounded border border-brand/30 bg-brand-soft px-2 py-1 text-brand">6 Shortlist Cleared</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function MatchTelemetryIllustration() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-surface/60 p-3.5 backdrop-blur-sm sm:p-4">
      <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
        <div className="relative flex h-28 w-28 shrink-0 items-center justify-center">
          <div className="absolute inset-0 rounded-2xl border border-brand/20 bg-brand-soft/20" />
          <Award className="h-10 w-10 text-brand" />
          <div className="absolute bottom-2 right-2 rounded bg-brand px-1 text-[8px] font-bold text-white dark:text-[#071f14]">
            31h
          </div>
        </div>
        <div className="min-w-0 flex-1 space-y-1.5 text-left">
          <div className="flex items-center gap-1.5">
            <span className="rounded-md border border-brand/30 bg-brand-soft/80 px-2 py-0.5 text-[10px] font-semibold text-brand">
              Ranked Candidate Shortlist
            </span>
            <span className="text-[10px] text-muted">Delivered in 31 Hours</span>
          </div>
          <p className="text-[11px] leading-relaxed text-muted">
            Availability, distance, and pay bands weighted. Top 3 ranked with plain-language reasons and signed off by lead recruiter.
          </p>
          <div className="flex gap-2 pt-1 text-[10px] font-semibold">
            <span className="rounded border border-border bg-surface-elevated/80 px-2 py-1">Rank 1: 99% Fit</span>
            <span className="rounded border border-brand/30 bg-brand-soft px-2 py-1 text-brand">Recruiter Approved</span>
            <span className="rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-emerald-600 dark:text-emerald-400">31h Delivery</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AiAgentsShowcase() {
  const { t } = useLocale();
  const { open } = useModal();
  const reduceMotion = useReducedMotion();
  const sectionRef = useRef<HTMLDivElement>(null);
  const inView = useInView(sectionRef, { margin: '-20% 0px' });
  // Default to Placement agent (index 4) as requested
  const [activeIndex, setActiveIndex] = useState(4);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (!inView || paused || reduceMotion) return;
    const timer = window.setTimeout(
      () => setActiveIndex((index) => (index + 1) % AGENTS.length),
      CYCLE_MS,
    );
    return () => window.clearTimeout(timer);
  }, [activeIndex, inView, paused, reduceMotion]);

  const active = AGENTS[activeIndex];
  const key = (suffix: string) => `agents.${active.id}.${suffix}` as TranslationKey;
  const lines = ['l1', 'l2', 'l3', 'l4'].map((line) => t(key(line)));
  const activityConfig = AGENT_ACTIVITIES[active.id];

  return (
    <MarketingSection id="ai-agents">
      <div
        ref={sectionRef}
        className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.25fr)] lg:gap-12"
      >
        {/* Left Column: Heading, Agent selector buttons, CTA */}
        <div className="min-w-0">
          <span className="glow-pill">
            <Sparkles className="h-3.5 w-3.5" />
            {t('agents.eyebrow')}
          </span>
          <h2 className="display-title mt-4 text-[1.6rem] text-foreground min-[340px]:text-3xl sm:text-4xl lg:text-[2.75rem]">
            {t('agents.title')}
          </h2>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted min-[340px]:text-base">
            {t('agents.body')}
          </p>

          <ul
            className="mt-6 grid grid-cols-1 gap-1.5"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
          >
            {AGENTS.map((agent, index) => {
              const Icon = agent.icon;
              const selected = index === activeIndex;
              return (
                <li key={agent.id} className="min-w-0">
                  <button
                    type="button"
                    onClick={() => setActiveIndex(index)}
                    aria-pressed={selected}
                    className={cn(
                      'group relative flex w-full min-w-0 items-center gap-3 overflow-hidden rounded-2xl px-3.5 py-3 text-left transition-all duration-200',
                      selected
                        ? 'text-foreground shadow-sm'
                        : 'text-muted hover:bg-surface/80 hover:text-foreground',
                    )}
                  >
                    {selected ? (
                      <motion.span
                        layoutId="agent-active"
                        className="absolute inset-0 rounded-2xl border border-brand/40 bg-brand-soft/70 dark:bg-brand-soft/40 backdrop-blur-sm"
                        transition={{ type: 'spring', stiffness: 420, damping: 36 }}
                      />
                    ) : null}
                    <span
                      className={cn(
                        'relative z-10 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-all duration-300 group-hover:scale-105',
                        selected
                          ? 'border-brand/40 bg-brand text-white shadow-md shadow-brand/25 dark:text-[#071f14]'
                          : 'border-border bg-surface text-brand',
                      )}
                    >
                      <Icon className="h-4.5 w-4.5" />
                    </span>
                    <span className="relative z-10 min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="block truncate text-sm font-semibold">
                          {t(`agents.${agent.id}.name` as TranslationKey)}
                        </span>
                        {selected && (
                          <span className="hidden sm:inline-flex items-center gap-1 rounded-full border border-brand/30 bg-brand-soft px-1.5 py-0.2 text-[9px] font-bold text-brand uppercase tracking-wider">
                            Active
                          </span>
                        )}
                      </span>
                      <span className="block truncate text-xs text-muted">
                        {t(`agents.${agent.id}.role` as TranslationKey)}
                      </span>
                    </span>
                    {selected && !paused && !reduceMotion ? (
                      <motion.span
                        key={`progress-${activeIndex}`}
                        className="absolute bottom-0 left-3 right-3 z-10 h-[2.5px] origin-left rounded-full bg-brand"
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: 1 }}
                        transition={{ duration: CYCLE_MS / 1000, ease: 'linear' }}
                      />
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="mt-6 flex flex-col gap-3 min-[400px]:flex-row min-[400px]:items-center">
            <button type="button" className="btn-primary" onClick={() => open('hire')}>
              {t('agents.cta')}
              <ArrowRight className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPaused(!paused)}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1 text-xs text-muted hover:text-foreground transition-colors"
                title={paused ? 'Resume cycle' : 'Pause cycle'}
              >
                {paused ? <Play className="h-3 w-3 text-brand" /> : <Pause className="h-3 w-3" />}
                <span className="text-[11px]">{paused ? 'Resume' : 'Pause'}</span>
              </button>
              <p className="text-xs leading-relaxed text-muted">{t('agents.note')}</p>
            </div>
          </div>
        </div>

        {/* Right Column: Premium Realistic Operational Live Activity Cockpit */}
        <div className="relative min-w-0">
          <div className="pointer-events-none absolute -inset-6 rounded-[2.5rem] bg-[radial-gradient(ellipse_at_center,var(--hero-glow),transparent_70%)]" />

          <div className="glass-card relative overflow-hidden rounded-[1.75rem] border border-brand/20 p-4 shadow-xl shadow-brand/5 min-[340px]:p-5 sm:p-6">
            {/* Top Operational Bar: Simulated Terminal Bar & Context */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/80 pb-3">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/80 shadow-sm shadow-emerald-500/40" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500/80" />
                <span className="h-2.5 w-2.5 rounded-full bg-brand/80" />
                <span className="ml-1 text-[11px] font-semibold text-muted">
                  Ops Console <span className="text-foreground">#DL-8429</span> · Lekki Phase 1
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="hidden sm:inline-flex items-center gap-1 rounded-full border border-border bg-surface px-2 py-0.5 text-[10px] text-muted">
                  Cluster: LOS-01 · 24ms
                </span>
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
              </div>
            </div>

            {/* Header: Agent identity + Live Activity status + Human-Reviewed Seal */}
            <div className="mt-4 flex flex-col justify-between gap-3 border-b border-border/70 pb-4 sm:flex-row sm:items-center">
              <div className="flex items-center gap-3">
                <span className="relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand text-white shadow-md shadow-brand/30 dark:text-[#071f14]">
                  <Bot className="h-5 w-5" />
                  <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-surface-elevated bg-emerald-400 shadow-sm" />
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate text-base font-bold text-foreground">
                      {t(key('name'))}
                    </h3>
                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      </span>
                      {t('agents.live')}
                    </span>
                  </div>
                  <p className="text-xs text-muted">
                    {t(key('role'))}
                  </p>
                </div>
              </div>

              {/* Human-reviewed Seal & Recruiter Badge */}
              <div className="flex items-center gap-2 self-start rounded-xl border border-brand/30 bg-brand-soft/70 px-3 py-1.5 text-xs text-brand sm:self-auto">
                <BadgeCheck className="h-4 w-4 shrink-0 text-brand" />
                <div className="leading-tight">
                  <span className="block font-bold">{t('agents.badge')}</span>
                  <span className="block text-[10px] text-muted">
                    Reviewer: Amaka E. (Staff Lead)
                  </span>
                </div>
              </div>
            </div>

            {/* Visual Telemetry Illustration Section */}
            <div className="mt-4">
              <AnimatePresence mode="wait">
                <motion.div
                  key={active.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25 }}
                >
                  {active.id === 'manage' && <PlacementTelemetryIllustration />}
                  {active.id === 'sourcing' && <SourcingTelemetryIllustration />}
                  {active.id === 'screening' && <ScreeningTelemetryIllustration />}
                  {active.id === 'verify' && <VerifyTelemetryIllustration />}
                  {active.id === 'match' && <MatchTelemetryIllustration />}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Rich Real-Time Activity Feed with Icons, Illustrations & Context */}
            <div className="mt-4">
              <div className="flex items-center justify-between pb-2 text-[11px] font-semibold uppercase tracking-wider text-muted">
                <span>Real-Time Operation Feed</span>
                <span>Automated Log</span>
              </div>

              <AnimatePresence mode="wait">
                <motion.ol
                  key={active.id}
                  className="space-y-2.5"
                  initial="hidden"
                  animate="show"
                  exit={{ opacity: 0, transition: { duration: 0.15 } }}
                  variants={{ show: { transition: { staggerChildren: reduceMotion ? 0 : 0.2 } } }}
                >
                  {lines.map((line, index) => {
                    const item = activityConfig[index] || {
                      icon: CheckCircle2,
                      iconBg: 'bg-brand-soft',
                      iconColor: 'text-brand',
                      borderHover: 'hover:border-brand/40',
                      badge: 'Verified',
                      badgeColor: 'border-brand/30 bg-brand-soft text-brand',
                      time: 'Just now',
                      subtitle: '',
                      chips: [],
                    };
                    const ItemIcon = item.icon;

                    return (
                      <motion.li
                        key={`${active.id}-${index}-${line}`}
                        variants={{
                          hidden: { opacity: 0, y: 10, filter: 'blur(4px)' },
                          show: { opacity: 1, y: 0, filter: 'blur(0px)' },
                        }}
                        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                        className={cn(
                          'group relative rounded-xl border p-3 transition-all duration-200',
                          'border-border/80 bg-surface/70 hover:bg-surface-elevated/90 hover:shadow-sm',
                          item.borderHover,
                          index === 0 && 'border-brand/40 bg-brand-soft/20',
                        )}
                      >
                        <div className="flex items-start gap-3">
                          {/* Item Custom Icon */}
                          <div
                            className={cn(
                              'relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border/70 shadow-sm transition-transform duration-200 group-hover:scale-105',
                              item.iconBg,
                              item.iconColor,
                            )}
                          >
                            <ItemIcon className="h-4.5 w-4.5" />
                          </div>

                          {/* Item Content */}
                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex flex-wrap items-center justify-between gap-1.5">
                              <span className="text-xs font-bold text-foreground sm:text-sm">
                                {line}
                              </span>
                              <div className="flex items-center gap-1.5">
                                <span
                                  className={cn(
                                    'inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-semibold',
                                    item.badgeColor,
                                  )}
                                >
                                  {item.badge}
                                </span>
                                <span className="text-[10px] text-muted">{item.time}</span>
                              </div>
                            </div>

                            {item.subtitle ? (
                              <p className="text-[11px] leading-relaxed text-muted">
                                {item.subtitle}
                              </p>
                            ) : null}

                            {/* Item Chips & Micro Visuals */}
                            <div className="flex flex-wrap items-center gap-1.5 pt-1">
                              {item.chips.map((chip) => (
                                <span
                                  key={chip}
                                  className="rounded border border-border/80 bg-surface-elevated/80 px-1.5 py-0.5 text-[9px] font-medium text-muted"
                                >
                                  {chip}
                                </span>
                              ))}

                              {/* Special attendance streak visual for Placement agent attendance item */}
                              {item.showStreak && (
                                <span className="inline-flex items-center gap-1 rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[9px] font-semibold text-emerald-600 dark:text-emerald-400">
                                  <span className="text-[8px]">Streak:</span>
                                  {['M', 'T', 'W', 'T', 'F'].map((day, dIdx) => (
                                    <span
                                      key={dIdx}
                                      className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-500 text-[7px] font-bold text-white shadow-xs"
                                    >
                                      ✓
                                    </span>
                                  ))}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.li>
                    );
                  })}
                </motion.ol>
              </AnimatePresence>
            </div>

            {/* Bottom Dots Navigation */}
            <div className="mt-5 flex items-center justify-between border-t border-border/70 pt-3">
              <span className="text-[11px] text-muted">
                Showing agent {activeIndex + 1} of {AGENTS.length}
              </span>
              <div className="flex items-center gap-1.5">
                {AGENTS.map((agent, index) => (
                  <button
                    key={agent.id}
                    type="button"
                    aria-label={t(`agents.${agent.id}.name` as TranslationKey)}
                    onClick={() => setActiveIndex(index)}
                    className={cn(
                      'h-1.5 rounded-full transition-all duration-300',
                      index === activeIndex
                        ? 'w-6 bg-brand'
                        : 'w-1.5 bg-border hover:bg-brand/50',
                    )}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </MarketingSection>
  );
}
