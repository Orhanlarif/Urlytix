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
          'flex items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-300 to-cyan-500 font-black text-slate-950 shadow-lg shadow-cyan-400/20',
          iconSize,
        )}
      >
        U
      </div>

      <div>
        <p className={cn('font-bold tracking-tight', textSize)}>Urlytics</p>
        {showTagline && (
          <p className="text-xs text-slate-500">{t.nav.tagline}</p>
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
