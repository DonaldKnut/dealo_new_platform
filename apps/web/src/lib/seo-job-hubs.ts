export type JobCityHub = {
  slug: string;
  name: string;
  /** Passed to jobs search `location` (empty for remote-only). */
  locationQuery: string;
  remote?: 'true';
  title: string;
  description: string;
  h1: string;
  intro: string;
  keywords: string[];
};

export type JobRoleHub = {
  slug: string;
  name: string;
  /** Search `q` */
  query: string;
  title: string;
  description: string;
  h1: string;
  intro: string;
  keywords: string[];
};

export const JOB_CITY_HUBS: JobCityHub[] = [
  {
    slug: 'lagos',
    name: 'Lagos',
    locationQuery: 'Lagos',
    title: 'Jobs in Lagos, Nigeria — office & skilled trades',
    description:
      'Fresh jobs in Lagos from Dealo employers and trusted boards. Easy apply with your Dealo CV, or let Job Agent hunt overnight.',
    h1: 'Jobs in Lagos',
    intro:
      'Lagos moves fast. Dealo lists checked Easy Apply roles and partner board openings across Island, Mainland, and hybrid — so you spend time interviewing, not refreshing tabs.',
    keywords: ['jobs in Lagos', 'Lagos jobs', 'jobs in Lagos Nigeria', 'vacancies Lagos', 'hiring Lagos'],
  },
  {
    slug: 'abuja',
    name: 'Abuja',
    locationQuery: 'Abuja',
    title: 'Jobs in Abuja — FCT vacancies on Dealo',
    description: 'Find office, tech, and skilled trade jobs in Abuja. Apply with one CV or run Job Agent while you work.',
    h1: 'Jobs in Abuja',
    intro: 'Abuja hiring is steady across government-adjacent offices, banks, NGOs, and trades. Dealo aggregates openings and keeps Easy Apply on Dealo-hosted roles.',
    keywords: ['jobs in Abuja', 'Abuja jobs', 'FCT jobs', 'vacancies Abuja'],
  },
  {
    slug: 'port-harcourt',
    name: 'Port Harcourt',
    locationQuery: 'Port Harcourt',
    title: 'Jobs in Port Harcourt — oil city & beyond',
    description: 'Port Harcourt jobs for office talent and skilled trades. Apply on Dealo or track external listings in one place.',
    h1: 'Jobs in Port Harcourt',
    intro: 'From site crews to office support, Port Harcourt roles show up across Dealo and partner feeds. Filter here, apply with your vault-ready CV.',
    keywords: ['jobs in Port Harcourt', 'Port Harcourt jobs', 'Rivers State jobs'],
  },
  {
    slug: 'ibadan',
    name: 'Ibadan',
    locationQuery: 'Ibadan',
    title: 'Jobs in Ibadan — Oyo State vacancies',
    description: 'Browse jobs in Ibadan on Dealo. Easy Apply where available; Job Agent for career pages that need a human click.',
    h1: 'Jobs in Ibadan',
    intro: 'Ibadan is growing for education, health, admin, and trades. Dealo keeps the feed current so local seekers are not stuck on WhatsApp forwards alone.',
    keywords: ['jobs in Ibadan', 'Ibadan jobs', 'Oyo State jobs'],
  },
  {
    slug: 'remote-nigeria',
    name: 'Remote Nigeria',
    locationQuery: '',
    remote: 'true',
    title: 'Remote jobs in Nigeria — work from home & hybrid',
    description: 'Remote and work-from-home jobs for Nigerians. Apply with your Dealo CV or let Job Agent pack Assist for career sites.',
    h1: 'Remote jobs in Nigeria',
    intro: 'Remote roles that accept Nigerian talent — customer support, tech, finance, and creative. We surface remote flags clearly so you skip the bait.',
    keywords: ['remote jobs Nigeria', 'work from home Nigeria', 'remote jobs Lagos', 'online jobs Nigeria'],
  },
];

