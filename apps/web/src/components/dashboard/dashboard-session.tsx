'use client';

import { createContext, useCallback, useContext, type Dispatch, type SetStateAction } from 'react';

import { useModal } from '@/components/modals/modal-context';
import type { AuthSessionUser } from '@/hooks/use-auth-session';

type DashboardSession = {
  user: AuthSessionUser;
  setUser: Dispatch<SetStateAction<AuthSessionUser | null>>;
  /** First company the person belongs to, used to fill in forms. */
  companyName: string | null;
};

export const DashboardSessionContext = createContext<DashboardSession | null>(null);

export function useDashboardSession() {
  return useContext(DashboardSessionContext);
}

/** Opens the hire request form over the current page, already filled with what we know. */
export function useOpenHireRequest() {
  const { open } = useModal();
  const session = useDashboardSession();
  return useCallback(() => {
    const user = session?.user;
    open('hire', {
      hirePrefill: user
        ? {
            contactName: `${user.firstName} ${user.lastName}`.trim(),
            email: user.email,
            companyName: session?.companyName ?? undefined,
          }
        : undefined,
    });
  }, [open, session?.user, session?.companyName]);
}
