import {
  canSendDigestEmail,
  computeAssistConfidence,
  DIGEST_THROTTLE_MS,
  isMorningDigestWindow,
  isOvernightLagos,
  mergeVaultQaPairs,
  morningDigestBody,
  morningDigestTitle,
  questionKeyFromLabel,
} from './job-agent-intelligence';

describe('job-agent-intelligence', () => {
  describe('Lagos windows', () => {
    it('treats late evening as overnight', () => {
      // 2026-03-15 23:30 Lagos = 22:30 UTC
      const t = Date.UTC(2026, 2, 15, 22, 30, 0);
      expect(isOvernightLagos(t)).toBe(true);
      expect(isMorningDigestWindow(t)).toBe(false);
    });

    it('treats early morning as overnight until 07:00 and digest from 06:00', () => {
      // 06:30 Lagos = 05:30 UTC
      const morning = Date.UTC(2026, 2, 16, 5, 30, 0);
      expect(isOvernightLagos(morning)).toBe(true);
      expect(isMorningDigestWindow(morning)).toBe(true);
      // 08:00 Lagos = 07:00 UTC
      const day = Date.UTC(2026, 2, 16, 7, 0, 0);
      expect(isOvernightLagos(day)).toBe(false);
      expect(isMorningDigestWindow(day)).toBe(true);
    });
  });

  describe('digest throttle', () => {
    it('allows first digest and blocks inside the window', () => {
      expect(canSendDigestEmail(null)).toBe(true);
      const now = Date.now();
      expect(canSendDigestEmail(new Date(now - DIGEST_THROTTLE_MS + 60_000), now)).toBe(false);
      expect(canSendDigestEmail(new Date(now - DIGEST_THROTTLE_MS - 1), now)).toBe(true);
    });
  });

  describe('assist confidence', () => {
    it('scores higher with cover note and vault prep', () => {
      const bare = computeAssistConfidence({
        score: 80,
        hasCoverNote: false,
        vaultIdentityReady: false,
        draftAnswerCount: 0,
        qaPairCount: 0,
      });
      const packed = computeAssistConfidence({
        score: 80,
        hasCoverNote: true,
        vaultIdentityReady: true,
        draftAnswerCount: 5,
        qaPairCount: 3,
      });
      const withCoverage = computeAssistConfidence({
        score: 80,
        hasCoverNote: true,
        vaultIdentityReady: true,
        draftAnswerCount: 5,
        qaPairCount: 3,
        lastCoveragePct: 90,
      });
      expect(packed).toBeGreaterThan(bare);
      expect(withCoverage).toBeGreaterThan(packed);
      expect(packed).toBeLessThanOrEqual(1);
      expect(packed).toBeGreaterThanOrEqual(0.7);
    });
  });

  describe('morning digest copy', () => {
    it('formats sent + ready like the product brief', () => {
      expect(morningDigestTitle({ sent: 3, ready: 5 })).toBe('Your Job Agent: 3 sent, 5 ready for 60-second assists');
      expect(morningDigestBody({ sent: 3, ready: 5 })).toContain('while you slept');
      expect(morningDigestTitle({ sent: 2, ready: 0 })).toContain('2 sent overnight');
    });
  });

  describe('vault Q&A merge', () => {
    it('upserts by questionKey and drops empty answers', () => {
      const merged = mergeVaultQaPairs(
        [
          { questionKey: 'notice_period', question: 'Notice?', answer: '2 weeks' },
          { questionKey: 'why_company', question: 'Why us?', answer: 'Old' },
        ],
        [
          { questionKey: 'why_company', question: 'Why this company?', answer: 'New answer' },
          { questionKey: 'empty', question: 'Skip', answer: '  ' },
        ],
      );
      expect(merged).toEqual([
        { questionKey: 'notice_period', question: 'Notice?', answer: '2 weeks' },
        { questionKey: 'why_company', question: 'Why this company?', answer: 'New answer' },
      ]);
    });

    it('slugs labels into keys', () => {
      expect(questionKeyFromLabel('Why do you want to work here?', 'x')).toBe('why_do_you_want_to_work_here');
    });
  });
});
