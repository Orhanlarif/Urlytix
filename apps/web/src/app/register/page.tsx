'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, Suspense, useState } from 'react';
import { QrCode, Rocket, ShieldCheck, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { LanguageToggle } from '@/components/ui/language-toggle';
import { Logo } from '@/components/ui/logo';
import { useLanguage } from '@/i18n/language-provider';
import { getSafeRedirectPath } from '@/lib/safe-redirect';
import { authService } from '@/services/auth';

function BrandPanel() {
  const { t } = useLanguage();

  const benefits = [
    { icon: Rocket, text: t.auth.registerBenefit1 },
    { icon: QrCode, text: t.auth.registerBenefit2 },
    { icon: ShieldCheck, text: t.auth.registerBenefit3 },
  ];

  return (
    <div className="relative hidden overflow-hidden border-r border-[var(--border)] bg-[var(--surface)] px-12 py-12 lg:flex lg:flex-col lg:justify-between">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -right-24 -top-16 h-72 w-72 rounded-full bg-[var(--accent)]/15 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl" />
      </div>

      <div className="relative animate-fade-in">
        <Logo href="/" showTagline />

        <Badge variant="success" className="mt-10 gap-1.5 px-3 py-1.5">
          <Sparkles className="h-3.5 w-3.5" />
          {t.auth.registerPanelEyebrow}
        </Badge>

        <h1 className="text-display mt-6 max-w-md">
          {t.auth.registerPanelTitle}
        </h1>

        <p className="mt-4 max-w-md text-[var(--muted-foreground)]">
          {t.auth.registerPanelDesc}
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
        <p className="text-caption">{t.auth.registerStatLabel}</p>
        <p className="text-heading-lg mt-1 text-[var(--accent)]">{t.auth.registerStatValue}</p>
      </Card>
    </div>
  );
}

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLanguage();
  const redirectTo = getSafeRedirectPath(searchParams.get('redirect'));

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await authService.register({
        name: name.trim() || undefined,
        email,
        password,
      });
      router.push(redirectTo);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.auth.registerFailed);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="relative min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="pointer-events-none fixed inset-0 overflow-hidden lg:hidden">
        <div className="absolute left-1/2 top-0 h-96 w-96 -translate-x-1/2 rounded-full bg-[var(--accent)]/10 blur-3xl" />
      </div>

      <div className="absolute right-4 top-4 z-10 sm:right-6 sm:top-6">
        <LanguageToggle size="sm" />
      </div>

      <div className="grid min-h-screen lg:grid-cols-2">
        <BrandPanel />

        <div className="flex items-center justify-center px-4 py-14 sm:px-6 sm:py-16">
          <Card className="relative w-full max-w-md animate-fade-in">
            <div className="mb-6 lg:hidden">
              <Logo href="/" size="sm" />
            </div>

            <h1 className="text-heading-lg">{t.auth.registerTitle}</h1>
            <p className="mt-2 text-sm text-[var(--muted-foreground)]">{t.auth.registerDesc}</p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-4">
              <Input
                label={t.auth.name}
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder={t.auth.name}
                autoComplete="name"
              />

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
                minLength={12}
                autoComplete="new-password"
                hint={t.auth.passwordHint}
                showPasswordToggle
              />

              {error && (
                <div className="rounded-xl border border-[var(--danger-border)] bg-[var(--danger-muted)] px-4 py-3 text-sm text-[var(--danger)]">
                  {error}
                </div>
              )}

              <Button type="submit" disabled={isLoading} fullWidth size="lg">
                {isLoading ? t.auth.registerLoading : t.auth.registerButton}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-[var(--muted-foreground)]">
              {t.auth.hasAccount}{' '}
              <Link
                href={
                  redirectTo !== '/dashboard'
                    ? `/login?redirect=${encodeURIComponent(redirectTo)}`
                    : '/login'
                }
                className="text-[var(--accent)] hover:underline"
              >
                {t.auth.loginLink}
              </Link>
            </p>
          </Card>
        </div>
      </div>
    </main>
  );
}

export default function RegisterPage() {
  const { t } = useLanguage();

  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[var(--background)] text-[var(--foreground)]">
          <p className="text-[var(--muted-foreground)]">{t.common.loading}</p>
        </main>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}
