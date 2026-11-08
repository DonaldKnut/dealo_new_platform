'use client';

import { motion, useReducedMotion } from 'framer-motion';
import {
  AlertTriangle,
  Building2,
  Clock3,
  Crosshair,
  ExternalLink,
  LifeBuoy,
  Loader2,
  MapPin,
  Navigation,
  Smartphone,
  Sunrise,
  Sunset,
  Timer,
  type LucideIcon,
} from 'lucide-react';
import type { InputHTMLAttributes, ReactNode } from 'react';

import { FormField } from '@/components/forms/form-field';
import { cn } from '@/lib/utils';

export type SiteDraft = {
  name: string;
  address: string;
  latitude: string;
  longitude: string;
  radiusMeters: number;
  shiftStart: string;
  shiftEnd: string;
  graceMinutes: number;
  slaCoverHours: number;
};

export const EMPTY_SITE: SiteDraft = {
  name: '',
  address: '',
  latitude: '',
  longitude: '',
  radiusMeters: 200,
  shiftStart: '07:30',
  shiftEnd: '17:30',
  graceMinutes: 15,
  slaCoverHours: 48,
};

const RADIUS_PRESETS = [100, 200, 500, 1000];

/** "6.4474, 3.4723", "6.4474 3.4723" or a Google Maps link with @lat,lng or ?q=lat,lng. */
export function parseCoordinates(text: string): { lat: number; lng: number } | null {
  const fromLink = text.match(/[@=](-?\d{1,2}\.\d+),\s*(-?\d{1,3}\.\d+)/);
  const plain = text.trim().match(/^(-?\d{1,2}(?:\.\d+)?)\s*[,\s]\s*(-?\d{1,3}(?:\.\d+)?)$/);
  const m = fromLink ?? plain;
  if (!m) return null;
  const lat = Number(m[1]);
  const lng = Number(m[2]);
  return Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? { lat, lng } : null;
}

