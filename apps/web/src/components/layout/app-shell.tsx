'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ReactNode, useEffect } from 'react';
import { logout, syncTokenCookie } from '@/lib/auth';

type AppShellProps = {
  children: ReactNode;
};

const navItems = [
  {
    label: 'Dashboard',
    href: '/dashboard',
  },
  {
    label: 'Links',
    href: '/links',
  },
];

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();

  useEffect(() => {
    syncTokenCookie();
  }, []);

  function handleLogout() {
    logout('/login');
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-0 h-96 w-96 -translate-x-1/2 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl" />
      </div>

      <header className="relative border-b border-slate-800/80 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-400 font-black text-slate-950">
              U
            </div>

            <div>
              <p className="text-xl font-bold tracking-tight">Urlytics</p>
              <p className="text-xs text-slate-500">Link Analytics SaaS</p>
            </div>
          </Link>

          <nav className="hidden items-center gap-2 md:flex">
            {navItems.map((item) => {
              const isActive =
                pathname === item.href || pathname.startsWith(`${item.href}/`);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={
                    isActive
                      ? 'rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-sm font-medium text-cyan-200'
                      : 'rounded-xl border border-transparent px-4 py-2 text-sm font-medium text-slate-400 transition hover:bg-slate-900 hover:text-slate-100'
                  }
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <button
            onClick={handleLogout}
            className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-700"
          >
            Çıkış
          </button>
        </div>

        <div className="mx-auto flex max-w-7xl gap-2 px-6 pb-4 md:hidden">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={
                  isActive
                    ? 'flex-1 rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-center text-sm font-medium text-cyan-200'
                    : 'flex-1 rounded-xl border border-slate-800 px-4 py-2 text-center text-sm font-medium text-slate-400'
                }
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </header>

      <div className="relative mx-auto max-w-7xl px-6 py-10">{children}</div>
    </main>
  );
}