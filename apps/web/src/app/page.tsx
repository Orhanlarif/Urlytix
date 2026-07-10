'use client';

import Link from 'next/link';
import {
  ArrowRight,
  BarChart3,
  Link2,
  Lock,
  MousePointerClick,
  Shield,
  Sparkles,
  Users,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { LanguageToggle } from '@/components/ui/language-toggle';
import { Logo } from '@/components/ui/logo';
import { useLanguage } from '@/i18n/language-provider';

export default function HomePage() {
  const { t } = useLanguage();

  const features = [
    {
      title: t.landing.feature1Title,
      description: t.landing.feature1Desc,
      icon: Link2,
    },
    {
      title: t.landing.feature2Title,
      description: t.landing.feature2Desc,
      icon: BarChart3,
    },
    {
      title: t.landing.feature3Title,
      description: t.landing.feature3Desc,
      icon: Users,
    },
    {
      title: t.landing.feature4Title,
      description: t.landing.feature4Desc,
      icon: Shield,
    },
  ];

  const stats = [
    { label: t.landing.statFree, value: t.landing.statFreeValue },
    { label: t.landing.statAnalytics, value: t.landing.statAnalyticsValue },
    { label: t.landing.statQr, value: t.landing.statQrValue },
    { label: t.landing.statPrivacy, value: t.landing.statPrivacyValue },
  ];

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-0 h-[28rem] w-[28rem] -translate-x-1/2 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl" />
      </div>

      <header className="relative border-b border-slate-800/80 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Logo href="/" />

          <div className="flex items-center gap-3">
            <LanguageToggle size="sm" />
            <Link href="/login">
              <Button variant="ghost" size="sm">
                {t.landing.ctaLogin}
              </Button>
            </Link>
            <Link href="/register">
              <Button size="sm">{t.landing.ctaRegister}</Button>
            </Link>
          </div>
        </div>
      </header>

      <section className="relative mx-auto max-w-6xl px-6 pb-16 pt-16 lg:pt-24">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <Badge variant="accent" className="mb-6 gap-1.5 px-4 py-2">
              <Sparkles className="h-3.5 w-3.5" />
              {t.landing.badge}
            </Badge>

            <h1 className="text-4xl font-bold tracking-tight md:text-6xl">
              {t.landing.title1}
              <span className="mt-2 block bg-gradient-to-r from-cyan-300 to-blue-400 bg-clip-text text-transparent">
                {t.landing.title2}
              </span>
            </h1>

            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-300">
              {t.landing.description}
            </p>

            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <Link href="/register">
                <Button size="lg" className="w-full sm:w-auto">
                  {t.landing.ctaStart}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/login">
                <Button variant="outline" size="lg" className="w-full sm:w-auto">
                  {t.landing.ctaLogin}
                </Button>
              </Link>
            </div>

            <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-3"
                >
                  <p className="text-lg font-bold text-cyan-300">{stat.value}</p>
                  <p className="text-xs text-slate-500">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>

          <DashboardPreview />
        </div>
      </section>

      <section className="relative mx-auto max-w-6xl px-6 pb-24">
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-bold">{t.landing.featuresTitle}</h2>
          <p className="mx-auto mt-3 max-w-2xl text-slate-400">
            {t.landing.featuresSubtitle}
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => {
            const Icon = feature.icon;

            return (
              <Card key={feature.title} hover className="group">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-300 transition group-hover:bg-cyan-400/20">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-lg font-semibold">{feature.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  {feature.description}
                </p>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="relative mx-auto max-w-6xl px-6 pb-24">
        <Card padding="lg" className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10">
            <MousePointerClick className="h-6 w-6 text-cyan-300" />
          </div>

          <h2 className="mt-6 text-3xl font-bold md:text-4xl">
            {t.landing.ctaTitle}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-slate-400">
            {t.landing.ctaDesc}
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Badge variant="success">
              <Lock className="mr-1 inline h-3 w-3" />
              {t.landing.badgeIpHash}
            </Badge>
            <Badge variant="accent">{t.landing.badgeQr}</Badge>
            <Badge variant="warning">{t.landing.badgeBotFilter}</Badge>
          </div>

          <Link href="/register" className="mt-8 inline-block">
            <Button size="lg">{t.auth.registerButton}</Button>
          </Link>
        </Card>
      </section>

      <footer className="relative border-t border-slate-800/80 py-8 text-center text-sm text-slate-500">
        <p>© {new Date().getFullYear()} {t.landing.footer}</p>
      </footer>
    </main>
  );
}

function DashboardPreview() {
  const { t } = useLanguage();

  const previewMetrics = [
    { label: t.landing.previewLinks, value: '24' },
    { label: t.landing.previewClicks, value: '1.2K' },
    { label: t.landing.previewToday, value: '89' },
  ];

  return (
    <div className="relative">
      <div className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-cyan-400/20 to-blue-500/10 blur-2xl" />

      <Card className="relative overflow-hidden border-slate-700/80 p-0">
        <div className="border-b border-slate-800 bg-slate-900 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-red-400/80" />
            <div className="h-3 w-3 rounded-full bg-amber-400/80" />
            <div className="h-3 w-3 rounded-full bg-emerald-400/80" />
            <span className="ml-2 text-xs text-slate-500">
              {t.landing.previewUrl}
            </span>
          </div>
        </div>

        <div className="space-y-4 p-5">
          <div className="grid grid-cols-3 gap-3">
            {previewMetrics.map((metric) => (
              <div
                key={metric.label}
                className="rounded-xl border border-slate-800 bg-slate-950 p-3"
              >
                <p className="text-xs text-slate-500">{metric.label}</p>
                <p className="mt-1 text-xl font-bold text-cyan-300">
                  {metric.value}
                </p>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
            <p className="text-xs text-slate-500">{t.landing.previewLast14}</p>
            <div className="mt-4 flex h-24 items-end gap-1.5">
              {[40, 65, 45, 80, 55, 90, 70, 85, 60, 95, 75, 88, 72, 100].map(
                (height, index) => (
                  <div
                    key={index}
                    className="flex-1 rounded-t bg-gradient-to-t from-cyan-500/80 to-cyan-300/80"
                    style={{ height: `${height}%` }}
                  />
                ),
              )}
            </div>
          </div>

          <div className="space-y-2">
            {['Portfolio', 'Blog post', 'Campaign'].map((title, index) => (
              <div
                key={title}
                className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium">{title}</p>
                  <p className="text-xs text-cyan-400/80">
                    urlytics.app/r/{title.toLowerCase().replace(' ', '-')}
                  </p>
                </div>
                <span className="text-sm text-slate-400">
                  {[312, 189, 94][index]} {t.common.clicks}
                </span>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}
