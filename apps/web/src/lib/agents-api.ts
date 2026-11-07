import type { AgentOverview, AgentTask, DecideAgentTaskInput, HiringAgentId, RunAgentInput } from '@dealo/shared';

import { apiFetch } from '@/lib/api';

const base = (orgId: string) => `/ats/workspaces/${orgId}`;

export const agentsApi = {
  overview: (orgId: string) => apiFetch<AgentOverview>(`${base(orgId)}/agents`),
  update: (orgId: string, agent: HiringAgentId, body: { enabled?: boolean; config?: Record<string, unknown> }) =>
    apiFetch<{ id: HiringAgentId; enabled: boolean; config: Record<string, unknown> }>(`${base(orgId)}/agents/${agent}`, { method: 'PATCH', json: body }),
  run: (orgId: string, agent: HiringAgentId, body: RunAgentInput) => apiFetch<AgentTask>(`${base(orgId)}/agents/${agent}/run`, { method: 'POST', json: body }),
  tasks: (orgId: string, params: { status?: 'PENDING' | 'HISTORY'; agent?: HiringAgentId; limit?: number } = {}) => {
    const query = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)])).toString();
    return apiFetch<AgentTask[]>(`${base(orgId)}/agent-tasks${query ? `?${query}` : ''}`);
  },
  decide: (orgId: string, taskId: string, body: DecideAgentTaskInput) => apiFetch<AgentTask>(`${base(orgId)}/agent-tasks/${taskId}/decide`, { method: 'POST', json: body }),
  upgrade: (orgId: string) => apiFetch<{ reference: string; authorizationUrl: string }>(`${base(orgId)}/agents/upgrade`, { method: 'POST' }),
  verifyUpgrade: (orgId: string, reference: string) =>
    apiFetch<{ status: string; failureReason: string | null; plan: 'FREE' | 'PRO'; planUntil: string | null }>(`${base(orgId)}/agents/upgrade/verify`, {
      method: 'POST',
      json: { reference },
    }),
};

export const TRIGGER_LABEL = {
  new_applicant: 'New applicant',
  stage_change: 'Stage change',
  daily: 'Every morning',
  on_demand: 'When you ask',
} as const;
