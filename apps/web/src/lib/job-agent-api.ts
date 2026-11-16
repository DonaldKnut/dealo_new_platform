import type {
  ApplyVaultDto,
  ApplyVaultUpdate,
  AssistReportInput,
  AssistSessionDto,
  JobAgentMatchDto,
  JobAgentOverview,
  JobAgentSettings,
} from '@dealo/shared';

import { apiFetch, apiUpload } from '@/lib/api';

export type JobAgentMatchTab = 'inbox' | 'auto' | 'assist' | 'APPLIED' | 'SKIPPED' | 'FAILED';

export const jobAgentApi = {
  overview: () => apiFetch<JobAgentOverview>('/job-agent'),
  save: (settings: JobAgentSettings) => apiFetch<JobAgentOverview>('/job-agent/settings', { method: 'PUT', json: settings }),
  uploadCv: (file: File) => {
    const form = new FormData();
    form.append('cv', file);
    return apiUpload<JobAgentOverview>('/job-agent/cv', form);
  },
  toggle: (enabled: boolean, consent?: boolean) => apiFetch<JobAgentOverview>('/job-agent/toggle', { method: 'POST', json: { enabled, consent } }),
  runNow: () => apiFetch<{ started: boolean }>('/job-agent/run', { method: 'POST' }),
  matches: (status: JobAgentMatchTab) => apiFetch<JobAgentMatchDto[]>(`/job-agent/matches?status=${status}`),
  assist: () => apiFetch<JobAgentMatchDto[]>('/job-agent/assist'),
  approve: (id: string) => apiFetch<JobAgentMatchDto>(`/job-agent/matches/${id}/approve`, { method: 'POST' }),
  batchApprove: (ids: string[]) =>
    apiFetch<{ sent: number; failed: number; matches: JobAgentMatchDto[] }>('/job-agent/matches/batch-approve', {
      method: 'POST',
      json: { ids },
    }),
  skip: (id: string) => apiFetch<JobAgentMatchDto>(`/job-agent/matches/${id}/skip`, { method: 'POST' }),
  markApplied: (id: string) => apiFetch<JobAgentMatchDto>(`/job-agent/matches/${id}/applied`, { method: 'POST' }),
  getVault: () => apiFetch<ApplyVaultDto>('/job-agent/vault'),
  updateVault: (body: ApplyVaultUpdate) => apiFetch<ApplyVaultDto>('/job-agent/vault', { method: 'PUT', json: body }),
  regenerateDrafts: () => apiFetch<ApplyVaultDto>('/job-agent/vault/regenerate-drafts', { method: 'POST' }),
  deviceToken: () => apiFetch<{ token: string; expiresAt: string; expiresInSeconds: number }>('/job-agent/device-token', { method: 'POST' }),
  assistSession: (id: string) => apiFetch<AssistSessionDto>(`/job-agent/assist/${id}/session`),
  assistReport: (id: string, body: AssistReportInput) =>
    apiFetch<JobAgentMatchDto | { match: JobAgentMatchDto; reported: boolean; coveragePct: number | null; learned?: number }>(
      `/job-agent/matches/${id}/assist-report`,
      { method: 'POST', json: body },
    ),
  checkoutCredits: (packId: string) =>
    apiFetch<{ reference: string; authorizationUrl: string; pack: { id: string; credits: number; priceMinor: number; label: string } }>(
      '/job-agent/credits/checkout',
      { method: 'POST', json: { packId } },
    ),
  verifyCredits: (reference: string) =>
    apiFetch<{ status: string; failureReason: string | null; credits: number; creditBalance: number }>(
      '/job-agent/credits/verify',
      { method: 'POST', json: { reference } },
    ),
  saveAssistPolicy: (body: { denyHosts: string[]; allowHosts: string[]; assistDailyCap: number | null }) =>
    apiFetch<JobAgentOverview>('/job-agent/assist-policy', { method: 'PUT', json: body }),
  grantCredits: (body: { userId: string; credits: number; note?: string }) =>
    apiFetch<{ userId: string; email: string; creditBalance: number; delta: number }>('/job-agent/credits/grant', {
      method: 'POST',
      json: body,
    }),
  extensionInfo: () => apiFetch<{ available: boolean; bytes: number | null; hint: string }>('/job-agent/extension'),
  /** Same-origin rewrite so the session cookie attaches for sideload zip download. */
  extensionDownloadUrl: () => '/api/v1/job-agent/extension/download',
  /**
   * Absolute API base for the extension. Prefer the real API host so Bearer `dja_…`
   * does not depend on the Next rewrite (content scripts / SW call this directly).
   */
  extensionApiBase: () => process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1',
};
