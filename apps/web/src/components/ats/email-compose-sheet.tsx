'use client';

import { Send } from 'lucide-react';
import { useEffect, useState } from 'react';

import { FormField } from '@/components/forms/form-field';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { useToast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api';
import { atsApi, type EmailTemplate } from '@/lib/ats-api';

export function EmailComposeSheet({
  orgId,
  applicationIds,
  onClose,
  onSent,
}: {
  orgId: string;
  applicationIds: string[] | null;
  onClose: () => void;
  onSent?: () => void;
}) {
  const toast = useToast();
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [templateId, setTemplateId] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!applicationIds) return;
    atsApi
      .templates(orgId)
      .then((list) => {
        setTemplates(list);
        if (!subject && list[0]) {
          setTemplateId(list[0].id);
          setSubject(list[0].subject);
          setBody(list[0].body);
        }
      })
      .catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applicationIds, orgId]);

  const pick = (id: string) => {
    setTemplateId(id);
    const t = templates.find((x) => x.id === id);
    if (t) {
      setSubject(t.subject);
      setBody(t.body);
    }
  };

  const send = async () => {
    if (!applicationIds?.length || subject.trim().length < 2 || body.trim().length < 5) return;
    setSending(true);
    try {
      const { sent } = await atsApi.bulkEmail(orgId, applicationIds, subject.trim(), body.trim());
      toast.success(`Sent to ${sent} ${sent === 1 ? 'person' : 'people'}`);
      onSent?.();
      onClose();
    } catch (err) {
      toast.error('Could not send', err instanceof ApiError ? err.message : '');
    } finally {
      setSending(false);
    }
  };

  const count = applicationIds?.length ?? 0;

  return (
    <BottomSheet open={Boolean(applicationIds)} onClose={onClose} title={`Email ${count === 1 ? '1 person' : `${count} people`}`}>
      <div className="space-y-3 py-2">
        {templates.length ? (
          <FormField label="Start from">
            <select className="input-field" value={templateId} onChange={(e) => pick(e.target.value)}>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                  {t.builtIn ? ' (Dealo)' : ''}
                </option>
              ))}
            </select>
          </FormField>
        ) : null}
        <FormField label="Subject">
          <input className="input-field" value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={160} />
        </FormField>
        <FormField label="Message" hint="{{firstName}}, {{jobTitle}} and {{company}} are filled in for each person. Everyone gets their own copy.">
          <textarea className="input-field min-h-[10rem]" value={body} onChange={(e) => setBody(e.target.value)} maxLength={5000} />
        </FormField>
        <button type="button" className="btn-primary w-full" disabled={sending || !count} onClick={send}>
          <Send className="h-4 w-4" /> {sending ? 'Sending…' : 'Send'}
        </button>
      </div>
    </BottomSheet>
  );
}
