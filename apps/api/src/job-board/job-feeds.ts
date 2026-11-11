import type { JobBoardSource, JobBoardType } from '@dealo/shared';
import { createHash } from 'crypto';
import sanitizeHtml from 'sanitize-html';

export type FeedSource = Exclude<JobBoardSource, 'dealo'>;

export type FeedJob = {
  source: FeedSource;
  sourceId: string;
  title: string;
  company: string;
  companyLogo: string | null;
  location: string;
  remote: boolean;
  employmentType: JobBoardType;
  category: string | null;
  tags: string[];
  salaryText: string | null;
  description: string;
  summary: string;
  url: string;
  publishedAt: Date;
};

/** Keys for feeds that need an account. A feed without its key is skipped, not failed. */
export type FeedKeys = { joobleKey?: string; careerjetAffid?: string };

/** Credit each feed and link back to it, as their terms ask. */
export const FEED_INFO: Record<FeedSource, { name: string; url: string; minIntervalMs: number; needs?: keyof FeedKeys }> = {
  // Remotive asks for at most 4 calls a day.
  remotive: { name: 'Remotive', url: 'https://remotive.com', minIntervalMs: 6 * 3_600_000 },
  jobicy: { name: 'Jobicy', url: 'https://jobicy.com', minIntervalMs: 2 * 3_600_000 },
  arbeitnow: { name: 'Arbeitnow', url: 'https://www.arbeitnow.com', minIntervalMs: 2 * 3_600_000 },
  jooble: { name: 'Jooble', url: 'https://ng.jooble.org', minIntervalMs: 3 * 3_600_000, needs: 'joobleKey' },
  careerjet: { name: 'Careerjet', url: 'https://www.careerjet.com.ng', minIntervalMs: 3 * 3_600_000, needs: 'careerjetAffid' },
};

/** Places that mean "in Nigeria" when someone filters by Nigeria. */
export const NIGERIA_PLACES = [
  'Nigeria',
  'Lagos',
  'Abuja',
  'FCT',
  'Port Harcourt',
  'Ibadan',
  'Kano',
  'Enugu',
  'Kaduna',
  'Benin City',
  'Ikeja',
  'Lekki',
  'Victoria Island',
  'Warri',
  'Uyo',
  'Calabar',
  'Owerri',
  'Abeokuta',
  'Ilorin',
  'Onitsha',
  'Asaba',
  'Akure',
  'Osogbo',
  'Jos',
  'Ogun',
  'Rivers',
  'Delta',
  'Anambra',
  'Oyo',
];

export const isNigeria = (location: string) => /^(nigeria|ng|naija)$/i.test(location.trim());

const USER_AGENT = 'DealoJobBoard/1.0 (+https://dealonetwork.com/jobs)';

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' }, signal: AbortSignal.timeout(20_000) });
  if (!res.ok) throw new Error(`${url} answered ${res.status}`);
  return (await res.json()) as T;
}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—', hellip: '…', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“' };

export function decodeEntities(text: string) {
  return text
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n: string) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, name: string) => ENTITIES[name.toLowerCase()] ?? m);
}

const clean = (text: unknown, max = 200) => decodeEntities(String(text ?? '')).replace(/\s+/g, ' ').trim().slice(0, max);

export function plainText(html: string) {
  const once = decodeEntities(sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} }));
  const text = /<\/?(p|div|ul|li|br|strong)\b/i.test(once) ? decodeEntities(sanitizeHtml(once, { allowedTags: [], allowedAttributes: {} })) : once;
  return text.replace(/\s+/g, ' ').trim();
}

/** Keeps only simple formatting; links open in a new tab and never pass on ranking. */
export function safeHtml(raw: string) {
  // Some feeds send their HTML escaped a second time ("&lt;p&gt;"), which would show tags as text.
  const html = /&lt;\/?(p|div|ul|ol|li|br|strong|h\d)\b/i.test(raw) ? decodeEntities(raw) : raw;
  return sanitizeHtml(html, {
    allowedTags: ['p', 'br', 'ul', 'ol', 'li', 'strong', 'b', 'em', 'i', 'h3', 'h4', 'blockquote', 'a'],
    allowedAttributes: { a: ['href', 'target', 'rel'] },
    allowedSchemes: ['http', 'https', 'mailto'],
    transformTags: {
      h1: 'h3',
      h2: 'h3',
      h5: 'h4',
      h6: 'h4',
      div: 'p',
      a: sanitizeHtml.simpleTransform('a', { target: '_blank', rel: 'noopener noreferrer nofollow' }),
    },
    exclusiveFilter: (frame) => ['p', 'li', 'h3', 'h4'].includes(frame.tag) && !frame.text.trim() && !frame.mediaChildren.length,
  }).slice(0, 60_000);
}

