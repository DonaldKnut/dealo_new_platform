/** Original Dealo articles. Facts are linked to their public sources. */

const COVERS = [
  'https://res.cloudinary.com/dyaetoldv/image/upload/v1793439562/Professionals_standing_together___8db5883f_2K_ghskpu.jpg',
  'https://res.cloudinary.com/dyaetoldv/image/upload/v1793439563/Professionals_standing_in_modern__f14ac16f_2K_qq0tqz.jpg',
  'https://res.cloudinary.com/dyaetoldv/image/upload/v1793439563/Professionals_standing_in_modern__6ae13ee8_2K_joqlbm.jpg',
  'https://res.cloudinary.com/dyaetoldv/image/upload/v1793439563/Diverse_professionals_standing_t__c5e95782_2K_ubufmr.jpg',
];

const src = (href: string, label: string) =>
  `<a href="${href}" target="_blank" rel="noopener noreferrer">${label}</a>`;

export type SeedArticle = {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  tags: string[];
  featured: boolean;
  coverImage: string;
  seoTitle: string;
  seoDescription: string;
  daysAgo: number;
  content: string;
};

export const BLOG_ARTICLES: SeedArticle[] = [
  {
    slug: 'how-to-hire-good-people-in-nigeria-2026',
    title: 'How to hire good people in Nigeria in 2026: a simple guide',
    excerpt: 'Seven clear steps to find, check and keep the right person, without wasting weeks on the wrong CVs.',
    category: 'Hiring guides',
    tags: ['hiring', 'Nigeria', 'shortlists'],
    featured: true,
    coverImage: COVERS[1],
    seoTitle: 'How to hire in Nigeria (2026): a simple 7-step guide | Dealo',
    seoDescription: 'A plain-English guide to hiring good staff in Nigeria: write the brief, check skills, interview well and keep your hire.',
    daysAgo: 2,
    content: `
<p>Hiring the wrong person costs time, money and team morale. The good news: a few simple habits stop most bad hires before they happen.</p>
<h2>1. Write down what “good” looks like</h2>
<p>Before you post a job, write 3 to 5 must-haves. For example: “Can reconcile accounts in Excel” or “Has laid blocks on a multi-storey site”. Everything else is a nice-to-have.</p>
<h2>2. Be clear about pay and hours</h2>
<p>People skip vague adverts. Share a pay range, the location and the working hours. It saves everyone time.</p>
<h2>3. Look for proof, not promises</h2>
<ul>
<li>Office roles: ask for a short task, like a sample report or a spreadsheet exercise.</li>
<li>Trades: ask for photos of past work and do a short practical test on site.</li>
</ul>
<h2>4. Call references</h2>
<p>A five-minute call with a past supervisor tells you more than a long CV. Ask: “Would you hire this person again?”</p>
<h2>5. Interview the top 2 or 3 only</h2>
<p>Long shortlists slow you down. Pick the best few and decide within a week. Good people do not wait long.</p>
<h2>6. Put the offer in writing</h2>
<p>Write the pay, start date, probation and duties. Clear terms prevent arguments later.</p>
<h2>7. Plan the first 30 days</h2>
<p>Most early exits happen in the first month. Give the new hire a buddy, a short plan and a check-in at week two.</p>
<blockquote>Dealo does steps 1 to 5 for you and sends a checked shortlist, usually within 48 hours.</blockquote>`,
  },
  {
    slug: 'hiring-skilled-tradespeople-lagos-checklist',
    title: 'Hiring skilled tradespeople in Lagos: what to check before day one',
    excerpt: 'Bricklayers, electricians, welders: a practical checklist to avoid poor work and safety problems on site.',
    category: 'Skilled trades',
    tags: ['trades', 'construction', 'Lagos'],
    featured: false,
    coverImage: COVERS[3],
    seoTitle: 'Hiring tradespeople in Lagos: a pre-start checklist | Dealo',
    seoDescription: 'What to check before a bricklayer, electrician or welder starts on your Lagos site: skills, safety, tools and terms.',
    daysAgo: 6,
    content: `
<p>A good tradesperson saves you money. A poor one costs you twice: once to do the work and again to fix it. Use this checklist before anyone starts.</p>
<h2>Skills</h2>
<ul>
<li>See real work: photos, a past site you can visit, or a short test.</li>
<li>Ask what tools they own and what they expect you to provide.</li>
<li>For electricians, ask how they test a circuit before handing it over.</li>
</ul>
<h2>Safety</h2>
<ul>
<li>Agree who provides boots, helmets, gloves and eye protection.</li>
<li>Explain site rules on day one, in simple words.</li>
<li>Make sure someone on site knows first aid.</li>
</ul>
<h2>Terms</h2>
<ul>
<li>Agree the pay basis: daily, weekly or per job.</li>
<li>Write down the start date and how long the work will last.</li>
<li>Agree how lateness and absence will be handled.</li>
</ul>
<h2>Attendance</h2>
<p>On busy sites, one missing worker can stop a whole crew. Track who arrives each morning and keep a standby worker you can call quickly.</p>
<blockquote>Dealo checks trade skills before placement and can provide standby cover if someone does not show up.</blockquote>`,
  },
  {
    slug: 'nigeria-minimum-wage-70000-what-it-means-for-employers',
    title: 'What Nigeria’s ₦70,000 minimum wage means for your hiring budget',
    excerpt: 'The national minimum wage is ₦70,000 a month. Here is who it covers and how to plan pay fairly.',
    category: 'Pay & the law',
    tags: ['minimum wage', 'pay', 'law'],
    featured: false,
    coverImage: COVERS[0],
    seoTitle: 'Nigeria minimum wage ₦70,000: what employers need to know | Dealo',
    seoDescription: 'A simple explainer of Nigeria’s National Minimum Wage (Amendment) Act 2024 and how to plan fair pay when hiring.',
    daysAgo: 11,
    content: `
<p>In July 2024, Nigeria raised the national minimum wage from ₦30,000 to <strong>₦70,000 a month</strong>. The law also says the rate should be reviewed every three years instead of five. (${src('https://statehouse.gov.ng/labour-leaders-praise-president-tinubu-over-approval-of-n70000-minimum-wage-and-promise-review-after-three-years/', 'State House, July 2024')})</p>
<h2>Who does it apply to?</h2>
<p>The Act applies across the country, including private employers. Some small or part-time employers may be exempt, so check the law or ask a lawyer for your case. (${src('https://lawnigeria.com/2025/10/06/national-minimum-wage-amendment-act-2024/', 'National Minimum Wage (Amendment) Act, 2024')})</p>
<h2>How to plan pay</h2>
<ul>
<li><strong>Start from the market, not the minimum.</strong> Skilled people rarely accept the minimum. Check what similar roles pay in your city.</li>
<li><strong>Include the full cost.</strong> Add pension, tax deductions you must handle, transport and tools.</li>
<li><strong>Be open about the range.</strong> Clear pay in the advert brings better applicants.</li>
</ul>
<h2>A quick example</h2>
<p>If you budget ₦70,000 for a site labourer in Lagos, you may struggle to fill the role. Many employers pay more to attract reliable people and keep them.</p>
<blockquote>This article is general information, not legal advice. Dealo recruiters can share current pay ranges for your role and city.</blockquote>`,
  },
  {
    slug: 'ndpa-candidate-data-basics-for-nigerian-employers',
    title: 'Candidate data and the law: NDPA basics for Nigerian employers',
    excerpt: 'CVs contain personal data. Here is how to collect, store and delete it the right way under Nigeria’s data law.',
    category: 'Pay & the law',
    tags: ['privacy', 'NDPA', 'compliance'],
    featured: false,
    coverImage: COVERS[2],
    seoTitle: 'NDPA for employers: handling candidate data in Nigeria | Dealo',
    seoDescription: 'Simple steps to handle job applicant data under the Nigeria Data Protection Act 2023: notice, consent, storage and deletion.',
    daysAgo: 15,
    content: `
<p>Every CV you receive is personal data. The Nigeria Data Protection Act 2023 (NDPA) sets rules for how you handle it. The Nigeria Data Protection Commission (NDPC) has also published guidance on how to comply. (${src('https://ndpc.gov.ng/wp-content/uploads/2025/03/NDP-ACT-GAID-2025-MARCH-20TH.pdf', 'NDPC General Application and Implementation Directive, 2025')})</p>
<h2>Five simple rules</h2>
<ol>
<li><strong>Tell people first.</strong> Before they apply, explain what data you collect, why, and how long you keep it.</li>
<li><strong>Only ask for what you need.</strong> Skip questions about religion or marital status unless the law requires them.</li>
<li><strong>Use your own forms.</strong> A form that shows someone else’s privacy policy may not meet the rules. (${src('https://www.mondaq.com/nigeria/data-protection/1375962/data-protection-compliance-requirements-in-the-employment-process-in-nigeria', 'Mondaq: data protection in the employment process')})</li>
<li><strong>Lock it down.</strong> Only people involved in hiring should see CVs.</li>
<li><strong>Delete on time.</strong> Set a period, for example six to twelve months, and remove old applicant data.</li>
</ol>
<h2>What about AI tools?</h2>
<p>If you use software to screen CVs, tell candidates, check the tool for bias, and keep a person in charge of decisions. (${src('https://www.dlapiperafrica.com/en/nigeria/insights/2026/ai_in_employment_practice', 'DLA Piper Africa: AI in employment practice')})</p>
<blockquote>General information only, not legal advice. Dealo keeps candidate files private and lets you request deletion at any time.</blockquote>`,
  },
  {
    slug: 'using-ai-in-hiring-without-losing-the-human-touch',
    title: 'Using AI in hiring without losing the human touch',
    excerpt: 'AI can read 300 CVs in minutes. It should never make the final call. Here is a safe way to use it.',
    category: 'AI in hiring',
    tags: ['AI', 'screening', 'fairness'],
    featured: true,
    coverImage: COVERS[1],
    seoTitle: 'AI in hiring: a safe, human-first approach | Dealo',
    seoDescription: 'How to use AI to screen and match candidates fairly, with people making every final decision.',
    daysAgo: 4,
    content: `
<p>AI is good at slow, repetitive work: reading CVs, spotting missing documents, and matching skills to a job. People are good at judgement. The best hiring uses both.</p>
<h2>Where AI helps</h2>
<ul>
<li><strong>Sorting:</strong> reading every CV and highlighting the ones that meet your must-haves.</li>
<li><strong>Checking:</strong> flagging dates that do not add up or certificates that are missing.</li>
<li><strong>Scheduling:</strong> finding interview times that suit everyone.</li>
</ul>
<h2>Where people must stay in charge</h2>
<ul>
<li>Deciding who to interview and who to hire.</li>
<li>Judging attitude, honesty and team fit.</li>
<li>Saying no kindly and giving feedback.</li>
</ul>
<h2>Three rules we follow</h2>
<ol>
<li><strong>Explain every score.</strong> If AI ranks someone, it must say why in plain words.</li>
<li><strong>Ignore personal traits.</strong> No tribe, religion, gender or age in the model.</li>
<li><strong>A person signs off.</strong> AI suggests. A recruiter decides.</li>
</ol>
<p>Lawyers advise the same: test tools for bias and avoid fully automated decisions. (${src('https://www.dlapiperafrica.com/en/nigeria/insights/2026/ai_in_employment_practice', 'DLA Piper Africa, 2026')})</p>
<blockquote>Dealo’s AI agents source, screen, verify and match. A Dealo recruiter reviews everything before you see it.</blockquote>`,
  },
  {
    slug: 'africa-job-market-2026-numbers-employers-should-know',
    title: 'Africa’s job market in 2026: 5 numbers every employer should know',
    excerpt: 'Fast growth, a young workforce and lots of informal work. What the latest ILO data means for hiring.',
    category: 'Africa trends',
    tags: ['Africa', 'ILO', 'labour market'],
    featured: false,
    coverImage: COVERS[0],
    seoTitle: 'Africa job market 2026: key numbers for employers | Dealo',
    seoDescription: 'Five numbers from ILO 2026 data on Africa’s labour market and what they mean for companies hiring on the continent.',
    daysAgo: 9,
    content: `
<p>The International Labour Organization (ILO) published new numbers on Africa’s job market in 2026. Here are five that matter for employers. (${src('https://www.ilo.org/sites/default/files/2026-10/AFRM-15-%5BRELMEETINGS-260724-003%5D-EN.pdf', 'ILO, Africa Regional Meeting report, 2026')})</p>
<h2>1. Growth of about 4.2%</h2>
<p>Africa is expected to grow around 4.2% in 2026, one of the fastest regions in the world. More growth means more hiring.</p>
<h2>2. Unemployment of 6.2%</h2>
<p>About 39.4 million people in Africa are unemployed. Many more want work but are not counted.</p>
<h2>3. A 15.1% jobs gap</h2>
<p>Around 65.5 million more people want paid work. There is a large pool of talent, but checking quality matters.</p>
<h2>4. 84.3% informal work</h2>
<p>Most workers have informal jobs, without contracts or benefits. Offering clear terms helps you attract the best people.</p>
<h2>5. 22.9% of youth not in work or school</h2>
<p>Young people need skills and first jobs. Training and apprenticeships can build your future team.</p>
<p>Globally, the ILO also warns that job quality has stalled even where employment looks stable. (${src('https://www.ilo.org/publications/flagship-reports/employment-and-social-trends-2026', 'ILO Employment and Social Trends 2026')})</p>
<blockquote>The takeaway: talent is available. The hard part is finding people who are skilled, checked and ready. That is the gap Dealo fills.</blockquote>`,
  },
  {
    slug: 'site-no-shows-standby-cover',
    title: 'No-shows on site: how standby cover keeps projects moving',
    excerpt: 'One missing worker can stop a crew. Here is a simple system to spot absences early and fill the gap fast.',
    category: 'Workforce',
    tags: ['attendance', 'construction', 'standby'],
    featured: false,
    coverImage: COVERS[3],
    seoTitle: 'Handling worker no-shows on site with standby cover | Dealo',
    seoDescription: 'Track morning attendance, catch no-shows early and send standby workers so construction projects stay on schedule.',
    daysAgo: 1,
    content: `
<p>A bricklaying crew waiting for one missing person is money lost every hour. Most sites find out too late. A simple system fixes this.</p>
<h2>1. Check in at the gate</h2>
<p>Workers tap “Check in” on their phone when they arrive. The phone confirms they are really at the site, inside a set distance like 200 metres.</p>
<h2>2. Run a morning muster</h2>
<p>Fifteen minutes after the shift starts, the list closes. Anyone missing is marked as a no-show automatically.</p>
<h2>3. Open a cover request</h2>
<p>Each no-show opens a cover request with a clear deadline, for example 48 hours. Everyone can see the clock.</p>
<h2>4. Send a standby worker</h2>
<p>Keep one or two trained standby workers per site. When a gap opens, a supervisor sends one with a single tap.</p>
<h2>5. Learn from the numbers</h2>
<p>Track attendance rate and average arrival time each week. Patterns show you who needs support and which sites need more standby.</p>
<blockquote>Dealo’s placement agent does steps 2 to 5 for you, and a person on our team reviews every alert.</blockquote>`,
  },
  {
    slug: 'how-to-get-shortlisted-faster-professionals',
    title: 'For professionals: how to get shortlisted faster',
    excerpt: 'Small changes to your profile and CV that help recruiters say yes to you sooner.',
    category: 'Career tips',
    tags: ['CV', 'profile', 'job search'],
    featured: false,
    coverImage: COVERS[2],
    seoTitle: 'How to get shortlisted faster: CV and profile tips | Dealo',
    seoDescription: 'Simple tips for Nigerian professionals and tradespeople to improve their CV and profile and get shortlisted faster.',
    daysAgo: 13,
    content: `
<p>Recruiters look at many profiles every day. These tips help yours stand out for the right reasons.</p>
<h2>Write a clear headline</h2>
<p>One line that says what you do and your experience. Example: “Site electrician, 7 years on estate projects”.</p>
<h2>Show results, not just duties</h2>
<p>Instead of “Handled accounts”, write “Cut month-end closing from 10 days to 5”. Numbers make it real.</p>
<h2>Add proof of your work</h2>
<ul>
<li>Trades: add photos of finished work.</li>
<li>Office roles: add a link to a portfolio or certificates.</li>
</ul>
<h2>Keep your CV short</h2>
<p>Two pages is enough. Put your most recent job first.</p>
<h2>Answer quickly</h2>
<p>When a recruiter calls or messages, reply the same day. Good roles fill fast.</p>
<h2>Stay safe</h2>
<p>Real recruiters never ask you to pay for a job. If anyone does, report it.</p>
<blockquote>On Dealo, a complete profile and an uploaded CV help our recruiters match you faster. Joining is free.</blockquote>`,
  },
];
