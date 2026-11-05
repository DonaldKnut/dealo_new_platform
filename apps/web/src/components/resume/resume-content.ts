import { RESUME_SECTIONS, resumeDataSchema, type ResumeData, type ResumeSection, type ResumeStyle } from '@dealo/shared';

export const SECTION_LABEL: Record<ResumeSection, string> = {
  summary: 'Profile',
  experience: 'Work experience',
  education: 'Education',
  skills: 'Skills',
  certifications: 'Licences and certificates',
  languages: 'Languages',
  projects: 'Projects',
  references: 'References',
};

export function emptyResume(): ResumeData {
  return resumeDataSchema.parse({});
}

export const SAMPLE_RESUME: ResumeData = resumeDataSchema.parse({
  personal: {
    fullName: 'Adaeze Okafor',
    headline: 'Certified electrician · 6 years on commercial sites',
    email: 'adaeze.okafor@email.com',
    phone: '0803 123 4567',
    location: 'Ikeja, Lagos',
    linkedin: 'linkedin.com/in/adaeze-okafor',
  },
  summary:
    'Licensed electrician with six years on office, hotel and estate projects across Lagos and Abuja. Leads small crews, reads drawings, and installs solar and inverter systems that pass inspection the first time.',
  experience: [
    {
      id: 's1',
      role: 'Lead site electrician',
      company: 'Brightline Construction Ltd',
      location: 'Lagos',
      start: 'Mar 2021',
      current: true,
      bullets: [
        'Led a crew of 5 on wiring for a 12-floor office block, finished 3 weeks early',
        'Installed 40 kVA solar and inverter systems for 18 homes in Lekki',
        'Cut rework by a third with daily safety and quality checks',
      ],
    },
    {
      id: 's2',
      role: 'Electrician',
      company: 'Coastal Facilities Management',
      location: 'Abuja',
      start: 'Jan 2018',
      end: 'Feb 2021',
      bullets: ['Maintained power systems for 3 hotels with 99% uptime', 'Trained 4 apprentices on safe isolation and testing'],
    },
  ],
  education: [{ id: 'e1', school: 'Yaba College of Technology', qualification: 'HND', field: 'Electrical Engineering', start: '2014', end: '2017', grade: 'Upper credit' }],
  skills: ['Electrical installation', 'Solar PV installation', 'Inverter maintenance', 'Reading drawings', 'Health and safety', 'Team leadership'],
  certifications: [
    { id: 'c1', name: 'COREN registered technician', issuer: 'COREN', year: '2020' },
    { id: 'c2', name: 'NEBOSH International General Certificate', issuer: 'NEBOSH', year: '2022' },
  ],
  languages: [
    { id: 'l1', name: 'English', level: 'Fluent' },
    { id: 'l2', name: 'Igbo', level: 'Native' },
  ],
});

export const DEFAULT_STYLE: ResumeStyle = { template: 'classic', accentColor: '#0f766e', font: 'helvetica' };

export const newId = () => Math.random().toString(36).slice(2, 10);

export function dateRange(start: string, end: string, current: boolean) {
  const to = current ? 'Present' : end;
  if (start && to) return `${start} – ${to}`;
  return start || to || '';
}

export function contactItems(personal: ResumeData['personal']) {
  const strip = (url: string) => url.replace(/^https?:\/\/(www\.)?/i, '').replace(/\/$/, '');
  const href = (url: string) => (/^https?:\/\//i.test(url) ? url : `https://${url}`);
  return [
    personal.email ? { text: personal.email, href: `mailto:${personal.email}` } : null,
    personal.phone ? { text: personal.phone, href: `tel:${personal.phone.replace(/\s+/g, '')}` } : null,
    personal.location ? { text: personal.location } : null,
    personal.linkedin ? { text: strip(personal.linkedin), href: href(personal.linkedin) } : null,
    personal.website ? { text: strip(personal.website), href: href(personal.website) } : null,
  ].filter((item): item is { text: string; href?: string } => Boolean(item));
}

/** Sections that have something to show, in the person's chosen order. */
export function visibleSections(data: ResumeData): ResumeSection[] {
  const order = [...data.sectionOrder, ...RESUME_SECTIONS.filter((s) => !data.sectionOrder.includes(s))];
  return order.filter((section) => {
    switch (section) {
      case 'summary':
        return Boolean(data.summary.trim());
      case 'experience':
        return data.experience.some((e) => e.role || e.company);
      case 'education':
        return data.education.some((e) => e.school || e.qualification);
      case 'skills':
        return data.skills.length > 0;
      case 'certifications':
        return data.certifications.some((c) => c.name);
      case 'languages':
        return data.languages.some((l) => l.name);
      case 'projects':
        return data.projects.some((p) => p.name);
      case 'references':
        return data.references.mode !== 'hidden';
    }
  });
}

/** Mixes a hex colour with white; ratio 0 = colour, 1 = white. */
export function tint(hex: string, ratio: number) {
  const n = parseInt(hex.slice(1), 16);
  const mix = (c: number) => Math.round(c + (255 - c) * ratio);
  const r = mix((n >> 16) & 255);
  const g = mix((n >> 8) & 255);
  const b = mix(n & 255);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

/** Rough completeness score to nudge people to finish their CV. */
export function completeness(data: ResumeData) {
  const checks = [
    Boolean(data.personal.fullName),
    Boolean(data.personal.headline),
    Boolean(data.personal.email || data.personal.phone),
    Boolean(data.personal.location),
    data.summary.trim().length > 60,
    data.experience.some((e) => e.role && e.bullets.filter(Boolean).length >= 2),
    data.education.some((e) => e.school),
    data.skills.length >= 5,
  ];
  const tips = [
    'Add your full name',
    'Add a one-line headline, e.g. "Certified electrician"',
    'Add an email or phone number',
    'Add where you live',
    'Write a short profile (2–3 sentences)',
    'Add a job with at least 2 bullet points',
    'Add your education',
    'Add at least 5 skills',
  ];
  return {
    score: Math.round((checks.filter(Boolean).length / checks.length) * 100),
    nextTip: tips[checks.findIndex((ok) => !ok)] ?? null,
  };
}
