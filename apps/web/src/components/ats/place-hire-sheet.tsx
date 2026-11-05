'use client';

import { MapPinCheck } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { FormField } from '@/components/forms/form-field';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { useToast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api';
import { atsApi } from '@/lib/ats-api';
import { fetchWorkSites, type WorkSiteRow } from '@/lib/dashboard-api';

export function PlaceHireSheet({
  orgId,
  applicationId,
  defaultRole,
  open,
  onClose,
  onPlaced,
}: {
  orgId: string;
  applicationId: string;
  defaultRole: string;
  open: boolean;
  onClose: () => void;
  onPlaced: () => void;
}) {
  const toast = useToast();
  const [sites, setSites] = useState<WorkSiteRow[] | null>(null);
  const [siteId, setSiteId] = useState('');
  const [roleTitle, setRoleTitle] = useState(defaultRole);
  const [isStandby, setIsStandby] = useState(false);
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || sites) return;
    fetchWorkSites()
      .then((list) => {
        setSites(list);
        setSiteId(list[0]?.id ?? '');
      })
      .catch(() => setSites([]));
  }, [open, sites]);

  const place = async () => {
    if (!siteId) return;
    setSaving(true);
    try {
      await atsApi.placeHire(orgId, applicationId, { siteId, roleTitle: roleTitle || undefined, isStandby, startDate });
      toast.success('Added to the site', 'They can now check in from their phone.');
      onPlaced();
      onClose();
    } catch (err) {
      toast.error('Could not place', err instanceof ApiError ? err.message : '');
    } finally {
      setSaving(false);
    }
  };

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={
        <span className="inline-flex items-center gap-1.5">
          <MapPinCheck className="h-4 w-4" /> Put on a Workforce site
        </span>
      }
    >
      <div className="space-y-3 py-2">
        {sites === null ? (
          <div className="h-24 animate-pulse rounded-xl bg-surface" />
        ) : sites.length === 0 ? (
          <p className="text-sm text-muted">
            No sites yet.{' '}
            <Link href="/dashboard/workforce" className="font-semibold text-brand">
              Add a site in Workforce
            </Link>
            .
          </p>
        ) : (
          <>
            <FormField label="Site">
              <select className="input-field" value={siteId} onChange={(e) => setSiteId(e.target.value)}>
                {sites.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Role on site">
              <input className="input-field" value={roleTitle} onChange={(e) => setRoleTitle(e.target.value)} maxLength={120} />
            </FormField>
            <FormField label="Start date">
              <input type="date" className="input-field" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </FormField>
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" checked={isStandby} onChange={(e) => setIsStandby(e.target.checked)} className="mt-1 accent-[var(--brand)]" />
              <span>
                Standby
                <span className="block text-xs text-muted">Ready to cover when someone on the crew does not show up.</span>
              </span>
            </label>
            <button type="button" className="btn-primary w-full" disabled={saving || !siteId} onClick={place}>
              {saving ? 'Adding…' : 'Add to site'}
            </button>
          </>
        )}
      </div>
    </BottomSheet>
  );
}
