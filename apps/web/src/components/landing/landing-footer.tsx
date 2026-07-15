'use client';

import { useLanguage } from '@/i18n/language-provider';
import { Reveal } from './motion';

export function LandingFooter() {
  const { t } = useLanguage();

  return (
    <footer className="relative border-t border-[var(--border)] px-4 py-8 text-center text-sm text-[var(--muted-foreground)] sm:px-6">
      <Reveal>
        <p>
          © {new Date().getFullYear()} {t.landing.footer}
        </p>
      </Reveal>
    </footer>
  );
}
