import { apiRequest } from '@/lib/api';
import { getToken } from '@/lib/auth';
import type { DashboardOverview, LinkAnalytics } from '@/types/analytics';

const auth = () => ({ token: getToken() });

export const analyticsService = {
  overview: () => apiRequest<DashboardOverview>('/analytics/overview', auth()),
  link: (id: string) =>
    apiRequest<LinkAnalytics>(`/analytics/links/${id}`, auth()),
};
