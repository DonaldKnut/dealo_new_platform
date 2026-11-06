'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { contactSchema, type ContactInput } from '@dealo/shared';
import { useForm } from 'react-hook-form';

import { FormField } from '@/components/forms/form-field';
import { FormStatus } from '@/components/forms/form-status';
import { useToast } from '@/components/ui/toast';
import { WhatsAppIcon } from '@/components/whatsapp-icon';
import { useServerFormStatus } from '@/hooks/use-server-form-status';
import { ApiError, apiFetch } from '@/lib/api';
import { whatsappHref } from '@/lib/whatsapp';

export function ContactForm({ onSuccess }: { onSuccess?: () => void }) {
  const toast = useToast();
  const { serverError, serverMessage, setServerError, setServerMessage, clear } =
    useServerFormStatus();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ContactInput>({
    resolver: zodResolver(contactSchema),
    mode: 'onChange',
  });

  const canSubmit = contactSchema.safeParse(watch()).success;
  const whatsapp = whatsappHref('Hi Dealo, I have a question.');

  const onSubmit = handleSubmit(async (values) => {
    clear();
    try {
      const result = await apiFetch<{ message: string }>('/contact', {
        method: 'POST',
        json: values,
      });
      setServerMessage(result.message);
      toast.success('Message sent', result.message);
      reset();
      onSuccess?.();
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'We could not send your message.';
      setServerError(message);
      toast.error('Message failed', message);
    }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {whatsapp ? (
        <a
          href={whatsapp}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 rounded-2xl border border-[#25D366]/40 bg-[#25D366]/10 p-3 transition hover:bg-[#25D366]/15"
        >
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#25D366] text-white">
            <WhatsAppIcon className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-foreground">Faster on WhatsApp</span>
            <span className="block text-xs text-muted">Chat with our team now, or send the form below.</span>
          </span>
        </a>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Your name" error={errors.name?.message}>
          <input className="input-field" {...register('name')} />
        </FormField>
        <FormField label="Email" error={errors.email?.message}>
          <input type="email" className="input-field" {...register('email')} />
        </FormField>
      </div>
      <FormField label="Company (optional)">
        <input className="input-field" {...register('company')} />
      </FormField>
      <FormField label="What is it about?" error={errors.subject?.message}>
        <input className="input-field" {...register('subject')} />
      </FormField>
      <FormField label="Message" error={errors.message?.message}>
        <textarea rows={5} className="input-field" {...register('message')} />
      </FormField>
      <FormStatus error={serverError} message={serverMessage} />
      <button type="submit" className="btn-primary w-full" disabled={!canSubmit || isSubmitting}>
        {isSubmitting ? 'Sending…' : 'Send message'}
      </button>
    </form>
  );
}
