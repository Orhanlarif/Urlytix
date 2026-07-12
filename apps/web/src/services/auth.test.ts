import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiRequestMock = vi.hoisted(() => vi.fn());
const getTokenMock = vi.hoisted(() => vi.fn(() => 'token'));
const saveTokenMock = vi.hoisted(() => vi.fn());
const logoutMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/api', () => ({ apiRequest: apiRequestMock }));
vi.mock('@/lib/auth', () => ({
  getToken: getTokenMock,
  saveToken: saveTokenMock,
  logout: logoutMock,
}));

import { authService } from './auth';

describe('authService', () => {
  beforeEach(() => {
    apiRequestMock.mockReset();
    getTokenMock.mockReturnValue('token');
  });

  it('loads the current user profile', async () => {
    const user = {
      id: 'user-1',
      name: 'Orhan',
      email: 'orhan@example.com',
      timezone: 'Europe/Istanbul',
      locale: 'tr',
      createdAt: '2026-01-01T00:00:00.000Z',
    };
    apiRequestMock.mockResolvedValue(user);

    await expect(authService.me()).resolves.toEqual(user);
    expect(apiRequestMock).toHaveBeenCalledWith('/auth/me', { token: 'token' });
  });

  it('updates the profile', async () => {
    apiRequestMock.mockResolvedValue({
      id: 'user-1',
      name: 'New Name',
      email: 'orhan@example.com',
      timezone: 'UTC',
      locale: 'en',
      createdAt: '2026-01-01T00:00:00.000Z',
    });

    await authService.updateProfile({
      name: 'New Name',
      timezone: 'UTC',
    });

    expect(apiRequestMock).toHaveBeenCalledWith('/auth/profile', {
      method: 'PATCH',
      body: { name: 'New Name', timezone: 'UTC' },
      token: 'token',
    });
  });
});
