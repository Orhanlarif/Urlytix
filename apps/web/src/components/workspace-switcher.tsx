'use client';

import type { WorkspaceRole } from '@urlytics/shared';
import { useQuery } from '@tanstack/react-query';
import { FormEvent, useCallback, useEffect, useId, useRef, useState } from 'react';
import { Check, ChevronDown, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import { useWorkspace } from '@/contexts/workspace-context';
import { useCurrentUser } from '@/hooks/use-current-user';
import { interpolate } from '@/i18n';
import { useLanguage } from '@/i18n/language-provider';
import type { Translation } from '@/i18n/types';
import { cn } from '@/lib/utils';
import { workspacesService } from '@/services/workspaces';

const roleBadgeVariant: Record<
  WorkspaceRole,
  'default' | 'accent' | 'success' | 'warning'
> = {
  OWNER: 'accent',
  ADMIN: 'success',
  MEMBER: 'default',
  VIEWER: 'warning',
};

function roleLabel(role: WorkspaceRole, t: Translation) {
  switch (role) {
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

function toSlug(value: string) {
  return value
    .toLocaleLowerCase('en-US')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function workspaceInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'W';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
}

export function WorkspaceSwitcher({ compact = false }: { compact?: boolean }) {
  const { t } = useLanguage();
  const {
    workspaces,
    currentWorkspace,
    isLoading,
    error,
    selectWorkspace,
    createWorkspace,
    refetch,
  } = useWorkspace();
  const { showToast } = useToast();
  const { user } = useCurrentUser();
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const currentWorkspaceId = currentWorkspace?.id;
  const membershipsQuery = useQuery({
    queryKey: ['workspace-members', currentWorkspaceId],
    queryFn: async () => {
      const workspace = await workspacesService.get(currentWorkspaceId as string);
      return workspace.memberships;
    },
    enabled: Boolean(currentWorkspaceId),
  });
  const myRole = membershipsQuery.data?.find(
    (membership) => membership.userId === user?.id,
  )?.role;

  const hasWorkspaces = workspaces.length > 0;
  // Desktop owns the automatic empty-state modal; compact mobile switchers can
  // still open it explicitly when no workspace exists. AppShell always mounts
  // the desktop switcher (hidden on small screens), so the modal still opens.
  const modalOpen =
    createOpen || (!compact && !isLoading && !error && !hasWorkspaces);

  const closeCreate = useCallback(() => {
    if (workspaces.length === 0) return;
    setCreateOpen(false);
    setName('');
    setSlug('');
    setSlugTouched(false);
  }, [workspaces.length]);

  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  function changeName(value: string) {
    setName(value);
    if (!slugTouched) {
      setSlug(toSlug(value));
    }
  }

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    setIsCreating(true);
    try {
      await createWorkspace({ name: name.trim(), slug: slug.trim() });
      setName('');
      setSlug('');
      setSlugTouched(false);
      setCreateOpen(false);
      setMenuOpen(false);
      showToast(t.workspace.created);
    } catch {
      showToast(t.workspace.createFailed, 'error');
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <>
      <div ref={rootRef} className={cn('relative', compact && 'min-w-0 flex-1')}>
        {!compact && (
          <p className="mb-2 px-1 text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
            {t.workspace.label}
          </p>
        )}

        <button
          type="button"
          aria-label={t.workspace.select}
          aria-haspopup="listbox"
          aria-expanded={menuOpen}
          aria-controls={menuId}
          disabled={isLoading}
          onClick={() => {
            if (!hasWorkspaces) {
              setCreateOpen(true);
              return;
            }
            setMenuOpen((value) => !value);
          }}
          className={cn(
            'group flex w-full items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)]/80 text-left transition',
            'hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)]',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/30',
            'disabled:cursor-not-allowed disabled:opacity-60',
            compact ? 'h-11 px-3' : 'px-3 py-2.5',
          )}
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[var(--accent-soft)] to-blue-500/10 text-xs font-semibold text-[var(--accent)] ring-1 ring-[var(--accent-border)]">
            {currentWorkspace
              ? workspaceInitials(currentWorkspace.name)
              : '—'}
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2">
              <span className="truncate text-sm font-medium text-[var(--foreground)]">
                {isLoading
                  ? t.common.loading
                  : (currentWorkspace?.name ?? t.workspace.select)}
              </span>
              {currentWorkspace && myRole && (
                <Badge variant={roleBadgeVariant[myRole]} className="shrink-0">
                  {roleLabel(myRole, t)}
                </Badge>
              )}
            </span>
            {!compact && currentWorkspace && (
              <span className="mt-0.5 flex items-center gap-1.5 text-xs text-[var(--muted-foreground)]">
                <span className="truncate">{currentWorkspace.slug}</span>
                {typeof currentWorkspace._count?.memberships === 'number' && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="shrink-0 whitespace-nowrap">
                      {interpolate(t.workspace.members, {
                        count: String(currentWorkspace._count.memberships),
                      })}
                    </span>
                  </>
                )}
              </span>
            )}
          </span>
          <ChevronDown
            className={cn(
              'h-4 w-4 shrink-0 text-[var(--muted-foreground)] transition group-hover:text-[var(--foreground)]',
              menuOpen && 'rotate-180 text-[var(--accent)]',
            )}
          />
        </button>

        {menuOpen && (
          <div
            id={menuId}
            role="listbox"
            aria-label={t.workspace.select}
            className={cn(
              'absolute z-40 mt-2 w-full overflow-hidden rounded-2xl border border-[var(--border-strong)] bg-[var(--surface-raised)] p-1.5 shadow-[var(--shadow-lg)]',
              compact ? 'min-w-[16rem]' : '',
            )}
          >
            <div className="max-h-56 space-y-0.5 overflow-y-auto">
              {workspaces.map((workspace) => {
                const selected = workspace.id === currentWorkspace?.id;
                return (
                  <button
                    key={workspace.id}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onClick={() => {
                      selectWorkspace(workspace.id);
                      setMenuOpen(false);
                    }}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition',
                      selected
                        ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
                        : 'text-[var(--foreground)] hover:bg-[var(--surface-hover)]',
                    )}
                  >
                    <span
                      className={cn(
                        'grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[11px] font-semibold',
                        selected
                          ? 'bg-[var(--accent-muted)] text-[var(--accent)]'
                          : 'bg-[var(--surface-hover)] text-[var(--muted-foreground)]',
                      )}
                    >
                      {workspaceInitials(workspace.name)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">
                        {workspace.name}
                      </span>
                      <span className="block truncate text-xs text-[var(--muted-foreground)]">
                        {workspace.slug}
                      </span>
                    </span>
                    {selected && (
                      <Check className="h-4 w-4 shrink-0 text-[var(--accent)]" />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="mt-1 border-t border-[var(--border)] pt-1">
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  setCreateOpen(true);
                }}
                className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2.5 text-sm font-medium text-[var(--muted-foreground)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]"
              >
                <span className="grid h-8 w-8 place-items-center rounded-lg border border-dashed border-[var(--border-strong)] text-[var(--muted-foreground)]">
                  <Plus className="h-4 w-4" />
                </span>
                {t.workspace.create}
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-2 space-y-2">
            <p className="text-xs text-[var(--danger)]">{t.workspace.loadFailed}</p>
            <button
              type="button"
              onClick={() => void refetch()}
              className="text-xs font-medium text-[var(--accent)] hover:underline"
            >
              {t.common.tryAgain}
            </button>
          </div>
        )}
      </div>

      <Modal
        open={modalOpen}
        onClose={closeCreate}
        title={t.workspace.createTitle}
        description={t.workspace.createDescription}
        closeLabel={t.common.close}
      >
        <form className="space-y-5" onSubmit={handleCreate}>
          <Input
            id="workspace-create-name"
            name="workspace-name"
            label={t.workspace.name}
            placeholder={t.workspace.namePlaceholder}
            autoComplete="organization"
            minLength={2}
            maxLength={100}
            required
            value={name}
            onChange={(event) => changeName(event.target.value)}
          />
          <Input
            id="workspace-create-slug"
            name="workspace-slug"
            label={t.workspace.slug}
            placeholder={t.workspace.slugPlaceholder}
            hint={t.workspace.slugHint}
            autoComplete="off"
            minLength={3}
            maxLength={50}
            pattern="[a-z0-9-]+"
            required
            value={slug}
            onChange={(event) => {
              setSlugTouched(true);
              setSlug(event.target.value.toLowerCase());
            }}
          />
          <div className="flex justify-end gap-3">
            {hasWorkspaces && (
              <Button type="button" variant="secondary" onClick={closeCreate}>
                {t.common.cancel}
              </Button>
            )}
            <Button type="submit" disabled={isCreating}>
              {isCreating ? t.workspace.creating : t.workspace.create}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
