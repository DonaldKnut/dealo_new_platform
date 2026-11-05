'use client';

import { applySchema } from '@dealo/shared';
import { useState } from 'react';

import { FormField } from '@/components/forms/form-field';
import { useToast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api';
import { atsApi } from '@/lib/ats-api';

const SOURCES = [
  { id: 'referral', label: 'Referral' },
  { id: 'walk-in', label: 'Walk-in' },
  { id: 'whatsapp', label: 'WhatsApp' },
  { id: 'linkedin', label: 'LinkedIn' },
  { id: 'jobberman', label: 'Jobberman' },
  { id: 'other', label: 'Other' },
];

export function AddApplicantForm({ orgId, jobId, onAdded }: { orgId: string; jobId: string; onAdded: () => void }) {
  const toast = useToast();
  const [values, setValues] = useState({ name: '', email: '', phone: '', location: '', coverNote: '' });
  const [source, setSource] = useState('referral');
  const [cv, setCv] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    const parsed = applySchema.safeParse(values);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Check the form');
      return;
    }
    const form = new FormData();
    for (const [key, value] of Object.entries(parsed.data)) if (value) form.append(key, String(value));
    if (cv) form.append('cv', cv);
    setSaving(true);
    try {
      await atsApi.addApplicant(orgId, jobId, form, source);
      toast.success('Added', 'AI screening runs in the background.');
      onAdded();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not add this person');
    } finally {
      setSaving(false);
    }
  };

  const field = (key: keyof typeof values) => ({
    value: values[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setValues((v) => ({ ...v, [key]: e.target.value })),
  });

  return (
    <form onSubmit={submit} className="space-y-3 py-2">
      <FormField label="Full name">
        <input className="input-field" {...field('name')} maxLength={140} />
      </FormField>
      <FormField label="Email">
        <input className="input-field" type="email" {...field('email')} />
      </FormField>
      <div className="grid gap-3 sm:grid-cols-2">
        <FormField label="Phone" optional>
          <input className="input-field" type="tel" {...field('phone')} />
        </FormField>
        <FormField label="Lives in" optional>
          <input className="input-field" {...field('location')} />
        </FormField>
      </div>
      <FormField label="Where they came from">
        <select className="input-field" value={source} onChange={(e) => setSource(e.target.value)}>
          {SOURCES.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </FormField>
      <FormField label="Notes" optional>
        <textarea className="input-field min-h-[4.5rem]" {...field('coverNote')} maxLength={3000} />
      </FormField>
      <FormField label="CV" optional hint="PDF or Word, up to 8 MB.">
        <input
          type="file"
          accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onChange={(e) => setCv(e.target.files?.[0] ?? null)}
          className="block w-full min-w-0 text-xs text-muted file:mr-2 file:rounded-full file:border-0 file:bg-brand-soft file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-brand"
        />
      </FormField>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <button type="submit" className="btn-primary w-full" disabled={saving}>
        {saving ? 'Adding…' : 'Add to job'}
      </button>
    </form>
  );
}
