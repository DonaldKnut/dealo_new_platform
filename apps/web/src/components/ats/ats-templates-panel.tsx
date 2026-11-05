'use client';

import { emailTemplateSchema } from '@dealo/shared';
import { Mail, Pencil, Plus, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { FormField } from '@/components/forms/form-field';
import { FormModal } from '@/components/ui/form-modal';
import { useToast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api';
import { atsApi, type EmailTemplate } from '@/lib/ats-api';

type Draft = { id?: string; name: string; subject: string; body: string };

export function AtsTemplatesPanel({ orgId }: { orgId: string }) {
  const toast = useToast();
  const [templates, setTemplates] = useState<EmailTemplate[] | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setTemplates(await atsApi.templates(orgId).catch(() => []));
  }, [orgId]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    if (!draft) return;
    const parsed = emailTemplateSchema.safeParse(draft);
    if (!parsed.success) {
      toast.error('Check the template', parsed.error.issues[0]?.message);
      return;
    }
    setSaving(true);
    try {
      if (draft.id) await atsApi.updateTemplate(orgId, draft.id, parsed.data);
      else await atsApi.createTemplate(orgId, parsed.data);
      toast.success('Template saved');
      setDraft(null);
      await load();
    } catch (err) {
      toast.error('Could not save', err instanceof ApiError ? err.message : '');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (t: EmailTemplate) => {
    if (!window.confirm(`Delete “${t.name}”?`)) return;
    try {
      await atsApi.deleteTemplate(orgId, t.id);
      await load();
    } catch (err) {
      toast.error('Could not delete', err instanceof ApiError ? err.message : '');
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-xs leading-relaxed text-muted">
        Saved messages for the board&apos;s Email button. Use {'{{firstName}}'}, {'{{jobTitle}}'} and {'{{company}}'}.
      </p>
      <ul className="space-y-2">
        {(templates ?? []).map((t) => (
          <li key={t.id} className="flex items-center gap-2 rounded-xl border border-border px-3 py-2">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-foreground">{t.name}</p>
              <p className="truncate text-xs text-muted">{t.subject}</p>
            </div>
            {t.builtIn ? (
              <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-muted">Dealo</span>
            ) : (
              <>
                <button type="button" aria-label={`Edit ${t.name}`} onClick={() => setDraft(t)} className="p-1 text-muted hover:text-brand">
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button type="button" aria-label={`Delete ${t.name}`} onClick={() => void remove(t)} className="p-1 text-muted hover:text-danger">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </>
            )}
          </li>
        ))}
      </ul>
      <button type="button" className="btn-secondary w-full text-sm" onClick={() => setDraft({ name: '', subject: '', body: 'Hi {{firstName}},\n\n\n\nThank you,\n{{company}}' })}>
        <Plus className="h-4 w-4" /> New template
      </button>

      <FormModal
        open={Boolean(draft)}
        onClose={() => setDraft(null)}
        icon={Mail}
        title={draft?.id ? 'Edit template' : 'New template'}
        description="{{firstName}}, {{jobTitle}} and {{company}} are filled in for each person."
        size="lg"
        footer={
          <>
            <button type="button" className="btn-secondary" onClick={() => setDraft(null)}>
              Cancel
            </button>
            <button type="button" className="btn-primary" disabled={saving} onClick={save}>
              {saving ? 'Saving…' : 'Save template'}
            </button>
          </>
        }
      >
        {draft ? (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Name">
                <input className="input-field" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Trade test invite" maxLength={80} />
              </FormField>
              <FormField label="Subject">
                <input className="input-field" value={draft.subject} onChange={(e) => setDraft({ ...draft, subject: e.target.value })} maxLength={160} />
              </FormField>
            </div>
            <FormField label="Message">
              <textarea className="input-field min-h-[14rem]" value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} maxLength={5000} />
            </FormField>
          </div>
        ) : null}
      </FormModal>
    </div>
  );
}
