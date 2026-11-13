import type { AssistantLink } from '@dealo/shared';

export type Topic = {
  id: string;
  title: string;
  /** Lower-case words or phrases; phrases score higher than single words, and a leading "~" marks a broad word that only breaks ties. */
  keywords: string[];
  answer: string;
  links: AssistantLink[];
  suggestions: string[];
  /** Questions a person must handle (money already taken, broken accounts). */
  handoff?: boolean;
};

/** Everything the assistant knows for certain about Dealo. Keep answers true; the AI may expand, never contradict. */
export const TOPICS: Topic[] = [
  {
    id: 'about',
    title: 'What Dealo is',
    keywords: ['what is dealo', 'about dealo', 'who are you', 'what do you do', 'dealo', 'company'],
    answer:
      'Dealo is a hiring platform based in Nigeria. Companies hire checked office staff and skilled trades (direct hiring or managed staffing), or run their own hiring with the Dealo ATS and AI Hiring Agents. We do not recruit drivers, chefs/cooks, or domestic workers. Job seekers build a free CV, search Nigerian and remote jobs, apply and track applications. Job seekers never pay to get a job.',
    links: [
      { label: 'About Dealo', href: '/about' },
      { label: 'How it works', href: '/how-it-works' },
    ],
    suggestions: ['How does hiring with Dealo work?', 'How do I build a CV?', 'What are Hiring Agents?'],
  },
  {
    id: 'how-it-works',
    title: 'How hiring with Dealo works',
    keywords: ['how it works', 'process', 'steps', 'how long', 'how fast', '48 hours', 'shortlist', 'timeline'],
    answer:
      'Four steps: share the role (job, skills, location, budget); Dealo recruiters and AI agents check candidates (skills tests, past work, references); you interview a short ranked list, usually the top 2 or 3, often within 48 hours; then you hire with a free replacement within 90 days if it does not work out. Senior or rare roles can take longer and we say so up front.',
    links: [
      { label: 'How it works', href: '/how-it-works' },
      { label: 'Request talent', href: '/hire' },
    ],
    suggestions: ['Direct hiring or managed staffing?', 'How much does it cost?', 'Request talent'],
  },
  {
    id: 'services',
    title: 'Direct hiring vs managed staffing',
    keywords: [
      'direct hire',
      'direct hiring',
      'direct recruitment',
      'managed staffing',
      'staffing',
      'outsource',
      'difference',
      'services',
      'recruitment agency',
      'temp cover',
      'contract cover',
      'day rate',
      'training',
      'upskilling',
      'onboarding modules',
    ],
    answer:
      'Direct hiring: Dealo finds and checks people, you interview and they join your payroll; priced per job, you pay when someone joins, with a free 90-day replacement. Managed staffing: Dealo supplies the workers and manages contracts, pay paperwork and replacements for a monthly fee, with agreed dates and headcount. Temp and contract cover: day rates plus a clear Dealo mark-up for skilled trades and short office cover (absences, peaks, high-repeat bookings). Training after hire: employers pay for short onboarding modules (site safety, tools, office onboarding, customer service) once talent is placed. Core hiring covers office roles and skilled trades.',
    links: [
      { label: 'Direct hiring', href: '/services/direct-recruitment' },
      { label: 'Managed staffing', href: '/services/managed-staffing' },
      { label: 'Temp & contract cover', href: '/services/contract-cover' },
      { label: 'Training after hire', href: '/services/talent-training' },
      { label: 'Compare services', href: '/services' },
    ],
    suggestions: ['How much does it cost?', 'Request talent', 'Where do you operate?'],
  },
  {
    id: 'pricing-services',
    title: 'Prices for hiring services',
    keywords: ['price', 'prices', 'pricing', 'cost', 'how much', 'fee', 'fees', 'quote', 'charge', 'expensive', 'cheap'],
    answer:
      'Direct hiring is priced per job and you pay when someone joins your team. Managed staffing is a monthly fee. Temp/contract cover is day rate plus mark-up. Training modules are priced per pack and billed to the employer after placement. Dealo gives an exact price once we understand the role, before you agree to anything. Fixed-price products: Hiring Agents ({{agentPlans}}) and Dealo Premium for CV + Job Agent ({{cvPremium}}). Job seekers never pay to get a job.',
    links: [
      { label: 'Get a price', href: '/hire' },
      { label: 'Compare services', href: '/services' },
    ],
    suggestions: ['Request talent', 'What is the 90-day replacement?', 'Talk to a person'],
  },
  {
    id: 'replacement',
    title: '90-day replacement promise',
    keywords: ['replacement', 'guarantee', 'leaves', 'quit', 'did not work out', 'bad hire', '90 day', '90-day', 'warranty'],
    answer:
      'If a direct hire leaves or does not work out within 90 days, Dealo finds a replacement for free. For managed staffing, a standby worker can cover the gap quickly.',
    links: [{ label: 'Direct hiring', href: '/services/direct-recruitment' }],
    suggestions: ['Request talent', 'Talk to a person'],
  },
  {
    id: 'coverage',
    title: 'Where Dealo works and which roles',
    keywords: [
      'where',
      'location',
      'lagos',
      'abuja',
      'nigeria',
      'africa',
      'abroad',
      'international',
      'remote',
      'which roles',
      'what roles',
      'trades',
      'artisan',
      'driver',
      'drivers',
      'chef',
      'chefs',
      'cook',
      'domestic',
      'house help',
      'househelp',
      'nanny',
      'cleaner',
      'security guard',
    ],
    answer:
      'Dealo is based in Nigeria and works mostly in Lagos and Abuja, and helps companies abroad hire people in Nigeria and across Africa. Some office roles can be remote. We recruit office and professional roles (admin, finance, accounting, tech, HR, office support) and skilled trades (bricklaying, electrical, plumbing, welding, carpentry, site leads). We do not recruit drivers, chefs/cooks, or domestic workers (house help, nannies, cleaners, and similar). If a role is outside that scope we say so honestly.',
    links: [{ label: 'For employers', href: '/for-employers' }],
    suggestions: ['Request talent', 'Direct hiring or managed staffing?'],
  },
  {
    id: 'hire-request',
    title: 'Requesting talent',
    keywords: ['request talent', 'hire request', 'request a hire', 'need workers', 'find staff', 'hire for me', 'need staff', 'hire someone'],
    answer:
      'Tap "Hire workers" or open the hire form: about 3 minutes to share the role, location, headcount, budget and start date. A Dealo recruiter usually replies the same day. Signed-in employers can also open the hire form from the dashboard (details are prefilled) and track every request and its status under Dashboard, Requests.',
    links: [
      { label: 'Request talent', href: '/hire' },
      { label: 'My requests', href: '/dashboard/requests' },
    ],
    suggestions: ['How much does it cost?', 'How fast will I get people?'],
  },
  {
    id: 'cv-builder',
    title: 'CV builder',
    keywords: ['~cv', '~resume', '~résumé', 'builder', 'make a cv', 'create cv', 'build cv', 'build a cv', 'template', 'templates', 'write my cv'],
    answer:
      'Build a CV for free in the Dealo CV builder: fill in details step by step and watch the A4 preview update live. Classic and Modern templates, three fonts and the first colour are free; icons beside headings are free too. You need an account to download the PDF; saved CVs live under Dashboard, My CVs.',
    links: [
      { label: 'Open the CV builder', href: '/resume-builder/new' },
      { label: 'My CVs', href: '/dashboard/resumes' },
    ],
    suggestions: ['What do I get with Premium?', 'Tips for a strong CV', 'Find jobs for my CV'],
  },
  {
    id: 'cv-premium',
    title: 'CV Premium',
    keywords: ['premium', 'upgrade cv', 'pay for cv', 'cover letter', 'cover letters', 'ai writing', 'write it for me', 'locked', 'executive template'],
    answer:
      'CV Premium unlocks every template (Executive, Minimal, Artisan, Compact), premium fonts (including Source Serif, DM Sans, Libre Franklin), all colours, corner illustrations, AI writing help (bullets, summary, tailoring to a job), cover letters, up to 20 saved CVs and PDFs without the small Dealo footer. The same Premium also powers Job Agent (more applies, AI cover notes, email apply). It costs {{cvPremium}}; pay securely with Paystack and it switches on straight away.',
    links: [{ label: 'See templates', href: '/resume-builder' }],
    suggestions: ['How do I download my CV?', 'I paid but Premium is not active', 'What is free?'],
  },
  {
    id: 'cv-download',
    title: 'Downloading a CV',
    keywords: ['download', 'pdf', 'export', 'print', 'save my cv', 'saved cv', 'my cvs'],
    answer:
      'Tap Download at the top of the builder. If you are not signed in we keep your CV on this device, ask you to sign in, then download straight away. If the design uses premium features you can switch to a free design with one tap.',
    links: [{ label: 'My CVs', href: '/dashboard/resumes' }],
    suggestions: ['What do I get with Premium?', 'Find jobs for my CV'],
  },
  {
    id: 'cv-design',
    title: 'CV design options',
    keywords: ['font', 'fonts', 'colour', 'color', 'icon', 'icons', 'illustration', 'design', 'section order', 'bold', 'italic', 'bullet', 'layout'],
    answer:
      'Open the Design step: change template, colour and typography (each font name is shown in its own face), turn on icons, add a corner illustration (Premium) and drag sections into a new order. The live A4 studio preview updates as you edit. The Profile and project boxes support bold, italic and bullet points from the small toolbar.',
    links: [{ label: 'Open the CV builder', href: '/resume-builder/new' }],
    suggestions: ['What do I get with Premium?', 'How do I download my CV?'],
  },
  {
    id: 'jobs',
    title: 'Job board',
    keywords: ['job', 'jobs', 'vacancy', 'vacancies', 'job board', 'openings', 'hiring now', 'find work', 'find a job', 'nigerian jobs'],
    answer:
      'The Dealo job board puts Dealo employer jobs and jobs from trusted boards (including thousands of Nigerian listings) in one search; with no location chosen, Nigerian jobs show first. Filter by type, place, remote, category and date, use the "Jobs in Nigeria" button, save jobs, and apply. Dealo jobs take one-tap Easy Apply with the CV you built here; outside jobs open on the original site and Dealo tracks the application for you. New jobs arrive every few hours.',
    links: [
      { label: 'Browse jobs', href: '/jobs' },
      { label: 'My applications', href: '/dashboard/applications' },
    ],
    suggestions: ['How do I build a CV?', 'Where are my applications?', 'Interview tips'],
  },
  {
    id: 'job-agent',
    title: 'Job Agent (auto-apply)',
    keywords: ['job agent', 'auto apply', 'auto-apply', 'apply for me', 'apply automatically', 'autopilot', 'apply while i sleep', 'background', 'agent apply'],
    answer:
      'The Dealo Job Agent works in the background, even when you are offline. It reads the CV you choose, searches new Nigerian and remote jobs around the clock, scores each one against your skills, titles, location and seniority, and skips anything that looks like a scam. In "Ask me first" mode it prepares matches for you to send; in "Apply automatically" mode it sends Easy Apply applications to Dealo employers on its own, up to your daily limit. Jobs on other websites are never auto-submitted: it prepares them (with the reasons it fits) so you finish in one tap. Free: 2 applications a day, a search every 12 hours. Premium ({{cvPremium}}): 15 a day, a search every 3 hours, AI scoring, a cover note written for each job, and email applications when a job asks for CVs by email.',
    links: [
      { label: 'Open my Job Agent', href: '/dashboard/job-agent' },
      { label: 'Build a CV', href: '/resume-builder/new' },
    ],
    suggestions: ['Is auto-apply safe?', 'What do I get with Premium?', 'How do I build a CV?'],
  },
  {
    id: 'applications',
    title: 'Tracking applications',
    keywords: ['my applications', 'application status', 'tracker', 'applied', 'heard back', 'shortlisted', 'saved jobs'],
    answer:
      'Everything you applied for is under Dashboard, My applications, with saved jobs alongside. Dealo jobs update by themselves when the employer moves you forward; for outside jobs you set the status (applied, interview, offer, hired, rejected) and add notes.',
    links: [{ label: 'My applications', href: '/dashboard/applications' }],
    suggestions: ['Browse jobs', 'Interview tips'],
  },
  {
    id: 'talent-profile',
    title: 'Job seeker profile and matches',
    keywords: ['profile', 'matches', 'get matched', 'job seeker', 'professional', 'talent profile', 'documents', 'upload certificate'],
    answer:
      'Job seekers fill a profile once (role, experience, skills, location, links) and upload documents. Dealo recruiters use it to match you to real roles in office work and skilled trades, and matches appear in your dashboard. Your CV stays private until you choose to share it.',
    links: [
      { label: 'My profile', href: '/dashboard/profile' },
      { label: 'For job seekers', href: '/for-professionals' },
    ],
    suggestions: ['How do I build a CV?', 'Browse jobs'],
  },
  {
    id: 'ats',
    title: 'Dealo ATS for employers',
    keywords: ['ats', 'applicant tracking', 'post a job', 'post job', 'workspace', 'pipeline', 'candidates', 'careers page', 'kanban', 'recruiting software'],
    answer:
      'Employers run hiring in the Dealo ATS: create a workspace (verified email needed), post jobs, get a public careers page, collect applications, and move candidates across a pipeline board. It includes AI screening a person always reviews, interview scheduling with calendar invites and self-booking links, scorecards, offers candidates accept online, email templates and bulk emails, reports, team invites with roles, and API keys and webhooks per workspace.',
    links: [
      { label: 'Open the ATS', href: '/dashboard/ats' },
      { label: 'About the ATS', href: '/ats' },
    ],
    suggestions: ['How do I post a job?', 'What are Hiring Agents?', 'How do I invite my team?'],
  },
  {
    id: 'ats-post-job',
    title: 'Posting a job in the ATS',
    keywords: ['how do i post', 'create a job', 'new job', 'publish job', 'job post', 'job description'],
    answer:
      'Open Dashboard, ATS, then New job. Add the title, location, work type, pay range and must-haves, then publish. It appears on your careers page and on the Dealo job board with Easy Apply. The Job post writer agent can draft a fair, clear description for you to edit.',
    links: [{ label: 'Post a job', href: '/dashboard/ats/jobs/new' }],
    suggestions: ['What are Hiring Agents?', 'How do interviews work?'],
  },
  {
    id: 'ats-interviews',
    title: 'Interviews, scorecards and offers',
    keywords: ['interview', 'interviews', 'schedule', 'calendar', 'booking link', 'scorecard', 'offer', 'offer letter', 'reject'],
    answer:
      'From a candidate in the ATS you can schedule an interview (in person, phone or video) and send a calendar invite, or send a booking link so they pick a slot. Interviewers fill scorecards. When ready, create an offer and send it; the candidate accepts or declines from a secure link. Rejections can send a polite email template.',
    links: [{ label: 'Interviews', href: '/dashboard/ats/interviews' }],
    suggestions: ['What are Hiring Agents?', 'How do I invite my team?'],
  },
  {
    id: 'team',
    title: 'Company and team invites',
    keywords: ['invite', 'team', 'teammate', 'colleague', 'organization', 'organisation', 'company account', 'members', 'roles'],
    answer:
      'Employers create their company under Dashboard, Organization, then invite teammates by email. Each invite link joins them to the same workspace with a role (for example recruiter or hiring manager). Owners can change roles or remove members in ATS team settings.',
    links: [
      { label: 'Organization', href: '/dashboard/organization' },
      { label: 'ATS team', href: '/dashboard/ats/team' },
    ],
    suggestions: ['How do I post a job?', 'What are Hiring Agents?'],
  },
  {
    id: 'hiring-agents',
    title: 'Hiring Agents',
    keywords: ['agent', 'agents', 'hiring agents', 'automation', 'automate', 'screening', 'screen candidates', 'sourcing', 'interview kit', 'follow up', 'digest'],
    answer:
      'Hiring Agents are seven AI helpers inside the ATS: screening, job post writer, sourcing, candidate follow-ups, interview scheduling, interview kits and a daily pipeline digest. They suggest actions and you approve them in one inbox, so nothing goes out without a person. Plans: {{agentPlans}}.',
    links: [
      { label: 'About Hiring Agents', href: '/hiring-agents' },
      { label: 'Open my agents', href: '/dashboard/ats/agents' },
    ],
    suggestions: ['How do I upgrade to Pro?', 'Is AI screening fair?', 'How do I post a job?'],
  },
  {
    id: 'agents-pro',
    title: 'Upgrading Hiring Agents to Pro',
    keywords: ['upgrade to pro', 'pay for pro', 'pro plan', 'agents pro', 'buy pro', 'more runs', 'run out of runs', 'limit reached', 'agent limit'],
    answer:
      'Open the Agents hub in the ATS and tap Upgrade ({{agentPlans}}). Pay securely with Paystack and the Pro runs start as soon as payment is confirmed. When Free runs are used up, agents pause until next month or until you upgrade.',
    links: [{ label: 'Open my agents', href: '/dashboard/ats/agents' }],
    suggestions: ['What are Hiring Agents?', 'I paid but Pro is not active'],
  },
  {
    id: 'ai-fairness',
    title: 'How Dealo uses AI responsibly',
    keywords: ['fair', 'bias', 'ai decide', 'automated decision', 'trust', 'human review', 'ai screening', 'ndpa', 'responsible'],
    answer:
      'AI at Dealo suggests; people decide. Screening scores come with reasons, a recruiter or the employer reviews every decision, and no candidate is rejected by AI alone. Candidate data is handled under the Nigeria Data Protection Act and only used for hiring.',
    links: [
      { label: 'Trust and AI', href: '/ats#trust' },
      { label: 'Privacy policy', href: '/privacy' },
    ],
    suggestions: ['What are Hiring Agents?', 'How is my data used?'],
  },
  {
    id: 'developers',
    title: 'Developer API',
    keywords: ['api', 'developer', 'developers', 'integration', 'integrate', 'webhook', 'webhooks', 'api key', 'sandbox', 'oauth', 'endpoint', 'swagger', 'docs'],
    answer:
      'The Dealo API lets partners create and read hire requests, read candidates and blog content, and receive signed webhooks. Job boards and HR tools can sync open jobs so Job Agents apply (see the partner Job Agent guide). Employers create free sandbox keys (dk_test_…) under Dashboard, Developer API; live keys (dk_live_…) come with a paid plan. Early Job Agent partners can stay free while volume proves out; later billing is monthly or per apply. Authenticate with "Authorization: Bearer <key>", or use OAuth2 client credentials at POST /api/v1/oauth/token for 1-hour tokens. Keys are scoped (for example hire-inquiries:read, hire-inquiries:write, candidates:read, jobs:write). Full reference is in the interactive API docs and /developers/job-agent.',
    links: [
      { label: 'Developer portal', href: '/developers' },
      { label: 'Get a sandbox key', href: '/dashboard/developer' },
      { label: 'API plans', href: '/developers#plans' },
    ],
    suggestions: ['How do webhooks work?', 'Show me an API example', 'API plans'],
  },
  {
    id: 'webhooks',
    title: 'Webhooks',
    keywords: ['webhook', 'webhooks', 'signature', 'signing secret', 'hmac', 'redeliver', 'event'],
    answer:
      'Add a webhook endpoint in the dashboard and Dealo POSTs events to it, signed with your endpoint secret so you can verify they came from Dealo. You can send a test event, view recent deliveries, redeliver a failed one and rotate the secret.',
    links: [{ label: 'Developer API', href: '/dashboard/developer' }],
    suggestions: ['Show me an API example', 'API plans'],
  },
  {
    id: 'sign-in',
    title: 'Signing in and creating an account',
    keywords: ['sign in', 'signin', 'log in', 'login', 'sign up', 'register', 'account', 'google', 'linkedin', 'create account', 'no account', "didn't find"],
    answer:
      'Sign in and Create account are separate on purpose. "Sign in" with Google or LinkedIn only works if that email already has a Dealo account; otherwise you will see "We didn’t find an account" and can create one. "Create account" refuses an email that is already registered. Email accounts need a password of 10+ characters with a letter and a number, and a confirmed email before the first sign-in. New Google or LinkedIn accounts pick their role (company or job seeker) on first visit.',
    links: [
      { label: 'Sign in', href: '/auth/login' },
      { label: 'Create an account', href: '/auth/register' },
    ],
    suggestions: ['I forgot my password', 'I did not get the verification email', 'My account is locked'],
  },
  {
    id: 'password',
    title: 'Password and lockouts',
    keywords: ['password', 'forgot', 'reset', 'cannot log in', "can't log in", 'locked out', 'locked', 'too many attempts'],
    answer:
      'Use "Forgot password" on the sign-in page; we email a link valid for 1 hour (check spam). After several wrong passwords the account locks for 15 minutes to stop attackers; wait, or reset your password, which also unlocks it. If you signed up with Google or LinkedIn, use that button instead of a password.',
    links: [{ label: 'Reset my password', href: '/auth/forgot-password' }],
    suggestions: ['I did not get the verification email', 'Talk to a person'],
  },
  {
    id: 'verify',
    title: 'Email verification',
    keywords: ['verify', 'verification', 'confirm email', 'verification email', 'not verified', 'didn’t get email', "didn't get email", 'no email', 'confirmation link'],
    answer:
      'We send a confirmation link when you sign up. If it is not in your inbox or spam, use "Send the confirmation link again" on the sign-in page, or "Resend email" on the yellow banner in your dashboard. Password sign-in, creating an ATS workspace and emailing candidates need a confirmed email.',
    links: [{ label: 'Sign in', href: '/auth/login' }],
    suggestions: ['Talk to a person', 'I forgot my password'],
  },
  {
    id: 'settings',
    title: 'Profile photo, notifications, language and theme',
    keywords: ['avatar', 'photo', 'picture', 'notification', 'notifications', 'bell', 'language', 'french', 'dark mode', 'theme', 'install app', 'app'],
    answer:
      'Change your profile photo from the avatar menu or Settings. The bell in the dashboard shows live notifications (hire request updates, new applicants, invites, support replies). Switch language (English, French, Chinese, Korean) from the header and light or dark mode from the theme toggle. On phones you can install Dealo like an app from the browser menu.',
    links: [{ label: 'Settings', href: '/dashboard/settings' }],
    suggestions: ['How do I invite my team?', 'Talk to a person'],
  },
  {
    id: 'billing',
    title: 'Payments, refunds and invoices',
    keywords: ['payment', 'paid', '~pay', 'paystack', 'refund', 'charged', 'billing', 'invoice', 'subscription', 'card', 'debit', 'not active', 'double charge'],
    answer:
      'Payments on Dealo go through Paystack; Dealo never sees or stores your card. If you were charged but the plan did not switch on, or you need a refund or invoice, a person on our team will sort it quickly. Tap "Talk to a person" and include the email you paid with and the Paystack reference.',
    links: [],
    suggestions: ['Talk to a person'],
    handoff: true,
  },
  {
    id: 'bug',
    title: 'Something is not working',
    keywords: ['bug', 'error', 'broken', 'not working', 'doesn’t work', "doesn't work", 'crash', 'stuck', 'loading', 'blank page', 'problem', 'issue', '500', '502'],
    answer:
      'Try a hard refresh (Ctrl+Shift+R, or pull down on mobile), then sign out and in again. If the site was idle it can take up to a minute to wake. If it still fails, tap "Talk to a person" with what you clicked, what you saw and the page address; we read every report.',
    links: [],
    suggestions: ['Talk to a person'],
    handoff: true,
  },
  {
    id: 'privacy',
    title: 'Privacy and your data',
    keywords: ['privacy', 'delete my account', 'delete account', 'my data', 'data', 'gdpr', 'ndpr', 'remove my cv', 'who sees my cv'],
    answer:
      'Your CV stays private until you choose to share it with Dealo recruiters or an employer. Delete saved CVs any time from My CVs. Data is handled under the Nigeria Data Protection Act. To delete your whole account, ask a person and we will do it.',
    links: [{ label: 'Privacy policy', href: '/privacy' }],
    suggestions: ['Talk to a person'],
  },
  {
    id: 'blog',
    title: 'Blog and guides',
    keywords: ['blog', 'article', 'articles', 'guide', 'guides', 'tips', 'read', 'minimum wage', 'news'],
    answer:
      'The Dealo blog has hiring guides for Nigerian employers (minimum wage, data protection, hiring well) and career tips for job seekers. Latest: {{latestPosts}}.',
    links: [{ label: 'Read the blog', href: '/blog' }],
    suggestions: ['How do I hire well in Nigeria?', 'Tips for a strong CV'],
  },
  {
    id: 'contact',
    title: 'Reaching a person',
    keywords: ['contact', 'human', 'person', 'agent please', 'support', 'help desk', 'phone number', 'whatsapp', 'call', 'email you', 'speak to someone'],
    answer:
      'Reach a person on WhatsApp, or tap "Talk to a person" and we reply by email. Signed-in users get a support ticket they can follow under Dashboard, Support.',
    links: [
      { label: 'Contact page', href: '/contact' },
      { label: 'My tickets', href: '/dashboard/support' },
    ],
    suggestions: ['Talk to a person'],
    handoff: true,
  },
];

