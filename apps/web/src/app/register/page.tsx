'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { LanguageToggle } from '@/components/ui/language-toggle';
import { Logo } from '@/components/ui/logo';
import { useLanguage } from '@/i18n/language-provider';
import { authService } from '@/services/auth';

export default function RegisterPage() {
  const router = useRouter();
  const { t } = useLanguage();

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
      router.push('/dashboard');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.auth.registerFailed);
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

        <h1 className="text-3xl font-bold">{t.auth.registerTitle}</h1>
        <p className="mt-2 text-sm text-slate-400">{t.auth.registerDesc}</p>

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
          />

          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          )}

          <Button type="submit" disabled={isLoading} fullWidth size="lg">
            {isLoading ? t.auth.registerLoading : t.auth.registerButton}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-400">
          {t.auth.hasAccount}{' '}
          <Link href="/login" className="text-cyan-300 hover:underline">
            {t.auth.loginLink}
          </Link>
        </p>
      </Card>
    </main>
  );
}
