import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BlogPostStatus, UserRole } from '@prisma/client';
import {
  AGENT_PLANS,
  type AssistantChatInput,
  type AssistantFeedbackInput,
  type AssistantHandoffInput,
  type AssistantLink,
  type AssistantMessage,
  type AssistantReply,
  type AssistantStreamEvent,
  type AssistantWelcome,
} from '@dealo/shared';
import { randomUUID } from 'crypto';
import { z } from 'zod';

import { GeminiClient, type GeminiTurn } from '../ai/gemini.client';
import type { AuthUser } from '../auth/auth.types';
import { AuditLogService } from '../common/audit-log.service';
import { normalizeEmail } from '../common/normalize-email';
import type { AppEnv } from '../config/env.validation';
import { EmailService } from '../email/email.service';
import { NIGERIA_PLACES } from '../job-board/job-feeds';
import { PrismaService } from '../prisma/prisma.service';
import {
  GREETING_SUGGESTIONS,
  SITE_PAGES,
  fillTemplate,
  isAllowedHref,
  matchTopic,
  retrieve,
  topicIndex,
  topicText,
  type LiveVars,
} from './knowledge';

const META = '[[META]]';
const LIVE_TTL_MS = 10 * 60_000;

const metaSchema = z.object({
  suggestions: z.array(z.string().min(1).max(90)).max(4).default([]),
  links: z.array(z.object({ label: z.string().min(1).max(60), href: z.string().min(1).max(200) })).max(4).default([]),
  handoff: z.boolean().default(false),
});

const SYSTEM = `You are Dealo AI — a sharp, human teammate inside Dealo (dealonetwork.com). You sound like a smart recruiter and career coach, not a chatbot. No “As an AI…”, no corporate fluff, no repeating the same blurb.

WHO DEALO IS
Nigeria-based hiring for checked office staff and skilled trades (direct hire, managed staffing, short cover, post-hire training). Not drivers, chefs/cooks, or domestic workers. Job seekers: free CV, jobs, Job Agent. They never pay to get a job.

HOW TO ANSWER
- Answer the exact question first in one clear sentence, then useful detail. Short paragraphs. **Bold** sparingly. Lists when they help. Usually under 160 words; go longer for CV rewrites, step-by-step, or code.
- Tone: warm, direct, Nigerian-friendly plain English. If LOCALE or the user’s message is French / Chinese / Korean / Pidgin / Yoruba / Hausa / Igbo, reply in that language.
- Dealo facts (features, prices, policies, screens) only from KNOWLEDGE, LIVE FACTS or USER CONTEXT. Never invent prices, guarantees or features. If missing, say so and offer WhatsApp or “Talk to a person”.
- Ownership / legal entity: only what KNOWLEDGE says. Do not invent founder names.
- Scope: if they ask about drivers, chefs, domestic work, or anything Dealo does not do, say so politely and point to office roles + skilled trades. If the question is totally unrelated to hiring, careers, CVs, jobs, HR, or using Dealo, say you focus on those and invite a hiring/CV question — still be kind.
- CV & careers: act as a senior coach. When they paste a CV, summary, bullets or a job advert, rewrite it. Give advanced, specific tips (metrics, Nigerian employer filters, ATS keywords, trade licences, remote signals) — not generic “use action verbs”. Offer to tailor line-by-line.
- Also help with recruitment/HR in Nigeria, interviews, salary talk, Job Agent, ATS, API — fully and practically.
- Prefer WhatsApp or “Talk to a person” when they want a human, for payments/refunds, bugs, or account deletion. Set handoff true then.
- Never ask for passwords, cards, OTPs or API secrets.

OUTPUT FORMAT (strict)
Markdown answer, then a new line with exactly ${META} and one JSON line:
{"suggestions":["up to 3 short follow-ups under 60 chars"],"links":[{"label":"short","href":"/path"}],"handoff":false}
At most 3 internal links from KNOWLEDGE / SITE PAGES / LIVE FACTS. Nothing after the JSON.`;

