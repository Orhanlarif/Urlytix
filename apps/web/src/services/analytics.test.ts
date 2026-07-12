import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiRequestMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/api', () => ({
  apiRequest: apiRequestMock,
}));

vi.mock('@/lib/auth', () => ({
  getToken: () => null,
}));

import { analyticsService } from './analytics';

describe('analyticsService', () => {
  beforeEach(() => {
    apiRequestMock.mockReset();
  });

  it('scopes overview ranges to the workspace', async () => {
    apiRequestMock.mockResolvedValue({});

    await analyticsService.overview('workspace-1', { days: 30 });

    expect(apiRequestMock).toHaveBeenCalledWith(
      '/analytics/overview?workspaceId=workspace-1&days=30',
      { token: null },
    );
  });

  it('passes bounded date ranges to link analytics', async () => {
    apiRequestMock.mockResolvedValue({});

    await analyticsService.link('link-1', {
      from: '2026-07-01',
      to: '2026-07-12',
    });

    expect(apiRequestMock).toHaveBeenCalledWith(
      '/analytics/links/link-1?from=2026-07-01&to=2026-07-12',
      { token: null },
    );
  });
});
