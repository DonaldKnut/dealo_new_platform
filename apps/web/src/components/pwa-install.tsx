'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Download, X } from 'lucide-react';
import { useEffect, useState } from 'react';

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

const DISMISS_KEY = 'dealo.pwa.install.dismissed';

/** Registers the service worker and offers a one-tap install on supported browsers. */
export function PwaInstall() {
  const [promptEvent, setPromptEvent] = useState<InstallPromptEvent | null>(null);

  useEffect(() => {
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.register('/sw.js').catch(() => undefined);
    }

    const onPrompt = (event: Event) => {
      event.preventDefault();
      if (window.localStorage.getItem(DISMISS_KEY)) return;
      setPromptEvent(event as InstallPromptEvent);
    };
    const onInstalled = () => setPromptEvent(null);
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const dismiss = () => {
    window.localStorage.setItem(DISMISS_KEY, '1');
    setPromptEvent(null);
  };

  return (
    <AnimatePresence>
      {promptEvent ? (
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          className="pwa-hide fixed inset-x-2 bottom-[calc(5rem+var(--safe-bottom))] z-[95] mx-auto flex max-w-sm items-center gap-2 rounded-2xl border border-border bg-surface-elevated p-2.5 shadow-[0_18px_40px_rgba(4,47,46,0.25)] min-[340px]:gap-3 min-[340px]:p-3 lg:bottom-6 lg:left-6 lg:right-auto lg:mx-0"
        >
          <img src="/pwa-icon/192" alt="" className="h-9 w-9 shrink-0 rounded-xl" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground">Get the Dealo app</p>
            <p className="truncate text-[11px] text-muted">Faster, full screen, works offline</p>
          </div>
          <button
            type="button"
            className="btn-primary shrink-0 px-3 py-2 text-xs"
            onClick={async () => {
              await promptEvent.prompt();
              await promptEvent.userChoice;
              setPromptEvent(null);
            }}
          >
            <Download className="h-3.5 w-3.5" />
            Install
          </button>
          <button
            type="button"
            aria-label="Not now"
            onClick={dismiss}
            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
