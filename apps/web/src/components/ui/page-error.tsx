'use client';

import { useEffect } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useLanguage } from '@/i18n/language-provider';

export function PageError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useLanguage();

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <AppShell>
      <Card className="mx-auto max-w-xl text-center">
        <p className="text-sm font-semibold uppercase tracking-wider text-[var(--danger)]">
          {t.common.unexpectedError}
        </p>
        <h1 className="text-heading-lg mt-3">{t.common.unexpectedError}</h1>
        <p className="text-body mt-3">{t.common.unexpectedErrorDescription}</p>
        <Button className="mt-6" onClick={reset}>
          {t.common.tryAgain}
        </Button>
      </Card>
    </AppShell>
  );
}
