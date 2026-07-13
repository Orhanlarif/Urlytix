import type { DomainSummary, DomainVerifyResponse } from '@urlytix/shared';
import { apiRequest } from '@/lib/api';
import { getToken } from '@/lib/auth';

const auth = () => ({ token: getToken() });

export const domainsService = {
  list: (workspaceId: string) =>
    apiRequest<DomainSummary[]>(
      `/workspaces/${workspaceId}/domains`,
      auth(),
    ),
  create: (workspaceId: string, input: { hostname: string }) =>
    apiRequest<DomainSummary>(`/workspaces/${workspaceId}/domains`, {
      ...auth(),
      method: 'POST',
      body: input,
    }),
  verify: (workspaceId: string, id: string) =>
    apiRequest<DomainVerifyResponse>(
      `/workspaces/${workspaceId}/domains/${id}/verify`,
      {
        ...auth(),
        method: 'POST',
      },
    ),
  remove: (workspaceId: string, id: string) =>
    apiRequest<{ deletedDomainId: string }>(
      `/workspaces/${workspaceId}/domains/${id}`,
      {
        ...auth(),
        method: 'DELETE',
      },
    ),
};
