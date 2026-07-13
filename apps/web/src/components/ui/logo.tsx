'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/i18n/language-provider';

type LogoProps = {
  href?: string;
  showTagline?: boolean;
  size?: 'sm' | 'md';
  className?: string;
};

export function Logo({
  href = '/',
  showTagline = false,
  size = 'md',
  className,
}: LogoProps) {
  const { t } = useLanguage();
  const iconSize = size === 'sm' ? 'h-8 w-8 text-sm' : 'h-10 w-10 text-base';
  const textSize = size === 'sm' ? 'text-lg' : 'text-xl';

  const content = (
    <div className={cn('flex items-center gap-3', className)}>
      <div
        className={cn(
          'flex items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--accent-hover)] to-[var(--accent-active)] shadow-[var(--shadow-glow)]',
          iconSize,
        )}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className="h-[55%] w-[55%]"
          aria-hidden="true"
        >
          <path
            d="M9.5 14.5L14.5 9.5"
            stroke="var(--accent-foreground)"
            strokeWidth="2.25"
            strokeLinecap="round"
          />
          <path
            d="M11 6.5L12.7 4.8a3.6 3.6 0 0 1 5.1 5.1L16 11.6"
            stroke="var(--accent-foreground)"
            strokeWidth="2.25"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M13 17.5L11.3 19.2a3.6 3.6 0 0 1-5.1-5.1L8 12.4"
            stroke="var(--accent-foreground)"
            strokeWidth="2.25"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <div>
        <p className={cn('font-bold tracking-tight', textSize)}>Urlytix</p>
        {showTagline && (
          <p className="text-xs text-[var(--muted-foreground)]">{t.nav.tagline}</p>
        )}
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="transition hover:opacity-90">
        {content}
      </Link>
    );
  }

  return content;
}
