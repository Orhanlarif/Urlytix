'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useLanguage } from '@/i18n/language-provider';

export default function ErrorBoundary({
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
    <main className="grid min-h-screen place-items-center bg-[var(--background)] px-4 py-10">
      <Card className="max-w-xl text-center">
        <h1 className="text-heading-lg">{t.common.unexpectedError}</h1>
        <p className="text-body mt-3">{t.common.unexpectedErrorDescription}</p>
        <Button className="mt-6" onClick={reset}>
          {t.common.tryAgain}
        </Button>
      </Card>
    </main>
  );
}
