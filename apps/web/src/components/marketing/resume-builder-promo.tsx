'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  ArrowRight,
  Award,
  BadgeCheck,
  Briefcase,
  CheckCircle2,
  Download,
  FileDown,
  FileText,
  GraduationCap,
  Layers,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { useLocale } from '@/components/i18n/locale-context';

type TemplateKey = 'executive' | 'artisan' | 'modern';

interface TemplateConfig {
  id: TemplateKey;
  label: string;
  badge: string;
  accent: string;
  accentSoft: string;
  accentText: string;
  cardName: string;
  role: string;
  location: string;
  summary: string;
  experience: {
    role: string;
    company: string;
    period: string;
    bullets: string[];
    highlightMetric?: string;
  }[];
  skills: string[];
  certifications: string[];
  education: string;
}

const TEMPLATES: Record<TemplateKey, TemplateConfig> = {
  executive: {
    id: 'executive',
    label: 'Executive',
    badge: 'Corporate & Management',
    accent: '#1e3a8a',
    accentSoft: '#eff6ff',
    accentText: '#1e40af',
    cardName: 'Adaeze Okafor',
    role: 'Lead Systems & Electrical Engineer',
    location: 'Ikeja, Lagos, Nigeria',
    summary:
      'Licensed engineer with 6+ years driving commercial office, hotel and estate power installations. Proven track record leading crews of 15+ and commissioning solar micro-grids that pass inspection the first time.',
    experience: [
      {
        role: 'Lead Site Electrical Engineer',
        company: 'Brightline Infrastructure Ltd',
        period: '2021 — Present',
        highlightMetric: '3 weeks early',
        bullets: [
          'Led crew of 6 on full electrical installation for 12-floor commercial hub; delivered 3 weeks early',
          'Commissioned 40 kVA hybrid solar micro-grids for 18 private estates with 99.8% uptime',
        ],
      },
      {
        role: 'Commercial Systems Specialist',
        company: 'Coastal Facilities Group',
        period: '2018 — 2021',
        highlightMetric: '99.4% uptime',
        bullets: [
          'Maintained power distribution systems for 3 premier hotels with zero unplanned outages',
          'Trained 6 technical apprentices in safe circuit isolation and regulatory compliance',
        ],
      },
    ],
    skills: ['Solar PV & Inverters', 'Power Distribution', 'AutoCAD / MEP', 'HSE Compliance', 'Crew Leadership'],
    certifications: ['COREN Registered Engineer #48291', 'NEBOSH IGC Certified'],
    education: 'HND Electrical Eng. · Yaba College of Technology (Distinction)',
  },
  artisan: {
    id: 'artisan',
    label: 'Artisan Pro',
    badge: 'Skilled Trades & Solar',
    accent: '#b45309',
    accentSoft: '#fef3c7',
    accentText: '#92400e',
    cardName: 'Babatunde Adeleke',
    role: 'Senior Solar & Renewable Energy Specialist',
    location: 'Lekki, Lagos, Nigeria',
    summary:
      'COREN-registered solar and high-voltage specialist with 8 years in commercial renewable installations. Expert in lithium battery storage integration, load balancing, and statutory inspections.',
    experience: [
      {
        role: 'Chief Solar Installations Lead',
        company: 'Apex Clean Energy Ltd',
        period: '2020 — Present',
        highlightMetric: '120 kW deployed',
        bullets: [
          'Directed 120 kW commercial solar array deployment for industrial parks in VI and Ikeja',
          'Cut rework by 40% using standardized daily safety protocols and automated wire mapping',
        ],
      },
      {
        role: 'Senior Electrical Technician',
        company: 'Prime Power & Grid Services',
        period: '2017 — 2020',
        highlightMetric: '42% faster setup',
        bullets: [
          'Fabricated and commissioned switchgear control panels for manufacturing plants across Lagos',
        ],
      },
    ],
    skills: ['Hybrid Inverters', 'High-Voltage Isolation', 'Lithium Storage', 'Load Audits', 'Site Safety (OSHA)'],
    certifications: ['COREN Certified Technician #39102', 'Solar Master Installer Cert'],
    education: 'National Diploma (Electrical & Electronics) · Federal Poly Ilaro',
  },
  modern: {
    id: 'modern',
    label: 'Modern Tech',
    badge: 'Product & Operations',
    accent: '#0f766e',
    accentSoft: '#f0fdfa',
    accentText: '#0f766e',
    cardName: 'Chiamaka Nwosu',
    role: 'Senior Technical Operations Lead',
    location: 'Victoria Island, Lagos',
    summary:
      'High-impact operations leader with 5+ years optimizing field engineering workflows, logistics infrastructure, and hardware rollouts across West Africa with data-driven precision.',
    experience: [
      {
        role: 'Operations & Engineering Manager',
        company: 'Helios Logistics Tech',
        period: '2021 — Present',
        highlightMetric: '+38% efficiency',
        bullets: [
          'Managed nationwide hardware rollout across 14 fulfilment hubs; reduced turnaround time by 38%',
          'Enforced SLA compliance across 120 field technicians, lifting customer satisfaction to 97.4%',
        ],
      },
      {
        role: 'Technical Operations Specialist',
        company: 'Kora Infrastructure Network',
        period: '2019 — 2021',
        highlightMetric: '99.9% SLA',
        bullets: [
          'Streamlined field contractor onboarding and supply chain procurement for telecom sites',
        ],
      },
    ],
    skills: ['Operations Strategy', 'SLA Management', 'Contractor Management', 'Process Automation', 'Agile Operations'],
    certifications: ['PMP® Certified Project Manager', 'Scrum Alliance CSM®'],
    education: 'B.Sc. Systems Engineering · University of Lagos (First Class)',
  },
};

