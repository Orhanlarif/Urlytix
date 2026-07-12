'use client';

import { useLanguage } from '@/i18n/language-provider';

type LoadingScreenProps = {
  text?: string;
};

export function LoadingScreen({ text }: LoadingScreenProps) {
  const { t } = useLanguage();

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--background)] px-6 text-[var(--foreground)]">
      <div role="status" aria-live="polite" className="flex flex-col items-center gap-4">
        <div className="relative h-12 w-12">
          <div className="absolute inset-0 rounded-full border-2 border-[var(--border)]" />
          <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-[var(--accent)]" />
        </div>
        <p className="text-sm text-[var(--muted-foreground)]">{text ?? t.common.loading}</p>
      </div>
    </main>
  );
}
