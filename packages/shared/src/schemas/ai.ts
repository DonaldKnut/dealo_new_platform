import { z } from 'zod';

export const aiScreenRequestSchema = z
  .object({
    candidateId: z.string().trim().min(1),
    hireInquiryId: z.string().trim().min(1).optional(),
    requirements: z.string().trim().min(8).max(3000).optional(),
  })
  .refine((value) => value.hireInquiryId || value.requirements, {
    message: 'Pick a hiring request or describe the job',
  });

export type AiScreenRequest = z.infer<typeof aiScreenRequestSchema>;

export const aiScreenResultSchema = z.object({
  score: z.number().min(0).max(100),
  fit: z.enum(['STRONG', 'POSSIBLE', 'WEAK']),
  summary: z.string().max(600),
  strengths: z.array(z.string().max(200)).max(6),
  gaps: z.array(z.string().max(200)).max(6),
  interviewQuestions: z.array(z.string().max(240)).max(5),
});

export type AiScreenResult = z.infer<typeof aiScreenResultSchema>;

export const aiSourceResultSchema = z.object({
  keywords: z.array(z.string().max(60)).max(15),
  searchString: z.string().max(400),
  outreachMessage: z.string().max(900),
});

export type AiSourceResult = z.infer<typeof aiSourceResultSchema>;

export const aiOpsSummarySchema = z.object({
  headline: z.string().max(160),
  summary: z.string().max(900),
  actions: z.array(z.string().max(200)).max(5),
});

export type AiOpsSummary = z.infer<typeof aiOpsSummarySchema>;

export const aiBlogDraftRequestSchema = z.object({
  topic: z.string().trim().min(4).max(200),
  audience: z.enum(['employers', 'professionals']).default('employers'),
});

export type AiBlogDraftRequest = z.infer<typeof aiBlogDraftRequestSchema>;

export const aiBlogDraftSchema = z.object({
  title: z.string().max(200),
  excerpt: z.string().max(300),
  seoTitle: z.string().max(70),
  seoDescription: z.string().max(160),
  outline: z.array(z.string().max(200)).max(10),
  contentHtml: z.string().max(20000),
});

export type AiBlogDraft = z.infer<typeof aiBlogDraftSchema>;

export const aiReviewSchema = z.object({
  decision: z.enum(['ACCEPTED', 'DISMISSED']),
  note: z.string().trim().max(500).optional(),
});

export type AiReviewInput = z.infer<typeof aiReviewSchema>;
