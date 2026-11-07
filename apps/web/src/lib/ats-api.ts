import type {
  ApplyInput,
  CreateWorkspaceInput,
  JobInput,
  OfferInput,
  ScheduleInterviewInput,
  ScorecardInput,
  UpdateWorkspaceInput,
} from '@dealo/shared';

import { apiFetch, apiUpload } from '@/lib/api';
import { getApiBaseUrl } from '@/lib/api-base';

export type WorkspaceRole = 'OWNER' | 'ADMIN' | 'RECRUITER' | 'HIRING_MANAGER';
export type JobStatus = 'DRAFT' | 'OPEN' | 'PAUSED' | 'CLOSED';
export type ApplicationStatus = 'ACTIVE' | 'HIRED' | 'REJECTED' | 'WITHDRAWN';

export const ROLE_LABEL: Record<WorkspaceRole, string> = {
  OWNER: 'Owner',
  ADMIN: 'Admin',
  RECRUITER: 'Recruiter',
  HIRING_MANAGER: 'Hiring manager',
};

const RANK: Record<WorkspaceRole, number> = { HIRING_MANAGER: 1, RECRUITER: 2, ADMIN: 3, OWNER: 4 };
export const canManage = (role?: WorkspaceRole) => Boolean(role && RANK[role] >= RANK.RECRUITER);
export const isAdminRole = (role?: WorkspaceRole) => Boolean(role && RANK[role] >= RANK.ADMIN);

export type WorkspaceSummary = {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  plan: string;
  role: WorkspaceRole;
};

export type Workspace = {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  website: string | null;
  about: string | null;
  brandColor: string | null;
  careersEnabled: boolean;
  plan: string;
  maxOpenJobs: number;
  maxSeats: number;
};

export type WorkspaceMember = {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: WorkspaceRole;
  title: string | null;
};

export type WorkspaceInvite = { id: string; email: string; role: WorkspaceRole; expiresAt: string; createdAt: string; link?: string };

export type WorkspaceDetail = {
  workspace: Workspace;
  myRole: WorkspaceRole;
  support: boolean;
  members: WorkspaceMember[];
  invites: WorkspaceInvite[];
  usage: { openJobs: number; maxOpenJobs: number; seats: number; maxSeats: number; applications: number };
};

export type AtsJob = {
  id: string;
  organizationId: string;
  title: string;
  slug: string;
  roleFamily: 'OFFICE_PROFESSIONAL' | 'SKILLED_TRADE';
  location: string;
  workArrangement: 'ONSITE' | 'HYBRID' | 'REMOTE';
  employmentType: string;
  salaryMinMinor: number | null;
  salaryMaxMinor: number | null;
  currency: string;
  description: string;
  mustHaves: string[];
  stages: string[];
  status: JobStatus;
  hiringManagerIds: string[];
  hireInquiryId: string | null;
  publishedAt: string | null;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
  totalApplications?: number;
  pipeline?: { stage: string; count: number }[];
};

export type ApplicationCard = {
  id: string;
  jobId: string;
  name: string;
  email: string;
  location: string | null;
  source: string;
  stage: string;
  stageChangedAt: string;
  status: ApplicationStatus;
  rating: number | null;
  tags: string[];
  aiScore: number | null;
  aiFit: string | null;
  cvFileId: string | null;
  createdAt: string;
};

export type ApplicationEvent = {
  id: string;
  type: string;
  actorName: string | null;
  body: string | null;
  meta: Record<string, unknown> | null;
  createdAt: string;
};

export type AiScreenOutput = {
  score: number;
  fit: 'STRONG' | 'POSSIBLE' | 'WEAK';
  summary: string;
  strengths: string[];
  gaps: string[];
  interviewQuestions: string[];
};

export type Interview = {
  id: string;
  kind: 'VIDEO' | 'PHONE' | 'IN_PERSON';
  status: 'PROPOSED' | 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';
  startsAt: string | null;
  durationMin: number;
  slotOptions: string[];
  location: string | null;
  interviewerIds: string[];
  notes: string | null;
  createdAt: string;
};

