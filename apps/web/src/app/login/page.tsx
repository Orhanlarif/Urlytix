'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, Suspense, useState } from 'react';
import { BarChart3, Lock, MousePointerClick, TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { LanguageToggle } from '@/components/ui/language-toggle';
import { Logo } from '@/components/ui/logo';
import { useLanguage } from '@/i18n/language-provider';
import { authService } from '@/services/auth';

function BrandPanel() {
  const { t } = useLanguage();

  const benefits = [
    { icon: BarChart3, text: t.auth.loginBenefit1 },
    { icon: MousePointerClick, text: t.auth.loginBenefit2 },
    { icon: Lock, text: t.auth.loginBenefit3 },
  ];

  return (
    <div className="relative hidden overflow-hidden border-r border-[var(--border)] bg-[var(--surface)] px-12 py-12 lg:flex lg:flex-col lg:justify-between">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-[var(--accent)]/15 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl" />
      </div>

      <div className="relative animate-fade-in">
        <Logo href="/" showTagline />

        <Badge variant="accent" className="mt-10 gap-1.5 px-3 py-1.5">
          <TrendingUp className="h-3.5 w-3.5" />
          {t.auth.loginPanelEyebrow}
        </Badge>

        <h1 className="text-display mt-6 max-w-md">
          {t.auth.loginPanelTitle}
        </h1>

        <p className="mt-4 max-w-md text-[var(--muted-foreground)]">
          {t.auth.loginPanelDesc}
        </p>

        <ul className="mt-10 space-y-4">
          {benefits.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-start gap-3">
              <span className="mt-0.5 flex h-8 w-8 flex-none items-center justify-center rounded-lg border border-[var(--accent-border)] bg-[var(--accent-soft)] text-[var(--accent)]">
                <Icon className="h-4 w-4" />
              </span>
              <span className="pt-1 text-sm text-[var(--foreground)]/90">{text}</span>
            </li>
          ))}
        </ul>
      </div>

      <Card padding="sm" className="relative max-w-xs bg-[var(--surface-raised)]">
        <p className="text-caption">{t.auth.loginStatLabel}</p>
        <p className="text-heading-lg mt-1 text-[var(--accent)]">{t.auth.loginStatValue}</p>
      </Card>
    </div>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLanguage();

  const redirectTo = searchParams.get('redirect') ?? '/dashboard';
  const sessionExpired = searchParams.get('expired') === '1';
  const passwordReset = searchParams.get('reset') === '1';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [twoFactorToken, setTwoFactorToken] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (twoFactorToken) {
        await authService.verifyTwoFactor(twoFactorToken, twoFactorCode.trim());
      } else {
        const result = await authService.login(email, password);
        if (result.requiresTwoFactor) {
          setTwoFactorToken(result.twoFactorToken);
          setIsLoading(false);
          return;
        }
      }
      router.push(redirectTo);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.auth.loginFailed);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="relative min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="pointer-events-none fixed inset-0 overflow-hidden lg:hidden">
        <div className="absolute left-1/2 top-0 h-96 w-96 -translate-x-1/2 rounded-full bg-[var(--accent)]/10 blur-3xl" />
      </div>

      <div className="absolute right-6 top-6 z-10">
        <LanguageToggle size="sm" />
      </div>

      <div className="grid min-h-screen lg:grid-cols-2">
        <BrandPanel />

        <div className="flex items-center justify-center px-6 py-16">
          <Card className="relative w-full max-w-md animate-fade-in">
            <div className="mb-6 lg:hidden">
              <Logo href="/" size="sm" />
            </div>

            <h1 className="text-heading-lg">
              {twoFactorToken ? t.auth.twoFactorTitle : t.auth.loginTitle}
            </h1>
            <p className="mt-2 text-sm text-[var(--muted-foreground)]">
              {twoFactorToken ? t.auth.twoFactorDesc : t.auth.loginDesc}
            </p>

            {sessionExpired && (
              <div className="mt-6 rounded-xl border border-[var(--warning-border)] bg-[var(--warning-muted)] px-4 py-3 text-sm text-[var(--warning)]">
                {t.auth.sessionExpired}
              </div>
            )}

            {passwordReset && !twoFactorToken && (
              <div className="mt-6 rounded-xl border border-[var(--success-border)] bg-[var(--success-muted)] px-4 py-3 text-sm text-[var(--success)]">
                {t.auth.resetSuccessBanner}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-8 space-y-4">
              {!twoFactorToken ? (
                <>
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

                  <div className="flex justify-end">
                    <Link
                      href="/forgot-password"
                      className="text-sm text-[var(--accent)] hover:underline"
                    >
                      {t.auth.forgotLink}
                    </Link>
                  </div>
                </>
              ) : (
                <Input
                  label={t.auth.twoFactorCode}
                  value={twoFactorCode}
                  onChange={(event) => setTwoFactorCode(event.target.value)}
                  placeholder="123456"
                  required
                  autoComplete="one-time-code"
                  hint={t.auth.twoFactorHint}
                />
              )}

              {error && (
                <div className="rounded-xl border border-[var(--danger-border)] bg-[var(--danger-muted)] px-4 py-3 text-sm text-[var(--danger)]">
                  {error}
                </div>
              )}

              <Button type="submit" disabled={isLoading} fullWidth size="lg">
                {isLoading
                  ? t.auth.loginLoading
                  : twoFactorToken
                    ? t.auth.twoFactorButton
                    : t.auth.loginButton}
              </Button>

              {twoFactorToken && (
                <Button
                  type="button"
                  variant="ghost"
                  fullWidth
                  onClick={() => {
                    setTwoFactorToken('');
                    setTwoFactorCode('');
                    setError('');
                  }}
                >
                  {t.auth.twoFactorBack}
                </Button>
              )}
            </form>

            {!twoFactorToken && (
              <p className="mt-6 text-center text-sm text-[var(--muted-foreground)]">
                {t.auth.noAccount}{' '}
                <Link href="/register" className="text-[var(--accent)] hover:underline">
                  {t.auth.registerLink}
                </Link>
              </p>
            )}
          </Card>
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  const { t } = useLanguage();

  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[var(--background)] text-[var(--foreground)]">
          <p className="text-[var(--muted-foreground)]">{t.common.loading}</p>
        </main>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
