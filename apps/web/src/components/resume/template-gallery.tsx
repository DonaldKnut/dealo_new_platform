'use client';

import { RESUME_TEMPLATES } from '@dealo/shared';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

import { PremiumBadge } from './editor-parts';
import { SAMPLE_RESUME } from './resume-content';
import { ResumePreview } from './resume-preview';

const COLORS: Record<string, string> = {
  classic: '#0f766e',
  modern: '#1e3a8a',
  executive: '#334155',
  minimal: '#7c2d12',
  artisan: '#b45309',
  compact: '#065f46',
};

export function TemplateGallery() {
  return (
    <div className="grid grid-cols-1 gap-5 min-[480px]:grid-cols-2 lg:grid-cols-3">
      {RESUME_TEMPLATES.map((t, i) => (
        <motion.div
          key={t.id}
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ delay: (i % 3) * 0.07 }}
        >
          <Link
            href={`/resume-builder/new?template=${t.id}`}
            className="group block overflow-hidden rounded-2xl border border-border bg-surface-elevated shadow-sm transition hover:-translate-y-1 hover:border-brand/50 hover:shadow-xl"
          >
            <div className="relative max-h-[26rem] overflow-hidden bg-slate-100/80 p-3.5 dark:bg-[#071f14]">
              <div className="pointer-events-none overflow-hidden rounded-lg bg-white shadow-xl ring-1 ring-slate-900/10 transition duration-500 group-hover:scale-[1.02]">
                <ResumePreview
                  doc={{
                    kind: 'RESUME',
                    data: SAMPLE_RESUME,
                    style: {
                      template: t.id,
                      accentColor: COLORS[t.id],
                      font: t.id === 'minimal' ? 'sourceserif' : t.id === 'executive' ? 'librefranklin' : t.id === 'artisan' ? 'lora' : t.id === 'compact' ? 'dmsans' : t.id === 'modern' ? 'inter' : 'helvetica',
                    },
                  }}
                  branding={false}
                />
              </div>
              <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-slate-100 dark:from-[#071f14]" />
            </div>
            <div className="flex items-center justify-between gap-2 p-3">
              <span className="min-w-0">
                <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  {t.name} {t.premium ? <PremiumBadge /> : <span className="text-[10px] font-semibold uppercase text-brand">Free</span>}
                </span>
                <span className="block truncate text-xs text-muted">{t.blurb}</span>
              </span>
              <ArrowRight className="h-4 w-4 shrink-0 text-muted transition group-hover:translate-x-1 group-hover:text-brand" />
            </div>
          </Link>
        </motion.div>
      ))}
    </div>
  );
}
