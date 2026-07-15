'use client';

import { Link2, QrCode, Shield, BarChart3 } from 'lucide-react';
import { useLanguage } from '@/i18n/language-provider';
import { Reveal, Stagger, StaggerItem } from './motion';

export function LandingTrust() {
  const { t } = useLanguage();

  const items = [
    { label: t.landing.trust1, icon: Link2 },
    { label: t.landing.trust2, icon: QrCode },
    { label: t.landing.trust3, icon: BarChart3 },
    { label: t.landing.trust4, icon: Shield },
  ];

  return (
    <section className="relative border-y border-[var(--border)] bg-[var(--surface)]/40 py-8 sm:py-10">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Reveal>
          <p className="mb-5 text-center text-xs font-medium uppercase tracking-[0.18em] text-[var(--muted-foreground)] sm:mb-6">
            {t.landing.trustLabel}
          </p>
        </Reveal>

        <Stagger
          className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4 md:gap-6"
          fast
        >
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <StaggerItem key={item.label}>
                <div className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--border)]/70 bg-[var(--background)]/40 px-2 py-2.5 text-[var(--foreground)] sm:border-0 sm:bg-transparent sm:px-0 sm:py-0">
                  <Icon className="h-4 w-4 shrink-0 text-[var(--accent)]" />
                  <span className="text-xs font-medium sm:text-sm">{item.label}</span>
                </div>
              </StaggerItem>
            );
          })}
        </Stagger>
      </div>
    </section>
  );
}
