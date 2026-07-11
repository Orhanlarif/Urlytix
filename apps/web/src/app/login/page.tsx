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

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLanguage();

  const redirectTo = searchParams.get('redirect') ?? '/dashboard';
  const sessionExpired = searchParams.get('expired') === '1';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await authService.login(email, password);
      router.push(redirectTo);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.auth.loginFailed);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-0 h-96 w-96 -translate-x-1/2 rounded-full bg-cyan-500/10 blur-3xl" />
      </div>

      <div className="absolute right-6 top-6">
        <LanguageToggle size="sm" />
      </div>

      <Card className="relative w-full max-w-md">
        <div className="mb-6">
          <Logo href="/" size="sm" />
        </div>

        <h1 className="text-3xl font-bold">{t.auth.loginTitle}</h1>
        <p className="mt-2 text-sm text-slate-400">{t.auth.loginDesc}</p>

        {sessionExpired && (
          <div className="mt-6 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            {t.auth.sessionExpired}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <Input
            label={t.auth.email}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="ornek@email.com"
            type="email"
            required
            autoComplete="email"
          />

          <Input
            label={t.auth.password}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="••••••••"
            type="password"
            required
            autoComplete="current-password"
          />

          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          )}

          <Button type="submit" disabled={isLoading} fullWidth size="lg">
            {isLoading ? t.auth.loginLoading : t.auth.loginButton}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-400">
          {t.auth.noAccount}{' '}
          <Link href="/register" className="text-cyan-300 hover:underline">
            {t.auth.registerLink}
          </Link>
        </p>
      </Card>
    </main>
  );
}

export default function LoginPage() {
  const { t } = useLanguage();

  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
          <p className="text-slate-400">{t.common.loading}</p>
        </main>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
