import type { JobAgentRemote, ResumeData } from '@dealo/shared';

import { NIGERIA_PLACES } from '../job-board/nigeria-places';

export type SeekerProfile = {
  titles: string[];
  skills: string[];
  years: number | null;
  /** Lower-case CV text for "does the job mention something I have" checks. */
  cvText: string;
  mustHave: string[];
  exclude: string[];
  locations: string[];
  remote: JobAgentRemote;
  types: string[];
};

export type JobCandidate = {
  listingId: string;
  kind: 'dealo' | 'external';
  title: string;
  company: string;
  location: string;
  remote: boolean;
  employmentType: string;
  /** Plain text used for matching (summary, tags, must-haves, or the full description when loaded). */
  text: string;
  mustHaves: string[];
  url: string;
  publishedAt: Date;
};

export type MatchResult = { score: number; reasons: string[]; gaps: string[] };

const STOPWORDS = new Set(
  'a an and the of for to in on at with by from or as is are be we our you your this that job role position vacancy needed urgent hiring wanted ltd limited plc company nigeria lagos'.split(' '),
);

/** Words that mean the same job. The first entry is the canonical form. */
const SYNONYMS: string[][] = [
  ['developer', 'engineer', 'programmer', 'dev', 'coder'],
  ['frontend', 'front-end', 'front end', 'react', 'ui engineer'],
  ['backend', 'back-end', 'back end', 'server'],
  ['accountant', 'accounting', 'accounts', 'bookkeeper', 'bookkeeping'],
  ['sales', 'business development', 'account executive', 'sales representative', 'marketer'],
  ['customer', 'client', 'support', 'service', 'call centre', 'call center', 'helpdesk'],
  ['hr', 'human resources', 'people', 'recruiter', 'talent acquisition'],
  ['admin', 'administrative', 'administrator', 'office assistant', 'secretary', 'receptionist', 'front desk'],
  ['driver', 'chauffeur', 'dispatch rider', 'rider'],
  ['marketing', 'digital marketing', 'social media', 'brand', 'content'],
  ['nurse', 'nursing'],
  ['teacher', 'tutor', 'educator', 'instructor'],
  ['electrician', 'electrical'],
  ['analyst', 'analytics', 'analysis'],
  ['manager', 'management', 'lead', 'head', 'supervisor'],
  ['finance', 'financial'],
  ['logistics', 'supply chain', 'procurement', 'warehouse'],
  ['designer', 'design', 'ui/ux', 'ux', 'graphic'],
];

const CANON = new Map<string, string>();
for (const group of SYNONYMS) for (const word of group) CANON.set(word, group[0]!);

export const normalise = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}+#/.\s-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

function stem(word: string) {
  if (word.length > 5 && word.endsWith('ing')) return word.slice(0, -3);
  if (word.length > 4 && word.endsWith('s') && !word.endsWith('ss')) return word.slice(0, -1);
  return word;
}

/** Canonical tokens: phrases are folded first ("customer service" → "customer"), then single words. */
export function tokens(text: string): Set<string> {
  let value = ` ${normalise(text)} `;
  for (const [phrase, canon] of CANON) if (phrase.includes(' ') && value.includes(` ${phrase} `)) value = value.replaceAll(` ${phrase} `, ` ${canon} `);
  return new Set(
    value
      .split(' ')
      .filter((w) => w.length > 1 && !STOPWORDS.has(w))
      .map((w) => CANON.get(w) ?? CANON.get(stem(w)) ?? stem(w)),
  );
}

const hasWord = (haystack: string, needle: string) => {
  const n = normalise(needle);
  if (!n) return false;
  return new RegExp(`(^|[^\\p{L}\\p{N}])${n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[^\\p{L}\\p{N}])`, 'u').test(haystack);
};

/** Whole years worked across the CV's roles. */
export function yearsOfExperience(data: ResumeData) {
  const years = data.experience
    .map((job) => {
      const start = Number(job.start.match(/(19|20)\d{2}/)?.[0]);
      const end = job.current ? new Date().getFullYear() : Number(job.end.match(/(19|20)\d{2}/)?.[0]);
      return start && end && end >= start ? end - start : 0;
    })
    .reduce((sum, value) => sum + value, 0);
  return years ? Math.min(45, years) : null;
}

/** Job titles worth hunting for, guessed from the CV (headline first, then recent roles). */
export function suggestTitles(data: ResumeData) {
  const raw = [data.personal.headline, ...data.experience.map((e) => e.role)].map((t) => t.replace(/\s*[|·•,-].*$/, '').trim());
  return [...new Map(raw.filter((t) => t.length >= 3).map((t) => [t.toLowerCase(), t])).values()].slice(0, 5);
}

export function cvText(data: ResumeData) {
  return normalise(
    [
      data.personal.headline,
      data.summary,
      data.skills.join(' '),
      ...data.experience.flatMap((e) => [e.role, e.company, ...e.bullets]),
      ...data.education.flatMap((e) => [e.qualification, e.field]),
      ...data.certifications.map((c) => c.name),
      ...data.projects.map((p) => `${p.name} ${p.description}`),
    ].join(' '),
  );
}

const SENIOR = /\b(senior|sr\.?|lead|head|principal|manager|director|chief|vp|vice president)\b/i;
const JUNIOR = /\b(intern|internship|graduate|trainee|entry[- ]level|junior|jr\.?|nysc)\b/i;
const SCAM = /(application|registration|processing|training|medical|uniform) fee|pay (a|the|an) (fee|deposit)|send money|western union|gift card|whatsapp only|no interview required/i;
const isNigerian = (location: string) => NIGERIA_PLACES.some((place) => hasWord(normalise(location), place));

