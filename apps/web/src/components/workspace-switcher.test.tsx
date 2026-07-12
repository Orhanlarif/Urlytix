import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WorkspaceSwitcher } from './workspace-switcher';

const selectWorkspace = vi.hoisted(() => vi.fn());
const createWorkspace = vi.hoisted(() => vi.fn());
const getWorkspaceMock = vi.hoisted(() => vi.fn());
const workspaceState = vi.hoisted(() => ({
  workspaces: [
    {
      id: 'workspace-1',
      name: 'First team',
      slug: 'first-team',
      createdAt: '',
      updatedAt: '',
      _count: { links: 0, memberships: 1 },
    },
    {
      id: 'workspace-2',
      name: 'Second team',
      slug: 'second-team',
      createdAt: '',
      updatedAt: '',
      _count: { links: 0, memberships: 1 },
    },
  ],
  currentWorkspace: {
    id: 'workspace-1',
    name: 'First team',
    slug: 'first-team',
  } as { id: string; name: string; slug: string } | null,
}));

vi.mock('@/contexts/workspace-context', () => ({
  useWorkspace: () => ({
    workspaces: workspaceState.workspaces,
    currentWorkspace: workspaceState.currentWorkspace,
    isLoading: false,
    error: null,
    selectWorkspace,
    createWorkspace,
    refetch: vi.fn(),
  }),
}));
vi.mock('@/components/ui/toast', () => ({
  useToast: () => ({ showToast: vi.fn() }),
}));
vi.mock('@/hooks/use-current-user', () => ({
  useCurrentUser: () => ({ user: { id: 'user-1' } }),
}));
vi.mock('@/services/workspaces', () => ({
  workspacesService: { get: getWorkspaceMock },
}));
vi.mock('@/i18n/language-provider', () => ({
  useLanguage: () => ({
    t: {
      common: { loading: 'Loading', cancel: 'Cancel', tryAgain: 'Try again' },
      workspace: {
        label: 'Workspace',
        select: 'Select workspace',
        create: 'New workspace',
        createTitle: 'Create workspace',
        createDescription: 'Description',
        name: 'Name',
        namePlaceholder: 'Team',
        slug: 'Slug',
        slugPlaceholder: 'team',
        slugHint: 'Hint',
        creating: 'Creating',
        loadFailed: 'Load failed',
        created: 'Created',
        createFailed: 'Create failed',
        members: '{count} members',
      },
      settings: {
        roleOwner: 'Owner',
        roleAdmin: 'Admin',
        roleMember: 'Member',
        roleViewer: 'Viewer',
      },
    },
  }),
}));

function renderSwitcher(compact = false) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <WorkspaceSwitcher compact={compact} />
    </QueryClientProvider>,
  );
}

describe('WorkspaceSwitcher', () => {
  beforeEach(() => {
    selectWorkspace.mockClear();
    createWorkspace.mockClear();
    getWorkspaceMock.mockReset();
    getWorkspaceMock.mockResolvedValue({ memberships: [] });
    workspaceState.workspaces = [
      {
        id: 'workspace-1',
        name: 'First team',
        slug: 'first-team',
        createdAt: '',
        updatedAt: '',
        _count: { links: 0, memberships: 1 },
      },
      {
        id: 'workspace-2',
        name: 'Second team',
        slug: 'second-team',
        createdAt: '',
        updatedAt: '',
        _count: { links: 0, memberships: 1 },
      },
    ];
    workspaceState.currentWorkspace = {
      id: 'workspace-1',
      name: 'First team',
      slug: 'first-team',
    };
  });

  it('opens a workspace menu and changes workspace', () => {
    renderSwitcher();
    fireEvent.click(screen.getByRole('button', { name: 'Select workspace' }));
    fireEvent.click(screen.getByRole('option', { name: /Second team/i }));
    expect(selectWorkspace).toHaveBeenCalledWith('workspace-2');
  });

  it('opens the create workspace dialog', () => {
    renderSwitcher();
    fireEvent.click(screen.getByRole('button', { name: 'Select workspace' }));
    fireEvent.click(screen.getByRole('button', { name: 'New workspace' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Create workspace' }),
    ).toBeInTheDocument();
  });

  it('keeps focus in the name field while typing', () => {
    renderSwitcher();
    fireEvent.click(screen.getByRole('button', { name: 'Select workspace' }));
    fireEvent.click(screen.getByRole('button', { name: 'New workspace' }));

    const nameInput = screen.getByLabelText('Name');
    nameInput.focus();
    fireEvent.change(nameInput, { target: { value: 'Ekibim' } });

    expect(nameInput).toHaveFocus();
    expect(nameInput).toHaveValue('Ekibim');
    expect(screen.getByLabelText('Slug')).toHaveValue('ekibim');
  });

  it('opens the create workspace dialog from compact mode when no workspace exists', () => {
    workspaceState.workspaces = [];
    workspaceState.currentWorkspace = null;

    renderSwitcher(true);
    fireEvent.click(screen.getByRole('button', { name: 'Select workspace' }));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Create workspace' }),
    ).toBeInTheDocument();
  });

  it('shows the current role as a badge once memberships load', async () => {
    getWorkspaceMock.mockResolvedValue({
      memberships: [{ userId: 'user-1', role: 'OWNER' }],
    });

    renderSwitcher();

    expect(await screen.findByText('Owner')).toBeInTheDocument();
    expect(getWorkspaceMock).toHaveBeenCalledWith('workspace-1');
  });
});