const PAGE_HINTS: [RegExp, string][] = [
  [/^\/resume-builder/, 'the CV builder'],
  [/^\/jobs/, 'the job board'],
  [/^\/dashboard\/ats\/agents/, 'the Hiring Agents hub in the ATS'],
  [/^\/dashboard\/ats/, 'the ATS (employer hiring workspace)'],
  [/^\/dashboard\/developer|^\/developers/, 'the developer API area'],
  [/^\/dashboard\/applications/, 'their job applications tracker'],
  [/^\/dashboard\/requests/, 'their hire requests'],
  [/^\/dashboard/, 'their dashboard'],
  [/^\/hiring-agents/, 'the Hiring Agents product page'],
  [/^\/ats/, 'the ATS product page'],
  [/^\/services|^\/hire|^\/for-employers/, 'the hiring services pages'],
  [/^\/for-professionals/, 'the job seekers page'],
  [/^\/auth/, 'the sign-in or sign-up page'],
  [/^\/blog/, 'the blog'],
  [/^\/careers/, 'a company careers page'],
];

function pageHint(page?: string) {
  if (!page) return 'unknown';
  const hit = PAGE_HINTS.find(([re]) => re.test(page));
  return hit ? `${page} (${hit[1]})` : page;
}

function escapeHtml(text: string) {
  return text.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c);
}

function transcriptText(messages: AssistantMessage[]) {
  return messages.map((m) => `${m.role === 'user' ? 'Visitor' : 'Assistant'}: ${m.text}`).join('\n');
}

