'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';

import { useModal, type ModalType } from '@/components/modals/modal-context';

type AuthModal = Exclude<ModalType, 'hire' | 'contact' | null>;

export function AuthNavLink({
  variant,
  href,
  modalView,
  children,
}: {
  variant: 'modal' | 'page';
  href: string;
  modalView: AuthModal;
  children: ReactNode;
}) {
  const modal = useModal();

  if (variant === 'page') {
    return (
      <Link href={href} className="font-semibold text-brand">
        {children}
      </Link>
    );
  }

  return (
    <button type="button" className="font-semibold text-brand" onClick={() => modal.switchTo(modalView)}>
      {children}
    </button>
  );
}
