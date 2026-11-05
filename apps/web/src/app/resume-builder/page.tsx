import { Check, Crown, FileDown, PenLine, Smartphone, Sparkles, X } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

import { PageHero } from '@/components/marketing/page-hero';
import { TemplateGallery } from '@/components/resume/template-gallery';
import { APP_URL, breadcrumbJsonLd, pageMetadata } from '@/lib/seo';

export const metadata: Metadata = pageMetadata({
  path: '/resume-builder',
  title: 'Free CV builder — make a professional CV on your phone',
  description:
    'Build a clean, professional CV in minutes, even on a small phone. Pick a template, fill simple steps and download a PDF that hiring software can read. Free, with premium AI writing help.',
  keywords: ['free CV builder', 'CV maker Nigeria', 'resume builder', 'CV template Nigeria', 'cover letter builder', 'CV for electricians', 'ATS friendly CV'],
});

const FAQ = [
  {
    q: 'Is the CV builder really free?',
    a: 'Yes. You can build a CV with two clean templates and download it as a PDF with a free Dealo account. Premium adds more templates, AI writing help, cover letters and removes the small Dealo footer.',
  },
  {
    q: 'Do I need an account?',
    a: 'You can start straight away without one. Your work is saved on your phone. To download the PDF you create a free account, so you can edit it again later from any device.',
  },
  {
    q: 'Will hiring software read my CV?',
    a: 'Yes. The PDF contains real text, not a picture, so applicant tracking systems and recruiters can search it. The templates use simple layouts that print and scan well.',
  },
  {
    q: 'Should I add a photo, age or state of origin?',
    a: 'We leave them out. Most employers do not need them, and leaving them out keeps the focus on your skills and helps fair hiring.',
  },
  {
    q: 'Can Dealo recruiters see my CV?',
    a: 'Only if you choose to share it. After downloading, job seekers can add the CV to their Dealo profile so our recruiters and partner companies can match them to roles.',
  },
  {
    q: 'How does the AI help?',
    a: 'Premium members can turn rough notes into strong bullet points, get a short profile written, check a CV against a job advert, and draft a cover letter. The AI only uses what you wrote and never sees your contact details.',
  },
];

const PLANS = [
  { feature: 'Build and edit on any phone', free: true, premium: true },
  { feature: 'PDF download', free: true, premium: true },
  { feature: 'Classic and Modern templates', free: true, premium: true },
  { feature: 'Executive, Minimal, Artisan and Compact templates', free: false, premium: true },
  { feature: 'AI bullet points and profile writing', free: false, premium: true },
  { feature: 'Fit your CV to a job advert', free: false, premium: true },
  { feature: 'Cover letters', free: false, premium: true },
  { feature: 'Saved CVs', free: '1', premium: 'Up to 20' },
  { feature: 'Any colour and font', free: false, premium: true },
  { feature: 'No “Made with Dealo” footer', free: false, premium: true },
];

