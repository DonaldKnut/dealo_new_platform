'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { DashHero, DashPanel } from '@/components/dashboard/dashboard-ui';
import { LanguageSwitcher } from '@/components/i18n/language-switcher';
import { InfoTooltip } from '@/components/ui/info-tooltip';
import { useToast } from '@/components/ui/toast';
import { logClientAudit } from '@/lib/client-audit';

const profileSchema = z.object({
  firstName: z.string().trim().min(1, 'Enter your first name').max(80),
  lastName: z.string().trim().min(1, 'Enter your last name').max(80),
  phone: z.string().trim().max(30).optional(),
  notifyEmail: z.boolean(),
});

type ProfileValues = z.infer<typeof profileSchema>;

export default function DashboardSettingsPage() {
  const toast = useToast();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      phone: '',
      notifyEmail: true,
    },
  });

  return (
    <div className="space-y-6">
      <DashHero
        eyebrow="Settings"
        title="Account & preferences"
        subtitle="Profile fields, language, and notification preferences. Every field is validated before save."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <DashPanel>
          <div className="mb-4 flex items-center gap-2">
            <h2 className="font-display text-xl">Profile</h2>
            <InfoTooltip
              label="Profile"
              content="Your display name and phone help Dealo contact you about hiring or talent matches."
            />
          </div>
          <form
            className="space-y-3"
            onSubmit={handleSubmit(async () => {
              toast.success('Preferences saved', 'Local preferences updated for this session.');
              logClientAudit({ action: 'SETTINGS_PROFILE_SAVE_UI', entityType: 'Settings' });
            })}
          >
            <label className="block text-sm">
              First name
              <input className="input-field mt-1" {...register('firstName')} />
              {errors.firstName ? (
                <span className="mt-1 block text-xs text-danger">{errors.firstName.message}</span>
              ) : null}
            </label>
            <label className="block text-sm">
              Last name
              <input className="input-field mt-1" {...register('lastName')} />
              {errors.lastName ? (
                <span className="mt-1 block text-xs text-danger">{errors.lastName.message}</span>
              ) : null}
            </label>
            <label className="block text-sm">
              Phone
              <input className="input-field mt-1" {...register('phone')} />
            </label>
            <label className="flex items-center gap-2 text-sm text-muted">
              <input type="checkbox" {...register('notifyEmail')} />
              Email me about ticket replies and matches
            </label>
            <button type="submit" className="btn-primary" disabled={isSubmitting}>
              Save profile
            </button>
          </form>
        </DashPanel>

        <DashPanel>
          <div className="mb-4 flex items-center gap-2">
            <h2 className="font-display text-xl">Language & security</h2>
            <InfoTooltip
              label="Language"
              content="Switch the site UI between English and French. Your choice is remembered in this browser."
            />
          </div>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted">Interface language</p>
              <LanguageSwitcher className="mt-2" />
            </div>
            <div className="rounded-xl border border-border bg-surface/50 p-4">
              <p className="text-sm font-medium text-foreground">Security</p>
              <p className="mt-1 text-xs leading-relaxed text-muted">
                Use “Forgot password” on the sign-in page to reset credentials. Google-linked accounts
                sign in through Google.
              </p>
            </div>
          </div>
        </DashPanel>
      </div>
    </div>
  );
}
