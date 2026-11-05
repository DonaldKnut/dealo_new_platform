'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import {
  atsApi,
  rememberWorkspace,
  rememberedWorkspace,
  type WorkspaceDetail,
  type WorkspaceSummary,
} from '@/lib/ats-api';

type AtsWorkspaceState = {
  loading: boolean;
  error: string | null;
  workspaces: WorkspaceSummary[];
  current: WorkspaceDetail | null;
  orgId: string | null;
  select: (id: string) => void;
  reload: () => Promise<void>;
  reloadDetail: () => Promise<void>;
};

const AtsWorkspaceContext = createContext<AtsWorkspaceState | null>(null);

export function AtsWorkspaceProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[]>([]);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [current, setCurrent] = useState<WorkspaceDetail | null>(null);

  const reload = useCallback(async () => {
    setError(null);
    try {
      const list = await atsApi.workspaces();
      setWorkspaces(list);
      const fromUrl = new URLSearchParams(window.location.search).get('w');
      const preferred = [fromUrl, rememberedWorkspace()].find((id) => id && list.some((w) => w.id === id));
      const next = preferred ?? list[0]?.id ?? null;
      setOrgId(next);
      if (next) rememberWorkspace(next);
      if (!next) setCurrent(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load your workspaces');
    } finally {
      setLoading(false);
    }
  }, []);

  const reloadDetail = useCallback(async () => {
    if (!orgId) return;
    try {
      setCurrent(await atsApi.workspace(orgId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load this workspace');
    }
  }, [orgId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    setCurrent(null);
    void reloadDetail();
  }, [reloadDetail]);

  const select = useCallback((id: string) => {
    rememberWorkspace(id);
    setOrgId(id);
  }, []);

  const value = useMemo(
    () => ({ loading, error, workspaces, current, orgId, select, reload, reloadDetail }),
    [loading, error, workspaces, current, orgId, select, reload, reloadDetail],
  );

  return <AtsWorkspaceContext.Provider value={value}>{children}</AtsWorkspaceContext.Provider>;
}

export function useAtsWorkspace() {
  const value = useContext(AtsWorkspaceContext);
  if (!value) throw new Error('useAtsWorkspace must be used inside AtsWorkspaceProvider');
  return value;
}
