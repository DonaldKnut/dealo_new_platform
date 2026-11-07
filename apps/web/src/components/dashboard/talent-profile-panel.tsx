'use client';

import { RoleFamily, talentProfileSchema, TalentAvailability } from '@dealo/shared';
import { AnimatePresence, motion } from 'framer-motion';
import {
  BriefcaseBusiness,
  CalendarCheck,
  CheckCircle2,
  Clock3,
  ExternalLink,
  FileText,
  HardHat,
  Hourglass,
  Loader2,
  Plus,
  Trash2,
  UploadCloud,
  X,
  Zap,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type DragEvent, type KeyboardEvent } from 'react';

import { DashHero, DashPanel } from '@/components/dashboard/dashboard-ui';
import { FormField } from '@/components/forms/form-field';
import { IllustrativeOptionPicker, type IllustrativeOption } from '@/components/forms/illustrative-option-picker';
import { RoleAutocomplete } from '@/components/ui/role-autocomplete';
import { useToast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api';
import { apiFileHref } from '@/lib/api-base';
import {
  deleteTalentDocument,
  fetchTalentDocuments,
  fetchTalentMe,
  updateTalentProfile,
  uploadTalentDocument,
  type ProfileCompleteness,
  type TalentDocument,
} from '@/lib/dashboard-api';
import { cn } from '@/lib/utils';

const FAMILY_OPTIONS: IllustrativeOption[] = [
  {
    value: RoleFamily.OFFICE_PROFESSIONAL,
    label: 'Office job',
    description: 'Admin, finance, tech, HR and similar',
    icon: BriefcaseBusiness,
  },
  {
    value: RoleFamily.SKILLED_TRADE,
    label: 'Skilled trade',
    description: 'Bricklaying, electrical, plumbing, welding and more',
    icon: HardHat,
  },
];

const AVAILABILITY_OPTIONS: IllustrativeOption[] = [
  { value: TalentAvailability.NOW, label: 'Ready now', description: 'I can start this week', icon: Zap },
  { value: TalentAvailability.TWO_WEEKS, label: 'In 2 weeks', description: 'I need a short notice period', icon: Clock3 },
  { value: TalentAvailability.ONE_MONTH, label: 'In 1 month', description: 'I need about a month', icon: CalendarCheck },
  { value: TalentAvailability.LATER, label: 'Later', description: 'Just looking for now', icon: Hourglass },
];

const SKILL_IDEAS: Record<string, string[]> = {
  [RoleFamily.OFFICE_PROFESSIONAL]: ['Excel', 'Bookkeeping', 'Customer service', 'Payroll', 'Project management', 'Sales', 'React', 'Data entry'],
  [RoleFamily.SKILLED_TRADE]: ['Blockwork', 'Wiring', 'Solar install', 'Pipe fitting', 'Arc welding', 'Tiling', 'Reading drawings', 'Site safety'],
};

type Form = {
  fullName: string;
  phone: string;
  roleTitle: string;
  roleFamily: string;
  location: string;
  headline: string;
  bio: string;
  skills: string[];
  yearsExperience: string;
  availability: string;
  expectedPay: string;
  linkedinUrl: string;
  portfolioUrl: string;
  openToWork: boolean;
};

const EMPTY: Form = {
  fullName: '',
  phone: '',
  roleTitle: '',
  roleFamily: RoleFamily.OFFICE_PROFESSIONAL,
  location: '',
  headline: '',
  bio: '',
  skills: [],
  yearsExperience: '',
  availability: '',
  expectedPay: '',
  linkedinUrl: '',
  portfolioUrl: '',
  openToWork: true,
};

function toPayload(form: Form) {
  return {
    fullName: form.fullName,
    phone: form.phone || undefined,
    roleTitle: form.roleTitle,
    roleFamily: form.roleFamily,
    location: form.location,
    headline: form.headline || undefined,
    bio: form.bio || undefined,
    skills: form.skills,
    yearsExperience: form.yearsExperience === '' ? undefined : Number(form.yearsExperience),
    availability: form.availability || undefined,
    expectedPayMinor: form.expectedPay === '' ? undefined : Math.round(Number(form.expectedPay) * 100),
    linkedinUrl: form.linkedinUrl,
    portfolioUrl: form.portfolioUrl,
    openToWork: form.openToWork,
  };
}

function formatBytes(bytes: number) {
  return bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;
}

function CompletenessRing({ score }: { score: number }) {
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  return (
    <div className="relative h-24 w-24 shrink-0">
      <svg viewBox="0 0 80 80" className="h-24 w-24 -rotate-90">
        <circle cx="40" cy="40" r={radius} className="fill-none stroke-border" strokeWidth="7" />
        <motion.circle
          cx="40"
          cy="40"
          r={radius}
          className="fill-none stroke-brand"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference * (1 - score / 100) }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center font-display text-xl font-semibold text-foreground">
        {score}%
      </span>
    </div>
  );
}

