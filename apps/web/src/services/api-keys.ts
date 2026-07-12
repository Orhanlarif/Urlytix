import type {
  ApiKeySummary,
  CreateApiKeyResponse,
} from '@urlytics/shared';
import { apiRequest } from '@/lib/api';
import { getToken } from '@/lib/auth';

const auth = () => ({ token: getToken() });

export const apiKeysService = {
  list: (workspaceId: string) =>
    apiRequest<ApiKeySummary[]>(
      `/workspaces/${workspaceId}/api-keys`,
      auth(),
    ),
  create: (
    workspaceId: string,
    input: { name: string; expiresAt?: string },
  ) =>
    apiRequest<CreateApiKeyResponse>(
      `/workspaces/${workspaceId}/api-keys`,
      {
        ...auth(),
        method: 'POST',
        body: input,
      },
    ),
  revoke: (workspaceId: string, id: string) =>
    apiRequest<{ message: string }>(
      `/workspaces/${workspaceId}/api-keys/${id}`,
      {
        ...auth(),
        method: 'DELETE',
      },
    ),
};
