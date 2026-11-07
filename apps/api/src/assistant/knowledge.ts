import type { AssistantLink } from '@dealo/shared';

export type Topic = {
  id: string;
  /** Lower-case words or phrases; phrases score higher than single words, and a leading "~" marks a broad word that only breaks ties. */
  keywords: string[];
  answer: string;
  links: AssistantLink[];
  suggestions: string[];
  /** Questions a person must handle (money already taken, broken accounts). */
  handoff?: boolean;
};

/** Everything the help chat knows about Dealo. Keep answers short, plain and true. */
export const TOPICS: Topic[] = [
  {
    id: 'cv-builder',
    keywords: ['~cv', '~resume', '~résumé', 'builder', 'make a cv', 'create cv', 'build cv', 'build a cv', 'template', 'templates'],
    answer:
      'You can build a CV for free in the Dealo CV builder. Fill in your details step by step and watch the A4 preview update as you type. Classic and Modern templates, three fonts and the first colour are free. You need an account to download the PDF.',
    links: [{ label: 'Open the CV builder', href: '/resume-builder/new' }],
    suggestions: ['What do I get with Premium?', 'How do I download my CV?', 'Can I add icons to my CV?'],
  },
  {
    id: 'cv-premium',
    keywords: ['premium', 'upgrade', 'pay for cv', 'cover letter', 'cover letters', 'ai writing', 'write it for me', 'locked'],
    answer:
      'CV Premium unlocks every template (Executive, Minimal, Artisan, Compact), all fonts and colours, corner illustrations, AI writing help, cover letters, up to 20 saved CVs and PDFs without the small Dealo footer. To get it, message us on WhatsApp or tap "Talk to a person" and we will set it up for you.',
    links: [{ label: 'See templates', href: '/resume-builder' }],
    suggestions: ['Talk to a person', 'What is free?', 'How do I download my CV?'],
  },
  {
    id: 'cv-download',
    keywords: ['download', 'pdf', 'export', 'print', 'save my cv', 'saved cv', 'my cvs'],
    answer:
      'Tap Download at the top of the builder. If you are not signed in we keep your CV on this device, ask you to sign in, then download it straight away. If your design uses premium features you can switch to a free design with one tap. Saved CVs are under Dashboard, My CVs.',
    links: [{ label: 'My CVs', href: '/dashboard/resumes' }],
    suggestions: ['What do I get with Premium?', 'Find jobs for my CV'],
  },
  {
    id: 'cv-design',
    keywords: ['font', 'fonts', 'colour', 'color', 'icon', 'icons', 'illustration', 'illustrations', 'design', 'padding', 'section order', 'bold', 'italic', 'bullet'],
    answer:
      'Open the Design step in the builder. You can change the template, colour and font, turn on icons beside headings and contact details (free), add a corner illustration (Premium) and drag sections into a new order. In the Profile and project boxes you can use bold, italic and bullet points from the small toolbar.',
    links: [{ label: 'Open the CV builder', href: '/resume-builder/new' }],
    suggestions: ['What do I get with Premium?', 'How do I download my CV?'],
  },
  {
    id: 'jobs',
    keywords: ['job', 'jobs', 'vacancy', 'vacancies', 'apply', 'application', 'job board', 'remote', 'work', 'hiring now', 'opening'],
    answer:
      'The Dealo job board shows jobs posted on Dealo plus remote jobs from trusted boards, all in one search. Filter by type, place and pay, save jobs, and apply. For Dealo jobs you can apply in one tap with the CV you built here; for outside jobs we give you the PDF and track the application for you.',
    links: [
      { label: 'Browse jobs', href: '/jobs' },
      { label: 'My applications', href: '/dashboard/applications' },
    ],
    suggestions: ['How do I build a CV?', 'Where are my applications?'],
  },
  {
    id: 'applications',
    keywords: ['my applications', 'application status', 'tracker', 'applied', 'heard back', 'shortlisted', 'interview'],
    answer:
      'Everything you applied for is under Dashboard, My applications. Dealo jobs update by themselves when the employer moves you forward. For outside jobs you can update the status yourself so you never lose track.',
    links: [{ label: 'My applications', href: '/dashboard/applications' }],
    suggestions: ['Browse jobs', 'Talk to a person'],
  },
  {
    id: 'hiring-agents',
    keywords: ['agent', 'agents', 'hiring agents', 'automation', 'automate', 'screening', 'screen candidates', 'sourcing', 'interview kit', 'follow up', 'follow-up'],
    answer:
      'Hiring Agents are seven helpers inside the Dealo ATS: screening, job post writer, sourcing, follow-ups, interview scheduling, interview kits and a pipeline digest. They suggest actions and you approve them in one inbox, so nothing goes out without you. Free gives 50 agent runs a month; Pro gives 2,000 runs for ₦25,000 a month, paid with Paystack.',
    links: [
      { label: 'About Hiring Agents', href: '/hiring-agents' },
      { label: 'Open my agents', href: '/dashboard/ats/agents' },
    ],
    suggestions: ['How do I post a job?', 'How do I upgrade to Pro?', 'Talk to a person'],
  },
  {
    id: 'agents-pro',
    keywords: ['upgrade to pro', 'pay for pro', 'pro plan', 'agents pro', 'buy pro', 'more runs', 'run out of runs', 'limit reached', 'agent limit'],
    answer:
      'Open your Agents hub in the ATS and tap Upgrade. Pro costs ₦25,000 for 30 days, you pay securely with Paystack, and your 2,000 monthly runs start as soon as the payment is confirmed. When the Free 50 runs are used up, agents pause until next month or until you upgrade.',
    links: [{ label: 'Open my agents', href: '/dashboard/ats/agents' }],
    suggestions: ['What are Hiring Agents?', 'I paid but Pro is not active'],
  },
  {
    id: 'ats',
    keywords: ['ats', 'post a job', 'post job', 'workspace', 'pipeline', 'candidates', 'recruit', 'recruiting', 'hire someone', 'employer'],
    answer:
      'Employers use the Dealo ATS to post jobs, collect applications and move candidates through stages. Create a workspace from the dashboard (you need a verified email first), add a job, and share the link. Your team can join with an invite.',
    links: [
      { label: 'Open the ATS', href: '/dashboard/ats' },
      { label: 'For employers', href: '/for-employers' },
    ],
    suggestions: ['What are Hiring Agents?', 'Can Dealo hire for me?'],
  },
  {
    id: 'hire-service',
    keywords: ['hire for me', 'recruitment service', 'staffing', 'managed staffing', 'direct recruitment', 'find staff', 'need workers', 'talent'],
    answer:
      'If you would rather we do the hiring, Dealo offers direct recruitment and managed staffing. Tell us the role and we will come back with vetted candidates.',
    links: [
      { label: 'Request talent', href: '/hire' },
      { label: 'Our services', href: '/services' },
    ],
    suggestions: ['Talk to a person', 'What does the ATS do?'],
  },
  {
    id: 'sign-in',
    keywords: ['sign in', 'signin', 'log in', 'login', 'sign up', 'register', 'account', 'google', 'linkedin', 'create account'],
    answer:
      'You can sign up or sign in with your email, Google or LinkedIn. If you used Google or LinkedIn before, use the same button again so you land in the same account.',
    links: [
      { label: 'Sign in', href: '/auth/login' },
      { label: 'Create an account', href: '/auth/register' },
    ],
    suggestions: ['I forgot my password', 'I did not get the verification email'],
  },
  {
    id: 'password',
    keywords: ['password', 'forgot', 'reset', 'cannot log in', "can't log in", 'locked out'],
    answer: 'Use "Forgot password" on the sign-in page. We email you a link that works for a short time. Check spam if it does not arrive within a few minutes.',
    links: [{ label: 'Reset my password', href: '/auth/forgot-password' }],
    suggestions: ['I did not get the verification email', 'Talk to a person'],
  },
  {
    id: 'verify',
    keywords: ['verify', 'verification', 'confirm email', 'verification email', 'not verified', 'didn’t get email', "didn't get email", 'no email'],
    answer:
      'We send a verification link when you sign up. If it is not in your inbox or spam, open your dashboard and tap "Resend email" on the yellow banner. Some features, like creating an ATS workspace or emailing candidates, need a verified email.',
    links: [{ label: 'Go to my dashboard', href: '/dashboard' }],
    suggestions: ['Talk to a person', 'I forgot my password'],
  },
  {
    id: 'billing',
    keywords: ['payment', 'paid', '~pay', 'paystack', 'refund', 'charged', 'billing', 'invoice', 'subscription', 'card', 'debit', 'not active'],
    answer:
      'Payments on Dealo go through Paystack. If you were charged but your plan did not change, or you need a refund or invoice, a person on our team will sort it out quickly. Tap "Talk to a person" and include the email you paid with.',
    links: [],
    suggestions: ['Talk to a person'],
    handoff: true,
  },
  {
    id: 'bug',
    keywords: ['bug', 'error', 'broken', 'not working', 'doesn’t work', "doesn't work", 'crash', 'stuck', 'loading', 'blank page', 'problem'],
    answer:
      'Sorry about that. Try refreshing the page first. If it still happens, tap "Talk to a person" and tell us what you clicked and what you saw; we read every report and reply fast.',
    links: [],
    suggestions: ['Talk to a person'],
    handoff: true,
  },
  {
    id: 'privacy',
    keywords: ['privacy', 'delete my account', 'delete account', 'my data', 'data', 'gdpr', 'ndpr', 'remove my cv'],
    answer:
      'Your CV stays private until you choose to share it with Dealo recruiters. You can delete saved CVs at any time from My CVs. To delete your whole account, ask a person and we will do it for you.',
    links: [{ label: 'Privacy policy', href: '/privacy' }],
    suggestions: ['Talk to a person'],
  },
  {
    id: 'contact',
    keywords: ['contact', 'human', 'person', 'agent please', 'support', 'help desk', 'phone number', 'whatsapp', 'call', 'email you'],
    answer: 'You can reach a person on WhatsApp, or tap "Talk to a person" and we will reply by email. Signed-in users can follow the ticket under Dashboard, Support.',
    links: [{ label: 'Contact page', href: '/contact' }],
    suggestions: ['Talk to a person'],
    handoff: true,
  },
];

