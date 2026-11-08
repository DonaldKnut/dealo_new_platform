'use client';

import { motion } from 'framer-motion';
import { AlertTriangle, ArrowRight, Loader2, MapPin, Plus, Radar, ShieldCheck, Users } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

import { DashHero, DashPanel } from '@/components/dashboard/dashboard-ui';
import { coordsOf, EMPTY_SITE, NewSiteForm, type SiteDraft } from '@/components/dashboard/new-site-form';
import { FormModal } from '@/components/ui/form-modal';
import { useToast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api';
import { createWorkSite, fetchWorkSites, type WorkSiteRow } from '@/lib/dashboard-api';

export function WorkforceSitesPanel() {
  const toast = useToast();
  const [sites, setSites] = useState<WorkSiteRow[] | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<SiteDraft>(EMPTY_SITE);
  const [locating, setLocating] = useState(false);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [showErrors, setShowErrors] = useState(false);

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

  const set = <K extends keyof SiteDraft>(key: K, value: SiteDraft[K]) => setForm((current) => ({ ...current, [key]: value }));

  const close = () => {
    setShowForm(false);
    setShowErrors(false);
    setAccuracy(null);
  };

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
        setAccuracy(position.coords.accuracy);
        setLocating(false);
        toast.success('Site centre set to where you are now');
      },
      (error) => {
        setLocating(false);
        toast.error(
          'Could not get your location',
          error.code === error.PERMISSION_DENIED ? 'Allow location for this site in your browser settings, or paste the coordinates instead.' : error.message,
        );
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 },
    );
  };

  const onCreate = async () => {
    const coords = coordsOf(form);
    if (form.name.trim().length < 2 || !coords) {
      setShowErrors(true);
      toast.error('A few details are missing', 'Add a site name and set the site centre.');
      return;
    }
    setSaving(true);
    try {
      const site = await createWorkSite({
        ...form,
        name: form.name.trim(),
        address: form.address.trim() || undefined,
        latitude: coords.lat,
        longitude: coords.lng,
      });
      toast.success('Site created', `${site.name} is ready. Add workers from its console.`);
      setForm(EMPTY_SITE);
      close();
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
          <button type="button" className="btn-primary" onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4" />
            New site
          </button>
        }
      />

      <FormModal
        open={showForm}
        onClose={close}
        icon={Radar}
        title="New site"
        description="Workers check in from their phones when they are inside the site circle."
        size="xl"
        footer={
          <>
            <button type="button" className="btn-secondary" onClick={close}>
              Cancel
            </button>
            <button type="button" className="btn-primary" disabled={saving} onClick={onCreate}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {saving ? 'Creating…' : 'Create site'}
            </button>
          </>
        }
      >
        <NewSiteForm form={form} set={set} locating={locating} accuracy={accuracy} onLocate={useMyLocation} showErrors={showErrors} />
      </FormModal>

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
