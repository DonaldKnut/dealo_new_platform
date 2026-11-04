'use client';

import { AnimatePresence, motion } from 'framer-motion';
import {
  BriefcaseBusiness,
  ExternalLink,
  FileText,
  HardHat,
  Linkedin,
  Loader2,
  MapPin,
  Phone,
  Search,
  Mail,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { CandidateAiPanel } from '@/components/ai/candidate-ai-panel';
import { DashHero, DashPanel, StatusChip } from '@/components/dashboard/dashboard-ui';
import { useToast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api';
import {
  fetchStaffTalentProfile,
  fetchStaffTalentProfiles,
  formatMinor,
  type StaffTalentDetail,
  type StaffTalentRow,
} from '@/lib/dashboard-api';
import { cn } from '@/lib/utils';

const AVAILABILITY_LABEL: Record<string, string> = {
  NOW: 'Ready now',
  TWO_WEEKS: 'In 2 weeks',
  ONE_MONTH: 'In 1 month',
  LATER: 'Later',
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

function ScoreBar({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-border">
        <div
          className={cn('h-full rounded-full', score >= 80 ? 'bg-brand' : score >= 50 ? 'bg-amber-500' : 'bg-red-400')}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className="text-[10px] font-semibold tabular-nums text-muted">{score}%</span>
    </div>
  );
}

function ProfileDrawer({ id, onClose }: { id: string; onClose: () => void }) {
  const toast = useToast();
  const [profile, setProfile] = useState<StaffTalentDetail | null>(null);

  useEffect(() => {
    fetchStaffTalentProfile(id)
      .then(setProfile)
      .catch((error) =>
        toast.error('Could not open profile', error instanceof ApiError ? error.message : undefined),
      );
  }, [id, toast]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const cv = profile?.documents.find((doc) => doc.kind === 'CV');

  return (
    <motion.div className="fixed inset-0 z-[60]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <button type="button" aria-label="Close" className="absolute inset-0 bg-black/40" onClick={onClose} />
      <motion.aside
        role="dialog"
        aria-modal="true"
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', stiffness: 320, damping: 34 }}
        className="safe-bottom absolute inset-y-0 right-0 flex w-full max-w-xl flex-col overflow-hidden border-l border-border bg-background"
      >
        <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-3 min-[340px]:px-5">
          <p className="text-sm font-semibold text-foreground">Professional profile</p>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border hover:border-brand hover:text-brand"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {!profile ? (
          <div className="flex flex-1 items-center justify-center text-sm text-muted">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : (
          <div className="flex-1 space-y-5 overflow-y-auto px-3 py-4 min-[340px]:px-5">
            <div className="flex items-start gap-3">
              <span className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand text-lg font-bold text-white dark:text-[#071f14]">
                {initials(profile.fullName)}
              </span>
              <div className="min-w-0">
                <p className="font-display text-xl font-semibold text-foreground">{profile.fullName}</p>
                <p className="text-sm text-muted">{profile.headline || profile.roleTitle || 'No job title yet'}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <StatusChip status={profile.screenStatus} />
                  {profile.openToWork ? (
                    <span className="rounded-full bg-brand-soft px-2.5 py-1 text-[11px] font-semibold text-brand">
                      Open to work
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            <ScoreBar score={profile.completeness.score} />

            <CandidateAiPanel candidateId={profile.id} />

            <div className="grid grid-cols-1 gap-2 text-sm min-[400px]:grid-cols-2">
              <a href={`mailto:${profile.email}`} className="flex min-w-0 items-center gap-2 text-foreground hover:text-brand">
                <Mail className="h-4 w-4 shrink-0 text-brand" />
                <span className="truncate">{profile.email}</span>
              </a>
              {profile.phone ? (
                <a href={`tel:${profile.phone}`} className="flex items-center gap-2 text-foreground hover:text-brand">
                  <Phone className="h-4 w-4 shrink-0 text-brand" />
                  {profile.phone}
                </a>
              ) : null}
              {profile.location ? (
                <p className="flex items-center gap-2 text-foreground">
                  <MapPin className="h-4 w-4 shrink-0 text-brand" />
                  {profile.location}
                </p>
              ) : null}
              {profile.linkedinUrl ? (
                <a
                  href={profile.linkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-foreground hover:text-brand"
                >
                  <Linkedin className="h-4 w-4 shrink-0 text-brand" />
                  LinkedIn
                </a>
              ) : null}
            </div>

            <dl className="grid grid-cols-2 gap-2 text-xs">
              {[
                ['Type', profile.roleFamily === 'SKILLED_TRADE' ? 'Skilled trade' : profile.roleFamily ? 'Office' : '—'],
                ['Job title', profile.roleTitle ?? '—'],
                ['Experience', profile.yearsExperience !== null ? `${profile.yearsExperience} years` : '—'],
                ['Can start', profile.availability ? AVAILABILITY_LABEL[profile.availability] : '—'],
                ['Pay wanted', profile.expectedPayMinor ? `${formatMinor(profile.expectedPayMinor, 'NGN')}/month` : '—'],
                ['Last update', profile.profileUpdatedAt ? new Date(profile.profileUpdatedAt).toLocaleDateString() : '—'],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl border border-border bg-surface px-3 py-2">
                  <dt className="text-muted">{label}</dt>
                  <dd className="mt-0.5 font-semibold text-foreground">{value}</dd>
                </div>
              ))}
            </dl>

            {profile.skills.length ? (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">Skills</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {profile.skills.map((skill) => (
                    <span key={skill} className="rounded-full bg-brand-soft px-2.5 py-1 text-xs text-foreground">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            {profile.bio ? (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">About</p>
                <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-foreground">{profile.bio}</p>
              </div>
            ) : null}

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">CV and documents</p>
              {profile.documents.length === 0 ? (
                <p className="mt-2 text-sm text-muted">No files uploaded yet.</p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {profile.documents.map((doc) => (
                    <li key={doc.id}>
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2.5 transition hover:border-brand/50"
                      >
                        <FileText className="h-4 w-4 shrink-0 text-brand" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-foreground">{doc.fileName}</span>
                          <span className="text-[11px] text-muted">
                            {doc.kind === 'CV' ? 'CV' : doc.kind.toLowerCase()} · {new Date(doc.createdAt).toLocaleDateString()}
                          </span>
                        </span>
                        <ExternalLink className="h-4 w-4 shrink-0 text-muted transition group-hover:text-brand" />
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {cv && cv.mimeType === 'application/pdf' ? (
              <iframe
                title={`CV of ${profile.fullName}`}
                src={cv.url}
                className="h-[28rem] w-full rounded-xl border border-border bg-white"
              />
            ) : null}

            {profile.shortlistEntries.length ? (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">On shortlists</p>
                <ul className="mt-2 space-y-1 text-sm">
                  {profile.shortlistEntries.map((entry) => (
                    <li key={entry.id} className="text-foreground">
                      #{entry.rank} · {entry.shortlist.hireInquiry.roleTitle} at {entry.shortlist.hireInquiry.companyName}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        )}
      </motion.aside>
    </motion.div>
  );
}

export function DashboardProfessionalsPanel() {
  const toast = useToast();
  const [rows, setRows] = useState<StaffTalentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFamily, setRoleFamily] = useState('');
  const [hasCv, setHasCv] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(
        await fetchStaffTalentProfiles({ search, roleFamily, hasCv: hasCv ? 'true' : '' }),
      );
    } catch (error) {
      toast.error('Could not load professionals', error instanceof ApiError ? error.message : undefined);
    } finally {
      setLoading(false);
    }
  }, [search, roleFamily, hasCv, toast]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 250);
    return () => window.clearTimeout(timer);
  }, [load]);

  const withCv = rows.filter((row) => row.cv).length;

  return (
    <div className="space-y-6">
      <DashHero
        eyebrow="Talent"
        title="Professionals"
        subtitle="Everyone who signed up as a professional. Open a profile to see their details and CV."
      />

      <DashPanel>
        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <label className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              className="input-field pl-9"
              placeholder="Search name, job, city or skill"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <div className="flex flex-wrap gap-1.5">
            {[
              { value: '', label: 'All' },
              { value: 'OFFICE_PROFESSIONAL', label: 'Office' },
              { value: 'SKILLED_TRADE', label: 'Trades' },
            ].map((option) => (
              <button
                key={option.value || 'all'}
                type="button"
                onClick={() => setRoleFamily(option.value)}
                className={cn(
                  'rounded-full border px-3 py-1.5 text-xs font-semibold transition',
                  roleFamily === option.value
                    ? 'border-brand bg-brand text-white dark:text-[#071f14]'
                    : 'border-border text-muted hover:text-foreground',
                )}
              >
                {option.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setHasCv((value) => !value)}
              className={cn(
                'rounded-full border px-3 py-1.5 text-xs font-semibold transition',
                hasCv ? 'border-brand bg-brand text-white dark:text-[#071f14]' : 'border-border text-muted hover:text-foreground',
              )}
            >
              Has CV
            </button>
          </div>
        </div>
        <p className="mt-3 text-xs text-muted">
          {rows.length} professional{rows.length === 1 ? '' : 's'} · {withCv} with a CV
        </p>
      </DashPanel>

      {loading && rows.length === 0 ? (
        <p className="flex items-center gap-2 text-sm text-muted">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </p>
      ) : rows.length === 0 ? (
        <DashPanel>
          <p className="text-sm text-muted">No professionals match these filters yet.</p>
        </DashPanel>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((row, index) => (
            <motion.button
              key={row.id}
              type="button"
              onClick={() => setOpenId(row.id)}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(index, 12) * 0.03 }}
              className="dash-panel group flex min-w-0 flex-col gap-3 p-4 text-left transition hover:-translate-y-0.5 hover:border-brand/40"
            >
              <div className="flex items-center gap-3">
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-sm font-bold text-brand">
                  {initials(row.fullName)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-foreground">{row.fullName}</p>
                  <p className="flex items-center gap-1 truncate text-xs text-muted">
                    {row.roleFamily === 'SKILLED_TRADE' ? (
                      <HardHat className="h-3 w-3 shrink-0" />
                    ) : (
                      <BriefcaseBusiness className="h-3 w-3 shrink-0" />
                    )}
                    <span className="truncate">{row.roleTitle || 'No job title yet'}</span>
                  </p>
                </div>
                {row.cv ? (
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-brand-soft px-2 py-0.5 text-[10px] font-semibold text-brand">
                    <FileText className="h-3 w-3" /> CV
                  </span>
                ) : null}
              </div>
              {row.location ? (
                <p className="flex items-center gap-1 truncate text-xs text-muted">
                  <MapPin className="h-3 w-3 shrink-0" /> {row.location}
                </p>
              ) : null}
              {row.skills.length ? (
                <div className="flex flex-wrap gap-1">
                  {row.skills.slice(0, 4).map((skill) => (
                    <span key={skill} className="max-w-full truncate rounded-full border border-border px-2 py-0.5 text-[10px] text-muted">
                      {skill}
                    </span>
                  ))}
                  {row.skills.length > 4 ? (
                    <span className="text-[10px] text-muted">+{row.skills.length - 4}</span>
                  ) : null}
                </div>
              ) : null}
              <ScoreBar score={row.completeness.score} />
            </motion.button>
          ))}
        </div>
      )}

      <AnimatePresence>
        {openId ? <ProfileDrawer key={openId} id={openId} onClose={() => setOpenId(null)} /> : null}
      </AnimatePresence>
    </div>
  );
}
