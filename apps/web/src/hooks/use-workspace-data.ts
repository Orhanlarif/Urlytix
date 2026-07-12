'use client';

import { useQuery } from '@tanstack/react-query';
import { analyticsService, type AnalyticsRange } from '@/services/analytics';
import { linksService, type ListLinksParams } from '@/services/links';

export const workspaceQueryKeys = {
  all: ['workspace-data'] as const,
  workspace: (workspaceId: string) =>
    [...workspaceQueryKeys.all, workspaceId] as const,
  overview: (workspaceId: string, range: AnalyticsRange = {}) =>
    [...workspaceQueryKeys.workspace(workspaceId), 'overview', range] as const,
  links: (workspaceId: string, params: ListLinksParams = {}) =>
    [...workspaceQueryKeys.workspace(workspaceId), 'links', params] as const,
  linkAnalytics: (
    workspaceId: string,
    linkId: string,
    range: AnalyticsRange = {},
  ) =>
    [
      ...workspaceQueryKeys.workspace(workspaceId),
      'link-analytics',
      linkId,
      range,
    ] as const,
};

export function useWorkspaceOverview(
  workspaceId: string | undefined,
  range: AnalyticsRange = {},
) {
  return useQuery({
    queryKey: workspaceQueryKeys.overview(workspaceId ?? 'none', range),
    queryFn: () => analyticsService.overview(workspaceId!, range),
    enabled: Boolean(workspaceId),
  });
}

export function useWorkspaceLinks(
  workspaceId: string | undefined,
  params: ListLinksParams,
) {
  return useQuery({
    queryKey: workspaceQueryKeys.links(workspaceId ?? 'none', params),
    queryFn: () => linksService.list(workspaceId!, params),
    enabled: Boolean(workspaceId),
  });
}

export function useLinkAnalytics(
  workspaceId: string | undefined,
  linkId: string,
  range: AnalyticsRange = {},
) {
  return useQuery({
    queryKey: workspaceQueryKeys.linkAnalytics(
      workspaceId ?? 'none',
      linkId,
      range,
    ),
    queryFn: () => analyticsService.link(linkId, range),
    enabled: Boolean(workspaceId && linkId),
  });
}
