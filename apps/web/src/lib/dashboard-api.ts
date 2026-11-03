import { apiFetch, apiUpload } from '@/lib/api';

export type DashboardUserCore = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
};

export type DashboardRequestSummary = {
  id: string;
  companyName: string;
  roleTitle: string;
  serviceType: string;
  status: string;
  numberOfProfessionals: number;
  createdAt: string;
  location?: string;
  isTest?: boolean;
};

export type AdminWorkspace = {
  kind: 'admin';
  headline: string;
  subcopy: string;
  kpis: {
    openPipeline: number;
    conversionRate: number;
    newThisWeek: number;
    convertedThisWeek: number;
    activeTalentPool: number;
  };
  pipeline: {
    new: number;
    contacted: number;
    qualified: number;
    converted: number;
    closed: number;
    total: number;
  };
  users: { total: number; employers: number; talent: number; staff: number };
  talentOps: {
    candidates: number;
    inScreening: number;
    screened: number;
    shortlists: number;
  };
  content: {
    publishedPosts: number;
    draftPosts: number;
    newsletterSent: number;
  };
  attention: Array<{ label: string; href: string; tone: 'urgent' | 'watch' }>;
  recentRequests: DashboardRequestSummary[];
  recentUsers: Array<{
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    roles: string[];
    createdAt: string;
  }>;
  stats: {
    totalRequests: number;
    openRequests: number;
    inProgress: number;
    converted: number;
  };
  userStats: {
    totalUsers: number;
    employers: number;
    talent: number;
    staff: number;
  };
};

export type EmployerWorkspace = {
  kind: 'employer';
  headline: string;
  subcopy: string;
  kpis: {
    activeRequests: number;
    filled: number;
    rolesInFlight: number;
    peopleRequested: number;
  };
  stats: {
    totalRequests: number;
    openRequests: number;
    inProgress: number;
    converted: number;
    closed: number;
  };
  organizations: Array<{
    id: string;
    name: string;
    slug: string;
    isOwner: boolean;
    title: string | null;
    members: Array<{
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      title: string | null;
      isOwner: boolean;
    }>;
  }>;
  shortlists: Array<{
    id: string;
    title: string;
    candidateCount: number;
    hireInquiry: {
      id: string;
      companyName: string;
      roleTitle: string;
      status: string;
    };
    updatedAt: string;
  }>;
  nextActions: Array<{ label: string; href: string }>;
  recentRequests: DashboardRequestSummary[];
  userStats: null;
};

export type TalentWorkspace = {
  kind: 'talent';
  headline: string;
  subcopy: string;
  candidate: {
    id: string;
    fullName: string;
    email: string;
    phone: string | null;
    roleTitle: string | null;
    location: string | null;
    screenStatus: string;
  };
  kpis: {
    readiness: number;
    matches: number;
    documents: number;
    screenStatus: string;
  };
  checklist: Array<{ id: string; label: string; done: boolean }>;
  recentMatches: Array<{
    id: string;
    rank: number;
    shortlistTitle: string;
    companyName: string;
    roleTitle: string;
    status: string;
    location: string;
  }>;
  stats: {
    totalRequests: number;
    openRequests: number;
    inProgress: number;
    converted: number;
  };
  recentRequests: DashboardRequestSummary[];
  userStats: null;
};

export type DashboardOverview = {
  roleGroup: 'admin' | 'employer' | 'talent';
  user: DashboardUserCore;
  workspace: AdminWorkspace | EmployerWorkspace | TalentWorkspace;
};

/** @deprecated shape kept for gradual migration — prefer DashboardOverview.workspace */
export type LegacyDashboardOverview = {
  user: DashboardUserCore;
  stats: {
    totalRequests: number;
    openRequests: number;
    inProgress: number;
    converted: number;
  };
  userStats: AdminWorkspace['userStats'] | null;
  recentRequests: DashboardRequestSummary[];
};

