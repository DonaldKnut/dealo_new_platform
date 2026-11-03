'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';

import { cn } from '@/lib/utils';

export type ToastTone = 'info' | 'success' | 'error' | 'warning';

type ToastItem = {
  id: string;
  title: string;
  description?: string;
  tone: ToastTone;
};

type ToastInput = {
  title: string;
  description?: string;
  tone?: ToastTone;
  durationMs?: number;
};

type ToastContextValue = {
  push: (input: ToastInput) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
  warning: (title: string, description?: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const ICONS = {
  info: Info,
  success: CheckCircle2,
  error: AlertTriangle,
  warning: AlertTriangle,
} as const;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const dismiss = useCallback((id: string) => {
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  const push = useCallback(
    (input: ToastInput) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const tone = input.tone ?? 'info';
      setItems((current) => [
        ...current,
        { id, title: input.title, description: input.description, tone },
      ]);
      window.setTimeout(() => dismiss(id), input.durationMs ?? 4200);
    },
    [dismiss],
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      push,
      success: (title, description) => push({ title, description, tone: 'success' }),
      error: (title, description) => push({ title, description, tone: 'error' }),
      info: (title, description) => push({ title, description, tone: 'info' }),
      warning: (title, description) => push({ title, description, tone: 'warning' }),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      {mounted
        ? createPortal(
            <div className="pointer-events-none fixed inset-x-0 top-4 z-[120] flex flex-col items-end gap-2 px-3 sm:top-6 sm:px-6">
              <AnimatePresence>
                {items.map((item) => {
                  const Icon = ICONS[item.tone];
                  return (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: -12, x: 16, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, x: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, x: 12, scale: 0.96 }}
                      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                      className={cn(
                        'pointer-events-auto relative w-[min(22rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border p-3.5 shadow-[0_20px_50px_rgba(4,47,46,0.28)] backdrop-blur-xl',
                        'border-[#d7e8e6] bg-[linear-gradient(145deg,rgba(255,255,255,0.96),rgba(244,250,249,0.92))]',
                        'dark:border-[#1e4a30] dark:bg-[linear-gradient(145deg,rgba(18,56,37,0.96),rgba(7,31,20,0.94))]',
                      )}
                      role="status"
                      aria-live="polite"
                    >
                      <div className="pointer-events-none absolute inset-0 opacity-30 [background-image:radial-gradient(circle_at_1px_1px,rgba(15,118,110,0.22)_1px,transparent_0)] [background-size:14px_14px] dark:opacity-25 dark:[background-image:radial-gradient(circle_at_1px_1px,rgba(124,255,77,0.18)_1px,transparent_0)]" />
                      <div className="relative flex items-start gap-3">
                        <span
                          className={cn(
                            'mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl',
                            item.tone === 'success' && 'bg-[#067647]/15 text-[#067647] dark:bg-[#7cff4d]/20 dark:text-[#7cff4d]',
                            item.tone === 'error' && 'bg-[#b42318]/15 text-[#b42318] dark:bg-[#f97066]/20 dark:text-[#f97066]',
                            item.tone === 'warning' &&
                              'bg-amber-500/20 text-amber-800 dark:text-amber-300',
                            item.tone === 'info' && 'bg-[#ccfbf1] text-[#0f766e] dark:bg-[#0f3d22] dark:text-[#7cff4d]',
                          )}
                        >
                          <Icon className="h-4 w-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-[#0b1f1e] dark:text-[#eaffdf]">
                            {item.title}
                          </p>
                          {item.description ? (
                            <p className="mt-1 text-xs leading-relaxed text-[#3d5554] dark:text-[#b8d4b6]">
                              {item.description}
                            </p>
                          ) : null}
                        </div>
                        <button
                          type="button"
                          className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-full text-[#5b6f6e] transition hover:bg-[#f4faf9] hover:text-[#0b1f1e] dark:text-[#9cbc9a] dark:hover:bg-[#0c2c1a] dark:hover:text-[#eaffdf]"
                          aria-label="Dismiss notification"
                          onClick={() => dismiss(item.id)}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>,
            document.body,
          )
        : null}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return ctx;
}
