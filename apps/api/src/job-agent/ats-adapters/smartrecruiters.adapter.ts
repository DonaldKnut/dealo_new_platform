import type { AtsApplyAdapter, AtsApplicant, AtsApplyResult, AtsCvFile, AtsJobMeta } from './types';

/**
 * SmartRecruiters public postings.
 * URL: jobs.smartrecruiters.com/{company}/{title-slug}/{postingId}
 * Apply: POST https://api.smartrecruiters.com/v1/companies/{company}/postings/{postingId}/candidates
 */
const HOST = /(^|\.)jobs\.smartrecruiters\.com$/i;
const PATH = /^\/([^/]+)\/[^/]+\/([^/?#]+)/i;

function parse(url: string): { company: string; postingId: string } | null {
  try {
    const u = new URL(url);
    if (!HOST.test(u.hostname)) return null;
    const match = PATH.exec(u.pathname);
    if (!match) return null;
    return { company: match[1]!, postingId: match[2]! };
  } catch {
    return null;
  }
}

export const smartRecruitersAdapter: AtsApplyAdapter = {
  id: 'smartrecruiters',

  canHandle(url: string) {
    return parse(url) !== null;
  },

  async apply(applicant: AtsApplicant, job: AtsJobMeta, cv: AtsCvFile): Promise<AtsApplyResult> {
    const parsed = parse(job.url);
    if (!parsed) return { ok: false, reason: 'Not a SmartRecruiters job URL', retryAsAssisted: true };

    const form = new FormData();
    form.set('firstName', applicant.fullName.trim().split(/\s+/)[0] || 'Applicant');
    form.set('lastName', applicant.fullName.trim().split(/\s+/).slice(1).join(' ') || 'Applicant');
    form.set('email', applicant.email);
    if (applicant.phone) form.set('phoneNumber', applicant.phone);
    if (applicant.linkedin) form.set('webPresence', applicant.linkedin);
    if (applicant.coverNote) form.set('messageToHiringManager', applicant.coverNote);
    form.set(
      'resume',
      new Blob([Uint8Array.from(cv.buffer)], { type: cv.mimeType || 'application/pdf' }),
      cv.fileName || 'cv.pdf',
    );

    const endpoint = `https://api.smartrecruiters.com/v1/companies/${encodeURIComponent(parsed.company)}/postings/${encodeURIComponent(parsed.postingId)}/candidates`;
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        body: form,
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(25_000),
      });
      if (res.ok || res.status === 200 || res.status === 201) {
        const body = (await res.json().catch(() => null)) as { id?: string } | null;
        return { ok: true, externalId: body?.id, detail: 'Submitted via SmartRecruiters public candidates API' };
      }
      return { ok: false, reason: `SmartRecruiters apply unavailable (${res.status}) — use Assist`, retryAsAssisted: true };
    } catch (error) {
      return {
        ok: false,
        reason: error instanceof Error ? error.message.slice(0, 200) : 'SmartRecruiters request failed',
        retryAsAssisted: true,
      };
    }
  },
};
