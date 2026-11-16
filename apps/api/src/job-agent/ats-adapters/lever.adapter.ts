import type { AtsApplyAdapter, AtsApplicant, AtsApplyResult, AtsCvFile, AtsJobMeta } from './types';

/**
 * Lever public postings apply API.
 * URL shape: jobs.lever.co/{company}/{postingId}
 */
const LEVER_HOST = /(^|\.)jobs\.lever\.co$/i;
const PATH = /^\/([^/]+)\/([0-9a-f-]{8,})/i;

function parse(url: string): { company: string; postingId: string } | null {
  try {
    const u = new URL(url);
    if (!LEVER_HOST.test(u.hostname)) return null;
    const match = PATH.exec(u.pathname);
    if (!match) return null;
    return { company: match[1]!, postingId: match[2]! };
  } catch {
    return null;
  }
}

function splitName(fullName: string) {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length <= 1) return { first: parts[0] || 'Applicant', last: 'Applicant' };
  return { first: parts[0]!, last: parts.slice(1).join(' ') };
}

export const leverAdapter: AtsApplyAdapter = {
  id: 'lever',

  canHandle(url: string) {
    return parse(url) !== null;
  },

  async apply(applicant: AtsApplicant, job: AtsJobMeta, cv: AtsCvFile): Promise<AtsApplyResult> {
    const parsed = parse(job.url);
    if (!parsed) return { ok: false, reason: 'Not a Lever job URL', retryAsAssisted: true };

    const { first, last } = splitName(applicant.fullName);
    const form = new FormData();
    form.set('name', `${first} ${last}`.trim());
    form.set('email', applicant.email);
    if (applicant.phone) form.set('phone', applicant.phone);
    if (applicant.location) form.set('org', applicant.location);
    if (applicant.linkedin) form.set('urls[LinkedIn]', applicant.linkedin);
    if (applicant.website) form.set('urls[Portfolio]', applicant.website);
    if (applicant.coverNote) form.set('comments', applicant.coverNote);
    form.set(
      'resume',
      new Blob([Uint8Array.from(cv.buffer)], { type: cv.mimeType || 'application/pdf' }),
      cv.fileName || 'cv.pdf',
    );

    const endpoint = `https://api.lever.co/v0/postings/${encodeURIComponent(parsed.company)}/${encodeURIComponent(parsed.postingId)}?mode=json`;
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        body: form,
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(25_000),
      });
      if (res.ok || res.status === 200 || res.status === 201) {
        const body = (await res.json().catch(() => null)) as { applicationId?: string; id?: string } | null;
        return {
          ok: true,
          externalId: body?.applicationId ?? body?.id,
          detail: 'Submitted via Lever postings API',
        };
      }
      if (res.status === 404 || res.status === 403 || res.status === 422 || res.status === 400) {
        return { ok: false, reason: `Lever rejected the application (${res.status})`, retryAsAssisted: true };
      }
      return { ok: false, reason: `Lever apply failed (${res.status})`, retryAsAssisted: true };
    } catch (error) {
      return {
        ok: false,
        reason: error instanceof Error ? error.message.slice(0, 200) : 'Lever request failed',
        retryAsAssisted: true,
      };
    }
  },
};