export default function ResumeBuilderLandingPage() {
  const appJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Dealo CV builder',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    url: `${APP_URL}/resume-builder`,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'NGN' },
    description: 'Free CV builder with PDF download, made for job seekers in Nigeria and Africa.',
  };
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  };

  return (
    <div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(appJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd([{ name: 'Home', path: '/' }, { name: 'CV builder', path: '/resume-builder' }])) }}
      />

      <PageHero
        eyebrow="Free CV builder"
        title="Make a CV that gets you hired"
        description="Pick a template, fill in a few simple steps, and download a professional PDF. Works on any phone, even very small ones."
        actions={
          <>
            <Link href="/resume-builder/new" className="btn-primary">
              <PenLine className="h-4 w-4" /> Build my CV free
            </Link>
            <Link href="/resume-builder/cover-letter/new" className="btn-secondary">
              <Crown className="h-4 w-4 text-amber-500" /> Write a cover letter
            </Link>
          </>
        }
      />

      <section className="container-page pb-6">
        <div className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-3">
          {[
            { icon: Smartphone, title: 'Made for phones', body: 'Every step fits a small screen. No laptop needed.' },
            { icon: FileDown, title: 'Real PDF', body: 'Text that recruiters and hiring software can read.' },
            { icon: Sparkles, title: 'AI writing help', body: 'Strong bullet points in one tap (Premium).' },
          ].map((item) => (
            <div key={item.title} className="flex gap-3 rounded-2xl border border-border bg-surface-elevated/80 p-4">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
                <item.icon className="h-5 w-5" />
              </span>
              <span className="min-w-0">
                <span className="block font-semibold text-foreground">{item.title}</span>
                <span className="block text-sm text-muted">{item.body}</span>
              </span>
            </div>
          ))}
        </div>
      </section>

      <section id="templates" className="container-page scroll-mt-24 py-12 min-[340px]:py-16">
        <p className="eyebrow">Templates</p>
        <h2 className="display-title mt-2 text-[1.5rem] text-foreground min-[340px]:text-3xl sm:text-4xl">Clean designs employers trust</h2>
        <p className="mb-8 mt-3 max-w-2xl text-sm text-muted sm:text-base">Tap a template to start with it. You can switch any time and your words stay the same.</p>
        <TemplateGallery />
      </section>

      <section className="container-page py-12 min-[340px]:py-16">
        <p className="eyebrow">How it works</p>
        <h2 className="display-title mt-2 text-[1.5rem] text-foreground min-[340px]:text-3xl sm:text-4xl">Three steps, about ten minutes</h2>
        <ol className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
          {[
            ['Fill in simple steps', 'Your details, jobs, education and skills. Tips show you what to write.'],
            ['Pick a look', 'Choose a template and colour. See the result live as you type.'],
            ['Download your PDF', 'Create a free account and download. Share it with Dealo to get matched to jobs.'],
          ].map(([title, body], i) => (
            <li key={title} className="relative rounded-2xl border border-border bg-surface-elevated p-5">
              <span className="font-display text-4xl text-brand/30">0{i + 1}</span>
              <p className="mt-2 font-semibold text-foreground">{title}</p>
              <p className="mt-1 text-sm text-muted">{body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="container-page py-12 min-[340px]:py-16">
        <p className="eyebrow">Free and Premium</p>
        <h2 className="display-title mt-2 text-[1.5rem] text-foreground min-[340px]:text-3xl sm:text-4xl">Start free. Go premium when you need more.</h2>
        <div className="mt-8 overflow-hidden rounded-2xl border border-border">
          <div className="grid grid-cols-[minmax(0,1fr)_3.5rem_4.5rem] items-center gap-2 bg-surface px-3 py-3 text-xs font-semibold text-muted min-[400px]:grid-cols-[minmax(0,1fr)_5rem_6rem] min-[400px]:px-4">
            <span>Feature</span>
            <span className="text-center">Free</span>
            <span className="inline-flex items-center justify-center gap-1 text-amber-600 dark:text-amber-300">
              <Crown className="h-3.5 w-3.5" /> <span className="hidden min-[340px]:inline">Premium</span>
            </span>
          </div>
          {PLANS.map((row) => (
            <div
              key={row.feature}
              className="grid grid-cols-[minmax(0,1fr)_3.5rem_4.5rem] items-center gap-2 border-t border-border px-3 py-3 text-sm min-[400px]:grid-cols-[minmax(0,1fr)_5rem_6rem] min-[400px]:px-4"
            >
              <span className="min-w-0 text-foreground">{row.feature}</span>
              {[row.free, row.premium].map((value, i) => (
                <span key={i} className="flex justify-center text-xs font-semibold">
                  {value === true ? <Check className="h-4 w-4 text-brand" /> : value === false ? <X className="h-4 w-4 text-muted/60" /> : <span className="text-center text-foreground">{value}</span>}
                </span>
              ))}
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted">Premium payments open soon with Paystack. Until then, ask us and we will switch it on for you.</p>
      </section>

      <section className="container-page py-12 min-[340px]:py-16">
        <p className="eyebrow">Questions</p>
        <h2 className="display-title mt-2 text-[1.5rem] text-foreground min-[340px]:text-3xl sm:text-4xl">Good to know</h2>
        <div className="mt-6 space-y-2">
          {FAQ.map((f) => (
            <details key={f.q} className="group rounded-2xl border border-border bg-surface-elevated px-4 py-3">
              <summary className="cursor-pointer list-none font-semibold text-foreground marker:hidden">
                <span className="flex items-center justify-between gap-3">
                  {f.q}
                  <span className="text-brand transition group-open:rotate-45">+</span>
                </span>
              </summary>
              <p className="mt-2 text-sm leading-relaxed text-muted">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="container-page pb-16">
        <div className="rounded-[1.75rem] bg-brand p-6 text-center text-white sm:p-10 dark:text-[#071f14]">
          <h2 className="font-display text-2xl sm:text-3xl">Your next job starts with a good CV</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm opacity-85">It is free to start and takes about ten minutes.</p>
          <Link href="/resume-builder/new" className="mt-5 inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-brand">
            <PenLine className="h-4 w-4" /> Build my CV free
          </Link>
        </div>
      </section>
    </div>
  );
}
