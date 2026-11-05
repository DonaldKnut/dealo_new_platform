import type { ResumeFontId } from '@dealo/shared';

/** Font family names used inside PDF documents. */
export const PDF_FAMILY: Record<ResumeFontId, string> = {
  helvetica: 'Helvetica',
  times: 'Times-Roman',
  inter: 'Inter',
  lora: 'Lora',
  merriweather: 'Merriweather',
};

/** The same fonts for the on-screen preview. */
export const CSS_FAMILY: Record<ResumeFontId, string> = {
  helvetica: 'Helvetica, Arial, sans-serif',
  times: '"Times New Roman", Times, serif',
  inter: 'DealoResumeInter, Arial, sans-serif',
  lora: 'DealoResumeLora, Georgia, serif',
  merriweather: 'DealoResumeMerriweather, Georgia, serif',
};

const FILES: Array<{ id: Exclude<ResumeFontId, 'helvetica' | 'times'>; family: string; css: string }> = [
  { id: 'inter', family: 'Inter', css: 'DealoResumeInter' },
  { id: 'lora', family: 'Lora', css: 'DealoResumeLora' },
  { id: 'merriweather', family: 'Merriweather', css: 'DealoResumeMerriweather' },
];

export const PREVIEW_FONT_CSS = FILES.flatMap((f) =>
  [400, 700].map(
    (w) => `@font-face{font-family:${f.css};src:url(/fonts/resume/${f.id}-${w}.ttf) format("truetype");font-weight:${w};font-display:swap;}`,
  ),
).join('');

let registered = false;

export function registerPdfFonts(lib: typeof import('@react-pdf/renderer'), origin: string) {
  if (registered) return;
  registered = true;
  for (const f of FILES) {
    lib.Font.register({
      family: f.family,
      fonts: [
        { src: `${origin}/fonts/resume/${f.id}-400.ttf`, fontWeight: 400 },
        { src: `${origin}/fonts/resume/${f.id}-700.ttf`, fontWeight: 700 },
      ],
    });
  }
  // Keep whole words together; hyphenated names and skills read badly on a CV.
  lib.Font.registerHyphenationCallback((word) => [word]);
}
