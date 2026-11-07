import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';

import { GeminiClient } from '../ai/gemini.client';

const FAIRNESS =
  'Judge and write only about skills, experience, certifications, location and availability. Never use or ask about gender, age, religion, ethnicity, tribe, state of origin, marital status or photos. Plain, warm, simple English for Nigerian readers.';

export type JobBrief = {
  title: string;
  notes: string;
  location: string;
  employmentType: string;
  workArrangement: string;
  orgName: string;
  tone: 'friendly' | 'formal';
  existing?: { description: string; mustHaves: string[] };
};

export type JobContext = { title: string; location: string; description: string; mustHaves: string[]; roleFamily: string; orgName: string };

const biasFlagSchema = z.object({ phrase: z.string(), why: z.string(), suggestion: z.string() });

const jobPostSchema = z.object({
  title: z.string().min(2).max(140),
  summary: z.string().max(400),
  description: z.string().min(40).max(8000),
  mustHaves: z.array(z.string().max(120)).max(10),
  niceToHaves: z.array(z.string().max(120)).max(8).default([]),
  salary: z.object({ minNaira: z.number().int().min(0), maxNaira: z.number().int().min(0), note: z.string().max(300) }),
  biasFlags: z.array(biasFlagSchema).max(12).default([]),
});
export type JobPostDraft = z.infer<typeof jobPostSchema>;

const sourcingSchema = z.object({
  keywords: z.array(z.string().max(60)).max(15),
  booleanSearch: z.string().max(600),
  whatsapp: z.string().max(900),
  emailSubject: z.string().max(160),
  emailBody: z.string().max(2500),
  channels: z.array(z.object({ name: z.string().max(80), tip: z.string().max(300) })).max(8),
});
export type SourcingPlan = z.infer<typeof sourcingSchema> & { linkedinUrl: string; googleXray: string };

const kitSchema = z.object({
  competencies: z
    .array(
      z.object({
        name: z.string().max(80),
        why: z.string().max(240),
        questions: z.array(z.object({ q: z.string().max(400), lookFor: z.string().max(400), redFlags: z.string().max(300) })).min(1).max(4),
      }),
    )
    .min(2)
    .max(8),
  scorecard: z.array(z.object({ criterion: z.string().max(80), one: z.string().max(200), three: z.string().max(200), five: z.string().max(200) })).min(2).max(8),
  opening: z.string().max(500),
  closing: z.string().max(500),
});
export type InterviewKit = z.infer<typeof kitSchema>;

/** Words that put people off or hint at unfair preferences, with kinder alternatives. */
const BIAS_RULES: Array<{ pattern: RegExp; why: string; suggestion: string }> = [
  { pattern: /\b(young|youthful|energetic young)\b/i, why: 'Suggests an age preference.', suggestion: 'Describe the pace of the work instead, e.g. "comfortable in a fast-moving team".' },
  { pattern: /\b(not (older|above) than \d+|below \d+ years|under \d+ years( old)?|age (limit|range|bracket)|\d{2}\s*-\s*\d{2} years old)\b/i, why: 'Age limits are unfair and exclude good people.', suggestion: 'Remove the age limit; ask for the experience you need.' },
  { pattern: /\b(female|male|ladies|gentlemen|men) only\b|\bmust be (a )?(male|female|lady|man|woman)\b/i, why: 'Gender requirements are discriminatory for most roles.', suggestion: 'Describe the duties; anyone who can do them should apply.' },
  { pattern: /\b(rock ?star|ninja|guru|wizard|superstar)\b/i, why: 'Slang titles put many qualified people off.', suggestion: 'Use the real job title and level.' },
  { pattern: /\b(native (english )?speaker)\b/i, why: 'Excludes fluent speakers from other backgrounds.', suggestion: 'Say "fluent in English" or the level you need.' },
  { pattern: /\b(single|unmarried|married)\b/i, why: 'Marital status has nothing to do with the job.', suggestion: 'Remove it.' },
  { pattern: /\b(christian|muslim|indigene|state of origin|tribe)\b/i, why: 'Religion, tribe and state of origin must not decide who gets hired.', suggestion: 'Remove it and focus on skills.' },
  { pattern: /\b(good looking|attractive|pretty|handsome|beautiful)\b/i, why: 'Appearance requirements are discriminatory.', suggestion: 'Say "presentable and professional" if dress matters.' },
  { pattern: /\b(work hard,? play hard|family)\b/i, why: 'Can read as long hours with no boundaries.', suggestion: 'Say what support and working hours look like.' },
  { pattern: /\b(he|his|him)\b/i, why: 'Assumes the person is a man.', suggestion: 'Use "you" or "they".' },
];

