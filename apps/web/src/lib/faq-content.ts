export type FaqItem = {
  q: string;
  a: string[];
  link?: { label: string; href: string };
};

export type FaqCategory = {
  id: string;
  title: string;
  blurb: string;
  items: FaqItem[];
};

/** Plain-English answers. Keep sentences short; one idea per line. */
export const FAQ_CATEGORIES: FaqCategory[] = [
  {
    id: 'about',
    title: 'About Dealo',
    blurb: 'Who we are and what we do.',
    items: [
      {
        q: 'What is Dealo?',
        a: [
          'Dealo helps businesses hire good people, fast.',
          'We find, check and shortlist workers for you. You interview them and choose.',
          'We also help professionals find good jobs with trusted employers.',
        ],
      },
      {
        q: 'What kinds of jobs do you hire for?',
        a: [
          'Two kinds: office jobs and skilled trades.',
          'Office jobs: admin, finance, accounting, tech, HR and office support.',
          'Skilled trades: bricklayers, electricians, plumbers, welders, carpenters and site supervisors.',
          'If a job is outside this list, we will tell you honestly.',
        ],
      },
      {
        q: 'Where do you work?',
        a: [
          'We are based in Nigeria and work mostly in Lagos and Abuja.',
          'We also help companies abroad hire people in Nigeria and across Africa.',
          'Some office roles can be remote.',
        ],
      },
      {
        q: 'Why should I trust Dealo?',
        a: [
          'Every person is checked before you see them: skills, past work and references.',
          'If a hire leaves early, we replace them free within 90 days.',
          'You see prices before you agree to anything.',
        ],
      },
    ],
  },
  {
    id: 'hiring',
    title: 'Hiring with Dealo',
    blurb: 'For companies that need people.',
    items: [
      {
        q: 'How do I start?',
        a: [
          'Tap “Hire talent” and fill a short form. It takes about 3 minutes.',
          'Tell us the job, where it is, and how many people you need.',
          'A Dealo recruiter will contact you, usually the same day.',
        ],
        link: { label: 'Request a hire', href: '/hire' },
      },
      {
        q: 'How fast will I get people?',
        a: [
          'Most shortlists arrive within 48 hours.',
          'Hard or senior roles can take a little longer. We will tell you the timeline up front.',
        ],
      },
      {
        q: 'What is the difference between “direct hire” and “managed staffing”?',
        a: [
          'Direct hire: we find the person and they join your company payroll.',
          'Managed staffing: we find the people and Dealo manages them for you, including contracts and pay.',
          'Managed staffing works well for site crews and short projects.',
        ],
        link: { label: 'Compare services', href: '/services' },
      },
      {
        q: 'How many candidates will I see?',
        a: [
          'Usually the top 2–3 people for each role.',
          'Each one comes with notes on why we picked them.',
          'We send fewer, better people, not a pile of CVs.',
        ],
      },
      {
        q: 'What happens if the hire does not work out?',
        a: [
          'Tell us. We will find a replacement for free within 90 days.',
          'For managed staffing, a standby worker can cover the gap quickly.',
        ],
      },
      {
        q: 'Can I track my requests?',
        a: [
          'Yes. Create a company account and open your dashboard.',
          'You can see every request, its status and your shortlists in one place.',
        ],
        link: { label: 'Create a company account', href: '/auth/register' },
      },
    ],
  },
  {
    id: 'professionals',
    title: 'For professionals',
    blurb: 'For people looking for work.',
    items: [
      {
        q: 'How do I join Dealo as a professional?',
        a: [
          'Create a free account and choose “Professional”.',
          'Fill your profile and upload your CV.',
          'Our recruiters will contact you when a good job comes up.',
        ],
        link: { label: 'Join as a professional', href: '/auth/register' },
      },
      {
        q: 'Does it cost me anything?',
        a: ['No. Dealo is free for professionals. Employers pay us, not you.', 'Never pay anyone who says they work for Dealo to get you a job.'],
      },
      {
        q: 'Who can see my profile and CV?',
        a: [
          'Only Dealo staff and employers you are shortlisted for.',
          'Your profile is not shown to the public.',
          'You can switch “Open to new work” off any time to hide yourself.',
        ],
      },
      {
        q: 'How do I get noticed faster?',
        a: [
          'Complete your profile to 100%. The dashboard shows what is missing.',
          'Add at least 3 skills and a clear one-line headline.',
          'Upload a recent CV. Trades can add a link to photos of their work.',
        ],
        link: { label: 'Open my profile', href: '/dashboard/profile' },
      },
      {
        q: 'What file types can I upload?',
        a: ['PDF or Word files for your CV. Photos (PNG, JPG, WebP) for certificates.', 'Each file can be up to 8MB.'],
      },
    ],
  },
  {
    id: 'ai',
    title: 'How our AI works',
    blurb: 'AI helps. People decide.',
    items: [
      {
        q: 'Do you use AI?',
        a: [
          'Yes. We use AI “agents” to do slow, repetitive work, like reading CVs and checking dates.',
          'This makes us faster, so you get a shortlist sooner.',
        ],
        link: { label: 'See the agents', href: '/#ai-agents' },
      },
      {
        q: 'What do the AI agents do?',
        a: [
          'Sourcing agent: finds people who match the job.',
          'Screening agent: scores each CV against your must-haves.',
          'Verification agent: checks documents and spots things that do not add up.',
          'Matching agent: ranks the shortlist and explains why.',
          'Placement agent: helps track attendance and cover after someone starts.',
        ],
      },
      {
        q: 'Does AI decide who gets hired?',
        a: [
          'No. AI never hires or rejects anyone on its own.',
          'A Dealo recruiter checks every AI suggestion before you see it.',
          'The final choice is always yours.',
        ],
      },
      {
        q: 'Is AI fair?',
        a: [
          'We tell the AI to look only at skills, experience and the job needs.',
          'It does not use things like tribe, religion, gender or age.',
          'Every score comes with reasons a person can read and disagree with.',
        ],
      },
      {
        q: 'Do you train AI with my data?',
        a: ['No. Your data is never used to train public AI models.', 'We only use it to do the work you asked for.'],
      },
    ],
  },
  {
    id: 'api',
    title: 'API & developers',
    blurb: 'Connect your app to Dealo.',
    items: [
      {
        q: 'What is the Dealo API?',
        a: [
          'It lets your software talk to Dealo directly.',
          'For example, your HR app can send us a hiring request and get updates back.',
        ],
        link: { label: 'Developer portal', href: '/developers' },
      },
      {
        q: 'What is an API key?',
        a: [
          'It is like a password for your app.',
          'Your app sends it with each request so we know who is calling.',
          'Keys that start with dk_test_ are for testing. Keys that start with dk_live_ are for real use.',
        ],
      },
      {
        q: 'How do I get a key?',
        a: [
          'Sign in with a company account and open Dashboard → Developer API.',
          'Test keys are free. You can have up to 2.',
          'Live keys need a paid API plan.',
        ],
        link: { label: 'Get a free test key', href: '/dashboard/developer' },
      },
      {
        q: 'How do I keep my key safe?',
        a: [
          'We show the full key only once. Copy it somewhere safe.',
          'Never put it in a website or app that the public can download.',
          'If a key leaks, revoke it in your dashboard and make a new one.',
        ],
      },
      {
        q: 'What are webhooks?',
        a: [
          'A webhook is a message we send to your server when something changes.',
          'For example, when a hiring request moves to a new status.',
          'Each message is signed so you can prove it came from Dealo.',
        ],
        link: { label: 'Webhook guide', href: '/developers#webhooks' },
      },
      {
        q: 'Are there limits?',
        a: [
          'Yes. Each key has a limit per minute and per month.',
          'If you go over, we return error 429. Wait a bit or upgrade your plan.',
        ],
        link: { label: 'See API plans', href: '/developers#plans' },
      },
    ],
  },
  {
    id: 'software',
    title: 'Dealo software (ATS)',
    blurb: 'Hiring software you can use yourself.',
    items: [
      {
        q: 'What is Dealo ATS?',
        a: [
          'ATS means “applicant tracking system”. It is software to manage hiring.',
          'Post jobs, see every candidate on one board, and let AI do the first screen.',
          'We built it for our own recruiters first. Now businesses can use it too.',
        ],
        link: { label: 'About Dealo ATS', href: '/ats' },
      },
      {
        q: 'Can I manage workers on site with Dealo?',
        a: [
          'Yes. Our placement tools track check-ins at a site, morning roll call and standby cover.',
          'Workers check in from their phone when they arrive at the site.',
          'If someone does not show, a standby worker can be sent quickly.',
        ],
      },
      {
        q: 'How do I get access?',
        a: ['Join the early access list. It is free while we finish it.', 'Paid plans will come later, and we will tell you before anything changes.'],
      },
    ],
  },
  {
    id: 'pricing',
    title: 'Prices & payments',
    blurb: 'What it costs and how to pay.',
    items: [
      {
        q: 'How much does hiring cost?',
        a: [
          'Direct hire: a fee per role, paid when the person is hired.',
          'Managed staffing: a monthly fee per worker.',
          'You get an exact quote after we understand the job. No hidden fees.',
        ],
        link: { label: 'Ask for a quote', href: '/hire' },
      },
      {
        q: 'How do I pay?',
        a: ['We use Paystack for safe online payments in Naira.', 'Large companies can also pay by bank transfer against an invoice.'],
      },
      {
        q: 'Do you store my card details?',
        a: ['No. Paystack handles your card. Dealo never sees or stores your full card number.'],
      },
    ],
  },
  {
    id: 'privacy',
    title: 'Privacy & safety',
    blurb: 'How we protect your data.',
    items: [
      {
        q: 'What data do you keep?',
        a: [
          'Only what we need to do the job: names, contact details, CVs and hiring details.',
          'We do not sell your data. Ever.',
        ],
        link: { label: 'Read the privacy policy', href: '/privacy' },
      },
      {
        q: 'How is my data protected?',
        a: [
          'Passwords are scrambled so even we cannot read them.',
          'API keys are stored in a scrambled form too.',
          'Only staff who need your data can open it, and we keep a log of important actions.',
        ],
      },
      {
        q: 'Can I delete my data?',
        a: ['Yes. Contact us and we will delete your account and files.', 'Some records (like invoices) must be kept for tax law.'],
      },
      {
        q: 'Someone asked me to pay to get a Dealo job. Is that real?',
        a: ['No. Dealo never charges professionals. Please report it to us right away.'],
      },
    ],
  },
  {
    id: 'account',
    title: 'Account & help',
    blurb: 'Signing in and getting support.',
    items: [
      {
        q: 'I forgot my password.',
        a: ['On the sign-in screen, tap “Forgot password”.', 'We will email you a link to set a new one.'],
      },
      {
        q: 'Can I use Dealo on my phone like an app?',
        a: [
          'Yes. Open Dealo in your phone browser and choose “Install app” or “Add to Home screen”.',
          'It opens full screen and loads faster.',
        ],
      },
      {
        q: 'Which languages do you support?',
        a: ['English, French, Chinese and Korean. Change it from the language button in the menu.'],
      },
      {
        q: 'How do I talk to a person?',
        a: [
          'Use the contact form, the help button at the bottom of the screen, or WhatsApp.',
          'We reply on working days, usually within a few hours.',
        ],
        link: { label: 'Contact us', href: '/contact' },
      },
    ],
  },
];

export const FAQ_COUNT = FAQ_CATEGORIES.reduce((total, category) => total + category.items.length, 0);