export function isScam(text: string) {
  return SCAM.test(text);
}

/**
 * Scores how well a job fits the person, 0–100, with plain reasons. Returns null when the job
 * breaks a hard rule (excluded word, wrong place, wrong contract type, scam signs, unrelated title).
 */
export function scoreJob(seeker: SeekerProfile, job: JobCandidate): MatchResult | null {
  const titleNorm = normalise(job.title);
  const jobText = normalise(`${job.title} ${job.company} ${job.text} ${job.mustHaves.join(' ')}`);

  if (seeker.exclude.some((word) => hasWord(titleNorm, word) || hasWord(normalise(job.company), word))) return null;
  if (isScam(jobText)) return null;
  if (seeker.types.length && job.employmentType !== 'OTHER' && !seeker.types.includes(job.employmentType)) return null;
  if (seeker.remote === 'REMOTE_ONLY' && !job.remote) return null;
  if (seeker.remote === 'ONSITE_ONLY' && job.remote) return null;

  const reasons: string[] = [];
  const gaps: string[] = [];

  // Title fit (0–45): the best overlap between the job title and any target title.
  const jobTokens = tokens(job.title);
  let titleFit = 0;
  let bestTitle = '';
  let exact = false;
  for (const target of seeker.titles) {
    const t = tokens(target);
    if (!t.size) continue;
    let overlap = 0;
    for (const word of t) if (jobTokens.has(word)) overlap += 1;
    const literal = titleNorm.includes(normalise(target));
    // Synonym overlap alone is a close match; only the actual words count as exact.
    const fit = literal ? 1 : Math.min(0.85, overlap / t.size);
    if (fit > titleFit) {
      titleFit = fit;
      bestTitle = target;
      exact = literal;
    }
  }
  if (titleFit < 0.34) return null;
  const titlePoints = Math.round(titleFit * 45);
  reasons.push(exact ? `Exactly the role you want: ${bestTitle}` : `Close to your target role "${bestTitle}"`);

  // Skills (0–30): CV skills the job mentions.
  const matchedSkills = seeker.skills.filter((skill) => hasWord(jobText, skill));
  const needed = Math.min(6, Math.max(3, Math.round(seeker.skills.length * 0.4)));
  const skillPoints = seeker.skills.length ? Math.round(Math.min(1, matchedSkills.length / needed) * 30) : 12;
  if (matchedSkills.length) reasons.push(`Uses your skills: ${matchedSkills.slice(0, 4).join(', ')}`);

  // Location (0–15).
  let locationPoints: number;
  if (job.remote) {
    locationPoints = 15;
    reasons.push('Remote, so you can work from anywhere');
  } else if (seeker.locations.length) {
    const hit = seeker.locations.find((place) => hasWord(normalise(job.location), place));
    if (!hit) return null;
    locationPoints = 15;
    reasons.push(`In ${hit}, where you want to work`);
  } else {
    locationPoints = isNigerian(job.location) ? 10 : 5;
  }

  // Seniority (0–10).
  let seniorityPoints = 8;
  if (seeker.years !== null) {
    if (SENIOR.test(job.title)) {
      if (seeker.years < 3) {
        seniorityPoints = 0;
        gaps.push('The title suggests more years of experience than your CV shows');
      } else seniorityPoints = seeker.years >= 5 ? 10 : 6;
    } else if (JUNIOR.test(job.title)) {
      seniorityPoints = seeker.years >= 6 ? 3 : 10;
      if (seeker.years >= 6) gaps.push('This looks junior for your experience');
    }
  }

  // Must-haves the person set: missing all of them costs a third of the score.
  let total = titlePoints + skillPoints + locationPoints + seniorityPoints;
  if (seeker.mustHave.length) {
    const present = seeker.mustHave.filter((word) => hasWord(jobText, word));
    if (!present.length) {
      total = Math.round(total * 0.67);
      gaps.push(`Does not mention ${seeker.mustHave.slice(0, 3).join(', ')}`);
    }
  }

  // Job requirements the CV does not show.
  for (const requirement of job.mustHaves.slice(0, 8)) {
    const words = [...tokens(requirement)].filter((w) => w.length > 3);
    if (words.length && !words.some((w) => seeker.cvText.includes(w))) gaps.push(`Asks for: ${requirement}`);
  }

  const ageDays = (Date.now() - job.publishedAt.getTime()) / 86_400_000;
  if (ageDays <= 2) reasons.push('Posted in the last 2 days');

  return { score: Math.max(0, Math.min(100, total)), reasons: reasons.slice(0, 4), gaps: gaps.slice(0, 3) };
}

const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const APPLY_EMAIL_PATTERNS = [
  /(send|forward|email|e-mail|mail|submit)[^.@\n]{0,80}?\b(cv|cvs|resume|résumé|resumes|application|applications)\b[^@\n]{0,60}?([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/i,
  /\b(cv|cvs|resume|résumé|applications?)\b[^@\n]{0,40}?\b(to|via|at)\b\s*:?\s*([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/i,
  /\bhow to apply\b[^@]{0,160}?([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/i,
];
const NOT_FOR_APPLYING = /^(no-?reply|donotreply|privacy|abuse|dpo|legal|support|info@example|test)@|@(example|test|domain)\./i;

/** The address a listing explicitly asks applicants to send CVs to, if it names one. */
export function findApplyEmail(text: string): string | null {
  const plain = text.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ');
  for (const pattern of APPLY_EMAIL_PATTERNS) {
    const match = pattern.exec(plain);
    const email = match?.[match.length - 1];
    if (email && EMAIL.test(email) && !NOT_FOR_APPLYING.test(email)) return email.toLowerCase().replace(/\.$/, '');
  }
  return null;
}
