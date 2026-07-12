import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const logoutMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/auth', () => ({ logout: logoutMock }));

describe('apiRequest authentication recovery', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'http://localhost:4000/api');
    logoutMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('refreshes an expired session once and retries the original request', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ message: 'expired' }), { status: 401 }),
      )
      .mockResolvedValueOnce(new Response(null, { status: 201 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: 'user-1' }), { status: 200 }),
      );
    const { apiRequest } = await import('./api');

    await expect(apiRequest('/auth/me')).resolves.toEqual({ id: 'user-1' });
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'http://localhost:4000/api/auth/refresh',
      { method: 'POST', credentials: 'include' },
    );
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(logoutMock).not.toHaveBeenCalled();
  });

  it('logs out when refresh fails', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ message: 'expired' }), { status: 401 }),
      )
      .mockResolvedValueOnce(new Response(null, { status: 401 }));
    const { apiRequest, UnauthorizedError } = await import('./api');

    await expect(apiRequest('/links')).rejects.toBeInstanceOf(UnauthorizedError);
    expect(logoutMock).toHaveBeenCalledWith('/login?expired=1');
  });
});
