'use client';

import type { PreviewDoc } from './resume-preview';
import { makePdfPrims } from './primitives';
import { PDF_FAMILY, registerPdfFonts } from './resume-fonts';
import { CoverLetterTemplate, TEMPLATE_COMPONENTS } from './templates';

/** Builds a real, selectable-text PDF in the browser. The PDF library loads only when needed. */
export async function buildPdf(doc: PreviewDoc, branding: boolean, title: string) {
  const lib = await import('@react-pdf/renderer');
  registerPdfFonts(lib, window.location.origin);
  const P = makePdfPrims(lib);
  const family = PDF_FAMILY[doc.style.font];
  const page =
    doc.kind === 'RESUME'
      ? TEMPLATE_COMPONENTS[doc.style.template]({ P, data: doc.data, style: doc.style, family, branding })
      : CoverLetterTemplate({ P, letter: doc.letter, style: doc.style, family, branding });
  const author = doc.kind === 'RESUME' ? doc.data.personal.fullName : doc.letter.fullName;
  return lib
    .pdf(
      <lib.Document title={title} author={author || undefined} creator="Dealo resume builder" producer="Dealo">
        {page}
      </lib.Document>,
    )
    .toBlob();
}

export function pdfFileName(doc: PreviewDoc) {
  const who = (doc.kind === 'RESUME' ? doc.data.personal.fullName : doc.letter.fullName) || 'my';
  const slug = who
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `${slug || 'my'}-${doc.kind === 'RESUME' ? 'cv' : 'cover-letter'}.pdf`;
}

export function saveBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