export const JOB_ROLE_HUBS: JobRoleHub[] = [
  {
    slug: 'accountant',
    name: 'Accountant',
    query: 'accountant',
    title: 'Accountant jobs in Nigeria',
    description: 'Accountant and finance vacancies across Lagos, Abuja, and remote. Easy Apply on Dealo or Assist on career pages.',
    h1: 'Accountant jobs',
    intro: 'Finance roles that ask for ICAN, ACCA, or strong Excel — matched to Nigerian employers and remote teams hiring locally.',
    keywords: ['accountant jobs Nigeria', 'accountant jobs Lagos', 'finance jobs Nigeria'],
  },
  {
    slug: 'software-engineer',
    name: 'Software engineer',
    query: 'software engineer',
    title: 'Software engineer jobs in Nigeria',
    description: 'Software engineer and developer jobs in Nigeria and remote. Apply with one CV; Job Agent handles overnight hunting.',
    h1: 'Software engineer jobs',
    intro: 'From startups in Yaba to remote-first product teams — engineer roles with clear apply paths, not endless recruiter spam.',
    keywords: ['software engineer jobs Nigeria', 'developer jobs Lagos', 'tech jobs Nigeria'],
  },
  {
    slug: 'nurse',
    name: 'Nurse',
    query: 'nurse',
    title: 'Nursing jobs in Nigeria',
    description: 'Nursing and clinical support vacancies. Track applications on Dealo and keep your CV ready.',
    h1: 'Nursing jobs',
    intro: 'Hospital, clinic, and home-care openings. We keep listings readable and apply flows honest — no fee-to-apply traps.',
    keywords: ['nursing jobs Nigeria', 'nurse jobs Lagos', 'clinical jobs Nigeria'],
  },
  {
    slug: 'electrician',
    name: 'Electrician',
    query: 'electrician',
    title: 'Electrician jobs in Nigeria',
    description: 'Electrician and skilled trade jobs for site and facility work across Nigeria.',
    h1: 'Electrician jobs',
    intro: 'Trades hiring on Dealo includes electricians for estates, construction, and facilities — with managed staffing options for employers.',
    keywords: ['electrician jobs Nigeria', 'electrical jobs Lagos', 'skilled trade jobs'],
  },
  {
    slug: 'admin',
    name: 'Admin / office',
    query: 'admin',
    title: 'Admin and office jobs in Nigeria',
    description: 'Admin, executive assistant, and office support jobs. Easy Apply with your Dealo CV.',
    h1: 'Admin & office jobs',
    intro: 'Front desk, EA, and operations support roles that keep Nigerian offices running — filtered for clarity and applyability.',
    keywords: ['admin jobs Lagos', 'office jobs Nigeria', 'executive assistant jobs'],
  },
  {
    slug: 'customer-service',
    name: 'Customer service',
    query: 'customer service',
    title: 'Customer service jobs in Nigeria',
    description: 'Customer service and call centre roles, including remote. Apply on Dealo or continue with Assist.',
    h1: 'Customer service jobs',
    intro: 'Voice, chat, and BPO openings that hire in Nigeria. Pair with Job Agent when the career page needs a supervised finish.',
    keywords: ['customer service jobs Nigeria', 'call centre jobs Lagos', 'BPO jobs Nigeria'],
  },
];

export function cityHub(slug: string) {
  return JOB_CITY_HUBS.find((c) => c.slug === slug) ?? null;
}

export function roleHub(slug: string) {
  return JOB_ROLE_HUBS.find((r) => r.slug === slug) ?? null;
}

/** Highest-intent city × role pairs for sitemap (not every combo). */
export const JOB_CITY_ROLE_PAIRS: Array<{ city: string; role: string }> = [
  { city: 'lagos', role: 'accountant' },
  { city: 'lagos', role: 'software-engineer' },
  { city: 'lagos', role: 'admin' },
  { city: 'lagos', role: 'customer-service' },
  { city: 'lagos', role: 'electrician' },
  { city: 'abuja', role: 'accountant' },
  { city: 'abuja', role: 'admin' },
  { city: 'abuja', role: 'software-engineer' },
  { city: 'remote-nigeria', role: 'software-engineer' },
  { city: 'remote-nigeria', role: 'customer-service' },
  { city: 'remote-nigeria', role: 'accountant' },
];
