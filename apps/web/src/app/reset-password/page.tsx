'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, Suspense, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { LanguageToggle } from '@/components/ui/language-toggle';
import { Logo } from '@/components/ui/logo';
import { useLanguage } from '@/i18n/language-provider';
import { authService } from '@/services/auth';

function ResetPasswordForm() {
  const { t } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    if (!token) {
      setError(t.auth.resetMissingToken);
      return;
    }
    if (password !== confirmPassword) {
      setError(t.auth.resetPasswordMismatch);
      return;
    }

    setIsLoading(true);
    try {
      await authService.resetPassword(token, password);
      router.push('/login?reset=1');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.auth.resetFailed);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-[var(--background)] px-6 py-16 text-[var(--foreground)]">
      <div className="absolute right-6 top-6 z-10">
        <LanguageToggle size="sm" />
      </div>
      <Card className="w-full max-w-md animate-fade-in">
        <div className="mb-6">
          <Logo href="/" size="sm" />
        </div>
        <h1 className="text-heading-lg">{t.auth.resetTitle}</h1>
        <p className="mt-2 text-sm text-[var(--muted-foreground)]">
          {t.auth.resetDesc}
        </p>
        {!token ? (
          <div className="mt-8 space-y-4">
            <div className="rounded-xl border border-[var(--danger-border)] bg-[var(--danger-muted)] px-4 py-3 text-sm text-[var(--danger)]">
              {t.auth.resetMissingToken}
            </div>
            <Link href="/forgot-password">
              <Button fullWidth size="lg">
                {t.auth.forgotButton}
              </Button>
            </Link>
            <p className="text-center text-sm text-[var(--muted-foreground)]">
              <Link href="/login" className="text-[var(--accent)] hover:underline">
                {t.auth.backToLogin}
              </Link>
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <Input
              label={t.auth.newPassword}
              type="password"
              required
              minLength={12}
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              hint={t.auth.passwordHint}
              showPasswordToggle
            />
            <Input
              label={t.auth.confirmPassword}
              type="password"
              required
              minLength={12}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              showPasswordToggle
            />
            {error && (
              <div className="rounded-xl border border-[var(--danger-border)] bg-[var(--danger-muted)] px-4 py-3 text-sm text-[var(--danger)]">
                {error}
              </div>
            )}
            <Button type="submit" disabled={isLoading} fullWidth size="lg">
              {isLoading ? t.auth.resetLoading : t.auth.resetButton}
            </Button>
            <p className="text-center text-sm text-[var(--muted-foreground)]">
              <Link href="/login" className="text-[var(--accent)] hover:underline">
                {t.auth.backToLogin}
              </Link>
            </p>
          </form>
        )}
      </Card>
    </main>
  );
}

export default function ResetPasswordPage() {
  const { t } = useLanguage();
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[var(--background)] text-[var(--foreground)]">
          <p className="text-[var(--muted-foreground)]">{t.common.loading}</p>
        </main>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
