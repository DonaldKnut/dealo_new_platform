/** Outside sources we link to (with credit). We never copy their text. */
export type ExternalRead = {
  title: string;
  source: string;
  href: string;
  year: string;
  summary: string;
  topic: string;
};

export const FURTHER_READING: ExternalRead[] = [
  {
    title: 'Nigeria Labour Force Survey, Q2 2024',
    source: 'National Bureau of Statistics',
    href: 'https://www.nigerianstat.gov.ng/pdfuploads/NLFS_Q2_2024.pdf',
    year: '2024',
    summary: 'Official numbers on jobs in Nigeria, including unemployment, informal work and youth.',
    topic: 'Nigeria',
  },
  {
    title: 'Employment and Social Trends 2026',
    source: 'International Labour Organization',
    href: 'https://www.ilo.org/publications/flagship-reports/employment-and-social-trends-2026',
    year: '2026',
    summary: 'The global picture: where jobs are growing, and why job quality is not keeping up.',
    topic: 'Global',
  },
  {
    title: 'Inclusive labour market transformations in Africa',
    source: 'International Labour Organization',
    href: 'https://www.ilo.org/sites/default/files/2026-10/AFRM-15-%5BRELMEETINGS-260724-003%5D-EN.pdf',
    year: '2026',
    summary: 'Africa’s growth, the jobs gap, informal work and the youth challenge, in one report.',
    topic: 'Africa',
  },
  {
    title: 'Global employment stable but decent jobs in short supply',
    source: 'UN News',
    href: 'https://news.un.org/en/story/2026/01/1166751',
    year: '2026',
    summary: 'A short news summary of the ILO outlook, with a section on sub-Saharan Africa.',
    topic: 'Africa',
  },
  {
    title: 'NDP Act General Application and Implementation Directive',
    source: 'Nigeria Data Protection Commission',
    href: 'https://ndpc.gov.ng/wp-content/uploads/2025/03/NDP-ACT-GAID-2025-MARCH-20TH.pdf',
    year: '2025',
    summary: 'The regulator’s rules for handling personal data, which includes candidate CVs.',
    topic: 'Law',
  },
  {
    title: 'AI in employment practice: risks and compliance',
    source: 'DLA Piper Africa',
    href: 'https://www.dlapiperafrica.com/en/nigeria/insights/2026/ai_in_employment_practice',
    year: '2026',
    summary: 'Legal tips for using AI in hiring in Nigeria: bias checks, consent and human review.',
    topic: 'AI',
  },
  {
    title: 'National Minimum Wage (Amendment) Act, 2024',
    source: 'Law Nigeria',
    href: 'https://lawnigeria.com/2025/10/06/national-minimum-wage-amendment-act-2024/',
    year: '2024',
    summary: 'The law that set the ₦70,000 monthly minimum wage and a three-year review cycle.',
    topic: 'Law',
  },
];
