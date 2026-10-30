'use client';

import {
  BadgeCheck,
  Briefcase,
  CalendarCheck2,
  FileUp,
  Sparkles,
  UserRoundCheck,
} from 'lucide-react';
import Link from 'next/link';

import { CtaBanner } from '@/components/marketing/cta-banner';
import { FeatureAdGrid } from '@/components/marketing/feature-ad-grid';
import { IllustrationBand } from '@/components/marketing/illustration-band';
import { PageHero } from '@/components/marketing/page-hero';
import { StatAdvert } from '@/components/marketing/stat-advert';

export default function ForProfessionalsPage() {
  return (
    <div>
      <PageHero
        eyebrow="Professionals"
        title="Build a professional profile employers can trust"
        description="Create your profile, upload documents securely, apply to opportunities, and track interviews and offers in one place."
        actions={
          <>
            <Link href="/auth/register" className="btn-primary">
              Register as talent
            </Link>
            <Link href="/auth/login" className="btn-secondary">
              Sign in
            </Link>
          </>
        }
      />

      <StatAdvert
        items={[
          { value: 'Profile-first', label: 'Show experience employers can verify' },
          { value: 'Matched', label: 'Opportunities aligned to your strengths' },
          { value: 'Tracked', label: 'Interviews and offers in one workspace' },
        ]}
      />

      <FeatureAdGrid
        eyebrow="Talent network"
        title="Show up ready for serious roles"
        description="Dealo connects professionals with employers who hire through structured recruitment and managed staffing."
        items={[
          {
            icon: UserRoundCheck,
            title: 'Trusted profile',
            body: 'Present your experience, skills, and readiness with a clean professional presence.',
          },
          {
            icon: FileUp,
            title: 'Secure documents',
            body: 'Upload credentials and supporting files through a controlled, professional flow.',
          },
          {
            icon: Briefcase,
            title: 'Relevant openings',
            body: 'Get considered for roles that match administrative and professional staffing needs.',
          },
          {
            icon: CalendarCheck2,
            title: 'Interview clarity',
            body: 'Track interview stages and next actions without chasing scattered messages.',
          },
          {
            icon: BadgeCheck,
            title: 'Placement support',
            body: 'From shortlist to offer, stay aligned with Dealo’s operating process.',
          },
          {
            icon: Sparkles,
            title: 'Google sign-in',
            body: 'Create or continue your account quickly with secure Google authentication.',
          },
        ]}
      />

      <IllustrationBand
        eyebrow="Your path"
        title="Register once. Stay ready for the right brief."
        description="Employers submit structured requests. Dealo screens and shortlists. When your profile fits, you move into interviews with clarity."
        actions={
          <Link href="/auth/register" className="btn-primary">
            Join the talent network
          </Link>
        }
        illustration={
          <div className="grid w-full max-w-sm gap-3">
            {['Create profile', 'Complete documents', 'Get shortlisted', 'Interview & place'].map(
              (label, index) => (
                <div
                  key={label}
                  className="rounded-xl border border-border bg-surface-elevated/90 px-4 py-3"
                >
                  <p className="text-xs font-semibold uppercase tracking-wider text-brand">
                    Stage {index + 1}
                  </p>
                  <p className="mt-1 text-sm font-medium text-foreground">{label}</p>
                </div>
              ),
            )}
          </div>
        }
      />

      <CtaBanner />
    </div>
  );
}
