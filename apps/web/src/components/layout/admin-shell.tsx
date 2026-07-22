'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  LogOut,
  Shield,
  Users,
} from 'lucide-react';
import { ReactNode, useEffect } from 'react';
import { LanguageToggle } from '@/components/ui/language-toggle';
import { Logo } from '@/components/ui/logo';
import { PageLoading } from '@/components/ui/page-loading';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useLanguage } from '@/i18n/language-provider';
import { cn } from '@/lib/utils';
import { authService } from '@/services/auth';

type AdminShellProps = {
  children: ReactNode;
};

export function AdminShell({ children }: AdminShellProps) {
  const { t } = useLanguage();
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading } = useCurrentUser();

  const isAdmin = user?.platformRole === 'SUPER_ADMIN';

  useEffect(() => {
    if (!isLoading && user && !isAdmin) {
      router.replace('/dashboard');
    }
  }, [isAdmin, isLoading, router, user]);

  if (isLoading || !user) {
    return <PageLoading />;
  }

  if (!isAdmin) {
    return <PageLoading />;
  }

  const navItems = [
    { label: t.admin.overview, href: '/admin', icon: LayoutDashboard },
    { label: t.admin.users, href: '/admin/users', icon: Users },
  ];

  function isActive(href: string) {
    if (href === '/admin') return pathname === '/admin';
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-0 top-0 h-[32rem] w-[32rem] rounded-full bg-[var(--accent)]/8 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-blue-500/8 blur-3xl" />
      </div>

      <div className="relative flex min-h-screen">
        <aside className="hidden w-64 shrink-0 flex-col border-r border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur lg:flex">
          <div className="border-b border-[var(--border)] px-6 py-6">
            <Logo href="/admin" showTagline />
            <p className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-[var(--accent)]">
              <Shield className="h-3.5 w-3.5" />
              {t.admin.badge}
            </p>
          </div>

          <nav
            aria-label={t.admin.navigation}
            className="flex-1 space-y-1 px-4 py-5"
          >
            {navItems.map((item) => {
              const active = isActive(item.href);
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition',
                    active
                      ? 'border border-[var(--accent-border)] bg-[var(--accent-soft)] text-[var(--accent)]'
                      : 'text-[var(--muted-foreground)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]',
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="space-y-2 border-t border-[var(--border)] p-4">
            <Link
              href="/dashboard"
              className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-[var(--muted-foreground)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]"
            >
              {t.admin.backToApp}
            </Link>
            <LanguageToggle className="w-full justify-center" size="sm" />
            <button
              onClick={() => void authService.logout()}
              className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-[var(--muted-foreground)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]"
            >
              <LogOut className="h-4 w-4" />
              {t.common.logout}
            </button>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 border-b border-[var(--border)] bg-[var(--background)]/90 backdrop-blur lg:hidden">
            <div className="flex items-center justify-between gap-3 px-4 py-3">
              <Logo href="/admin" size="sm" />
              <LanguageToggle size="sm" />
            </div>
            <nav
              aria-label={t.admin.navigation}
              className="flex gap-1 px-3 pb-3"
            >
              {navItems.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex-1 rounded-xl px-3 py-2 text-center text-sm font-medium transition',
                      active
                        ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
                        : 'text-[var(--muted-foreground)]',
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </header>

          <main
            id="main-content"
            tabIndex={-1}
            className="flex-1 px-4 py-7 sm:px-6 lg:px-8 lg:py-9"
          >
            <div className="mx-auto max-w-7xl">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
