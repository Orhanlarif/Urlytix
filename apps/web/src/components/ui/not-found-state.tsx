'use client';

import Link from 'next/link';
import { SearchX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useLanguage } from '@/i18n/language-provider';

export function NotFoundState() {
  const { t } = useLanguage();

  return (
    <Card className="mx-auto max-w-xl text-center">
      <SearchX
        className="mx-auto h-10 w-10 text-[var(--muted-foreground)]"
        aria-hidden="true"
      />
      <h1 className="text-heading-lg mt-4">{t.common.pageNotFound}</h1>
      <p className="text-body mt-3">{t.common.pageNotFoundDescription}</p>
      <Link href="/" className="mt-6 inline-block">
        <Button>{t.common.goHome}</Button>
      </Link>
    </Card>
  );
}
