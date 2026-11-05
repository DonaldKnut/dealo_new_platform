import { Injectable } from '@nestjs/common';
import { resumeAiTailorResultSchema, type ResumeAiTailorResult, type ResumeData } from '@dealo/shared';
import { z } from 'zod';

import { GeminiClient } from '../ai/gemini.client';

const WRITING_RULES =
  'You help job seekers in Nigeria and Africa write honest, strong CVs. Use plain, simple British English. Never invent employers, dates, numbers, degrees or licences that the person did not give. Prefer concrete results and tools. No first person ("I"), no buzzwords like "synergy" or "go-getter".';

const ACTION_VERBS: Array<[RegExp, string]> = [
  [/^(was )?responsible for /i, 'Managed '],
  [/^(i )?(did|do|doing) /i, 'Carried out '],
  [/^(i )?(help|helped|helping) (with )?/i, 'Supported '],
  [/^(i )?(work|worked|working) (on|with) /i, 'Delivered work on '],
  [/^(i )?(made|make|making) /i, 'Produced '],
  [/^(i )?(handle|handled|handling) /i, 'Handled '],
  [/^(i )?(fix|fixed|fixing) /i, 'Repaired '],
  [/^(i )?(train|trained|training) /i, 'Trained '],
];

const STOP = new Set(
  'a an and are as at be by for from has have in is it of on or our the to we with you your will who can must need needs years year experience work working good strong ability able team role job'.split(' '),
);

