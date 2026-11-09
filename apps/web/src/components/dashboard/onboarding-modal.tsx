'use client';

import { onboardingSchema, UserRole, type OnboardingInput } from '@dealo/shared';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  Check,
  Loader2,
  MapPin,
  Phone,
  Search,
  User,
} from 'lucide-react';
import { useState } from 'react';

import { BrandLogo } from '@/components/brand-logo';
import { FormField } from '@/components/forms/form-field';
import { useToast } from '@/components/ui/toast';
import type { AuthSessionUser } from '@/hooks/use-auth-session';
import { ApiError, apiFetch } from '@/lib/api';
import { cn } from '@/lib/utils';

type Role = OnboardingInput['role'];

const ROLES: Array<{ value: Role; title: string; text: string; icon: typeof Building2 }> = [
  {
    value: UserRole.EMPLOYER,
    title: 'I want to hire',
    text: 'Post jobs, request checked candidates and hire with your team.',
    icon: Building2,
  },
  {
    value: UserRole.TALENT,
    title: 'I want a job',
    text: 'Build your profile and CV, and get matched to employers.',
    icon: Search,
  },
];

/** Shown once after a first Google or LinkedIn sign-in, which tells us who you are but not what you need. */
export function OnboardingModal({
  user,
  onDone,
}: {
  user: AuthSessionUser;
  onDone: () => Promise<void>;
}) {
  const toast = useToast();
  const [step, setStep] = useState<1 | 2>(1);
  const [role, setRole] = useState<Role | null>(
    user.roles.includes(UserRole.TALENT) && !user.roles.includes(UserRole.EMPLOYER)
      ? UserRole.TALENT
      : null,
  );
  const [form, setForm] = useState({
    firstName: user.firstName === 'Dealo' ? '' : user.firstName,
    lastName: user.lastName === 'User' ? '' : user.lastName,
    phone: '',
    companyName: '',
    roleTitle: '',
    location: '',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof typeof form, string>>>({});
  const [saving, setSaving] = useState(false);

  const set = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) =>
    setForm((current) => ({ ...current, [key]: event.target.value }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!role) return;
    const parsed = onboardingSchema.safeParse({ role, ...form });
    if (!parsed.success) {
      setErrors(
        Object.fromEntries(parsed.error.issues.map((issue) => [issue.path[0], issue.message])),
      );
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      await apiFetch('/auth/onboarding', { method: 'POST', json: parsed.data });
      toast.success(
        'You are all set',
        role === UserRole.EMPLOYER
          ? `${form.companyName} is ready. Invite your team any time.`
          : 'Finish your profile so employers can find you.',
      );
      await onDone();
    } catch (error) {
      toast.error('Could not save your details', error instanceof ApiError ? error.message : '');
      setSaving(false);
    }
  };

  return (
    <motion.div
      className="fixed inset-0 z-[90] flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center sm:p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-title"
        initial={{ y: 40, opacity: 0, scale: 0.98 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="relative max-h-[92dvh] w-full overflow-y-auto rounded-t-3xl border border-border bg-background p-5 pb-[max(1.25rem,var(--safe-bottom))] shadow-2xl sm:max-w-xl sm:rounded-3xl sm:p-7"
      >
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-[radial-gradient(80%_100%_at_50%_0%,color-mix(in_srgb,var(--brand)_16%,transparent),transparent)]"
          aria-hidden
        />
        <div className="relative">
          <div className="flex items-center justify-between gap-3">
            <BrandLogo href="/" />
            <span className="text-xs font-semibold text-muted">Step {step} of 2</span>
          </div>
          <div className="mt-4 h-1 overflow-hidden rounded-full bg-surface">
            <motion.div
              className="h-full rounded-full bg-brand"
              animate={{ width: step === 1 ? '50%' : '100%' }}
              transition={{ type: 'spring', stiffness: 200, damping: 30 }}
            />
          </div>

          <AnimatePresence mode="wait">
            {step === 1 ? (
              <motion.div
                key="role"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                className="mt-6"
              >
                <h2 id="onboarding-title" className="font-display text-2xl text-foreground">
                  Welcome{form.firstName ? `, ${form.firstName}` : ''}! How will you use Dealo?
                </h2>
                <p className="mt-1.5 text-sm text-muted">
                  This sets up the right tools for you. You can contact us to change it later.
                </p>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {ROLES.map((option) => {
                    const selected = role === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setRole(option.value)}
                        aria-pressed={selected}
                        className={cn(
                          'relative rounded-2xl border p-4 text-left transition',
                          selected
                            ? 'border-brand bg-brand-soft/60 ring-2 ring-brand/30'
                            : 'border-border hover:border-brand/50 hover:bg-surface',
                        )}
                      >
                        <span
                          className={cn(
                            'inline-flex h-10 w-10 items-center justify-center rounded-xl',
                            selected
                              ? 'bg-brand text-white dark:text-[#071f14]'
                              : 'bg-surface text-brand',
                          )}
                        >
                          <option.icon className="h-5 w-5" />
                        </span>
                        <p className="mt-3 text-sm font-semibold text-foreground">{option.title}</p>
                        <p className="mt-1 text-xs leading-relaxed text-muted">{option.text}</p>
                        {selected ? (
                          <motion.span
                            layoutId="onboarding-check"
                            className="absolute right-3 top-3 inline-flex h-6 w-6 items-center justify-center rounded-full bg-brand text-white dark:text-[#071f14]"
                          >
                            <Check className="h-3.5 w-3.5" />
                          </motion.span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
                <button
                  type="button"
                  className="btn-primary mt-6 w-full"
                  disabled={!role}
                  onClick={() => setStep(2)}
                >
                  Continue <ArrowRight className="h-4 w-4" />
                </button>
              </motion.div>
            ) : (
              <motion.form
                key="details"
                onSubmit={submit}
                noValidate
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                className="mt-6 space-y-4"
              >
                <div>
                  <h2 id="onboarding-title" className="font-display text-2xl text-foreground">
                    {role === UserRole.EMPLOYER
                      ? 'Tell us about your company'
                      : 'A few details about you'}
                  </h2>
                  <p className="mt-1.5 text-sm text-muted">Signed in as {user.email}</p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField label="First name" error={errors.firstName}>
                    <div className="relative">
                      <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                      <input
                        className="input-field pl-10"
                        value={form.firstName}
                        onChange={set('firstName')}
                        autoComplete="given-name"
                        autoFocus
                      />
                    </div>
                  </FormField>
                  <FormField label="Last name" error={errors.lastName}>
                    <input
                      className="input-field"
                      value={form.lastName}
                      onChange={set('lastName')}
                      autoComplete="family-name"
                    />
                  </FormField>
                </div>
                {role === UserRole.EMPLOYER ? (
                  <FormField
                    label="Company name"
                    error={errors.companyName}
                    help="We create your company account so you can invite your team."
                  >
                    <div className="relative">
                      <Building2 className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                      <input
                        className="input-field pl-10"
                        value={form.companyName}
                        onChange={set('companyName')}
                        placeholder="Acme Logistics Ltd"
                        autoComplete="organization"
                      />
                    </div>
                  </FormField>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField label="Job title" optional error={errors.roleTitle}>
                      <div className="relative">
                        <BriefcaseBusiness className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                        <input
                          className="input-field pl-10"
                          value={form.roleTitle}
                          onChange={set('roleTitle')}
                          placeholder="Accountant"
                        />
                      </div>
                    </FormField>
                    <FormField label="City" optional error={errors.location}>
                      <div className="relative">
                        <MapPin className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                        <input
                          className="input-field pl-10"
                          value={form.location}
                          onChange={set('location')}
                          placeholder="Lagos"
                        />
                      </div>
                    </FormField>
                  </div>
                )}
                <FormField
                  label="Phone"
                  optional
                  error={errors.phone}
                  help={
                    role === UserRole.TALENT
                      ? 'Employers and Dealo use it to reach you about jobs.'
                      : undefined
                  }
                >
                  <div className="relative">
                    <Phone className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                    <input
                      className="input-field pl-10"
                      value={form.phone}
                      onChange={set('phone')}
                      placeholder="+234 801 234 5678"
                      type="tel"
                      autoComplete="tel"
                    />
                  </div>
                </FormField>
                <div className="flex flex-col-reverse gap-2 pt-1 min-[340px]:flex-row">
                  <button
                    type="button"
                    className="btn-secondary min-[340px]:w-auto"
                    onClick={() => setStep(1)}
                    disabled={saving}
                  >
                    <ArrowLeft className="h-4 w-4" /> Back
                  </button>
                  <button type="submit" className="btn-primary flex-1" disabled={saving}>
                    {saving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                    {saving ? 'Setting up…' : 'Finish setup'}
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}
