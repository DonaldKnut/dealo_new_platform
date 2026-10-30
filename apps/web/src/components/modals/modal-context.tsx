'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type ModalType = 'hire' | 'login' | 'register' | 'contact' | 'forgot-password' | null;

interface ModalContextValue {
  openModal: ModalType;
  open: (modal: Exclude<ModalType, null>) => void;
  close: () => void;
  switchTo: (modal: Exclude<ModalType, null>) => void;
}

const ModalContext = createContext<ModalContextValue | null>(null);

export function ModalProvider({ children }: { children: ReactNode }) {
  const [openModal, setOpenModal] = useState<ModalType>(null);

  const open = useCallback((modal: Exclude<ModalType, null>) => {
    setOpenModal(modal);
  }, []);

  const close = useCallback(() => {
    setOpenModal(null);
  }, []);

  const switchTo = useCallback((modal: Exclude<ModalType, null>) => {
    setOpenModal(modal);
  }, []);

  const value = useMemo(
    () => ({ openModal, open, close, switchTo }),
    [openModal, open, close, switchTo],
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