export type Scorecard = {
  id: string;
  reviewerId: string;
  reviewerName: string;
  rating: number;
  recommendation: 'YES' | 'MAYBE' | 'NO';
  criteria: Record<string, number> | null;
  notes: string | null;
  createdAt: string;
};

export type Offer = {
  id: string;
  payMinor: number;
  currency: string;
  payPeriod: string;
  startDate: string;
  notes: string | null;
  status: 'DRAFT' | 'SENT' | 'ACCEPTED' | 'DECLINED' | 'WITHDRAWN';
  sentAt: string | null;
  respondedAt: string | null;
  responseNote: string | null;
  createdAt: string;
};

export type ApplicationDetail = {
  application: ApplicationCard & { phone: string | null; coverNote: string | null; aiRunId: string | null };
  job: { id: string; title: string; stages: string[]; status: JobStatus; slug: string };
  myRole: WorkspaceRole;
  myUserId: string;
  cv: { id: string; fileName: string; mimeType: string; byteSize: number } | null;
  ai: { id: string; status: string; provider: string; model: string | null; output: AiScreenOutput; createdAt: string } | null;
  events: ApplicationEvent[];
  interviews: Interview[];
  scorecards: Scorecard[];
  scorecardsHidden: number;
  offers: Offer[];
};

export type PublicOrganization = {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  website: string | null;
  about: string | null;
  brandColor: string | null;
};

export type PublicJob = Pick<
  AtsJob,
  | 'id'
  | 'title'
  | 'slug'
  | 'roleFamily'
  | 'location'
  | 'workArrangement'
  | 'employmentType'
  | 'salaryMinMinor'
  | 'salaryMaxMinor'
  | 'currency'
  | 'mustHaves'
  | 'publishedAt'
  | 'updatedAt'
> & { description?: string; summary?: string };

export type InterviewListItem = Interview & {
  applicant: { id: string; name: string; jobId: string; jobTitle: string };
  interviewers: string[];
  mine: boolean;
};

type Branding = { name: string; logoUrl: string | null; brandColor: string | null };

export type BookingPreview = {
  organization: Branding;
  jobTitle: string;
  firstName: string;
  kind: Interview['kind'];
  durationMin: number;
  location: string | null;
  status: Interview['status'];
  startsAt: string | null;
  options: string[];
};

export type OfferPreview = {
  organization: Branding & { website: string | null };
  jobTitle: string;
  location: string;
  firstName: string;
  payMinor: number;
  currency: string;
  payPeriod: string;
  startDate: string;
  notes: string | null;
  status: Offer['status'] | 'EXPIRED';
  respondedAt: string | null;
};

export type AtsReport = {
  days: number;
  totals: { applications: number; inProgress: number; hired: number; rejected: number; openJobs: number; avgAiScore: number | null };
  funnel: { step: string; count: number }[];
  timeToHire: { averageDays: number | null; medianDays: number | null };
  offers: { sent: number; accepted: number };
  sources: { source: string; applied: number; hired: number }[];
  weekly: { weekStart: string; applications: number }[];
  jobs: { id: string; title: string; status: JobStatus; applications: number; inProgress: number; hired: number; daysOpen: number | null }[];
  limits: { openJobs: number; maxOpenJobs: number; plan: string };
};

export type EmailTemplate = { id: string; name: string; subject: string; body: string; builtIn: boolean };

export type WorkspaceApiKey = { id: string; name: string; keyPrefix: string; scopes: string[]; isActive: boolean; lastUsedAt: string | null; createdAt: string };

export type WorkspaceWebhook = {
  id: string;
  url: string;
  description: string | null;
  events: string[];
  isActive: boolean;
  failureCount: number;
  lastDeliveryAt: string | null;
  createdAt: string;
};

export const PERIOD_LABEL: Record<string, string> = { MONTH: 'month', YEAR: 'year', DAY: 'day', WEEK: 'week', PROJECT: 'project' };
export const KIND_LABEL: Record<string, string> = { VIDEO: 'Video call', PHONE: 'Phone call', IN_PERSON: 'In person' };

