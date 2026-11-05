/** Minimal iCalendar (RFC 5545) invite that Gmail, Outlook and Apple Calendar accept. */
const stamp = (date: Date) => date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

const escapeText = (value: string) => value.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

/** Lines longer than 75 octets must be folded. */
const fold = (line: string) => {
  const parts: string[] = [];
  let rest = line;
  while (rest.length > 74) {
    parts.push(rest.slice(0, 74));
    rest = ` ${rest.slice(74)}`;
  }
  parts.push(rest);
  return parts.join('\r\n');
};

export function buildIcs(p: {
  uid: string;
  method: 'REQUEST' | 'CANCEL';
  start: Date;
  durationMin: number;
  summary: string;
  description: string;
  location?: string | null;
  organizerEmail: string;
  attendees: { name: string; email: string }[];
  sequence: number;
}) {
  const end = new Date(p.start.getTime() + p.durationMin * 60_000);
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Dealo//ATS//EN',
    'CALSCALE:GREGORIAN',
    `METHOD:${p.method}`,
    'BEGIN:VEVENT',
    `UID:${p.uid}`,
    `SEQUENCE:${p.sequence}`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(p.start)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${escapeText(p.summary)}`,
    `DESCRIPTION:${escapeText(p.description)}`,
    ...(p.location ? [`LOCATION:${escapeText(p.location)}`] : []),
    `ORGANIZER;CN=Dealo ATS:mailto:${p.organizerEmail}`,
    ...p.attendees.map((a) => `ATTENDEE;CN=${escapeText(a.name)};ROLE=REQ-PARTICIPANT;RSVP=TRUE:mailto:${a.email}`),
    `STATUS:${p.method === 'CANCEL' ? 'CANCELLED' : 'CONFIRMED'}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return lines.map(fold).join('\r\n');
}

/** Human-friendly time in Lagos time, e.g. "Tue 12 Nov, 10:00 (WAT)". */
export function lagosTime(date: Date) {
  return `${new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Lagos',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)} (WAT)`;
}
