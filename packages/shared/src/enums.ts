export const UserRole = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  RECRUITER: 'RECRUITER',
  FINANCE: 'FINANCE',
  OPERATIONS: 'OPERATIONS',
  EMPLOYER: 'EMPLOYER',
  TALENT: 'TALENT',
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const PermissionCode = {
  SYSTEM_SETTINGS_MANAGE: 'system.settings.manage',
  USERS_MANAGE: 'users.manage',
  ROLES_MANAGE: 'roles.manage',
  ORGANIZATIONS_MANAGE: 'organizations.manage',
  CATEGORIES_MANAGE: 'categories.manage',
  PRICING_MANAGE: 'pricing.manage',
  RECRUITMENT_REQUEST_REVIEW: 'recruitment.request.review',
  RECRUITMENT_REQUEST_ASSIGN: 'recruitment.request.assign',
  TALENT_SEARCH: 'talent.search',
  CANDIDATE_SCREEN: 'candidate.screen',
  CANDIDATE_VERIFY: 'candidate.verify',
  SHORTLIST_MANAGE: 'shortlist.manage',
  INTERVIEW_MANAGE: 'interview.manage',
  OFFER_MANAGE: 'offer.manage',
  PLACEMENT_MANAGE: 'placement.manage',
  CONTRACT_MANAGE: 'contract.manage',
  INVOICE_MANAGE: 'invoice.manage',
  PAYMENT_MANAGE: 'payment.manage',
  FINANCE_REPORT_VIEW: 'finance.report.view',
  AUDIT_VIEW: 'audit.view',
  HIRE_INQUIRY_MANAGE: 'hire_inquiry.manage',
  BLOG_MANAGE: 'blog.manage',
  NEWSLETTER_MANAGE: 'newsletter.manage',
  SUPPORT_MANAGE: 'support.manage',
  USERS_MAIL: 'users.mail',
  API_KEYS_MANAGE: 'api_keys.manage',
} as const;

export type PermissionCode = (typeof PermissionCode)[keyof typeof PermissionCode];

export const ServiceType = {
  DIRECT_RECRUITMENT: 'DIRECT_RECRUITMENT',
  MANAGED_STAFFING: 'MANAGED_STAFFING',
} as const;

export type ServiceType = (typeof ServiceType)[keyof typeof ServiceType];

/** Focused hiring families Dealo supports (not domestic staff or drivers). */
export const RoleFamily = {
  OFFICE_PROFESSIONAL: 'OFFICE_PROFESSIONAL',
  SKILLED_TRADE: 'SKILLED_TRADE',
} as const;

export type RoleFamily = (typeof RoleFamily)[keyof typeof RoleFamily];

export const WorkArrangement = {
  ONSITE: 'ONSITE',
  HYBRID: 'HYBRID',
  REMOTE: 'REMOTE',
} as const;

export type WorkArrangement = (typeof WorkArrangement)[keyof typeof WorkArrangement];

export const HireInquiryStatus = {
  NEW: 'NEW',
  CONTACTED: 'CONTACTED',
  QUALIFIED: 'QUALIFIED',
  CONVERTED: 'CONVERTED',
  CLOSED: 'CLOSED',
} as const;

export type HireInquiryStatus = (typeof HireInquiryStatus)[keyof typeof HireInquiryStatus];

export const RecruitmentRequestStatus = {
  DRAFT: 'DRAFT',
  SUBMITTED: 'SUBMITTED',
  UNDER_REVIEW: 'UNDER_REVIEW',
  NEEDS_CLARIFICATION: 'NEEDS_CLARIFICATION',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  IN_PROGRESS: 'IN_PROGRESS',
  SHORTLIST_SENT: 'SHORTLIST_SENT',
  INTERVIEWING: 'INTERVIEWING',
  OFFER_STAGE: 'OFFER_STAGE',
  FILLED: 'FILLED',
  CANCELLED: 'CANCELLED',
  CLOSED: 'CLOSED',
} as const;

export type RecruitmentRequestStatus =
  (typeof RecruitmentRequestStatus)[keyof typeof RecruitmentRequestStatus];

export const ApplicationStatus = {
  RECEIVED: 'RECEIVED',
  UNDER_REVIEW: 'UNDER_REVIEW',
  SCREENING: 'SCREENING',
  ASSESSMENT: 'ASSESSMENT',
  SHORTLISTED: 'SHORTLISTED',
  INTERVIEW: 'INTERVIEW',
  OFFERED: 'OFFERED',
  HIRED: 'HIRED',
  REJECTED: 'REJECTED',
  WITHDRAWN: 'WITHDRAWN',
} as const;

export type ApplicationStatus = (typeof ApplicationStatus)[keyof typeof ApplicationStatus];

export const ContractStatus = {
  DRAFT: 'DRAFT',
  PENDING_REVIEW: 'PENDING_REVIEW',
  SENT: 'SENT',
  SIGNED: 'SIGNED',
  ACTIVE: 'ACTIVE',
  EXPIRED: 'EXPIRED',
  TERMINATED: 'TERMINATED',
  CANCELLED: 'CANCELLED',
} as const;

export type ContractStatus = (typeof ContractStatus)[keyof typeof ContractStatus];

export const InvoiceStatus = {
  DRAFT: 'DRAFT',
  ISSUED: 'ISSUED',
  PARTIALLY_PAID: 'PARTIALLY_PAID',
  PAID: 'PAID',
  OVERDUE: 'OVERDUE',
  CANCELLED: 'CANCELLED',
  REFUNDED: 'REFUNDED',
} as const;

export type InvoiceStatus = (typeof InvoiceStatus)[keyof typeof InvoiceStatus];

export const DEFAULT_CURRENCY = 'NGN' as const;
export const DEFAULT_TIMEZONE = 'Africa/Lagos' as const;

/** Partner API scopes (Bearer API keys). */
export const ApiScope = {
  HIRE_INQUIRIES_READ: 'hire-inquiries:read',
  HIRE_INQUIRIES_WRITE: 'hire-inquiries:write',
  CANDIDATES_READ: 'candidates:read',
  BLOG_READ: 'blog:read',
  HEALTH_READ: 'health:read',
} as const;

export type ApiScope = (typeof ApiScope)[keyof typeof ApiScope];

export const API_SCOPES = Object.values(ApiScope);

export const ApiKeyEnvironment = {
  LIVE: 'LIVE',
  TEST: 'TEST',
} as const;

export type ApiKeyEnvironment = (typeof ApiKeyEnvironment)[keyof typeof ApiKeyEnvironment];

export const ApiKeyPlan = {
  SANDBOX: 'SANDBOX',
  PARTNER: 'PARTNER',
  ENTERPRISE: 'ENTERPRISE',
} as const;

export type ApiKeyPlan = (typeof ApiKeyPlan)[keyof typeof ApiKeyPlan];
