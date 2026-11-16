/**
 * Phase 3 product intelligence helpers for Job Agent:
 * overnight windows (Lagos), assist prep confidence, morning digest copy, vault Q&A merge.
 */

/** Lagos is UTC+1 year-round (no DST). */
export const LAGOS_OFFSET_MS = 3_600_000;

export function lagosParts(now = Date.now()) {
  const lagos = new Date(now + LAGOS_OFFSET_MS);
  return {
    hour: lagos.getUTCHours(),
    minute: lagos.getUTCMinutes(),
    year: lagos.getUTCFullYear(),
    month: lagos.getUTCMonth(),
    date: lagos.getUTCDate(),
  };
}

/** Overnight hunt window: 22:00–06:59 Lagos. */
export function isOvernightLagos(now = Date.now()) {
  const { hour } = lagosParts(now);
  return hour >= 22 || hour < 7;
}

/** Morning digest delivery window: 06:00–10:59 Lagos. */
export function isMorningDigestWindow(now = Date.now()) {
  const { hour } = lagosParts(now);
  return hour >= 6 && hour < 11;
}

/** Email digest throttle (matches JobAgentService tellPerson). */
export const DIGEST_THROTTLE_MS = 20 * 3_600_000;

export function canSendDigestEmail(lastDigestAt: Date | null | undefined, now = Date.now()) {
  if (!lastDigestAt) return true;
  return now - lastDigestAt.getTime() >= DIGEST_THROTTLE_MS;
}

export type AssistPrepSignals = {
  score: number;
  hasCoverNote: boolean;
  vaultIdentityReady: boolean;
  draftAnswerCount: number;
  qaPairCount: number;
  /** Prior Assist fill coverage 0–100; when present, bumps readiness after a successful fill. */
  lastCoveragePct?: number | null;
};

/**
 * 0–1 confidence that a READY assist can be finished in ~60 seconds.
 * Score dominates; cover note + vault drafts/Q&A raise readiness; real assistCoveragePct
 * from prior fills on similar hosts tightens the estimate (curve favors ≥70% coverage).
 */
export function computeAssistConfidence(signals: AssistPrepSignals): number {
  const scorePart = Math.min(1, Math.max(0, signals.score / 100)) * 0.48;
  const coverPart = signals.hasCoverNote ? 0.16 : 0.04;
  const identityPart = signals.vaultIdentityReady ? 0.1 : 0;
  const draftPart = Math.min(0.1, signals.draftAnswerCount * 0.02);
  const qaPart = Math.min(0.08, signals.qaPairCount * 0.015);
  const coveragePart =
    typeof signals.lastCoveragePct === 'number'
      ? Math.min(0.18, Math.pow(Math.max(0, signals.lastCoveragePct) / 100, 1.15) * 0.18)
      : 0;
  return Math.round(Math.min(1, scorePart + coverPart + identityPart + draftPart + qaPart + coveragePart) * 100) / 100;
}

export type DigestCounts = { sent: number; ready: number };

/** In-app / email title: "3 sent, 5 ready for 60-second assists" */
export function morningDigestTitle(counts: DigestCounts): string {
  const { sent, ready } = counts;
  const parts: string[] = [];
  if (sent > 0) parts.push(`${sent} sent`);
  if (ready > 0) parts.push(`${ready} ready for 60-second assists`);
  if (!parts.length) return 'Your Job Agent has an update';
  if (parts.length === 1 && sent > 0 && ready === 0) return `Your Job Agent: ${sent} sent overnight`;
  return `Your Job Agent: ${parts.join(', ')}`;
}

export function morningDigestBody(counts: DigestCounts): string {
  const { sent, ready } = counts;
  if (sent && ready) {
    return `${sent} application${sent === 1 ? '' : 's'} went out while you slept. ${ready} more ${ready === 1 ? 'is' : 'are'} packed for a quick Assist.`;
  }
  if (sent) return `${sent} application${sent === 1 ? '' : 's'} sent with your CV. Open Job Agent to review.`;
  if (ready) return `${ready} job${ready === 1 ? '' : 's'} ready for a 60-second Assist — open, fill, and you submit.`;
  return 'See your Job Agent for the latest matches.';
}

export type VaultQaPair = { questionKey: string; question: string; answer: string };

/** Upsert Q&A by questionKey; newest answer wins. Incoming Assist edits also write a label-slug alias and refresh related keys so the next form fill hits edited answers. */
export function mergeVaultQaPairs(existing: VaultQaPair[], incoming: VaultQaPair[], max = 100): VaultQaPair[] {
  const map = new Map<string, VaultQaPair>();
  for (const pair of existing) {
    const key = pair.questionKey.trim().slice(0, 80);
    const answer = pair.answer.trim().slice(0, 4000);
    if (!key || !answer) continue;
    map.set(key, {
      questionKey: key,
      question: pair.question.trim().slice(0, 400) || key.replace(/_/g, ' '),
      answer,
    });
  }
  for (const pair of incoming) {
    const answer = pair.answer.trim().slice(0, 4000);
    if (!answer) continue;
    const question = pair.question.trim().slice(0, 400) || pair.questionKey.replace(/_/g, ' ');
    const primary = (pair.questionKey.trim() || questionKeyFromLabel(question, '')).slice(0, 80);
    if (!primary) continue;
    const entry = { questionKey: primary, question, answer };
    map.set(primary, entry);
    const fromLabel = questionKeyFromLabel(question, '');
    // Propagate the edited answer onto closely related keys (aggressive Assist learning).
    for (const key of [...map.keys()]) {
      if (key === primary) continue;
      const related =
        (fromLabel && fromLabel.length >= 4 && (key === fromLabel || key.includes(fromLabel) || fromLabel.includes(key))) ||
        key.includes(primary) ||
        primary.includes(key);
      if (related) map.set(key, { questionKey: key, question, answer });
    }
    if (fromLabel && fromLabel !== primary && fromLabel.length >= 4) {
      map.set(fromLabel, { questionKey: fromLabel, question, answer });
    }
  }
  return [...map.values()].filter((p) => p.answer).slice(0, max);
}

/** Slug a form label into a vault questionKey. */
export function questionKeyFromLabel(label: string, fallback: string): string {
  const slug = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 60);
  return slug || fallback.slice(0, 60) || 'custom_answer';
}
