'use client';

import { useEffect } from 'react';

import { useModal, type ModalType } from '@/components/modals/modal-context';

export function OpenModalOnMount({ modal }: { modal: Exclude<ModalType, null> }) {
  const { open } = useModal();

  useEffect(() => {
    open(modal);
  }, [modal, open]);

  return null;
}
