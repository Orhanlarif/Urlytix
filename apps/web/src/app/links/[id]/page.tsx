'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  Bot,
  Link2,
  MousePointerClick,
  TrendingUp,
  Users,
} from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader } from '@/components/ui/card';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { ErrorBanner } from '@/components/ui/error-banner';
import { Input } from '@/components/ui/input';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { MetricCard } from '@/components/ui/metric-card';
import { useToast } from '@/components/ui/toast';
import { interpolate } from '@/i18n';
import { useLanguage } from '@/i18n/language-provider';
import { apiRequest } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { formatDate, formatDateTime, truncateText } from '@/lib/format';
import {
  canToggleLinkStatus,
  getLinkStatusBadgeClass,
  getLinkStatusLabel,
  isLinkOperational,
} from '@/lib/link-status';
import { createQrCodeDataUrl } from '@/lib/qr';
import type { DailyClick, GroupedStat, LinkAnalytics } from '@/types/analytics';
import type {
  DeleteLinkResponse,
  LinkStatus,
  UpdateLinkResponse,
  UpdateLinkStatusResponse,
} from '@/types/links';

export default function LinkDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const linkId = params.id;
  const { t } = useLanguage();
  const { showToast } = useToast();
  const { confirm } = useConfirm();

  const [analytics, setAnalytics] = useState<LinkAnalytics | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [isQrLoading, setIsQrLoading] = useState(false);
  const [isMutating, setIsMutating] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editOriginalUrl, setEditOriginalUrl] = useState('');
  const [editExpiresAt, setEditExpiresAt] = useState('');

  const maxDailyClick = useMemo(() => {
    if (!analytics) return 0;
    return Math.max(...analytics.dailyClicks.map((item) => item.clicks), 1);
  }, [analytics]);

  useEffect(() => {
    async function loadAnalytics() {
      const token = getToken();

      if (!token) {
        router.push('/login');
        return;
      }

      try {
        const data = await apiRequest<LinkAnalytics>(`/analytics/links/${linkId}`, {
          token,
        });

        setAnalytics(data);
        setEditTitle(data.link.title ?? '');
        setEditOriginalUrl(data.link.originalUrl);
        setEditExpiresAt(
          data.link.expiresAt ? toDateTimeLocalValue(data.link.expiresAt) : '',
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : t.linkDetail.loadFailed);
      } finally {
        setIsLoading(false);
      }
    }

    loadAnalytics();
  }, [linkId, router, t.linkDetail.loadFailed]);

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

  async function handleGenerateQr() {
    if (!analytics) return;

    setError('');
    setIsQrLoading(true);

    try {
      const dataUrl = await createQrCodeDataUrl(analytics.link.shortUrl);
      setQrDataUrl(dataUrl);
    } catch {
      setError(t.linkDetail.qrFailed);
    } finally {
      setIsQrLoading(false);
    }
  }

  function handleDownloadQr() {
    if (!qrDataUrl || !analytics) return;

    const downloadLink = document.createElement('a');
    downloadLink.href = qrDataUrl;
    downloadLink.download = `${analytics.link.shortCode}-qr.png`;
    downloadLink.click();
  }

  async function handleSaveEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!analytics) return;

    const token = getToken();
    if (!token) {
      router.push('/login');
      return;
    }

    setError('');
    setIsSavingEdit(true);

    try {
      const response = await apiRequest<UpdateLinkResponse>(
        `/links/${analytics.link.id}`,
        {
          method: 'PATCH',
          token,
          body: {
            title: editTitle.trim(),
            originalUrl: editOriginalUrl.trim(),
            expiresAt: editExpiresAt
              ? new Date(editExpiresAt).toISOString()
              : null,
          },
        },
      );

      setAnalytics((current) => {
        if (!current) return current;
        return {
          ...current,
          link: { ...current.link, ...response.link },
        };
      });

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

    const token = getToken();
    if (!token) {
      router.push('/login');
      return;
    }

    const nextStatus: LinkStatus =
      analytics.link.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE';

    setError('');
    setIsMutating(true);

    try {
      const response = await apiRequest<UpdateLinkStatusResponse>(
        `/links/${analytics.link.id}/status`,
        {
          method: 'PATCH',
          token,
          body: { status: nextStatus },
        },
      );

      setAnalytics((current) => {
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

    const token = getToken();
    if (!token) {
      router.push('/login');
      return;
    }

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
      await apiRequest<DeleteLinkResponse>(`/links/${analytics.link.id}`, {
        method: 'DELETE',
        token,
      });

      router.push('/links');
    } catch (err) {
      setError(err instanceof Error ? err.message : t.linkDetail.deleteFailed);
    } finally {
      setIsMutating(false);
    }
  }

  if (isLoading) {
    return <LoadingScreen text={t.linkDetail.loading} />;
  }

  if (error && !analytics) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
        <Card className="max-w-md text-center">
          <h1 className="text-xl font-semibold text-red-100">
            {t.linkDetail.errorTitle}
          </h1>
          <p className="mt-2 text-sm text-red-200/80">{error}</p>
          <Link href="/links" className="mt-6 inline-block">
            <Button variant="secondary">{t.common.backToLinks}</Button>
          </Link>
        </Card>
      </main>
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

  return (
    <AppShell>
      <div className="grid gap-6 lg:grid-cols-[1fr_360px] lg:items-start">
        <div className="min-w-0">
          <Link href="/links" className="text-sm text-cyan-300 hover:underline">
            ← {t.common.backToLinks}
          </Link>

          <Badge variant="accent" className="mt-5">
            {t.linkDetail.badge}
          </Badge>

          <h1 className="mt-4 break-words text-3xl font-bold tracking-tight md:text-4xl">
            {analytics.link.title ?? analytics.link.shortCode}
          </h1>

          <p className="mt-3 max-w-3xl break-all text-slate-400">
            {truncateText(analytics.link.originalUrl, 120)}
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <span className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-2 text-sm text-cyan-300">
              {analytics.link.shortUrl}
            </span>

            <Button size="sm" onClick={handleCopy}>
              {copied ? t.common.copied : t.common.copy}
            </Button>

            {isActive ? (
              <a
                href={analytics.link.shortUrl}
                target="_blank"
                rel="noreferrer"
              >
                <Button variant="outline" size="sm">
                  {t.common.testLink}
                </Button>
              </a>
            ) : isExpired ? (
              <Badge variant="danger">{t.linkDetail.expired}</Badge>
            ) : (
              <Badge variant="warning">{t.linkDetail.disabled}</Badge>
            )}
          </div>
        </div>

        <Card>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-slate-400">{t.linkDetail.status}</p>
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

          <p className="mt-4 text-sm text-slate-500">
            {t.linkDetail.created}: {formatDate(analytics.link.createdAt)}
          </p>

          {analytics.link.expiresAt && (
            <p className="mt-2 text-sm text-slate-500">
              {t.linkDetail.expires}: {formatDateTime(analytics.link.expiresAt)}
            </p>
          )}

          <form
            onSubmit={handleSaveEdit}
            className="mt-6 space-y-4 border-t border-slate-800 pt-6"
          >
            <Input
              label={t.linkDetail.editTitle}
              value={editTitle}
              onChange={(event) => setEditTitle(event.target.value)}
            />

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
              onClick={handleGenerateQr}
              disabled={isQrLoading}
              fullWidth
            >
              {isQrLoading ? t.linkDetail.qrGenerating : t.linkDetail.generateQr}
            </Button>

            {qrDataUrl && (
              <Button onClick={handleDownloadQr} fullWidth>
                {t.common.downloadPng}
              </Button>
            )}

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

      <div className="mt-6">
        <ErrorBanner message={error} />
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
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

      {qrDataUrl && (
        <div className="mt-8 grid gap-6 lg:grid-cols-[320px_1fr]">
          <Card>
            <CardHeader
              title={t.linkDetail.qrSection}
              description={t.linkDetail.qrSectionDesc}
            />
            <div className="mt-6 rounded-2xl bg-white p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrDataUrl}
                alt={`${analytics.link.shortCode} QR`}
                className="h-full w-full rounded-xl"
              />
            </div>
          </Card>

          <Card>
            <CardHeader title={t.linkDetail.shareInfo} />
            <div className="mt-6 space-y-4">
              <div>
                <p className="text-sm text-slate-400">{t.linkDetail.shortLink}</p>
                <p className="mt-2 break-all rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-cyan-300">
                  {analytics.link.shortUrl}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-400">
                  {t.linkDetail.targetUrlLabel}
                </p>
                <p className="mt-2 break-all rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-300">
                  {analytics.link.originalUrl}
                </p>
              </div>
              <Button onClick={handleDownloadQr}>{t.common.downloadPng}</Button>
            </div>
          </Card>
        </div>
      )}

      <Card className="mt-8">
        <CardHeader
          title={t.linkDetail.chartTitle}
          description={t.linkDetail.chartDesc}
        />
        <DailyClicksChart
          data={analytics.dailyClicks}
          maxValue={maxDailyClick}
          clickLabel={t.common.click}
        />
      </Card>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
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
      </div>

      <Card className="mt-8">
        <CardHeader
          title={t.linkDetail.recentClicks}
          description={t.linkDetail.recentClicksDesc}
        />

        <div className="mt-6 overflow-hidden rounded-2xl border border-slate-800">
          <div className="hidden grid-cols-[1.2fr_1fr_1fr_1fr_1fr] border-b border-slate-800 bg-slate-950 px-4 py-3 text-xs uppercase tracking-wide text-slate-500 md:grid">
            <div>{t.linkDetail.time}</div>
            <div>{t.linkDetail.device}</div>
            <div>{t.linkDetail.browser}</div>
            <div>{t.linkDetail.source}</div>
            <div>{t.linkDetail.type}</div>
          </div>

          {analytics.recentClicks.length === 0 ? (
            <div className="bg-slate-950 p-6 text-sm text-slate-400">
              {t.linkDetail.noClicks}
            </div>
          ) : (
            analytics.recentClicks.map((click) => (
              <div
                key={click.id}
                className="grid gap-3 border-b border-slate-800 bg-slate-950 px-4 py-4 text-sm last:border-b-0 md:grid-cols-[1.2fr_1fr_1fr_1fr_1fr]"
              >
                <div className="text-slate-300">
                  {formatDateTime(click.clickedAt)}
                </div>
                <div className="text-slate-400">{click.deviceType}</div>
                <div className="text-slate-400">
                  {click.browser ?? t.common.unknown} ·{' '}
                  {click.os ?? t.common.unknown}
                </div>
                <div className="break-all text-slate-400">
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
      </Card>
    </AppShell>
  );
}

function toDateTimeLocalValue(value: string) {
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

function DailyClicksChart({
  data,
  maxValue,
  clickLabel,
}: {
  data: DailyClick[];
  maxValue: number;
  clickLabel: string;
}) {
  return (
    <div className="mt-8 flex h-64 items-end gap-2 border-b border-slate-800 pb-4">
      {data.map((item) => {
        const height = Math.max(
          (item.clicks / maxValue) * 100,
          item.clicks > 0 ? 8 : 2,
        );

        return (
          <div key={item.date} className="flex flex-1 flex-col items-center gap-3">
            <div className="flex h-52 w-full items-end">
              <div
                className="w-full rounded-t-xl bg-cyan-400/80 transition hover:bg-cyan-300"
                style={{ height: `${height}%` }}
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
          <p className="text-sm text-slate-400">{noDataLabel}</p>
        ) : (
          items.map((item) => {
            const percent =
              total > 0 ? Math.round((item.count / total) * 100) : 0;

            return (
              <div key={item.name}>
                <div className="flex items-center justify-between gap-4 text-sm">
                  <span className="text-slate-300">{item.name}</span>
                  <span className="text-slate-500">
                    {item.count} · {percent}%
                  </span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full bg-cyan-400"
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
