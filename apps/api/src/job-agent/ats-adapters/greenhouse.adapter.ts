import type { AtsApplyAdapter, AtsApplicant, AtsApplyResult, AtsCvFile, AtsJobMeta } from './types';

/**
 * Greenhouse Job Board public apply API.
 * URL shapes: boards.greenhouse.io/{token}/jobs/{id} | job-boards.greenhouse.io/{token}/jobs/{id}
 */
const GREENHOUSE_HOST = /(^|\.)(boards|job-boards)\.greenhouse\.io$/i;
const PATH = /^\/([^/]+)\/jobs\/(\d+)/i;

function parse(url: string): { board: string; jobId: string } | null {
  try {
    const u = new URL(url);
    if (!GREENHOUSE_HOST.test(u.hostname)) return null;
    const match = PATH.exec(u.pathname);
    if (!match) return null;
    return { board: match[1]!, jobId: match[2]! };
  } catch {
    return null;
  }
}

function splitName(fullName: string) {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length <= 1) return { first: parts[0] || 'Applicant', last: 'Applicant' };
  return { first: parts[0]!, last: parts.slice(1).join(' ') };
}

export const greenhouseAdapter: AtsApplyAdapter = {
  id: 'greenhouse',

  canHandle(url: string) {
    return parse(url) !== null;
  },

  async apply(applicant: AtsApplicant, job: AtsJobMeta, cv: AtsCvFile): Promise<AtsApplyResult> {
    const parsed = parse(job.url);
    if (!parsed) return { ok: false, reason: 'Not a Greenhouse job URL', retryAsAssisted: true };

    const { first, last } = splitName(applicant.fullName);
    const form = new FormData();
    form.set('first_name', first);
    form.set('last_name', last);
    form.set('email', applicant.email);
    if (applicant.phone) form.set('phone', applicant.phone);
    if (applicant.location) form.set('location', applicant.location);
    if (applicant.linkedin) form.set('linkedin_url', applicant.linkedin);
    if (applicant.website) form.set('website', applicant.website);
    if (applicant.coverNote) form.set('cover_letter', applicant.coverNote);
    form.set(
      'resume',
      new Blob([Uint8Array.from(cv.buffer)], { type: cv.mimeType || 'application/pdf' }),
      cv.fileName || 'cv.pdf',
    );

    const endpoint = `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(parsed.board)}/jobs/${encodeURIComponent(parsed.jobId)}`;
    try {
      const res = await fetch(endpoint, { method: 'POST', body: form, signal: AbortSignal.timeout(25_000) });
      if (res.ok || res.status === 200 || res.status === 201) {
        const body = (await res.json().catch(() => null)) as { id?: number | string } | null;
        return { ok: true, externalId: body?.id != null ? String(body.id) : undefined, detail: 'Submitted via Greenhouse Job Board API' };
      }
      if (res.status === 404 || res.status === 403 || res.status === 422) {
        return { ok: false, reason: `Greenhouse rejected the application (${res.status})`, retryAsAssisted: true };
      }
      return { ok: false, reason: `Greenhouse apply failed (${res.status})`, retryAsAssisted: true };
    } catch (error) {
      return {
        ok: false,
        reason: error instanceof Error ? error.message.slice(0, 200) : 'Greenhouse request failed',
        retryAsAssisted: true,
      };
    }
  },
};
