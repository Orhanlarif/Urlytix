'use client';

import { Link2, Share2, LineChart } from 'lucide-react';
import { useLanguage } from '@/i18n/language-provider';
import { Reveal, Stagger, StaggerItem } from './motion';

export function LandingHowItWorks() {
  const { t } = useLanguage();

  const steps = [
    {
      title: t.landing.howStep1Title,
      description: t.landing.howStep1Desc,
      icon: Link2,
      step: '01',
    },
    {
      title: t.landing.howStep2Title,
      description: t.landing.howStep2Desc,
      icon: Share2,
      step: '02',
    },
    {
      title: t.landing.howStep3Title,
      description: t.landing.howStep3Desc,
      icon: LineChart,
      step: '03',
    },
  ];

  return (
    <section className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24 lg:py-28">
      <div className="mb-10 text-center sm:mb-14">
        <Reveal>
          <h2 className="text-heading-lg">{t.landing.howTitle}</h2>
        </Reveal>
        <Reveal delay={0.08}>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-[var(--muted-foreground)] sm:text-base">
            {t.landing.howSubtitle}
          </p>
        </Reveal>
      </div>

      <Stagger className="grid gap-4 sm:gap-6 md:grid-cols-3 md:gap-8">
        {steps.map((item) => {
          const Icon = item.icon;
          return (
            <StaggerItem key={item.step}>
              <div className="relative h-full rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)]/50 p-5 sm:p-6">
                <div className="flex items-start justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--accent-border)] bg-[var(--accent-soft)] text-[var(--accent)]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="font-mono text-sm text-[var(--muted-foreground)]">
                    {item.step}
                  </span>
                </div>
                <h3 className="text-heading mt-4 sm:mt-5">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
                  {item.description}
                </p>
              </div>
            </StaggerItem>
          );
        })}
      </Stagger>
    </section>
  );
}
