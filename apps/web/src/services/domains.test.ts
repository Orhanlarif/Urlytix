import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiRequestMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/api', () => ({ apiRequest: apiRequestMock }));
vi.mock('@/lib/auth', () => ({ getToken: () => null }));

import { domainsService } from './domains';

describe('domainsService', () => {
  beforeEach(() => apiRequestMock.mockReset());

  it('lists, creates, verifies, and deletes workspace domains', async () => {
    apiRequestMock.mockResolvedValue([]);
    await domainsService.list('workspace-1');
    expect(apiRequestMock).toHaveBeenLastCalledWith(
      '/workspaces/workspace-1/domains',
      { token: null },
    );

    await domainsService.create('workspace-1', { hostname: 'go.brand.com' });
    expect(apiRequestMock).toHaveBeenLastCalledWith(
      '/workspaces/workspace-1/domains',
      {
        token: null,
        method: 'POST',
        body: { hostname: 'go.brand.com' },
      },
    );

    await domainsService.verify('workspace-1', 'domain-1');
    expect(apiRequestMock).toHaveBeenLastCalledWith(
      '/workspaces/workspace-1/domains/domain-1/verify',
      { token: null, method: 'POST' },
    );

    await domainsService.remove('workspace-1', 'domain-1');
    expect(apiRequestMock).toHaveBeenLastCalledWith(
      '/workspaces/workspace-1/domains/domain-1',
      { token: null, method: 'DELETE' },
    );
  });
});
