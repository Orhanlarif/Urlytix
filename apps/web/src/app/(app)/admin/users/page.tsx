'use client';

import { FormEvent, Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, ShieldOff, UserX } from 'lucide-react';
import { AdminShell } from '@/components/layout/admin-shell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader } from '@/components/ui/card';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { DataTable } from '@/components/ui/data-table';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorBanner } from '@/components/ui/error-banner';
import { Input } from '@/components/ui/input';
import { MenuSelect } from '@/components/ui/menu-select';
import { PageHeader } from '@/components/ui/page-header';
import { PageLoading } from '@/components/ui/page-loading';
import { useToast } from '@/components/ui/toast';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useLanguage } from '@/i18n/language-provider';
import { formatDateTime, formatNumber } from '@/lib/format';
import { adminService, type AdminUserSummary } from '@/services/admin';

export default function AdminUsersPage() {
  return (
    <Suspense
      fallback={
        <AdminShell>
          <PageLoading showPanels />
        </AdminShell>
      }
    >
      <AdminUsersPageContent />
    </Suspense>
  );
}

function AdminUsersPageContent() {
  const { t, locale } = useLanguage();
  const searchParams = useSearchParams();
  const { user: currentUser } = useCurrentUser();
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const queryClient = useQueryClient();

  const initialQ = searchParams.get('q') ?? '';
  const [q, setQ] = useState(initialQ);
  const [search, setSearch] = useState(initialQ);
  const [status, setStatus] = useState<'all' | 'active' | 'disabled'>('all');
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    const next = searchParams.get('q') ?? '';
    setQ(next);
    setSearch(next);
  }, [searchParams]);

  const listQuery = useQuery({
    queryKey: ['admin', 'users', { search, status, page }],
    queryFn: () =>
      adminService.listUsers({
        q: search || undefined,
        status,
        page,
        pageSize: 20,
      }),
  });

  const detailQuery = useQuery({
    queryKey: ['admin', 'users', selectedId],
    queryFn: () => adminService.getUser(selectedId!),
    enabled: Boolean(selectedId),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, disabled }: { id: string; disabled: boolean }) =>
      adminService.updateUser(id, { disabled }),
    onSuccess: async (result) => {
      showToast(result.message);
      await queryClient.invalidateQueries({ queryKey: ['admin'] });
    },
    onError: (err: Error) => showToast(err.message),
  });

  const revokeMutation = useMutation({
    mutationFn: (id: string) => adminService.revokeSessions(id),
    onSuccess: async (result) => {
      showToast(result.message);
      await queryClient.invalidateQueries({ queryKey: ['admin'] });
    },
    onError: (err: Error) => showToast(err.message),
  });

  const users = listQuery.data?.data ?? [];
  const meta = listQuery.data?.meta;

  const selected = useMemo(
    () => users.find((user) => user.id === selectedId) ?? detailQuery.data,
    [detailQuery.data, selectedId, users],
  );

  function handleSearch(event: FormEvent) {
    event.preventDefault();
    setPage(1);
    setSearch(q.trim());
  }

  async function handleToggleDisabled(user: AdminUserSummary) {
    const nextDisabled = !user.disabled;
    const ok = await confirm({
      title: nextDisabled
        ? t.admin.disableConfirmTitle
        : t.admin.enableConfirmTitle,
      description: nextDisabled
        ? t.admin.disableConfirmDesc.replace('{email}', user.email)
        : t.admin.enableConfirmDesc.replace('{email}', user.email),
      confirmLabel: nextDisabled ? t.admin.disable : t.admin.enable,
      variant: nextDisabled ? 'danger' : 'primary',
    });
    if (!ok) return;
    updateMutation.mutate({ id: user.id, disabled: nextDisabled });
  }

  async function handleRevokeSessions(user: AdminUserSummary) {
    const ok = await confirm({
      title: t.admin.revokeConfirmTitle,
      description: t.admin.revokeConfirmDesc.replace('{email}', user.email),
      confirmLabel: t.admin.revokeSessions,
      variant: 'danger',
    });
    if (!ok) return;
    revokeMutation.mutate(user.id);
  }

  if (listQuery.isLoading && !listQuery.data) {
    return (
      <AdminShell>
        <PageLoading showPanels />
      </AdminShell>
    );
  }

  return (
    <AdminShell>
      <PageHeader
        badge={t.admin.badge}
        title={t.admin.usersTitle}
        description={t.admin.usersDescription}
      />

      <Card className="mt-8">
        <form
          onSubmit={handleSearch}
          className="flex flex-col gap-3 sm:flex-row sm:items-end"
        >
          <div className="flex-1">
            <Input
              value={q}
              onChange={(event) => setQ(event.target.value)}
              placeholder={t.admin.searchPlaceholder}
              aria-label={t.common.search}
            />
          </div>
          <div className="w-full sm:w-48">
            <MenuSelect
              value={status}
              onChange={(value) => {
                setStatus(value);
                setPage(1);
              }}
              options={[
                { value: 'all', label: t.admin.filterAll },
                { value: 'active', label: t.admin.filterActive },
                { value: 'disabled', label: t.admin.filterDisabled },
              ]}
              aria-label={t.common.status}
            />
          </div>
          <Button type="submit">
            <Search className="h-4 w-4" />
            {t.common.search}
          </Button>
        </form>
      </Card>

      <div className="mt-6">
        <ErrorBanner
          message={listQuery.error?.message || ''}
          onRetry={
            listQuery.error ? () => void listQuery.refetch() : undefined
          }
          retryLabel={t.common.tryAgain}
          isRetrying={listQuery.isLoading}
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader
            title={t.admin.users}
            description={
              meta
                ? t.admin.usersCount.replace(
                    '{count}',
                    formatNumber(meta.total, locale),
                  )
                : undefined
            }
          />

          {users.length === 0 ? (
            <div className="mt-6">
              <EmptyState
                icon={UserX}
                title={t.admin.noUsers}
                description={t.admin.noUsersDesc}
              />
            </div>
          ) : (
            <div className="mt-6">
              <DataTable
                headings={[
                  t.admin.colUser,
                  t.admin.colRole,
                  t.admin.colStatus,
                  t.admin.colLinks,
                  t.common.actions,
                ]}
              >
                {users.map((user) => (
                  <tr key={user.id}>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => setSelectedId(user.id)}
                        className="text-left"
                      >
                        <p className="font-medium">
                          {user.name?.trim() || user.email}
                        </p>
                        <p className="text-xs text-[var(--muted-foreground)]">
                          {user.email}
                        </p>
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      {user.platformRole === 'SUPER_ADMIN' ? (
                        <Badge variant="success">{t.admin.roleAdmin}</Badge>
                      ) : (
                        <Badge>{t.admin.roleUser}</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {user.disabled ? (
                        <Badge variant="warning">{t.admin.statusDisabled}</Badge>
                      ) : (
                        <Badge variant="success">{t.admin.statusActive}</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      {formatNumber(user.linkCount ?? 0, locale)}
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedId(user.id)}
                      >
                        {t.common.manage}
                      </Button>
                    </td>
                  </tr>
                ))}
              </DataTable>

              {meta && meta.totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={page <= 1}
                    onClick={() => setPage((value) => Math.max(1, value - 1))}
                  >
                    {t.common.previous}
                  </Button>
                  <p className="text-sm text-[var(--muted-foreground)]">
                    {page} / {meta.totalPages}
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={page >= meta.totalPages}
                    onClick={() => setPage((value) => value + 1)}
                  >
                    {t.common.next}
                  </Button>
                </div>
              )}
            </div>
          )}
        </Card>

        <Card>
          <CardHeader
            title={t.admin.userDetailTitle}
            description={t.admin.userDetailDescription}
          />

          {!selectedId || !selected ? (
            <p className="mt-6 text-sm text-[var(--muted-foreground)]">
              {t.admin.selectUser}
            </p>
          ) : detailQuery.isLoading && !detailQuery.data ? (
            <PageLoading />
          ) : (
            <div className="mt-6 space-y-5">
              <div>
                <p className="text-lg font-semibold">
                  {selected.name?.trim() || selected.email}
                </p>
                <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                  {selected.email}
                </p>
                <p className="mt-2 text-xs text-[var(--muted-foreground)]">
                  {t.admin.joined}: {formatDateTime(selected.createdAt, locale)}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {selected.platformRole === 'SUPER_ADMIN' && (
                  <Badge variant="success">{t.admin.roleAdmin}</Badge>
                )}
                {selected.disabled ? (
                  <Badge variant="warning">{t.admin.statusDisabled}</Badge>
                ) : (
                  <Badge variant="success">{t.admin.statusActive}</Badge>
                )}
                {selected.totpEnabled && (
                  <Badge>{t.admin.twoFactorOn}</Badge>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl border border-[var(--border)] p-3">
                  <p className="text-[var(--muted-foreground)]">
                    {t.admin.colLinks}
                  </p>
                  <p className="mt-1 font-semibold tabular-nums">
                    {formatNumber(
                      detailQuery.data?.linkCount ?? selected.linkCount ?? 0,
                      locale,
                    )}
                  </p>
                </div>
                <div className="rounded-xl border border-[var(--border)] p-3">
                  <p className="text-[var(--muted-foreground)]">
                    {t.admin.memberships}
                  </p>
                  <p className="mt-1 font-semibold tabular-nums">
                    {formatNumber(
                      detailQuery.data?.memberships.length ??
                        selected.membershipCount ??
                        0,
                      locale,
                    )}
                  </p>
                </div>
              </div>

              {detailQuery.data && detailQuery.data.memberships.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">{t.admin.memberships}</p>
                  {detailQuery.data.memberships.map((membership) => (
                    <div
                      key={membership.id}
                      className="rounded-xl border border-[var(--border)] px-3 py-2 text-sm"
                    >
                      <p className="font-medium">
                        {membership.workspace.name}
                      </p>
                      <p className="text-xs text-[var(--muted-foreground)]">
                        {membership.workspace.slug} · {membership.role}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex flex-col gap-2">
                <Button
                  variant="outline"
                  onClick={() =>
                    handleRevokeSessions(selected as AdminUserSummary)
                  }
                  disabled={revokeMutation.isPending}
                >
                  <ShieldOff className="h-4 w-4" />
                  {t.admin.revokeSessions}
                </Button>
                <Button
                  variant={selected.disabled ? 'primary' : 'danger'}
                  onClick={() =>
                    handleToggleDisabled(selected as AdminUserSummary)
                  }
                  disabled={
                    updateMutation.isPending ||
                    selected.id === currentUser?.id ||
                    selected.platformRole === 'SUPER_ADMIN'
                  }
                >
                  <UserX className="h-4 w-4" />
                  {selected.disabled ? t.admin.enable : t.admin.disable}
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </AdminShell>
  );
}
