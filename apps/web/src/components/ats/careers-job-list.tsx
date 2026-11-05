'use client';

import { motion } from 'framer-motion';
import { ArrowRight, Briefcase, MapPin, Search } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';

import { ARRANGEMENT_LABEL, EMPLOYMENT_LABEL, formatPay, type PublicJob } from '@/lib/ats-api';

export function CareersJobList({ orgSlug, jobs }: { orgSlug: string; jobs: PublicJob[] }) {
  const [query, setQuery] = useState('');
  const [location, setLocation] = useState('ALL');
  const locations = useMemo(() => [...new Set(jobs.map((j) => j.location))].sort(), [jobs]);
  const visible = jobs.filter(
    (job) =>
      (location === 'ALL' || job.location === location) &&
      (!query.trim() || `${job.title} ${job.summary ?? ''}`.toLowerCase().includes(query.trim().toLowerCase())),
  );

  return (
    <div className="space-y-4">
      {jobs.length > 4 ? (
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input className="input-field pl-9" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search jobs" aria-label="Search jobs" />
          </div>
          {locations.length > 1 ? (
            <select className="input-field sm:w-56" value={location} onChange={(e) => setLocation(e.target.value)} aria-label="Location">
              <option value="ALL">All locations</option>
              {locations.map((l) => (
                <option key={l}>{l}</option>
              ))}
            </select>
          ) : null}
        </div>
      ) : null}

      {visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center">
          <Briefcase className="mx-auto h-6 w-6 text-muted" />
          <p className="mt-2 font-display text-lg text-foreground">{jobs.length ? 'No jobs match' : 'No open jobs right now'}</p>
          <p className="mt-1 text-sm text-muted">{jobs.length ? 'Try a different search.' : 'Check back soon.'}</p>
        </div>
      ) : (
        <ul className="grid gap-3">
          {visible.map((job, index) => {
            const pay = formatPay(job);
            return (
              <motion.li key={job.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }}>
                <Link
                  href={`/careers/${orgSlug}/${job.slug}`}
                  className="group flex flex-col gap-3 rounded-2xl border border-border bg-surface-elevated p-4 transition hover:-translate-y-0.5 hover:border-brand/50 hover:shadow-lg sm:flex-row sm:items-center"
                >
                  <div className="min-w-0 flex-1">
                    <h2 className="break-words font-display text-lg text-foreground group-hover:text-brand">{job.title}</h2>
                    <p className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5 text-xs text-muted">
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> {job.location}
                      </span>
                      <span>· {ARRANGEMENT_LABEL[job.workArrangement]}</span>
                      <span>· {EMPLOYMENT_LABEL[job.employmentType] ?? job.employmentType}</span>
                      {pay ? <span>· {pay}</span> : null}
                    </p>
                    {job.summary ? <p className="mt-2 line-clamp-2 text-sm text-muted">{job.summary}</p> : null}
                  </div>
                  <span className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-brand">
                    View and apply <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                  </span>
                </Link>
              </motion.li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