export type DashboardRequest = {
  id: string;
  companyName: string;
  contactName: string;
  email: string;
  roleTitle: string;
  serviceType: string;
  status: string;
  numberOfProfessionals: number;
  location: string;
  createdAt: string;
  isTest?: boolean;
};

export type DashboardUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  isEmailVerified: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  roles: string[];
};

export type BlogPost = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImage: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Candidate = {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  roleTitle: string | null;
  location: string | null;
  notes: string | null;
  screenStatus: string;
  createdAt: string;
};

export type Shortlist = {
  id: string;
  title: string;
  notes: string | null;
  hireInquiry: {
    id: string;
    companyName: string;
    roleTitle: string;
    status: string;
  };
  entries: Array<{
    id: string;
    rank: number;
    notes: string | null;
    candidate: Candidate;
  }>;
};

export type NewsletterCampaign = {
  id: string;
  subject: string;
  bodyHtml: string;
  segment: string;
  status: string;
  sentAt: string | null;
  createdAt: string;
  _count?: { sends: number };
};

export function fetchDashboardOverview() {
  return apiFetch<DashboardOverview>('/dashboard/overview');
}

export function fetchDashboardRequests() {
  return apiFetch<DashboardRequest[]>('/dashboard/requests');
}

export function fetchDashboardUsers() {
  return apiFetch<DashboardUser[]>('/dashboard/users');
}

export function fetchAuthMe() {
  return apiFetch<DashboardUserCore>('/auth/me');
}

export function updateHireInquiryStatus(id: string, status: string) {
  return apiFetch<DashboardRequest>(`/hire-inquiries/${id}/status`, {
    method: 'PATCH',
    json: { status },
  });
}

export function fetchBlogAdmin() {
  return apiFetch<BlogPost[]>('/blog/admin');
}

export function createBlogPost(payload: Record<string, unknown>) {
  return apiFetch<BlogPost>('/blog/admin', { method: 'POST', json: payload });
}

export function updateBlogPost(id: string, payload: Record<string, unknown>) {
  return apiFetch<BlogPost>(`/blog/admin/${id}`, { method: 'PATCH', json: payload });
}

export function deleteBlogPost(id: string) {
  return apiFetch<{ ok: boolean }>(`/blog/admin/${id}`, { method: 'DELETE' });
}

export function fetchPublicBlog() {
  return apiFetch<BlogPost[]>('/blog');
}

export function fetchPublicBlogBySlug(slug: string) {
  return apiFetch<BlogPost>(`/blog/by-slug/${slug}`);
}

export function fetchCandidates() {
  return apiFetch<Candidate[]>('/candidates');
}

export function createCandidate(payload: Record<string, unknown>) {
  return apiFetch<Candidate>('/candidates', { method: 'POST', json: payload });
}

export function updateCandidate(id: string, payload: Record<string, unknown>) {
  return apiFetch<Candidate>(`/candidates/${id}`, { method: 'PATCH', json: payload });
}

export function fetchShortlists() {
  return apiFetch<Shortlist[]>('/shortlists');
}

export function createShortlist(payload: Record<string, unknown>) {
  return apiFetch<Shortlist>('/shortlists', { method: 'POST', json: payload });
}

export function addShortlistEntry(shortlistId: string, payload: Record<string, unknown>) {
  return apiFetch(`/shortlists/${shortlistId}/entries`, {
    method: 'POST',
    json: payload,
  });
}

export function fetchNewsletterCampaigns() {
  return apiFetch<NewsletterCampaign[]>('/newsletter/campaigns');
}

export function createNewsletterCampaign(payload: Record<string, unknown>) {
  return apiFetch<NewsletterCampaign>('/newsletter/campaigns', {
    method: 'POST',
    json: payload,
  });
}

export function sendNewsletterCampaign(id: string) {
  return apiFetch<{
    recipientCount: number;
    sent: number;
    failed: number;
  }>(`/newsletter/campaigns/${id}/send`, { method: 'POST' });
}

