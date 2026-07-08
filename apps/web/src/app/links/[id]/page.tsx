'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { ErrorBanner } from '@/components/ui/error-banner';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { MetricCard } from '@/components/ui/metric-card';
import { apiRequest } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { formatDate, formatDateTime, truncateText } from '@/lib/format';
import { createQrCodeDataUrl } from '@/lib/qr';
import {
  canToggleLinkStatus,
  getLinkStatusBadgeClass,
  getLinkStatusLabel,
  isLinkOperational,
} from '@/lib/link-status';
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
  const [successMessage, setSuccessMessage] = useState('');

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
          data.link.expiresAt
            ? toDateTimeLocalValue(data.link.expiresAt)
            : '',
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Analytics verisi yüklenemedi.');
      } finally {
        setIsLoading(false);
      }
    }

    loadAnalytics();
  }, [linkId, router]);

  async function handleCopy() {
    if (!analytics) return;

    try {
      await navigator.clipboard.writeText(analytics.link.shortUrl);
      setCopied(true);

      window.setTimeout(() => {
        setCopied(false);
      }, 1500);
    } catch {
      setError('Kopyalama işlemi başarısız oldu.');
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
      setError('QR kod oluşturulamadı.');
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
    setSuccessMessage('');
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
          link: {
            ...current.link,
            ...response.link,
          },
        };
      });

      setSuccessMessage('Link bilgileri güncellendi.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Link güncellenemedi.');
    } finally {
      setIsSavingEdit(false);
    }
  }

  async function handleToggleStatus() {
    if (!analytics) return;

    if (!canToggleLinkStatus(analytics.link.status)) {
      setError(
        'Süresi dolmuş linkleri aktif etmek için önce bitiş tarihini güncelle.',
      );
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
          body: {
            status: nextStatus,
          },
        },
      );

      setAnalytics((current) => {
        if (!current) return current;

        return {
          ...current,
          link: {
            ...current.link,
            status: response.link.status,
          },
        };
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Link durumu güncellenemedi.',
      );
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

    const confirmed = window.confirm(
      `"${analytics.link.title ?? analytics.link.shortCode}" linkini silmek istediğine emin misin? Bu işlem geri alınamaz.`,
    );

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
      setError(err instanceof Error ? err.message : 'Link silinemedi.');
    } finally {
      setIsMutating(false);
    }
  }

  if (isLoading) {
    return <LoadingScreen text="Analytics yükleniyor..." />;
  }

  if (error && !analytics) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
        <div className="max-w-md rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-center text-red-100">
          <h1 className="text-xl font-semibold">Bir sorun oluştu</h1>
          <p className="mt-2 text-sm">{error}</p>

          <Link
            href="/links"
            className="mt-6 inline-flex rounded-xl bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800"
          >
            Linklere dön
          </Link>
        </div>
      </main>
    );
  }

  if (!analytics) {
    return null;
  }

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
            ← Linklere dön
          </Link>

          <div className="mt-5 inline-flex rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-200">
            Link Analytics
          </div>

          <h1 className="mt-4 break-words text-4xl font-bold tracking-tight">
            {analytics.link.title ?? analytics.link.shortCode}
          </h1>

          <p className="mt-3 max-w-3xl break-all text-slate-400">
            {truncateText(analytics.link.originalUrl, 120)}
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <span className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-2 text-sm text-cyan-300">
              {analytics.link.shortUrl}
            </span>

            <button
              onClick={handleCopy}
              className="rounded-xl bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
            >
              {copied ? 'Kopyalandı' : 'Kopyala'}
            </button>

            {isActive ? (
              <a
                href={analytics.link.shortUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-200 transition hover:bg-slate-900"
              >
                Test Et
              </a>
            ) : isExpired ? (
              <span className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-200">
                Süresi doldu
              </span>
            ) : (
              <span className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm text-amber-200">
                Link pasif
              </span>
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-black/20">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-slate-400">Link Durumu</p>
              <span
                className={`mt-2 inline-flex ${getLinkStatusBadgeClass(analytics.link.status)}`}
              >
                {getLinkStatusLabel(analytics.link.status)}
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
              Bu linkin süresi doldu. Yeniden aktif etmek için bitiş tarihini
              güncelle.
            </div>
          )}

          <p className="mt-4 text-sm text-slate-500">
            Created: {formatDate(analytics.link.createdAt)}
          </p>

          {analytics.link.expiresAt && (
            <p className="mt-2 text-sm text-slate-500">
              Expires: {formatDateTime(analytics.link.expiresAt)}
            </p>
          )}

          <form onSubmit={handleSaveEdit} className="mt-6 space-y-4 border-t border-slate-800 pt-6">
            <div>
              <label className="text-sm text-slate-400">Başlık</label>
              <input
                value={editTitle}
                onChange={(event) => setEditTitle(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm outline-none transition focus:border-cyan-400"
                placeholder="Link başlığı"
              />
            </div>

            <div>
              <label className="text-sm text-slate-400">Hedef URL</label>
              <input
                value={editOriginalUrl}
                onChange={(event) => setEditOriginalUrl(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm outline-none transition focus:border-cyan-400"
                type="url"
                required
              />
            </div>

            <div>
              <label className="text-sm text-slate-400">Bitiş tarihi</label>
              <input
                value={editExpiresAt}
                onChange={(event) => setEditExpiresAt(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm outline-none transition focus:border-cyan-400"
                type="datetime-local"
              />
              <p className="mt-2 text-xs text-slate-500">
                Boş bırakırsan süresiz olur.
              </p>
            </div>

            <button
              type="submit"
              disabled={isSavingEdit}
              className="w-full rounded-xl bg-cyan-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSavingEdit ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
            </button>
          </form>

          <div className="mt-6 space-y-3">
            {canToggle ? (
              <button
                onClick={handleToggleStatus}
                disabled={isMutating}
                className={
                  isActive
                    ? 'w-full rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm font-medium text-amber-200 transition hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-60'
                    : 'w-full rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-200 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60'
                }
              >
                {isMutating
                  ? 'İşleniyor...'
                  : isActive
                    ? 'Linki Pasifleştir'
                    : 'Linki Aktif Et'}
              </button>
            ) : null}

            <button
              onClick={handleGenerateQr}
              disabled={isQrLoading}
              className="w-full rounded-xl border border-blue-400/30 bg-blue-400/10 px-4 py-3 text-sm font-medium text-blue-200 transition hover:bg-blue-400/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isQrLoading ? 'QR oluşturuluyor...' : 'QR Code Oluştur'}
            </button>

            {qrDataUrl && (
              <button
                onClick={handleDownloadQr}
                className="w-full rounded-xl bg-cyan-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
              >
                QR PNG İndir
              </button>
            )}

            <button
              onClick={handleDeleteLink}
              disabled={isMutating}
              className="w-full rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-200 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Linki Sil
            </button>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <ErrorBanner message={error} />
        {successMessage && (
          <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
            {successMessage}
          </div>
        )}
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard
          title="Toplam Tıklama"
          value={analytics.link.totalClicks}
          description="Bu linke gelen toplam trafik"
        />

        <MetricCard
          title="Benzersiz Ziyaretçi"
          value={analytics.uniqueVisitors}
          description="Cookie tabanlı tekil ziyaretçi sayısı"
        />

        <MetricCard
          title="Gerçek Kullanıcı"
          value={analytics.botStats.humanClicks}
          description="Bot olarak algılanmayan ziyaretler"
        />

        <MetricCard
          title="Bot Tıklama"
          value={analytics.botStats.botClicks}
          description="Crawler / bot olarak işaretlenen ziyaretler"
        />

        <MetricCard
          title="Son 14 Gün"
          value={last14DaysTotalClicks}
          description="Son iki haftadaki toplam tıklama"
        />
      </div>

      {qrDataUrl && (
        <div className="mt-8 grid gap-6 lg:grid-cols-[320px_1fr]">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-black/20">
            <h2 className="text-xl font-semibold">QR Code</h2>
            <p className="mt-1 text-sm text-slate-400">
              Bu QR kod kısa linke yönlendirir.
            </p>

            <div className="mt-6 rounded-2xl bg-white p-4">
              <img
                src={qrDataUrl}
                alt={`${analytics.link.shortCode} QR code`}
                className="h-full w-full rounded-xl"
              />
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-black/20">
            <h2 className="text-xl font-semibold">Paylaşım Bilgisi</h2>

            <div className="mt-6 space-y-4">
              <div>
                <p className="text-sm text-slate-400">Kısa link</p>
                <p className="mt-2 break-all rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-cyan-300">
                  {analytics.link.shortUrl}
                </p>
              </div>

              <div>
                <p className="text-sm text-slate-400">Hedef URL</p>
                <p className="mt-2 break-all rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-300">
                  {analytics.link.originalUrl}
                </p>
              </div>

              <button
                onClick={handleDownloadQr}
                className="rounded-xl bg-cyan-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
              >
                QR PNG İndir
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mt-8 rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-black/20">
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-xl font-semibold">Son 14 gün tıklama grafiği</h2>
            <p className="mt-1 text-sm text-slate-400">
              Kısa linkin günlük tıklama trendi.
            </p>
          </div>
        </div>

        <DailyClicksChart data={analytics.dailyClicks} maxValue={maxDailyClick} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <StatsPanel title="Cihaz Dağılımı" items={analytics.deviceStats} />
        <StatsPanel title="Tarayıcı Dağılımı" items={analytics.browserStats} />
        <StatsPanel title="İşletim Sistemi" items={analytics.osStats} />
        <StatsPanel title="Referrer Kaynakları" items={analytics.referrerStats} />
      </div>

      <div className="mt-8 rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-black/20">
        <h2 className="text-xl font-semibold">Son tıklamalar</h2>
        <p className="mt-1 text-sm text-slate-400">
          Bu linke gelen son ziyaret kayıtları.
        </p>

        <div className="mt-6 overflow-hidden rounded-2xl border border-slate-800">
          <div className="hidden grid-cols-[1.2fr_1fr_1fr_1fr_1fr] border-b border-slate-800 bg-slate-950 px-4 py-3 text-xs uppercase tracking-wide text-slate-500 md:grid">
            <div>Zaman</div>
            <div>Cihaz</div>
            <div>Tarayıcı</div>
            <div>Kaynak</div>
            <div>Tip</div>
          </div>

          {analytics.recentClicks.length === 0 ? (
            <div className="bg-slate-950 p-6 text-sm text-slate-400">
              Henüz tıklama yok.
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
                  {click.browser ?? 'Unknown'} · {click.os ?? 'Unknown'}
                </div>

                <div className="break-all text-slate-400">
                  {click.referrer ?? 'Direct'}
                </div>

                <div>
                  <span
                    className={
                      click.isBot
                        ? 'rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-1 text-xs text-amber-200'
                        : 'rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-xs text-emerald-200'
                    }
                  >
                    {click.isBot ? 'Bot' : 'Human'}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
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
}: {
  data: DailyClick[];
  maxValue: number;
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
                style={{
                  height: `${height}%`,
                }}
                title={`${item.date}: ${item.clicks} click`}
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

function StatsPanel({ title, items }: { title: string; items: GroupedStat[] }) {
  const total = items.reduce((sum, item) => sum + item.count, 0);

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-black/20">
      <h2 className="text-xl font-semibold">{title}</h2>

      <div className="mt-6 space-y-4">
        {items.length === 0 ? (
          <p className="text-sm text-slate-400">Henüz veri yok.</p>
        ) : (
          items.map((item) => {
            const percent = total > 0 ? Math.round((item.count / total) * 100) : 0;

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
                    style={{
                      width: `${Math.max(percent, 4)}%`,
                    }}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
  