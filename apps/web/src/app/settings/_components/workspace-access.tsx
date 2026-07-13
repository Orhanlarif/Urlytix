'use client';

import type { WorkspaceMembership } from '@urlytics/shared';
import { useQuery } from '@tanstack/react-query';
import { ShieldAlert } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useWorkspace } from '@/contexts/workspace-context';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useLanguage } from '@/i18n/language-provider';
import { workspacesService } from '@/services/workspaces';

export function useWorkspaceAccess() {
  const { currentWorkspace } = useWorkspace();
  const { user } = useCurrentUser();
  const queryKey = ['workspace-members', currentWorkspace?.id];
  const query = useQuery({
    queryKey,
    queryFn: async () => {
      const workspace = await workspacesService.get(currentWorkspace!.id);
      return workspace.memberships;
    },
    enabled: Boolean(currentWorkspace),
  });
  const membership = query.data?.find((item) => item.userId === user?.id);

  return {
    canManage:
      membership?.role === 'OWNER' || membership?.role === 'ADMIN',
    isAccessLoading: query.isLoading,
    memberships: query.data as WorkspaceMembership[] | undefined,
    role: membership?.role,
    queryKey,
  };
}

export function WorkspaceReadOnlyNotice() {
  const { t } = useLanguage();

  return (
    <div
      role="note"
      className="flex gap-3 rounded-[var(--radius-md)] border border-[var(--warning-border)] bg-[var(--warning-muted)] px-4 py-3 text-sm text-amber-100"
    >
      <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-[var(--warning)]" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium">{t.settings.readOnlyTitle}</p>
          <Badge variant="warning" dot>
            {t.settings.readOnlyRoleBadge}
          </Badge>
        </div>
        <p className="mt-1 leading-5 text-amber-100/70">
          {t.settings.readOnlyDescription}
        </p>
      </div>
    </div>
  );
}
