'use client';

import { motion } from 'framer-motion';
import { CheckCircle2, Clock3, Loader2, LogIn, LogOut, MapPin, Navigation, ShieldCheck } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { DashHero, DashPanel } from '@/components/dashboard/dashboard-ui';
import { useToast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api';
import {
  checkInPlacement,
  checkOutPlacement,
  fetchMyPlacements,
  type MyPlacement,
} from '@/lib/dashboard-api';
import { cn } from '@/lib/utils';

function getPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Location is not available on this phone.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 20_000,
      maximumAge: 0,
    });
  });
}

function locationErrorMessage(error: unknown) {
  if (error && typeof error === 'object' && 'code' in error) {
    const code = (error as GeolocationPositionError).code;
    if (code === 1) return 'Please allow location for Dealo in your phone settings, then try again.';
    if (code === 3) return 'Getting your location took too long. Step outside or near a window and try again.';
  }
  return error instanceof Error ? error.message : 'Could not get your location.';
}

export function TalentCheckInPanel() {
  const toast = useToast();
  const [placements, setPlacements] = useState<MyPlacement[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setPlacements(await fetchMyPlacements());
    } catch (error) {
      toast.error('Could not load your sites', error instanceof ApiError ? error.message : undefined);
      setPlacements([]);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const act = async (placement: MyPlacement, kind: 'in' | 'out') => {
    setBusy(placement.placementId);
    try {
      const position = await getPosition();
      const payload = {
        placementId: placement.placementId,
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracyMeters: position.coords.accuracy,
      };
      if (kind === 'in') {
        const result = await checkInPlacement(payload);
        if (result.alreadyDone) toast.info('You already checked in today');
        else if (result.lateMinutes) toast.success('Checked in', `You are ${result.lateMinutes} minutes late. Please tell your supervisor.`);
        else toast.success('Checked in. Have a good shift!');
      } else {
        await checkOutPlacement(payload);
        toast.success('Checked out. Thank you!');
      }
      await load();
    } catch (error) {
      toast.error(
        kind === 'in' ? 'Check-in failed' : 'Check-out failed',
        error instanceof ApiError ? error.message : locationErrorMessage(error),
      );
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6">
      <DashHero
        eyebrow="Check in"
        title="Your site today"
        subtitle="When you arrive, tap Check in. Your phone confirms you are at the site. Tap Check out when you leave."
      />

      {placements === null ? (
        <p className="flex items-center gap-2 text-sm text-muted">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </p>
      ) : placements.length === 0 ? (
        <DashPanel>
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <MapPin className="h-8 w-8 text-brand" />
            <p className="font-semibold text-foreground">No site yet</p>
            <p className="max-w-sm text-sm text-muted">
              When Dealo places you on a job, your site will show here and you can check in from your phone.
            </p>
          </div>
        </DashPanel>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {placements.map((placement) => {
            const checkedIn = Boolean(placement.today.checkInAt);
            const checkedOut = Boolean(placement.today.checkOutAt);
            const loading = busy === placement.placementId;
            return (
              <DashPanel key={placement.placementId}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-display text-xl font-semibold text-foreground">{placement.site.name}</p>
                    <p className="text-sm text-muted">
                      {placement.roleTitle}
                      {placement.isStandby ? ' · standby' : ''}
                    </p>
                  </div>
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-brand-soft px-2 py-1 text-[11px] font-semibold text-brand">
                    <ShieldCheck className="h-3 w-3" /> {placement.site.radiusMeters}m
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                  <span className="flex items-center gap-1">
                    <Clock3 className="h-3.5 w-3.5" /> {placement.site.shiftStart}–{placement.site.shiftEnd} {placement.site.zone}
                  </span>
                  {placement.site.address ? (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" /> {placement.site.address}
                    </span>
                  ) : null}
                  <a
                    className="flex items-center gap-1 font-semibold text-brand"
                    href={`https://www.google.com/maps/dir/?api=1&destination=${placement.site.latitude},${placement.site.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Navigation className="h-3.5 w-3.5" /> Directions
                  </a>
                </div>

                <div className="mt-5 flex flex-col items-center gap-3">
                  {checkedOut ? (
                    <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <CheckCircle2 className="h-5 w-5 text-brand" /> Shift done for today
                    </p>
                  ) : (
                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.96 }}
                      disabled={loading}
                      onClick={() => void act(placement, checkedIn ? 'out' : 'in')}
                      className={cn(
                        'relative flex h-36 w-36 flex-col items-center justify-center gap-1 rounded-full text-base font-semibold shadow-xl transition min-[340px]:h-40 min-[340px]:w-40',
                        checkedIn
                          ? 'border-2 border-brand bg-surface-elevated text-brand'
                          : 'bg-brand text-white shadow-brand/30 dark:text-[#071f14]',
                      )}
                    >
                      {!checkedIn && !loading ? (
                        <span className="absolute inset-0 animate-ping rounded-full bg-brand/20" aria-hidden />
                      ) : null}
                      {loading ? (
                        <Loader2 className="h-7 w-7 animate-spin" />
                      ) : checkedIn ? (
                        <LogOut className="h-7 w-7" />
                      ) : (
                        <LogIn className="h-7 w-7" />
                      )}
                      {loading ? 'Finding you…' : checkedIn ? 'Check out' : 'Check in'}
                    </motion.button>
                  )}
                  <p className="text-center text-xs text-muted">
                    {checkedIn
                      ? `Checked in at ${new Date(placement.today.checkInAt as string).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}${placement.today.lateMinutes ? ` · ${placement.today.lateMinutes} min late` : ''}`
                      : `You must be within ${placement.site.radiusMeters} m of the site.`}
                  </p>
                </div>
              </DashPanel>
            );
          })}
        </div>
      )}
    </div>
  );
}
