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
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-0 h-[28rem] w-[28rem] -translate-x-1/2 rounded-full bg-[var(--accent)]/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl" />
      </div>

      <header className="relative border-b border-[var(--border)] bg-[var(--background)]/80 backdrop-blur">
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
          <div className="animate-fade-in">
            <Badge variant="accent" className="mb-6 gap-1.5 px-4 py-2">
              <Sparkles className="h-3.5 w-3.5" />
              {t.landing.badge}
            </Badge>

            <h1 className="text-display">
              {t.landing.title1}
              <span className="mt-2 block bg-gradient-to-r from-[var(--accent-hover)] to-blue-400 bg-clip-text text-transparent">
                {t.landing.title2}
              </span>
            </h1>

            <p className="mt-6 max-w-xl text-lg leading-8 text-[var(--muted-foreground)]">
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
                  className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)]/60 px-4 py-3"
                >
                  <p className="text-lg font-bold text-[var(--accent)]">{stat.value}</p>
                  <p className="text-caption">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>

          <DashboardPreview />
        </div>
      </section>

      <section className="relative mx-auto max-w-6xl px-6 pb-24">
        <div className="mb-10 text-center">
          <h2 className="text-heading-lg">{t.landing.featuresTitle}</h2>
          <p className="mx-auto mt-3 max-w-2xl text-[var(--muted-foreground)]">
            {t.landing.featuresSubtitle}
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => {
            const Icon = feature.icon;

            return (
              <Card key={feature.title} hover className="group">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--accent-border)] bg-[var(--accent-soft)] text-[var(--accent)] transition group-hover:bg-[var(--accent-muted)]">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-heading mt-4">{feature.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
                  {feature.description}
                </p>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="relative mx-auto max-w-6xl px-6 pb-24">
        <Card padding="lg" className="text-center shadow-[var(--shadow-glow)]">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--accent-border)] bg-[var(--accent-soft)]">
            <MousePointerClick className="h-6 w-6 text-[var(--accent)]" />
          </div>

          <h2 className="text-heading-lg mt-6">
            {t.landing.ctaTitle}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-[var(--muted-foreground)]">
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

      <footer className="relative border-t border-[var(--border)] py-8 text-center text-sm text-[var(--muted-foreground)]">
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
    <div className="relative animate-fade-in">
      <div className="absolute -inset-6 rounded-3xl bg-gradient-to-br from-[var(--accent)]/25 via-blue-500/10 to-transparent blur-2xl" />

      <Card className="relative overflow-hidden border-[var(--border-strong)] p-0 shadow-[var(--shadow-glow)]">
        <div className="border-b border-[var(--border)] bg-[var(--surface-raised)] px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-red-400/80" />
            <div className="h-3 w-3 rounded-full bg-amber-400/80" />
            <div className="h-3 w-3 rounded-full bg-emerald-400/80" />
            <span className="ml-2 text-xs text-[var(--muted-foreground)]">
              {t.landing.previewUrl}
            </span>
          </div>
        </div>

        <div className="space-y-4 p-5">
          <div className="grid grid-cols-3 gap-3">
            {previewMetrics.map((metric) => (
              <div
                key={metric.label}
                className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-3"
              >
                <p className="text-caption">{metric.label}</p>
                <p className="mt-1 text-xl font-bold text-[var(--accent)]">
                  {metric.value}
                </p>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-4">
            <p className="text-caption">{t.landing.previewLast14}</p>
            <div className="mt-4 flex h-24 items-end gap-1.5">
              {[40, 65, 45, 80, 55, 90, 70, 85, 60, 95, 75, 88, 72, 100].map(
                (height, index) => (
                  <div
                    key={index}
                    className="flex-1 rounded-t bg-gradient-to-t from-[var(--accent-active)] to-[var(--accent-hover)]"
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
                className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium">{title}</p>
                  <p className="text-xs text-[var(--accent)]/80">
                    urlytix.com/{title.toLowerCase().replace(' ', '-')}
                  </p>
                </div>
                <span className="text-sm text-[var(--muted-foreground)]">
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
