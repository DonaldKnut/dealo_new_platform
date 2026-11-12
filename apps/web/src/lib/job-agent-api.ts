import type { JobAgentMatchDto, JobAgentOverview, JobAgentSettings } from '@dealo/shared';

import { apiFetch, apiUpload } from '@/lib/api';

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
  matches: (status: 'inbox' | 'APPLIED' | 'SKIPPED' | 'FAILED') => apiFetch<JobAgentMatchDto[]>(`/job-agent/matches?status=${status}`),
  approve: (id: string) => apiFetch<JobAgentMatchDto>(`/job-agent/matches/${id}/approve`, { method: 'POST' }),
  skip: (id: string) => apiFetch<JobAgentMatchDto>(`/job-agent/matches/${id}/skip`, { method: 'POST' }),
  markApplied: (id: string) => apiFetch<JobAgentMatchDto>(`/job-agent/matches/${id}/applied`, { method: 'POST' }),
};
