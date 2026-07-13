'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { LanguageToggle } from '@/components/ui/language-toggle';
import { Logo } from '@/components/ui/logo';
import { useLanguage } from '@/i18n/language-provider';
import { authService } from '@/services/auth';

export default function ForgotPasswordPage() {
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);
    try {
      const result = await authService.forgotPassword(email.trim());
      setSuccess(result.message || t.auth.forgotSuccess);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.auth.forgotFailed);
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
        <h1 className="text-heading-lg">{t.auth.forgotTitle}</h1>
        <p className="mt-2 text-sm text-[var(--muted-foreground)]">
          {t.auth.forgotDesc}
        </p>
        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <Input
            label={t.auth.email}
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          {error && (
            <div className="rounded-xl border border-[var(--danger-border)] bg-[var(--danger-muted)] px-4 py-3 text-sm text-[var(--danger)]">
              {error}
            </div>
          )}
          {success && (
            <div className="rounded-xl border border-[var(--success-border)] bg-[var(--success-muted)] px-4 py-3 text-sm text-[var(--success)]">
              {success}
            </div>
          )}
          <Button type="submit" disabled={isLoading} fullWidth size="lg">
            {isLoading ? t.auth.forgotLoading : t.auth.forgotButton}
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-[var(--muted-foreground)]">
          <Link href="/login" className="text-[var(--accent)] hover:underline">
            {t.auth.backToLogin}
          </Link>
        </p>
      </Card>
    </main>
  );
}
