import type { ResumeFontId } from '@dealo/shared';

/** Font family names used inside PDF documents. */
export const PDF_FAMILY: Record<ResumeFontId, string> = {
  helvetica: 'Helvetica',
  times: 'Times-Roman',
  lato: 'Lato',
  inter: 'Inter',
  poppins: 'Poppins',
  lora: 'Lora',
  merriweather: 'Merriweather',
  ptserif: 'PT Serif',
};

/** The same fonts for the on-screen preview. */
export const CSS_FAMILY: Record<ResumeFontId, string> = {
  helvetica: 'Helvetica, Arial, sans-serif',
  times: '"Times New Roman", Times, serif',
  lato: 'DealoResumeLato, Arial, sans-serif',
  inter: 'DealoResumeInter, Arial, sans-serif',
  poppins: 'DealoResumePoppins, Arial, sans-serif',
  lora: 'DealoResumeLora, Georgia, serif',
  merriweather: 'DealoResumeMerriweather, Georgia, serif',
  ptserif: 'DealoResumePTSerif, Georgia, serif',
};

/** How each font feels, shown under its name in the picker. */
export const FONT_NOTE: Record<ResumeFontId, string> = {
  helvetica: 'Clean and neutral',
  times: 'Classic and formal',
  lato: 'Warm and modern',
  inter: 'Crisp, tech-friendly',
  poppins: 'Bold and confident',
  lora: 'Elegant serif',
  merriweather: 'Easy to read, editorial',
  ptserif: 'Traditional, professional',
};

const FILES: Array<{ id: Exclude<ResumeFontId, 'helvetica' | 'times'>; family: string; css: string }> = [
  { id: 'lato', family: 'Lato', css: 'DealoResumeLato' },
  { id: 'inter', family: 'Inter', css: 'DealoResumeInter' },
  { id: 'poppins', family: 'Poppins', css: 'DealoResumePoppins' },
  { id: 'lora', family: 'Lora', css: 'DealoResumeLora' },
  { id: 'merriweather', family: 'Merriweather', css: 'DealoResumeMerriweather' },
  { id: 'ptserif', family: 'PT Serif', css: 'DealoResumePTSerif' },
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
      // No italic files are shipped, so italic text falls back to the upright face instead of failing the export.
      fonts: [400, 700].flatMap((w) =>
        (['normal', 'italic'] as const).map((fontStyle) => ({ src: `${origin}/fonts/resume/${f.id}-${w}.ttf`, fontWeight: w, fontStyle })),
      ),
    });
  }
  // Keep whole words together; hyphenated names and skills read badly on a CV.
  lib.Font.registerHyphenationCallback((word) => [word]);
}