/** Every in-app page the assistant may link to. Blog posts and careers pages are allowed by prefix. */
export const SITE_PAGES: AssistantLink[] = [
  { label: 'Home', href: '/' },
  { label: 'Jobs', href: '/jobs' },
  { label: 'Request talent', href: '/hire' },
  { label: 'Services', href: '/services' },
  { label: 'For employers', href: '/for-employers' },
  { label: 'For job seekers', href: '/for-professionals' },
  { label: 'FAQ', href: '/faq' },
  { label: 'Blog', href: '/blog' },
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Settings', href: '/dashboard/settings' },
  { label: 'Requests', href: '/dashboard/requests' },
  { label: 'Matches', href: '/dashboard/matches' },
  { label: 'Documents', href: '/dashboard/documents' },
  { label: 'Interviews', href: '/dashboard/interviews' },
  { label: 'Terms', href: '/terms' },
];

export const ALLOWED_HREFS = new Set([...TOPICS.flatMap((t) => t.links.map((l) => l.href)), ...SITE_PAGES.map((p) => p.href)]);
const ALLOWED_PREFIXES = ['/blog/', '/careers/', '/jobs?'];

export function isAllowedHref(href: string) {
  if (!href.startsWith('/') || href.startsWith('//')) return false;
  return ALLOWED_HREFS.has(href) || ALLOWED_PREFIXES.some((prefix) => href.startsWith(prefix));
}

