'use client';

import { BarChart3, Link2, Shield, Users } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { useLanguage } from '@/i18n/language-provider';
import { Reveal, Stagger, StaggerItem } from './motion';

export function LandingFeatures() {
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

  return (
    <section className="relative mx-auto max-w-6xl px-4 pb-16 sm:px-6 sm:pb-24 lg:pb-28">
      <div className="mb-10 text-center sm:mb-14">
        <Reveal>
          <h2 className="text-heading-lg">{t.landing.featuresTitle}</h2>
        </Reveal>
        <Reveal delay={0.08}>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-[var(--muted-foreground)] sm:text-base">
            {t.landing.featuresSubtitle}
          </p>
        </Reveal>
      </div>

      <Stagger className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-4" fast>
        {features.map((feature) => {
          const Icon = feature.icon;
          return (
            <StaggerItem key={feature.title}>
              <Card hover className="group h-full">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--accent-border)] bg-[var(--accent-soft)] text-[var(--accent)] transition group-hover:bg-[var(--accent-muted)]">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-heading mt-4">{feature.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
                  {feature.description}
                </p>
              </Card>
            </StaggerItem>
          );
        })}
      </Stagger>
    </section>
  );
}