export function mapJobType(raw: string | undefined | null): JobBoardType {
  const value = (raw ?? '').toLowerCase();
  if (/intern|praktik|trainee/.test(value)) return 'INTERNSHIP';
  if (/free ?lance/.test(value)) return 'FREELANCE';
  if (/contract|befrist/.test(value)) return 'CONTRACT';
  if (/part|teilzeit|werkstudent|minijob/.test(value)) return 'PART_TIME';
  if (/temp/.test(value)) return 'TEMPORARY';
  if (/full|vollzeit|permanent|festanstellung|berufserfahren/.test(value)) return 'FULL_TIME';
  return 'OTHER';
}

const SYMBOLS: Record<string, string> = { USD: '$', EUR: '€', GBP: '£', NGN: '₦', CAD: 'CA$', AUD: 'A$' };

function compact(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 ? 1 : 0)}m`;
  if (n >= 1000) return `${Math.round(n / 1000)}k`;
  return String(n);
}

export function salaryRange(min?: number | null, max?: number | null, currency = 'USD', period?: string | null) {
  if (!min && !max) return null;
  const sym = SYMBOLS[currency.toUpperCase()] ?? `${currency.toUpperCase()} `;
  const range = min && max && min !== max ? `${sym}${compact(min)}–${sym}${compact(max)}` : `${sym}${compact((min || max)!)}`;
  const per = period ? ` / ${period.replace(/ly$/, '').replace(/^dai$/, 'day').replace(/^annual$/, 'year')}` : '';
  return `${range}${per}`;
}

/** Arbeitnow lists many German-language jobs; Dealo shows only English ones. */
export function looksEnglish(text: string) {
  const sample = text.slice(0, 2000);
  const en = (sample.match(/\b(the|and|you|with|for|our|we|will|are|of|to|your)\b/gi) ?? []).length;
  const de = (sample.match(/\b(und|die|der|wir|mit|für|sie|ist|das|zu|von|bei|eine|ihre)\b/gi) ?? []).length;
  return en >= 8 && en > de * 1.5;
}

function summarise(text: string) {
  return text.length > 240 ? `${text.slice(0, 237).replace(/\s+\S*$/, '')}…` : text;
}

function validDate(value: Date, fallback = new Date()) {
  return Number.isNaN(value.getTime()) || value.getTime() > Date.now() + 86_400_000 ? fallback : value;
}

// ------------------------------------------------------------------ Remotive

type RemotiveJob = {
  id: number;
  url: string;
  title: string;
  company_name: string;
  company_logo?: string | null;
  category?: string;
  tags?: string[];
  job_type?: string;
  publication_date: string;
  candidate_required_location?: string;
  salary?: string;
  description: string;
};

export async function fetchRemotive(): Promise<FeedJob[]> {
  const body = await getJson<{ jobs?: RemotiveJob[] }>('https://remotive.com/api/remote-jobs');
  return (body.jobs ?? []).map((job) => {
    const text = plainText(job.description);
    return {
      source: 'remotive' as const,
      sourceId: String(job.id),
      title: clean(job.title),
      company: clean(job.company_name, 120),
      companyLogo: job.company_logo || null,
      location: clean(job.candidate_required_location, 120) || 'Worldwide',
      remote: true,
      employmentType: mapJobType(job.job_type),
      category: clean(job.category, 80) || null,
      tags: (job.tags ?? []).slice(0, 8).map((t) => clean(t, 40)).filter(Boolean),
      salaryText: clean(job.salary, 80) || null,
      description: safeHtml(job.description),
      summary: summarise(text),
      url: job.url,
      publishedAt: validDate(new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(job.publication_date) ? job.publication_date : `${job.publication_date}Z`)),
    };
  });
}

// -------------------------------------------------------------------- Jobicy

type JobicyJob = {
  id: number;
  url: string;
  jobTitle: string;
  companyName: string;
  companyLogo?: string | null;
  jobIndustry?: string[];
  jobType?: string[];
  jobGeo?: string;
  jobLevel?: string;
  jobExcerpt?: string;
  jobDescription: string;
  pubDate: string;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  salaryPeriod?: string;
};

export async function fetchJobicy(): Promise<FeedJob[]> {
  const body = await getJson<{ jobs?: JobicyJob[] }>('https://jobicy.com/api/v2/remote-jobs?count=100');
  return (body.jobs ?? []).map((job) => {
    const text = plainText(job.jobDescription);
    return {
      source: 'jobicy' as const,
      sourceId: String(job.id),
      title: clean(job.jobTitle),
      company: clean(job.companyName, 120),
      companyLogo: job.companyLogo || null,
      location: clean(job.jobGeo, 120) || 'Anywhere',
      remote: true,
      employmentType: mapJobType(job.jobType?.[0]),
      category: clean(job.jobIndustry?.[0], 80) || null,
      tags: [job.jobLevel, ...(job.jobIndustry ?? []).slice(1)].filter(Boolean).slice(0, 6).map((t) => clean(t, 40)),
      salaryText: salaryRange(job.salaryMin, job.salaryMax, job.salaryCurrency ?? 'USD', job.salaryPeriod),
      description: safeHtml(job.jobDescription),
      summary: summarise(text || clean(job.jobExcerpt, 400)),
      url: job.url,
      publishedAt: validDate(new Date(job.pubDate)),
    };
  });
}

// ----------------------------------------------------------------- Arbeitnow

type ArbeitnowJob = {
  slug: string;
  company_name: string;
  title: string;
  description: string;
  remote: boolean;
  url: string;
  tags?: string[];
  job_types?: string[];
  location?: string;
  created_at: number;
};

export async function fetchArbeitnow(pages = 2): Promise<FeedJob[]> {
  const out: FeedJob[] = [];
  for (let page = 1; page <= pages; page += 1) {
    const body = await getJson<{ data?: ArbeitnowJob[] }>(`https://www.arbeitnow.com/api/job-board-api?page=${page}`);
    for (const job of body.data ?? []) {
      const text = plainText(job.description);
      if (!looksEnglish(text)) continue;
      const place = /^remote/i.test(clean(job.location)) ? '' : clean(job.location, 100);
      out.push({
        source: 'arbeitnow',
        sourceId: clean(job.slug, 200),
        title: clean(job.title),
        company: clean(job.company_name, 120),
        companyLogo: null,
        location: job.remote ? (place ? `Remote · ${place}` : 'Remote') : place || 'Europe',
        remote: Boolean(job.remote),
        employmentType: mapJobType(job.job_types?.join(' ')),
        category: clean(job.tags?.find((t) => !/remote/i.test(t)), 80) || null,
        tags: (job.tags ?? []).slice(0, 6).map((t) => clean(t, 40)),
        salaryText: null,
        description: safeHtml(job.description),
        summary: summarise(text),
        url: job.url,
        publishedAt: validDate(new Date(job.created_at * 1000)),
      });
    }
  }
  return out;
}

