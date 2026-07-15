'use client';

import type {
  ApiKeySummary,
  DomainSummary,
  WorkspaceMembership,
  WorkspaceRole,
} from '@urlytix/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle2,
  Clipboard,
  Globe2,
  KeyRound,
  Trash2,
  UserPlus,
  Users,
} from 'lucide-react';
import { FormEvent, useState } from 'react';
import {
  useWorkspaceAccess,
  WorkspaceReadOnlyNotice,
} from '../../settings/_components/workspace-access';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader } from '@/components/ui/card';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorBanner } from '@/components/ui/error-banner';
import { Input } from '@/components/ui/input';
import { DateTimePicker } from '@/components/ui/datetime-picker';
import { Modal } from '@/components/ui/modal';
import { MenuSelect } from '@/components/ui/menu-select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { useWorkspace } from '@/contexts/workspace-context';
import { useCurrentUser } from '@/hooks/use-current-user';
import { interpolate } from '@/i18n';
import { useLanguage } from '@/i18n/language-provider';
import { apiKeysService } from '@/services/api-keys';
import { domainsService } from '@/services/domains';
import {
  type AssignableWorkspaceRole,
  workspacesService,
} from '@/services/workspaces';
import { formatDate } from '@/lib/format';

function getInitials(nameOrEmail: string) {
  const trimmed = nameOrEmail.trim();
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return trimmed.slice(0, 2).toUpperCase();
}
export function WorkspaceSettings() {
  const { t } = useLanguage();
  const { currentWorkspace, updateWorkspace, deleteWorkspace, workspaces } =
    useWorkspace();
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const { canManage, isAccessLoading, role } = useWorkspaceAccess();
  const [name, setName] = useState(currentWorkspace?.name ?? '');
  const [saving, setSaving] = useState(false);
  const [confirmSlug, setConfirmSlug] = useState('');
  const [deleting, setDeleting] = useState(false);
  const isOwner = role === 'OWNER';
  const canDelete = isOwner && workspaces.length > 1;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      await updateWorkspace(name.trim());
      showToast(t.settings.workspaceSaved);
    } catch {
      showToast(t.settings.workspaceSaveFailed, 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(event: FormEvent) {
    event.preventDefault();
    if (!currentWorkspace) return;
    const ok = await confirm({
      title: t.settings.deleteWorkspaceTitle,
      description: t.settings.deleteWorkspaceDescription,
      confirmLabel: t.settings.deleteWorkspace,
      variant: 'danger',
    });
    if (!ok) return;

    setDeleting(true);
    try {
      await deleteWorkspace(confirmSlug.trim());
      showToast(t.settings.workspaceDeleted);
      setConfirmSlug('');
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : t.settings.workspaceDeleteFailed,
        'error',
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <Card>
        <CardHeader title={t.settings.workspaceTitle} description={t.settings.workspaceDescription} />
        {!isAccessLoading && !canManage && (
          <div className="mt-6">
            <WorkspaceReadOnlyNotice />
          </div>
        )}
        <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
          <Input
            name="settings-workspace-name"
            label={t.settings.workspaceName}
            minLength={2}
            maxLength={100}
            required
            disabled={!currentWorkspace || !canManage}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <Input label={t.settings.workspaceSlug} value={currentWorkspace?.slug ?? ''} disabled />
          <Button
            type="submit"
            fullWidth
            className="sm:w-auto"
            disabled={!currentWorkspace || !canManage || saving || name.trim() === currentWorkspace.name}
          >
            {saving ? t.common.saving : t.common.save}
          </Button>
        </form>
      </Card>

      {isOwner && (
        <Card className="border-[var(--danger-border)]">
          <CardHeader
            title={t.settings.dangerZoneTitle}
            description={t.settings.dangerZoneDescription}
          />
          <form className="mt-6 space-y-4" onSubmit={handleDelete}>
            <p className="text-sm text-[var(--muted-foreground)]">
              {canDelete
                ? t.settings.deleteWorkspaceHint
                : t.settings.deleteWorkspaceLastOwner}
            </p>
            <Input
              label={t.settings.deleteWorkspaceConfirmSlug}
              value={confirmSlug}
              onChange={(event) => setConfirmSlug(event.target.value)}
              placeholder={currentWorkspace?.slug}
              disabled={!canDelete}
              required={canDelete}
            />
            <Button
              type="submit"
              variant="danger"
              fullWidth
              className="sm:w-auto"
              disabled={
                !canDelete ||
                deleting ||
                confirmSlug.trim() !== (currentWorkspace?.slug ?? '')
              }
            >
              {deleting ? t.common.processing : t.settings.deleteWorkspace}
            </Button>
          </form>
        </Card>
      )}
    </div>
  );
}

export function MemberSettings() {
  const { t } = useLanguage();
  const { currentWorkspace } = useWorkspace();
  const { user } = useCurrentUser();
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<AssignableWorkspaceRole>('MEMBER');
  const [adding, setAdding] = useState(false);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const { canManage, isAccessLoading } = useWorkspaceAccess();
  const queryKey = ['workspace-members', currentWorkspace?.id];
  const query = useQuery({
    queryKey,
    queryFn: async () => {
      const workspace = await workspacesService.get(currentWorkspace!.id);
      return workspace.memberships;
    },
    enabled: Boolean(currentWorkspace),
  });

  async function handleAdd(event: FormEvent) {
    event.preventDefault();
    if (!currentWorkspace) return;
    setAdding(true);
    try {
      const membership = await workspacesService.addMember(currentWorkspace.id, {
        email: email.trim().toLowerCase(),
        role,
      });
      queryClient.setQueryData<WorkspaceMembership[]>(queryKey, (current = []) => {
        const without = current.filter((item) => item.userId !== membership.userId);
        return [...without, membership].sort((a, b) =>
          a.user.email.localeCompare(b.user.email),
        );
      });
      setEmail('');
      setRole('MEMBER');
      showToast(t.settings.memberAdded);
    } catch {
      showToast(t.settings.memberAddFailed, 'error');
    } finally {
      setAdding(false);
    }
  }

  async function handleRoleChange(member: WorkspaceMembership, nextRole: AssignableWorkspaceRole) {
    if (!currentWorkspace || member.role === nextRole) return;
    setUpdatingUserId(member.userId);
    try {
      const updated = await workspacesService.updateMemberRole(
        currentWorkspace.id,
        member.userId,
        { role: nextRole },
      );
      queryClient.setQueryData<WorkspaceMembership[]>(queryKey, (current = []) =>
        current.map((item) => (item.userId === updated.userId ? updated : item)),
      );
      showToast(t.settings.memberUpdated);
    } catch {
      showToast(t.settings.memberUpdateFailed, 'error');
    } finally {
      setUpdatingUserId(null);
    }
  }

  async function handleRemove(member: WorkspaceMembership) {
    if (!currentWorkspace) return;
    const ok = await confirm({
      title: t.settings.memberRemoveTitle,
      description: interpolate(t.settings.memberRemoveDescription, {
        email: member.user.email,
      }),
      confirmLabel: t.settings.revoke,
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await workspacesService.removeMember(currentWorkspace.id, member.userId);
      queryClient.setQueryData<WorkspaceMembership[]>(queryKey, (current = []) =>
        current.filter((item) => item.userId !== member.userId),
      );
      showToast(t.settings.memberRemoved);
    } catch {
      showToast(t.settings.memberRemoveFailed, 'error');
    }
  }

  function roleLabel(value: WorkspaceRole) {
    switch (value) {
      case 'OWNER':
        return t.settings.roleOwner;
      case 'ADMIN':
        return t.settings.roleAdmin;
      case 'MEMBER':
        return t.settings.roleMember;
      case 'VIEWER':
        return t.settings.roleViewer;
    }
  }

  function roleBadgeVariant(value: WorkspaceRole): 'accent' | 'success' | 'default' | 'warning' {
    switch (value) {
      case 'OWNER':
        return 'accent';
      case 'ADMIN':
        return 'success';
      case 'VIEWER':
        return 'warning';
      default:
        return 'default';
    }
  }

  return (
    <div className="space-y-6">
      <Card className="max-w-3xl">
        <CardHeader
          title={t.settings.membersTitle}
          description={t.settings.membersDescription}
        />
        {!isAccessLoading && !canManage && (
          <div className="mt-6">
            <WorkspaceReadOnlyNotice />
          </div>
        )}
        {canManage && (
          <form
            className="mt-6 grid gap-4 sm:grid-cols-[1fr_12.5rem_auto] sm:items-end"
            onSubmit={handleAdd}
          >
            <Input
              name="member-email"
              type="email"
              label={t.settings.memberEmail}
              placeholder={t.settings.memberEmailPlaceholder}
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3 sm:contents">
              <MenuSelect
                label={t.settings.memberRole}
                value={role}
                onChange={setRole}
                options={[
                  {
                    value: 'ADMIN',
                    label: t.settings.roleAdmin,
                    description: t.settings.roleAdminDescription,
                    tone: 'success',
                  },
                  {
                    value: 'MEMBER',
                    label: t.settings.roleMember,
                    description: t.settings.roleMemberDescription,
                    tone: 'default',
                  },
                  {
                    value: 'VIEWER',
                    label: t.settings.roleViewer,
                    description: t.settings.roleViewerDescription,
                    tone: 'warning',
                  },
                ]}
              />
              <Button
                type="submit"
                disabled={adding || !currentWorkspace}
                className="shrink-0"
              >
                <UserPlus className="h-4 w-4" />
                {adding ? t.settings.memberAdding : t.settings.memberAdd}
              </Button>
            </div>
          </form>
        )}
      </Card>

      <Card className="max-w-3xl">
        {query.isLoading && (
          <div className="space-y-4" aria-hidden="true">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="flex items-center gap-3 py-1">
                <Skeleton className="rounded-full" width={40} height={40} />
                <div className="flex-1 space-y-2">
                  <Skeleton size="sm" width="40%" />
                  <Skeleton size="sm" width="55%" />
                </div>
                <Skeleton width={90} height={32} />
              </div>
            ))}
          </div>
        )}
        {query.error && (
          <ErrorBanner
            message={t.settings.membersListFailed}
            onRetry={() => void query.refetch()}
            retryLabel={t.common.tryAgain}
            isRetrying={query.isFetching}
          />
        )}
        {query.data && query.data.length === 0 && (
          <EmptyState icon={Users} title={t.settings.membersTitle} description={t.settings.noMembers} />
        )}
        {query.data && query.data.length > 0 && (
          <ul className="divide-y divide-[var(--border)]">
            {query.data.map((member) => {
              const isSelf = member.userId === user?.id;
              const isOwner = member.role === 'OWNER';
              const canEdit = canManage && !isSelf && !isOwner;

              return (
                <li
                  key={member.id}
                  className="flex flex-col gap-3 rounded-[var(--radius-md)] px-1 py-4 transition-colors hover:bg-[var(--surface-hover)] sm:flex-row sm:items-center sm:justify-between sm:px-3"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-sm font-semibold text-[var(--accent)]">
                      {getInitials(member.user.name || member.user.email)}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-[var(--foreground)]">
                        {member.user.name || member.user.email}
                        {isSelf ? (
                          <span className="ml-2 text-xs font-normal text-[var(--muted-foreground)]">
                            ({t.settings.you})
                          </span>
                        ) : null}
                      </p>
                      <p className="truncate text-sm text-[var(--muted-foreground)]">
                        {member.user.email}
                      </p>
                    </div>
                  </div>
                  <div
                    className={
                      canEdit
                        ? 'flex w-full items-center justify-between gap-3 pl-[3.25rem] sm:w-auto sm:justify-end sm:pl-0'
                        : 'flex w-full items-center justify-end gap-3 pl-[3.25rem] sm:w-auto sm:pl-0'
                    }
                  >
                    {canEdit ? (
                      <MenuSelect
                        aria-label={t.settings.memberRole}
                        value={member.role as AssignableWorkspaceRole}
                        disabled={updatingUserId === member.userId}
                        className="min-w-0 flex-1 sm:w-40 sm:flex-none"
                        align="right"
                        onChange={(nextRole) =>
                          void handleRoleChange(member, nextRole)
                        }
                        options={[
                          {
                            value: 'ADMIN',
                            label: t.settings.roleAdmin,
                            tone: 'success',
                          },
                          {
                            value: 'MEMBER',
                            label: t.settings.roleMember,
                            tone: 'default',
                          },
                          {
                            value: 'VIEWER',
                            label: t.settings.roleViewer,
                            tone: 'warning',
                          },
                        ]}
                      />
                    ) : (
                      <Badge variant={roleBadgeVariant(member.role)} dot>
                        {roleLabel(member.role)}
                      </Badge>
                    )}
                    {canEdit && (
                      <Button
                        type="button"
                        variant="ghost"
                        className="shrink-0"
                        onClick={() => void handleRemove(member)}
                        aria-label={t.settings.memberRemoveTitle}
                      >
                        <Trash2 className="h-4 w-4 text-[var(--danger)]" />
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}

export function DomainSettings() {
  const { t } = useLanguage();
  const { currentWorkspace } = useWorkspace();
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const { canManage, isAccessLoading } = useWorkspaceAccess();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [hostname, setHostname] = useState('');
  const [creating, setCreating] = useState(false);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const queryKey = ['domains', currentWorkspace?.id];
  const query = useQuery({
    queryKey,
    queryFn: () => domainsService.list(currentWorkspace!.id),
    enabled: Boolean(currentWorkspace),
  });

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    if (!currentWorkspace) return;
    setCreating(true);
    try {
      const domain = await domainsService.create(currentWorkspace.id, {
        hostname: hostname.trim().toLowerCase(),
      });
      queryClient.setQueryData<DomainSummary[]>(queryKey, (current = []) => [
        domain,
        ...current,
      ]);
      setCreateOpen(false);
      setHostname('');
      showToast(t.settings.domainCreated);
    } catch {
      showToast(t.settings.domainCreateFailed, 'error');
    } finally {
      setCreating(false);
    }
  }

  async function copyValue(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      showToast(t.common.copied);
    } catch {
      showToast(t.settings.copyFailed, 'error');
    }
  }

  async function verifyDomain(domain: DomainSummary) {
    if (!currentWorkspace) return;
    setVerifyingId(domain.id);
    try {
      const result = await domainsService.verify(currentWorkspace.id, domain.id);
      if (!result.verified || !result.domain) {
        showToast(t.settings.domainVerifyFailed, 'error');
        return;
      }
      queryClient.setQueryData<DomainSummary[]>(queryKey, (current = []) =>
        current.map((item) =>
          item.id === result.domain!.id ? result.domain! : item,
        ),
      );
      showToast(t.settings.domainVerified);
    } catch {
      showToast(t.settings.domainVerifyFailed, 'error');
    } finally {
      setVerifyingId(null);
    }
  }

  async function removeDomain(domain: DomainSummary) {
    if (!currentWorkspace) return;
    const approved = await confirm({
      title: t.settings.domainDeleteTitle,
      description: t.settings.domainDeleteDescription.replace(
        '{hostname}',
        domain.hostname,
      ),
      confirmLabel: t.settings.domainDelete,
      variant: 'danger',
    });
    if (!approved) return;
    try {
      await domainsService.remove(currentWorkspace.id, domain.id);
      queryClient.setQueryData<DomainSummary[]>(queryKey, (current = []) =>
        current.filter((item) => item.id !== domain.id),
      );
      showToast(t.settings.domainDeleted);
    } catch {
      showToast(t.settings.domainDeleteFailed, 'error');
    }
  }

  return (
    <>
      <Card>
        <CardHeader
          title={t.settings.domainsTitle}
          description={t.settings.domainsDescription}
          action={canManage ? (
            <Button
              onClick={() => setCreateOpen(true)}
              disabled={!currentWorkspace}
            >
              <Globe2 className="h-4 w-4" />
              {t.settings.addDomain}
            </Button>
          ) : undefined}
        />
        <div className="mt-6 space-y-4">
          {!isAccessLoading && !canManage && <WorkspaceReadOnlyNotice />}
          {query.isLoading && (
            <div className="space-y-3" aria-hidden="true">
              {Array.from({ length: 2 }).map((_, index) => (
                <Skeleton key={index} height={88} />
              ))}
            </div>
          )}
          {query.isError && (
            <ErrorBanner
              message={t.settings.domainListFailed}
              onRetry={() => void query.refetch()}
              retryLabel={t.common.tryAgain}
              isRetrying={query.isFetching}
            />
          )}
          {query.data?.length === 0 && (
            <EmptyState
              icon={Globe2}
              title={t.settings.domainsTitle}
              description={t.settings.noDomains}
              action={
                canManage ? (
                  <Button onClick={() => setCreateOpen(true)}>
                    <Globe2 className="h-4 w-4" />
                    {t.settings.addDomain}
                  </Button>
                ) : undefined
              }
            />
          )}
          {query.data?.map((domain) => {
            const verified = Boolean(domain.verifiedAt);
            const txtName = `_urlytix-verification.${domain.hostname}`;
            return (
              <div
                key={domain.id}
                className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate font-semibold">{domain.hostname}</h3>
                      <span
                        className={
                          verified
                            ? 'rounded-full bg-emerald-400/10 px-2.5 py-1 text-xs font-medium text-emerald-300'
                            : 'rounded-full bg-amber-400/10 px-2.5 py-1 text-xs font-medium text-amber-200'
                        }
                      >
                        {verified
                          ? t.settings.domainStatusVerified
                          : t.settings.domainStatusPending}
                      </span>
                    </div>
                    {canManage && !verified && (
                      <div className="mt-4 space-y-3 rounded-xl border border-[var(--border)] bg-[var(--surface-raised)]/70 p-4">
                        <p className="text-xs text-[var(--muted-foreground)]">
                          {t.settings.domainDnsHelp}
                        </p>
                        <div className="space-y-3">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                            <span className="shrink-0 text-xs text-[var(--muted-foreground)] sm:w-24">
                              {t.settings.domainTxtRecord}
                            </span>
                            <code className="min-w-0 flex-1 break-all rounded-lg bg-[var(--background)] px-3 py-2 font-mono text-xs text-[var(--accent)]">
                              {txtName}
                            </code>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              fullWidth
                              className="sm:w-auto"
                              onClick={() => void copyValue(txtName)}
                            >
                              <Clipboard className="h-3.5 w-3.5" />
                              {t.settings.copyValue}
                            </Button>
                          </div>
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                            <span className="shrink-0 text-xs text-[var(--muted-foreground)] sm:w-24">
                              {t.settings.domainTxtValue}
                            </span>
                            <code className="min-w-0 flex-1 break-all rounded-lg bg-[var(--background)] px-3 py-2 font-mono text-xs text-[var(--accent)]">
                              {domain.verificationToken}
                            </code>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              fullWidth
                              className="sm:w-auto"
                              onClick={() =>
                                void copyValue(domain.verificationToken)
                              }
                            >
                              <Clipboard className="h-3.5 w-3.5" />
                              {t.settings.copyValue}
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex w-full gap-2 sm:w-auto sm:shrink-0 sm:flex-wrap">
                    {canManage && !verified && (
                      <Button
                        size="sm"
                        fullWidth
                        className="flex-1 sm:w-auto sm:flex-none"
                        onClick={() => void verifyDomain(domain)}
                        disabled={verifyingId === domain.id}
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        {verifyingId === domain.id
                          ? t.settings.domainVerifying
                          : t.settings.domainVerify}
                      </Button>
                    )}
                    {canManage && (
                      <Button
                        variant="danger"
                        size="sm"
                        fullWidth
                        className="flex-1 sm:w-auto sm:flex-none"
                        onClick={() => void removeDomain(domain)}
                      >
                        <Trash2 className="h-4 w-4" />
                        {t.settings.domainDelete}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title={t.settings.addDomain}
        description={t.settings.domainsDescription}
        closeLabel={t.common.close}
      >
        <form className="space-y-5" onSubmit={handleCreate}>
          <Input
            name="domain-hostname"
            label={t.settings.domainHostname}
            placeholder={t.settings.domainHostnamePlaceholder}
            hint={t.settings.domainHostnameHint}
            required
            value={hostname}
            onChange={(event) => setHostname(event.target.value)}
          />
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setCreateOpen(false)}
            >
              {t.common.cancel}
            </Button>
            <Button type="submit" disabled={creating}>
              {creating ? t.settings.domainCreating : t.settings.domainCreate}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

export function ApiKeySettings() {
  const { t, locale } = useLanguage();
  const { currentWorkspace } = useWorkspace();
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const { canManage, isAccessLoading } = useWorkspaceAccess();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [secret, setSecret] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [creating, setCreating] = useState(false);
  const queryKey = ['api-keys', currentWorkspace?.id];
  const query = useQuery({
    queryKey,
    queryFn: () => apiKeysService.list(currentWorkspace!.id),
    enabled: Boolean(currentWorkspace),
  });

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    if (!currentWorkspace) return;
    setCreating(true);
    try {
      const response = await apiKeysService.create(currentWorkspace.id, {
        name: name.trim(),
        expiresAt: expiresAt || undefined,
      });
      setSecret(response.secret);
      setCreateOpen(false);
      setName('');
      setExpiresAt('');
      queryClient.setQueryData<ApiKeySummary[]>(queryKey, (current = []) => [
        { ...response.apiKey, lastUsedAt: null },
        ...current,
      ]);
      showToast(t.settings.apiKeyCreated);
    } catch {
      showToast(t.settings.apiKeyCreateFailed, 'error');
    } finally {
      setCreating(false);
    }
  }

  async function copySecret() {
    if (!secret) return;
    try {
      await navigator.clipboard.writeText(secret);
      showToast(t.common.copied);
    } catch {
      showToast(t.settings.copyFailed, 'error');
    }
  }

  async function revokeKey(apiKey: ApiKeySummary) {
    if (!currentWorkspace) return;
    const approved = await confirm({
      title: t.settings.revokeTitle,
      description: t.settings.revokeDescription.replace('{name}', apiKey.name),
      confirmLabel: t.settings.revoke,
      variant: 'danger',
    });
    if (!approved) return;
    try {
      await apiKeysService.revoke(currentWorkspace.id, apiKey.id);
      queryClient.setQueryData<ApiKeySummary[]>(queryKey, (current = []) =>
        current.filter((item) => item.id !== apiKey.id),
      );
      showToast(t.settings.revoked);
    } catch {
      showToast(t.settings.revokeFailed, 'error');
    }
  }

  return (
    <>
      <Card>
        <CardHeader
          title={t.settings.apiKeysTitle}
          description={t.settings.apiKeysDescription}
          action={canManage ? (
            <Button onClick={() => setCreateOpen(true)} disabled={!currentWorkspace}>
              <KeyRound className="h-4 w-4" />
              {t.settings.newApiKey}
            </Button>
          ) : undefined}
        />
        <div className="mt-6 space-y-3">
          {!isAccessLoading && !canManage && <WorkspaceReadOnlyNotice />}
          {query.isLoading && (
            <div className="space-y-3" aria-hidden="true">
              {Array.from({ length: 2 }).map((_, index) => (
                <Skeleton key={index} height={64} />
              ))}
            </div>
          )}
          {query.isError && (
            <ErrorBanner
              message={t.settings.listFailed}
              onRetry={() => void query.refetch()}
              retryLabel={t.common.tryAgain}
              isRetrying={query.isFetching}
            />
          )}
          {query.data?.length === 0 && (
            <EmptyState
              icon={KeyRound}
              title={t.settings.apiKeysTitle}
              description={t.settings.noApiKeys}
              action={
                canManage ? (
                  <Button onClick={() => setCreateOpen(true)}>
                    <KeyRound className="h-4 w-4" />
                    {t.settings.newApiKey}
                  </Button>
                ) : undefined
              }
            />
          )}
          {query.data?.map((apiKey) => (
            <div
              key={apiKey.id}
              className="flex flex-col gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:flex-row sm:items-center"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{apiKey.name}</p>
                <p className="mt-1 font-mono text-xs text-[var(--muted-foreground)]">
                  {t.settings.prefix}: {apiKey.prefix}â€¦
                </p>
              </div>
              <div className="grid grid-cols-2 gap-x-5 gap-y-1 text-xs text-[var(--muted-foreground)]">
                <span>{t.settings.createdAt}</span>
                <span>{formatDate(apiKey.createdAt, locale)}</span>
                <span>{t.settings.lastUsed}</span>
                <span>
                  {apiKey.lastUsedAt
                    ? formatDate(apiKey.lastUsedAt, locale)
                    : t.settings.never}
                </span>
              </div>
              {canManage && (
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => void revokeKey(apiKey)}
                >
                  <Trash2 className="h-4 w-4" />
                  {t.settings.revoke}
                </Button>
              )}
            </div>
          ))}
        </div>
      </Card>

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title={t.settings.newApiKey}
        description={t.settings.apiKeysDescription}
        closeLabel={t.common.close}
      >
        <form className="space-y-5" onSubmit={handleCreate}>
          <Input
            name="api-key-name"
            label={t.settings.apiKeyName}
            placeholder={t.settings.apiKeyNamePlaceholder}
            minLength={2}
            maxLength={100}
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <DateTimePicker
            name="api-key-expiry"
            label={t.settings.expiresAt}
            hint={t.settings.expiresHint}
            value={expiresAt}
            onChange={setExpiresAt}
          />
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setCreateOpen(false)}
            >
              {t.common.cancel}
            </Button>
            <Button type="submit" disabled={creating}>
              {creating ? t.settings.creatingApiKey : t.settings.createApiKey}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(secret)}
        onClose={() => setSecret(null)}
        title={t.settings.secretTitle}
        description={t.settings.secretDescription}
        closeLabel={t.common.close}
      >
        <div className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-4">
          <code className="block break-all text-sm leading-6 text-amber-100">
            {secret}
          </code>
        </div>
        <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={() => setSecret(null)}>
            {t.common.close}
          </Button>
          <Button onClick={() => void copySecret()}>
            <Clipboard className="h-4 w-4" />
            {t.common.copy}
          </Button>
        </div>
      </Modal>
    </>
  );
}