export type TalentMe = {
  candidate: {
    id: string;
    fullName: string;
    email: string;
    phone: string | null;
    roleTitle: string | null;
    location: string | null;
    screenStatus: string;
  };
  documentCount: number;
  uploadsConfigured: boolean;
};

export type TalentMatch = {
  id: string;
  rank: number;
  notes: string | null;
  shortlistTitle: string;
  inquiry: {
    id: string;
    companyName: string;
    roleTitle: string;
    status: string;
    location: string;
    roleFamily: string;
    serviceType: string;
  };
  updatedAt: string;
};

export type TalentDocument = {
  id: string;
  kind: string;
  fileName: string;
  mimeType: string;
  byteSize: number;
  url: string;
  createdAt: string;
};

export function fetchTalentMe() {
  return apiFetch<TalentMe>('/talent/me');
}

export function fetchTalentMatches() {
  return apiFetch<TalentMatch[]>('/talent/matches');
}

export function fetchTalentDocuments() {
  return apiFetch<TalentDocument[]>('/talent/documents');
}

export function uploadTalentDocument(file: File, kind: string) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('kind', kind);
  return apiUpload<TalentDocument>('/talent/documents', formData);
}

export function deleteTalentDocument(id: string) {
  return apiFetch<{ ok: boolean }>(`/talent/documents/${id}`, { method: 'DELETE' });
}

export type AuditLogRow = {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  createdAt: string;
  actor: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  } | null;
};

export type SupportTicketRow = {
  id: string;
  subject: string;
  status: string;
  priority: string;
  category: string;
  createdAt: string;
  requester?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  _count?: { messages: number };
};

export type SupportTicketDetail = SupportTicketRow & {
  body: string;
  messages: Array<{
    id: string;
    body: string;
    internal: boolean;
    createdAt: string;
    author: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
    };
  }>;
  requester: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
};

export function fetchAuditLogs(params?: { take?: number; entityType?: string }) {
  const search = new URLSearchParams();
  if (params?.take) search.set('take', String(params.take));
  if (params?.entityType) search.set('entityType', params.entityType);
  const q = search.toString();
  return apiFetch<AuditLogRow[]>(`/audit${q ? `?${q}` : ''}`);
}

export function fetchSupportTickets() {
  return apiFetch<SupportTicketRow[]>('/support/tickets');
}

export function fetchSupportTicket(id: string) {
  return apiFetch<SupportTicketDetail>(`/support/tickets/${id}`);
}

export function createSupportTicket(payload: Record<string, unknown>) {
  return apiFetch<SupportTicketRow>('/support/tickets', { method: 'POST', json: payload });
}

export function replySupportTicket(id: string, payload: Record<string, unknown>) {
  return apiFetch(`/support/tickets/${id}/replies`, { method: 'POST', json: payload });
}

export function updateSupportTicketStatus(id: string, status: string) {
  return apiFetch(`/support/tickets/${id}/status`, {
    method: 'PATCH',
    json: { status },
  });
}

export function mailOneUser(payload: Record<string, unknown>) {
  return apiFetch<{ ok: boolean; email: string }>('/mail/one', {
    method: 'POST',
    json: payload,
  });
}

export function mailAllUsers(payload: Record<string, unknown>) {
  return apiFetch<{ recipientCount: number; sent: number; failed: number }>('/mail/all', {
    method: 'POST',
    json: payload,
  });
}

export type ApiKeyRow = {
  id: string;
  name: string;
  keyPrefix: string;
  environment: 'LIVE' | 'TEST';
  plan: 'SANDBOX' | 'PARTNER' | 'ENTERPRISE';
  scopes: string[];
  rateLimitPerMin: number;
  isActive: boolean;
  expiresAt: string | null;
  lastUsedAt: string | null;
  createdAt: string;
  updatedAt: string;
  requests24h?: number;
};