export function TalentProfilePanel() {
  const toast = useToast();
  const [form, setForm] = useState<Form>(EMPTY);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [completeness, setCompleteness] = useState<ProfileCompleteness>({ score: 0, missing: [] });
  const [documents, setDocuments] = useState<TalentDocument[]>([]);
  const [skillDraft, setSkillDraft] = useState('');
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const set = <K extends keyof Form>(key: K, value: Form[K]) => setForm((current) => ({ ...current, [key]: value }));

  const loadDocuments = useCallback(async () => {
    setDocuments(await fetchTalentDocuments());
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const [me] = await Promise.all([fetchTalentMe(), loadDocuments()]);
        const c = me.candidate;
        setEmail(c.email);
        setCompleteness(me.completeness);
        setForm({
          fullName: c.fullName ?? '',
          phone: c.phone ?? '',
          roleTitle: c.roleTitle ?? '',
          roleFamily: c.roleFamily ?? RoleFamily.OFFICE_PROFESSIONAL,
          location: c.location ?? '',
          headline: c.headline ?? '',
          bio: c.bio ?? '',
          skills: c.skills ?? [],
          yearsExperience: c.yearsExperience?.toString() ?? '',
          availability: c.availability ?? '',
          expectedPay: c.expectedPayMinor ? String(c.expectedPayMinor / 100) : '',
          linkedinUrl: c.linkedinUrl ?? '',
          portfolioUrl: c.portfolioUrl ?? '',
          openToWork: c.openToWork,
        });
      } catch (error) {
        toast.error('Could not load your profile', error instanceof ApiError ? error.message : undefined);
      } finally {
        setLoading(false);
      }
    })();
  }, [loadDocuments, toast]);

  const addSkill = (raw: string) => {
    const skill = raw.trim().replace(/,$/, '');
    if (!skill) return;
    setForm((current) =>
      current.skills.some((s) => s.toLowerCase() === skill.toLowerCase()) || current.skills.length >= 20
        ? current
        : { ...current, skills: [...current.skills, skill.slice(0, 40)] },
    );
    setSkillDraft('');
  };

  const onSkillKey = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      addSkill(skillDraft);
    } else if (event.key === 'Backspace' && !skillDraft && form.skills.length) {
      set('skills', form.skills.slice(0, -1));
    }
  };

  const onSave = async () => {
    const payload = toPayload(form);
    const parsed = talentProfileSchema.safeParse(payload);
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) next[String(issue.path[0])] ??= issue.message;
      setErrors(next);
      toast.error('Please check the highlighted fields');
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      const result = await updateTalentProfile(payload);
      setCompleteness(result.completeness);
      toast.success('Profile saved', 'Dealo recruiters can now see your updates.');
    } catch (error) {
      toast.error('Could not save', error instanceof ApiError ? error.message : undefined);
    } finally {
      setSaving(false);
    }
  };

  const uploadCv = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      await uploadTalentDocument(file, 'CV');
      await loadDocuments();
      const me = await fetchTalentMe();
      setCompleteness(me.completeness);
      toast.success('CV uploaded');
    } catch (error) {
      toast.error('Upload failed', error instanceof ApiError ? error.message : undefined);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    void uploadCv(event.dataTransfer.files?.[0]);
  };

  const removeDocument = async (id: string) => {
    try {
      await deleteTalentDocument(id);
      await loadDocuments();
      const me = await fetchTalentMe();
      setCompleteness(me.completeness);
      toast.success('File removed');
    } catch (error) {
      toast.error('Could not remove file', error instanceof ApiError ? error.message : undefined);
    }
  };

  const cvs = documents.filter((doc) => doc.kind === 'CV');
  const ideas = (SKILL_IDEAS[form.roleFamily] ?? []).filter(
    (idea) => !form.skills.some((skill) => skill.toLowerCase() === idea.toLowerCase()),
  );

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading your profileâ€¦
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <DashHero
        eyebrow="My profile"
        title="Show employers what you can do"
        subtitle="A full profile and a CV help our recruiters match you faster. Only Dealo staff and employers you are shortlisted for can see it."
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-6">
        <div className="order-2 space-y-4 lg:order-1">
          <DashPanel title="About you">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField label="Full name" error={errors.fullName}>
                <input className="input-field" value={form.fullName} onChange={(e) => set('fullName', e.target.value)} />
              </FormField>
              <FormField label="Phone" optional error={errors.phone}>
                <input
                  className="input-field"
                  inputMode="tel"
                  value={form.phone}
                  onChange={(e) => set('phone', e.target.value)}
                  placeholder="+234â€¦"
                />
              </FormField>
              <FormField label="Email">
                <input className="input-field opacity-70" value={email} disabled />
              </FormField>
              <FormField label="Where are you based?" error={errors.location}>
                <input
                  className="input-field"
                  value={form.location}
                  onChange={(e) => set('location', e.target.value)}
                  placeholder="e.g. Ikeja, Lagos"
                />
              </FormField>
              <FormField
                label="One-line headline"
                optional
                className="sm:col-span-2"
                help="A short line employers see first. Example: Site electrician with 7 years on estate projects."
              >
                <input
                  className="input-field"
                  maxLength={160}
                  value={form.headline}
                  onChange={(e) => set('headline', e.target.value)}
                  placeholder="e.g. Accountant who keeps small business books clean"
                />
              </FormField>
              <FormField
                label="About you"
                optional
                className="sm:col-span-2"
                hint={`${form.bio.length}/2000 Â· Say what you are good at and what work you want next.`}
              >
                <textarea
                  rows={4}
                  maxLength={2000}
                  className="input-field resize-y"
                  value={form.bio}
                  onChange={(e) => set('bio', e.target.value)}
                />
              </FormField>
            </div>
          </DashPanel>

          <DashPanel title="Your work">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField label="Type of work" error={errors.roleFamily}>
                <IllustrativeOptionPicker
                  value={form.roleFamily}
                  options={FAMILY_OPTIONS}
                  onChange={(next) => set('roleFamily', next)}
                />
              </FormField>
              <FormField label="Job title" error={errors.roleTitle}>
                <RoleAutocomplete
                  value={form.roleTitle}
                  family={form.roleFamily as 'OFFICE_PROFESSIONAL' | 'SKILLED_TRADE'}
                  placeholder={form.roleFamily === RoleFamily.SKILLED_TRADE ? 'e.g. Electrician' : 'e.g. Accountant'}
                  onChange={(next) => set('roleTitle', next)}
                  onBlur={() => undefined}
                />
              </FormField>
              <FormField label="Years of experience" optional error={errors.yearsExperience}>
                <input
                  type="number"
                  min={0}
                  max={60}
                  inputMode="numeric"
                  className="input-field"
                  value={form.yearsExperience}
                  onChange={(e) => set('yearsExperience', e.target.value)}
                />
              </FormField>
              <FormField label="When can you start?" optional>
                <IllustrativeOptionPicker
                  value={form.availability}
                  options={AVAILABILITY_OPTIONS}
                  placeholder="Choose one"
                  onChange={(next) => set('availability', next)}
                />
              </FormField>
              <FormField
                label="Pay you want (NGN a month)"
                optional
                help="Only Dealo recruiters see this. It helps us match you to fair offers."
              >
                <input
                  type="number"
                  min={0}
                  inputMode="numeric"
                  className="input-field"
                  value={form.expectedPay}
                  onChange={(e) => set('expectedPay', e.target.value)}
                  placeholder="e.g. 350000"
                />
              </FormField>
              <FormField label="Open to new work">
                <button
                  type="button"
                  role="switch"
                  aria-checked={form.openToWork}
                  onClick={() => set('openToWork', !form.openToWork)}
                  className="flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-surface-elevated px-3 py-2.5 text-sm"
                >
                  <span className="text-foreground">{form.openToWork ? 'Yes, show me to employers' : 'No, hide me for now'}</span>
                  <span
                    className={cn(
                      'relative h-6 w-11 shrink-0 rounded-full transition-colors',
                      form.openToWork ? 'bg-brand' : 'bg-border',
                    )}
                  >
                    <motion.span
                      layout
                      transition={{ type: 'spring', stiffness: 500, damping: 32 }}
                      className={cn(
                        'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow',
                        form.openToWork ? 'right-0.5' : 'left-0.5',
                      )}
                    />
                  </span>
                </button>
              </FormField>

              <FormField
                label="Skills"
                className="sm:col-span-2"
                hint={`${form.skills.length}/20 Â· Press Enter after each skill.`}
                error={errors.skills}
              >
                <div className="flex min-h-[3rem] flex-wrap items-center gap-1.5 rounded-xl border border-border bg-surface-elevated p-2 focus-within:border-brand">
                  <AnimatePresence initial={false}>
                    {form.skills.map((skill) => (
                      <motion.span
                        key={skill}
                        layout
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="inline-flex max-w-full items-center gap-1 rounded-full bg-brand-soft px-2.5 py-1 text-xs font-medium text-foreground"
                      >
                        <span className="truncate">{skill}</span>
                        <button
                          type="button"
                          aria-label={`Remove ${skill}`}
                          onClick={() => set('skills', form.skills.filter((s) => s !== skill))}
                          className="text-muted hover:text-foreground"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </motion.span>
                    ))}
                  </AnimatePresence>
                  <input
                    className="min-w-[6rem] flex-1 bg-transparent px-1 py-1 text-sm outline-none"
                    value={skillDraft}
                    onChange={(e) => setSkillDraft(e.target.value)}
                    onKeyDown={onSkillKey}
                    onBlur={() => addSkill(skillDraft)}
                    placeholder={form.skills.length ? 'Add another' : 'Type a skill'}
                  />
                </div>
                {ideas.length ? (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {ideas.slice(0, 6).map((idea) => (
                      <button
                        key={idea}
                        type="button"
                        onClick={() => addSkill(idea)}
                        className="inline-flex items-center gap-1 rounded-full border border-dashed border-border px-2.5 py-1 text-[11px] text-muted transition hover:border-brand hover:text-brand"
                      >
                        <Plus className="h-3 w-3" /> {idea}
                      </button>
                    ))}
                  </div>
                ) : null}
              </FormField>

              <FormField label="LinkedIn link" optional error={errors.linkedinUrl}>
                <input
                  className="input-field"
                  inputMode="url"
                  value={form.linkedinUrl}
                  onChange={(e) => set('linkedinUrl', e.target.value)}
                  placeholder="https://linkedin.com/in/â€¦"
                />
              </FormField>
              <FormField label="Portfolio or work photos link" optional error={errors.portfolioUrl}>
                <input
                  className="input-field"
                  inputMode="url"
                  value={form.portfolioUrl}
                  onChange={(e) => set('portfolioUrl', e.target.value)}
                  placeholder="https://â€¦"
                />
              </FormField>
            </div>
          </DashPanel>

          <div className="sticky bottom-[calc(4.5rem+var(--safe-bottom))] z-20 flex justify-end lg:bottom-4">
            <button type="button" className="btn-primary shadow-xl" disabled={saving} onClick={onSave}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              {saving ? 'Savingâ€¦' : 'Save profile'}
            </button>
          </div>
        </div>

        <div className="order-1 space-y-4 lg:order-2">
          <DashPanel>
            <div className="flex items-center gap-4">
              <CompletenessRing score={completeness.score} />
              <div className="min-w-0">
                <p className="font-semibold text-foreground">
                  {completeness.score === 100 ? 'Profile complete' : 'Profile strength'}
                </p>
                <p className="mt-0.5 text-xs text-muted">
                  {completeness.score === 100
                    ? 'Great work. Recruiters can see everything they need.'
                    : 'Complete profiles get shortlisted more often.'}
                </p>
              </div>
            </div>
            {completeness.missing.length ? (
              <ul className="mt-4 space-y-1.5 text-xs">
                {completeness.missing.map((item) => (
                  <li key={item} className="flex items-center gap-2 text-muted">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                    Add: {item}
                  </li>
                ))}
              </ul>
            ) : null}
          </DashPanel>

          <DashPanel title="Your CV">
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              onClick={() => fileRef.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') fileRef.current?.click();
              }}
              className={cn(
                'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-3 py-6 text-center transition-colors',
                dragging ? 'border-brand bg-brand-soft/50' : 'border-border hover:border-brand/50 hover:bg-surface',
              )}
            >
              {uploading ? (
                <Loader2 className="h-6 w-6 animate-spin text-brand" />
              ) : (
                <UploadCloud className="h-6 w-6 text-brand" />
              )}
              <p className="text-sm font-medium text-foreground">
                {uploading ? 'Uploadingâ€¦' : cvs.length ? 'Upload a newer CV' : 'Drop your CV here or tap to choose'}
              </p>
              <p className="text-[11px] text-muted">PDF or Word, up to 8MB</p>
              <input
                ref={fileRef}
                type="file"
                className="hidden"
                accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={(e) => void uploadCv(e.target.files?.[0])}
              />
            </div>

            {documents.length ? (
              <ul className="mt-3 space-y-2">
                {documents.map((doc) => (
                  <li key={doc.id} className="flex items-center gap-2 rounded-xl border border-border bg-surface px-2.5 py-2">
                    <FileText className="h-4 w-4 shrink-0 text-brand" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-foreground">{doc.fileName}</p>
                      <p className="text-[10px] text-muted">
                        {doc.kind === 'CV' ? 'CV' : doc.kind.toLowerCase()} Â· {formatBytes(doc.byteSize)}
                      </p>
                    </div>
                    <a
                      href={apiFileHref(doc.url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Open ${doc.fileName}`}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-full text-muted hover:text-brand"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                    <button
                      type="button"
                      aria-label={`Delete ${doc.fileName}`}
                      onClick={() => void removeDocument(doc.id)}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-full text-muted hover:text-red-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </DashPanel>
        </div>
      </div>
    </div>
  );
}
