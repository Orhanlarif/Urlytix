import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiRequestMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/api', () => ({ apiRequest: apiRequestMock }));
vi.mock('@/lib/auth', () => ({ getToken: () => null }));

import { workspacesService } from './workspaces';

describe('workspacesService', () => {
  beforeEach(() => apiRequestMock.mockReset());

  it('uses the workspace endpoints and request payloads', async () => {
    apiRequestMock.mockResolvedValue([]);
    await workspacesService.list();
    expect(apiRequestMock).toHaveBeenLastCalledWith('/workspaces', { token: null });

    await workspacesService.create({ name: 'Team', slug: 'team' });
    expect(apiRequestMock).toHaveBeenLastCalledWith('/workspaces', {
      token: null,
      method: 'POST',
      body: { name: 'Team', slug: 'team' },
    });

    await workspacesService.update('workspace-1', { name: 'New team' });
    expect(apiRequestMock).toHaveBeenLastCalledWith('/workspaces/workspace-1', {
      token: null,
      method: 'PATCH',
      body: { name: 'New team' },
    });

    await workspacesService.get('workspace-1');
    expect(apiRequestMock).toHaveBeenLastCalledWith('/workspaces/workspace-1', {
      token: null,
    });

    await workspacesService.addMember('workspace-1', {
      email: 'member@example.com',
      role: 'MEMBER',
    });
    expect(apiRequestMock).toHaveBeenLastCalledWith(
      '/workspaces/workspace-1/members',
      {
        token: null,
        method: 'POST',
        body: { email: 'member@example.com', role: 'MEMBER' },
      },
    );

    await workspacesService.updateMemberRole('workspace-1', 'user-2', {
      role: 'VIEWER',
    });
    expect(apiRequestMock).toHaveBeenLastCalledWith(
      '/workspaces/workspace-1/members/user-2',
      {
        token: null,
        method: 'PATCH',
        body: { role: 'VIEWER' },
      },
    );

    await workspacesService.removeMember('workspace-1', 'user-2');
    expect(apiRequestMock).toHaveBeenLastCalledWith(
      '/workspaces/workspace-1/members/user-2',
      {
        token: null,
        method: 'DELETE',
      },
    );
  });
});
