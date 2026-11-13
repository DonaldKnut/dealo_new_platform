'use client';

import {
  RESUME_COLORS,
  RESUME_FONTS,
  RESUME_SECTIONS,
  RESUME_TEMPLATES,
  isPremiumColor,
  type ResumeData,
  type ResumeDesign,
  type ResumeFontId,
  type ResumeSection,
  type ResumeStyle,
} from '@dealo/shared';
import { Reorder } from 'framer-motion';
import { Check, GripVertical, Lock, Sparkles } from 'lucide-react';

import { cn } from '@/lib/utils';

import { PremiumBadge } from './editor-parts';
import { htmlPrims } from './primitives';
import { HeaderArt, RESUME_ART_OPTIONS } from './resume-art';
import { SAMPLE_RESUME, SECTION_LABEL } from './resume-content';
import { CSS_FAMILY, FONT_NOTE, PREVIEW_FONT_CSS } from './resume-fonts';
import { ResumePreview } from './resume-preview';

export function FontPicker({ value, premium, onChange }: { value: ResumeFontId; premium: boolean; onChange: (font: ResumeFontId) => void }) {
  return (
    <div className="grid grid-cols-1 gap-2 min-[300px]:grid-cols-2">
      <style>{PREVIEW_FONT_CSS}</style>
      {RESUME_FONTS.map((f) => {
        const active = value === f.id;
        return (
          <button
            key={f.id}
            type="button"
            onClick={() => onChange(f.id)}
            aria-pressed={active}
            className={cn(
              'group relative flex items-center gap-3 overflow-hidden rounded-2xl border px-3 py-3 text-left transition',
              active
                ? 'border-brand bg-gradient-to-br from-brand-soft via-surface-elevated to-surface-elevated shadow-sm ring-1 ring-brand/25'
                : 'border-border bg-surface-elevated/60 hover:border-brand/45 hover:bg-surface-elevated',
            )}
          >
            <span
              aria-hidden
              className={cn(
                'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-[1.15rem] tracking-tight shadow-inner',
                active ? 'bg-brand text-white dark:text-[#071f14]' : 'bg-surface text-foreground ring-1 ring-border/70',
              )}
              style={{ fontFamily: CSS_FAMILY[f.id] }}
            >
              Aa
            </span>
            <span className="min-w-0 flex-1">
              <span className={cn('block truncate text-[15px] font-medium', active ? 'text-brand' : 'text-foreground')} style={{ fontFamily: CSS_FAMILY[f.id] }}>
                {f.name}
              </span>
              <span className="mt-0.5 block truncate text-[11px] text-muted">{FONT_NOTE[f.id]}</span>
            </span>
            {f.premium && !premium ? <PremiumBadge /> : active ? <Check className="h-4 w-4 shrink-0 text-brand" /> : null}
          </button>
        );
      })}
    </div>
  );
}

function ArtPicker({ design, color, premium, onDesign }: { design: ResumeDesign; color: string; premium: boolean; onDesign: (d: ResumeDesign) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2 min-[360px]:grid-cols-3">
      {RESUME_ART_OPTIONS.map((a) => {
        const active = design.art === a.id;
        return (
          <button
            key={a.id}
            type="button"
            onClick={() => onDesign({ ...design, art: a.id })}
            aria-pressed={active}
            className={cn(
              'relative overflow-hidden rounded-xl border bg-white text-left transition',
              active ? 'border-brand ring-1 ring-brand/30' : 'border-border hover:border-brand/50',
            )}
          >
            <div className="relative h-14 overflow-hidden">
              {a.id === 'none' ? (
                <span className="flex h-full items-center justify-center text-[11px] text-slate-400">Plain</span>
              ) : (
                <div className="absolute right-0 top-0 origin-top-right scale-[0.55]">
                  <HeaderArt P={htmlPrims} art={a.id} color={color} width={190} />
                </div>
              )}
            </div>
            <div className="flex items-center justify-between gap-1 border-t border-border bg-surface-elevated px-2 py-1.5">
              <span className={cn('truncate text-[11px] font-medium', active ? 'text-brand' : 'text-foreground')}>{a.name}</span>
              {a.id !== 'none' && !premium ? <Lock className="h-3 w-3 shrink-0 text-muted" /> : active ? <Check className="h-3.5 w-3.5 shrink-0 text-brand" /> : null}
            </div>
          </button>
        );
      })}
    </div>
  );
}

export function DesignPanel({
  data,
  style,
  premium,
  onStyle,
  onOrder,
  onDesign,
  showTemplates = true,
}: {
  data: ResumeData;
  style: ResumeStyle;
  premium: boolean;
  onStyle: (s: ResumeStyle) => void;
  onOrder: (order: ResumeSection[]) => void;
  onDesign?: (d: ResumeDesign) => void;
  showTemplates?: boolean;
}) {
  const thumbData = data.personal.fullName || data.experience.length ? data : SAMPLE_RESUME;
  const order = [...data.sectionOrder, ...RESUME_SECTIONS.filter((s) => !data.sectionOrder.includes(s))];

  return (
    <div className="space-y-6">
      {showTemplates ? (
        <section>
          <h3 className="mb-1 text-sm font-semibold text-foreground">Template</h3>
          <p className="mb-3 text-xs text-muted">Tap to switch layouts. Your words stay the same — only the look changes.</p>
          <div className="grid grid-cols-1 gap-3 min-[300px]:grid-cols-2 lg:grid-cols-3">
            {RESUME_TEMPLATES.map((t) => {
              const active = style.template === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => onStyle({ ...style, template: t.id })}
                  className={cn(
                    'group relative overflow-hidden rounded-2xl border-2 bg-white text-left shadow-sm transition',
                    active ? 'border-brand shadow-lg shadow-brand/20 ring-1 ring-brand/20' : 'border-border hover:border-brand/50 hover:shadow-md',
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
        <h3 className="mb-1 text-sm font-semibold text-foreground">Typography</h3>
        <p className="mb-3 text-xs text-muted">
          Each name is set in its own face. Premium unlocks editorial serifs and clean modern sans for a sharper PDF.
        </p>
        <FontPicker value={style.font} premium={premium} onChange={(font) => onStyle({ ...style, font })} />
      </section>

      {onDesign ? (
        <section>
          <h3 className="mb-1 text-sm font-semibold text-foreground">Icons and illustrations</h3>
          <p className="mb-3 text-xs text-muted">Small icons beside headings and contact details, and a soft drawing in the top corner.</p>
          <label className="mb-3 flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-surface-elevated px-3 py-2.5">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
              <Sparkles className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-foreground">Show icons</span>
              <span className="block text-[11px] text-muted">Free on every template. Most job sites read them fine.</span>
            </span>
            <input
              type="checkbox"
              role="switch"
              checked={data.design.icons}
              onChange={(e) => onDesign({ ...data.design, icons: e.target.checked })}
              className="peer sr-only"
            />
            <span
              aria-hidden
              className={cn(
                'relative h-6 w-11 shrink-0 rounded-full transition peer-focus-visible:ring-2 peer-focus-visible:ring-brand',
                data.design.icons ? 'bg-brand' : 'bg-border',
              )}
            >
              <span className={cn('absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all', data.design.icons ? 'left-[22px]' : 'left-0.5')} />
            </span>
          </label>
          <p className="mb-2 flex items-center gap-2 text-xs font-medium text-foreground">Corner illustration {!premium ? <PremiumBadge /> : null}</p>
          <ArtPicker design={data.design} color={style.accentColor} premium={premium} onDesign={onDesign} />
        </section>
      ) : null}

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
