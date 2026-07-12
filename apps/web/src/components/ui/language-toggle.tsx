'use client';

import { cn } from '@/lib/utils';
import { useLanguage } from '@/i18n/language-provider';
import type { Locale } from '@/i18n';

type LanguageToggleProps = {
  className?: string;
  size?: 'sm' | 'md';
  onLocaleChange?: (locale: Locale) => void;
};

export function LanguageToggle({
  className,
  size = 'md',
  onLocaleChange,
}: LanguageToggleProps) {
  const { locale, setLocale, t } = useLanguage();

  const options: Array<{ value: Locale; label: string }> = [
    { value: 'tr', label: 'TR' },
    { value: 'en', label: 'EN' },
  ];

  return (
    <div
      className={cn(
        'inline-flex rounded-xl border border-[var(--border)] bg-[var(--surface-raised)]/80 p-1',
        size === 'sm' && 'text-xs',
        className,
      )}
      role="group"
      aria-label={t.settings.language}
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => {
            setLocale(option.value);
            onLocaleChange?.(option.value);
          }}
          className={cn(
            'rounded-lg px-3 py-1.5 font-semibold transition',
            size === 'sm' && 'px-2.5 py-1',
            locale === option.value
              ? 'bg-[var(--accent)] text-[var(--accent-foreground)] shadow-[var(--shadow-xs)]'
              : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