// --------------------------------------------------------------------- Jooble

type JoobleJob = {
  id: number | string;
  title: string;
  location?: string;
  snippet?: string;
  salary?: string;
  source?: string;
  type?: string;
  link: string;
  company?: string;
  updated?: string;
};

/** Jooble needs a search word, so a spread of common Nigerian job searches is pulled each run. */
const JOOBLE_SEARCHES = [
  'manager',
  'sales',
  'engineer',
  'accountant',
  'driver',
  'admin',
  'customer service',
  'marketing',
  'technician',
  'teacher',
  'nurse',
  'developer',
  'human resources',
  'finance',
  'operations',
  'business development',
  'logistics',
  'banking',
  'security',
  'electrician',
  'cashier',
  'chef',
  'graduate trainee',
  'internship',
];

type JoobleBody = { jobs?: JoobleJob[]; totalCount?: number; message?: string };

/** Jooble keys belong to one country site; Nigerian results come from ng.jooble.org. */
const JOOBLE_ROUTES = [
  { host: 'ng.jooble.org', location: 'Nigeria' },
  { host: 'jooble.org', location: 'Nigeria' },
  { host: 'jooble.org', location: 'Lagos' },
];
let joobleRoute: (typeof JOOBLE_ROUTES)[number] | null = null;

async function joobleSearch(key: string, route: (typeof JOOBLE_ROUTES)[number], keywords: string) {
  const res = await fetch(`https://${route.host}/api/${encodeURIComponent(key)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'User-Agent': USER_AGENT },
    body: JSON.stringify({ keywords, ...(route.location ? { location: route.location } : {}), page: '1', ResultOnPage: '50' }),
    signal: AbortSignal.timeout(20_000),
  });
  if (res.status === 401 || res.status === 403) {
    throw new Error(
      `Jooble refused the key on ${route.host} (${res.status}). Keys only work on the country site they were issued for; get a Nigerian key at https://ng.jooble.org/api/about and set JOOBLE_API_KEY.`,
    );
  }
  if (!res.ok) return { jobs: [] as JoobleJob[], note: `${route.host} answered ${res.status}` };
  const body = (await res.json().catch(() => ({}))) as JoobleBody;
  return { jobs: body.jobs ?? [], note: `${route.host}${route.location ? ` / ${route.location}` : ''}: total ${body.totalCount ?? 0}${body.message ? ` (${body.message})` : ''}` };
}

