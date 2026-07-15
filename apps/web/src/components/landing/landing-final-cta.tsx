'use client';

import Link from 'next/link';
import { Lock, MousePointerClick } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useLanguage } from '@/i18n/language-provider';
import { Reveal, scaleIn } from './motion';

export function LandingFinalCta() {
  const { t } = useLanguage();

  return (
    <section className="relative mx-auto max-w-6xl px-4 pb-16 sm:px-6 sm:pb-24 lg:pb-28">
      <Reveal variants={scaleIn}>
        <Card
          padding="lg"
          className="text-center shadow-[var(--shadow-glow)]"
        >
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--accent-border)] bg-[var(--accent-soft)]">
            <MousePointerClick className="h-6 w-6 text-[var(--accent)]" />
          </div>

          <h2 className="text-heading-lg mt-5 sm:mt-6">{t.landing.ctaTitle}</h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-[var(--muted-foreground)] sm:mt-4 sm:text-base">
            {t.landing.ctaDesc}
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-2 sm:mt-8 sm:gap-3">
            <Badge variant="success">
              <Lock className="mr-1 inline h-3 w-3" />
              {t.landing.badgeIpHash}
            </Badge>
            <Badge variant="accent">{t.landing.badgeQr}</Badge>
            <Badge variant="warning">{t.landing.badgeBotFilter}</Badge>
          </div>

          <Link href="/register" className="mt-7 block w-full sm:mt-8 sm:inline-block sm:w-auto">
            <Button size="lg" fullWidth className="min-h-12 sm:w-auto">
              {t.auth.registerButton}
            </Button>
          </Link>
        </Card>
      </Reveal>
    </section>
  );
}
