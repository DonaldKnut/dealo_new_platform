'use client';

import type { ResumeData } from '@dealo/shared';
import { Loader2, Sparkles } from 'lucide-react';
import { useState } from 'react';

import { AddButton, AreaField, BulletsEditor, ChipsInput, ItemCard, PremiumBadge, TextField, moveItem } from './editor-parts';
import { newId } from './resume-content';

export type Update = (fn: (d: ResumeData) => ResumeData) => void;

export type AiHooks = {
  premium: boolean;
  onLocked: () => void;
  summary: () => Promise<string | null>;
  bullets: (role: string, company: string, text: string) => Promise<string[] | null>;
};

const SKILL_SUGGESTIONS = [
  'Microsoft Excel',
  'Customer service',
  'Report writing',
  'Team leadership',
  'Health and safety',
  'Bookkeeping',
  'QuickBooks',
  'Sales',
  'Social media',
  'Electrical installation',
  'Solar PV installation',
  'Inverter maintenance',
  'Welding (MIG/TIG)',
  'Plumbing',
  'AutoCAD',
  'First aid',
  'Driving (valid licence)',
  'Problem solving',
  'Time management',
];

function AiButton({ label, ai, run }: { label: string; ai: AiHooks; run: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        if (!ai.premium) {
          ai.onLocked();
          return;
        }
        setBusy(true);
        await run();
        setBusy(false);
      }}
      className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-brand/15 to-amber-400/20 px-2.5 py-1 text-[11px] font-semibold text-brand transition hover:from-brand/25 disabled:opacity-60"
    >
      {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />} {label}
      {!ai.premium ? <PremiumBadge className="ml-0.5" /> : null}
    </button>
  );
}

export function DetailsEditor({ data, update }: { data: ResumeData; update: Update }) {
  const p = data.personal;
  const set = (key: keyof ResumeData['personal']) => (v: string) => update((d) => ({ ...d, personal: { ...d.personal, [key]: v } }));
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <TextField label="Full name" value={p.fullName} onChange={set('fullName')} placeholder="Adaeze Okafor" maxLength={120} />
      </div>
      <div className="sm:col-span-2">
        <TextField label="Headline" value={p.headline} onChange={set('headline')} placeholder="Certified electrician · 6 years in commercial sites" hint="One line under your name. Say what you do." />
      </div>
      <TextField label="Email" type="email" value={p.email} onChange={set('email')} placeholder="you@email.com" maxLength={200} />
      <TextField label="Phone" type="tel" value={p.phone} onChange={set('phone')} placeholder="0803 000 0000" maxLength={40} />
      <TextField label="Where you live" value={p.location} onChange={set('location')} placeholder="Ikeja, Lagos" />
      <TextField label="LinkedIn" value={p.linkedin} onChange={set('linkedin')} placeholder="linkedin.com/in/you" maxLength={300} />
      <div className="sm:col-span-2">
        <TextField label="Website or portfolio" value={p.website} onChange={set('website')} placeholder="yourwork.com" maxLength={300} />
      </div>
    </div>
  );
}

export function SummaryEditor({ data, update, ai }: { data: ResumeData; update: Update; ai: AiHooks }) {
  return (
    <AreaField
      rich
      label="Short profile"
      value={data.summary}
      onChange={(v) => update((d) => ({ ...d, summary: v }))}
      rows={6}
      placeholder="Two or three sentences: what you do, how long you have done it, and what you are best at."
      action={
        <AiButton
          label="Write it for me"
          ai={ai}
          run={async () => {
            const text = await ai.summary();
            if (text) update((d) => ({ ...d, summary: text }));
          }}
        />
      }
    />
  );
}

