/** Structured identity the offline ATS adapters need to submit an application. */
export type AtsApplicant = {
  fullName: string;
  email: string;
  phone?: string;
  location?: string;
  linkedin?: string;
  website?: string;
  coverNote?: string;
};

export type AtsJobMeta = {
  url: string;
  title: string;
  company: string;
};

export type AtsCvFile = {
  buffer: Buffer;
  fileName: string;
  mimeType?: string;
};

export type AtsApplyResult =
  | { ok: true; externalId?: string; detail?: string }
  | { ok: false; reason: string; retryAsAssisted?: boolean };

/**
 * Pluggable offline apply path for known ATS hosts.
 * Adapters must never ask for LinkedIn/Indeed passwords or attempt CAPTCHA bypass.
 */
export interface AtsApplyAdapter {
  readonly id: string;
  canHandle(url: string): boolean;
  apply(applicant: AtsApplicant, job: AtsJobMeta, cv: AtsCvFile): Promise<AtsApplyResult>;
}
