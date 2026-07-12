'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  BarChart3,
  Building2,
  ExternalLink,
  Link2,
  MousePointerClick,
  Plus,
  TrendingUp,
} from 'lucide-react';
import { DailyClicksChart } from '@/components/analytics/daily-clicks-chart';
import { OnboardingJourney } from '@/components/journey/onboarding-journey';
import { AppShell } from '@/components/layout/app-shell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorBanner } from '@/components/ui/error-banner';
import { Input } from '@/components/ui/input';
import { MetricCard } from '@/components/ui/metric-card';
import { PageHeader } from '@/components/ui/page-header';
import { PageLoading } from '@/components/ui/page-loading';
import { useToast } from '@/components/ui/toast';
import { useWorkspace } from '@/contexts/workspace-context';
import {
  useWorkspaceOverview,
  workspaceQueryKeys,
} from '@/hooks/use-workspace-data';
import { useLanguage } from '@/i18n/language-provider';
import { formatDateTime, formatNumber } from '@/lib/format';
import { linksService } from '@/services/links';
import type { LinkItem } from '@/types/links';

export default function DashboardPage() {
  const { t, locale } = useLanguage();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const { currentWorkspace, isLoading: workspaceLoading } = useWorkspace();
  const {
    data: overview,
    error,
    isLoading,
    refetch,
  } = useWorkspaceOverview(currentWorkspace?.id, { days: 14 });

  const [heroUrl, setHeroUrl] = useState('');
  const [heroSubmitting, setHeroSubmitting] = useState(false);
  const [heroError, setHeroError] = useState('');
  const [heroCreatedLink, setHeroCreatedLink] = useState<LinkItem | null>(
    null,
  );

  async function handleQuickCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!currentWorkspace) return;

    setHeroError('');
    setHeroSubmitting(true);

    try {
      const response = await linksService.create(currentWorkspace.id, {
        originalUrl: heroUrl,
      });
      setHeroCreatedLink(response.link);
      setHeroUrl('');
      showToast(t.links.created);
      await queryClient.invalidateQueries({
        queryKey: workspaceQueryKeys.workspace(currentWorkspace.id),
      });
    } catch (err) {
      setHeroError(
        err instanceof Error ? err.message : t.dashboard.heroCreateFailed,
      );
    } finally {
      setHeroSubmitting(false);
    }
  }

  if (workspaceLoading || (isLoading && !overview) || !currentWorkspace) {
    return <PageLoading showChart showPanels />;
  }

  const isOnboardingComplete = Boolean(
    overview && overview.totalLinks > 0 && overview.totalClicks > 0,
  );

  return (
    <AppShell>
      <PageHeader
        badge={t.dashboard.badge}
        title={t.dashboard.title}
        description={t.dashboard.description}
        action={
          <Link href="/links">
            <Button>{t.dashboard.newLink}</Button>
          </Link>
        }
      />

      <div className="mt-6">
        <ErrorBanner
          message={error?.message || (overview ? '' : t.dashboard.loadFailed)}
          onRetry={error || !overview ? () => void refetch() : undefined}
          retryLabel={t.common.tryAgain}
          isRetrying={isLoading}
        />
      </div>

      {currentWorkspace && (
        <Card
          hover
          className="mt-6 overflow-hidden border-[var(--accent-border)] bg-gradient-to-br from-[var(--accent-soft)] via-[var(--card)] to-[var(--card)]"
        >
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-md">
              <p className="text-eyebrow">{t.dashboard.heroBadge}</p>
              <h2 className="mt-2 text-heading-lg">{t.dashboard.heroTitle}</h2>
              <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                {t.dashboard.heroDesc}
              </p>
            </div>

            <form
              onSubmit={handleQuickCreate}
              className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto lg:min-w-[420px]"
            >
              <div className="sm:flex-1">
                <Input
                  aria-label={t.links.targetUrl}
                  value={heroUrl}
                  onChange={(event) => setHeroUrl(event.target.value)}
                  placeholder="https://example.com"
                  type="url"
                  required
                />
              </div>
              <Button
                type="submit"
                disabled={heroSubmitting}
                className="shrink-0"
              >
                <Plus className="h-4 w-4" />
                {heroSubmitting ? t.links.creating : t.dashboard.heroButton}
              </Button>
            </form>
          </div>

          {heroError && (
            <div className="mt-4">
              <ErrorBanner message={heroError} />
            </div>
          )}

          {heroCreatedLink && (
            <div className="mt-4 flex flex-col gap-3 rounded-xl border border-[var(--success-border)] bg-[var(--success-muted)] p-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="break-all text-sm text-[var(--success)]">
                {heroCreatedLink.shortUrl}
              </p>
              <div className="flex flex-wrap gap-2">
                <a
                  href={heroCreatedLink.shortUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Button size="sm" variant="outline">
                    {t.common.testLink}
                  </Button>
                </a>
                <Link href={`/links/${heroCreatedLink.id}`}>
                  <Button size="sm">{t.common.manage}</Button>
                </Link>
              </div>
            </div>
          )}
        </Card>
      )}

      {overview &&
        (isOnboardingComplete ? (
          <>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              <MetricCard
                title={t.dashboard.totalLinks}
                value={overview.totalLinks}
                description={t.dashboard.totalLinksDesc}
                icon={Link2}
              />

              <MetricCard
                title={t.dashboard.totalClicks}
                value={overview.totalClicks}
                description={t.dashboard.totalClicksDesc}
                icon={MousePointerClick}
              />

              <MetricCard
                title={t.dashboard.clicksToday}
                value={overview.clicksToday}
                description={t.dashboard.clicksTodayDesc}
                icon={TrendingUp}
              />
            </div>

            <Card hover className="mt-8">
              <CardHeader
                title={t.dashboard.chartTitle}
                description={t.dashboard.chartDesc}
              />
              {overview.dailyClicks.some((day) => day.clicks > 0) ? (
                <DailyClicksChart
                  data={overview.dailyClicks}
                  clickLabel={t.common.click}
                  locale={locale}
                />
              ) : (
                <div className="mt-6">
                  <EmptyState
                    icon={TrendingUp}
                    title={t.dashboard.noClicks}
                    description={t.dashboard.noClicksDesc}
                    action={
                      <Link href="/links">
                        <Button>{t.dashboard.newLink}</Button>
                      </Link>
                    }
                  />
                </div>
              )}
            </Card>

            <div className="mt-8 grid gap-6 lg:grid-cols-2">
              <Card hover>
                <CardHeader
                  title={t.dashboard.topLinks}
                  description={t.dashboard.topLinksDesc}
                  action={
                    <Link
                      href="/links"
                      className="text-sm text-[var(--accent)] hover:underline"
                    >
                      {t.common.seeAll}
                    </Link>
                  }
                />

                <div className="mt-6 space-y-4">
                  {overview.topLinks.length === 0 ? (
                    <EmptyState
                      icon={Link2}
                      title={t.dashboard.noLinks}
                      description={t.dashboard.noLinksDesc}
                      action={
                        <Link href="/links">
                          <Button size="sm">{t.dashboard.newLink}</Button>
                        </Link>
                      }
                    />
                  ) : (
                    overview.topLinks.map((link) => (
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
              </Card>

              <Card hover>
                <CardHeader
                  title={t.dashboard.recentClicks}
                  description={t.dashboard.recentClicksDesc}
                />

                <div className="mt-6 space-y-4">
                  {overview.recentClicks.length === 0 ? (
                    <EmptyState
                      icon={MousePointerClick}
                      title={t.dashboard.noClicks}
                      description={t.dashboard.noClicksDesc}
                    />
                  ) : (
                    overview.recentClicks.map((click) => (
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
              </Card>
            </div>
          </>
        ) : (
          <OnboardingJourney
            title={overview.totalLinks === 0 ? t.dashboard.noLinks : t.dashboard.noClicks}
            description={
              overview.totalLinks === 0
                ? t.dashboard.noLinksDesc
                : t.dashboard.noClicksDesc
            }
            progressLabel={t.dashboard.journeyProgress}
            steps={[
              {
                label: t.workspace.label,
                description: currentWorkspace.name,
                href: '/settings',
                actionLabel: t.workspace.label,
                complete: true,
                icon: Building2,
              },
              {
                label: t.dashboard.newLink,
                description: t.dashboard.noLinksDesc,
                href: '/links',
                actionLabel: t.dashboard.newLink,
                complete: overview.totalLinks > 0,
                icon: Link2,
              },
              {
                label: t.common.testLink,
                description: t.dashboard.noClicksDesc,
                href: overview.topLinks[0]
                  ? `/links/${overview.topLinks[0].id}`
                  : '/links',
                actionLabel: t.common.testLink,
                complete: overview.totalClicks > 0,
                icon: ExternalLink,
              },
              {
                label: t.nav.analytics,
                description: t.analytics.description,
                href: '/analytics',
                actionLabel: t.nav.analytics,
                complete: overview.totalClicks > 0,
                icon: BarChart3,
              },
            ]}
          />
        ))}
    </AppShell>
  );
}
