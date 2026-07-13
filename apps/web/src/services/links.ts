import { apiRequest } from '@/lib/api';
import { getToken } from '@/lib/auth';
import type { PaginatedResponse } from '@urlytix/shared';
import type {
  CreateLinkResponse,
  DeleteLinkResponse,
  LinkItem,
  LinkStatus,
  UpdateLinkResponse,
  UpdateLinkStatusResponse,
} from '@/types/links';

const auth = () => ({ token: getToken() });

export type ListLinksParams = {
  page?: number;
  limit?: number;
  search?: string;
  status?: LinkStatus;
};

function buildListQuery(workspaceId: string, params: ListLinksParams = {}) {
  const query = new URLSearchParams({ workspaceId });

  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));
  if (params.search?.trim()) query.set('search', params.search.trim());
  if (params.status) query.set('status', params.status);

  return query.toString();
}

export const linksService = {
  list: (workspaceId: string, params?: ListLinksParams) =>
    apiRequest<PaginatedResponse<LinkItem>>(
      `/links?${buildListQuery(workspaceId, params)}`,
      auth(),
    ),
  create: (
    workspaceId: string,
    input: {
      originalUrl: string;
      title?: string;
      customAlias?: string;
      expiresAt?: string;
      password?: string;
    },
  ) =>
    apiRequest<CreateLinkResponse>('/links', {
      ...auth(),
      method: 'POST',
      body: { ...input, workspaceId },
    }),
  update: (
    id: string,
    input: Partial<
      Pick<LinkItem, 'title' | 'originalUrl' | 'expiresAt'> & {
        customAlias?: string;
        password?: string | null;
      }
    >,
  ) =>
    apiRequest<UpdateLinkResponse>(`/links/${id}`, {
      ...auth(),
      method: 'PATCH',
      body: input,
    }),
  updateStatus: (id: string, status: LinkStatus) =>
    apiRequest<UpdateLinkStatusResponse>(`/links/${id}/status`, {
      ...auth(),
      method: 'PATCH',
      body: { status },
    }),
  remove: (id: string) =>
    apiRequest<DeleteLinkResponse>(`/links/${id}`, {
      ...auth(),
      method: 'DELETE',
    }),
};