export const GREETING_SUGGESTIONS = ['How do I build a CV?', 'Find jobs in Nigeria', 'What are Hiring Agents?', 'Talk to a person'];

const FALLBACK: Pick<Topic, 'answer' | 'links' | 'suggestions'> = {
  answer:
    "I'm not certain about that one. I can help with CVs, jobs, hiring with Dealo, the ATS, Hiring Agents, the API and your account, or pass you to a person on our team.",
  links: [],
  suggestions: GREETING_SUGGESTIONS,
};

const GREETING = /^(hi|hello|hey|good (morning|afternoon|evening)|yo|sup|howdy)\b/i;
const THANKS = /^(thanks|thank you|ok(ay)?|great|cool|nice)\b/i;

const STOPWORDS = new Set(
  'a an and are as at be by can do does for from how i if in is it me my of on or so that the this to was what when where which who why will with you your we our us'.split(' '),
);

function normalise(text: string) {
  return ` ${text.toLowerCase().replace(/[^\p{L}\p{N}'’\s-]/gu, ' ').replace(/\s+/g, ' ')} `;
}

function tokens(text: string) {
  return normalise(text)
    .trim()
    .split(' ')
    .filter((t) => t.length > 2 && !STOPWORDS.has(t));
}

function scoreTopic(topic: Topic, q: string, qTokens: Set<string>) {
  let score = 0;
  for (const raw of topic.keywords) {
    const weak = raw.startsWith('~');
    const keyword = weak ? raw.slice(1) : raw;
    if (q.includes(` ${keyword} `) || (keyword.includes(' ') && q.includes(keyword))) score += weak ? 0.5 : keyword.includes(' ') ? 3 : 1;
  }
  // Light lexical overlap with the answer text helps questions phrased in unexpected ways.
  const body = new Set(tokens(`${topic.title} ${topic.answer}`));
  for (const token of qTokens) if (body.has(token)) score += 0.2;
  return score;
}