/** Jooble's free partner API (key from jooble.org/api/about). Nigerian jobs from many local sites. */
export async function fetchJooble(key: string): Promise<FeedJob[]> {
  const out: FeedJob[] = [];
  const notes: string[] = [];
  if (!joobleRoute) {
    for (const route of JOOBLE_ROUTES) {
      const probe = await joobleSearch(key, route, 'manager').catch((error: unknown) => ({ jobs: [] as JoobleJob[], note: String(error instanceof Error ? error.message : error) }));
      notes.push(probe.note);
      if (probe.jobs.length) {
        joobleRoute = route;
        break;
      }
    }
    if (!joobleRoute) throw new Error(`Jooble returned no Nigerian jobs. Tried ${notes.join('; ')}`);
  }
  const route = joobleRoute;
  for (const keywords of JOOBLE_SEARCHES) {
    const { jobs } = await joobleSearch(key, route, keywords);
    for (const job of jobs) {
      const text = plainText(job.snippet ?? '');
      out.push({
        source: 'jooble',
        sourceId: String(job.id),
        title: clean(job.title),
        company: clean(job.company, 120) || clean(job.source, 120) || 'Employer',
        companyLogo: null,
        location: clean(job.location, 120) || 'Nigeria',
        remote: /remote/i.test(`${job.location} ${job.title}`),
        employmentType: mapJobType(job.type),
        category: null,
        tags: [],
        salaryText: clean(job.salary, 80) || null,
        description: safeHtml(`<p>${job.snippet ?? ''}</p>`),
        summary: summarise(text),
        url: job.link,
        publishedAt: validDate(new Date(job.updated ?? Date.now())),
      });
    }
  }
  if (!out.length) {
    joobleRoute = null;
    throw new Error(`Jooble returned no jobs on ${route.host}`);
  }
  return [...new Map(out.map((job) => [job.sourceId, job])).values()];
}

// ------------------------------------------------------------------ Careerjet

type CareerjetJob = {
  title: string;
  company?: string;
  date?: string;
  description?: string;
  locations?: string;
  salary?: string;
  site?: string;
  url: string;
};

/** Careerjet partner API (free affiliate ID from careerjet.com.ng/partners). Searches Nigeria in English. */
export async function fetchCareerjet(affid: string, pages = 2): Promise<FeedJob[]> {
  const out: FeedJob[] = [];
  for (let page = 1; page <= pages; page += 1) {
    const params = new URLSearchParams({
      locale_code: 'en_NG',
      affid,
      location: 'Nigeria',
      sort: 'date',
      pagesize: '99',
      page: String(page),
      user_ip: '0.0.0.0',
      user_agent: USER_AGENT,
      url: 'https://dealonetwork.com/jobs',
    });
    const body = await getJson<{ type?: string; jobs?: CareerjetJob[]; error?: string }>(`https://public.api.careerjet.net/search?${params}`);
    if (body.error) throw new Error(`Careerjet: ${body.error}`);
    const jobs = body.jobs ?? [];
    for (const job of jobs) {
      const text = plainText(job.description ?? '');
      out.push({
        source: 'careerjet',
        sourceId: createHash('sha1').update(job.url).digest('hex'),
        title: clean(job.title),
        company: clean(job.company, 120) || clean(job.site, 120) || 'Employer',
        companyLogo: null,
        location: clean(job.locations, 120) || 'Nigeria',
        remote: /remote/i.test(`${job.locations} ${job.title}`),
        employmentType: mapJobType(job.title),
        category: null,
        tags: [],
        salaryText: clean(job.salary, 80) || null,
        description: safeHtml(`<p>${job.description ?? ''}</p>`),
        summary: summarise(text),
        url: job.url,
        publishedAt: validDate(new Date(job.date ?? Date.now())),
      });
    }
    if (jobs.length < 99) break;
  }
  return out;
}

/**
 * Some companies post the same job once per city. Keep one listing (the newest) and
 * name the other places, so one employer can't fill the whole board.
 */
export function collapseDuplicates(jobs: FeedJob[]): FeedJob[] {
  const groups = new Map<string, FeedJob[]>();
  for (const job of jobs) {
    const key = `${job.company.toLowerCase()}|${job.title.toLowerCase()}`;
    groups.set(key, [...(groups.get(key) ?? []), job]);
  }
  return [...groups.values()].map((group) => {
    if (group.length === 1) return group[0]!;
    const newest = [...group].sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime())[0]!;
    const places = [...new Set(group.map((j) => j.location))];
    const location = places.length > 2 ? `${places.slice(0, 2).join(', ')} +${places.length - 2} more` : places.join(', ');
    return { ...newest, location: location.slice(0, 160), remote: group.some((j) => j.remote) };
  });
}

export const FEED_FETCHERS: Record<FeedSource, (keys: FeedKeys) => Promise<FeedJob[]>> = {
  remotive: () => fetchRemotive(),
  jobicy: () => fetchJobicy(),
  arbeitnow: () => fetchArbeitnow(),
  jooble: (keys) => fetchJooble(keys.joobleKey!),
  careerjet: (keys) => fetchCareerjet(keys.careerjetAffid!),
};