export function ExperienceEditor({ data, update, ai }: { data: ResumeData; update: Update; ai: AiHooks }) {
  const jobs = data.experience;
  const setJob = (id: string, patch: Partial<ResumeData['experience'][number]>) =>
    update((d) => ({ ...d, experience: d.experience.map((j) => (j.id === id ? { ...j, ...patch } : j)) }));
  return (
    <div className="space-y-2.5">
      {jobs.map((job, index) => (
        <ItemCard
          key={job.id}
          title={job.role || 'New job'}
          subtitle={[job.company, job.start && `${job.start} – ${job.current ? 'Present' : job.end}`].filter(Boolean).join(' · ')}
          index={index}
          count={jobs.length}
          defaultOpen={!job.role}
          onMove={(dir) => update((d) => ({ ...d, experience: moveItem(d.experience, index, dir) }))}
          onRemove={() => update((d) => ({ ...d, experience: d.experience.filter((j) => j.id !== job.id) }))}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField label="Job title" value={job.role} onChange={(v) => setJob(job.id, { role: v })} placeholder="Site electrician" />
            <TextField label="Company" value={job.company} onChange={(v) => setJob(job.id, { company: v })} placeholder="Julius Berger" />
            <TextField label="Location" value={job.location} onChange={(v) => setJob(job.id, { location: v })} placeholder="Abuja" />
            <div className="grid grid-cols-2 gap-2">
              <TextField label="Start" value={job.start} onChange={(v) => setJob(job.id, { start: v })} placeholder="Mar 2021" maxLength={30} />
              {job.current ? (
                <div className="flex items-end pb-3 text-sm text-muted">Present</div>
              ) : (
                <TextField label="End" value={job.end} onChange={(v) => setJob(job.id, { end: v })} placeholder="Jun 2024" maxLength={30} />
              )}
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={job.current} onChange={(e) => setJob(job.id, { current: e.target.checked })} className="accent-[var(--brand)]" />
            I work here now
          </label>
          <BulletsEditor bullets={job.bullets} onChange={(bullets) => setJob(job.id, { bullets })} />
          <AiButton
            label="Make my points stronger"
            ai={ai}
            run={async () => {
              const text = job.bullets.filter(Boolean).join('\n');
              if (text.length < 3) return;
              const bullets = await ai.bullets(job.role, job.company, text);
              if (bullets?.length) setJob(job.id, { bullets });
            }}
          />
        </ItemCard>
      ))}
      <AddButton
        label="Add a job"
        disabled={jobs.length >= 20}
        onClick={() =>
          update((d) => ({
            ...d,
            experience: [...d.experience, { id: newId(), role: '', company: '', location: '', start: '', end: '', current: false, bullets: [''] }],
          }))
        }
      />
    </div>
  );
}

export function EducationEditor({ data, update }: { data: ResumeData; update: Update }) {
  const list = data.education;
  const set = (id: string, patch: Partial<ResumeData['education'][number]>) =>
    update((d) => ({ ...d, education: d.education.map((e) => (e.id === id ? { ...e, ...patch } : e)) }));
  return (
    <div className="space-y-2.5">
      {list.map((ed, index) => (
        <ItemCard
          key={ed.id}
          title={ed.qualification || ed.school || 'New school'}
          subtitle={ed.school}
          index={index}
          count={list.length}
          defaultOpen={!ed.school}
          onMove={(dir) => update((d) => ({ ...d, education: moveItem(d.education, index, dir) }))}
          onRemove={() => update((d) => ({ ...d, education: d.education.filter((e) => e.id !== ed.id) }))}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <TextField label="School, college or training centre" value={ed.school} onChange={(v) => set(ed.id, { school: v })} placeholder="Yaba College of Technology" maxLength={160} />
            </div>
            <TextField label="Qualification" value={ed.qualification} onChange={(v) => set(ed.id, { qualification: v })} placeholder="HND, B.Sc, NABTEB, SSCE…" />
            <TextField label="Course" value={ed.field} onChange={(v) => set(ed.id, { field: v })} placeholder="Electrical engineering" />
            <div className="grid grid-cols-2 gap-2">
              <TextField label="Start" value={ed.start} onChange={(v) => set(ed.id, { start: v })} placeholder="2015" maxLength={30} />
              <TextField label="End" value={ed.end} onChange={(v) => set(ed.id, { end: v })} placeholder="2019" maxLength={30} />
            </div>
            <TextField label="Grade" value={ed.grade} onChange={(v) => set(ed.id, { grade: v })} placeholder="Upper credit" maxLength={80} />
          </div>
        </ItemCard>
      ))}
      <AddButton
        label="Add education"
        disabled={list.length >= 10}
        onClick={() => update((d) => ({ ...d, education: [...d.education, { id: newId(), school: '', qualification: '', field: '', start: '', end: '', grade: '' }] }))}
      />
    </div>
  );
}

