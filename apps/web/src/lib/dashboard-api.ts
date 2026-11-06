import { apiFetch, apiUpload } from '@/lib/api';

export type DashboardUserCore = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
  isEmailVerified?: boolean;
};

export const resendVerificationEmail = () =>
  apiFetch<{ success: boolean; alreadyVerified: boolean }>('/auth/resend-verification', { method: 'POST' });

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
  premiumUntil?: string | null;
  roles: string[];
};

export const grantResumePremium = (userId: string, days: number) =>
  apiFetch<{ userId: string; premiumUntil: string | null }>('/resumes/admin/premium', { method: 'POST', json: { userId, days } });

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
  category?: string | null;
  tags?: string[];
  featured?: boolean;
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

export type TalentProfile = {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  roleTitle: string | null;
  roleFamily: 'OFFICE_PROFESSIONAL' | 'SKILLED_TRADE' | null;
  location: string | null;
  headline: string | null;
  bio: string | null;
  skills: string[];
  yearsExperience: number | null;
  availability: 'NOW' | 'TWO_WEEKS' | 'ONE_MONTH' | 'LATER' | null;
  expectedPayMinor: number | null;
  linkedinUrl: string | null;
  portfolioUrl: string | null;
  openToWork: boolean;
  screenStatus: string;
  profileUpdatedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ProfileCompleteness = { score: number; missing: string[] };

export type TalentMe = {
  candidate: TalentProfile;
  documentCount: number;
  hasCv: boolean;
  completeness: ProfileCompleteness;
  uploadsConfigured: boolean;
};

export function updateTalentProfile(payload: Record<string, unknown>) {
  return apiFetch<{ candidate: TalentProfile; hasCv: boolean; completeness: ProfileCompleteness }>(
    '/talent/me/profile',
    { method: 'PATCH', json: payload },
  );
}

export type StaffTalentRow = TalentProfile & {
  cv: TalentDocument | null;
  documentCount: number;
  completeness: ProfileCompleteness;
};

export type StaffTalentDetail = TalentProfile & {
  notes: string | null;
  documents: TalentDocument[];
  completeness: ProfileCompleteness;
  shortlistEntries: {
    id: string;
    rank: number;
    shortlist: { title: string; hireInquiry: { companyName: string; roleTitle: string } };
  }[];
};

export function fetchStaffTalentProfiles(filters: Record<string, string>) {
  const params = new URLSearchParams(Object.entries(filters).filter(([, value]) => value));
  return apiFetch<StaffTalentRow[]>(`/talent-admin/profiles?${params.toString()}`);
}

export function fetchStaffTalentProfile(id: string) {
  return apiFetch<StaffTalentDetail>(`/talent-admin/profiles/${id}`);
}

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
  storage?: 'cloudinary' | 'database';
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

// ---------------------------------------------------------------------- AI

export type AiProvider = 'gemini' | 'rules';
export type AiStatus = { provider: AiProvider; model: string; note: string };
type AiBase = { runId: string; provider: AiProvider };

export type AiScreen = AiBase & {
  score: number;
  fit: 'STRONG' | 'POSSIBLE' | 'WEAK';
  summary: string;
  strengths: string[];
  gaps: string[];
  interviewQuestions: string[];
};

export type AiVerify = AiBase & {
  checks: { label: string; status: 'ok' | 'warn' | 'missing'; note: string }[];
  summary: string;
  readyForShortlist: boolean;
};

export type AiSource = AiBase & {
  keywords: string[];
  searchString: string;
  outreachMessage: string;
  matches: { candidateId: string; fullName: string; roleTitle: string | null; location: string | null; score: number; reasons: string[] }[];
};

export type AiOpsBrief = AiBase & { headline: string; summary: string; actions: string[] };

export type AiBlogDraft = AiBase & {
  title: string;
  excerpt: string;
  seoTitle: string;
  seoDescription: string;
  outline: string[];
  contentHtml: string;
};

export const fetchAiStatus = () => apiFetch<AiStatus>('/ai/status');
export const aiScreen = (payload: { candidateId: string; hireInquiryId?: string; requirements?: string }) =>
  apiFetch<AiScreen>('/ai/screen', { method: 'POST', json: payload });
export const aiVerify = (candidateId: string) => apiFetch<AiVerify>(`/ai/verify/${candidateId}`, { method: 'POST' });
export const aiSource = (hireInquiryId: string) => apiFetch<AiSource>(`/ai/source/${hireInquiryId}`, { method: 'POST' });
export const aiOpsBrief = (siteId: string) => apiFetch<AiOpsBrief>(`/ai/ops-summary/${siteId}`, { method: 'POST' });
export const aiBlogDraft = (topic: string, audience: 'employers' | 'professionals' = 'employers') =>
  apiFetch<AiBlogDraft>('/ai/blog-draft', { method: 'POST', json: { topic, audience } });
export const reviewAiRun = (runId: string, decision: 'ACCEPTED' | 'DISMISSED', note?: string) =>
  apiFetch(`/ai/runs/${runId}/review`, { method: 'POST', json: { decision, note } });

// ------------------------------------------------------------ workforce ops

export type WorkSite = {
  id: string;
  name: string;
  address: string | null;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  timezone: string;
  shiftStart: string;
  shiftEnd: string;
  graceMinutes: number;
  slaCoverHours: number;
  isActive: boolean;
  createdAt: string;
};

export type WorkSiteRow = WorkSite & { crew: number; standby: number; onSiteToday: number; openCovers: number };

export type RosterStatus = 'ON_SITE' | 'LATE' | 'CHECKED_OUT' | 'EXPECTED' | 'NO_SHOW' | 'STANDBY' | 'COVERING';

export type OpsFeedEvent = {
  id: string;
  type: string;
  severity: 'info' | 'success' | 'warn' | 'critical';
  actor: 'agent' | 'staff' | 'worker';
  title: string;
  detail: string | null;
  createdAt: string;
};

export type SiteConsole = {
  site: WorkSite;
  clock: { workDate: string; now: string; zone: string; graceOver: boolean };
  metrics: {
    attendanceRate: number | null;
    attendanceSample: { present: number; scheduled: number; days: number };
    avgArrival: string | null;
    onSite: number;
    expected: number;
    standbyActive: number;
    slaCoverHours: number;
    openCovers: number;
    breachedCovers: number;
  };
  roster: {
    placementId: string;
    candidateId: string;
    name: string;
    shortName: string;
    phone: string | null;
    roleTitle: string;
    isStandby: boolean;
    status: RosterStatus;
    checkInLocal: string | null;
    lateMinutes: number;
    distanceMeters: number | null;
  }[];
  covers: {
    id: string;
    status: 'OPEN' | 'FILLED' | 'CANCELLED' | 'BREACHED';
    absentName: string;
    standbyName: string | null;
    reason: string;
    dueBy: string;
    minutesLeft: number;
    workDate: string;
  }[];
  feed: OpsFeedEvent[];
};

export type MyPlacement = {
  placementId: string;
  roleTitle: string;
  isStandby: boolean;
  site: {
    id: string;
    name: string;
    address: string | null;
    latitude: number;
    longitude: number;
    radiusMeters: number;
    shiftStart: string;
    shiftEnd: string;
    zone: string;
  };
  today: { workDate: string; checkInAt: string | null; checkOutAt: string | null; lateMinutes: number };
};

export const fetchWorkSites = () => apiFetch<WorkSiteRow[]>('/ops/sites');
export const createWorkSite = (payload: Record<string, unknown>) =>
  apiFetch<WorkSite>('/ops/sites', { method: 'POST', json: payload });
export const updateWorkSite = (id: string, payload: Record<string, unknown>) =>
  apiFetch<WorkSite>(`/ops/sites/${id}`, { method: 'PATCH', json: payload });
export const fetchSiteConsole = (id: string) => apiFetch<SiteConsole>(`/ops/sites/${id}/console`);
export const addSitePlacement = (id: string, payload: Record<string, unknown>) =>
  apiFetch(`/ops/sites/${id}/placements`, { method: 'POST', json: payload });
export const updatePlacement = (id: string, payload: Record<string, unknown>) =>
  apiFetch(`/ops/placements/${id}`, { method: 'PATCH', json: payload });
export const runSiteMuster = (id: string) =>
  apiFetch<{ skipped?: string; noShows: number; onSite?: number; crew?: number }>(`/ops/sites/${id}/muster`, {
    method: 'POST',
  });
export const addSiteNote = (id: string, message: string) =>
  apiFetch(`/ops/sites/${id}/notes`, { method: 'POST', json: { message } });
export const assignCover = (coverId: string, standbyPlacementId: string) =>
  apiFetch(`/ops/covers/${coverId}/assign`, { method: 'POST', json: { standbyPlacementId } });
export const fetchMyPlacements = () => apiFetch<MyPlacement[]>('/ops/me');
export const checkInPlacement = (payload: Record<string, unknown>) =>
  apiFetch<{ ok: boolean; alreadyDone: boolean; distanceMeters: number; lateMinutes?: number }>('/ops/me/check-in', {
    method: 'POST',
    json: payload,
  });
export const checkOutPlacement = (payload: Record<string, unknown>) =>
  apiFetch<{ ok: boolean; distanceMeters: number }>('/ops/me/check-out', { method: 'POST', json: payload });

export type ApiPlanName = 'SANDBOX' | 'PARTNER' | 'ENTERPRISE';

export type ApiPlanInfo = {
  plan: ApiPlanName;
  name: string;
  description: string | null;
  priceMinor: number;
  currency: string;
  periodDays: number;
  rateLimitPerMin: number;
  monthlyQuota: number;
  maxLiveKeys: number;
  isPurchasable: boolean;
};

export type MyApiBilling = {
  activePlan: ApiPlanName;
  planConfig: ApiPlanInfo | null;
  subscription: {
    plan: ApiPlanName;
    status: 'ACTIVE' | 'EXPIRED' | 'CANCELLED';
    currentPeriodStart: string;
    currentPeriodEnd: string;
  } | null;
  requestsThisMonth: number;
  paymentsEnabled: boolean;
  invoices: {
    id: string;
    reference: string;
    plan: ApiPlanName;
    amountMinor: number;
    currency: string;
    status: 'PENDING' | 'PAID' | 'FAILED' | 'CANCELLED';
    paidAt: string | null;
    createdAt: string;
  }[];
};

export type ApiBillingAdmin = {
  revenueByCurrency: Record<string, number>;
  activeSubscriptions: { id: string; email: string; plan: ApiPlanName; currentPeriodEnd: string }[];
  invoices: (MyApiBilling['invoices'][number] & { email: string; failureReason: string | null })[];
};

export function formatMinor(amountMinor: number, currency: string) {
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency, maximumFractionDigits: 0 }).format(
    amountMinor / 100,
  );
}

