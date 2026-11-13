/**
 * Future commercial products — shared catalogue so web, API, and ops stay aligned.
 * Early partners stay free; billing hooks turn on when volume is real.
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
    /** Placeholder list price in kobo (₦150,000). Final numbers set in ops when volume is real. */
    monthlyMinor: 15_000_000,
    perApplyMinor: 0,
    includedApplies: 500,
    overagePerApplyMinor: 50_000,
    softOpenJobCap: 2_000,
    note: 'Flat monthly fee with a pool of included applications. Overage billed per apply.',
  },
  PER_APPLY: {
    id: 'PER_APPLY',
    label: 'Pay per apply',
    mode: 'per_apply' as const,
    monthlyMinor: 0,
    /** Placeholder in kobo (₦2,500). */
    perApplyMinor: 250_000,
    includedApplies: 0,
    softOpenJobCap: 5_000,
    note: 'No monthly fee. You pay only when a Job Agent or talent applies to your synced job.',
  },
} as const;

export type PartnerApiBillingId = keyof typeof PARTNER_API_BILLING;

/** Temp / contract cover — day rates + mark-up (trades + short office cover). */
export const CONTRACT_COVER = {
  id: 'CONTRACT_COVER',
  name: 'Temp & contract cover',
  billing: 'day_rate_plus_markup' as const,
  /** Typical mark-up band employers see (percent on worker day rate). Exact quote per brief. */
  markupPercentMin: 18,
  markupPercentMax: 35,
  minDays: 1,
  maxDaysSoft: 90,
  highRepeat: true,
  audiences: ['SKILLED_TRADE', 'OFFICE_SHORT_COVER'] as const,
  note: 'Day rate for the worker + Dealo mark-up. Built for absences, peaks, and short office cover with high repeat bookings.',
} as const;

/** Post-hire training / upskilling — employers pay for modules after placement. */
export const TALENT_TRAINING = {
  id: 'TALENT_TRAINING',
  name: 'Onboarding & upskilling',
  billing: 'per_module_employer' as const,
  payer: 'employer' as const,
  modules: [
    {
      id: 'SITE_SAFETY',
      title: 'Site safety basics',
      audience: 'SKILLED_TRADE' as const,
      /** Placeholder kobo. */
      priceMinor: 2_500_000,
    },
    {
      id: 'TOOLS_REFRESHER',
      title: 'Tools & quality refresher',
      audience: 'SKILLED_TRADE' as const,
      priceMinor: 3_500_000,
    },
    {
      id: 'OFFICE_ONBOARD',
      title: 'Office onboarding pack',
      audience: 'OFFICE_PROFESSIONAL' as const,
      priceMinor: 4_000_000,
    },
    {
      id: 'CUSTOMER_SERVICE',
      title: 'Customer service polish',
      audience: 'OFFICE_PROFESSIONAL' as const,
      priceMinor: 3_000_000,
    },
  ],
  note: 'Sold after a successful hire. The employer pays; talent completes short modules before or in the first weeks on the job.',
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
    status: 'architecture' as const,
    next: [
      'Hire inquiry type COVER with day count + trade/office',
      'Quote engine: worker day rate × days × (1 + markup)',
      'Repeat-book shortcuts for known employers',
    ],
  },
  talentTraining: {
    status: 'architecture' as const,
    next: [
      'TrainingOrder linked to placement / hire inquiry',
      'Employer checkout per module bundle',
      'Completion certificate on talent profile',
    ],
  },
} as const;