const words = (text: string) =>
  (text.toLowerCase().match(/[a-z][a-z+#.-]{2,}/g) ?? []).map((w) => w.replace(/[.-]+$/, '')).filter((w) => w.length > 2 && !STOP.has(w));

/** Strips contact details: the AI never needs them. */
function anonymous(data: ResumeData) {
  return {
    headline: data.personal.headline,
    location: data.personal.location,
    summary: data.summary,
    experience: data.experience.map(({ role, company, start, end, current, bullets }) => ({ role, company, start, end, current, bullets })),
    education: data.education.map(({ qualification, field, school }) => ({ qualification, field, school })),
    skills: data.skills,
    certifications: data.certifications.map(({ name, issuer, year }) => ({ name, issuer, year })),
  };
}

@Injectable()
export class ResumeAiService {
  constructor(private readonly gemini: GeminiClient) {}

  get provider() {
    return this.gemini.isConfigured ? 'gemini' : 'rules';
  }

  async bullets(input: { role: string; company: string; text: string }) {
    if (this.gemini.isConfigured) {
      const result = await this.gemini.json(
        `${WRITING_RULES} Turn rough notes about one job into 3 to 6 short CV bullet points. Each starts with a strong past-tense verb and is under 25 words.`,
        JSON.stringify(input),
        z.object({ bullets: z.array(z.string().max(300)).min(1).max(6) }),
      );
      return { provider: 'gemini', bullets: result.bullets };
    }
    const bullets = input.text
      .split(/\n|;|•|(?<=\.)\s+/)
      .map((line) => line.replace(/^[-*\s]+/, '').trim())
      .filter((line) => line.length > 3)
      .slice(0, 6)
      .map((line) => {
        let out = line.replace(/\.$/, '');
        for (const [pattern, verb] of ACTION_VERBS) {
          if (pattern.test(out)) {
            out = out.replace(pattern, verb);
            break;
          }
        }
        return out.charAt(0).toUpperCase() + out.slice(1);
      });
    return { provider: 'rules', bullets };
  }

  async summary(data: ResumeData) {
    if (this.gemini.isConfigured) {
      const result = await this.gemini.json(
        `${WRITING_RULES} Write a 2 to 3 sentence CV profile summary from the details. Under 70 words.`,
        JSON.stringify(anonymous(data)),
        z.object({ summary: z.string().max(800) }),
      );
      return { provider: 'gemini', summary: result.summary };
    }
    const latest = data.experience[0];
    const role = data.personal.headline || latest?.role || 'Professional';
    const years = data.experience.length ? `${data.experience.length > 1 ? 'Experienced' : 'Skilled'} ${role.toLowerCase()}` : role;
    const skills = data.skills.slice(0, 4).join(', ');
    const cert = data.certifications[0]?.name;
    const parts = [
      `${years}${data.personal.location ? ` based in ${data.personal.location}` : ''}${latest?.company ? `, most recently at ${latest.company}` : ''}.`,
      skills ? `Strong in ${skills}.` : '',
      cert ? `Holds ${cert}.` : '',
      'Reliable, careful and ready to add value from day one.',
    ];
    return { provider: 'rules', summary: parts.filter(Boolean).join(' ') };
  }

  async tailor(data: ResumeData, jobDescription: string): Promise<ResumeAiTailorResult & { provider: string }> {
    if (this.gemini.isConfigured) {
      const result = await this.gemini.json(
        `${WRITING_RULES} Compare the CV with the job advert. Return JSON {summary (rewritten 2-3 sentence profile aimed at this job, only using true facts from the CV), skillsToAdd (skills the person seems to have from their CV but did not list, max 6), missingKeywords (important words from the advert not found in the CV, max 10), tips (max 5 short, practical changes)}.`,
        `CV:\n${JSON.stringify(anonymous(data))}\n\nJOB ADVERT:\n${jobDescription.slice(0, 6000)}`,
        resumeAiTailorResultSchema,
      );
      return { provider: 'gemini', ...result };
    }
    const cvText = JSON.stringify(anonymous(data)).toLowerCase();
    const counts = new Map<string, number>();
    for (const w of words(jobDescription)) counts.set(w, (counts.get(w) ?? 0) + 1);
    const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([w]) => w).slice(0, 25);
    const missing = top.filter((w) => !cvText.includes(w)).slice(0, 10);
    const base = await this.summary(data);
    return {
      provider: 'rules',
      summary: base.summary,
      skillsToAdd: [],
      missingKeywords: missing,
      tips: [
        missing.length ? `If true for you, mention: ${missing.slice(0, 5).join(', ')}.` : 'Your CV already uses most words from the advert.',
        'Put your most relevant job first and add numbers (people, sites, money, time saved).',
        'Keep it to one or two pages.',
      ],
    };
  }

  async coverLetter(data: ResumeData, input: { jobTitle: string; company: string; jobDescription: string }) {
    if (this.gemini.isConfigured) {
      const result = await this.gemini.json(
        `${WRITING_RULES} Write a short cover letter body (3 to 4 paragraphs, under 280 words) for this job, using only facts from the CV. Start with "Dear Hiring Manager," and end with "Yours sincerely," on its own line. Do not add the person's name or contact details.`,
        `CV:\n${JSON.stringify(anonymous(data))}\n\nJOB: ${input.jobTitle} at ${input.company}\n${input.jobDescription.slice(0, 5000)}`,
        z.object({ body: z.string().max(4000) }),
      );
      return { provider: 'gemini', body: result.body };
    }
    const latest = data.experience[0];
    const skills = data.skills.slice(0, 3).join(', ');
    const body = [
      'Dear Hiring Manager,',
      `I am writing to apply for the ${input.jobTitle} role at ${input.company}.${latest ? ` I currently work as ${latest.role}${latest.company ? ` at ${latest.company}` : ''}` : ''}${skills ? `, where I use ${skills} every day` : ''}.`,
      latest?.bullets[0] ? `In my recent work I ${latest.bullets[0].charAt(0).toLowerCase()}${latest.bullets[0].slice(1).replace(/\.$/, '')}. I would bring the same care and reliability to your team.` : 'I would bring care, reliability and a willingness to learn to your team.',
      `I would welcome the chance to discuss how I can help ${input.company}. Thank you for your time.`,
      'Yours sincerely,',
    ].join('\n\n');
    return { provider: 'rules', body };
  }
}
