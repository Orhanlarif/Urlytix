'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Link2, LogOut } from 'lucide-react';
import { ReactNode, useEffect } from 'react';
import { LanguageToggle } from '@/components/ui/language-toggle';
import { Logo } from '@/components/ui/logo';
import { useLanguage } from '@/i18n/language-provider';
import { cn } from '@/lib/utils';
import { logout, syncTokenCookie } from '@/lib/auth';

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  const { t } = useLanguage();
  const pathname = usePathname();

  const navItems = [
    { label: t.nav.dashboard, href: '/dashboard', icon: LayoutDashboard },
    { label: t.nav.links, href: '/links', icon: Link2 },
  ];

  useEffect(() => {
    syncTokenCookie();
  }, []);

  function handleLogout() {
    logout('/login');
  }

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-0 top-0 h-[32rem] w-[32rem] rounded-full bg-cyan-500/8 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-blue-500/8 blur-3xl" />
      </div>

      <div className="relative flex min-h-screen">
        <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-800/80 bg-slate-950/90 backdrop-blur xl:flex">
          <div className="border-b border-slate-800/80 px-6 py-6">
            <Logo href="/dashboard" showTagline />
          </div>

          <nav className="flex-1 space-y-1 px-4 py-6">
            {navItems.map((item) => {
              const active = isActive(item.href);
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition',
                    active
                      ? 'border border-cyan-400/20 bg-cyan-400/10 text-cyan-200'
                      : 'text-slate-400 hover:bg-slate-900 hover:text-slate-100',
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="space-y-3 border-t border-slate-800/80 p-4">
            <LanguageToggle className="w-full justify-center" size="sm" />

            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-slate-400 transition hover:bg-slate-900 hover:text-slate-100"
            >
              <LogOut className="h-4 w-4" />
              {t.common.logout}
            </button>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur xl:hidden">
            <div className="flex items-center justify-between gap-3 px-4 py-4">
              <Logo href="/dashboard" size="sm" />

              <div className="flex items-center gap-2">
                <LanguageToggle size="sm" />
                <button
                  onClick={handleLogout}
                  className="rounded-xl border border-slate-800 px-3 py-2 text-sm text-slate-400"
                >
                  {t.common.logoutShort}
                </button>
              </div>
            </div>

            <nav className="flex gap-2 px-4 pb-4">
              {navItems.map((item) => {
                const active = isActive(item.href);
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition',
                      active
                        ? 'border border-cyan-400/20 bg-cyan-400/10 text-cyan-200'
                        : 'border border-slate-800 text-slate-400',
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </header>

          <main className="flex-1 px-4 py-8 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-7xl">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