/** Best topics for a question, most relevant first. */
export function retrieve(question: string, k = 5): Topic[] {
  const q = normalise(question);
  const qTokens = new Set(tokens(question));
  return TOPICS.map((topic) => ({ topic, score: scoreTopic(topic, q, qTokens) }))
    .filter((r) => r.score >= 0.6)
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
    .map((r) => r.topic);
}

/** Picks the best topic for a question by keyword hits; used when the AI is off or fails. */
export function matchTopic(question: string): { topic: Topic | null; answer: string; links: AssistantLink[]; suggestions: string[]; handoff: boolean } {
  const trimmed = question.trim();
  if (GREETING.test(trimmed) && trimmed.split(/\s+/).length <= 4) {
    return { topic: null, answer: 'Hi! I am the Dealo AI Assistant. Ask me anything about CVs, jobs, hiring or your account.', links: [], suggestions: GREETING_SUGGESTIONS, handoff: false };
  }
  if (THANKS.test(trimmed) && trimmed.split(/\s+/).length <= 4) {
    return { topic: null, answer: 'Happy to help. Anything else?', links: [], suggestions: GREETING_SUGGESTIONS, handoff: false };
  }
  const best = retrieve(question, 1)[0];
  if (!best) return { topic: null, ...FALLBACK, handoff: false };
  return { topic: best, answer: best.answer, links: best.links, suggestions: best.suggestions, handoff: Boolean(best.handoff) };
}

export type LiveVars = { agentPlans: string; cvPremium: string; latestPosts: string };

/** Puts live prices and posts into `{{name}}` slots so no answer ever shows a stale or placeholder value. */
export function fillTemplate(text: string, vars: LiveVars) {
  return text.replace(/\{\{(\w+)\}\}/g, (slot, key: string) => (key in vars ? vars[key as keyof LiveVars] : slot));
}

export function topicText(topic: Topic, vars: LiveVars) {
  return `## ${topic.title}\n${fillTemplate(topic.answer, vars)}\nLinks: ${topic.links.map((l) => `${l.label} (${l.href})`).join(', ') || 'none'}`;
}

/** One line per topic, so the AI knows everything that exists even when only a few are retrieved in full. */
export function topicIndex() {
  return TOPICS.map((t) => `- ${t.title}: ${t.links[0]?.href ?? 'no page'}`).join('\n');
}
