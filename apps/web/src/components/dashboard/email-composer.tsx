'use client';

import { renderEmailHtml } from '@dealo/shared';
import { motion } from 'framer-motion';
import { Eye, Monitor, PenLine, Smartphone } from 'lucide-react';
import { useMemo, useState } from 'react';

import { RichHtmlEditor } from '@/components/ui/rich-html-editor';
import { uploadContentImage } from '@/lib/dashboard-api';
import { cn } from '@/lib/utils';

/**
 * Write an email with headings, pictures and buttons, then preview it exactly as it will be
 * delivered (the same layout the API wraps every email in), on a phone or a desktop.
 */
export function EmailComposer({
  id,
  value,
  onChange,
  subject,
  placeholder = 'Hello, write your message here…',
}: {
  id: string;
  value: string;
  onChange: (html: string) => void;
  subject: string;
  placeholder?: string;
}) {
  const [tab, setTab] = useState<'write' | 'preview'>('write');
  const [device, setDevice] = useState<'desktop' | 'phone'>('desktop');
  const preview = useMemo(
    () => (tab === 'preview' ? renderEmailHtml(value || '<p></p>', { siteUrl: typeof window === 'undefined' ? undefined : window.location.origin }) : ''),
    [tab, value],
  );

  return (
    <div className="overflow-hidden rounded-2xl border border-border focus-within:border-brand/60">
      <div className="flex items-center justify-between gap-2 border-b border-border bg-surface/60 p-1">
        <div className="flex items-center gap-1">
          {(
            [
              { id: 'write', label: 'Write', icon: PenLine },
              { id: 'preview', label: 'Preview', icon: Eye },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                'relative inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition',
                tab === t.id ? 'text-white dark:text-[#071f14]' : 'text-muted hover:text-foreground',
              )}
            >
              {tab === t.id ? <motion.span layoutId={`email-tab-${id}`} className="absolute inset-0 rounded-lg bg-brand" /> : null}
              <t.icon className="relative z-10 h-3.5 w-3.5" />
              <span className="relative z-10">{t.label}</span>
            </button>
          ))}
        </div>
        {tab === 'preview' ? (
          <div className="flex items-center gap-0.5 rounded-lg bg-background p-0.5">
            {(
              [
                { id: 'desktop', label: 'Desktop', icon: Monitor },
                { id: 'phone', label: 'Phone', icon: Smartphone },
              ] as const
            ).map((d) => (
              <button
                key={d.id}
                type="button"
                aria-label={`${d.label} preview`}
                aria-pressed={device === d.id}
                onClick={() => setDevice(d.id)}
                className={cn('inline-flex h-7 w-7 items-center justify-center rounded-md transition', device === d.id ? 'bg-brand-soft text-brand' : 'text-muted hover:text-foreground')}
              >
                <d.icon className="h-3.5 w-3.5" />
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {tab === 'write' ? (
        <RichHtmlEditor bare allowFullscreen={false} minHeight={260} value={value} onChange={onChange} placeholder={placeholder} onUploadImage={uploadContentImage} />
      ) : (
        <div className="bg-[#e9efee] p-3 dark:bg-[#0a1a13]">
          <div className={cn('mx-auto overflow-hidden rounded-2xl border border-black/10 bg-white shadow-xl transition-all', device === 'phone' ? 'max-w-[380px]' : 'max-w-full')}>
            <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-3">
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#0f766e] text-sm font-bold text-white">D</span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900">{subject.trim() || 'Your subject line'}</p>
                <p className="truncate text-xs text-slate-500">Dealo · to you</p>
              </div>
            </div>
            <iframe title="Email preview" sandbox="" className="block h-[28rem] w-full bg-white" srcDoc={preview} />
          </div>
        </div>
      )}
    </div>
  );
}
