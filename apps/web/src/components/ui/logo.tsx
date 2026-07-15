'use client';

import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/i18n/language-provider';

type LogoProps = {
  href?: string;
  showTagline?: boolean;
  size?: 'sm' | 'md';
  className?: string;
};

/** Natural aspect of ux-mark.png (cropped glyph, no badge box). */
const MARK_WIDTH = 125;
const MARK_HEIGHT = 80;

export function Logo({
  href = '/',
  showTagline = false,
  size = 'md',
  className,
}: LogoProps) {
  const { t } = useLanguage();
  const markHeight = size === 'sm' ? 28 : 36;
  const markWidth = Math.round((MARK_WIDTH / MARK_HEIGHT) * markHeight);
  const textSize = size === 'sm' ? 'text-xl sm:text-2xl' : 'text-3xl';

  const content = (
    <div className={cn('flex items-center gap-2.5', className)}>
      <Image
        src="/ux-mark.png"
        alt=""
        width={MARK_WIDTH}
        height={MARK_HEIGHT}
        sizes={`${markWidth}px`}
        priority
        unoptimized
        className="shrink-0 object-contain"
        style={{ width: markWidth, height: markHeight }}
        aria-hidden
      />

      <div className="min-w-0 leading-tight">
        <p className={cn('font-bold tracking-tight', textSize)}>Urlytix</p>
        {showTagline && (
          <p className="text-xs text-[var(--muted-foreground)]">{t.nav.tagline}</p>
        )}
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="transition hover:opacity-90" aria-label="Urlytix">
        {content}
      </Link>
    );
  }

  return content;
}
