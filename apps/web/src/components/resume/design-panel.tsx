'use client';

import {
  RESUME_COLORS,
  RESUME_FONTS,
  RESUME_SECTIONS,
  RESUME_TEMPLATES,
  isPremiumColor,
  type ResumeData,
  type ResumeSection,
  type ResumeStyle,
} from '@dealo/shared';
import { Reorder } from 'framer-motion';
import { Check, GripVertical, Lock } from 'lucide-react';

import { cn } from '@/lib/utils';

import { PremiumBadge } from './editor-parts';
import { SAMPLE_RESUME, SECTION_LABEL } from './resume-content';
import { ResumePreview } from './resume-preview';

export function DesignPanel({
  data,
  style,
  premium,
  onStyle,
  onOrder,
  showTemplates = true,
}: {
  data: ResumeData;
  style: ResumeStyle;
  premium: boolean;
  onStyle: (s: ResumeStyle) => void;
  onOrder: (order: ResumeSection[]) => void;
  showTemplates?: boolean;
}) {
  const thumbData = data.personal.fullName || data.experience.length ? data : SAMPLE_RESUME;
  const order = [...data.sectionOrder, ...RESUME_SECTIONS.filter((s) => !data.sectionOrder.includes(s))];

  return (
    <div className="space-y-6">
      {showTemplates ? (
        <section>
          <h3 className="mb-1 text-sm font-semibold text-foreground">Template</h3>
          <p className="mb-3 text-xs text-muted">Tap to switch. Your words stay the same.</p>
          <div className="grid grid-cols-1 gap-3 min-[300px]:grid-cols-2 lg:grid-cols-3">
            {RESUME_TEMPLATES.map((t) => {
              const active = style.template === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => onStyle({ ...style, template: t.id })}
                  className={cn(
                    'group relative overflow-hidden rounded-2xl border-2 bg-white text-left transition',
                    active ? 'border-brand shadow-lg shadow-brand/15' : 'border-border hover:border-brand/50',
                  )}
                >
                  <div className="pointer-events-none max-h-52 overflow-hidden">
                    <ResumePreview doc={{ kind: 'RESUME', data: thumbData, style: { ...style, template: t.id } }} branding={false} />
                  </div>
                  <div className="flex items-center justify-between gap-1 border-t border-border bg-surface-elevated px-2.5 py-2">
                    <span className="min-w-0">
                      <span className="block truncate text-xs font-semibold text-foreground">{t.name}</span>
                      <span className="block truncate text-[10px] text-muted">{t.blurb}</span>
                    </span>
                    {t.premium ? <PremiumBadge /> : <span className="shrink-0 text-[10px] font-semibold text-brand">Free</span>}
                  </div>
                  {active ? (
                    <span className="absolute right-2 top-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-brand text-white dark:text-[#071f14]">
                      <Check className="h-3.5 w-3.5" />
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </section>
      ) : null}

      <section>
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
          Colour {!premium ? <PremiumBadge /> : null}
        </h3>
        <div className="flex flex-wrap items-center gap-2">
          {RESUME_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={`Colour ${c}`}
              onClick={() => onStyle({ ...style, accentColor: c })}
              className={cn('relative h-9 w-9 rounded-full ring-offset-2 ring-offset-background transition hover:scale-110', style.accentColor === c && 'ring-2 ring-foreground')}
              style={{ backgroundColor: c }}
            >
              {!premium && isPremiumColor(c) ? <Lock className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-white p-0.5 text-slate-700" /> : null}
            </button>
          ))}
          <label className="relative inline-flex h-9 w-9 cursor-pointer items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-border" title="Any colour">
            <input type="color" value={style.accentColor} onChange={(e) => onStyle({ ...style, accentColor: e.target.value })} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
            <span className="h-4 w-4 rounded-full" style={{ background: 'conic-gradient(red, yellow, lime, cyan, blue, magenta, red)' }} />
          </label>
        </div>
      </section>

      <section>
        <h3 className="mb-3 text-sm font-semibold text-foreground">Font</h3>
        <div className="grid grid-cols-1 gap-2 min-[300px]:grid-cols-2">
          {RESUME_FONTS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => onStyle({ ...style, font: f.id })}
              className={cn(
                'flex items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-left text-sm transition',
                style.font === f.id ? 'border-brand bg-brand-soft text-brand' : 'border-border text-foreground hover:border-brand/50',
              )}
            >
              <span className="truncate">{f.name}</span>
              {f.premium && !premium ? <PremiumBadge /> : null}
            </button>
          ))}
        </div>
      </section>

      <section>
        <h3 className="mb-1 text-sm font-semibold text-foreground">Section order</h3>
        <p className="mb-3 text-xs text-muted">Drag to change what comes first. Empty sections are hidden.</p>
        <Reorder.Group axis="y" values={order} onReorder={onOrder} className="space-y-1.5">
          {order.map((s) => (
            <Reorder.Item
              key={s}
              value={s}
              className="flex cursor-grab touch-none items-center gap-2 rounded-xl border border-border bg-surface-elevated px-3 py-2.5 text-sm active:cursor-grabbing"
            >
              <GripVertical className="h-4 w-4 shrink-0 text-muted" />
              <span className="min-w-0 flex-1 truncate">{SECTION_LABEL[s]}</span>
            </Reorder.Item>
          ))}
        </Reorder.Group>
      </section>
    </div>
  );
}