export type CreatedApiKey = ApiKeyRow & { apiKey: string };

export type ApiKeyUsage = {
  key: { id: string; name: string; keyPrefix: string; rateLimitPerMin: number; plan: string };
  from: string;
  days: number;
  truncated: boolean;
  totals: { requests: number; errors: number; rateLimited: number; avgLatencyMs: number };
  daily: { date: string; requests: number; errors: number }[];
  topEndpoints: { endpoint: string; requests: number }[];
  recent: {
    method: string;
    path: string;
    statusCode: number;
    latencyMs: number;
    createdAt: string;
  }[];
};

export function fetchMyApiKeys() {
  return apiFetch<ApiKeyRow[]>('/api-keys/mine');
}

export function createSandboxApiKey(name: string) {
  return apiFetch<CreatedApiKey>('/api-keys/sandbox', { method: 'POST', json: { name } });
}

export function revokeMyApiKey(id: string) {
  return apiFetch<{ id: string; revoked: boolean }>(`/api-keys/mine/${id}`, { method: 'DELETE' });
}

export type WebhookEndpointRow = {
  id: string;
  url: string;
  description: string | null;
  events: string[];
  isActive: boolean;
  isGlobal: boolean;
  ownerUserId: string;
  failureCount: number;
  lastDeliveryAt: string | null;
  createdAt: string;
};

export type WebhookDeliveryRow = {
  id: string;
  event: string;
  status: 'PENDING' | 'SUCCEEDED' | 'FAILED';
  attempts: number;
  responseCode: number | null;
  error: string | null;
  nextAttemptAt: string | null;
  deliveredAt: string | null;
  createdAt: string;
  payload: unknown;
};

type DeliveryResult = Pick<WebhookDeliveryRow, 'id' | 'status' | 'responseCode' | 'error' | 'attempts'>;

export function fetchWebhooks() {
  return apiFetch<WebhookEndpointRow[]>('/webhooks');
}

export function createWebhook(payload: Record<string, unknown>) {
  return apiFetch<WebhookEndpointRow & { secret: string }>('/webhooks', { method: 'POST', json: payload });
}

export function updateWebhook(id: string, payload: Record<string, unknown>) {
  return apiFetch<WebhookEndpointRow>(`/webhooks/${id}`, { method: 'PATCH', json: payload });
}

export function deleteWebhook(id: string) {
  return apiFetch<{ id: string; deleted: boolean }>(`/webhooks/${id}`, { method: 'DELETE' });
}

export function rotateWebhookSecret(id: string) {
  return apiFetch<{ id: string; secret: string }>(`/webhooks/${id}/rotate-secret`, { method: 'POST' });
}

export function testWebhook(id: string) {
  return apiFetch<DeliveryResult>(`/webhooks/${id}/test`, { method: 'POST' });
}

export function fetchWebhookDeliveries(id: string) {
  return apiFetch<WebhookDeliveryRow[]>(`/webhooks/${id}/deliveries`);
}

export function redeliverWebhook(deliveryId: string) {
  return apiFetch<DeliveryResult>(`/webhooks/deliveries/${deliveryId}/redeliver`, { method: 'POST' });
}

export function fetchApiKeyUsage(id: string, days = 7) {
  return apiFetch<ApiKeyUsage>(`/api-keys/${id}/usage?days=${days}`);
}

export function fetchApiKeys() {
  return apiFetch<ApiKeyRow[]>('/api-keys');
}

export function createApiKey(payload: Record<string, unknown>) {
  return apiFetch<CreatedApiKey>('/api-keys', { method: 'POST', json: payload });
}

export function updateApiKey(id: string, payload: Record<string, unknown>) {
  return apiFetch<ApiKeyRow>(`/api-keys/${id}`, { method: 'PATCH', json: payload });
}

export function revokeApiKey(id: string) {
  return apiFetch<{ id: string; revoked: boolean }>(`/api-keys/${id}`, { method: 'DELETE' });
}