export function coordsOf(draft: SiteDraft) {
  if (draft.latitude.trim() === '' || draft.longitude.trim() === '') return null;
  const lat = Number(draft.latitude);
  const lng = Number(draft.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
}

/** Rough box around Nigeria, only to warn about swapped or mistyped numbers. */
const inNigeria = (lat: number, lng: number) => lat >= 3.5 && lat <= 14.5 && lng >= 2.5 && lng <= 15;

function minutes(hhmm: string) {
  const [h, m] = hhmm.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

function shiftLength(start: string, end: string) {
  let diff = minutes(end) - minutes(start);
  if (diff <= 0) diff += 24 * 60;
  const h = Math.floor(diff / 60);
  const m = diff % 60;
  return { text: m ? `${h} h ${m} min` : `${h} h`, overnight: minutes(end) <= minutes(start) };
}

function IconInput({ icon: Icon, className, ...props }: { icon: LucideIcon } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg bg-brand-soft text-brand">
        <Icon className="h-3.5 w-3.5" />
      </span>
      <input {...props} className={cn('input-field pl-11', className)} />
    </div>
  );
}

/** A worker's phone inside the circle can check in; one outside cannot. */
function GeofenceArt({ radius }: { radius: number }) {
  const reduce = useReducedMotion();
  const ring = 34 + Math.min(1, Math.log10(radius / 50) / Math.log10(20)) * 46;
  return (
    <div aria-hidden className="relative h-40 overflow-hidden rounded-2xl border border-border bg-[radial-gradient(circle_at_50%_55%,rgba(20,184,166,0.16),transparent_65%),linear-gradient(180deg,var(--surface),var(--surface-elevated))]">
      <svg viewBox="0 0 320 160" className="absolute inset-0 h-full w-full">
        <defs>
          <pattern id="site-grid" width="16" height="16" patternUnits="userSpaceOnUse">
            <path d="M16 0H0V16" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-border" />
          </pattern>
        </defs>
        <rect width="320" height="160" fill="url(#site-grid)" opacity="0.7" />
        <path d="M0 118 C 70 104, 120 128, 190 112 S 290 96, 320 104" fill="none" stroke="currentColor" strokeWidth="6" className="text-border" opacity="0.8" />
        <motion.circle
          cx="160"
          cy="84"
          initial={false}
          animate={{ r: ring }}
          transition={{ type: 'spring', stiffness: 160, damping: 20 }}
          fill="rgba(20,184,166,0.14)"
          stroke="#14b8a6"
          strokeWidth="1.5"
          strokeDasharray="5 4"
        />
        {!reduce ? (
          <motion.circle
            cx="160"
            cy="84"
            r={ring}
            fill="none"
            stroke="#14b8a6"
            strokeWidth="1.2"
            initial={{ opacity: 0.6, scale: 0.6 }}
            animate={{ opacity: 0, scale: 1.15 }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeOut' }}
            style={{ transformOrigin: '160px 84px' }}
          />
        ) : null}
      </svg>
      <span className="absolute left-1/2 top-[52%] -translate-x-1/2 -translate-y-full">
        <MapPin className="h-7 w-7 fill-brand/20 text-brand drop-shadow" />
      </span>
      <motion.span
        className="absolute left-[40%] top-[56%] inline-flex h-7 w-7 items-center justify-center rounded-lg bg-white text-brand shadow-md dark:bg-[#0f3d22]"
        animate={reduce ? undefined : { y: [0, -3, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <Smartphone className="h-3.5 w-3.5" />
        <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500 dark:border-[#0f3d22]" />
      </motion.span>
      <span className="absolute right-[12%] top-[22%] inline-flex h-7 w-7 items-center justify-center rounded-lg bg-white text-muted shadow-md dark:bg-[#0f3d22]">
        <Smartphone className="h-3.5 w-3.5" />
        <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-rose-400 dark:border-[#0f3d22]" />
      </span>
      <div className="absolute bottom-2 left-2 right-2 flex flex-wrap items-center justify-between gap-1 text-[10px] font-medium">
        <span className="rounded-full bg-background/85 px-2 py-0.5 text-emerald-700 backdrop-blur dark:text-emerald-300">● Inside: can check in</span>
        <span className="rounded-full bg-background/85 px-2 py-0.5 text-foreground backdrop-blur">Circle: {radius} m</span>
        <span className="rounded-full bg-background/85 px-2 py-0.5 text-rose-600 backdrop-blur dark:text-rose-300">● Outside: blocked</span>
      </div>
    </div>
  );
}

function MapPreview({ lat, lng, radius }: { lat: number; lng: number; radius: number }) {
  const span = Math.max(radius * 3, 400);
  const dLat = span / 111_320;
  const dLng = span / (111_320 * Math.max(0.2, Math.cos((lat * Math.PI) / 180)));
  const bbox = [lng - dLng, lat - dLat, lng + dLng, lat + dLat].map((n) => n.toFixed(5)).join(',');
  return (
    <div className="overflow-hidden rounded-2xl border border-border">
      <iframe
        title="Site location on the map"
        className="h-40 w-full border-0"
        loading="lazy"
        src={`https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lng}`}
      />
      <div className="flex items-center justify-between gap-2 bg-surface px-3 py-1.5 text-[11px] text-muted">
        <span className="truncate">
          Pin at {lat.toFixed(5)}, {lng.toFixed(5)}
        </span>
        <a href={`https://www.google.com/maps?q=${lat},${lng}`} target="_blank" rel="noopener noreferrer" className="inline-flex shrink-0 items-center gap-1 font-semibold text-brand hover:underline">
          Check in Google Maps <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </div>
  );
}

function Section({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted">
        <Icon className="h-3.5 w-3.5 text-brand" /> {title}
      </h3>
      {children}
    </section>
  );
}

export function NewSiteForm({
  form,
  set,
  locating,
  accuracy,
  onLocate,
  showErrors,
}: {
  form: SiteDraft;
  set: <K extends keyof SiteDraft>(key: K, value: SiteDraft[K]) => void;
  locating: boolean;
  accuracy: number | null;
  onLocate: () => void;
  showErrors: boolean;
}) {
  const coords = coordsOf(form);
  const shift = shiftLength(form.shiftStart, form.shiftEnd);
  const outside = coords ? !inNigeria(coords.lat, coords.lng) : false;
  const swapped = coords ? outside && inNigeria(coords.lng, coords.lat) : false;
  const nameMissing = showErrors && form.name.trim().length < 2;
  const coordsMissing = showErrors && !coords;

  const pasteCoords = (text: string) => {
    const parsed = parseCoordinates(text);
    if (!parsed) return false;
    set('latitude', parsed.lat.toFixed(6));
    set('longitude', parsed.lng.toFixed(6));
    return true;
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)]">
      <div className="space-y-6">
        <Section icon={Building2} title="The site">
          <FormField label="Site name" error={nameMissing ? 'Give the site a name (at least 2 letters).' : undefined}>
            <IconInput icon={Building2} value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Lekki Scheme 1 · Gate 3" maxLength={120} autoFocus />
          </FormField>
          <FormField label="Address" optional help="Shown to workers so they can find the gate.">
            <IconInput icon={MapPin} value={form.address} onChange={(e) => set('address', e.target.value)} placeholder="e.g. 12 Admiralty Way, Lekki Phase 1" maxLength={240} />
          </FormField>
        </Section>

        <Section icon={Navigation} title="Where to check in">
          <FormField
            label="Site centre"
            error={coordsMissing ? 'Set the site centre: tap “Use my location” or paste the coordinates.' : undefined}
            help="Stand at the site gate and tap “Use my location”, or paste coordinates or a Google Maps link into either box."
          >
            <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2">
              <IconInput
                icon={Navigation}
                inputMode="decimal"
                placeholder="Latitude e.g. 6.4474"
                value={form.latitude}
                onChange={(e) => set('latitude', e.target.value)}
                onPaste={(e) => pasteCoords(e.clipboardData.getData('text')) && e.preventDefault()}
                aria-label="Latitude"
              />
              <IconInput
                icon={Navigation}
                inputMode="decimal"
                placeholder="Longitude e.g. 3.4723"
                value={form.longitude}
                onChange={(e) => set('longitude', e.target.value)}
                onPaste={(e) => pasteCoords(e.clipboardData.getData('text')) && e.preventDefault()}
                aria-label="Longitude"
              />
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <button type="button" className="btn-secondary px-3 py-2 text-sm" onClick={onLocate} disabled={locating}>
                {locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Crosshair className="h-4 w-4" />}
                {locating ? 'Finding you…' : 'Use my location'}
              </button>
              {accuracy !== null ? (
                <span className={cn('text-xs', accuracy > 60 ? 'text-amber-600 dark:text-amber-300' : 'text-muted')}>
                  Accurate to about {Math.round(accuracy)} m{accuracy > 60 ? ': step outside or wait a moment and try again for a tighter fix.' : '.'}
                </span>
              ) : null}
            </div>
            {swapped ? (
              <p className="mt-2 flex items-start gap-1.5 rounded-xl bg-amber-400/15 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> These look swapped. In Nigeria latitude is about 4 to 14 and longitude about 3 to 15.
                <button
                  type="button"
                  className="font-semibold underline"
                  onClick={() => {
                    const { latitude, longitude } = form;
                    set('latitude', longitude);
                    set('longitude', latitude);
                  }}
                >
                  Swap them
                </button>
              </p>
            ) : outside ? (
              <p className="mt-2 flex items-start gap-1.5 rounded-xl bg-amber-400/15 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> This point is outside Nigeria. That is fine if the site is abroad; otherwise check the numbers.
              </p>
            ) : null}
          </FormField>

          <FormField label={`Check-in circle: ${form.radiusMeters} m`} help="Workers can only check in inside this circle. Big sites or weak GPS need a wider circle.">
            <input
              type="range"
              min={50}
              max={1000}
              step={25}
              value={form.radiusMeters}
              onChange={(e) => set('radiusMeters', Number(e.target.value))}
              className="w-full accent-[var(--brand)]"
              aria-label="Check-in circle in metres"
            />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {RADIUS_PRESETS.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => set('radiusMeters', r)}
                  className={cn(
                    'rounded-full border px-2.5 py-1 text-[11px] font-semibold transition',
                    form.radiusMeters === r ? 'border-brand bg-brand-soft text-brand' : 'border-border text-muted hover:text-foreground',
                  )}
                >
                  {r < 1000 ? `${r} m` : '1 km'}
                  <span className="ml-1 font-normal opacity-70">{r === 100 ? 'small yard' : r === 200 ? 'typical' : r === 500 ? 'estate' : 'large site'}</span>
                </button>
              ))}
            </div>
          </FormField>
        </Section>

        <Section icon={Clock3} title="Shift and cover">
          <div className="grid grid-cols-1 gap-3 min-[400px]:grid-cols-2">
            <FormField label="Shift starts">
              <IconInput icon={Sunrise} type="time" value={form.shiftStart} onChange={(e) => set('shiftStart', e.target.value)} />
            </FormField>
            <FormField label="Shift ends">
              <IconInput icon={Sunset} type="time" value={form.shiftEnd} onChange={(e) => set('shiftEnd', e.target.value)} />
            </FormField>
          </div>
          <p className="-mt-1 text-xs text-muted">
            {shift.text} shift{shift.overnight ? ', ending the next morning' : ''}.
          </p>
          <div className="grid grid-cols-1 gap-3 min-[400px]:grid-cols-2">
            <FormField label="Grace minutes" help="After this, a missing worker is marked as a no-show.">
              <IconInput icon={Timer} type="number" min={0} max={120} value={form.graceMinutes} onChange={(e) => set('graceMinutes', Math.max(0, Math.min(120, Number(e.target.value))))} />
            </FormField>
            <FormField label="Cover promise (hours)" help="How fast you promise a replacement after a no-show.">
              <IconInput icon={LifeBuoy} type="number" min={1} max={168} value={form.slaCoverHours} onChange={(e) => set('slaCoverHours', Math.max(1, Math.min(168, Number(e.target.value))))} />
            </FormField>
          </div>
        </Section>
      </div>

      <aside className="space-y-3 lg:sticky lg:top-0 lg:self-start">
        <GeofenceArt radius={form.radiusMeters} />
        {coords ? (
          <MapPreview lat={coords.lat} lng={coords.lng} radius={form.radiusMeters} />
        ) : (
          <div className="flex h-24 items-center justify-center gap-2 rounded-2xl border border-dashed border-border text-xs text-muted">
            <MapPin className="h-4 w-4" /> The map appears once the site centre is set.
          </div>
        )}
        <div className="rounded-2xl border border-border bg-surface/60 p-3 text-xs leading-relaxed text-muted">
          <p className="mb-1 font-semibold text-foreground">What happens next</p>
          Workers placed on this site check in from {form.shiftStart}. Anyone not in the circle {form.graceMinutes} minutes after start is flagged as a no-show, and you promise cover within {form.slaCoverHours} hours.
        </div>
      </aside>
    </div>
  );
}
