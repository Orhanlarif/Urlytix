import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WorkspaceProvider, useWorkspace } from './workspace-context';

const listMock = vi.hoisted(() => vi.fn());
const createMock = vi.hoisted(() => vi.fn());
const workspaceDataMock = vi.hoisted(() => vi.fn());

vi.mock('next/navigation', () => ({ usePathname: () => '/dashboard' }));
vi.mock('@/services/workspaces', () => ({
  workspacesService: {
    list: listMock,
    create: createMock,
    update: vi.fn(),
  },
}));

const workspace = {
  id: 'workspace-1',
  name: 'Team',
  slug: 'team',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  _count: { links: 0, memberships: 1 },
};

function Consumer() {
  const { currentWorkspace, createWorkspace, selectWorkspace, workspaces } =
    useWorkspace();
  const workspaceData = useQuery({
    queryKey: ['workspace-data', currentWorkspace?.id, 'integration'],
    queryFn: () => workspaceDataMock(currentWorkspace!.id),
    enabled: Boolean(currentWorkspace),
  });
  return (
    <div>
      <span>{currentWorkspace?.name ?? 'none'}</span>
      <span>{workspaceData.data ?? 'no-data'}</span>
      <button onClick={() => void createWorkspace({ name: 'New', slug: 'new' })}>
        create
      </button>
      {workspaces[1] && (
        <button onClick={() => selectWorkspace(workspaces[1].id)}>
          select second
        </button>
      )}
    </div>
  );
}

function renderProvider() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return {
    ...render(
    <QueryClientProvider client={client}>
      <WorkspaceProvider>
        <Consumer />
      </WorkspaceProvider>
    </QueryClientProvider>,
    ),
    client,
  };
}

describe('WorkspaceProvider', () => {
  beforeEach(() => {
    localStorage.clear();
    listMock.mockReset();
    createMock.mockReset();
    workspaceDataMock.mockReset();
    workspaceDataMock.mockImplementation(async (workspaceId: string) =>
      workspaceId === 'workspace-1' ? 'first-data' : 'second-data',
    );
  });

  it('falls back to the first workspace when stored selection is invalid', async () => {
    localStorage.setItem('urlytics_workspace_id', 'missing');
    listMock.mockResolvedValue([workspace]);
    renderProvider();

    expect(await screen.findByText('Team')).toBeInTheDocument();
    expect(localStorage.getItem('urlytics_workspace_id')).toBe('workspace-1');
  });

  it('selects a newly created workspace', async () => {
    listMock.mockResolvedValue([workspace]);
    createMock.mockResolvedValue({
      ...workspace,
      id: 'workspace-2',
      name: 'New',
      slug: 'new',
    });
    renderProvider();
    await screen.findByText('Team');
    fireEvent.click(screen.getByRole('button', { name: 'create' }));

    await waitFor(() => expect(screen.getByText('New')).toBeInTheDocument());
    expect(localStorage.getItem('urlytics_workspace_id')).toBe('workspace-2');
  });

  it('removes the previous workspace data when switching tenants', async () => {
    listMock.mockResolvedValue([
      workspace,
      { ...workspace, id: 'workspace-2', name: 'Second', slug: 'second' },
    ]);
    const { client } = renderProvider();
    await screen.findByText('Team');
    expect(await screen.findByText('first-data')).toBeInTheDocument();
    client.setQueryData(['workspace-data', 'workspace-1', 'overview'], {
      totalLinks: 99,
    });

    fireEvent.click(screen.getByRole('button', { name: 'select second' }));

    await waitFor(() => expect(screen.getByText('Second')).toBeInTheDocument());
    expect(await screen.findByText('second-data')).toBeInTheDocument();
    expect(workspaceDataMock).toHaveBeenCalledWith('workspace-2');
    expect(
      client.getQueriesData({
        queryKey: ['workspace-data', 'workspace-1'],
      }),
    ).toEqual([]);
  });
});
