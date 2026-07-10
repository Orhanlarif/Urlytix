'use client';

import { cn } from '@/lib/utils';
import { useLanguage } from '@/i18n/language-provider';
import type { Locale } from '@/i18n';

type LanguageToggleProps = {
  className?: string;
  size?: 'sm' | 'md';
};

export function LanguageToggle({ className, size = 'md' }: LanguageToggleProps) {
  const { locale, setLocale } = useLanguage();

  const options: Array<{ value: Locale; label: string }> = [
    { value: 'tr', label: 'TR' },
    { value: 'en', label: 'EN' },
  ];

  return (
    <div
      className={cn(
        'inline-flex rounded-xl border border-slate-700 bg-slate-900/80 p-1',
        size === 'sm' && 'text-xs',
        className,
      )}
      role="group"
      aria-label="Language"
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => setLocale(option.value)}
          className={cn(
            'rounded-lg px-3 py-1.5 font-semibold transition',
            size === 'sm' && 'px-2.5 py-1',
            locale === option.value
              ? 'bg-cyan-400 text-slate-950 shadow-sm'
              : 'text-slate-400 hover:text-slate-200',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
