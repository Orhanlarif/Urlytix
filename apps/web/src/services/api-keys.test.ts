import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiRequestMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/api', () => ({ apiRequest: apiRequestMock }));
vi.mock('@/lib/auth', () => ({ getToken: () => null }));

import { apiKeysService } from './api-keys';

describe('apiKeysService', () => {
  beforeEach(() => apiRequestMock.mockReset());

  it('lists, creates, and revokes workspace API keys', async () => {
    apiRequestMock.mockResolvedValue([]);
    await apiKeysService.list('workspace-1');
    expect(apiRequestMock).toHaveBeenLastCalledWith(
      '/workspaces/workspace-1/api-keys',
      { token: null },
    );

    await apiKeysService.create('workspace-1', { name: 'CI' });
    expect(apiRequestMock).toHaveBeenLastCalledWith(
      '/workspaces/workspace-1/api-keys',
      { token: null, method: 'POST', body: { name: 'CI' } },
    );

    await apiKeysService.revoke('workspace-1', 'key-1');
    expect(apiRequestMock).toHaveBeenLastCalledWith(
      '/workspaces/workspace-1/api-keys/key-1',
      { token: null, method: 'DELETE' },
    );
  });
});