export const money = (minor: number, currency = 'NGN') =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency, maximumFractionDigits: 0 }).format(minor / 100);

export const whenLabel = (iso: string) =>
  new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));

const W = (orgId: string) => `/ats/workspaces/${orgId}`;

export const atsApi = {
  workspaces: () => apiFetch<WorkspaceSummary[]>('/ats/workspaces'),
  slugCheck: (slug: string) => apiFetch<{ slug: string; available: boolean }>(`/ats/workspaces/slug-check?slug=${encodeURIComponent(slug)}`),
  createWorkspace: (input: CreateWorkspaceInput) => apiFetch<Workspace>('/ats/workspaces', { method: 'POST', json: input }),
  workspace: (orgId: string) => apiFetch<WorkspaceDetail>(W(orgId)),
  updateWorkspace: (orgId: string, input: UpdateWorkspaceInput) => apiFetch<Workspace>(W(orgId), { method: 'PATCH', json: input }),
  invite: (orgId: string, email: string, role: WorkspaceRole) =>
    apiFetch<WorkspaceInvite & { link: string }>(`${W(orgId)}/invites`, { method: 'POST', json: { email, role } }),
  revokeInvite: (orgId: string, inviteId: string) => apiFetch(`${W(orgId)}/invites/${inviteId}`, { method: 'DELETE' }),
  changeRole: (orgId: string, memberId: string, role: WorkspaceRole) =>
    apiFetch(`${W(orgId)}/members/${memberId}`, { method: 'PATCH', json: { role } }),
  removeMember: (orgId: string, memberId: string) => apiFetch(`${W(orgId)}/members/${memberId}`, { method: 'DELETE' }),
  previewInvite: (token: string) =>
    apiFetch<{ organization: { name: string; logoUrl: string | null }; role: WorkspaceRole; email: string }>(`/ats/invites/${token}`),
  acceptInvite: (token: string) => apiFetch<{ organizationId: string }>(`/ats/invites/${token}/accept`, { method: 'POST' }),

  jobs: (orgId: string) => apiFetch<AtsJob[]>(`${W(orgId)}/jobs`),
  job: (orgId: string, jobId: string) => apiFetch<AtsJob>(`${W(orgId)}/jobs/${jobId}`),
  createJob: (orgId: string, input: JobInput) => apiFetch<AtsJob>(`${W(orgId)}/jobs`, { method: 'POST', json: input }),
  updateJob: (orgId: string, jobId: string, input: JobInput) => apiFetch<AtsJob>(`${W(orgId)}/jobs/${jobId}`, { method: 'PATCH', json: input }),
  setJobStatus: (orgId: string, jobId: string, status: JobStatus) =>
    apiFetch<AtsJob>(`${W(orgId)}/jobs/${jobId}/status`, { method: 'POST', json: { status } }),
  duplicateJob: (orgId: string, jobId: string) => apiFetch<AtsJob>(`${W(orgId)}/jobs/${jobId}/duplicate`, { method: 'POST' }),
  jobFromInquiry: (orgId: string, inquiryId: string) => apiFetch<AtsJob>(`${W(orgId)}/jobs/from-inquiry/${inquiryId}`, { method: 'POST' }),

  board: (orgId: string, jobId: string, status = 'ACTIVE') =>
    apiFetch<{ job: AtsJob; myRole: WorkspaceRole; applications: ApplicationCard[] }>(`${W(orgId)}/jobs/${jobId}/board?status=${status}`),
  addApplicant: (orgId: string, jobId: string, form: FormData, source = 'manual') =>
    apiUpload<{ id: string }>(`${W(orgId)}/jobs/${jobId}/applications?source=${source}`, form),
  application: (orgId: string, id: string) => apiFetch<ApplicationDetail>(`${W(orgId)}/applications/${id}`),
  move: (orgId: string, applicationIds: string[], stage: string) =>
    apiFetch<{ moved: number }>(`${W(orgId)}/applications/move`, { method: 'POST', json: { applicationIds, stage } }),
  reject: (orgId: string, applicationIds: string[], notify: boolean, reason?: string) =>
    apiFetch<{ rejected: number }>(`${W(orgId)}/applications/reject`, { method: 'POST', json: { applicationIds, notify, reason } }),
  restore: (orgId: string, id: string) => apiFetch(`${W(orgId)}/applications/${id}/restore`, { method: 'POST' }),
  updateApplication: (orgId: string, id: string, input: { rating?: number | null; tags?: string[] }) =>
    apiFetch(`${W(orgId)}/applications/${id}`, { method: 'PATCH', json: input }),
  addNote: (orgId: string, id: string, body: string) => apiFetch(`${W(orgId)}/applications/${id}/notes`, { method: 'POST', json: { body } }),
  rerunAi: (orgId: string, id: string) => apiFetch(`${W(orgId)}/applications/${id}/ai`, { method: 'POST' }),
  reviewAi: (orgId: string, id: string, decision: 'ACCEPTED' | 'DISMISSED') =>
    apiFetch(`${W(orgId)}/applications/${id}/ai/review`, { method: 'POST', json: { decision } }),
  fileUrl: (orgId: string, fileId: string) => `${getApiBaseUrl()}${W(orgId)}/files/${fileId}`,

  interviews: (orgId: string) => apiFetch<InterviewListItem[]>(`${W(orgId)}/interviews`),
  schedule: (orgId: string, id: string, input: ScheduleInterviewInput) =>
    apiFetch<Interview & { bookingLink?: string }>(`${W(orgId)}/applications/${id}/interviews`, { method: 'POST', json: input }),
  updateInterview: (orgId: string, interviewId: string, input: { status?: 'CANCELLED' | 'COMPLETED'; startsAt?: string }) =>
    apiFetch(`${W(orgId)}/interviews/${interviewId}`, { method: 'PATCH', json: input }),
  scorecard: (orgId: string, id: string, input: ScorecardInput) =>
    apiFetch<Scorecard>(`${W(orgId)}/applications/${id}/scorecards`, { method: 'POST', json: input }),
  createOffer: (orgId: string, id: string, input: OfferInput) =>
    apiFetch<Offer & { link?: string }>(`${W(orgId)}/applications/${id}/offers`, { method: 'POST', json: input }),
  sendOffer: (orgId: string, offerId: string) => apiFetch<Offer & { link: string }>(`${W(orgId)}/offers/${offerId}/send`, { method: 'POST' }),
  withdrawOffer: (orgId: string, offerId: string) => apiFetch<Offer>(`${W(orgId)}/offers/${offerId}/withdraw`, { method: 'POST' }),

  reports: (orgId: string, days = 90) => apiFetch<AtsReport>(`${W(orgId)}/reports?days=${days}`),
  templates: (orgId: string) => apiFetch<EmailTemplate[]>(`${W(orgId)}/email-templates`),
  createTemplate: (orgId: string, input: Pick<EmailTemplate, 'name' | 'subject' | 'body'>) =>
    apiFetch<EmailTemplate>(`${W(orgId)}/email-templates`, { method: 'POST', json: input }),
  updateTemplate: (orgId: string, id: string, input: Pick<EmailTemplate, 'name' | 'subject' | 'body'>) =>
    apiFetch<EmailTemplate>(`${W(orgId)}/email-templates/${id}`, { method: 'PATCH', json: input }),
  deleteTemplate: (orgId: string, id: string) => apiFetch(`${W(orgId)}/email-templates/${id}`, { method: 'DELETE' }),
  bulkEmail: (orgId: string, applicationIds: string[], subject: string, body: string) =>
    apiFetch<{ sent: number }>(`${W(orgId)}/applications/email`, { method: 'POST', json: { applicationIds, subject, body } }),
  placeHire: (orgId: string, id: string, input: { siteId: string; roleTitle?: string; isStandby: boolean; startDate?: string }) =>
    apiFetch<{ placementId: string }>(`${W(orgId)}/applications/${id}/placement`, { method: 'POST', json: input }),
  integrations: (orgId: string) => apiFetch<{ keys: WorkspaceApiKey[]; webhooks: WorkspaceWebhook[] }>(`${W(orgId)}/integrations`),
  createKey: (orgId: string, name: string) => apiFetch<WorkspaceApiKey & { apiKey: string }>(`${W(orgId)}/api-keys`, { method: 'POST', json: { name } }),
  revokeKey: (orgId: string, id: string) => apiFetch(`${W(orgId)}/api-keys/${id}`, { method: 'DELETE' }),
  createWebhook: (orgId: string, input: { url: string; description?: string; events: string[] }) =>
    apiFetch<WorkspaceWebhook & { secret: string }>(`${W(orgId)}/webhooks`, { method: 'POST', json: input }),
  removeWebhook: (orgId: string, id: string) => apiFetch(`${W(orgId)}/webhooks/${id}`, { method: 'DELETE' }),
  testWebhook: (orgId: string, id: string) =>
    apiFetch<{ status: string; responseCode: number | null; error: string | null }>(`${W(orgId)}/webhooks/${id}/test`, { method: 'POST' }),

  booking: (token: string) => apiFetch<BookingPreview>(`/book/${token}`),
  book: (token: string, startsAt: string) => apiFetch<{ startsAt: string; status: string }>(`/book/${token}`, { method: 'POST', json: { startsAt } }),
  offerPreview: (token: string) => apiFetch<OfferPreview>(`/offer/${token}`),
  respondOffer: (token: string, decision: 'ACCEPTED' | 'DECLINED', note?: string) =>
    apiFetch<{ status: string; organization: string }>(`/offer/${token}/respond`, { method: 'POST', json: { decision, note } }),

  careers: (orgSlug: string) => apiFetch<{ organization: PublicOrganization; jobs: PublicJob[] }>(`/careers/${orgSlug}`),
  careersJob: (orgSlug: string, jobSlug: string) =>
    apiFetch<{ organization: PublicOrganization; job: PublicJob & { description: string } }>(`/careers/${orgSlug}/${jobSlug}`),
  apply: (orgSlug: string, jobSlug: string, input: ApplyInput, cv?: File | null) => {
    const form = new FormData();
    for (const [key, value] of Object.entries(input)) if (value) form.append(key, String(value));
    if (cv) form.append('cv', cv);
    return apiUpload<{ id: string; jobTitle: string; organization: string }>(`/careers/${orgSlug}/${jobSlug}/apply`, form);
  },
};

