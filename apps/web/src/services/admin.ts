import type { PaginatedResponse, PlatformRole } from '@urlytix/shared';
import { apiRequest } from '@/lib/api';
import { getToken } from '@/lib/auth';

export type AdminUserSummary = {
  id: string;
  name: string | null;
  email: string;
  platformRole: PlatformRole;
  disabled: boolean;
  disabledAt: string | null;
  createdAt: string;
  totpEnabled?: boolean;
  membershipCount?: number;
  linkCount?: number;
  sessionCount?: number;
};

export type AdminOverview = {
  totalUsers: number;
  activeUsers: number;
  disabledUsers: number;
  totalWorkspaces: number;
  totalLinks: number;
  totalClicks: number;
  clicksToday: number;
  dailySignups: Array<{ date: string; count: number }>;
  recentUsers: AdminUserSummary[];
};

export type AdminUserDetail = AdminUserSummary & {
  timezone: string;
  locale: string;
  updatedAt: string;
  apiKeyCount: number;
  memberships: Array<{
    id: string;
    role: string;
    createdAt: string;
    workspace: {
      id: string;
      name: string;
      slug: string;
    };
  }>;
};

export type ListAdminUsersParams = {
  q?: string;
  status?: 'all' | 'active' | 'disabled';
  page?: number;
  pageSize?: number;
};

function authOpts() {
  return { token: getToken() };
}

export const adminService = {
  overview: () =>
    apiRequest<AdminOverview>('/admin/overview', authOpts()),

  listUsers: (params: ListAdminUsersParams = {}) => {
    const search = new URLSearchParams();
    if (params.q) search.set('q', params.q);
    if (params.status) search.set('status', params.status);
    if (params.page) search.set('page', String(params.page));
    if (params.pageSize) search.set('pageSize', String(params.pageSize));
    const query = search.toString();
    return apiRequest<PaginatedResponse<AdminUserSummary>>(
      `/admin/users${query ? `?${query}` : ''}`,
      authOpts(),
    );
  },

  getUser: (id: string) =>
    apiRequest<AdminUserDetail>(`/admin/users/${id}`, authOpts()),

  updateUser: (id: string, input: { disabled: boolean }) =>
    apiRequest<AdminUserSummary & { message: string }>(`/admin/users/${id}`, {
      method: 'PATCH',
      body: input,
      ...authOpts(),
    }),

  revokeSessions: (id: string) =>
    apiRequest<{ message: string; revokedCount: number }>(
      `/admin/users/${id}/revoke-sessions`,
      {
        method: 'POST',
        ...authOpts(),
      },
    ),
};
