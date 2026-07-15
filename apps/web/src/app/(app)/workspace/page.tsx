'use client';

import { Building2 } from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { PageLoading } from '@/components/ui/page-loading';
import { Tabs } from '@/components/ui/tabs';
import { useWorkspace } from '@/contexts/workspace-context';
import { useLanguage } from '@/i18n/language-provider';
import {
  ApiKeySettings,
  DomainSettings,
  MemberSettings,
  WorkspaceSettings,
} from './_components/workspace-panels';

export default function WorkspacePage() {
  const { t } = useLanguage();
  const { currentWorkspace, isLoading } = useWorkspace();

  if (isLoading) {
    return <PageLoading showChart={false} showPanels />;
  }

  if (!currentWorkspace) {
    return (
      <AppShell>
        <PageHeader
          badge={t.workspace.label}
          title={t.workspace.pageTitle}
          description={t.workspace.pageDescription}
        />
        <div className="mt-8">
          <EmptyState
            icon={Building2}
            title={t.workspace.createTitle}
            description={t.workspace.createDescription}
          />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageHeader
        badge={t.workspace.label}
        title={t.workspace.pageTitle}
        description={t.workspace.pageDescription}
      />
      <div className="mt-8">
        <Tabs
          tabs={[
            {
              id: 'general',
              label: t.workspace.generalTab,
              content: (
                <WorkspaceSettings key={currentWorkspace.id} />
              ),
            },
            {
              id: 'members',
              label: t.settings.membersTab,
              content: (
                <MemberSettings key={`members-${currentWorkspace.id}`} />
              ),
            },
            {
              id: 'domains',
              label: t.settings.domainsTab,
              content: <DomainSettings key={`domains-${currentWorkspace.id}`} />,
            },
            {
              id: 'api-keys',
              label: t.settings.apiKeysTab,
              content: (
                <ApiKeySettings key={`api-keys-${currentWorkspace.id}`} />
              ),
            },
          ]}
        />
      </div>
    </AppShell>
  );
}
