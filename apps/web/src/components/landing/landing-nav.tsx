'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { LanguageToggle } from '@/components/ui/language-toggle';
import { Logo } from '@/components/ui/logo';
import { useLanguage } from '@/i18n/language-provider';

export function LandingNav() {
  const { t } = useLanguage();

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-40 border-b border-[var(--border)] bg-[var(--background)]/95 lg:bg-[var(--background)]/75 lg:backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-3 py-2.5 sm:gap-3 sm:px-6 sm:py-4">
          <Logo href="/" size="sm" className="min-w-0 shrink" />

          <div className="flex shrink-0 items-center gap-1 sm:gap-3">
            <LanguageToggle size="sm" />
            <Link
              href="/login"
              className="hidden px-2 py-2 text-sm font-medium text-[var(--muted-foreground)] transition hover:text-[var(--foreground)] sm:inline-flex"
            >
              {t.landing.ctaLogin}
            </Link>
            <Link href="/register">
              <Button
                size="sm"
                className="h-9 min-h-0 whitespace-nowrap px-2.5 text-xs sm:h-auto sm:min-h-0 sm:px-3 sm:text-sm"
              >
                <span className="sm:hidden">{t.landing.ctaRegisterShort}</span>
                <span className="hidden sm:inline">{t.landing.ctaRegister}</span>
              </Button>
            </Link>
          </div>
        </div>
      </header>
      <div aria-hidden className="h-[57px] sm:h-[69px]" />
    </>
  );
}
