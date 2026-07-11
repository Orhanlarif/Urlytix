import { apiRequest } from '@/lib/api';
import { getToken } from '@/lib/auth';
import type {
  CreateLinkResponse,
  DeleteLinkResponse,
  LinkItem,
  LinkStatus,
  UpdateLinkResponse,
  UpdateLinkStatusResponse,
} from '@/types/links';

const auth = () => ({ token: getToken() });

export const linksService = {
  list: () => apiRequest<LinkItem[]>('/links', auth()),
  create: (input: {
    originalUrl: string;
    title?: string;
    customAlias?: string;
    expiresAt?: string;
  }) =>
    apiRequest<CreateLinkResponse>('/links', {
      ...auth(),
      method: 'POST',
      body: input,
    }),
  update: (id: string, input: Partial<Pick<LinkItem, 'title' | 'originalUrl' | 'expiresAt'>>) =>
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
