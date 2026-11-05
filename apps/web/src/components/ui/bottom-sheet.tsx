'use client';

import type { ReactNode } from 'react';

import { FormModal } from './form-modal';

export { useCompactViewport } from './use-compact-viewport';

/** Short menus and confirmations: a sheet on phones, a small centred dialog on larger screens. */
export function BottomSheet({
  open,
  onClose,
  title,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <FormModal open={open} onClose={onClose} title={title} size="sm" mobile="auto" className={className}>
      {children}
    </FormModal>
  );
}
