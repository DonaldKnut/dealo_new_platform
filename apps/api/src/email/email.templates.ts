import type { SendEmailInput } from './email.types';

export function contactAckEmail(params: {
  to: string;
  name: string;
  subject: string;
}): SendEmailInput {
  return {
    to: params.to,
    subject: 'We received your message — Dealo',
    html: `<p>Hi ${params.name},</p><p>Thanks for contacting Dealo. Our team will respond shortly regarding: <strong>${params.subject}</strong>.</p>`,
    text: `Hi ${params.name}, thanks for contacting Dealo. We will respond shortly regarding: ${params.subject}.`,
  };
}

export function hireInquiryAckEmail(params: {
  to: string;
  contactName: string;
  roleTitle: string;
}): SendEmailInput {
  return {
    to: params.to,
    subject: 'We received your hiring request — Dealo',
    html: `<p>Hi ${params.contactName},</p><p>Thanks for contacting Dealo about hiring for <strong>${params.roleTitle}</strong>. Our team will review your request and follow up shortly.</p>`,
    text: `Hi ${params.contactName}, thanks for contacting Dealo about hiring for ${params.roleTitle}. Our team will follow up shortly.`,
  };
}

const escapeHtml = (text: string) =>
  text.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c);

/** Alert for Dealo staff when a public hire request lands. */
export function hireInquiryStaffEmail(params: {
  to: string;
  dashboardUrl: string;
  companyName: string;
  contactName: string;
  email: string;
  phone?: string | null;
  roleTitle: string;
  roleFamily: string;
  serviceType: string;
  numberOfProfessionals: number;
  location: string;
  workArrangement?: string | null;
  expectedStartDate?: string | null;
  requirements?: string | null;
  additionalNotes?: string | null;
  inquiryId: string;
}): SendEmailInput {
  const people = `${params.numberOfProfessionals} ${params.numberOfProfessionals === 1 ? 'person' : 'people'}`;
  const rows: Array<[string, string]> = [
    ['Company', params.companyName],
    ['Contact', params.contactName],
    ['Email', params.email],
    ['Phone', params.phone?.trim() || '—'],
    ['Role', params.roleTitle],
    ['Family', params.roleFamily],
    ['Service', params.serviceType],
    ['Headcount', people],
    ['Location', params.location],
    ['Arrangement', params.workArrangement?.trim() || '—'],
    ['Start', params.expectedStartDate?.trim() || '—'],
  ];
  const table = rows
    .map(
      ([label, value]) =>
        `<tr><td style="padding:4px 12px 4px 0;color:#6b7280;vertical-align:top">${escapeHtml(label)}</td><td style="padding:4px 0;font-weight:600">${escapeHtml(value)}</td></tr>`,
    )
    .join('');
  const notes = [params.requirements, params.additionalNotes].filter((v) => v?.trim()).join('\n\n');
  return {
    to: params.to,
    subject: `[Dealo] New talent request: ${params.roleTitle} @ ${params.companyName}`,
    html: `<p>A new talent request just came in.</p>
<table style="border-collapse:collapse;font-size:14px">${table}</table>
${notes ? `<p style="margin-top:16px"><strong>Brief</strong></p><p style="white-space:pre-wrap">${escapeHtml(notes)}</p>` : ''}
<p style="margin-top:20px"><a href="${escapeHtml(params.dashboardUrl)}">Open in dashboard</a> · ID ${escapeHtml(params.inquiryId)}</p>`,
    text: `New talent request: ${params.roleTitle} @ ${params.companyName}. ${people} in ${params.location}. Contact ${params.contactName} <${params.email}>. Open: ${params.dashboardUrl}`,
  };
}
