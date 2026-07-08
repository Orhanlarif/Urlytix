'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, Suspense, useState } from 'react';
import { apiRequest } from '@/lib/api';
import { saveToken } from '@/lib/auth';

type AuthResponse = {
  accessToken: string;
};

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

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
      const response = await apiRequest<AuthResponse>('/auth/login', {
        method: 'POST',
        body: {
          email,
          password,
        },
      });

      saveToken(response.accessToken);
      router.push(redirectTo);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Giriş başarısız.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">
        <Link href="/" className="text-sm text-cyan-300 hover:underline">
          ← Ana sayfa
        </Link>

        <h1 className="mt-4 text-3xl font-bold">Giriş yap</h1>
        <p className="mt-2 text-sm text-slate-400">
          Linklerini ve analytics verilerini yönet.
        </p>

        {sessionExpired && (
          <div className="mt-6 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            Oturum süren doldu. Lütfen tekrar giriş yap.
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div>
            <label className="text-sm text-slate-300">Email</label>
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-cyan-400"
              placeholder="ornek@email.com"
              type="email"
              required
              autoComplete="email"
            />
          </div>

          <div>
            <label className="text-sm text-slate-300">Şifre</label>
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-cyan-400"
              placeholder="••••••••"
              type="password"
              required
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          )}

          <button
            disabled={isLoading}
            className="w-full rounded-xl bg-cyan-400 px-4 py-3 font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-400">
          Hesabın yok mu?{' '}
          <Link href="/register" className="text-cyan-300 hover:underline">
            Kayıt ol
          </Link>
        </p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
          <p className="text-slate-400">Yükleniyor...</p>
        </main>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
