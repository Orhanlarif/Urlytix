import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { en } from '@/i18n/en';
import {
  useWorkspaceAccess,
  WorkspaceReadOnlyNotice,
} from './workspace-access';

const getWorkspaceMock = vi.hoisted(() => vi.fn());

vi.mock('@/contexts/workspace-context', () => ({
  useWorkspace: () => ({
    currentWorkspace: { id: 'workspace-1', name: 'Release', slug: 'release' },
  }),
}));
vi.mock('@/hooks/use-current-user', () => ({
  useCurrentUser: () => ({ user: { id: 'user-1' } }),
}));
vi.mock('@/i18n/language-provider', () => ({
  useLanguage: () => ({ t: en, locale: 'en' }),
}));
vi.mock('@/services/workspaces', () => ({
  workspacesService: { get: getWorkspaceMock },
}));

function AccessConsumer() {
  const { canManage, isAccessLoading } = useWorkspaceAccess();
  if (isAccessLoading) return <span>loading</span>;
  return (
    <div>
      <span>{canManage ? 'manage' : 'read-only'}</span>
      {!canManage && <WorkspaceReadOnlyNotice />}
    </div>
  );
}

function renderAccess() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <AccessConsumer />
    </QueryClientProvider>,
  );
}

function workspaceWithRole(role: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER') {
  return {
    id: 'workspace-1',
    name: 'Release',
    slug: 'release',
    createdAt: '2026-07-12T00:00:00.000Z',
    updatedAt: '2026-07-12T00:00:00.000Z',
    memberships: [
      {
        id: 'membership-1',
        workspaceId: 'workspace-1',
        userId: 'user-1',
        role,
        createdAt: '2026-07-12T00:00:00.000Z',
        user: {
          id: 'user-1',
          name: 'Release User',
          email: 'release@example.test',
        },
      },
    ],
  };
}

describe('workspace settings access', () => {
  beforeEach(() => {
    getWorkspaceMock.mockReset();
  });

  it.each(['OWNER', 'ADMIN'] as const)(
    'allows %s members to manage settings',
    async (role) => {
      getWorkspaceMock.mockResolvedValue(workspaceWithRole(role));
      renderAccess();

      expect(await screen.findByText('manage')).toBeInTheDocument();
      expect(getWorkspaceMock).toHaveBeenCalledWith('workspace-1');
      expect(screen.queryByRole('note')).not.toBeInTheDocument();
    },
  );

  it.each(['MEMBER', 'VIEWER'] as const)(
    'keeps %s members read-only',
    async (role) => {
      getWorkspaceMock.mockResolvedValue(workspaceWithRole(role));
      renderAccess();

      expect(await screen.findByText('read-only')).toBeInTheDocument();
      expect(screen.getByRole('note')).toHaveTextContent('Read-only access');
    },
  );
});
