'use client';

import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, Suspense, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Bot,
  Building2,
  Link2,
  MousePointerClick,
  QrCode,
  TrendingUp,
  Users,
} from 'lucide-react';
import { DailyClicksChart } from '@/components/analytics/daily-clicks-chart';
import { AppShell } from '@/components/layout/app-shell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader } from '@/components/ui/card';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorBanner } from '@/components/ui/error-banner';
import { Input } from '@/components/ui/input';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { MetricCard } from '@/components/ui/metric-card';
import { PageHeader } from '@/components/ui/page-header';
import { QrCustomizeModal } from '@/components/qr/qr-customize-modal';
import { Tabs } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/toast';
import { useWorkspace } from '@/contexts/workspace-context';
import {
  useLinkAnalytics,
  workspaceQueryKeys,
} from '@/hooks/use-workspace-data';
import { interpolate } from '@/i18n';
import { useLanguage } from '@/i18n/language-provider';
import { formatDate, formatDateTime, truncateText } from '@/lib/format';
import {
  canToggleLinkStatus,
  getLinkStatusBadgeClass,
  getLinkStatusLabel,
  isLinkOperational,
} from '@/lib/link-status';
import { linksService } from '@/services/links';
import type { GroupedStat, LinkAnalytics } from '@/types/analytics';
import type {
  LinkStatus,
} from '@/types/links';

export default function LinkDetailPage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <LinkDetailPageContent />
    </Suspense>
  );
}

