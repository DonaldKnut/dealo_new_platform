import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  aiBlogDraftSchema,
  aiOpsSummarySchema,
  aiScreenResultSchema,
  aiSourceResultSchema,
  type AiBlogDraftRequest,
  type AiOpsSummary,
  type AiScreenRequest,
  type AiScreenResult,
  type AiSourceResult,
} from '@dealo/shared';
import { CandidateDocumentKind, Prisma, type Candidate, type HireInquiry } from '@prisma/client';

import type { AuthUser } from '../auth/auth.types';
import { OpsService } from '../ops/ops.service';
import { PrismaService } from '../prisma/prisma.service';
import { GeminiClient } from './gemini.client';

const STOP = new Set(
  'a an and are as at be by for from has have in is it of on or our the to we with you your will who can must need needs years year experience work working good strong ability able team role job site'.split(
    ' ',
  ),
);

const FAIRNESS_RULES =
  'Judge only skills, experience, certifications, location and availability against the job. Never use or infer name, gender, age, religion, ethnicity, tribe, marital status or photos. Be honest and specific. Write in plain, simple English.';

/** Lower-cased words without trailing punctuation, with simple plurals folded ("drawings" → "drawing"). */
function tokens(text: string) {
  return (text.toLowerCase().match(/[a-z][a-z+#.]{2,}/g) ?? [])
    .map((word) => word.replace(/\.+$/, ''))
    .map((word) => (word.length > 4 && word.endsWith('s') && !word.endsWith('ss') ? word.slice(0, -1) : word))
    .filter((word) => word.length > 2 && !STOP.has(word));
}

function topTerms(text: string, limit: number) {
  const counts = new Map<string, number>();
  for (const word of tokens(text)) counts.set(word, (counts.get(word) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit).map(([word]) => word);
}

/** Profile fields that may be shown to a model: no name, email, phone or photo. */
function anonymousProfile(candidate: Candidate) {
  return {
    roleTitle: candidate.roleTitle,
    roleFamily: candidate.roleFamily,
    headline: candidate.headline,
    about: candidate.bio?.slice(0, 1500),
    skills: candidate.skills,
    yearsExperience: candidate.yearsExperience,
    location: candidate.location,
    availability: candidate.availability,
  };
}

function jobBrief(inquiry: HireInquiry | null, requirements?: string) {
  if (!inquiry) return { requirements: requirements ?? '' };
  return {
    roleTitle: inquiry.roleTitle,
    roleFamily: inquiry.roleFamily,
    serviceType: inquiry.serviceType,
    location: inquiry.location,
    workArrangement: inquiry.workArrangement,
    headcount: inquiry.numberOfProfessionals,
    duration: inquiry.durationNotes,
    requirements: [inquiry.requirements, requirements].filter(Boolean).join('\n'),
  };
}

@Injectable()
export class AiService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gemini: GeminiClient,
    private readonly ops: OpsService,
  ) {}

  status() {
    return {
      provider: this.gemini.isConfigured ? 'gemini' : 'rules',
      model: this.gemini.isConfigured ? this.gemini.model : 'dealo-rules-v1',
      note: this.gemini.isConfigured
        ? 'AI suggestions come from Gemini and are reviewed by a person.'
        : 'Running on built-in rules. Add GEMINI_API_KEY for richer AI answers.',
    };
  }

  private async record(
    actor: AuthUser,
    feature: string,
    subjectType: string,
    subjectId: string | null,
    provider: string,
    started: number,
    output: Prisma.InputJsonValue,
  ) {
    return this.prisma.aiRun.create({
      data: {
        feature,
        subjectType,
        subjectId,
        provider,
        model: provider === 'gemini' ? this.gemini.model : 'dealo-rules-v1',
        output,
        latencyMs: Date.now() - started,
        createdById: actor.id,
      },
    });
  }

  // ------------------------------------------------------------ screening

  async screen(input: AiScreenRequest, actor: AuthUser) {
    const started = Date.now();
    const candidate = await this.prisma.candidate.findUnique({ where: { id: input.candidateId } });
    if (!candidate) throw new NotFoundException('Professional not found');
    const inquiry = input.hireInquiryId
      ? await this.prisma.hireInquiry.findUnique({ where: { id: input.hireInquiryId } })
      : null;
    if (input.hireInquiryId && !inquiry) throw new NotFoundException('Hiring request not found');

    let result: AiScreenResult;
    let provider = 'rules';
    if (this.gemini.isConfigured) {
      result = await this.gemini.json(
        `You are Dealo's screening agent for Nigerian office and skilled-trade hiring. ${FAIRNESS_RULES} Return JSON: {score:0-100, fit:"STRONG"|"POSSIBLE"|"WEAK", summary, strengths:[], gaps:[], interviewQuestions:[]}.`,
        `JOB:\n${JSON.stringify(jobBrief(inquiry, input.requirements))}\n\nCANDIDATE:\n${JSON.stringify(anonymousProfile(candidate))}`,
        aiScreenResultSchema,
      );
      provider = 'gemini';
    } else {
      result = this.rulesScreen(candidate, inquiry, input.requirements);
    }

    const run = await this.record(actor, 'SCREEN', 'Candidate', candidate.id, provider, started, {
      ...result,
      hireInquiryId: inquiry?.id ?? null,
      jobTitle: inquiry?.roleTitle ?? null,
    });
    return { runId: run.id, provider, ...result };
  }

  private rulesScreen(candidate: Candidate, inquiry: HireInquiry | null, extra?: string): AiScreenResult {
    const brief = jobBrief(inquiry, extra);
    const jobText = `${'roleTitle' in brief ? brief.roleTitle : ''} ${brief.requirements}`;
    const wanted = topTerms(jobText, 10);
    const profileText = `${candidate.roleTitle ?? ''} ${candidate.headline ?? ''} ${candidate.skills.join(' ')} ${candidate.bio ?? ''}`;
    const have = new Set(tokens(profileText));
    const matched = wanted.filter((word) => have.has(word));
    const missing = wanted.filter((word) => !have.has(word));

    const coverage = wanted.length ? matched.length / wanted.length : 0.5;
    const titleMatch =
      inquiry?.roleTitle && candidate.roleTitle
        ? tokens(inquiry.roleTitle).some((word) => tokens(candidate.roleTitle ?? '').includes(word))
        : false;
    const experience = Math.min((candidate.yearsExperience ?? 0) / 5, 1);
    const sameCity =
      inquiry?.location && candidate.location
        ? tokens(inquiry.location).some((word) => tokens(candidate.location ?? '').includes(word))
        : false;
    const available = candidate.availability === 'NOW' || candidate.availability === 'TWO_WEEKS';
    const familyMatch = !inquiry || !candidate.roleFamily || inquiry.roleFamily === candidate.roleFamily;

    let score = Math.round(coverage * 45 + (titleMatch ? 20 : 0) + experience * 20 + (sameCity ? 10 : 0) + (available ? 5 : 0));
    if (!familyMatch) score = Math.round(score * 0.5);
    const fit = score >= 70 ? 'STRONG' : score >= 45 ? 'POSSIBLE' : 'WEAK';

    const strengths = [
      titleMatch ? `Job title matches (${candidate.roleTitle})` : null,
      matched.length ? `Has key skills: ${matched.slice(0, 5).join(', ')}` : null,
      candidate.yearsExperience ? `${candidate.yearsExperience} years of experience` : null,
      sameCity ? `Based near the job (${candidate.location})` : null,
      available ? 'Can start soon' : null,
    ].filter((item): item is string => Boolean(item));
    const gaps = [
      missing.length ? `Not shown on profile: ${missing.slice(0, 5).join(', ')}` : null,
      !familyMatch ? 'Works in a different type of role (office vs trade)' : null,
      !candidate.yearsExperience ? 'Years of experience not given' : null,
      inquiry?.location && !sameCity ? `May need to relocate to ${inquiry.location}` : null,
    ].filter((item): item is string => Boolean(item));

    return {
      score,
      fit,
      summary: `${fit === 'STRONG' ? 'Strong match' : fit === 'POSSIBLE' ? 'Possible match' : 'Weak match'} on the information given (${matched.length} of ${wanted.length || 0} key terms found). Check the gaps in a short call.`,
      strengths: strengths.slice(0, 6),
      gaps: gaps.slice(0, 6),
      interviewQuestions: [
        ...missing.slice(0, 3).map((word) => `Tell me about a time you used ${word} at work.`),
        'Walk me through your last job. What did you do on a normal day?',
        'Who can we call as a reference from your last role?',
      ].slice(0, 5),
    };
  }

  /**
   * Screens an ATS applicant against a job. Gemini reads the CV (PDF) when available;
   * otherwise built-in rules use the cover note and details. The result is a suggestion only.
   */
  async screenApplicant(params: {
    applicationId: string;
    actorId: string;
    job: { title: string; roleFamily: string; location: string; description: string; mustHaves: string[] };
    applicant: { location?: string | null; coverNote?: string | null };
    cv?: { mimeType: string; data: Buffer } | null;
  }) {
    const started = Date.now();
    const jobText = `${params.job.title} ${params.job.mustHaves.join(' ')} ${params.job.description.replace(/<[^>]+>/g, ' ')}`;
    let result: AiScreenResult;
    let provider = 'rules';

    if (this.gemini.isConfigured) {
      const readableCv = params.cv && params.cv.mimeType === 'application/pdf' ? [params.cv] : [];
      result = await this.gemini.json(
        `You are a screening agent for a company hiring in Nigeria. ${FAIRNESS_RULES} The CV may contain a name, photo, age or other personal details: ignore them completely. Score against the job's must-haves. Return JSON: {score:0-100, fit:"STRONG"|"POSSIBLE"|"WEAK", summary, strengths:[], gaps:[], interviewQuestions:[]}.`,
        `JOB:\n${JSON.stringify({ ...params.job, description: params.job.description.replace(/<[^>]+>/g, ' ').slice(0, 4000) })}\n\nAPPLICANT NOTE:\n${(params.applicant.coverNote ?? '').slice(0, 2000)}\nAPPLICANT LOCATION: ${params.applicant.location ?? 'not given'}\n${readableCv.length ? 'The CV is attached.' : 'No readable CV was attached.'}`,
        aiScreenResultSchema,
        readableCv,
      );
      provider = 'gemini';
    } else {
      const wanted = params.job.mustHaves.length
        ? params.job.mustHaves.flatMap((item) => tokens(item))
        : topTerms(jobText, 10);
      const have = new Set(tokens(params.applicant.coverNote ?? ''));
      const matched = [...new Set(wanted.filter((word) => have.has(word)))];
      const missing = [...new Set(wanted.filter((word) => !have.has(word)))];
      const near =
        params.applicant.location && params.job.location
          ? tokens(params.job.location).some((word) => tokens(params.applicant.location ?? '').includes(word))
          : false;
      const coverage = wanted.length ? matched.length / new Set(wanted).size : 0;
      const score = Math.round(coverage * 70 + (near ? 20 : 0) + (params.cv ? 10 : 0));
      const fit = score >= 70 ? 'STRONG' : score >= 40 ? 'POSSIBLE' : 'WEAK';
      result = {
        score,
        fit,
        summary: `Quick check from the cover note${params.cv ? ' (CV not read in rules mode)' : ''}: ${matched.length} of ${new Set(wanted).size} key terms mentioned. Open the CV to confirm.`,
        strengths: [
          matched.length ? `Mentions: ${matched.slice(0, 5).join(', ')}` : null,
          near ? `Lives near the job (${params.applicant.location})` : null,
          params.cv ? 'CV attached' : null,
        ].filter((item): item is string => Boolean(item)),
        gaps: [
          missing.length ? `Not mentioned: ${missing.slice(0, 5).join(', ')}` : null,
          !params.cv ? 'No CV attached' : null,
        ].filter((item): item is string => Boolean(item)),
        interviewQuestions: [
          ...missing.slice(0, 3).map((word) => `Tell me about your experience with ${word}.`),
          'What did you do in your last job, day to day?',
        ].slice(0, 5),
      };
    }

    const run = await this.prisma.aiRun.create({
      data: {
        feature: 'SCREEN',
        subjectType: 'Application',
        subjectId: params.applicationId,
        provider,
        model: provider === 'gemini' ? this.gemini.model : 'dealo-rules-v1',
        output: result as Prisma.InputJsonValue,
        latencyMs: Date.now() - started,
        createdById: params.actorId,
      },
    });
    return { runId: run.id, provider, ...result };
  }

  // ---------------------------------------------------------- verification

  async verify(candidateId: string, actor: AuthUser) {
    const started = Date.now();
    const candidate = await this.prisma.candidate.findUnique({
      where: { id: candidateId },
      include: { documents: true, user: { select: { isEmailVerified: true, createdAt: true } } },
    });
    if (!candidate) throw new NotFoundException('Professional not found');

    const cvs = candidate.documents.filter((doc) => doc.kind === CandidateDocumentKind.CV);
    const certificates = candidate.documents.filter((doc) => doc.kind === CandidateDocumentKind.CERTIFICATE);
    const checks = [
      { label: 'CV uploaded', status: cvs.length ? 'ok' : 'missing', note: cvs.length ? `${cvs.length} file(s)` : 'Ask for a CV' },
      {
        label: 'Certificates',
        status: certificates.length ? 'ok' : candidate.roleFamily === 'SKILLED_TRADE' ? 'warn' : 'ok',
        note: certificates.length
          ? `${certificates.length} file(s) to check against originals`
          : candidate.roleFamily === 'SKILLED_TRADE'
            ? 'No trade certificate yet. Ask for one or do a practical test.'
            : 'Not required for this role type',
      },
      { label: 'Phone number', status: candidate.phone ? 'ok' : 'missing', note: candidate.phone ? 'Call to confirm it works' : 'Missing' },
      {
        label: 'Email confirmed',
        status: candidate.user?.isEmailVerified ? 'ok' : 'warn',
        note: candidate.user?.isEmailVerified ? 'Verified' : 'Not verified yet',
      },
      {
        label: 'Experience stated',
        status: candidate.yearsExperience !== null ? 'ok' : 'warn',
        note: candidate.yearsExperience !== null ? `${candidate.yearsExperience} years — confirm with a reference` : 'Ask how many years',
      },
      {
        label: 'Work links',
        status: candidate.linkedinUrl || candidate.portfolioUrl ? 'ok' : 'warn',
        note: candidate.linkedinUrl || candidate.portfolioUrl ? 'Open and check the links' : 'No LinkedIn or work photos',
      },
      { label: 'References', status: 'warn', note: 'Call at least one past supervisor before shortlisting' },
    ] as const;

    const missing = checks.filter((check) => check.status === 'missing').length;
    const warns = checks.filter((check) => check.status === 'warn').length;
    const output = {
      checks: checks.map((check) => ({ ...check })),
      summary: missing
        ? `${missing} item(s) missing and ${warns} to confirm. Do not shortlist yet.`
        : warns
          ? `Nothing missing. ${warns} item(s) need a quick human check.`
          : 'All checks look good.',
      readyForShortlist: missing === 0,
    };
    const run = await this.record(actor, 'VERIFY', 'Candidate', candidate.id, 'rules', started, output);
    return { runId: run.id, provider: 'rules', ...output };
  }

  // -------------------------------------------------------------- sourcing

  async source(hireInquiryId: string, actor: AuthUser) {
    const started = Date.now();
    const inquiry = await this.prisma.hireInquiry.findUnique({ where: { id: hireInquiryId } });
    if (!inquiry) throw new NotFoundException('Hiring request not found');

    let brief: AiSourceResult;
    let provider = 'rules';
    if (this.gemini.isConfigured) {
      brief = await this.gemini.json(
        `You are Dealo's sourcing agent. Create search keywords, a short boolean search string for job boards and LinkedIn, and a friendly WhatsApp-style outreach message (under 90 words) inviting a professional to apply. ${FAIRNESS_RULES} Return JSON {keywords:[], searchString, outreachMessage}.`,
        JSON.stringify(jobBrief(inquiry)),
        aiSourceResultSchema,
      );
      provider = 'gemini';
    } else {
      const keywords = topTerms(`${inquiry.roleTitle} ${inquiry.roleTitle} ${inquiry.requirements}`, 8);
      brief = {
        keywords,
        searchString: `("${inquiry.roleTitle}") AND (${keywords.slice(0, 4).join(' OR ')}) AND "${inquiry.location}"`,
        outreachMessage: `Hi! Dealo is hiring a ${inquiry.roleTitle} in ${inquiry.location}. Your profile looks like a good fit. Are you open to a quick chat this week? Reply YES and a recruiter will call you. (Dealo never charges professionals.)`,
      };
    }

    const wanted = new Set(brief.keywords.flatMap((keyword) => tokens(keyword)));
    const pool = await this.prisma.candidate.findMany({
      where: {
        openToWork: true,
        userId: { not: null },
        OR: [{ roleFamily: inquiry.roleFamily }, { roleFamily: null }],
      },
      take: 300,
      orderBy: { updatedAt: 'desc' },
    });
    const matches = pool
      .map((candidate) => {
        const have = new Set(tokens(`${candidate.roleTitle ?? ''} ${candidate.skills.join(' ')} ${candidate.headline ?? ''}`));
        const hits = [...wanted].filter((word) => have.has(word));
        const near = inquiry.location && candidate.location
          ? tokens(inquiry.location).some((word) => tokens(candidate.location ?? '').includes(word))
          : false;
        const score = Math.min(100, Math.round((hits.length / Math.max(wanted.size, 1)) * 80 + (near ? 20 : 0)));
        return {
          candidateId: candidate.id,
          fullName: candidate.fullName,
          roleTitle: candidate.roleTitle,
          location: candidate.location,
          score,
          reasons: [hits.length ? `Matches: ${hits.slice(0, 4).join(', ')}` : null, near ? 'Nearby' : null].filter(Boolean),
        };
      })
      .filter((match) => match.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);

    const output = { ...brief, matches };
    const run = await this.record(actor, 'SOURCE', 'HireInquiry', inquiry.id, provider, started, output as Prisma.InputJsonValue);
    return { runId: run.id, provider, ...output };
  }

  // ----------------------------------------------------------- ops summary

  async opsSummary(siteId: string, actor: AuthUser) {
    const started = Date.now();
    const data = await this.ops.siteConsole(siteId);
    const facts = {
      site: data.site.name,
      localTime: `${data.clock.now} ${data.clock.zone}`,
      metrics: data.metrics,
      roster: data.roster.map((row) => ({ role: row.roleTitle, status: row.status, lateMinutes: row.lateMinutes, standby: row.isStandby })),
      openCovers: data.covers.filter((c) => c.status === 'OPEN' || c.status === 'BREACHED').map((c) => ({ status: c.status, minutesLeft: c.minutesLeft })),
      recentEvents: data.feed.slice(0, 15).map((event) => `${event.severity}: ${event.title}`),
    };

    let result: AiOpsSummary;
    let provider = 'rules';
    if (this.gemini.isConfigured) {
      result = await this.gemini.json(
        "You are Dealo's placement agent writing a short daily brief for a site supervisor in Nigeria. Plain English, calm and practical. Return JSON {headline, summary, actions:[]} with at most 3 actions.",
        JSON.stringify(facts),
        aiOpsSummarySchema,
      );
      provider = 'gemini';
    } else {
      const m = data.metrics;
      const noShows = data.roster.filter((row) => row.status === 'NO_SHOW').length;
      const late = data.roster.filter((row) => row.status === 'LATE').length;
      const actions = [
        noShows && m.standbyActive ? `Send a standby worker to cover ${noShows} no-show(s).` : null,
        noShows && !m.standbyActive ? 'No standby is free. Ask a recruiter to find cover today.' : null,
        late ? `Talk to ${late} worker(s) who arrived late today.` : null,
        m.breachedCovers ? 'A cover passed its deadline. Escalate to operations now.' : null,
        !noShows && !late ? 'Nothing urgent. Confirm tomorrow’s crew before 6pm.' : null,
      ].filter((item): item is string => Boolean(item));
      result = {
        headline: `${m.onSite} of ${m.expected} crew on site at ${data.clock.now} ${data.clock.zone}`,
        summary: `Attendance over ${m.attendanceSample.days} days is ${m.attendanceRate ?? '—'}%. Average arrival is ${m.avgArrival ?? 'not known yet'}. ${m.standbyActive} standby worker(s) free and ${m.openCovers} open cover request(s).`,
        actions: actions.slice(0, 3),
      };
    }

    const run = await this.record(actor, 'OPS_SUMMARY', 'WorkSite', siteId, provider, started, result);
    return { runId: run.id, provider, ...result };
  }

  // ------------------------------------------------------------ blog draft

  async blogDraft(input: AiBlogDraftRequest, actor: AuthUser) {
    if (!this.gemini.isConfigured) {
      throw new BadRequestException('Blog drafting needs GEMINI_API_KEY. Other AI tools work without it.');
    }
    const started = Date.now();
    const draft = await this.gemini.json(
      `You write for Dealo, a Nigerian hiring company (office roles and skilled trades). Write an original article in very simple English (short sentences, common words) for ${input.audience}. Do not invent statistics or quote sources you cannot name. Use only <h2>, <p>, <ul>, <ol>, <li>, <strong>, <blockquote>. End with a blockquote that mentions how Dealo helps. Return JSON {title, excerpt, seoTitle, seoDescription, outline:[], contentHtml}.`,
      `Topic: ${input.topic}`,
      aiBlogDraftSchema,
    );
    const run = await this.record(actor, 'BLOG_DRAFT', 'BlogPost', null, 'gemini', started, draft);
    return { runId: run.id, provider: 'gemini', ...draft };
  }

  // ---------------------------------------------------------------- review

  async review(runId: string, decision: 'ACCEPTED' | 'DISMISSED', note: string | undefined, actor: AuthUser) {
    const run = await this.prisma.aiRun.findUnique({ where: { id: runId } });
    if (!run) throw new NotFoundException('AI suggestion not found');
    return this.prisma.aiRun.update({
      where: { id: runId },
      data: { status: decision, reviewedById: actor.id, reviewedAt: new Date(), reviewNote: note },
    });
  }

  history(subjectType: string, subjectId: string) {
    return this.prisma.aiRun.findMany({
      where: { subjectType, subjectId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }
}
