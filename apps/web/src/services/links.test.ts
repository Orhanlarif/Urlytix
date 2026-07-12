import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiRequestMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/api', () => ({
  apiRequest: apiRequestMock,
}));

vi.mock('@/lib/auth', () => ({
  getToken: () => null,
}));

import { linksService } from './links';

describe('linksService', () => {
  beforeEach(() => {
    apiRequestMock.mockReset();
  });

  it('returns the paginated links response for a workspace', async () => {
    const response = {
      data: [],
      meta: {
        page: 1,
        pageSize: 20,
        total: 0,
        totalPages: 0,
      },
    };
    apiRequestMock.mockResolvedValue(response);

    await expect(linksService.list('workspace-1')).resolves.toEqual(response);
    expect(apiRequestMock).toHaveBeenCalledWith(
      '/links?workspaceId=workspace-1',
      { token: null },
    );
  });

  it('passes page, search, and status query params', async () => {
    apiRequestMock.mockResolvedValue({
      data: [],
      meta: { page: 2, pageSize: 10, total: 0, totalPages: 0 },
    });

    await linksService.list('workspace-1', {
      page: 2,
      limit: 10,
      search: 'launch',
      status: 'ACTIVE',
    });

    expect(apiRequestMock).toHaveBeenCalledWith(
      '/links?workspaceId=workspace-1&page=2&limit=10&search=launch&status=ACTIVE',
      { token: null },
    );
  });

  it('creates a link in the selected workspace', async () => {
    apiRequestMock.mockResolvedValue({ message: 'ok', link: { id: 'link-1' } });

    await linksService.create('workspace-1', {
      originalUrl: 'https://example.com',
    });

    expect(apiRequestMock).toHaveBeenCalledWith('/links', {
      token: null,
      method: 'POST',
      body: {
        originalUrl: 'https://example.com',
        workspaceId: 'workspace-1',
      },
    });
  });
});
