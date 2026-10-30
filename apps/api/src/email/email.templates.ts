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
