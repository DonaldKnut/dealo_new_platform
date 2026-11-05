'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { supportTicketCreateSchema, type SupportTicketCreateInput } from '@dealo/shared';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Headphones,
  Flag,
  MessageSquareText,
  X,
} from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useForm } from 'react-hook-form';

import { useLocale } from '@/components/i18n/locale-context';
import { useToast } from '@/components/ui/toast';
import { useAuthSession } from '@/hooks/use-auth-session';
import { ApiError, apiFetch } from '@/lib/api';
import { logClientAudit } from '@/lib/client-audit';
import { cn } from '@/lib/utils';

const STEPS = [
  {
    id: 1,
    titleKey: 'support.stepAbout' as const,
    hintKey: 'support.stepAboutHint' as const,
    fields: ['subject', 'category'] as const,
  },
  {
    id: 2,
    titleKey: 'support.stepDescribe' as const,
    hintKey: 'support.stepDescribeHint' as const,
    fields: ['body'] as const,
  },
  {
    id: 3,
    titleKey: 'support.stepPriority' as const,
    hintKey: 'support.stepPriorityHint' as const,
    fields: ['priority'] as const,
  },
] as const;

export function SupportTicketWidget() {
  const { user } = useAuthSession();
  const pathname = usePathname();
  const { t } = useLocale();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState(0);

  const {
    register,
    handleSubmit,
    reset,
    trigger,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SupportTicketCreateInput>({
    resolver: zodResolver(supportTicketCreateSchema),
    defaultValues: {
      subject: '',
      body: '',
      priority: 'NORMAL',
      category: 'general',
    },
  });

  const values = watch();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  if (!user || pathname.startsWith('/resume-builder/')) return null;

  const close = () => {
    setOpen(false);
    setStep(0);
  };

  const goNext = async () => {
    const fields = [...STEPS[step].fields];
    const ok = await trigger(fields);
    if (ok) setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const onSubmit = handleSubmit(async (formValues) => {
    try {
      await apiFetch('/support/tickets', { method: 'POST', json: formValues });
      logClientAudit({ action: 'SUPPORT_TICKET_CREATED_UI', entityType: 'SupportTicket' });
      toast.success(t('support.success'));
      reset();
      close();
    } catch (error) {
      toast.error(t('toast.error'), error instanceof ApiError ? error.message : undefined);
    }
  });

  const current = STEPS[step];

  const modal =
    mounted && open
      ? createPortal(
          <AnimatePresence>
            <motion.div
              className="fixed inset-0 z-[200] flex items-end justify-center p-3 sm:items-center sm:p-5"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.button
                type="button"
                className="absolute inset-0 cursor-pointer bg-black/55"
                aria-label="Close"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={close}
              />

              <motion.div
                role="dialog"
                aria-modal="true"
                aria-labelledby="support-ticket-title"
                initial={{ opacity: 0, y: 36, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 24, scale: 0.97 }}
                transition={{ type: 'spring', stiffness: 320, damping: 28 }}
                className="relative z-10 flex max-h-[min(92dvh,36rem)] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-[#d7e8e6] bg-white shadow-[0_28px_70px_rgba(4,47,46,0.32)] dark:border-[#1e4a30] dark:bg-[#123825]"
              >
                <div className="relative shrink-0 overflow-hidden border-b border-[#d7e8e6] bg-[linear-gradient(135deg,#ecfdf8,#ccfbf1_45%,#f0fdfa)] px-5 pb-4 pt-5 dark:border-[#1e4a30] dark:bg-[linear-gradient(135deg,#0c2c1a,#0f3d22,#071f14)]">
                  <div className="pointer-events-none absolute -right-6 -top-8 h-28 w-28 rounded-full bg-[#14b8a6]/25 blur-2xl dark:bg-[#7cff4d]/15" />
                  <div className="relative flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#0f766e] dark:text-[#7cff4d]">
                        {t('support.open')} · Step {step + 1}/{STEPS.length}
                      </p>
                      <h2
                        id="support-ticket-title"
                        className="mt-1 font-display text-2xl text-[#0b1f1e] dark:text-[#eaffdf]"
                      >
                        {t('support.title')}
                      </h2>
                    </div>
                    <button
                      type="button"
                      className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-[#d7e8e6] bg-white/80 text-[#5b6f6e] dark:border-[#1e4a30] dark:bg-[#071f14]/60 dark:text-[#9cbc9a]"
                      onClick={close}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="relative mt-4 flex gap-2">
                    {STEPS.map((item, index) => (
                      <div
                        key={item.id}
                        className={cn(
                          'h-1.5 flex-1 rounded-full transition-colors',
                          index <= step
                            ? 'bg-[#0f766e] dark:bg-[#7cff4d]'
                            : 'bg-[#0f766e]/15 dark:bg-[#7cff4d]/15',
                        )}
                      />
                    ))}
                  </div>
                </div>

                <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
                  <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={current.id}
                        initial={{ opacity: 0, x: 18 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -14 }}
                        transition={{ duration: 0.22 }}
                      >
                        <div className="mb-4 flex items-start gap-3">
                          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#ccfbf1] text-[#0f766e] dark:bg-[#0f3d22] dark:text-[#7cff4d]">
                            {step === 0 ? (
                              <MessageSquareText className="h-4.5 w-4.5 h-[1.1rem] w-[1.1rem]" />
                            ) : step === 1 ? (
                              <Headphones className="h-[1.1rem] w-[1.1rem]" />
                            ) : (
                              <Flag className="h-[1.1rem] w-[1.1rem]" />
                            )}
                          </span>
                          <div>
                            <h3 className="font-display text-lg text-[#0b1f1e] dark:text-[#eaffdf]">
                              {t(current.titleKey)}
                            </h3>
                            <p className="mt-1 text-sm leading-relaxed text-[#3d5554] dark:text-[#b8d4b6]">
                              {t(current.hintKey)}
                            </p>
                          </div>
                        </div>

                        {step === 0 ? (
                          <div className="space-y-3">
                            <label className="block text-sm font-semibold text-[#0b1f1e] dark:text-[#eaffdf]">
                              {t('support.subject')}
                              <input
                                className="input-field mt-1.5 text-[#0b1f1e] dark:text-[#eaffdf]"
                                placeholder="e.g. Shortlist not updating"
                                {...register('subject')}
                              />
                            </label>
                            {errors.subject ? (
                              <p className="text-xs text-[#b42318] dark:text-[#f97066]">
                                {errors.subject.message}
                              </p>
                            ) : null}

                            <label className="block text-sm font-semibold text-[#0b1f1e] dark:text-[#eaffdf]">
                              {t('support.category')}
                              <select
                                className="input-field mt-1.5 text-[#0b1f1e] dark:text-[#eaffdf]"
                                {...register('category')}
                              >
                                <option value="general">{t('support.cat.general')}</option>
                                <option value="hiring">{t('support.cat.hiring')}</option>
                                <option value="talent">{t('support.cat.talent')}</option>
                                <option value="billing">{t('support.cat.billing')}</option>
                                <option value="technical">{t('support.cat.technical')}</option>
                              </select>
                            </label>
                          </div>
                        ) : null}

                        {step === 1 ? (
                          <div className="space-y-3">
                            <label className="block text-sm font-semibold text-[#0b1f1e] dark:text-[#eaffdf]">
                              {t('support.body')}
                              <textarea
                                className="input-field mt-1.5 min-h-[9rem] text-[#0b1f1e] dark:text-[#eaffdf]"
                                placeholder="What happened, what you expected, and any useful links or names…"
                                {...register('body')}
                              />
                            </label>
                            {errors.body ? (
                              <p className="text-xs text-[#b42318] dark:text-[#f97066]">
                                {errors.body.message}
                              </p>
                            ) : null}
                          </div>
                        ) : null}

                        {step === 2 ? (
                          <div className="space-y-4">
                            <label className="block text-sm font-semibold text-[#0b1f1e] dark:text-[#eaffdf]">
                              {t('support.priority')}
                              <select
                                className="input-field mt-1.5 text-[#0b1f1e] dark:text-[#eaffdf]"
                                {...register('priority')}
                              >
                                <option value="LOW">{t('support.pri.low')}</option>
                                <option value="NORMAL">{t('support.pri.normal')}</option>
                                <option value="HIGH">{t('support.pri.high')}</option>
                                <option value="URGENT">{t('support.pri.urgent')}</option>
                              </select>
                            </label>

                            <div className="rounded-xl border border-[#d7e8e6] bg-[#f4faf9] p-3 dark:border-[#1e4a30] dark:bg-[#071f14]/60">
                              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#0f766e] dark:text-[#7cff4d]">
                                {t('support.review')}
                              </p>
                              <p className="mt-2 text-sm font-semibold text-[#0b1f1e] dark:text-[#eaffdf]">
                                {values.subject || '—'}
                              </p>
                              <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-[#3d5554] dark:text-[#b8d4b6]">
                                {values.body || '—'}
                              </p>
                              <p className="mt-2 text-xs font-medium text-[#5b6f6e] dark:text-[#9cbc9a]">
                                {values.category} · {values.priority}
                              </p>
                            </div>
                          </div>
                        ) : null}
                      </motion.div>
                    </AnimatePresence>
                  </div>

                  <div className="flex shrink-0 items-center justify-between gap-2 border-t border-[#d7e8e6] bg-[#f8fffe] px-5 py-3 dark:border-[#1e4a30] dark:bg-[#071f14]/70">
                    {step > 0 ? (
                      <button
                        type="button"
                        className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-[#d7e8e6] px-3 py-1.5 text-xs font-semibold text-[#0b1f1e] dark:border-[#1e4a30] dark:text-[#eaffdf]"
                        onClick={() => setStep((s) => s - 1)}
                      >
                        <ArrowLeft className="h-3.5 w-3.5" />
                        {t('support.back')}
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="cursor-pointer text-xs font-medium text-[#5b6f6e] dark:text-[#9cbc9a]"
                        onClick={close}
                      >
                        {t('support.cancel')}
                      </button>
                    )}

                    {step < STEPS.length - 1 ? (
                      <button
                        type="button"
                        className="btn-primary inline-flex cursor-pointer items-center gap-1.5 px-4 py-1.5 text-xs"
                        onClick={() => void goNext()}
                      >
                        {t('support.next')}
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    ) : (
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="btn-primary inline-flex cursor-pointer items-center gap-1.5 px-4 py-1.5 text-xs disabled:opacity-60"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {isSubmitting ? t('support.sending') : t('support.submit')}
                      </button>
                    )}
                  </div>
                </form>
              </motion.div>
            </motion.div>
          </AnimatePresence>,
          document.body,
        )
      : null;

  return (
    <>
      <button
        type="button"
        data-tour="support-help"
        className={cn(
          'fixed right-2 z-[90] inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-white/30 bg-[linear-gradient(145deg,rgba(15,118,110,0.92),rgba(4,47,46,0.88))] text-white shadow-[0_16px_40px_rgba(4,47,46,0.35)] backdrop-blur-md transition hover:scale-105 min-[340px]:right-4 min-[340px]:h-12 min-[340px]:w-12 sm:right-6',
          pathname.startsWith('/dashboard')
            ? 'bottom-[calc(4.75rem+var(--safe-bottom))] lg:bottom-6'
            : 'bottom-[calc(4rem+var(--safe-bottom))] min-[340px]:bottom-20 sm:bottom-24',
        )}
        aria-label={t('support.open')}
        onClick={() => {
          setStep(0);
          setOpen(true);
        }}
      >
        <Headphones className="h-5 w-5" />
      </button>
      {modal}
    </>
  );
}