export function SkillsEditor({ data, update }: { data: ResumeData; update: Update }) {
  return (
    <ChipsInput
      values={data.skills}
      onChange={(skills) => update((d) => ({ ...d, skills }))}
      suggestions={SKILL_SUGGESTIONS}
      placeholder="Type a skill and press Enter"
    />
  );
}

export function MoreEditor({ data, update }: { data: ResumeData; update: Update }) {
  const setCert = (id: string, patch: Partial<ResumeData['certifications'][number]>) =>
    update((d) => ({ ...d, certifications: d.certifications.map((c) => (c.id === id ? { ...c, ...patch } : c)) }));
  const setLang = (id: string, patch: Partial<ResumeData['languages'][number]>) =>
    update((d) => ({ ...d, languages: d.languages.map((l) => (l.id === id ? { ...l, ...patch } : l)) }));
  const setProject = (id: string, patch: Partial<ResumeData['projects'][number]>) =>
    update((d) => ({ ...d, projects: d.projects.map((p) => (p.id === id ? { ...p, ...patch } : p)) }));
  const setRef = (id: string, patch: Partial<ResumeData['references']['items'][number]>) =>
    update((d) => ({ ...d, references: { ...d.references, items: d.references.items.map((r) => (r.id === id ? { ...r, ...patch } : r)) } }));

  return (
    <div className="space-y-6">
      <section className="space-y-2.5">
        <h3 className="text-sm font-semibold text-foreground">Licences and certificates</h3>
        <p className="text-xs text-muted">COREN, NEBOSH, trade test, driving licence, ICAN… Employers look for these first.</p>
        {data.certifications.map((c, index) => (
          <ItemCard
            key={c.id}
            title={c.name || 'New licence'}
            subtitle={c.issuer}
            index={index}
            count={data.certifications.length}
            defaultOpen={!c.name}
            onMove={(dir) => update((d) => ({ ...d, certifications: moveItem(d.certifications, index, dir) }))}
            onRemove={() => update((d) => ({ ...d, certifications: d.certifications.filter((x) => x.id !== c.id) }))}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <TextField label="Name" value={c.name} onChange={(v) => setCert(c.id, { name: v })} placeholder="COREN registered engineer" maxLength={160} />
              </div>
              <TextField label="Given by" value={c.issuer} onChange={(v) => setCert(c.id, { issuer: v })} placeholder="COREN" />
              <div className="grid grid-cols-2 gap-2">
                <TextField label="Year" value={c.year} onChange={(v) => setCert(c.id, { year: v })} placeholder="2022" maxLength={20} />
                <TextField label="Number" value={c.number} onChange={(v) => setCert(c.id, { number: v })} placeholder="Optional" maxLength={80} />
              </div>
            </div>
          </ItemCard>
        ))}
        <AddButton
          label="Add a licence or certificate"
          disabled={data.certifications.length >= 20}
          onClick={() => update((d) => ({ ...d, certifications: [...d.certifications, { id: newId(), name: '', issuer: '', year: '', number: '' }] }))}
        />
      </section>

      <section className="space-y-2.5">
        <h3 className="text-sm font-semibold text-foreground">Languages</h3>
        {data.languages.map((l) => (
          <div key={l.id} className="grid grid-cols-1 gap-2 min-[300px]:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] min-[300px]:items-end">
            <TextField label="Language" value={l.name} onChange={(v) => setLang(l.id, { name: v })} placeholder="Yoruba" maxLength={60} />
            <label className="block min-w-0 space-y-1.5 text-sm">
              <span className="font-medium text-foreground">Level</span>
              <select className="input-field" value={l.level} onChange={(e) => setLang(l.id, { level: e.target.value })}>
                <option value="">Choose</option>
                {['Native', 'Fluent', 'Good', 'Basic'].map((lv) => (
                  <option key={lv}>{lv}</option>
                ))}
              </select>
            </label>
            <button type="button" onClick={() => update((d) => ({ ...d, languages: d.languages.filter((x) => x.id !== l.id) }))} className="pb-3 text-xs font-semibold text-danger">
              Remove
            </button>
          </div>
        ))}
        <AddButton
          label="Add a language"
          disabled={data.languages.length >= 10}
          onClick={() => update((d) => ({ ...d, languages: [...d.languages, { id: newId(), name: '', level: '' }] }))}
        />
      </section>

      <section className="space-y-2.5">
        <h3 className="text-sm font-semibold text-foreground">Projects</h3>
        {data.projects.map((p, index) => (
          <ItemCard
            key={p.id}
            title={p.name || 'New project'}
            index={index}
            count={data.projects.length}
            defaultOpen={!p.name}
            onMove={(dir) => update((d) => ({ ...d, projects: moveItem(d.projects, index, dir) }))}
            onRemove={() => update((d) => ({ ...d, projects: d.projects.filter((x) => x.id !== p.id) }))}
          >
            <TextField label="Name" value={p.name} onChange={(v) => setProject(p.id, { name: v })} placeholder="20kVA solar install, Lekki estate" />
            <TextField label="Link" value={p.link} onChange={(v) => setProject(p.id, { link: v })} placeholder="Optional" maxLength={300} />
            <AreaField rich label="What you did" value={p.description} onChange={(v) => setProject(p.id, { description: v })} maxLength={600} rows={3} />
          </ItemCard>
        ))}
        <AddButton
          label="Add a project"
          disabled={data.projects.length >= 10}
          onClick={() => update((d) => ({ ...d, projects: [...d.projects, { id: newId(), name: '', link: '', description: '' }] }))}
        />
      </section>

      <section className="space-y-2.5">
        <h3 className="text-sm font-semibold text-foreground">References</h3>
        <div className="grid grid-cols-1 gap-1.5 min-[340px]:grid-cols-3">
          {(
            [
              ['on_request', 'On request'],
              ['list', 'List them'],
              ['hidden', 'Hide'],
            ] as const
          ).map(([mode, label]) => (
            <button
              key={mode}
              type="button"
              onClick={() => update((d) => ({ ...d, references: { ...d.references, mode } }))}
              className={`rounded-xl border px-2 py-2 text-xs font-semibold ${data.references.mode === mode ? 'border-brand bg-brand-soft text-brand' : 'border-border text-muted'}`}
            >
              {label}
            </button>
          ))}
        </div>
        {data.references.mode === 'list' ? (
          <>
            {data.references.items.map((r, index) => (
              <ItemCard
                key={r.id}
                title={r.name || 'New reference'}
                subtitle={r.company}
                index={index}
                count={data.references.items.length}
                defaultOpen={!r.name}
                onMove={(dir) => update((d) => ({ ...d, references: { ...d.references, items: moveItem(d.references.items, index, dir) } }))}
                onRemove={() => update((d) => ({ ...d, references: { ...d.references, items: d.references.items.filter((x) => x.id !== r.id) } }))}
              >
                <TextField label="Name" value={r.name} onChange={(v) => setRef(r.id, { name: v })} />
                <TextField label="Job title" value={r.role} onChange={(v) => setRef(r.id, { role: v })} />
                <TextField label="Company" value={r.company} onChange={(v) => setRef(r.id, { company: v })} />
                <TextField label="Phone or email" value={r.contact} onChange={(v) => setRef(r.id, { contact: v })} maxLength={160} />
              </ItemCard>
            ))}
            <AddButton
              label="Add a reference"
              disabled={data.references.items.length >= 4}
              onClick={() =>
                update((d) => ({ ...d, references: { ...d.references, items: [...d.references.items, { id: newId(), name: '', role: '', company: '', contact: '' }] } }))
              }
            />
          </>
        ) : null}
      </section>
    </div>
  );
}
