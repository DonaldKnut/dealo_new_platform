import { z } from 'zod';

export const RESUME_TEMPLATES = [
  { id: 'classic', name: 'Classic', premium: false, blurb: 'Clean single column. Works for every job.' },
  { id: 'modern', name: 'Modern', premium: false, blurb: 'Bold header with your accent colour.' },
  { id: 'executive', name: 'Executive', premium: true, blurb: 'Two columns with a side panel for skills.' },
  { id: 'minimal', name: 'Minimal', premium: true, blurb: 'Quiet serif type with lots of white space.' },
  { id: 'artisan', name: 'Artisan', premium: true, blurb: 'Made for skilled trades: licences and tools up front.' },
  { id: 'compact', name: 'Compact', premium: true, blurb: 'Fits a long career on one page.' },
] as const;

export type ResumeTemplateId = (typeof RESUME_TEMPLATES)[number]['id'];
export const RESUME_TEMPLATE_IDS = RESUME_TEMPLATES.map((t) => t.id) as [ResumeTemplateId, ...ResumeTemplateId[]];

export const RESUME_FONTS = [
  { id: 'helvetica', name: 'Helvetica', premium: false },
  { id: 'times', name: 'Times', premium: false },
  { id: 'inter', name: 'Inter', premium: true },
  { id: 'lora', name: 'Lora', premium: true },
  { id: 'merriweather', name: 'Merriweather', premium: true },
] as const;

export type ResumeFontId = (typeof RESUME_FONTS)[number]['id'];
export const RESUME_FONT_IDS = RESUME_FONTS.map((f) => f.id) as [ResumeFontId, ...ResumeFontId[]];

/** The first colour is free; the rest (and any custom colour) are premium. */
export const RESUME_COLORS = ['#0f766e', '#1e3a8a', '#7c2d12', '#334155', '#6d28d9', '#be123c', '#065f46', '#b45309'] as const;

export const RESUME_SECTIONS = ['summary', 'experience', 'education', 'skills', 'certifications', 'languages', 'projects', 'references'] as const;
export type ResumeSection = (typeof RESUME_SECTIONS)[number];

export const RESUME_LIMITS = {
  free: { resumes: 1, coverLetters: 0 },
  premium: { resumes: 20, coverLetters: 20 },
} as const;

const id = z.string().trim().min(1).max(40);
const short = (max = 120) => z.string().trim().max(max).default('');

export const resumeDataSchema = z.object({
  personal: z
    .object({
      fullName: short(120),
      headline: short(140),
      email: short(200),
      phone: short(40),
      location: short(140),
      website: short(300),
      linkedin: short(300),
    })
    .default({}),
  summary: short(2000),
  experience: z
    .array(
      z.object({
        id,
        role: short(140),
        company: short(140),
        location: short(140),
        start: short(30),
        end: short(30),
        current: z.boolean().default(false),
        bullets: z.array(z.string().trim().max(400)).max(12).default([]),
      }),
    )
    .max(20)
    .default([]),
  education: z
    .array(
      z.object({
        id,
        school: short(160),
        qualification: short(140),
        field: short(140),
        start: short(30),
        end: short(30),
        grade: short(80),
      }),
    )
    .max(10)
    .default([]),
  skills: z.array(z.string().trim().min(1).max(60)).max(40).default([]),
  certifications: z
    .array(z.object({ id, name: short(160), issuer: short(140), year: short(20), number: short(80) }))
    .max(20)
    .default([]),
  languages: z
    .array(z.object({ id, name: short(60), level: short(40) }))
    .max(10)
    .default([]),
  projects: z
    .array(z.object({ id, name: short(140), link: short(300), description: short(600) }))
    .max(10)
    .default([]),
  references: z
    .object({
      mode: z.enum(['on_request', 'list', 'hidden']).default('on_request'),
      items: z
        .array(z.object({ id, name: short(120), role: short(120), company: short(140), contact: short(160) }))
        .max(4)
        .default([]),
    })
    .default({}),
  sectionOrder: z.array(z.enum(RESUME_SECTIONS)).default([...RESUME_SECTIONS]),
});

export type ResumeData = z.infer<typeof resumeDataSchema>;

export const coverLetterDataSchema = z.object({
  fullName: short(120),
  email: short(200),
  phone: short(40),
  location: short(140),
  recipient: short(140),
  company: short(140),
  jobTitle: short(140),
  date: short(40),
  body: short(6000),
});

export type CoverLetterData = z.infer<typeof coverLetterDataSchema>;

export const resumeStyleSchema = z.object({
  template: z.enum(RESUME_TEMPLATE_IDS).default('classic'),
  accentColor: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Use a colour like #0f766e')
    .default('#0f766e'),
  font: z.enum(RESUME_FONT_IDS).default('helvetica'),
});

export type ResumeStyle = z.infer<typeof resumeStyleSchema>;

export const saveResumeSchema = z.object({
  kind: z.enum(['RESUME', 'COVER_LETTER']).default('RESUME'),
  title: z.string().trim().min(1).max(120).default('My CV'),
  style: resumeStyleSchema.default({}),
  data: z.record(z.unknown()),
});

export type SaveResumeInput = z.infer<typeof saveResumeSchema>;

export const resumeAiBulletsSchema = z.object({
  role: z.string().trim().max(140).default(''),
  company: z.string().trim().max(140).default(''),
  text: z.string().trim().min(3, 'Write a few words about what you did').max(2000),
});

export const resumeAiSummarySchema = z.object({ data: resumeDataSchema });

export const resumeAiTailorSchema = z.object({
  data: resumeDataSchema,
  jobDescription: z.string().trim().min(30, 'Paste the job advert (at least a few lines)').max(8000),
});

export const resumeAiCoverLetterSchema = z.object({
  data: resumeDataSchema,
  jobTitle: z.string().trim().min(2).max(140),
  company: z.string().trim().min(2).max(140),
  jobDescription: z.string().trim().max(8000).default(''),
});

export const resumeAiTailorResultSchema = z.object({
  summary: z.string().max(1200),
  skillsToAdd: z.array(z.string().max(60)).max(10),
  missingKeywords: z.array(z.string().max(60)).max(12),
  tips: z.array(z.string().max(240)).max(6),
});

export type ResumeAiTailorResult = z.infer<typeof resumeAiTailorResultSchema>;

export const grantPremiumSchema = z.object({
  userId: z.string().trim().min(1),
  days: z.number().int().min(0).max(3650),
});

/** Admin changes to someone's account from the users page. */
export const adminUpdateUserSchema = z
  .object({
    isActive: z.boolean().optional(),
    /** Only marks an email as confirmed; it cannot be un-confirmed here. */
    isEmailVerified: z.literal(true).optional(),
    roles: z
      .array(z.enum(['SUPER_ADMIN', 'ADMIN', 'RECRUITER', 'FINANCE', 'OPERATIONS', 'EMPLOYER', 'TALENT']))
      .min(1, 'Keep at least one role')
      .max(7)
      .optional(),
  })
  .refine((v) => v.isActive !== undefined || v.isEmailVerified !== undefined || v.roles !== undefined, 'Nothing to change');
export type AdminUpdateUserInput = z.infer<typeof adminUpdateUserSchema>;

export function isPremiumTemplate(id: string) {
  return RESUME_TEMPLATES.find((t) => t.id === id)?.premium ?? false;
}

export function isPremiumFont(id: string) {
  return RESUME_FONTS.find((f) => f.id === id)?.premium ?? false;
}

export function isPremiumColor(color: string) {
  return color.toLowerCase() !== RESUME_COLORS[0];
}