export function formatPay(job: Pick<AtsJob, 'salaryMinMinor' | 'salaryMaxMinor' | 'currency'>) {
  const fmt = (minor: number) =>
    new Intl.NumberFormat('en-NG', { style: 'currency', currency: job.currency || 'NGN', maximumFractionDigits: 0 }).format(minor / 100);
  if (job.salaryMinMinor && job.salaryMaxMinor) return `${fmt(job.salaryMinMinor)} – ${fmt(job.salaryMaxMinor)}`;
  if (job.salaryMinMinor) return `From ${fmt(job.salaryMinMinor)}`;
  if (job.salaryMaxMinor) return `Up to ${fmt(job.salaryMaxMinor)}`;
  return null;
}

export const EMPLOYMENT_LABEL: Record<string, string> = {
  FULL_TIME: 'Full time',
  PART_TIME: 'Part time',
  CONTRACT: 'Contract',
  TEMPORARY: 'Temporary',
  INTERNSHIP: 'Internship',
};

export const ARRANGEMENT_LABEL: Record<string, string> = { ONSITE: 'On site', HYBRID: 'Hybrid', REMOTE: 'Remote' };

export function daysSince(iso: string) {
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000));
}

const WORKSPACE_KEY = 'dealo.ats.workspace';
export const rememberWorkspace = (id: string) => window.localStorage.setItem(WORKSPACE_KEY, id);
export const rememberedWorkspace = () => (typeof window === 'undefined' ? null : window.localStorage.getItem(WORKSPACE_KEY));
