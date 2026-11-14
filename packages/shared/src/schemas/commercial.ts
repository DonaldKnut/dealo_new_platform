/**
 * Future commercial products — shared catalogue so web, API, and ops stay aligned.
 * Early partners stay free; billing hooks turn on when volume is real.
 * Cover and training are quote-based: no public list prices.
 */

/** Partner Job Agent / ATS sync billing (boards & HR tools). */
export const PARTNER_API_BILLING = {
  EARLY_ACCESS: {
    id: 'EARLY_ACCESS',
    label: 'Early partner',
    mode: 'free' as const,
    monthlyMinor: 0,
    perApplyMinor: 0,
    includedApplies: 2_000,
    softOpenJobCap: 200,
    note: 'Free while we prove volume together. Soft caps only; no card required.',
  },
  MONTHLY: {
    id: 'MONTHLY',
    label: 'Partner monthly',
    mode: 'monthly' as const,
    quoteRequired: true as const,
    includedApplies: 500,
    softOpenJobCap: 2_000,
    note: 'Quoted monthly fee with a pool of included applications once volume is real. No public list price.',
  },
  PER_APPLY: {
    id: 'PER_APPLY',
    label: 'Pay per apply',
    mode: 'per_apply' as const,
    quoteRequired: true as const,
    monthlyMinor: 0,
    includedApplies: 0,
    softOpenJobCap: 5_000,
    note: 'Quoted per successful apply when leaving early access. No public list price.',
  },
} as const;

export type PartnerApiBillingId = keyof typeof PARTNER_API_BILLING;

/** Temp / contract cover — day rates + mark-up (trades + short office cover). Quote after brief. */
export const CONTRACT_COVER = {
  id: 'CONTRACT_COVER',
  name: 'Temp & contract cover',
  billing: 'day_rate_plus_markup' as const,
  quoteRequired: true as const,
  minDays: 1,
  maxDaysSoft: 90,
  highRepeat: true,
  audiences: ['SKILLED_TRADE', 'OFFICE_SHORT_COVER'] as const,
  note: 'Quoted as worker day rate + Dealo mark-up after we understand the role, days, and site. No public list price.',
} as const;

/** Post-hire training / upskilling — employers pay for modules after placement. Quote after brief. */
export const TALENT_TRAINING = {
  id: 'TALENT_TRAINING',
  name: 'Onboarding & upskilling',
  billing: 'per_module_employer' as const,
  payer: 'employer' as const,
  quoteRequired: true as const,
  modules: [
    {
      id: 'SITE_SAFETY',
      title: 'Site safety basics',
      audience: 'SKILLED_TRADE' as const,
    },
    {
      id: 'TOOLS_REFRESHER',
      title: 'Tools & quality refresher',
      audience: 'SKILLED_TRADE' as const,
    },
    {
      id: 'OFFICE_ONBOARD',
      title: 'Office onboarding pack',
      audience: 'OFFICE_PROFESSIONAL' as const,
    },
    {
      id: 'CUSTOMER_SERVICE',
      title: 'Customer service polish',
      audience: 'OFFICE_PROFESSIONAL' as const,
    },
  ],
  note: 'Sold after a successful hire. Employer pays; we quote modules for the placement. No public list prices.',
} as const;

export type TalentTrainingModuleId = (typeof TALENT_TRAINING.modules)[number]['id'];

/** Wire-up plan for when we turn commercial metering on (no live billing yet). */
export const COMMERCIAL_ROADMAP = {
  partnerApi: {
    status: 'architecture' as const,
    next: [
      'Meter application.created webhooks per partner key',
      'Attach PARTNER_API_BILLING plan on ApiKey / workspace',
      'Invoice monthly or settle per-apply via Paystack when leaving EARLY_ACCESS',
    ],
  },
  contractCover: {
    status: 'intake' as const,
    next: [
      'Ops quote: worker day rate × days × (1 + markup) — never publish list prices',
      'Repeat-book shortcuts for known employers',
    ],
  },
  talentTraining: {
    status: 'intake' as const,
    next: [
      'TrainingOrder linked to placement / hire inquiry',
      'Employer checkout per quoted module bundle',
      'Completion certificate on talent profile',
    ],
  },
} as const;