export const GREETING_SUGGESTIONS = ['How do I build a CV?', 'Find a job', 'What are Hiring Agents?', 'Talk to a person'];

const FALLBACK: Pick<Topic, 'answer' | 'links' | 'suggestions'> = {
  answer:
    "I'm not sure about that one yet. I can help with CVs, jobs, the ATS, Hiring Agents and your account, or I can pass you to a person on our team.",
  links: [],
  suggestions: GREETING_SUGGESTIONS,
};

const GREETING = /^(hi|hello|hey|good (morning|afternoon|evening)|yo|sup|howdy)\b/i;
const THANKS = /^(thanks|thank you|ok(ay)?|great|cool|nice)\b/i;

/** Picks the best topic for a question by keyword hits; phrases count more than single words. */
export function matchTopic(question: string): { topic: Topic | null; answer: string; links: AssistantLink[]; suggestions: string[]; handoff: boolean } {
  const q = ` ${question.toLowerCase().replace(/[^\p{L}\p{N}'’\s-]/gu, ' ').replace(/\s+/g, ' ')} `;
  if (GREETING.test(question.trim()) && question.trim().split(/\s+/).length <= 4) {
    return { topic: null, answer: 'Hi! I am the Dealo assistant. Ask me anything about CVs, jobs, hiring or your account.', links: [], suggestions: GREETING_SUGGESTIONS, handoff: false };
  }
  if (THANKS.test(question.trim()) && question.trim().split(/\s+/).length <= 4) {
    return { topic: null, answer: 'Happy to help. Anything else?', links: [], suggestions: GREETING_SUGGESTIONS, handoff: false };
  }

  let best: { topic: Topic; score: number } | null = null;
  for (const topic of TOPICS) {
    let score = 0;
    for (const raw of topic.keywords) {
      const weak = raw.startsWith('~');
      const keyword = weak ? raw.slice(1) : raw;
      if (q.includes(` ${keyword} `) || (keyword.includes(' ') && q.includes(keyword))) score += weak ? 0.5 : keyword.includes(' ') ? 3 : 1;
    }
    if (score > 0 && (!best || score > best.score)) best = { topic, score };
  }
  if (!best) return { topic: null, ...FALLBACK, handoff: false };
  const { topic } = best;
  return { topic, answer: topic.answer, links: topic.links, suggestions: topic.suggestions, handoff: Boolean(topic.handoff) };
}

/** The knowledge base as plain text for the AI's instructions. */
export function knowledgeText() {
  return TOPICS.map((t) => `## ${t.id}\n${t.answer}\nLinks: ${t.links.map((l) => `${l.label} (${l.href})`).join(', ') || 'none'}`).join('\n\n');
}

export const ALLOWED_HREFS = new Set(TOPICS.flatMap((t) => t.links.map((l) => l.href)));
