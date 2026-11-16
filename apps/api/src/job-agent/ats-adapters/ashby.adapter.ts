import type { AtsApplyAdapter, AtsApplicant, AtsApplyResult, AtsCvFile, AtsJobMeta } from './types';

/**
 * Ashby public job board apply.
 * URL shape: jobs.ashbyhq.com/{org}/{jobPostingId}
 * Falls back to Assist when the public non-user endpoint rejects the payload.
 */
const ASHBY_HOST = /(^|\.)jobs\.ashbyhq\.com$/i;
const PATH = /^\/([^/]+)\/([0-9a-f-]{8,}|[A-Za-z0-9_-]{6,})/i;

function parse(url: string): { org: string; jobId: string } | null {
  try {
    const u = new URL(url);
    if (!ASHBY_HOST.test(u.hostname)) return null;
    const match = PATH.exec(u.pathname);
    if (!match) return null;
    return { org: match[1]!, jobId: match[2]! };
  } catch {
    return null;
  }
}

function splitName(fullName: string) {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length <= 1) return { first: parts[0] || 'Applicant', last: 'Applicant' };
  return { first: parts[0]!, last: parts.slice(1).join(' ') };
}

export const ashbyAdapter: AtsApplyAdapter = {
  id: 'ashby',

  canHandle(url: string) {
    return parse(url) !== null;
  },

  async apply(applicant: AtsApplicant, job: AtsJobMeta, cv: AtsCvFile): Promise<AtsApplyResult> {
    const parsed = parse(job.url);
    if (!parsed) return { ok: false, reason: 'Not an Ashby job URL', retryAsAssisted: true };

    const { first, last } = splitName(applicant.fullName);
    const form = new FormData();
    form.set('name', `${first} ${last}`.trim());
    form.set('email', applicant.email);
    if (applicant.phone) form.set('phone', applicant.phone);
    if (applicant.location) form.set('location', applicant.location);
    if (applicant.linkedin) form.set('linkedinUrl', applicant.linkedin);
    if (applicant.website) form.set('website', applicant.website);
    if (applicant.coverNote) form.set('coverLetter', applicant.coverNote);
    form.set(
      'resume',
      new Blob([Uint8Array.from(cv.buffer)], { type: cv.mimeType || 'application/pdf' }),
      cv.fileName || 'cv.pdf',
    );

    const endpoint = `https://jobs.ashbyhq.com/api/non-user-application/${encodeURIComponent(parsed.org)}/${encodeURIComponent(parsed.jobId)}`;
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        body: form,
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(25_000),
      });
      if (res.ok || res.status === 200 || res.status === 201) {
        const body = (await res.json().catch(() => null)) as { id?: string; applicationId?: string } | null;
        return {
          ok: true,
          externalId: body?.applicationId ?? body?.id,
          detail: 'Submitted via Ashby public apply API',
        };
      }
      return {
        ok: false,
        reason: `Ashby apply unavailable (${res.status}) — use Assist`,
        retryAsAssisted: true,
      };
    } catch (error) {
      return {
        ok: false,
        reason: error instanceof Error ? error.message.slice(0, 200) : 'Ashby request failed',
        retryAsAssisted: true,
      };
    }
  },
};
