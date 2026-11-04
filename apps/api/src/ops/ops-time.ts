const EARTH_RADIUS_M = 6_371_000;

/** Great-circle distance in metres between two lat/lng points. */
export function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number) {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(a)));
}

type ZonedParts = { year: number; month: number; day: number; hour: number; minute: number };

function zonedParts(date: Date, timeZone: string): ZonedParts {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0);
  return { year: get('year'), month: get('month'), day: get('day'), hour: get('hour'), minute: get('minute') };
}

/** Local calendar date ("YYYY-MM-DD") and minute-of-day at a site. */
export function siteClock(date: Date, timeZone: string) {
  const p = zonedParts(date, timeZone);
  const workDate = `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
  return { workDate, minutes: p.hour * 60 + p.minute };
}

export function hhmmToMinutes(value: string) {
  const [h, m] = value.split(':').map(Number);
  return h * 60 + m;
}

export function minutesToHhmm(total: number) {
  const minutes = ((Math.round(total) % 1440) + 1440) % 1440;
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

/** UTC instant for a local wall-clock time on a local date at the site. */
export function siteTimeToUtc(workDate: string, hhmm: string, timeZone: string) {
  const [y, mo, d] = workDate.split('-').map(Number);
  const [h, mi] = hhmm.split(':').map(Number);
  const guess = Date.UTC(y, mo - 1, d, h, mi);
  const p = zonedParts(new Date(guess), timeZone);
  const asZoned = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute);
  return new Date(guess - (asZoned - guess));
}

/** Short zone label for display, e.g. "WAT". */
export function zoneLabel(timeZone: string) {
  if (timeZone === 'Africa/Lagos') return 'WAT';
  const part = new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'short' })
    .formatToParts(new Date())
    .find((item) => item.type === 'timeZoneName');
  return part?.value ?? timeZone;
}

/** The last `count` local dates up to and including `workDate`. */
export function previousWorkDates(workDate: string, count: number) {
  const [y, m, d] = workDate.split('-').map(Number);
  const base = Date.UTC(y, m - 1, d);
  return Array.from({ length: count }, (_, index) =>
    new Date(base - index * 86_400_000).toISOString().slice(0, 10),
  );
}