export function biasCheck(text: string) {
  const flags: Array<z.infer<typeof biasFlagSchema>> = [];
  for (const rule of BIAS_RULES) {
    const match = text.match(rule.pattern);
    if (match) flags.push({ phrase: match[0], why: rule.why, suggestion: rule.suggestion });
  }
  return flags;
}

/** Rough monthly pay bands (naira) for common Nigerian roles, used when AI is off or as a sanity check. */
const PAY_BANDS: Array<{ match: RegExp; min: number; max: number }> = [
  { match: /intern|trainee|nysc/i, min: 50_000, max: 120_000 },
  { match: /driver|dispatch|rider/i, min: 80_000, max: 180_000 },
  { match: /cleaner|steward|security|guard|porter/i, min: 60_000, max: 130_000 },
  { match: /electrician|plumber|welder|mechanic|technician|carpenter|mason|tiler|painter|fitter/i, min: 120_000, max: 300_000 },
  { match: /customer|support|call cent|receptionist|front desk/i, min: 120_000, max: 300_000 },
  { match: /sales|business develop|marketing|account executive/i, min: 150_000, max: 450_000 },
  { match: /accountant|finance|audit|tax/i, min: 250_000, max: 650_000 },
  { match: /hr|human resource|recruit|admin/i, min: 180_000, max: 450_000 },
  { match: /engineer|developer|data|analyst|devops|product designer/i, min: 400_000, max: 1_400_000 },
  { match: /manager|lead|head|supervisor/i, min: 400_000, max: 1_000_000 },
  { match: /director|chief|vp|cfo|cto|coo/i, min: 1_200_000, max: 3_500_000 },
];

export function payBand(title: string) {
  return PAY_BANDS.find((band) => band.match.test(title)) ?? { min: 150_000, max: 400_000 };
}

const lines = (text: string) =>
  text
    .split(/\r?\n|;|•/)
    .map((line) => line.replace(/^\s*[-*\d.)]+\s*/, '').trim())
    .filter((line) => line.length > 2);

@Injectable()
export class AgentBrainsService {
  private readonly logger = new Logger(AgentBrainsService.name);

  constructor(private readonly gemini: GeminiClient) {}

  get provider(): 'gemini' | 'rules' {
    return this.gemini.isConfigured ? 'gemini' : 'rules';
  }

