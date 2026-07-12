import type {
  Workspace,
  WorkspaceDetail,
  WorkspaceMembership,
  WorkspaceRole,
  WorkspaceSummary,
} from '@urlytics/shared';
import { apiRequest } from '@/lib/api';
import { getToken } from '@/lib/auth';

const auth = () => ({ token: getToken() });

export type AssignableWorkspaceRole = Exclude<WorkspaceRole, 'OWNER'>;

export const workspacesService = {
  list: () => apiRequest<WorkspaceSummary[]>('/workspaces', auth()),
  get: (id: string) => apiRequest<WorkspaceDetail>(`/workspaces/${id}`, auth()),
  create: (input: { name: string; slug: string }) =>
    apiRequest<Workspace>('/workspaces', {
      ...auth(),
      method: 'POST',
      body: input,
    }),
  update: (id: string, input: { name: string }) =>
    apiRequest<Workspace>(`/workspaces/${id}`, {
      ...auth(),
      method: 'PATCH',
      body: input,
    }),
  addMember: (
    id: string,
    input: { email: string; role: AssignableWorkspaceRole },
  ) =>
    apiRequest<WorkspaceMembership>(`/workspaces/${id}/members`, {
      ...auth(),
      method: 'POST',
      body: input,
    }),
  updateMemberRole: (
    id: string,
    userId: string,
    input: { role: AssignableWorkspaceRole },
  ) =>
    apiRequest<WorkspaceMembership>(`/workspaces/${id}/members/${userId}`, {
      ...auth(),
      method: 'PATCH',
      body: input,
    }),
  removeMember: (id: string, userId: string) =>
    apiRequest<{ message: string; removedUserId: string }>(
      `/workspaces/${id}/members/${userId}`,
      {
        ...auth(),
        method: 'DELETE',
      },
    ),
};