export function fetchApiPlans() {
  return apiFetch<{ paymentsEnabled: boolean; plans: ApiPlanInfo[] }>('/billing/api-plans');
}

export function updateApiPlan(plan: ApiPlanName, payload: Record<string, unknown>) {
  return apiFetch<ApiPlanInfo>(`/billing/api-plans/${plan}`, { method: 'PATCH', json: payload });
}

export function fetchMyApiBilling() {
  return apiFetch<MyApiBilling>('/billing/api/me');
}

export function startApiCheckout(plan: ApiPlanName) {
  return apiFetch<{ reference: string; authorizationUrl: string }>('/billing/api/checkout', {
    method: 'POST',
    json: { plan },
  });
}

export function verifyApiPayment(reference: string) {
  return apiFetch<{ reference: string; status: string; plan: ApiPlanName; failureReason: string | null }>(
    '/billing/api/verify',
    { method: 'POST', json: { reference } },
  );
}

export function fetchApiBillingAdmin() {
  return apiFetch<ApiBillingAdmin>('/billing/api/admin');
}

export function createLiveApiKey(name: string) {
  return apiFetch<CreatedApiKey>('/api-keys/live', { method: 'POST', json: { name } });
}

export type OAuthClientRow = {
  id: string;
  name: string;
  clientId: string;
  apiKeyId: string;
  isActive: boolean;
  lastUsedAt?: string | null;
  createdAt: string;
};

export function fetchOAuthClients(apiKeyId: string) {
  return apiFetch<OAuthClientRow[]>(`/api-keys/${apiKeyId}/oauth-clients`);
}

export function createOAuthClient(apiKeyId: string, name: string) {
  return apiFetch<OAuthClientRow & { clientSecret: string }>(`/api-keys/${apiKeyId}/oauth-clients`, {
    method: 'POST',
    json: { name },
  });
}

export function revokeOAuthClient(id: string) {
  return apiFetch<{ id: string; revoked: boolean }>(`/oauth-clients/${id}`, { method: 'DELETE' });
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