function LinkDetailPageContent() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const linkId = params.id;
  const { t, locale } = useLanguage();
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const { currentWorkspace, isLoading: workspaceLoading } = useWorkspace();
  const queryClient = useQueryClient();
  const analyticsQuery = useLinkAnalytics(currentWorkspace?.id, linkId, {
    days: 14,
  });
  const analytics = analyticsQuery.data;
  const defaultTab =
    searchParams.get('tab') === 'settings' ? 'settings' : 'overview';

  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isMutating, setIsMutating] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editAlias, setEditAlias] = useState('');
  const [editOriginalUrl, setEditOriginalUrl] = useState('');
  const [editExpiresAt, setEditExpiresAt] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [clearPassword, setClearPassword] = useState(false);
  const analyticsKey = workspaceQueryKeys.linkAnalytics(
    currentWorkspace?.id ?? 'none',
    linkId,
    { days: 14 },
  );

  function updateCachedAnalytics(
    updater: (current: LinkAnalytics | undefined) => LinkAnalytics | undefined,
  ) {
    queryClient.setQueryData<LinkAnalytics>(analyticsKey, updater);
  }

  useEffect(() => {
    if (!analytics) return;
    setEditTitle(analytics.link.title ?? '');
    setEditAlias(analytics.link.shortCode);
    setEditOriginalUrl(analytics.link.originalUrl);
    setEditExpiresAt(
      analytics.link.expiresAt
        ? toDateTimeLocalValue(analytics.link.expiresAt)
        : '',
    );
    setEditPassword('');
    setClearPassword(false);
  }, [analytics]);

  async function handleCopy() {
    if (!analytics) return;

    try {
      await navigator.clipboard.writeText(analytics.link.shortUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setError(t.linkDetail.copyFailed);
    }
  }

  function handleOpenShare() {
    setIsShareOpen(true);
  }

  async function handleSaveEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!analytics) return;

    const nextAlias = editAlias.trim();
    if (nextAlias.length < 3) {
      setError(t.links.aliasHint);
      return;
    }

    const aliasChanged = nextAlias !== analytics.link.shortCode;
    if (aliasChanged) {
      const nextUrl = analytics.link.shortUrl.replace(
        /\/[^/]+$/,
        `/${nextAlias}`,
      );
      const confirmed = await confirm({
        title: t.linkDetail.aliasChangeTitle,
        description: interpolate(t.linkDetail.aliasChangeConfirm, {
          oldUrl: analytics.link.shortUrl,
          newUrl: nextUrl,
        }),
        confirmLabel: t.common.save,
        variant: 'danger',
      });
      if (!confirmed) return;
    }

    setError('');
    setIsSavingEdit(true);

    try {
      const response = await linksService.update(analytics.link.id, {
            title: editTitle.trim(),
            originalUrl: editOriginalUrl.trim(),
            expiresAt: editExpiresAt
              ? new Date(editExpiresAt).toISOString()
              : null,
            ...(aliasChanged ? { customAlias: nextAlias } : {}),
            ...(clearPassword
              ? { password: null }
              : editPassword.trim()
                ? { password: editPassword.trim() }
                : {}),
      });

      updateCachedAnalytics((current) => {
        if (!current) return current;
        return {
          ...current,
          link: { ...current.link, ...response.link },
        };
      });
      setEditPassword('');
      setClearPassword(false);
      if (aliasChanged) {
        setEditAlias(response.link.shortCode);
        await queryClient.invalidateQueries({
          queryKey: workspaceQueryKeys.workspace(
            currentWorkspace?.id ?? 'none',
          ),
        });
      }

      showToast(t.linkDetail.saved);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.linkDetail.saveFailed);
    } finally {
      setIsSavingEdit(false);
    }
  }

  async function handleToggleStatus() {
    if (!analytics) return;

    if (!canToggleLinkStatus(analytics.link.status)) {
      setError(t.linkDetail.expiredToggleError);
      return;
    }

    const nextStatus: LinkStatus =
      analytics.link.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE';

    if (nextStatus === 'DISABLED') {
      const confirmed = await confirm({
        title: t.links.deactivate,
        description: interpolate(t.links.deactivateConfirm, {
          name: analytics.link.title ?? analytics.link.shortCode,
        }),
        confirmLabel: t.links.deactivate,
        variant: 'danger',
      });
      if (!confirmed) return;
    }

    setError('');
    setIsMutating(true);

    try {
      const response = await linksService.updateStatus(analytics.link.id, nextStatus);

      updateCachedAnalytics((current) => {
        if (!current) return current;
        return {
          ...current,
          link: { ...current.link, status: response.link.status },
        };
      });

      showToast(
        nextStatus === 'ACTIVE' ? t.links.activated : t.links.deactivated,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : t.linkDetail.toggleFailed);
    } finally {
      setIsMutating(false);
    }
  }

  async function handleDeleteLink() {
    if (!analytics) return;

    const confirmed = await confirm({
      title: t.common.delete,
      description: interpolate(t.linkDetail.deleteConfirm, {
        name: analytics.link.title ?? analytics.link.shortCode,
      }),
      confirmLabel: t.common.delete,
      variant: 'danger',
    });

    if (!confirmed) return;

    setError('');
    setIsMutating(true);

    try {
      await linksService.remove(analytics.link.id);
      if (currentWorkspace) {
        await queryClient.invalidateQueries({
          queryKey: workspaceQueryKeys.workspace(currentWorkspace.id),
        });
      }
      showToast(t.links.deleted);
      router.push('/links');
    } catch (err) {
      setError(err instanceof Error ? err.message : t.linkDetail.deleteFailed);
    } finally {
      setIsMutating(false);
    }
  }

  if (workspaceLoading) {
    return <LoadingScreen text={t.linkDetail.loading} />;
  }

  if (!currentWorkspace) {
    return (
      <AppShell>
        <PageHeader
          badge={t.linkDetail.badge}
          title={t.linkDetail.badge}
          description={t.workspace.createDescription}
        />
        <div className="mt-8">
          <EmptyState
            icon={Building2}
            title={t.workspace.createTitle}
            description={t.workspace.createDescription}
          />
        </div>
      </AppShell>
    );
  }

  if (analyticsQuery.isLoading && !analytics) {
    return <LoadingScreen text={t.linkDetail.loading} />;
  }

  if (analyticsQuery.error && !analytics) {
    return (
      <AppShell>
        <Card className="mx-auto max-w-md text-center">
          <h1 className="text-xl font-semibold text-red-100">
            {t.linkDetail.errorTitle}
          </h1>
          <p className="mt-2 text-sm text-red-200/80">
            {analyticsQuery.error.message}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button onClick={() => void analyticsQuery.refetch()}>
              {t.common.tryAgain}
            </Button>
            <Link href="/links">
              <Button variant="secondary">{t.common.backToLinks}</Button>
            </Link>
          </div>
        </Card>
      </AppShell>
    );
  }

  if (!analytics) return null;

  const isActive = isLinkOperational(analytics.link.status);
  const isExpired = analytics.link.status === 'EXPIRED';
  const canToggle = canToggleLinkStatus(analytics.link.status);

  const last14DaysTotalClicks = analytics.dailyClicks.reduce(
    (total, item) => total + item.clicks,
    0,
  );
  const geoStats =
    analytics.geoStats?.countries?.length
      ? analytics.geoStats.countries
      : Object.entries(
          analytics.recentClicks.reduce<Record<string, number>>(
            (groups, click) => {
              const location =
                [click.city, click.country].filter(Boolean).join(', ') ||
                t.common.unknown;
              groups[location] = (groups[location] ?? 0) + 1;
              return groups;
            },
            {},
          ),
        ).map(([name, count]) => ({ name, count }));

  const overviewContent = (
    <div className="space-y-6">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-eyebrow">{t.linkDetail.qrSection}</p>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              {t.linkDetail.qrSectionDesc}
            </p>
          </div>
          <Button variant="outline" onClick={handleOpenShare}>
            <QrCode className="h-4 w-4" />
            {t.linkDetail.shareCta}
          </Button>
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        <MetricCard
          title={t.linkDetail.totalClicks}
          value={analytics.link.totalClicks}
          description={t.linkDetail.totalClicksDesc}
          icon={MousePointerClick}
        />
        <MetricCard
          title={t.linkDetail.uniqueVisitors}
          value={analytics.uniqueVisitors}
          description={t.linkDetail.uniqueVisitorsDesc}
          icon={Users}
        />
        <MetricCard
          title={t.linkDetail.humanClicks}
          value={analytics.botStats.humanClicks}
          description={t.linkDetail.humanClicksDesc}
          icon={TrendingUp}
        />
        <MetricCard
          title={t.linkDetail.botClicks}
          value={analytics.botStats.botClicks}
          description={t.linkDetail.botClicksDesc}
          icon={Bot}
        />
        <MetricCard
          title={t.linkDetail.last14Days}
          value={last14DaysTotalClicks}
          description={t.linkDetail.last14DaysDesc}
          icon={Link2}
        />
      </div>

      <Card>
        <CardHeader
          title={t.linkDetail.chartTitle}
          description={t.linkDetail.chartDesc}
        />
        <DailyClicksChart
          data={analytics.dailyClicks}
          clickLabel={t.common.click}
          locale={locale}
        />
      </Card>
    </div>
  );

  const trafficContent = (
    <div className="grid gap-6 lg:grid-cols-2">
      <StatsPanel
        title={t.linkDetail.deviceStats}
        items={analytics.deviceStats}
        noDataLabel={t.linkDetail.noData}
      />
      <StatsPanel
        title={t.linkDetail.browserStats}
        items={analytics.browserStats}
        noDataLabel={t.linkDetail.noData}
      />
      <StatsPanel
        title={t.linkDetail.osStats}
        items={analytics.osStats}
        noDataLabel={t.linkDetail.noData}
      />
      <StatsPanel
        title={t.linkDetail.referrerStats}
        items={analytics.referrerStats}
        noDataLabel={t.linkDetail.noData}
      />
      <StatsPanel
        title={t.linkDetail.utmStats}
        items={analytics.utmSourceStats ?? []}
        noDataLabel={t.linkDetail.noData}
      />
      <StatsPanel
        title={t.linkDetail.geoStats}
        items={geoStats}
        noDataLabel={t.linkDetail.noData}
      />
    </div>
  );

  const clicksContent = (
    <Card>
      <CardHeader
        title={t.linkDetail.recentClicks}
        description={t.linkDetail.recentClicksDesc}
      />

      <div className="mt-6 hidden overflow-hidden rounded-2xl border border-[var(--border)] md:block">
        <div className="grid grid-cols-[1.2fr_1fr_1fr_1fr_1fr] border-b border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-xs uppercase tracking-wide text-[var(--muted-foreground)]">
          <div>{t.linkDetail.time}</div>
          <div>{t.linkDetail.device}</div>
          <div>{t.linkDetail.browser}</div>
          <div>{t.linkDetail.source}</div>
          <div>{t.linkDetail.type}</div>
        </div>

        {analytics.recentClicks.length === 0 ? (
          <div className="bg-[var(--surface)] p-6 text-sm text-[var(--muted-foreground)]">
            {t.linkDetail.noClicks}
          </div>
        ) : (
          analytics.recentClicks.map((click) => (
            <div
              key={click.id}
              className="grid grid-cols-[1.2fr_1fr_1fr_1fr_1fr] gap-3 border-b border-[var(--border)] bg-[var(--surface)] px-4 py-4 text-sm last:border-b-0"
            >
              <div className="text-[var(--foreground)]">
                {formatDateTime(click.clickedAt, locale)}
              </div>
              <div className="text-[var(--muted-foreground)]">{click.deviceType}</div>
              <div className="text-[var(--muted-foreground)]">
                {click.browser ?? t.common.unknown} ·{' '}
                {click.os ?? t.common.unknown}
              </div>
              <div className="break-all text-[var(--muted-foreground)]">
                {click.referrer ?? t.common.direct}
              </div>
              <div>
                <Badge variant={click.isBot ? 'warning' : 'success'}>
                  {click.isBot ? t.common.bot : t.common.human}
                </Badge>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="mt-6 space-y-3 md:hidden">
        {analytics.recentClicks.length === 0 ? (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 text-sm text-[var(--muted-foreground)]">
            {t.linkDetail.noClicks}
          </div>
        ) : (
          analytics.recentClicks.map((click) => (
            <div
              key={click.id}
              className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 text-sm"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="font-medium text-[var(--foreground)]">
                  {formatDateTime(click.clickedAt, locale)}
                </span>
                <Badge variant={click.isBot ? 'warning' : 'success'}>
                  {click.isBot ? t.common.bot : t.common.human}
                </Badge>
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-3">
                <div>
                  <dt className="text-caption">{t.linkDetail.device}</dt>
                  <dd className="mt-1 text-[var(--foreground)]">{click.deviceType}</dd>
                </div>
                <div>
                  <dt className="text-caption">{t.linkDetail.browser}</dt>
                  <dd className="mt-1 text-[var(--foreground)]">
                    {click.browser ?? t.common.unknown} ·{' '}
                    {click.os ?? t.common.unknown}
                  </dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-caption">{t.linkDetail.source}</dt>
                  <dd className="mt-1 break-all text-[var(--foreground)]">
                    {click.referrer ?? t.common.direct}
                  </dd>
                </div>
              </dl>
            </div>
          ))
        )}
      </div>
    </Card>
  );

  const settingsContent = (
    <div className="max-w-2xl">
      <Card>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-[var(--muted-foreground)]">{t.linkDetail.status}</p>
            <span
              className={`mt-2 inline-flex ${getLinkStatusBadgeClass(analytics.link.status)}`}
            >
              {getLinkStatusLabel(analytics.link.status, t)}
            </span>
          </div>
          <div
            className={
              isActive
                ? 'h-3 w-3 rounded-full bg-emerald-400 shadow-lg shadow-emerald-400/40'
                : isExpired
                  ? 'h-3 w-3 rounded-full bg-red-400 shadow-lg shadow-red-400/40'
                  : 'h-3 w-3 rounded-full bg-amber-400 shadow-lg shadow-amber-400/40'
            }
          />
        </div>

        {isExpired && (
          <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {t.linkDetail.expiredNotice}
          </div>
        )}

        <p className="mt-4 text-sm text-[var(--muted-foreground)]">
          {t.linkDetail.created}: {formatDate(analytics.link.createdAt, locale)}
        </p>

        {analytics.link.expiresAt && (
          <p className="mt-2 text-sm text-[var(--muted-foreground)]">
            {t.linkDetail.expires}:{' '}
            {formatDateTime(analytics.link.expiresAt, locale)}
          </p>
        )}

        <form
          onSubmit={handleSaveEdit}
          className="mt-6 space-y-4 border-t border-[var(--border)] pt-6"
        >
          <Input
            label={t.linkDetail.editTitle}
            value={editTitle}
            onChange={(event) => setEditTitle(event.target.value)}
          />

          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--muted)]">
              {t.linkDetail.customAlias}
            </label>
            <div className="flex overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] focus-within:border-[var(--accent)]">
              <span className="border-r border-[var(--border)] px-4 py-3 text-sm text-[var(--muted-foreground)]">
                /
              </span>
              <input
                value={editAlias}
                onChange={(event) => setEditAlias(event.target.value)}
                className="w-full bg-transparent px-4 py-3 text-sm outline-none"
                placeholder={t.links.aliasPlaceholder}
                minLength={3}
                maxLength={32}
                pattern="[A-Za-z0-9_-]+"
                required
              />
            </div>
            <p className="mt-2 text-xs text-[var(--muted-foreground)]">
              {t.linkDetail.customAliasHint}
            </p>
          </div>

          <Input
            label={t.linkDetail.targetUrl}
            value={editOriginalUrl}
            onChange={(event) => setEditOriginalUrl(event.target.value)}
            type="url"
            required
          />

          <Input
            label={t.linkDetail.expiresAt}
            value={editExpiresAt}
            onChange={(event) => setEditExpiresAt(event.target.value)}
            type="datetime-local"
            hint={t.linkDetail.expiresHint}
          />

          {analytics.link.hasPassword && (
            <p className="rounded-xl border border-amber-400/20 bg-amber-400/5 px-4 py-3 text-sm text-amber-100">
              {t.linkDetail.passwordProtected}
            </p>
          )}

          <Input
            label={t.linkDetail.password}
            value={editPassword}
            onChange={(event) => {
              setEditPassword(event.target.value);
              if (event.target.value) setClearPassword(false);
            }}
            type="password"
            autoComplete="new-password"
            minLength={4}
            maxLength={72}
            disabled={clearPassword}
            placeholder={t.linkDetail.passwordPlaceholder}
            hint={t.linkDetail.passwordHint}
          />

          {analytics.link.hasPassword && (
            <label className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--muted)]">
              <input
                type="checkbox"
                checked={clearPassword}
                onChange={(event) => {
                  setClearPassword(event.target.checked);
                  if (event.target.checked) setEditPassword('');
                }}
                className="h-4 w-4 rounded border-[var(--border-strong)] bg-[var(--surface)] text-[var(--accent)]"
              />
              {t.linkDetail.clearPassword}
            </label>
          )}

          <Button type="submit" disabled={isSavingEdit} fullWidth>
            {isSavingEdit ? t.common.saving : t.linkDetail.saveChanges}
          </Button>
        </form>

        <div className="mt-6 space-y-3">
          {canToggle && (
            <Button
              variant={isActive ? 'outline' : 'secondary'}
              onClick={handleToggleStatus}
              disabled={isMutating}
              fullWidth
            >
              {isMutating
                ? t.common.processing
                : isActive
                  ? t.linkDetail.disableLink
                  : t.linkDetail.enableLink}
            </Button>
          )}

          <Button
            variant="outline"
            onClick={handleOpenShare}
            fullWidth
          >
            {t.linkDetail.generateQr}
          </Button>

          <Button
            variant="danger"
            onClick={handleDeleteLink}
            disabled={isMutating}
            fullWidth
          >
            {t.linkDetail.deleteLink}
          </Button>
        </div>
      </Card>
    </div>
  );

  return (
    <AppShell>
      <div className="min-w-0">
        <Link href="/links" className="text-sm text-[var(--accent)] hover:underline">
          ← {t.common.backToLinks}
        </Link>

        <Badge variant="accent" className="mt-5">
          {t.linkDetail.badge}
        </Badge>

        <h1 className="mt-4 break-words text-3xl font-bold tracking-tight md:text-4xl">
          {analytics.link.title ?? analytics.link.shortCode}
        </h1>

        <p className="mt-3 max-w-3xl break-all text-[var(--muted-foreground)]">
          {truncateText(analytics.link.originalUrl, 120)}
        </p>

        <div className="mt-5 flex min-w-0 flex-wrap items-center gap-3">
          <span className="min-w-0 max-w-full break-all rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm text-[var(--accent)]">
            {analytics.link.shortUrl}
          </span>

          <Button size="sm" onClick={handleCopy}>
            {copied ? t.common.copied : t.common.copy}
          </Button>

          {isActive ? (
            <a href={analytics.link.shortUrl} target="_blank" rel="noreferrer">
              <Button variant="outline" size="sm">
                {t.common.testLink}
              </Button>
            </a>
          ) : isExpired ? (
            <Badge variant="danger">{t.linkDetail.expired}</Badge>
          ) : (
            <Badge variant="warning">{t.linkDetail.disabled}</Badge>
          )}

          <Button variant="outline" size="sm" onClick={handleOpenShare}>
            <QrCode className="h-4 w-4" />
            {t.linkDetail.shareCta}
          </Button>
        </div>
      </div>

      <div className="mt-6">
        <ErrorBanner message={error} />
      </div>

      <div className="mt-8">
        <Tabs
          variant="pill"
          defaultTab={defaultTab}
          tabs={[
            { id: 'overview', label: t.linkDetail.overview, content: overviewContent },
            { id: 'traffic', label: t.linkDetail.traffic, content: trafficContent },
            { id: 'clicks', label: t.linkDetail.clicksTab, content: clicksContent },
            { id: 'settings', label: t.linkDetail.settings, content: settingsContent },
          ]}
        />
      </div>

      <QrCustomizeModal
        open={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        shortUrl={analytics.link.shortUrl}
        shortCode={analytics.link.shortCode}
        title={t.linkDetail.qrSection}
        description={t.linkDetail.qrSectionDesc}
        onCopyLink={() => void handleCopy()}
        onError={setError}
      />
    </AppShell>
  );
}

function toDateTimeLocalValue(value: string) {
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

function StatsPanel({
  title,
  items,
  noDataLabel,
}: {
  title: string;
  items: GroupedStat[];
  noDataLabel: string;
}) {
  const total = items.reduce((sum, item) => sum + item.count, 0);

  return (
    <Card>
      <h2 className="text-xl font-semibold">{title}</h2>
      <div className="mt-6 space-y-4">
        {items.length === 0 ? (
          <p className="text-sm text-[var(--muted-foreground)]">{noDataLabel}</p>
        ) : (
          items.map((item) => {
            const percent =
              total > 0 ? Math.round((item.count / total) * 100) : 0;

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
          })
        )}
      </div>
    </Card>
  );
}
