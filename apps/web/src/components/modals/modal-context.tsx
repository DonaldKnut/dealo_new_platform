'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type ModalType = 'hire' | 'login' | 'register' | 'contact' | 'forgot-password' | 'faq' | null;

/** Details a signed-in employer already gave us, so the hire form starts filled in. */
export type HirePrefill = {
  companyName?: string;
  contactName?: string;
  email?: string;
  phone?: string;
};

type OpenOptions = { hirePrefill?: HirePrefill };

interface ModalContextValue {
  openModal: ModalType;
  hirePrefill: HirePrefill | null;
  open: (modal: Exclude<ModalType, null>, options?: OpenOptions) => void;
  close: () => void;
  switchTo: (modal: Exclude<ModalType, null>) => void;
}

const ModalContext = createContext<ModalContextValue | null>(null);

export function ModalProvider({ children }: { children: ReactNode }) {
  const [openModal, setOpenModal] = useState<ModalType>(null);
  const [hirePrefill, setHirePrefill] = useState<HirePrefill | null>(null);

  const open = useCallback((modal: Exclude<ModalType, null>, options?: OpenOptions) => {
    setHirePrefill(options?.hirePrefill ?? null);
    setOpenModal(modal);
  }, []);

  const close = useCallback(() => {
    setOpenModal(null);
  }, []);

  const switchTo = useCallback((modal: Exclude<ModalType, null>) => {
    setOpenModal(modal);
  }, []);

  const value = useMemo(
    () => ({ openModal, hirePrefill, open, close, switchTo }),
    [openModal, hirePrefill, open, close, switchTo],
  );

  return <ModalContext.Provider value={value}>{children}</ModalContext.Provider>;
}

export function useModal(): ModalContextValue {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModal must be used within ModalProvider');
  }
  return context;
}
