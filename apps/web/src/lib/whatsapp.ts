/** Digits only, e.g. 2348012345678. Empty when NEXT_PUBLIC_WHATSAPP_NUMBER is not set. */
export function whatsappNumber() {
  return (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? '').replace(/[^\d]/g, '');
}

export function whatsappHref(message: string) {
  const number = whatsappNumber();
  return number ? `https://wa.me/${number}?text=${encodeURIComponent(message)}` : null;
}

/** Opening message that matches what the visitor is looking at. */
export function whatsappMessageFor(pathname: string, fallback: string) {
  if (pathname.startsWith('/jobs')) return 'Hi Dealo, I need help with a job on your job board.';
  if (pathname.startsWith('/resume-builder') || pathname.startsWith('/dashboard/resumes')) return 'Hi Dealo, I need help with my CV.';
  if (pathname.startsWith('/dashboard/ats') || pathname.startsWith('/ats')) return 'Hi Dealo, I have a question about Dealo ATS.';
  if (pathname.startsWith('/careers')) return 'Hi Dealo, I have a question about a job I saw on a careers page.';
  return fallback;
}