function naira(minor: number) {
  return `₦${Math.round(minor / 100).toLocaleString('en-NG')}`;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type Emit = (event: AssistantStreamEvent) => void;

@Injectable()
export class AssistantService {
  private readonly logger = new Logger(AssistantService.name);
  private live: { at: number; text: string; vars: LiveVars } | null = null;

  constructor(
    private readonly gemini: GeminiClient,
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
    private readonly audit: AuditLogService,
    private readonly config: ConfigService<AppEnv, true>,
  ) {}

  // ------------------------------------------------------------------ context

  /** Facts that change: prices, latest guides and how many jobs are live. Cached so chats stay fast. */
  private async liveFacts() {
    if (this.live && Date.now() - this.live.at < LIVE_TTL_MS) return this.live;
    const [posts, externalJobs, nigerianJobs, openDealoJobs] = await Promise.all([
      this.prisma.blogPost
        .findMany({ where: { status: BlogPostStatus.PUBLISHED }, orderBy: { publishedAt: 'desc' }, take: 6, select: { title: true, slug: true, excerpt: true } })
        .catch(() => []),
      this.prisma.externalJob.count().catch(() => 0),
      this.prisma.externalJob
        .count({ where: { OR: NIGERIA_PLACES.map((place) => ({ location: { contains: place, mode: 'insensitive' as const } })) } })
        .catch(() => 0),
      this.prisma.job.count({ where: { status: 'OPEN' } }).catch(() => 0),
    ]);
    const cvPrice = this.config.get('CV_PREMIUM_PRICE_MINOR', { infer: true });
    const cvDays = this.config.get('CV_PREMIUM_DAYS', { infer: true });
    const pro = AGENT_PLANS.PRO;
    const vars: LiveVars = {
      cvPremium: `${naira(cvPrice)} for ${cvDays} days`,
      agentPlans: `Free gives ${AGENT_PLANS.FREE.monthlyRuns} runs a month; Pro is ${naira(pro.priceMinor)} for ${pro.periodDays} days with ${pro.monthlyRuns.toLocaleString('en-NG')} runs a month`,
      latestPosts: posts.length ? posts.slice(0, 3).map((p) => `"${p.title}"`).join(', ') : 'see the blog',
    };
    const text = [
      `- CV Premium: ${vars.cvPremium}, paid with Paystack.`,
      `- Hiring Agents: ${vars.agentPlans}.`,
      `- Job board right now: about ${(externalJobs + openDealoJobs).toLocaleString('en-NG')} open jobs, of which about ${nigerianJobs.toLocaleString('en-NG')} are in Nigeria and ${openDealoJobs.toLocaleString('en-NG')} are Dealo Easy Apply jobs.`,
      posts.length
        ? `- Latest blog posts:\n${posts.map((p) => `  - "${p.title}" (/blog/${p.slug}): ${p.excerpt.slice(0, 160)}`).join('\n')}`
        : '- Blog: see /blog.',
    ].join('\n');
    this.live = { at: Date.now(), text, vars };
    return this.live;
  }

  private async userContext(user?: AuthUser) {
    if (!user || user.authType === 'api_key') return 'Visitor is not signed in.';
    const [row, resumes, applications, saved, memberships, openTickets] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: user.id }, select: { firstName: true, isEmailVerified: true, onboardingPending: true, premiumUntil: true } }),
      this.prisma.resume.count({ where: { userId: user.id } }).catch(() => 0),
      this.prisma.jobApplicationLog.count({ where: { userId: user.id } }).catch(() => 0),
      this.prisma.savedJob.count({ where: { userId: user.id } }).catch(() => 0),
      this.prisma.organizationMember
        .findMany({ where: { userId: user.id }, select: { role: true, organization: { select: { name: true } } }, take: 3 })
        .catch(() => []),
      this.prisma.supportTicket.count({ where: { requesterId: user.id, status: { in: ['OPEN', 'IN_PROGRESS'] } } }).catch(() => 0),
    ]);
    const premium = row?.premiumUntil && row.premiumUntil > new Date() ? `active until ${row.premiumUntil.toISOString().slice(0, 10)}` : 'not active';
    return [
      `Signed in as ${row?.firstName || 'a Dealo user'} (roles: ${user.roles.join(', ')}).`,
      `Email confirmed: ${row?.isEmailVerified ? 'yes' : 'no'}. Still choosing role after Google/LinkedIn sign-up: ${row?.onboardingPending ? 'yes' : 'no'}.`,
      `CVs saved: ${resumes}. CV Premium: ${premium}. Job applications tracked: ${applications}. Saved jobs: ${saved}.`,
      memberships.length ? `Companies: ${memberships.map((m) => `${m.organization.name} (${m.role})`).join('; ')}.` : 'Not a member of any company workspace.',
      `Open support tickets: ${openTickets}.`,
    ].join(' ');
  }

  private async buildTurns(input: AssistantChatInput, user?: AuthUser): Promise<GeminiTurn[]> {
    const question = input.messages[input.messages.length - 1]!.text;
    const recentUser = input.messages
      .filter((m) => m.role === 'user')
      .slice(-3)
      .map((m) => m.text)
      .join(' ');
    const [live, who] = await Promise.all([this.liveFacts(), this.userContext(user)]);
    const relevant = retrieve(`${recentUser} ${question}`, 6);

    const context = [
      'KNOWLEDGE (most relevant first):',
      relevant.length ? relevant.map((topic) => topicText(topic, live.vars)).join('\n\n') : '(no exact match; rely on the index and your expertise)',
      '',
      'ALL TOPICS (index):',
      topicIndex(),
      '',
      'SITE PAGES:',
      SITE_PAGES.map((p) => `${p.label} (${p.href})`).join(', '),
      '',
      'LIVE FACTS:',
      live.text,
      '',
      `USER CONTEXT: ${who}`,
      `PAGE: ${pageHint(input.page)}`,
      `LOCALE: ${input.locale ?? 'en'} (reply in this language unless the user clearly wrote in another)`,
      `TODAY: ${new Date().toLocaleDateString('en-NG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Africa/Lagos' })}`,
    ].join('\n');

    // Gemini wants alternating turns that start with the user.
    const history = input.messages.slice(-14, -1);
    while (history[0]?.role === 'assistant') history.shift();
    const turns: GeminiTurn[] = [];
    for (const message of history) {
      const role = message.role === 'user' ? 'user' : 'model';
      const last = turns[turns.length - 1];
      if (last?.role === role) last.text += `\n\n${message.text}`;
      else turns.push({ role, text: message.text });
    }
    const finalText = `${context}\n\n---\nUSER QUESTION:\n${question}`;
    if (turns[turns.length - 1]?.role === 'user') turns[turns.length - 1]!.text += `\n\n${finalText}`;
    else turns.push({ role: 'user', text: finalText });
    return turns;
  }

  // ------------------------------------------------------------------- answers

  /** Streams an answer as events. Falls back to the built-in guide when AI is off or fails before any text. */
  async stream(input: AssistantChatInput, user: AuthUser | undefined, emit: Emit, signal?: AbortSignal): Promise<AssistantReply> {
    const id = randomUUID();
    const question = input.messages[input.messages.length - 1]!.text;
    const matched = matchTopic(question);
    const vars = (await this.liveFacts().catch(() => null))?.vars;
    const guide = { ...matched, answer: vars ? fillTemplate(matched.answer, vars) : matched.answer.replace(/\s*\{\{\w+\}\}/g, '') };

    if (this.gemini.isConfigured) {
      let full = '';
      let sent = 0;
      let started = false;
      try {
        const turns = await this.buildTurns(input, user);
        for await (const piece of this.gemini.streamText(SYSTEM, turns, { signal })) {
          if (!started) {
            emit({ type: 'start', id, source: 'ai' });
            started = true;
          }
          full += piece;
          const marker = full.indexOf(META);
          // Hold back a few characters so a half-written marker never reaches the screen.
          const visibleEnd = marker === -1 ? Math.max(sent, full.length - META.length) : marker;
          if (visibleEnd > sent) {
            emit({ type: 'delta', text: full.slice(sent, visibleEnd) });
            sent = visibleEnd;
          }
        }
        const marker = full.indexOf(META);
        const body = (marker === -1 ? full : full.slice(0, marker)).trimEnd();
        if (body.length > sent) emit({ type: 'delta', text: body.slice(sent) });
        if (!body.trim()) throw new Error('empty answer');

        const meta = this.parseMeta(marker === -1 ? '' : full.slice(marker + META.length));
        const reply: AssistantReply = {
          id,
          reply: body.trim(),
          suggestions: meta.suggestions.slice(0, 3),
          links: this.cleanLinks(meta.links, guide.links),
          handoff: meta.handoff || guide.handoff,
          source: 'ai',
        };
        emit({ type: 'done', reply });
        return reply;
      } catch (err) {
        if (signal?.aborted) throw err;
        this.logger.warn(`Assistant AI failed${started ? ' mid-answer' : ''}, using the guide: ${err instanceof Error ? err.message : err}`);
        if (started) {
          const reply: AssistantReply = {
            id,
            reply: full.split(META)[0]!.trim() || guide.answer,
            suggestions: guide.suggestions,
            links: guide.links,
            handoff: guide.handoff,
            source: 'ai',
          };
          emit({ type: 'done', reply });
          return reply;
        }
      }
    }

    // Guide answer, typed out so it feels the same as the AI.
    emit({ type: 'start', id, source: 'guide' });
    const words = guide.answer.split(/(\s+)/);
    for (let i = 0; i < words.length; i += 6) {
      if (signal?.aborted) break;
      emit({ type: 'delta', text: words.slice(i, i + 6).join('') });
      await sleep(28);
    }
    const reply: AssistantReply = { id, reply: guide.answer, suggestions: guide.suggestions, links: guide.links, handoff: guide.handoff, source: 'guide' };
    emit({ type: 'done', reply });
    return reply;
  }

  /** Same answer as the stream, in one JSON response (for clients that cannot read streams). */
  chat(input: AssistantChatInput, user?: AuthUser): Promise<AssistantReply> {
    return this.stream(input, user, () => undefined);
  }

  private parseMeta(raw: string) {
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start === -1 || end <= start) return metaSchema.parse({});
    try {
      return metaSchema.parse(JSON.parse(raw.slice(start, end + 1)));
    } catch {
      return metaSchema.parse({});
    }
  }

  private cleanLinks(links: AssistantLink[], fallback: AssistantLink[]) {
    const seen = new Set<string>();
    const safe = links.filter((l) => isAllowedHref(l.href) && !seen.has(l.href) && seen.add(l.href));
    return (safe.length ? safe : fallback).slice(0, 3);
  }

  async welcome(page: string | undefined, user?: AuthUser): Promise<AssistantWelcome> {
    const hour = Number(new Date().toLocaleString('en-NG', { hour: 'numeric', hour12: false, timeZone: 'Africa/Lagos' }));
    const part = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    const name =
      user && user.authType !== 'api_key'
        ? ((await this.prisma.user.findUnique({ where: { id: user.id }, select: { firstName: true } }).catch(() => null))?.firstName ?? '')
        : '';
    const roles = user?.roles ?? [];
    const employer = roles.some((r) => r === UserRole.EMPLOYER || r === UserRole.RECRUITER);
    const talent = roles.includes(UserRole.TALENT);

    let suggestions = GREETING_SUGGESTIONS;
    if (page?.startsWith('/resume-builder')) suggestions = ['Make my CV stand out', 'What do I get with Premium?', 'How do I download my CV?'];
    else if (page?.startsWith('/jobs')) suggestions = ['Find jobs in Lagos', 'How does Easy Apply work?', 'Interview tips'];
    else if (page?.startsWith('/dashboard/ats') || page === '/ats' || page?.startsWith('/hiring-agents')) suggestions = ['How do I post a job?', 'What can Hiring Agents do?', 'How do I invite my team?'];
    else if (page?.startsWith('/developers') || page?.startsWith('/dashboard/developer')) suggestions = ['Show me an API example', 'How do webhooks work?', 'How do I get a sandbox key?'];
    else if (page?.startsWith('/auth')) suggestions = ['I forgot my password', 'It says no account found', 'My account is locked'];
    else if (employer) suggestions = ['Request talent', 'What can Hiring Agents do?', 'How do I post a job?'];
    else if (talent) suggestions = ['Make my CV stand out', 'Find jobs in Nigeria', 'Interview tips'];

    return {
      greeting: `${part}${name ? `, ${name}` : ''}`,
      intro: employer
        ? 'Ask about hiring, shortlists, cover, or your workspace. Prefer WhatsApp? Use the green button.'
        : talent
          ? 'Ask about your CV, jobs, or interviews — I can rewrite bullets and tailor to an advert. Prefer WhatsApp anytime.'
          : 'Ask about hiring, jobs, or your CV. I can rewrite text, tailor to a job, or hand you to WhatsApp.',
      suggestions: suggestions.slice(0, 4),
      aiEnabled: this.gemini.isConfigured,
    };
  }

  async feedback(input: AssistantFeedbackInput, user?: AuthUser) {
    await this.audit.record({
      action: input.rating === 'up' ? 'ASSISTANT_FEEDBACK_UP' : 'ASSISTANT_FEEDBACK_DOWN',
      entityType: 'Assistant',
      entityId: input.messageId,
      actorId: user && user.authType !== 'api_key' ? user.id : undefined,
      metadata: { page: input.page, question: input.question.slice(0, 500), answer: input.answer.slice(0, 1500), comment: input.comment },
    });
    return { success: true };
  }

  /** A guest wants a person: email the team with the chat so they can reply, and confirm to the guest. */
  async handoff(input: AssistantHandoffInput) {
    const email = normalizeEmail(input.email);
    const transcript = transcriptText(input.transcript);

    await this.audit.record({
      action: 'ASSISTANT_HANDOFF',
      entityType: 'Contact',
      metadata: { name: input.name, email, page: input.page, messages: input.transcript.length },
    });

    const admins = await this.prisma.userRoleAssignment.findMany({
      where: { role: { code: { in: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.OPERATIONS] } } },
      include: { user: { select: { email: true } } },
      take: 40,
    });
    const recipients = [...new Set(admins.map((a) => a.user.email).filter((e): e is string => Boolean(e)))];

    const html = `<p><strong>${escapeHtml(input.name)}</strong> (${escapeHtml(email)}) asked for a person from Dealo AI Assistant${input.page ? ` on <code>${escapeHtml(input.page)}</code>` : ''}.</p>
<p><strong>Message:</strong><br/>${escapeHtml(input.message).replace(/\n/g, '<br/>')}</p>
${transcript ? `<p><strong>Chat so far:</strong></p><pre style="white-space:pre-wrap;font-family:inherit">${escapeHtml(transcript)}</pre>` : ''}
<p>Answer them at <a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a>.</p>`;

    await Promise.all(
      recipients.map((to) =>
        this.email
          .send({
            to,
            subject: `[Dealo AI] ${input.name}: ${input.message.slice(0, 60)}`,
            html,
            text: `${input.name} (${email}) asked for a person.\n\n${input.message}\n\n${transcript}`,
          })
          .catch((err: unknown) => this.logger.warn(`Handoff email to staff failed: ${err instanceof Error ? err.message : err}`)),
      ),
    );

    await this.email
      .send({
        to: email,
        subject: 'We got your message — Dealo',
        html: `<p>Hi ${escapeHtml(input.name)},</p><p>Thanks for reaching out. A person from the Dealo team will reply to this email soon.</p><p><em>Your message:</em> ${escapeHtml(input.message)}</p>`,
        text: `Hi ${input.name}, thanks for reaching out. A person from the Dealo team will reply to this email soon. Your message: ${input.message}`,
      })
      .catch((err: unknown) => this.logger.warn(`Handoff acknowledgement failed: ${err instanceof Error ? err.message : err}`));

    return { success: true, message: 'Thanks! A person from our team will reply by email soon.' };
  }
}
