import { assistSitePolicyForUrl } from '@dealo/shared';

import { classifyChannel, findApplyEmail, isScam, scoreJob, tokens, type JobCandidate, type SeekerProfile } from './job-agent-matcher';

const seeker: SeekerProfile = {
  titles: ['Accountant', 'Finance Officer'],
  skills: ['QuickBooks', 'Payroll', 'IFRS', 'Excel', 'Tax'],
  years: 5,
  cvText: 'accountant quickbooks payroll ifrs excel tax reconciliation audit ican',
  mustHave: [],
  exclude: ['commission only'],
  locations: ['Lagos'],
  remote: 'ANY',
  types: [],
};

const job = (overrides: Partial<JobCandidate>): JobCandidate => ({
  listingId: 'ext_1',
  kind: 'external',
  title: 'Accountant',
  company: 'Acme Ltd',
  location: 'Ikeja, Lagos',
  remote: false,
  employmentType: 'FULL_TIME',
  text: 'We need an accountant with QuickBooks, payroll and IFRS experience. Excel a must.',
  mustHaves: [],
  url: 'https://example.org/job',
  publishedAt: new Date(),
  ...overrides,
});

describe('scoreJob', () => {
  it('scores a strong, local, skill-matched job highly with reasons', () => {
    const result = scoreJob(seeker, job({}));
    expect(result).not.toBeNull();
    expect(result!.score).toBeGreaterThanOrEqual(85);
    expect(result!.reasons.join(' ')).toMatch(/QuickBooks/);
  });

  it('treats synonyms in titles as the same role', () => {
    expect(scoreJob(seeker, job({ title: 'Senior Accounting Officer' }))).not.toBeNull();
  });

  it('drops unrelated titles', () => {
    expect(scoreJob(seeker, job({ title: 'Truck Driver' }))).toBeNull();
  });

  it('drops on-site jobs outside the chosen cities but keeps remote ones', () => {
    expect(scoreJob(seeker, job({ location: 'Kano' }))).toBeNull();
    expect(scoreJob(seeker, job({ location: 'Worldwide', remote: true }))).not.toBeNull();
  });

  it('honours exclusions, contract types and scam signals', () => {
    expect(scoreJob(seeker, job({ title: 'Accountant (commission only)' }))).toBeNull();
    expect(scoreJob({ ...seeker, types: ['CONTRACT'] }, job({ employmentType: 'FULL_TIME' }))).toBeNull();
    expect(scoreJob(seeker, job({ text: 'Accountant needed. Pay a registration fee of 5,000 to start.' }))).toBeNull();
  });

  it('flags seniority gaps for junior candidates', () => {
    const result = scoreJob({ ...seeker, years: 1 }, job({ title: 'Head of Finance' }));
    expect(result?.gaps.join(' ')).toMatch(/years of experience/);
  });
});

describe('helpers', () => {
  it('folds phrases and synonyms into canonical tokens', () => {
    expect(tokens('Customer Service Representative').has('customer')).toBe(true);
    expect(tokens('Software Developer').has('developer')).toBe(true);
    expect(tokens('Backend Engineer').has('developer')).toBe(true);
  });

  it('finds an explicit apply-by-email address only', () => {
    expect(findApplyEmail('Interested candidates should send their CV to careers@acme.ng before Friday.')).toBe('careers@acme.ng');
    expect(findApplyEmail('How to apply: email hr@acme.com with the job title as subject')).toBe('hr@acme.com');
    expect(findApplyEmail('Questions about privacy? Contact privacy@acme.com')).toBeNull();
    expect(findApplyEmail('Send your CV to noreply@acme.com')).toBeNull();
  });

  it('spots scam wording', () => {
    expect(isScam('Kindly pay the processing fee to secure your slot')).toBe(true);
    expect(isScam('Competitive salary and HMO')).toBe(false);
  });

  it('classifies apply channels', () => {
    expect(classifyChannel({ kind: 'dealo', url: 'https://dealo.example/careers/x', applyEmail: null, emailApplyAllowed: false }).channel).toBe('easy_apply');
    expect(
      classifyChannel({ kind: 'external', url: 'https://example.org/job', applyEmail: 'hr@acme.ng', emailApplyAllowed: true }).channel,
    ).toBe('email');
    expect(
      classifyChannel({
        kind: 'external',
        url: 'https://boards.greenhouse.io/acme/jobs/1234567',
        applyEmail: null,
        emailApplyAllowed: false,
      }).channel,
    ).toBe('ats_api');
    expect(
      classifyChannel({
        kind: 'external',
        url: 'https://jobs.lever.co/acme/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
        applyEmail: null,
        emailApplyAllowed: false,
      }).channel,
    ).toBe('ats_api');
    expect(
      classifyChannel({
        kind: 'external',
        url: 'https://apply.workable.com/acme/j/ABCDEF1234',
        applyEmail: null,
        emailApplyAllowed: false,
      }).channel,
    ).toBe('ats_api');
    expect(
      classifyChannel({
        kind: 'external',
        url: 'https://jobs.ashbyhq.com/acme/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
        applyEmail: null,
        emailApplyAllowed: false,
      }).channel,
    ).toBe('ats_api');
    expect(
      classifyChannel({
        kind: 'external',
        url: 'https://jobs.smartrecruiters.com/Acme/software-engineer/744000012345678',
        applyEmail: null,
        emailApplyAllowed: false,
      }).channel,
    ).toBe('ats_api');
    expect(
      classifyChannel({
        kind: 'external',
        url: 'https://acme.bamboohr.com/careers/42',
        applyEmail: null,
        emailApplyAllowed: false,
      }).channel,
    ).toBe('ats_api');
    expect(
      classifyChannel({
        kind: 'external',
        url: 'https://acme.recruitee.com/o/software-engineer',
        applyEmail: null,
        emailApplyAllowed: false,
      }).channel,
    ).toBe('ats_api');
    expect(
      classifyChannel({
        kind: 'external',
        url: 'https://acme.wd1.myworkdayjobs.com/en-US/Careers/job/Lagos/Engineer_R123',
        applyEmail: null,
        emailApplyAllowed: false,
      }).channel,
    ).toBe('site_assisted');
    expect(classifyChannel({ kind: 'external', url: 'https://careers.example.com/job/1', applyEmail: null, emailApplyAllowed: true }).channel).toBe(
      'site_assisted',
    );
  });
});

describe('assistSitePolicyForUrl', () => {
  it('denies credential-walled boards and allows career pages', () => {
    expect(assistSitePolicyForUrl('https://www.linkedin.com/jobs/view/1').allowed).toBe(false);
    expect(assistSitePolicyForUrl('https://indeed.com/viewjob?jk=1').allowed).toBe(false);
    expect(assistSitePolicyForUrl('https://careers.example.com/apply/123').allowed).toBe(true);
  });

  it('honours personal deny/allow without overriding hard denials', () => {
    expect(assistSitePolicyForUrl('https://boards.example.com/j/1', { denyHosts: ['boards.example.com'] }).allowed).toBe(false);
    expect(
      assistSitePolicyForUrl('https://boards.example.com/j/1', {
        denyHosts: ['boards.example.com'],
        allowHosts: ['boards.example.com'],
      }).allowed,
    ).toBe(true);
    expect(
      assistSitePolicyForUrl('https://www.linkedin.com/jobs/view/1', {
        allowHosts: ['linkedin.com'],
      }).allowed,
    ).toBe(false);
  });
});
