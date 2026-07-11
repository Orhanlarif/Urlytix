import { apiRequest } from '@/lib/api';
import { logout, saveToken } from '@/lib/auth';
import type { AuthResponse, AuthUser } from '@/types/auth';

export const authService = {
  async login(email: string, password: string) {
    const response = await apiRequest<AuthResponse>('/auth/login', {
      method: 'POST',
      body: { email, password },
    });
    saveToken(response.accessToken);
    return response;
  },

  async register(input: { name?: string; email: string; password: string }) {
    const response = await apiRequest<AuthResponse>('/auth/register', {
      method: 'POST',
      body: input,
    });
    saveToken(response.accessToken);
    return response;
  },

  me: () => apiRequest<AuthUser>('/auth/me'),

  async logout() {
    try {
      await apiRequest<unknown>('/auth/logout', { method: 'POST' });
    } catch {
      // Older API versions may not expose a logout endpoint.
    } finally {
      logout('/login');
    }
  },
};
