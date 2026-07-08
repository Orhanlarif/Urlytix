'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { ErrorBanner } from '@/components/ui/error-banner';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { MetricCard } from '@/components/ui/metric-card';
import { apiRequest } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { getToken } from '@/lib/auth';
import type { DashboardOverview } from '@/types/analytics';

export default function DashboardPage() {
  const router = useRouter();

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
        setError(err instanceof Error ? err.message : 'Dashboard yüklenemedi.');
      } finally {
        setIsLoading(false);
      }
    }

    loadDashboard();
  }, [router]);

  if (isLoading) {
    return <LoadingScreen text="Dashboard yükleniyor..." />;
  }

  return (
    <AppShell>
      <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
        <div>
          <div className="mb-4 inline-flex rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-200">
            Overview
          </div>

          <h1 className="text-4xl font-bold tracking-tight">Dashboard</h1>

          <p className="mt-3 max-w-2xl text-slate-400">
            Link performansını, toplam tıklamaları ve son ziyaretleri tek yerden takip et.
          </p>
        </div>

        <Link
          href="/links"
          className="rounded-xl bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
        >
          Yeni Link Oluştur
        </Link>
      </div>

      <div className="mt-6">
        <ErrorBanner message={error} />
      </div>

      {overview && (
        <>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <MetricCard
              title="Toplam Link"
              value={overview.totalLinks}
              description="Hesabında oluşturulan tüm linkler"
            />

            <MetricCard
              title="Toplam Tıklama"
              value={overview.totalClicks}
              description="Tüm linklerden gelen toplam trafik"
            />

            <MetricCard
              title="Bugünkü Tıklama"
              value={overview.clicksToday}
              description="Bugün kaydedilen toplam ziyaret"
            />
          </div>

          <div className="mt-8 rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-black/20">
            <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
              <div>
                <h2 className="text-xl font-semibold">Son 14 gün</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Günlük toplam tıklama trendi.
                </p>
              </div>
            </div>

            <MiniDailyChart data={overview.dailyClicks} />
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-black/20">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold">En iyi linkler</h2>
                  <p className="mt-1 text-sm text-slate-400">
                    En fazla tıklama alan linklerin.
                  </p>
                </div>

                <Link href="/links" className="text-sm text-cyan-300 hover:underline">
                  Tümünü gör
                </Link>
              </div>

              <div className="mt-6 space-y-4">
                {overview.topLinks.length === 0 ? (
                  <EmptyBox
                    title="Henüz link yok"
                    description="İlk linkini oluşturarak analytics toplamaya başla."
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
                          {link.totalClicks} click
                        </div>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-black/20">
              <h2 className="text-xl font-semibold">Son tıklamalar</h2>
              <p className="mt-1 text-sm text-slate-400">
                Sisteme düşen son ziyaret kayıtları.
              </p>

              <div className="mt-6 space-y-4">
                {overview.recentClicks.length === 0 ? (
                  <EmptyBox
                    title="Henüz tıklama yok"
                    description="Kısa linklerin paylaşıldığında ziyaretler burada görünecek."
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
                            {click.deviceType} · {click.browser ?? 'Unknown'} ·{' '}
                            {click.os ?? 'Unknown'}
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
                          {click.isBot ? 'Bot' : 'Human'}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </AppShell>
  );
}

function MiniDailyChart({
  data,
}: {
  data: Array<{
    date: string;
    clicks: number;
  }>;
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