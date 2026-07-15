'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart3,
  Building2,
  LayoutDashboard,
  Link2,
  LogOut,
  Plus,
  Settings,
  UserCircle,
} from 'lucide-react';
import { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { DropdownItem, DropdownMenu } from '@/components/ui/dropdown-menu';
import { LanguageToggle } from '@/components/ui/language-toggle';
import { Logo } from '@/components/ui/logo';
import { WorkspaceSwitcher } from '@/components/workspace-switcher';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useLanguage } from '@/i18n/language-provider';
import { cn } from '@/lib/utils';
import { authService } from '@/services/auth';

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  const { t } = useLanguage();
  const pathname = usePathname();
  const { user } = useCurrentUser();

  const navItems = [
    { label: t.nav.dashboard, href: '/dashboard', icon: LayoutDashboard },
    { label: t.nav.links, href: '/links', icon: Link2 },
    { label: t.nav.analytics, href: '/analytics', icon: BarChart3 },
    { label: t.nav.workspace, href: '/workspace', icon: Building2 },
    { label: t.nav.settings, href: '/settings', icon: Settings },
  ];

  function handleLogout() {
    void authService.logout();
  }

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  const displayName = user?.name?.trim() || user?.email || t.nav.account;
  const displayEmail = user?.email ?? 'Urlytix';

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <a
        href="#main-content"
        className="fixed left-4 top-4 z-[110] -translate-y-24 rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--accent-foreground)] transition focus:translate-y-0"
      >
        {t.common.skipToContent}
      </a>
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-0 top-0 h-[32rem] w-[32rem] rounded-full bg-[var(--accent)]/8 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-blue-500/8 blur-3xl" />
      </div>

      <div className="relative flex min-h-screen">
        <aside className="hidden w-64 shrink-0 flex-col border-r border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur lg:flex">
          <div className="border-b border-[var(--border)] px-6 py-6">
            <Logo href="/dashboard" showTagline />
          </div>

          <div className="border-b border-[var(--border)] px-4 py-4">
            <WorkspaceSwitcher />
          </div>

          <div className="border-b border-[var(--border)] px-4 py-4">
            <Link href="/links" className="block">
              <Button variant="primary" fullWidth>
                <Plus className="h-4 w-4" />
                {t.nav.newLink}
              </Button>
            </Link>
          </div>

          <nav
            aria-label={t.common.mainNavigation}
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

          <div className="space-y-3 border-t border-[var(--border)] p-4">
            <div className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-raised)]/60 p-3">
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent)]">
                <UserCircle className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{displayName}</p>
                <p className="truncate text-xs text-[var(--muted-foreground)]">
                  {displayEmail}
                </p>
              </div>
            </div>
            <LanguageToggle className="w-full justify-center" size="sm" />

            <button
              onClick={handleLogout}
              aria-label={t.common.logout}
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
              <Logo href="/dashboard" size="sm" />

              <div className="flex items-center gap-2">
                <Link
                  href="/links"
                  aria-label={t.nav.quickCreateLink}
                  className="grid h-10 w-10 place-items-center rounded-xl border border-[var(--border)] text-[var(--muted-foreground)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]"
                >
                  <Plus className="h-4 w-4" />
                </Link>

                <DropdownMenu label={t.nav.accountMenu}>
                  <div className="px-3 py-2">
                    <p className="truncate text-sm font-medium text-[var(--foreground)]">
                      {displayName}
                    </p>
                    <p className="truncate text-xs text-[var(--muted-foreground)]">
                      {displayEmail}
                    </p>
                  </div>
                  <div className="my-1 border-t border-[var(--border)]" />
                  <div className="flex justify-center px-1 py-1">
                    <LanguageToggle size="sm" />
                  </div>
                  <div className="my-1 border-t border-[var(--border)]" />
                  <DropdownItem danger onClick={handleLogout}>
                    <LogOut className="h-4 w-4" />
                    {t.common.logout}
                  </DropdownItem>
                </DropdownMenu>
              </div>
            </div>
            <div className="px-4 pb-3">
              <WorkspaceSwitcher compact />
            </div>
          </header>

          <main
            id="main-content"
            tabIndex={-1}
            className="flex-1 px-4 py-7 pb-28 sm:px-6 lg:px-8 lg:py-9 lg:pb-9"
          >
            <div className="mx-auto max-w-7xl">{children}</div>
          </main>

          <nav
            aria-label={t.common.mainNavigation}
            className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-20 rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--background)]/95 px-1.5 py-1.5 shadow-[var(--shadow-lg)] backdrop-blur lg:hidden"
          >
            <div className="grid grid-cols-5 gap-1">
              {navItems.map((item) => {
                const active = isActive(item.href);
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'flex min-h-12 min-w-0 flex-col items-center justify-center gap-1 rounded-[var(--radius-lg)] px-1 py-2 text-[11px] font-medium transition',
                      active
                        ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
                        : 'text-[var(--muted-foreground)]',
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </nav>
        </div>
      </div>
    </div>
  );
}
