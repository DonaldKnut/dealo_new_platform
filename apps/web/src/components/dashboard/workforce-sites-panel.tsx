'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, ArrowRight, Crosshair, Loader2, MapPin, Plus, Radar, ShieldCheck, Users } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

import { DashHero, DashPanel } from '@/components/dashboard/dashboard-ui';
import { FormField } from '@/components/forms/form-field';
import { useToast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api';
import { createWorkSite, fetchWorkSites, type WorkSiteRow } from '@/lib/dashboard-api';

const EMPTY = {
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

export function WorkforceSitesPanel() {
  const toast = useToast();
  const [sites, setSites] = useState<WorkSiteRow[] | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [locating, setLocating] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setSites(await fetchWorkSites());
    } catch (error) {
      toast.error('Could not load sites', error instanceof ApiError ? error.message : undefined);
      setSites([]);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const set = <K extends keyof typeof EMPTY>(key: K, value: (typeof EMPTY)[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Location is not available on this device');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        set('latitude', position.coords.latitude.toFixed(6));
        set('longitude', position.coords.longitude.toFixed(6));
        setLocating(false);
        toast.success('Site centre set to where you are now');
      },
      (error) => {
        setLocating(false);
        toast.error('Could not get your location', error.message);
      },
      { enableHighAccuracy: true, timeout: 15_000 },
    );
  };

  const onCreate = async () => {
    if (!form.name.trim() || form.latitude === '' || form.longitude === '') {
      toast.error('Add a name and the site location');
      return;
    }
    setSaving(true);
    try {
      await createWorkSite({
        ...form,
        address: form.address || undefined,
        latitude: Number(form.latitude),
        longitude: Number(form.longitude),
      });
      toast.success('Site created');
      setForm(EMPTY);
      setShowForm(false);
      await load();
    } catch (error) {
      toast.error('Could not create site', error instanceof ApiError ? error.message : undefined);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <DashHero
        eyebrow="Workforce"
        title="Sites and placed workers"
        subtitle="Track who is on site, catch no-shows early, and send standby cover before work stops."
        actions={
          <button type="button" className="btn-primary" onClick={() => setShowForm((value) => !value)}>
            <Plus className="h-4 w-4" />
            New site
          </button>
        }
      />

      <AnimatePresence initial={false}>
        {showForm ? (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <DashPanel title="New site">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField label="Site name">
                  <input
                    className="input-field"
                    value={form.name}
                    onChange={(e) => set('name', e.target.value)}
                    placeholder="e.g. Lekki Scheme 1 · Gate 3"
                  />
                </FormField>
                <FormField label="Address" optional>
                  <input className="input-field" value={form.address} onChange={(e) => set('address', e.target.value)} />
                </FormField>
                <FormField
                  label="Site centre"
                  className="sm:col-span-2"
                  help="Stand at the site gate and tap “Use my location”, or paste the map coordinates."
                >
                  <div className="grid grid-cols-1 gap-2 min-[400px]:grid-cols-[1fr_1fr_auto]">
                    <input
                      className="input-field"
                      inputMode="decimal"
                      placeholder="Latitude e.g. 6.4474"
                      value={form.latitude}
                      onChange={(e) => set('latitude', e.target.value)}
                    />
                    <input
                      className="input-field"
                      inputMode="decimal"
                      placeholder="Longitude e.g. 3.4723"
                      value={form.longitude}
                      onChange={(e) => set('longitude', e.target.value)}
                    />
                    <button type="button" className="btn-secondary" onClick={useMyLocation} disabled={locating}>
                      {locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Crosshair className="h-4 w-4" />}
                      Use my location
                    </button>
                  </div>
                </FormField>
                <FormField label={`Geofence: ${form.radiusMeters} m`} help="Workers can only check in inside this circle.">
                  <input
                    type="range"
                    min={50}
                    max={1000}
                    step={25}
                    value={form.radiusMeters}
                    onChange={(e) => set('radiusMeters', Number(e.target.value))}
                    className="w-full accent-[var(--brand)]"
                  />
                </FormField>
                <div className="grid grid-cols-2 gap-2">
                  <FormField label="Shift starts">
                    <input type="time" className="input-field" value={form.shiftStart} onChange={(e) => set('shiftStart', e.target.value)} />
                  </FormField>
                  <FormField label="Shift ends">
                    <input type="time" className="input-field" value={form.shiftEnd} onChange={(e) => set('shiftEnd', e.target.value)} />
                  </FormField>
                </div>
                <FormField label="Grace minutes" help="After this, a missing worker is marked as a no-show.">
                  <input
                    type="number"
                    min={0}
                    max={120}
                    className="input-field"
                    value={form.graceMinutes}
                    onChange={(e) => set('graceMinutes', Number(e.target.value))}
                  />
                </FormField>
                <FormField label="Cover promise (hours)" help="How fast you promise a replacement after a no-show.">
                  <input
                    type="number"
                    min={1}
                    max={168}
                    className="input-field"
                    value={form.slaCoverHours}
                    onChange={(e) => set('slaCoverHours', Number(e.target.value))}
                  />
                </FormField>
              </div>
              <div className="mt-5 flex flex-col gap-2 min-[400px]:flex-row">
                <button type="button" className="btn-primary" disabled={saving} onClick={onCreate}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Create site
                </button>
                <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>
                  Cancel
                </button>
              </div>
            </DashPanel>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {sites === null ? (
        <p className="flex items-center gap-2 text-sm text-muted">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading sites…
        </p>
      ) : sites.length === 0 ? (
        <DashPanel>
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <Radar className="h-8 w-8 text-brand" />
            <p className="font-semibold text-foreground">No sites yet</p>
            <p className="max-w-sm text-sm text-muted">
              Add your first site, then place workers on it. They check in from their phone when they arrive.
            </p>
          </div>
        </DashPanel>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {sites.map((site, index) => (
            <motion.div
              key={site.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04 }}
            >
              <Link
                href={`/dashboard/workforce/${site.id}`}
                className="dash-panel group flex h-full flex-col gap-3 p-4 transition hover:-translate-y-0.5 hover:border-brand/40"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-foreground">{site.name}</p>
                    <p className="flex items-center gap-1 truncate text-xs text-muted">
                      <MapPin className="h-3 w-3 shrink-0" />
                      {site.address || `${site.latitude.toFixed(4)}, ${site.longitude.toFixed(4)}`}
                    </p>
                  </div>
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-brand-soft px-2 py-0.5 text-[10px] font-semibold text-brand">
                    <ShieldCheck className="h-3 w-3" /> {site.radiusMeters}m
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-xl bg-surface px-2 py-2">
                    <p className="font-display text-lg font-semibold text-foreground">
                      {site.onSiteToday}/{site.crew}
                    </p>
                    <p className="text-[10px] text-muted">On site</p>
                  </div>
                  <div className="rounded-xl bg-surface px-2 py-2">
                    <p className="font-display text-lg font-semibold text-foreground">{site.standby}</p>
                    <p className="text-[10px] text-muted">Standby</p>
                  </div>
                  <div className={`rounded-xl px-2 py-2 ${site.openCovers ? 'bg-amber-500/10' : 'bg-surface'}`}>
                    <p className="font-display text-lg font-semibold text-foreground">{site.openCovers}</p>
                    <p className="text-[10px] text-muted">Open cover</p>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-muted">
                  <span className="flex items-center gap-1">
                    {site.openCovers ? <AlertTriangle className="h-3 w-3 text-amber-500" /> : <Users className="h-3 w-3" />}
                    Shift {site.shiftStart}–{site.shiftEnd}
                  </span>
                  <span className="flex items-center gap-1 font-semibold text-brand">
                    Open console
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                  </span>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
