import type { AtsApplyAdapter, AtsApplicant, AtsApplyResult, AtsCvFile, AtsJobMeta } from './types';

/**
 * Workable public job URLs → offline apply attempt.
 * Shapes: apply.workable.com/{account}/j/{shortcode} | {account}.workable.com/j/{shortcode}
 * Falls back to Assist when the public endpoint rejects the payload.
 */
const WORKABLE_HOST = /(^|\.)workable\.com$/i;
const PATH = /\/(?:j\/|jobs\/)([A-Za-z0-9_-]{6,})/i;

function parse(url: string): { account: string; shortcode: string } | null {
  try {
    const u = new URL(url);
    if (!WORKABLE_HOST.test(u.hostname)) return null;
    const short = PATH.exec(u.pathname)?.[1];
    if (!short) return null;
    let account = '';
    if (/^apply\.workable\.com$/i.test(u.hostname)) {
      account = u.pathname.split('/').filter(Boolean)[0] ?? '';
    } else {
      account = u.hostname.replace(/\.workable\.com$/i, '').split('.')[0] ?? '';
    }
    if (!account || account === 'www' || account === 'apply') return null;
    return { account, shortcode: short };
  } catch {
    return null;
  }
}

function splitName(fullName: string) {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length <= 1) return { first: parts[0] || 'Applicant', last: 'Applicant' };
  return { first: parts[0]!, last: parts.slice(1).join(' ') };
}

export const workableAdapter: AtsApplyAdapter = {
  id: 'workable',

  canHandle(url: string) {
    return parse(url) !== null;
  },

  async apply(applicant: AtsApplicant, job: AtsJobMeta, cv: AtsCvFile): Promise<AtsApplyResult> {
    const parsed = parse(job.url);
    if (!parsed) return { ok: false, reason: 'Not a Workable job URL', retryAsAssisted: true };

    const { first, last } = splitName(applicant.fullName);
    const form = new FormData();
    form.set('firstname', first);
    form.set('lastname', last);
    form.set('email', applicant.email);
    if (applicant.phone) form.set('phone', applicant.phone);
    if (applicant.linkedin) form.set('linkedin', applicant.linkedin);
    if (applicant.website) form.set('website', applicant.website);
    if (applicant.coverNote) form.set('summary', applicant.coverNote);
    form.set(
      'resume',
      new Blob([Uint8Array.from(cv.buffer)], { type: cv.mimeType || 'application/pdf' }),
      cv.fileName || 'cv.pdf',
    );

    const endpoint = `https://apply.workable.com/api/v1/accounts/${encodeURIComponent(parsed.account)}/jobs/${encodeURIComponent(parsed.shortcode)}`;
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        body: form,
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(25_000),
      });
      if (res.ok || res.status === 200 || res.status === 201) {
        const body = (await res.json().catch(() => null)) as { id?: string; candidate?: { id?: string } } | null;
        return {
          ok: true,
          externalId: body?.id ?? body?.candidate?.id,
          detail: 'Submitted via Workable public apply API',
        };
      }
      return {
        ok: false,
        reason: `Workable apply unavailable (${res.status}) — use Assist`,
        retryAsAssisted: true,
      };
    } catch (error) {
      return {
        ok: false,
        reason: error instanceof Error ? error.message.slice(0, 200) : 'Workable request failed',
        retryAsAssisted: true,
      };
    }
  },
};
