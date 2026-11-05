import type { SendEmailInput } from '../email/email.types';

const esc = (value: string) =>
  value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char] ?? char);

function layout(title: string, body: string, cta?: { label: string; href: string }) {
  const button = cta
    ? `<p style="margin:24px 0"><a href="${cta.href}" style="background:#0f766e;color:#fff;padding:12px 20px;border-radius:999px;text-decoration:none;font-weight:600">${esc(cta.label)}</a></p>`
    : '';
  return `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#0b1f1e;line-height:1.6"><h2 style="margin:0 0 12px">${esc(title)}</h2>${body}${button}<p style="color:#5b6f6e;font-size:12px;margin-top:32px">Sent with Dealo ATS</p></div>`;
}

export function workspaceInviteEmail(p: { to: string; orgName: string; inviterName: string; role: string; link: string }): SendEmailInput {
  const role = p.role.replace('_', ' ').toLowerCase();
  return {
    to: p.to,
    subject: `${p.inviterName} invited you to ${p.orgName} on Dealo`,
    html: layout(
      `Join ${p.orgName} on Dealo`,
      `<p>${esc(p.inviterName)} invited you to help hire at <strong>${esc(p.orgName)}</strong> as a ${esc(role)}.</p><p>The link works for 7 days.</p>`,
      { label: 'Accept invite', href: p.link },
    ),
    text: `${p.inviterName} invited you to ${p.orgName} on Dealo as a ${role}. Accept: ${p.link}`,
  };
}

export function applicationReceivedEmail(p: { to: string; name: string; jobTitle: string; orgName: string }): SendEmailInput {
  return {
    to: p.to,
    subject: `We got your application — ${p.jobTitle}`,
    html: layout(
      'Application received',
      `<p>Hi ${esc(p.name)},</p><p>Thank you for applying for <strong>${esc(p.jobTitle)}</strong> at ${esc(p.orgName)}. The team will review it and contact you about next steps.</p><p>You do not need to pay anyone to be considered.</p>`,
    ),
    text: `Hi ${p.name}, thank you for applying for ${p.jobTitle} at ${p.orgName}. The team will contact you about next steps.`,
  };
}

export function rejectionEmail(p: { to: string; name: string; jobTitle: string; orgName: string; reason?: string }): SendEmailInput {
  return {
    to: p.to,
    subject: `Update on your application — ${p.jobTitle}`,
    html: layout(
      'Thank you for applying',
      `<p>Hi ${esc(p.name)},</p><p>Thank you for your interest in <strong>${esc(p.jobTitle)}</strong> at ${esc(p.orgName)}. After careful review, we will not move forward this time.</p>${p.reason ? `<p>${esc(p.reason)}</p>` : ''}<p>We wish you the very best in your search.</p>`,
    ),
    text: `Hi ${p.name}, thank you for applying for ${p.jobTitle} at ${p.orgName}. We will not move forward this time. We wish you the best.`,
  };
}

export function interviewInviteEmail(p: {
  to: string;
  name: string;
  jobTitle: string;
  orgName: string;
  whenText?: string;
  kind: string;
  location?: string | null;
  bookingLink?: string;
  ics?: string;
}): SendEmailInput {
  const how = p.kind === 'PHONE' ? 'a phone call' : p.kind === 'IN_PERSON' ? 'an in-person meeting' : 'a video call';
  const body = p.bookingLink
    ? `<p>Hi ${esc(p.name)},</p><p>${esc(p.orgName)} would like to meet you for <strong>${esc(p.jobTitle)}</strong> by ${how}. Please pick a time that works for you.</p>`
    : `<p>Hi ${esc(p.name)},</p><p>Your interview for <strong>${esc(p.jobTitle)}</strong> at ${esc(p.orgName)} is booked for <strong>${esc(p.whenText ?? '')}</strong> (${how}).</p>${p.location ? `<p>Where: ${esc(p.location)}</p>` : ''}<p>A calendar invite is attached.</p>`;
  return {
    to: p.to,
    subject: p.bookingLink ? `Pick an interview time — ${p.jobTitle}` : `Interview booked — ${p.jobTitle}`,
    html: layout('Interview', body, p.bookingLink ? { label: 'Choose a time', href: p.bookingLink } : undefined),
    text: p.bookingLink ? `Pick an interview time: ${p.bookingLink}` : `Interview for ${p.jobTitle}: ${p.whenText}. ${p.location ?? ''}`,
    attachments: p.ics ? [{ filename: 'interview.ics', content: p.ics, contentType: 'text/calendar; method=REQUEST' }] : undefined,
  };
}

export function interviewCancelledEmail(p: { to: string; name: string; jobTitle: string; orgName: string; ics?: string }): SendEmailInput {
  return {
    to: p.to,
    subject: `Interview cancelled — ${p.jobTitle}`,
    html: layout(
      'Interview cancelled',
      `<p>Hi ${esc(p.name)},</p><p>Your interview for <strong>${esc(p.jobTitle)}</strong> at ${esc(p.orgName)} has been cancelled. The team will contact you if they set a new time.</p>`,
    ),
    text: `Your interview for ${p.jobTitle} at ${p.orgName} has been cancelled.`,
    attachments: p.ics ? [{ filename: 'cancel.ics', content: p.ics, contentType: 'text/calendar; method=CANCEL' }] : undefined,
  };
}

/** Internal notice to a workspace member (interviewer, recruiter). */
export function teamNoticeEmail(p: { to: string; subject: string; title: string; lines: string[]; link: string; ics?: string }): SendEmailInput {
  return {
    to: p.to,
    subject: p.subject,
    html: layout(p.title, p.lines.map((line) => `<p>${esc(line)}</p>`).join(''), { label: 'Open in Dealo', href: p.link }),
    text: `${p.lines.join('\n')}\n${p.link}`,
    attachments: p.ics ? [{ filename: 'interview.ics', content: p.ics, contentType: 'text/calendar; method=REQUEST' }] : undefined,
  };
}

export function offerEmail(p: { to: string; name: string; jobTitle: string; orgName: string; link: string }): SendEmailInput {
  return {
    to: p.to,
    subject: `Job offer — ${p.jobTitle} at ${p.orgName}`,
    html: layout(
      'You have a job offer',
      `<p>Hi ${esc(p.name)},</p><p>Good news! ${esc(p.orgName)} would like to offer you the role of <strong>${esc(p.jobTitle)}</strong>. Open the offer to see the details and reply.</p>`,
      { label: 'View offer', href: p.link },
    ),
    text: `Hi ${p.name}, ${p.orgName} has a job offer for you (${p.jobTitle}): ${p.link}`,
  };
}

export function offerResponseEmail(p: { to: string; candidateName: string; jobTitle: string; decision: string }): SendEmailInput {
  const accepted = p.decision === 'ACCEPTED';
  return {
    to: p.to,
    subject: `${p.candidateName} ${accepted ? 'accepted' : 'declined'} the offer — ${p.jobTitle}`,
    html: layout(
      accepted ? 'Offer accepted' : 'Offer declined',
      `<p>${esc(p.candidateName)} has ${accepted ? 'accepted' : 'declined'} your offer for <strong>${esc(p.jobTitle)}</strong>.</p>`,
    ),
    text: `${p.candidateName} ${accepted ? 'accepted' : 'declined'} the offer for ${p.jobTitle}.`,
  };
}
