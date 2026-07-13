'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  BarChart3,
  Globe2,
  Link2,
  MousePointerClick,
  SlidersHorizontal,
  Smartphone,
  TrendingUp,
} from 'lucide-react';
import { DailyClicksChart } from '@/components/analytics/daily-clicks-chart';
import { AppShell } from '@/components/layout/app-shell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorBanner } from '@/components/ui/error-banner';
import { MetricCard } from '@/components/ui/metric-card';
import { PageHeader } from '@/components/ui/page-header';
import { PageLoading } from '@/components/ui/page-loading';
import { MenuSelect } from '@/components/ui/menu-select';
import { Tabs } from '@/components/ui/tabs';
import { useWorkspace } from '@/contexts/workspace-context';
import { useWorkspaceOverview } from '@/hooks/use-workspace-data';
import { useLanguage } from '@/i18n/language-provider';
import { formatDateTime, formatNumber } from '@/lib/format';
import type { GroupedStat, RecentClick } from '@/types/analytics';

const RANGE_OPTIONS = ['7', '14', '30', '90'] as const;

function normalizeReferrer(referrer: string | null): string | null {
  if (!referrer) return null;
  try {
    return new URL(referrer).hostname.replace(/^www\./, '');
  } catch {
    return referrer;
  }
}

function buildBreakdown(
  clicks: RecentClick[],
  select: (click: RecentClick) => string | null,
  fallbackLabel: string,
): GroupedStat[] {
  const counts = new Map<string, number>();

  for (const click of clicks) {
    const raw = select(click);
    const key = raw?.trim() ? raw.trim() : fallbackLabel;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

function BreakdownBars({
  items,
  emptyLabel,
}: {
  items: GroupedStat[];
  emptyLabel: string;
}) {
  const total = items.reduce((sum, item) => sum + item.count, 0);

  if (items.length === 0) {
    return <p className="text-sm text-[var(--muted-foreground)]">{emptyLabel}</p>;
  }

  return (
    <div className="space-y-4">
      {items.map((item) => {
        const percent = total > 0 ? Math.round((item.count / total) * 100) : 0;

        return (
          <div key={item.name}>
            <div className="flex items-center justify-between gap-4 text-sm">
              <span className="min-w-0 flex-1 truncate text-[var(--foreground)]">
                {item.name}
              </span>
              <span className="shrink-0 text-[var(--muted-foreground)]">
                {item.count} · {percent}%
              </span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--surface-raised)]">
              <div
                className="h-full rounded-full bg-[var(--accent)]"
                style={{ width: `${Math.max(percent, 4)}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function AnalyticsPage() {
  const { t, locale } = useLanguage();
  const { currentWorkspace, isLoading: workspaceLoading } = useWorkspace();
  const [days, setDays] = useState(30);
  const { data, error, isLoading, isFetching, refetch } = useWorkspaceOverview(
    currentWorkspace?.id,
    { days },
  );
  const rangeClicks =
    data?.dailyClicks.reduce((total, day) => total + day.clicks, 0) ?? 0;
  const rangeLabel =
    locale === 'tr' ? `Son ${days} gün` : `Last ${days} days`;

  const deviceBreakdown = useMemo(() => {
    if (data?.deviceStats && data.deviceStats.length > 0) {
      return data.deviceStats.map((item) => ({
        name: item.name === 'Unknown' ? t.common.unknown : item.name,
        count: item.count,
      }));
    }
    return buildBreakdown(
      data?.recentClicks ?? [],
      (click) => click.deviceType,
      t.common.unknown,
    );
  }, [data, t.common.unknown]);

  const referrerBreakdown = useMemo(() => {
    if (data?.referrerStats && data.referrerStats.length > 0) {
      return data.referrerStats.map((item) => ({
        name:
          !item.name || item.name === 'Unknown' || item.name === 'Direct'
            ? t.common.direct
            : item.name,
        count: item.count,
      }));
    }
    return buildBreakdown(
      data?.recentClicks ?? [],
      (click) => normalizeReferrer(click.referrer),
      t.common.direct,
    );
  }, [data, t.common.direct]);

  if (workspaceLoading) {
    return <PageLoading showChart showPanels />;
  }

  if (!currentWorkspace) {
    return (
      <AppShell>
        <PageHeader
          badge={t.analytics.badge}
          title={t.analytics.title}
          description={t.analytics.description}
        />
        <div className="mt-8">
          <EmptyState
            icon={Globe2}
            title={t.workspace.createTitle}
            description={t.workspace.createDescription}
          />
        </div>
      </AppShell>
    );
  }

  if (isLoading && !data) {
    return <PageLoading showChart showPanels />;
  }

  return (
    <AppShell>
      <PageHeader
        badge={t.analytics.badge}
        title={t.analytics.title}
        description={t.analytics.description}
      />

      <div className="mt-6">
        <ErrorBanner
          message={error?.message || (data ? '' : t.analytics.loadFailed)}
          onRetry={error || !data ? () => void refetch() : undefined}
          retryLabel={t.common.tryAgain}
          isRetrying={isLoading}
        />
      </div>

      <Card className="mt-6 border-[var(--accent-border)] bg-[var(--surface-raised)]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--accent-border)] bg-[var(--accent-soft)]">
              <SlidersHorizontal className="h-4 w-4 text-[var(--accent)]" />
            </div>
            <div>
              <p className="text-caption">{t.analytics.filterBarLabel}</p>
              <p className="mt-0.5 text-sm text-[var(--foreground)]">{rangeLabel}</p>
            </div>
          </div>

          <div className="flex w-full items-center gap-2 sm:w-auto">
            <MenuSelect
              aria-label={t.linkDetail.last14Days}
              value={String(days) as (typeof RANGE_OPTIONS)[number]}
              onChange={(value) => setDays(Number(value))}
              className="min-w-40 flex-1 sm:flex-none"
              align="right"
              options={RANGE_OPTIONS.map((option) => ({
                value: option,
                label:
                  locale === 'tr' ? `Son ${option} gün` : `Last ${option} days`,
              }))}
            />
            <Button
              variant="secondary"
              onClick={() => void refetch()}
              disabled={isFetching}
            >
              {t.common.refresh}
            </Button>
          </div>
        </div>
      </Card>

      {data && (
        <>
          <Card hover className="mt-8 animate-fade-in">
            <CardHeader
              title={t.analytics.performance}
              description={rangeLabel}
            />
            {data.dailyClicks.some((day) => day.clicks > 0) ? (
              <DailyClicksChart
                data={data.dailyClicks}
                clickLabel={t.common.click}
                locale={locale}
                heightClass="h-64"
              />
            ) : (
              <div className="mt-6">
                <EmptyState
                  icon={BarChart3}
                  title={t.analytics.noData}
                  description={t.analytics.noDataDesc}
                  action={
                    <Link href="/links">
                      <Button>{t.analytics.create}</Button>
                    </Link>
                  }
                />
              </div>
            )}
          </Card>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <MetricCard
              title={t.analytics.totalClicks}
              value={rangeClicks}
              description={rangeLabel}
              icon={MousePointerClick}
            />
            <MetricCard
              title={t.analytics.today}
              value={data.clicksToday}
              description={t.analytics.todayDesc}
              icon={TrendingUp}
            />
            <MetricCard
              title={t.analytics.links}
              value={data.totalLinks}
              description={t.analytics.linksDesc}
              icon={Link2}
            />
          </div>

          <Card hover className="mt-8">
            <Tabs
              variant="pill"
              tabs={[
                {
                  id: 'top-links',
                  label: t.analytics.topLinksTab,
                  content: (
                    <div className="space-y-4">
                      {data.topLinks.length === 0 ? (
                        <EmptyState
                          icon={Link2}
                          title={t.analytics.noLinks}
                          description={t.analytics.noLinksDesc}
                          action={
                            <Link href="/links">
                              <Button size="sm">{t.analytics.create}</Button>
                            </Link>
                          }
                        />
                      ) : (
                        data.topLinks.map((link) => (
                          <Link
                            key={link.id}
                            href={`/links/${link.id}`}
                            className="block rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 transition hover:border-[var(--accent-border)] hover:bg-[var(--surface-hover)]"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="min-w-0">
                                <p className="font-semibold">
                                  {link.title ?? link.shortCode}
                                </p>
                                <p className="mt-2 break-all text-sm text-[var(--accent)]">
                                  {link.shortUrl}
                                </p>
                                <p className="mt-2 break-all text-xs text-[var(--muted-foreground)]">
                                  {link.originalUrl}
                                </p>
                              </div>
                              <div className="rounded-xl border border-[var(--border)] px-3 py-2 text-sm text-[var(--foreground)]">
                                {formatNumber(link.totalClicks, locale)}{' '}
                                {t.common.click}
                              </div>
                            </div>
                          </Link>
                        ))
                      )}
                    </div>
                  ),
                },
                {
                  id: 'recent-clicks',
                  label: t.analytics.recentClicksTab,
                  content: (
                    <div className="space-y-4">
                      {data.recentClicks.length === 0 ? (
                        <EmptyState
                          icon={MousePointerClick}
                          title={t.analytics.noClicks}
                          description={t.analytics.noClicksDesc}
                        />
                      ) : (
                        data.recentClicks.map((click) => (
                          <div
                            key={click.id}
                            className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="min-w-0">
                                <p className="font-semibold">
                                  {click.link.title ?? click.link.shortCode}
                                </p>
                                <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                                  {click.deviceType} ·{' '}
                                  {click.browser ?? t.common.unknown} ·{' '}
                                  {click.os ?? t.common.unknown}
                                </p>
                                {(click.country || click.city) && (
                                  <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                                    {[click.city, click.country]
                                      .filter(Boolean)
                                      .join(', ')}
                                  </p>
                                )}
                                <p className="mt-2 text-xs text-[var(--muted-foreground)]">
                                  {formatDateTime(click.clickedAt, locale)}
                                </p>
                              </div>
                              <Badge variant={click.isBot ? 'warning' : 'success'}>
                                {click.isBot ? t.common.bot : t.common.human}
                              </Badge>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  ),
                },
                {
                  id: 'breakdown',
                  label: t.analytics.breakdownTab,
                  content: (
                    <div>
                      <p className="text-xs text-[var(--muted-foreground)]">
                        {t.analytics.breakdownHint}
                      </p>
                      <div className="mt-6 grid gap-6 lg:grid-cols-2">
                        <div>
                          <div className="mb-4 flex items-center gap-2">
                            <Smartphone className="h-4 w-4 text-[var(--accent)]" />
                            <h3 className="text-heading">
                              {t.analytics.deviceBreakdown}
                            </h3>
                          </div>
                          <BreakdownBars
                            items={deviceBreakdown}
                            emptyLabel={t.analytics.breakdownEmpty}
                          />
                        </div>
                        <div>
                          <div className="mb-4 flex items-center gap-2">
                            <Globe2 className="h-4 w-4 text-[var(--accent)]" />
                            <h3 className="text-heading">
                              {t.analytics.referrerBreakdown}
                            </h3>
                          </div>
                          <BreakdownBars
                            items={referrerBreakdown}
                            emptyLabel={t.analytics.breakdownEmpty}
                          />
                        </div>
                      </div>
                    </div>
                  ),
                },
              ]}
            />
          </Card>
        </>
      )}
    </AppShell>
  );
}
