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

  it('returns the paginated links response', async () => {
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

    await expect(linksService.list()).resolves.toEqual(response);
    expect(apiRequestMock).toHaveBeenCalledWith('/links', { token: null });
  });
});
