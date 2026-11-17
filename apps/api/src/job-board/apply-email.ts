import type { EmailService } from '../email/email.service';

/** Shared apply-email extraction for the job board and Job Agent. */

const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const APPLY_EMAIL_PATTERNS = [
  /(send|forward|email|e-mail|mail|submit)[^.@\n]{0,80}?\b(cv|cvs|resume|résumé|resumes|application|applications)\b[^@\n]{0,60}?([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/i,
  /\b(cv|cvs|resume|résumé|applications?)\b[^@\n]{0,40}?\b(to|via|at)\b\s*:?\s*([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/i,
  /\bhow to apply\b[^@]{0,160}?([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/i,
  /mailto:([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/i,
];
const NOT_FOR_APPLYING =
  /^(no-?reply|donotreply|privacy|abuse|dpo|legal|support|info@example|test|jobs@jooble|careers@indeed)@|@(example|test|domain|jooble|indeed|linkedin)\./i;

const escapeHtml = (text: string) =>
  text.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c);

/** The address a listing explicitly asks applicants to send CVs to, if it names one. */
export function findApplyEmail(text: string): string | null {
  const plain = text.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ');
  for (const pattern of APPLY_EMAIL_PATTERNS) {
    const match = pattern.exec(plain);
    const email = match?.[match.length - 1];
    if (email && EMAIL.test(email) && !NOT_FOR_APPLYING.test(email)) {
      return email.toLowerCase().replace(/\.$/, '');
    }
  }
  return null;
}

export type FormalApplicationWho = { name: string; email: string; phone?: string | null };

/** Same formal CV + cover email Job Agent uses overnight and the board uses for Email Easy Apply. */
export async function sendFormalApplicationEmail(
  mailer: EmailService,
  input: {
    to: string;
    title: string;
    who: FormalApplicationWho;
    note?: string | null;
    file: { buffer: Buffer; originalname: string };
  },
) {
  const note =
    input.note?.trim() ||
    `I would like to apply for the ${input.title} role. My CV is attached, and I would welcome the chance to talk.`;
  const html = `<p>Dear Hiring Team,</p>
<p>${escapeHtml(note).replace(/\n+/g, '</p><p>')}</p>
<p>Kind regards,<br/>${escapeHtml(input.who.name)}<br/>${escapeHtml(input.who.email)}${input.who.phone ? `<br/>${escapeHtml(input.who.phone)}` : ''}</p>
<p style="color:#6b7280;font-size:12px">Sent through Dealo on behalf of ${escapeHtml(input.who.name)}, who asked us to apply for this role. Reply to this email to reach them directly.</p>`;
  await mailer.send({
    to: input.to,
    subject: `Application: ${input.title} — ${input.who.name}`.slice(0, 180),
    html,
    text: `Dear Hiring Team,\n\n${note}\n\nKind regards,\n${input.who.name}\n${input.who.email}${input.who.phone ? `\n${input.who.phone}` : ''}\n\nSent through Dealo on behalf of ${input.who.name}. Reply to reach them directly.`,
    headers: { 'Reply-To': input.who.email },
    attachments: [{ filename: input.file.originalname, content: input.file.buffer, contentType: 'application/pdf' }],
  });
}
