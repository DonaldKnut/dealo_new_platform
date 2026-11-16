import type { AtsApplyAdapter, AtsApplicant, AtsApplyResult, AtsCvFile, AtsJobMeta } from './types';

/**
 * Recruitee public careers apply.
 * URL: {company}.recruitee.com/o/{offerSlug} or /o/{id}
 * Apply: POST https://{company}.recruitee.com/api/offers/{offerId}/candidates
 */
const HOST = /\.recruitee\.com$/i;
const PATH = /^\/o\/([^/?#]+)/i;

function parse(url: string): { company: string; offerRef: string } | null {
  try {
    const u = new URL(url);
    if (!HOST.test(u.hostname)) return null;
    const company = u.hostname.replace(/\.recruitee\.com$/i, '').split('.')[0];
    if (!company) return null;
    const match = PATH.exec(u.pathname);
    if (!match) return null;
    return { company, offerRef: match[1]! };
  } catch {
    return null;
  }
}

function splitName(fullName: string) {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length <= 1) return { first: parts[0] || 'Applicant', last: 'Applicant' };
  return { first: parts[0]!, last: parts.slice(1).join(' ') };
}

export const recruiteeAdapter: AtsApplyAdapter = {
  id: 'recruitee',

  canHandle(url: string) {
    return parse(url) !== null;
  },

  async apply(applicant: AtsApplicant, job: AtsJobMeta, cv: AtsCvFile): Promise<AtsApplyResult> {
    const parsed = parse(job.url);
    if (!parsed) return { ok: false, reason: 'Not a Recruitee job URL', retryAsAssisted: true };

    const { first, last } = splitName(applicant.fullName);
    const form = new FormData();
    form.set('candidate[name]', `${first} ${last}`.trim());
    form.set('candidate[email]', applicant.email);
    if (applicant.phone) form.set('candidate[phone]', applicant.phone);
    if (applicant.coverNote) form.set('candidate[cover_letter]', applicant.coverNote);
    form.set(
      'candidate[cv]',
      new Blob([Uint8Array.from(cv.buffer)], { type: cv.mimeType || 'application/pdf' }),
      cv.fileName || 'cv.pdf',
    );

    const endpoint = `https://${parsed.company}.recruitee.com/api/offers/${encodeURIComponent(parsed.offerRef)}/candidates`;
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        body: form,
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(25_000),
      });
      if (res.ok || res.status === 200 || res.status === 201) {
        const body = (await res.json().catch(() => null)) as { candidate?: { id?: number }; id?: number } | null;
        return {
          ok: true,
          externalId: String(body?.candidate?.id ?? body?.id ?? ''),
          detail: 'Submitted via Recruitee public apply API',
        };
      }
      const detail = await res.text().catch(() => '');
      return {
        ok: false,
        reason: `Recruitee rejected apply (${res.status})${detail ? `: ${detail.slice(0, 160)}` : ''}`,
        retryAsAssisted: true,
      };
    } catch (error) {
      return {
        ok: false,
        reason: error instanceof Error ? error.message.slice(0, 200) : 'Recruitee request failed',
        retryAsAssisted: true,
      };
    }
  },
};
