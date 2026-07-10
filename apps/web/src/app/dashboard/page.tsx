'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Link2, MousePointerClick, TrendingUp } from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { Button } from '@/components/ui/button';
import { Card, CardHeader } from '@/components/ui/card';
import { ErrorBanner } from '@/components/ui/error-banner';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { MetricCard } from '@/components/ui/metric-card';
import { PageHeader } from '@/components/ui/page-header';
import { useLanguage } from '@/i18n/language-provider';
import { apiRequest } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { getToken } from '@/lib/auth';
import type { DashboardOverview } from '@/types/analytics';

export default function DashboardPage() {
  const router = useRouter();
  const { t } = useLanguage();

  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      const token = getToken();

      if (!token) {
        router.push('/login');
        return;
      }

      try {
        const data = await apiRequest<DashboardOverview>('/analytics/overview', {
          token,
        });

        setOverview(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : t.dashboard.loadFailed);
      } finally {
        setIsLoading(false);
      }
    }

    loadDashboard();
  }, [router, t.dashboard.loadFailed]);

  if (isLoading) {
    return <LoadingScreen text={t.dashboard.loading} />;
  }

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
        <ErrorBanner message={error} />
      </div>

      {overview && (
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

          <Card className="mt-8">
            <CardHeader
              title={t.dashboard.chartTitle}
              description={t.dashboard.chartDesc}
            />
            <MiniDailyChart data={overview.dailyClicks} clickLabel={t.common.click} />
          </Card>

          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader
                title={t.dashboard.topLinks}
                description={t.dashboard.topLinksDesc}
                action={
                  <Link href="/links" className="text-sm text-cyan-300 hover:underline">
                    {t.common.seeAll}
                  </Link>
                }
              />

              <div className="mt-6 space-y-4">
                {overview.topLinks.length === 0 ? (
                  <EmptyBox
                    title={t.dashboard.noLinks}
                    description={t.dashboard.noLinksDesc}
                  />
                ) : (
                  overview.topLinks.map((link) => (
                    <Link
                      key={link.id}
                      href={`/links/${link.id}`}
                      className="block rounded-2xl border border-slate-800 bg-slate-950 p-5 transition hover:border-cyan-400/40"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="font-semibold">
                            {link.title ?? link.shortCode}
                          </p>

                          <p className="mt-2 break-all text-sm text-cyan-300">
                            {link.shortUrl}
                          </p>

                          <p className="mt-2 break-all text-xs text-slate-500">
                            {link.originalUrl}
                          </p>
                        </div>

                        <div className="rounded-xl border border-slate-800 px-3 py-2 text-sm text-slate-300">
                          {link.totalClicks} {t.common.click}
                        </div>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </Card>

            <Card>
              <CardHeader
                title={t.dashboard.recentClicks}
                description={t.dashboard.recentClicksDesc}
              />

              <div className="mt-6 space-y-4">
                {overview.recentClicks.length === 0 ? (
                  <EmptyBox
                    title={t.dashboard.noClicks}
                    description={t.dashboard.noClicksDesc}
                  />
                ) : (
                  overview.recentClicks.map((click) => (
                    <div
                      key={click.id}
                      className="rounded-2xl border border-slate-800 bg-slate-950 p-5"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-semibold">
                            {click.link.title ?? click.link.shortCode}
                          </p>

                          <p className="mt-2 text-sm text-slate-400">
                            {click.deviceType} · {click.browser ?? t.common.unknown} ·{' '}
                            {click.os ?? t.common.unknown}
                          </p>

                          <p className="mt-2 text-xs text-slate-500">
                            {formatDateTime(click.clickedAt)}
                          </p>
                        </div>

                        <span
                          className={
                            click.isBot
                              ? 'rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-1 text-xs text-amber-200'
                              : 'rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-xs text-emerald-200'
                          }
                        >
                          {click.isBot ? t.common.bot : t.common.human}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>
        </>
      )}
    </AppShell>
  );
}

function MiniDailyChart({
  data,
  clickLabel,
}: {
  data: Array<{
    date: string;
    clicks: number;
  }>;
  clickLabel: string;
}) {
  const maxValue = Math.max(...data.map((item) => item.clicks), 1);

  return (
    <div className="mt-8 flex h-56 items-end gap-2 border-b border-slate-800 pb-4">
      {data.map((item) => {
        const height = Math.max(
          (item.clicks / maxValue) * 100,
          item.clicks > 0 ? 8 : 2,
        );

        return (
          <div key={item.date} className="flex flex-1 flex-col items-center gap-3">
            <div className="flex h-44 w-full items-end">
              <div
                className="w-full rounded-t-xl bg-cyan-400/80 transition hover:bg-cyan-300"
                style={{
                  height: `${height}%`,
                }}
                title={`${item.date}: ${item.clicks} ${clickLabel}`}
              />
            </div>

            <div className="text-center text-[10px] text-slate-500">
              {item.date.slice(5)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function EmptyBox({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/60 p-8 text-center">
      <p className="font-medium text-slate-200">{title}</p>
      <p className="mt-2 text-sm text-slate-500">{description}</p>
    </div>
  );
}