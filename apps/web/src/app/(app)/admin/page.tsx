'use client';

import Link from 'next/link';
import {
  Building2,
  Link2,
  MousePointerClick,
  TrendingUp,
  Users,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { AdminShell } from '@/components/layout/admin-shell';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader } from '@/components/ui/card';
import { ErrorBanner } from '@/components/ui/error-banner';
import { MetricCard } from '@/components/ui/metric-card';
import { PageHeader } from '@/components/ui/page-header';
import { PageLoading } from '@/components/ui/page-loading';
import { useLanguage } from '@/i18n/language-provider';
import { formatDateTime, formatNumber } from '@/lib/format';
import { adminService } from '@/services/admin';

export default function AdminOverviewPage() {
  const { t, locale } = useLanguage();
  const { data, error, isLoading, refetch } = useQuery({
    queryKey: ['admin', 'overview'],
    queryFn: adminService.overview,
  });

  if (isLoading && !data) {
    return (
      <AdminShell>
        <PageLoading showPanels />
      </AdminShell>
    );
  }

  return (
    <AdminShell>
      <PageHeader
        badge={t.admin.badge}
        title={t.admin.overviewTitle}
        description={t.admin.overviewDescription}
      />

      <div className="mt-6">
        <ErrorBanner
          message={error?.message || ''}
          onRetry={error ? () => void refetch() : undefined}
          retryLabel={t.common.tryAgain}
          isRetrying={isLoading}
        />
      </div>

      {data && (
        <>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              title={t.admin.totalUsers}
              value={data.totalUsers}
              description={t.admin.activeUsersDesc.replace(
                '{count}',
                formatNumber(data.activeUsers, locale),
              )}
              icon={Users}
            />
            <MetricCard
              title={t.admin.totalWorkspaces}
              value={data.totalWorkspaces}
              description={t.admin.totalWorkspacesDesc}
              icon={Building2}
            />
            <MetricCard
              title={t.admin.totalLinks}
              value={data.totalLinks}
              description={t.admin.totalLinksDesc}
              icon={Link2}
            />
            <MetricCard
              title={t.admin.totalClicks}
              value={data.totalClicks}
              description={t.admin.clicksTodayDesc.replace(
                '{count}',
                formatNumber(data.clicksToday, locale),
              )}
              icon={MousePointerClick}
            />
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader
                title={t.admin.signupsTitle}
                description={t.admin.signupsDescription}
              />
              <div className="mt-6 space-y-3">
                {data.dailySignups.map((day) => {
                  const max = Math.max(
                    ...data.dailySignups.map((item) => item.count),
                    1,
                  );
                  return (
                    <div key={day.date} className="flex items-center gap-3">
                      <span className="w-24 shrink-0 text-xs text-[var(--muted-foreground)]">
                        {day.date}
                      </span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--surface-raised)]">
                        <div
                          className="h-full rounded-full bg-[var(--accent)]"
                          style={{ width: `${(day.count / max) * 100}%` }}
                        />
                      </div>
                      <span className="w-8 text-right text-sm tabular-nums">
                        {day.count}
                      </span>
                    </div>
                  );
                })}
              </div>
            </Card>

            <Card>
              <CardHeader
                title={t.admin.recentUsersTitle}
                description={t.admin.recentUsersDescription}
                action={
                  <Link
                    href="/admin/users"
                    className="text-sm text-[var(--accent)] hover:underline"
                  >
                    {t.common.seeAll}
                  </Link>
                }
              />
              <div className="mt-6 space-y-3">
                {data.recentUsers.length === 0 ? (
                  <p className="text-sm text-[var(--muted-foreground)]">
                    {t.admin.noUsers}
                  </p>
                ) : (
                  data.recentUsers.map((user) => (
                    <Link
                      key={user.id}
                      href={`/admin/users?q=${encodeURIComponent(user.email)}`}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 transition hover:border-[var(--accent-border)]"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium">
                          {user.name?.trim() || user.email}
                        </p>
                        <p className="mt-1 truncate text-xs text-[var(--muted-foreground)]">
                          {user.email}
                        </p>
                        <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                          {formatDateTime(user.createdAt, locale)}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-2">
                        {user.platformRole === 'SUPER_ADMIN' && (
                          <Badge variant="success">{t.admin.roleAdmin}</Badge>
                        )}
                        {user.disabled ? (
                          <Badge variant="warning">{t.admin.statusDisabled}</Badge>
                        ) : (
                          <Badge variant="success">{t.admin.statusActive}</Badge>
                        )}
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </Card>
          </div>

          <div className="mt-6 flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
            <TrendingUp className="h-4 w-4" />
            {t.admin.disabledUsersDesc.replace(
              '{count}',
              formatNumber(data.disabledUsers, locale),
            )}
          </div>
        </>
      )}
    </AdminShell>
  );
}