  /** Runs the AI path when configured; falls back to rules if it is off or fails. */
  private async withAi<T>(ai: () => Promise<T>, rules: () => T): Promise<{ value: T; provider: 'gemini' | 'rules' }> {
    if (this.gemini.isConfigured) {
      try {
        return { value: await ai(), provider: 'gemini' };
      } catch (error) {
        this.logger.warn(`Agent AI fell back to rules: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    return { value: rules(), provider: 'rules' };
  }

  // ------------------------------------------------------------- job post

  async jobPost(brief: JobBrief) {
    const band = payBand(brief.title);
    const result = await this.withAi(
      () =>
        this.gemini.json(
          `You are Dealo's job post agent for Nigerian employers. ${FAIRNESS} Write a ${brief.tone} job advert. Format "description" as plain text: short paragraphs separated by a blank line, bullet lines starting with "- ", and **bold** only for section names (About the role, What you will do, What you need, What we offer, How to apply). Salary in naira per month, realistic for the Nigerian market in 2026. List any biased or off-putting words found in the notes in biasFlags. Return JSON {title, summary, description, mustHaves:[], niceToHaves:[], salary:{minNaira, maxNaira, note}, biasFlags:[{phrase, why, suggestion}]}.`,
          JSON.stringify({
            company: brief.orgName,
            title: brief.title,
            location: brief.location,
            employmentType: brief.employmentType,
            workArrangement: brief.workArrangement,
            notes: brief.notes,
            currentDescription: brief.existing?.description?.slice(0, 4000),
            currentMustHaves: brief.existing?.mustHaves,
          }),
          jobPostSchema,
        ),
      (): JobPostDraft => {
        const noteLines = lines(brief.notes);
        const mustHaves = (brief.existing?.mustHaves.length ? brief.existing.mustHaves : noteLines.filter((l) => /\b(years?|degree|licen[cs]e|certif|experience|must|able to|skilled|know)/i.test(l))).slice(0, 6);
        const duties = noteLines.filter((l) => !mustHaves.includes(l)).slice(0, 6);
        const where = [brief.location, brief.workArrangement === 'REMOTE' ? 'remote' : brief.workArrangement === 'HYBRID' ? 'hybrid' : 'on-site'].filter(Boolean).join(' · ');
        const description = [
          `**About the role**\n${brief.orgName} is hiring a ${brief.title}${brief.location ? ` in ${brief.location}` : ''}. This is a ${brief.employmentType.replace('_', '-').toLowerCase()} role (${where}).`,
          `**What you will do**\n${(duties.length ? duties : [`Own the day-to-day work of a ${brief.title}`, 'Work closely with the team to hit weekly goals', 'Keep clear records and report progress']).map((d) => `- ${d}`).join('\n')}`,
          `**What you need**\n${(mustHaves.length ? mustHaves : ['Proven experience in a similar role', 'Clear communication in English', 'Reliable and organised']).map((d) => `- ${d}`).join('\n')}`,
          `**What we offer**\n- Competitive monthly pay\n- A supportive team and clear goals\n- Room to grow`,
          `**How to apply**\nApply with your CV on Dealo. We reply to everyone.`,
        ].join('\n\n');
        return {
          title: brief.title,
          summary: `${brief.title} at ${brief.orgName}${brief.location ? `, ${brief.location}` : ''}.`,
          description,
          mustHaves: mustHaves.length ? mustHaves : ['Proven experience in a similar role'],
          niceToHaves: [],
          salary: { minNaira: band.min, maxNaira: band.max, note: 'Typical monthly range for this kind of role in Nigeria. Adjust for seniority and city.' },
          biasFlags: [],
        };
      },
    );
    // The rules check always runs too, so a flag is never missed when the AI is off or overlooks one.
    const aiFlags = result.value.biasFlags ?? [];
    const seen = new Set(aiFlags.map((f) => f.phrase.toLowerCase()));
    const ruleFlags = biasCheck(`${brief.notes}\n${result.value.description}`).filter((f) => !seen.has(f.phrase.toLowerCase()));
    return { ...result, value: { ...result.value, niceToHaves: result.value.niceToHaves ?? [], biasFlags: [...aiFlags, ...ruleFlags] } };
  }

  // -------------------------------------------------------------- sourcing

  async sourcing(job: JobContext) {
    const result = await this.withAi(
      () =>
        this.gemini.json(
          `You are Dealo's sourcing agent for Nigerian hiring. ${FAIRNESS} Create search keywords, a LinkedIn boolean search string, a friendly WhatsApp message (under 90 words, with {{jobLink}} placeholder) and an outreach email (subject + body under 160 words, with {{firstName}} and {{jobLink}} placeholders), and up to 6 channels where to find these people in Nigeria with one practical tip each. Return JSON {keywords:[], booleanSearch, whatsapp, emailSubject, emailBody, channels:[{name, tip}]}.`,
          JSON.stringify({ title: job.title, location: job.location, mustHaves: job.mustHaves, roleFamily: job.roleFamily, company: job.orgName, description: job.description.slice(0, 3000) }),
          sourcingSchema,
        ),
      () => {
        const keywords = [job.title, ...job.mustHaves.flatMap((m) => m.split(/[,/]| and /i)).map((s) => s.trim()).filter((s) => s.length > 2 && s.length < 40)].slice(0, 8);
        const trade = job.roleFamily === 'SKILLED_TRADE';
        return {
          keywords,
          booleanSearch: `("${job.title}"${job.mustHaves[0] ? ` OR "${job.mustHaves[0].split(/[,(]/)[0]!.trim()}"` : ''}) AND (${job.location ? `"${job.location.split(',')[0]!.trim()}" OR ` : ''}Nigeria)`,
          whatsapp: `Hi! ${job.orgName} is hiring a ${job.title}${job.location ? ` in ${job.location}` : ''}. If this sounds like you (or someone you know), apply here: {{jobLink}} – it takes 2 minutes. 🙏`,
          emailSubject: `${job.title} role at ${job.orgName}`,
          emailBody: `Hi {{firstName}},\n\nI came across your profile and thought of you for a ${job.title} role at ${job.orgName}${job.location ? ` in ${job.location}` : ''}.\n\nIf you're open to a chat, you can see the details and apply here: {{jobLink}}\n\nThanks,\n${job.orgName} hiring team`,
          channels: trade
            ? [
                { name: 'Trade associations', tip: 'Call local branches (e.g. electricians’ or welders’ associations) and ask for referrals.' },
                { name: 'WhatsApp groups', tip: 'Share the job link in artisan and site-worker groups with a clear pay range.' },
                { name: 'Technical colleges', tip: 'Ask instructors at technical colleges for recent graduates.' },
                { name: 'Referrals', tip: 'Offer a small referral bonus to your current workers.' },
              ]
            : [
                { name: 'LinkedIn', tip: 'Use the search string below and message people who are “Open to work”.' },
                { name: 'Jobberman / MyJobMag', tip: 'Post the job and link back to your Dealo careers page.' },
                { name: 'WhatsApp & Telegram groups', tip: 'Share in professional groups with the salary range to get more replies.' },
                { name: 'Referrals', tip: 'Ask your team who they would hire; referrals stay longer.' },
              ],
        };
      },
    );
    const query = encodeURIComponent(result.value.booleanSearch);
    const place = (job.location.split(',')[0] ?? '').trim();
    return {
      ...result,
      value: {
        ...result.value,
        linkedinUrl: `https://www.linkedin.com/search/results/people/?keywords=${query}`,
        googleXray: `site:linkedin.com/in "${job.title}" ${place ? `"${place}"` : 'Nigeria'}`,
      } satisfies SourcingPlan,
    };
  }

  // --------------------------------------------------------- interview kit

  async interviewKit(job: JobContext, questionCount: number) {
    return this.withAi(
      () =>
        this.gemini.json(
          `You are Dealo's interview kit agent. ${FAIRNESS} Create a structured interview for this job: ${Math.max(2, Math.ceil(questionCount / 2))} competencies with ${questionCount} questions in total, each with what a strong answer includes and red flags, plus a scorecard where 1, 3 and 5 are described for each criterion. Use behavioural ("Tell me about a time…") and practical questions that fit the role. Return JSON {competencies:[{name, why, questions:[{q, lookFor, redFlags}]}], scorecard:[{criterion, one, three, five}], opening, closing}.`,
          JSON.stringify({ title: job.title, mustHaves: job.mustHaves, roleFamily: job.roleFamily, description: job.description.slice(0, 3000) }),
          kitSchema,
        ),
      (): InterviewKit => {
        const fromMustHaves = job.mustHaves.slice(0, 4).map((must) => ({
          name: must.length > 60 ? `${must.slice(0, 57)}…` : must,
          why: 'Listed as a must-have for this job.',
          questions: [
            { q: `Tell me about a time you used “${must}” at work. What did you do and what happened?`, lookFor: 'A real example with their own actions and a clear result.', redFlags: 'Only general statements, or the team did everything.' },
          ],
        }));
        return {
          competencies: [
            ...fromMustHaves,
            {
              name: 'Problem solving',
              why: 'Every role meets surprises.',
              questions: [{ q: 'Describe a problem at work you solved without being told how. What steps did you take?', lookFor: 'Clear steps, ownership and what they learned.', redFlags: 'Blaming others; no outcome.' }],
            },
            {
              name: 'Reliability and teamwork',
              why: 'Good hires show up and help others succeed.',
              questions: [{ q: 'Tell me about a time a teammate needed help while you were busy. What did you do?', lookFor: 'Balances own work with helping; communicates early.', redFlags: 'Avoids conflict or ignores the team.' }],
            },
          ].slice(0, Math.max(2, Math.ceil(questionCount / 2))),
          scorecard: [
            { criterion: 'Skills for the job', one: 'Cannot show the core skills.', three: 'Has the core skills with some gaps.', five: 'Strong, proven skills with clear examples.' },
            { criterion: 'Communication', one: 'Hard to follow.', three: 'Clear most of the time.', five: 'Clear, concise and easy to work with.' },
            { criterion: 'Ownership', one: 'Waits to be told.', three: 'Takes ownership of own tasks.', five: 'Spots problems early and fixes them.' },
          ],
          opening: 'Thank them for coming, explain the interview takes about 30 minutes, and that they can ask questions at the end.',
          closing: 'Explain the next step and when they will hear back. Thank them for their time.',
        };
      },
    );
  }

  // --------------------------------------------------------------- follow-up

  followUpMessage(stage: string, jobTitle: string, orgName: string) {
    const late = /offer|final/i.test(stage);
    return {
      subject: late ? `Your ${jobTitle} application – an update` : `Thanks for your patience – ${jobTitle}`,
      body: `Hi {{firstName}},\n\nThank you for applying for the ${jobTitle} role at ${orgName}. We wanted to let you know your application is still being reviewed at the "${stage}" stage, and you have not been forgotten.\n\nWe expect to have an update for you soon. If anything has changed on your side, just reply to this email.\n\nBest regards,\n${orgName} hiring team`,
    };
  }

  // ----------------------------------------------------------------- digest

  async digestHeadline(metrics: Record<string, unknown>, fallback: string) {
    if (!this.gemini.isConfigured) return { text: fallback, provider: 'rules' as const };
    const result = await this.withAi(
      () =>
        this.gemini.json(
          'You write a short morning hiring briefing for a busy Nigerian hiring manager. Two or three sentences, warm and direct, naming the single most important thing to do today. Return JSON {text}.',
          JSON.stringify(metrics),
          z.object({ text: z.string().min(10).max(600) }),
        ),
      () => ({ text: fallback }),
    );
    return { text: result.value.text, provider: result.provider };
  }
}
