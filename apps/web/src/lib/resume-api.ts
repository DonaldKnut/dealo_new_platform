import type { PremiumOffer, ResumeAiTailorResult, ResumeData, ResumeStyle } from '@dealo/shared';

import { apiFetch, apiUpload } from '@/lib/api';

export type ResumeKind = 'RESUME' | 'COVER_LETTER';

export type SavedResume = {
  id: string;
  kind: ResumeKind;
  title: string;
  template: ResumeStyle['template'];
  accentColor: string;
  font: ResumeStyle['font'];
  data: Record<string, unknown>;
  downloadCount: number;
  lastDownloadedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ResumePlan = {
  premium: boolean;
  premiumUntil: string | null;
  limits: { resumes: number; coverLetters: number };
  used: { resumes: number; coverLetters: number };
  canShareToProfile: boolean;
  aiProvider: 'gemini' | 'rules';
  offer?: PremiumOffer;
};

export type PremiumVerify = { status: 'PENDING' | 'PAID' | 'FAILED' | 'CANCELLED'; failureReason: string | null; premium: boolean; premiumUntil: string | null };

export type SaveBody = { kind: ResumeKind; title: string; style: ResumeStyle; data: Record<string, unknown> };

export const resumeApi = {
  plan: () => apiFetch<ResumePlan>('/resumes/plan'),
  checkoutPremium: (returnTo: 'resumes' | 'job-agent' = 'resumes') =>
    apiFetch<{ reference: string; authorizationUrl: string }>('/resumes/premium/checkout', { method: 'POST', json: { returnTo } }),
  verifyPremium: (reference: string) => apiFetch<PremiumVerify>('/resumes/premium/verify', { method: 'POST', json: { reference } }),
  list: () => apiFetch<SavedResume[]>('/resumes'),
  get: (id: string) => apiFetch<SavedResume>(`/resumes/${id}`),
  create: (body: SaveBody) => apiFetch<SavedResume>('/resumes', { method: 'POST', json: body }),
  update: (id: string, body: SaveBody) => apiFetch<SavedResume>(`/resumes/${id}`, { method: 'PATCH', json: body }),
  duplicate: (id: string) => apiFetch<SavedResume>(`/resumes/${id}/duplicate`, { method: 'POST' }),
  remove: (id: string) => apiFetch(`/resumes/${id}`, { method: 'DELETE' }),
  downloaded: (id: string) => apiFetch(`/resumes/${id}/downloaded`, { method: 'POST' }),
  shareProfile: (id: string) => apiFetch<{ candidateId: string }>(`/resumes/${id}/share-profile`, { method: 'POST' }),
  uploadCvToProfile: (blob: Blob, fileName: string) => {
    const form = new FormData();
    form.append('file', new File([blob], fileName, { type: 'application/pdf' }));
    form.append('kind', 'CV');
    return apiUpload('/talent/documents', form);
  },
  aiBullets: (role: string, company: string, text: string) =>
    apiFetch<{ provider: string; bullets: string[] }>('/resumes/ai/bullets', { method: 'POST', json: { role, company, text } }),
  aiSummary: (data: ResumeData) => apiFetch<{ provider: string; summary: string }>('/resumes/ai/summary', { method: 'POST', json: { data } }),
  aiTailor: (data: ResumeData, jobDescription: string) =>
    apiFetch<ResumeAiTailorResult & { provider: string }>('/resumes/ai/tailor', { method: 'POST', json: { data, jobDescription } }),
  aiCoverLetter: (data: ResumeData, jobTitle: string, company: string, jobDescription: string) =>
    apiFetch<{ provider: string; body: string }>('/resumes/ai/cover-letter', { method: 'POST', json: { data, jobTitle, company, jobDescription } }),
};

export const DRAFT_KEY = 'dealo.resume.draft.v1';
export const LETTER_DRAFT_KEY = 'dealo.coverletter.draft.v1';
export const POST_AUTH_KEY = 'dealo.postAuthRedirect';

/** Remembers where to send someone after they sign in (survives Google sign-in and email verification). */
export function rememberReturnTo(path: string) {
  window.localStorage.setItem(POST_AUTH_KEY, JSON.stringify({ path, at: Date.now() }));
}

export function takeReturnTo(): string | null {
  const raw = window.localStorage.getItem(POST_AUTH_KEY);
  if (!raw) return null;
  window.localStorage.removeItem(POST_AUTH_KEY);
  try {
    const { path, at } = JSON.parse(raw) as { path: string; at: number };
    return Date.now() - at < 2 * 3_600_000 && path.startsWith('/') && !path.startsWith('//') ? path : null;
  } catch {
    return null;
  }
}
