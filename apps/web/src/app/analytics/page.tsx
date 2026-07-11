'use client';

import Link from 'next/link';
import { BarChart3, Link2, MousePointerClick, TrendingUp } from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { Button } from '@/components/ui/button';
import { Card, CardHeader } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorBanner } from '@/components/ui/error-banner';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { MetricCard } from '@/components/ui/metric-card';
import { PageHeader } from '@/components/ui/page-header';
import { useApiResource } from '@/hooks/use-api-resource';
import { useLanguage } from '@/i18n/language-provider';
import { analyticsService } from '@/services/analytics';

export default function AnalyticsPage() {
  const { locale } = useLanguage();
  const copy = locale === 'tr' ? tr : en;
  const { data, error, isLoading } = useApiResource(analyticsService.overview);

  if (isLoading) return <LoadingScreen text={copy.loading} />;

  return (
    <AppShell>
      <PageHeader badge={copy.badge} title={copy.title} description={copy.description} />
      <div className="mt-6"><ErrorBanner message={error} /></div>
      {data && (
        <>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <MetricCard title={copy.totalClicks} value={data.totalClicks} description={copy.allTime} icon={MousePointerClick} />
            <MetricCard title={copy.today} value={data.clicksToday} description={copy.todayDesc} icon={TrendingUp} />
            <MetricCard title={copy.links} value={data.totalLinks} description={copy.linksDesc} icon={Link2} />
          </div>
          <Card className="mt-8">
            <CardHeader title={copy.performance} description={copy.performanceDesc} />
            {data.dailyClicks.length ? (
              <div className="mt-8 flex h-64 items-end gap-2 border-b border-slate-800 pb-4">
                {data.dailyClicks.map((item) => {
                  const max = Math.max(...data.dailyClicks.map((day) => day.clicks), 1);
                  return (
                    <div key={item.date} className="flex h-full flex-1 flex-col justify-end gap-2">
                      <div className="flex flex-1 items-end">
                        <div className="w-full rounded-t-lg bg-gradient-to-t from-cyan-500 to-blue-400" style={{ height: `${Math.max((item.clicks / max) * 100, 3)}%` }} title={`${item.date}: ${item.clicks}`} />
                      </div>
                      <span className="text-center text-[10px] text-slate-500">{item.date.slice(5)}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="mt-6"><EmptyState icon={BarChart3} title={copy.noData} description={copy.noDataDesc} action={<Link href="/links"><Button>{copy.create}</Button></Link>} /></div>
            )}
          </Card>
        </>
      )}
    </AppShell>
  );
}

const tr = {
  loading: 'Analytics yükleniyor...', badge: 'Global Analytics', title: 'Analytics',
  description: 'Tüm linklerinin performansını tek bir görünümde karşılaştır.',
  totalClicks: 'Toplam Tıklama', allTime: 'Tüm zamanlar', today: 'Bugün',
  todayDesc: 'Bugünkü trafik', links: 'Toplam Link', linksDesc: 'Takip edilen linkler',
  performance: 'Trafik performansı', performanceDesc: 'Son 14 gündeki tüm tıklamalar.',
  noData: 'Henüz trafik yok', noDataDesc: 'İlk linkini paylaşınca veriler burada görünecek.', create: 'Link Oluştur',
};
const en = {
  loading: 'Loading analytics...', badge: 'Global Analytics', title: 'Analytics',
  description: 'Compare the performance of all your links in one view.',
  totalClicks: 'Total Clicks', allTime: 'All time', today: 'Today',
  todayDesc: "Today's traffic", links: 'Total Links', linksDesc: 'Tracked links',
  performance: 'Traffic performance', performanceDesc: 'All clicks during the last 14 days.',
  noData: 'No traffic yet', noDataDesc: 'Data will appear here after you share your first link.', create: 'Create Link',
};
