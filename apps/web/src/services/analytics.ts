import { apiRequest } from '@/lib/api';
import { getToken } from '@/lib/auth';
import type { DashboardOverview, LinkAnalytics } from '@/types/analytics';

const auth = () => ({ token: getToken() });

export type AnalyticsRange = {
  days?: number;
  from?: string;
  to?: string;
};

function buildRangeQuery(range: AnalyticsRange = {}) {
  const query = new URLSearchParams();
  if (range.days) query.set('days', String(range.days));
  if (range.from) query.set('from', range.from);
  if (range.to) query.set('to', range.to);
  return query;
}

export const analyticsService = {
  overview: (workspaceId: string, range: AnalyticsRange = {}) => {
    const query = new URLSearchParams({ workspaceId });
    const rangeQuery = buildRangeQuery(range);
    rangeQuery.forEach((value, key) => query.set(key, value));
    return apiRequest<DashboardOverview>(
      `/analytics/overview?${query.toString()}`,
      auth(),
    );
  },
  link: (id: string, range: AnalyticsRange = {}) => {
    const query = buildRangeQuery(range).toString();
    return apiRequest<LinkAnalytics>(
      `/analytics/links/${id}${query ? `?${query}` : ''}`,
      auth(),
    );
  },
};
