import type { AuthResponse, AuthSession, AuthUser } from '@/types/auth';
import { apiRequest } from '@/lib/api';
import { getToken, logout, saveToken } from '@/lib/auth';

export type UpdateProfileInput = {
  name?: string;
  email?: string;
  timezone?: string;
  locale?: string;
};

export type LoginResult =
  | (AuthResponse & { requiresTwoFactor?: false })
  | {
      message: string;
      requiresTwoFactor: true;
      twoFactorToken: string;
    };

export const authService = {
  async login(email: string, password: string): Promise<LoginResult> {
    const response = await apiRequest<LoginResult>('/auth/login', {
      method: 'POST',
      body: { email, password },
    });
    if (!response.requiresTwoFactor && response.accessToken) {
      saveToken(response.accessToken);
    }
    return response;
  },

  async verifyTwoFactor(twoFactorToken: string, code: string) {
    const response = await apiRequest<AuthResponse>('/auth/2fa/verify', {
      method: 'POST',
      body: { twoFactorToken, code },
    });
    if (response.accessToken) {
      saveToken(response.accessToken);
    }
    return response;
  },

  async register(input: { name?: string; email: string; password: string }) {
    const response = await apiRequest<AuthResponse>('/auth/register', {
      method: 'POST',
      body: input,
    });
    if (response.accessToken) {
      saveToken(response.accessToken);
    }
    return response;
  },

  me: () => apiRequest<AuthUser>('/auth/me', { token: getToken() }),

  updateProfile: (input: UpdateProfileInput) =>
    apiRequest<AuthUser>('/auth/profile', {
      method: 'PATCH',
      body: input,
      token: getToken(),
    }),

  forgotPassword: (email: string) =>
    apiRequest<{ message: string }>('/auth/forgot-password', {
      method: 'POST',
      body: { email },
    }),

  resetPassword: (token: string, password: string) =>
    apiRequest<{ message: string }>('/auth/reset-password', {
      method: 'POST',
      body: { token, password },
    }),

  changePassword: (currentPassword: string, newPassword: string) =>
    apiRequest<{ message: string }>('/auth/change-password', {
      method: 'POST',
      body: { currentPassword, newPassword },
      token: getToken(),
    }),

  listSessions: () =>
    apiRequest<AuthSession[]>('/auth/sessions', { token: getToken() }),

  revokeSession: (id: string) =>
    apiRequest<{ message: string; revokedCurrent?: boolean }>(
      `/auth/sessions/${id}`,
      {
        method: 'DELETE',
        token: getToken(),
      },
    ),

  revokeOtherSessions: () =>
    apiRequest<{ message: string; revokedCount: number }>('/auth/sessions', {
      method: 'DELETE',
      token: getToken(),
    }),

  setupTwoFactor: () =>
    apiRequest<{
      secret: string;
      otpauthUrl: string;
      qrCodeDataUrl: string;
    }>('/auth/2fa/setup', {
      method: 'POST',
      token: getToken(),
    }),

  enableTwoFactor: (code: string) =>
    apiRequest<{ message: string; backupCodes: string[] }>('/auth/2fa/enable', {
      method: 'POST',
      body: { code },
      token: getToken(),
    }),

  disableTwoFactor: (password: string, code: string) =>
    apiRequest<{ message: string }>('/auth/2fa/disable', {
      method: 'POST',
      body: { password, code },
      token: getToken(),
    }),

  async logout() {
    try {
      await apiRequest<unknown>('/auth/logout', {
        method: 'POST',
        token: getToken(),
      });
    } catch {
      // Older API versions may not expose a logout endpoint.
    } finally {
      logout('/login');
    }
  },
};
