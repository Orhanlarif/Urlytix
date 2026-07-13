'use client';

import type { Workspace, WorkspaceSummary } from '@urlytix/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { usePathname } from 'next/navigation';
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { workspaceQueryKeys } from '@/hooks/use-workspace-data';
import { workspacesService } from '@/services/workspaces';

const STORAGE_KEY = 'urlytix_workspace_id';
const protectedPrefixes = [
  '/dashboard',
  '/links',
  '/analytics',
  '/workspace',
  '/settings',
];

type WorkspaceContextValue = {
  workspaces: WorkspaceSummary[];
  currentWorkspace: WorkspaceSummary | null;
  isLoading: boolean;
  error: Error | null;
  selectWorkspace: (id: string) => void;
  createWorkspace: (input: { name: string; slug: string }) => Promise<Workspace>;
  updateWorkspace: (name: string) => Promise<Workspace>;
  deleteWorkspace: (confirmSlug: string) => Promise<void>;
  refetch: () => Promise<unknown>;
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const enabled = protectedPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  const [selectedId, setSelectedId] = useState<string | null>(() =>
    typeof window === 'undefined' ? null : localStorage.getItem(STORAGE_KEY),
  );
  const query = useQuery({
    queryKey: ['workspaces'],
    queryFn: workspacesService.list,
    enabled,
  });
  const workspaces = useMemo(() => query.data ?? [], [query.data]);

  const currentWorkspace =
    workspaces.find((workspace) => workspace.id === selectedId) ??
    workspaces[0] ??
    null;

  useEffect(() => {
    if (currentWorkspace) {
      localStorage.setItem(STORAGE_KEY, currentWorkspace.id);
    } else if (query.data) {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [currentWorkspace, query.data]);

  const selectWorkspace = useCallback(
    (id: string) => {
      if (!workspaces.some((workspace) => workspace.id === id)) return;
      if (currentWorkspace && currentWorkspace.id !== id) {
        void queryClient.cancelQueries({
          queryKey: workspaceQueryKeys.workspace(currentWorkspace.id),
        });
        queryClient.removeQueries({
          queryKey: workspaceQueryKeys.workspace(currentWorkspace.id),
        });
      }
      localStorage.setItem(STORAGE_KEY, id);
      setSelectedId(id);
    },
    [currentWorkspace, queryClient, workspaces],
  );

  const createWorkspace = useCallback(
    async (input: { name: string; slug: string }) => {
      const workspace = await workspacesService.create(input);
      queryClient.setQueryData<WorkspaceSummary[]>(['workspaces'], (current = []) => [
        { ...workspace, _count: { links: 0, memberships: 1 } },
        ...current,
      ]);
      if (currentWorkspace) {
        void queryClient.cancelQueries({
          queryKey: workspaceQueryKeys.workspace(currentWorkspace.id),
        });
        queryClient.removeQueries({
          queryKey: workspaceQueryKeys.workspace(currentWorkspace.id),
        });
      }
      localStorage.setItem(STORAGE_KEY, workspace.id);
      setSelectedId(workspace.id);
      return workspace;
    },
    [currentWorkspace, queryClient],
  );

  const updateWorkspace = useCallback(
    async (name: string) => {
      if (!currentWorkspace) {
        throw new Error('No workspace selected.');
      }
      const updated = await workspacesService.update(currentWorkspace.id, { name });
      queryClient.setQueryData<WorkspaceSummary[]>(['workspaces'], (current = []) =>
        current.map((workspace) =>
          workspace.id === updated.id ? { ...workspace, ...updated } : workspace,
        ),
      );
      return updated;
    },
    [currentWorkspace, queryClient],
  );

  const deleteWorkspace = useCallback(
    async (confirmSlug: string) => {
      if (!currentWorkspace) {
        throw new Error('No workspace selected.');
      }
      const deletedId = currentWorkspace.id;
      await workspacesService.remove(deletedId, confirmSlug);
      queryClient.setQueryData<WorkspaceSummary[]>(['workspaces'], (current = []) =>
        current.filter((workspace) => workspace.id !== deletedId),
      );
      void queryClient.cancelQueries({
        queryKey: workspaceQueryKeys.workspace(deletedId),
      });
      queryClient.removeQueries({
        queryKey: workspaceQueryKeys.workspace(deletedId),
      });
      localStorage.removeItem(STORAGE_KEY);
      setSelectedId(null);
    },
    [currentWorkspace, queryClient],
  );

  return (
    <WorkspaceContext.Provider
      value={{
        workspaces,
        currentWorkspace,
        isLoading: enabled && query.isLoading,
        error: query.error,
        selectWorkspace,
        createWorkspace,
        updateWorkspace,
        deleteWorkspace,
        refetch: query.refetch,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within WorkspaceProvider');
  }
  return context;
}
