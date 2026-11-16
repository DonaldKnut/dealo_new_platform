import type { AtsApplyAdapter, AtsApplicant, AtsApplyResult, AtsCvFile, AtsJobMeta } from './types';

/**
 * BambooHR careers pages.
 * URL: {company}.bamboohr.com/careers/{jobId} or /jobs/view.php?id=
 * Public apply is limited — attempt careers apply endpoint, else Assist.
 */
const HOST = /\.bamboohr\.com$/i;
const PATH_JOB = /\/careers\/(?:detail\/)?(\d+)/i;

function parse(url: string): { company: string; jobId: string } | null {
  try {
    const u = new URL(url);
    if (!HOST.test(u.hostname)) return null;
    const company = u.hostname.replace(/\.bamboohr\.com$/i, '').split('.')[0];
    if (!company || company === 'www') return null;
    const fromPath = PATH_JOB.exec(u.pathname)?.[1];
    const fromQuery = u.searchParams.get('id');
    const jobId = fromPath || fromQuery;
    if (!jobId) return null;
    return { company, jobId };
  } catch {
    return null;
  }
}

export const bambooHrAdapter: AtsApplyAdapter = {
  id: 'bamboohr',

  canHandle(url: string) {
    return parse(url) !== null;
  },

  async apply(applicant: AtsApplicant, job: AtsJobMeta, cv: AtsCvFile): Promise<AtsApplyResult> {
    const parsed = parse(job.url);
    if (!parsed) return { ok: false, reason: 'Not a BambooHR job URL', retryAsAssisted: true };

    const form = new FormData();
    form.set('firstName', applicant.fullName.trim().split(/\s+/)[0] || 'Applicant');
    form.set('lastName', applicant.fullName.trim().split(/\s+/).slice(1).join(' ') || 'Applicant');
    form.set('email', applicant.email);
    if (applicant.phone) form.set('phone', applicant.phone);
    if (applicant.coverNote) form.set('coverLetter', applicant.coverNote);
    form.set(
      'resume',
      new Blob([Uint8Array.from(cv.buffer)], { type: cv.mimeType || 'application/pdf' }),
      cv.fileName || 'cv.pdf',
    );

    const endpoint = `https://${parsed.company}.bamboohr.com/careers/${parsed.jobId}/apply`;
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        body: form,
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(25_000),
      });
      if (res.ok || res.status === 200 || res.status === 201) {
        return { ok: true, detail: 'Submitted via BambooHR careers apply' };
      }
      return { ok: false, reason: `BambooHR apply unavailable (${res.status}) — use Assist`, retryAsAssisted: true };
    } catch (error) {
      return {
        ok: false,
        reason: error instanceof Error ? error.message.slice(0, 200) : 'BambooHR request failed',
        retryAsAssisted: true,
      };
    }
  },
};
