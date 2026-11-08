const DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

const startsWith = (buf: Buffer, bytes: number[], offset = 0) =>
  buf.length >= offset + bytes.length && bytes.every((byte, i) => buf[offset + i] === byte);

/**
 * Works out the real type of an upload from its first bytes, ignoring the name and the type the
 * browser claimed. Returns null for anything that isn't a PDF, Word file or PNG/JPEG/WebP photo.
 */
export function detectFileMime(buf: Buffer): string | null {
  // PDFs may have a little junk before the header, so look a short way in.
  if (buf.subarray(0, 1024).includes('%PDF-')) return 'application/pdf';
  if (startsWith(buf, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])) return 'application/msword';
  // .docx is a zip; only accept zips that actually hold a Word document.
  if (startsWith(buf, [0x50, 0x4b, 0x03, 0x04]) && buf.includes('word/')) return DOCX;
  if (startsWith(buf, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'image/png';
  if (startsWith(buf, [0xff, 0xd8, 0xff])) return 'image/jpeg';
  if (startsWith(buf, [0x52, 0x49, 0x46, 0x46]) && startsWith(buf, [0x57, 0x45, 0x42, 0x50], 8)) return 'image/webp';
  if (startsWith(buf, [0x47, 0x49, 0x46, 0x38])) return 'image/gif';
  return null;
}

/** The real type when it is one of `allowed`, otherwise null. */
export function verifiedMime(buf: Buffer, allowed: ReadonlySet<string>): string | null {
  const mime = detectFileMime(buf);
  return mime && allowed.has(mime) ? mime : null;
}
