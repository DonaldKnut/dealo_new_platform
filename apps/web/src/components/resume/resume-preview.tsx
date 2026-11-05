'use client';

import type { CoverLetterData, ResumeData, ResumeStyle } from '@dealo/shared';
import { useEffect, useRef, useState } from 'react';

import { PAGE_HEIGHT_PT, PAGE_WIDTH_PT, PT_TO_PX, htmlPrims } from './primitives';
import { CSS_FAMILY, PREVIEW_FONT_CSS } from './resume-fonts';
import { CoverLetterTemplate, TEMPLATE_COMPONENTS } from './templates';

const PAGE_W = PAGE_WIDTH_PT * PT_TO_PX;
const PAGE_H = PAGE_HEIGHT_PT * PT_TO_PX;

export type PreviewDoc =
  | { kind: 'RESUME'; data: ResumeData; style: ResumeStyle }
  | { kind: 'COVER_LETTER'; letter: CoverLetterData; style: ResumeStyle };

/** Live A4 preview scaled to whatever width it is given (works down to ~200px). */
export function ResumePreview({ doc, branding, className = '' }: { doc: PreviewDoc; branding: boolean; className?: string }) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.4);
  const [height, setHeight] = useState(PAGE_H);

  useEffect(() => {
    const el = outer.current;
    if (!el) return;
    const observer = new ResizeObserver(() => setScale(el.clientWidth / PAGE_W));
    observer.observe(el);
    setScale(el.clientWidth / PAGE_W);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const el = inner.current;
    if (!el) return;
    const observer = new ResizeObserver(() => setHeight(Math.max(PAGE_H, el.offsetHeight)));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const family = CSS_FAMILY[doc.style.font];
  const pages = Math.max(1, Math.ceil(height / PAGE_H - 0.02));
  const Template = doc.kind === 'RESUME' ? TEMPLATE_COMPONENTS[doc.style.template] : null;

  return (
    <div ref={outer} className={`relative w-full overflow-hidden ${className}`} style={{ height: height * scale }}>
      <style>{PREVIEW_FONT_CSS}</style>
      <div
        ref={inner}
        aria-label="CV preview"
        className="absolute left-0 top-0 origin-top-left select-none text-left"
        style={{ width: PAGE_W, transform: `scale(${scale})` }}
      >
        {Template && doc.kind === 'RESUME' ? (
          <Template P={htmlPrims} data={doc.data} style={doc.style} family={family} branding={branding} />
        ) : doc.kind === 'COVER_LETTER' ? (
          <CoverLetterTemplate P={htmlPrims} letter={doc.letter} style={doc.style} family={family} branding={branding} />
        ) : null}
        {Array.from({ length: pages - 1 }, (_, i) => (
          <div
            key={i}
            className="pointer-events-none absolute inset-x-0 border-t-2 border-dashed border-rose-300"
            style={{ top: PAGE_H * (i + 1) }}
          >
            <span className="absolute right-2 top-1 rounded bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-700">Page {i + 2}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