const TEMPLATE_KEYS: TemplateKey[] = ['executive', 'modern', 'artisan'];

export function ResumeBuilderPromo() {
  const { t } = useLocale();
  const reduce = useReducedMotion();
  const [activeKey, setActiveKey] = useState<TemplateKey>('executive');

  const activeTemplate = TEMPLATES[activeKey];

  return (
    <section className="container-page py-12 min-[340px]:py-16 sm:py-20">
      <div className="relative overflow-hidden rounded-[2rem] border border-border bg-gradient-to-br from-brand-soft/70 via-surface-elevated to-amber-100/40 p-4 min-[340px]:p-6 sm:p-10 lg:p-12 dark:from-emerald-950/30 dark:via-surface-elevated dark:to-brand/10">
        {/* Ambient background glows */}
        <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-brand/15 blur-3xl dark:bg-brand/10" />
        <div className="pointer-events-none absolute -bottom-28 -left-16 h-80 w-80 rounded-full bg-amber-400/20 blur-3xl dark:bg-amber-400/10" />

        <div className="relative grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] xl:gap-14">
          {/* Left Column: Copy & Actions */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.5 }}
          >
            <p className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-brand px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-white shadow-sm dark:text-[#071f14]">
              <FileText className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{t('cvpromo.eyebrow')}</span>
            </p>

            <h2 className="display-title mt-4 text-[1.6rem] leading-[1.18] font-bold text-foreground min-[340px]:text-3xl sm:text-4xl lg:text-[2.75rem]">
              {t('cvpromo.title')}
            </h2>

            <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted sm:text-base">
              {t('cvpromo.body')}
            </p>

            {/* Feature Highlights */}
            <ul className="mt-6 space-y-3">
              {[
                { icon: BadgeCheck, text: t('cvpromo.p1') },
                { icon: FileDown, text: t('cvpromo.p2') },
                { icon: Sparkles, text: t('cvpromo.p3') },
              ].map((item, i) => (
                <motion.li
                  key={item.text}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.15 + i * 0.08 }}
                  className="flex items-center gap-3 text-sm font-medium text-foreground"
                >
                  <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-surface-elevated text-brand shadow-sm ring-1 ring-border">
                    <item.icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">{item.text}</span>
                </motion.li>
              ))}
            </ul>

            {/* CTAs */}
            <div className="mt-8 flex flex-col gap-3 min-[400px]:flex-row">
              <Link href="/resume-builder/new" className="btn-primary group shadow-md shadow-brand/20">
                {t('cvpromo.cta')}{' '}
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
              </Link>
              <Link href="/resume-builder#templates" className="btn-secondary">
                {t('cvpromo.cta2')}
              </Link>
            </div>

            {/* Trust Micro-Row */}
            <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 pt-4 border-t border-border/60 text-xs text-muted">
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-success" /> ATS software readable
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-success" /> Instant PDF download
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-success" /> 100% Free to build
              </span>
            </div>
          </motion.div>

          {/* Right Column: Premium Interactive CV Showcase */}
          <div className="relative mx-auto w-full max-w-[24rem] min-[420px]:max-w-[27rem] sm:max-w-[31rem] lg:max-w-[34rem]">
            {/* Interactive Template Selector Bar */}
            <div className="mb-4 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1 rounded-xl bg-surface-elevated/90 p-1 shadow-sm ring-1 ring-border/80 backdrop-blur-sm">
                {TEMPLATE_KEYS.map((key) => {
                  const tpl = TEMPLATES[key];
                  const isActive = activeKey === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setActiveKey(key)}
                      className={`relative flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                        isActive
                          ? 'bg-foreground text-background shadow-sm'
                          : 'text-muted hover:text-foreground hover:bg-surface'
                      }`}
                    >
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: tpl.accent }}
                      />
                      <span>{tpl.label}</span>
                    </button>
                  );
                })}
              </div>

              <span className="hidden min-[380px]:inline-flex items-center gap-1 text-[11px] font-medium text-muted">
                <Layers className="h-3.5 w-3.5 text-brand" /> Interactive Preview
              </span>
            </div>

            {/* Document Stage: Layered Stack with Realistic Physical Shadows */}
            <div className="relative aspect-[210/288] w-full">
              {/* Back Layer Sheet 2 (Subtle Peeking Stack) */}
              <div
                className="pointer-events-none absolute inset-x-2 -bottom-3 top-5 rounded-2xl bg-white shadow-md ring-1 ring-black/5 dark:bg-slate-900/90 dark:ring-white/10"
                style={{
                  transform: 'rotate(-3deg) translateY(6px)',
                  opacity: 0.45,
                }}
              />

              {/* Back Layer Sheet 1 (Middle Sheet) */}
              <div
                className="pointer-events-none absolute inset-x-1 -bottom-1.5 top-2.5 rounded-2xl bg-white shadow-lg ring-1 ring-black/5 dark:bg-slate-900/95 dark:ring-white/10"
                style={{
                  transform: 'rotate(2.5deg) translateY(3px)',
                  opacity: 0.65,
                }}
              />

              {/* Main Active Premium CV Document */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeKey}
                  initial={{ opacity: 0, scale: 0.98, y: 8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98, y: -8 }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                  className="relative h-full w-full overflow-hidden rounded-2xl bg-white text-slate-900 shadow-[0_20px_50px_-12px_rgba(15,23,42,0.25)] ring-1 ring-slate-900/10 selection:bg-brand-soft"
                >
                  {/* Subtle Paper Texture & Top Accent Strip */}
                  <div
                    className="h-2.5 w-full transition-colors duration-300"
                    style={{ backgroundColor: activeTemplate.accent }}
                  />

                  {/* Document Interior */}
                  <div className="flex h-[calc(100%-0.625rem)] flex-col justify-between p-4 min-[380px]:p-6 sm:p-7 text-left">
                    {/* CV Header: Candidate Profile & Metadata */}
                    <div className="border-b border-slate-100 pb-3 sm:pb-3.5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="truncate font-bold tracking-tight text-slate-950 text-sm min-[380px]:text-base sm:text-lg">
                              {activeTemplate.cardName}
                            </h3>
                            <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
                              <CheckCircle2 className="h-2.5 w-2.5" /> Verified
                            </span>
                          </div>

                          <p
                            className="mt-0.5 truncate text-[11px] font-semibold sm:text-xs"
                            style={{ color: activeTemplate.accent }}
                          >
                            {activeTemplate.role}
                          </p>

                          {/* Contact Details Line */}
                          <div className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[9px] text-slate-500 min-[380px]:text-[10px] sm:text-[11px]">
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="h-2.5 w-2.5 text-slate-400" />
                              {activeTemplate.location}
                            </span>
                            <span className="text-slate-300">•</span>
                            <span className="inline-flex items-center gap-1">
                              <Mail className="h-2.5 w-2.5 text-slate-400" />
                              {activeTemplate.cardName.toLowerCase().replace(' ', '.')}@email.com
                            </span>
                            <span className="text-slate-300">•</span>
                            <span className="inline-flex items-center gap-1">
                              <Phone className="h-2.5 w-2.5 text-slate-400" />
                              0803 123 4567
                            </span>
                          </div>
                        </div>

                        {/* Candidate Initials Monogram Badge */}
                        <div
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xs font-bold text-white shadow-sm ring-2 ring-white sm:h-12 sm:w-12 sm:text-sm"
                          style={{
                            backgroundColor: activeTemplate.accent,
                            backgroundImage: `linear-gradient(135deg, ${activeTemplate.accent}, #0f172a)`,
                          }}
                        >
                          {activeTemplate.cardName
                            .split(' ')
                            .map((n) => n[0])
                            .join('')}
                        </div>
                      </div>

                      {/* Professional Summary */}
                      <div className="mt-2.5 rounded-lg bg-slate-50/80 p-2 sm:p-2.5 text-[9.5px] leading-relaxed text-slate-600 sm:text-[11px]">
                        {activeTemplate.summary}
                      </div>
                    </div>

                    {/* Section: Work Experience */}
                    <div className="my-2.5 flex-1 space-y-2 sm:my-3">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-1">
                        <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-800 sm:text-[11px]">
                          <Briefcase className="h-3 w-3" style={{ color: activeTemplate.accent }} />
                          Work Experience
                        </span>
                        <span className="text-[9px] font-medium text-slate-400 sm:text-[10px]">
                          Relevant History
                        </span>
                      </div>

                      <div className="space-y-2 sm:space-y-2.5">
                        {activeTemplate.experience.map((job, idx) => (
                          <div key={job.company} className="text-left">
                            <div className="flex items-baseline justify-between gap-2">
                              <span className="text-[10px] font-bold text-slate-900 sm:text-xs">
                                {job.role}
                              </span>
                              <span className="shrink-0 text-[8.5px] font-medium text-slate-400 sm:text-[9.5px]">
                                {job.period}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5 text-[9px] font-medium text-slate-500 sm:text-[10px]">
                              <span>{job.company}</span>
                              {job.highlightMetric && (
                                <span
                                  className="rounded px-1 py-0.2 text-[8px] font-semibold sm:text-[9px]"
                                  style={{
                                    backgroundColor: activeTemplate.accentSoft,
                                    color: activeTemplate.accentText,
                                  }}
                                >
                                  ★ {job.highlightMetric}
                                </span>
                              )}
                            </div>

                            <ul className="mt-1 space-y-0.5 text-[8.5px] leading-snug text-slate-600 sm:text-[10px]">
                              {job.bullets.slice(0, idx === 0 ? 2 : 1).map((bullet, bIdx) => (
                                <li key={bIdx} className="flex items-start gap-1.5">
                                  <span
                                    className="mt-1 h-1 w-1 shrink-0 rounded-full"
                                    style={{ backgroundColor: activeTemplate.accent }}
                                  />
                                  <span>{bullet}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Section: Skills & Certifications Grid */}
                    <div className="border-t border-slate-100 pt-2 sm:pt-2.5">
                      <div className="grid grid-cols-1 gap-2 min-[400px]:grid-cols-2">
                        {/* Skills Column */}
                        <div>
                          <p className="text-[9px] font-bold uppercase tracking-wider text-slate-700 sm:text-[10px]">
                            Core Competencies
                          </p>
                          <div className="mt-1.5 flex flex-wrap gap-1 sm:gap-1.5">
                            {activeTemplate.skills.slice(0, 4).map((skill) => (
                              <span
                                key={skill}
                                className="rounded-md px-1.5 py-0.5 text-[8px] font-medium sm:text-[9px]"
                                style={{
                                  backgroundColor: activeTemplate.accentSoft,
                                  color: activeTemplate.accentText,
                                }}
                              >
                                {skill}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Certifications & Education Column */}
                        <div>
                          <p className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-slate-700 sm:text-[10px]">
                            <Award className="h-2.5 w-2.5 text-amber-600" /> Credentials & Education
                          </p>
                          <div className="mt-1 space-y-0.5 text-[8px] sm:text-[9px] text-slate-600">
                            <p className="truncate font-semibold text-slate-800">
                              {activeTemplate.certifications[0]}
                            </p>
                            <p className="truncate text-slate-500">
                              {activeTemplate.education}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Document Micro Footer */}
                    <div className="mt-2 flex items-center justify-between border-t border-slate-100/80 pt-1.5 text-[7.5px] font-medium text-slate-400 sm:text-[8.5px]">
                      <span>Page 1 of 1 · ATS Formatted</span>
                      <span className="flex items-center gap-1">
                        <ShieldCheck className="h-2.5 w-2.5 text-emerald-600" /> Dealo Standard Resume
                      </span>
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>

              {/* Floating Badge 1: ATS Pass Score */}
              <motion.div
                className="absolute -left-3 top-10 z-20 flex items-center gap-1.5 rounded-full bg-surface-elevated/95 px-3 py-1.5 text-[11px] font-bold text-foreground shadow-xl ring-1 ring-border backdrop-blur-md"
                animate={reduce ? undefined : { y: [0, -5, 0] }}
                transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
              >
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-white">
                  <CheckCircle2 className="h-3 w-3" />
                </span>
                <span>ATS Score: 98%</span>
              </motion.div>

              {/* Floating Badge 2: Instant PDF */}
              <motion.div
                className="absolute -right-3 bottom-14 z-20 flex items-center gap-1.5 rounded-full bg-gradient-to-r from-brand to-emerald-600 px-3 py-1.5 text-[11px] font-bold text-white shadow-xl backdrop-blur-md"
                animate={reduce ? undefined : { y: [0, 5, 0] }}
                transition={{ duration: 3.8, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
              >
                <Download className="h-3.5 w-3.5" />
                <span>Instant PDF</span>
              </motion.div>

              {/* Floating Badge 3: AI Assistant */}
              <motion.div
                className="absolute -left-2 -bottom-2 z-20 hidden min-[360px]:flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-300 via-amber-400 to-amber-500 px-3 py-1 text-[10px] font-bold text-amber-950 shadow-lg"
                animate={reduce ? undefined : { y: [0, -4, 0] }}
                transition={{ duration: 4.2, repeat: Infinity, ease: 'easeInOut', delay: 0.6 }}
              >
                <Sparkles className="h-3 w-3" />
                <span>AI Bullet Polish</span>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
