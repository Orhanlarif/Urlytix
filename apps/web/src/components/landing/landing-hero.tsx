'use client';

import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/i18n/language-provider';
import { DashboardPreview } from './dashboard-preview';
import { Stagger, StaggerItem } from './motion';

export function LandingHero() {
  const { t } = useLanguage();

  const stats = [
    { label: t.landing.statFree, value: t.landing.statFreeValue },
    { label: t.landing.statAnalytics, value: t.landing.statAnalyticsValue },
    { label: t.landing.statQr, value: t.landing.statQrValue },
    { label: t.landing.statPrivacy, value: t.landing.statPrivacyValue },
  ];

  return (
    <section className="relative mx-auto max-w-6xl px-4 pb-14 pt-10 sm:px-6 sm:pb-20 sm:pt-16 lg:pb-28 lg:pt-24">
      <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
        <Stagger>
          <StaggerItem>
            <Badge
              variant="accent"
              className="mb-5 max-w-full gap-1.5 whitespace-normal px-3 py-1.5 text-left leading-snug sm:mb-6 sm:px-4 sm:py-2"
            >
              <Sparkles className="h-3.5 w-3.5 shrink-0" />
              {t.landing.badge}
            </Badge>
          </StaggerItem>

          <StaggerItem>
            <h1 className="text-display">
              {t.landing.title1}
              <span className="mt-2 block bg-gradient-to-r from-[var(--accent-hover)] to-blue-400 bg-clip-text text-transparent">
                {t.landing.title2}
              </span>
            </h1>
          </StaggerItem>

          <StaggerItem>
            <p className="mt-4 max-w-xl text-base leading-7 text-[var(--muted-foreground)] sm:mt-6 sm:text-lg sm:leading-8">
              {t.landing.description}
            </p>
          </StaggerItem>

          <StaggerItem>
            <div className="mt-7 flex flex-col gap-3 sm:mt-8 sm:flex-row sm:gap-4">
              <Link href="/register" className="w-full sm:w-auto">
                <Button size="lg" fullWidth className="min-h-12 sm:w-auto">
                  {t.landing.ctaStart}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/login" className="w-full sm:w-auto">
                <Button
                  variant="outline"
                  size="lg"
                  fullWidth
                  className="min-h-12 sm:w-auto"
                >
                  {t.landing.ctaLogin}
                </Button>
              </Link>
            </div>
          </StaggerItem>

          <StaggerItem>
            <div className="mt-8 grid grid-cols-2 gap-2.5 sm:mt-10 sm:gap-4 sm:grid-cols-4">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)]/60 px-3 py-2.5 sm:px-4 sm:py-3"
                >
                  <p className="text-base font-bold text-[var(--accent)] sm:text-lg">
                    {stat.value}
                  </p>
                  <p className="text-caption mt-0.5">{stat.label}</p>
                </div>
              ))}
            </div>
          </StaggerItem>
        </Stagger>

        <div className="lg:pl-2">
          <DashboardPreview />
        </div>
      </div>
    </section>
  );
}
