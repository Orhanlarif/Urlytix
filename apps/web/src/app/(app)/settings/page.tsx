'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Globe2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { SecuritySettings } from './_components/security-settings';
import { AppShell } from '@/components/layout/app-shell';
import { Button } from '@/components/ui/button';
import { Card, CardHeader } from '@/components/ui/card';
import { ErrorBanner } from '@/components/ui/error-banner';
import { Input } from '@/components/ui/input';
import { LanguageToggle } from '@/components/ui/language-toggle';
import { PageHeader } from '@/components/ui/page-header';
import { MenuSelect } from '@/components/ui/menu-select';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/toast';
import {
  CURRENT_USER_QUERY_KEY,
  useCurrentUser,
} from '@/hooks/use-current-user';
import { useLanguage } from '@/i18n/language-provider';
import { authService } from '@/services/auth';

export default function SettingsPage() {
  const { t } = useLanguage();

  return (
    <AppShell>
      <PageHeader
        badge={t.settings.badge}
        title={t.settings.title}
        description={t.settings.description}
      />
      <div className="mt-8">
        <Tabs
          tabs={[
            {
              id: 'account',
              label: t.settings.accountTab,
              content: <AccountSettings />,
            },
            {
              id: 'security',
              label: t.settings.securityTab,
              content: <SecuritySettings />,
            },
          ]}
        />
      </div>
    </AppShell>
  );
}

function AccountSettings() {
  const { t, locale } = useLanguage();
  const { user, isLoading, error, query } = useCurrentUser();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [timezone, setTimezone] = useState('UTC');
  const [saving, setSaving] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (!user || hydrated) return;
    setName(user.name ?? '');
    setEmail(user.email);
    setTimezone(user.timezone || 'UTC');
    setHydrated(true);
  }, [user, hydrated]);

  useEffect(() => {
    setHydrated(false);
  }, [user?.id]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      const updated = await authService.updateProfile({
        name: name.trim() || undefined,
        email: email.trim(),
        timezone,
        locale,
      });
      queryClient.setQueryData(CURRENT_USER_QUERY_KEY, (current) =>
        current ? { ...current, ...updated } : updated,
      );
      showToast(t.settings.profileSaved);
    } catch {
      showToast(t.settings.profileSaveFailed, 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleLocaleChange(next: 'en' | 'tr') {
    try {
      const updated = await authService.updateProfile({ locale: next });
      queryClient.setQueryData(CURRENT_USER_QUERY_KEY, (current) =>
        current ? { ...current, ...updated } : updated,
      );
    } catch {
      // Local language still updates even if profile sync fails.
    }
  }

  const dirty =
    Boolean(user) &&
    (name.trim() !== (user?.name ?? '') ||
      email.trim() !== user?.email ||
      timezone !== (user?.timezone || 'UTC'));

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader
          title={t.settings.profileTitle}
          description={t.settings.profileDescription}
        />
        {isLoading && (
          <div className="mt-6 space-y-5" aria-hidden="true">
            <div className="space-y-2">
              <Skeleton size="sm" width="30%" />
              <Skeleton height={44} />
            </div>
            <div className="space-y-2">
              <Skeleton size="sm" width="30%" />
              <Skeleton height={44} />
            </div>
            <div className="space-y-2">
              <Skeleton size="sm" width="40%" />
              <Skeleton height={44} />
            </div>
            <Skeleton width={120} height={44} />
          </div>
        )}
        {error && (
          <div className="mt-6">
            <ErrorBanner
              message={t.settings.profileLoadFailed}
              onRetry={() => void query.refetch()}
              retryLabel={t.common.tryAgain}
              isRetrying={query.isFetching}
            />
          </div>
        )}
        {user && (
          <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
            <Input
              name="profile-name"
              label={t.settings.profileName}
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={100}
            />
            <Input
              name="profile-email"
              type="email"
              label={t.settings.profileEmail}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
            <MenuSelect
              label={t.settings.timezone}
              hint={t.settings.timezoneHint}
              value={timezone}
              onChange={setTimezone}
              options={TIMEZONE_OPTIONS.map((option) => ({
                value: option,
                label: option,
              }))}
            />
            <Button type="submit" disabled={saving || !dirty || query.isFetching}>
              {saving ? t.common.saving : t.common.save}
            </Button>
          </form>
        )}
      </Card>

      <div className="space-y-6">
        <Card>
          <CardHeader
            title={t.settings.language}
            description={t.settings.languageDescription}
          />
          <div className="mt-6 flex items-center justify-between rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-raised)] p-4">
            <div className="flex items-center gap-3">
              <Globe2 className="h-5 w-5 text-[var(--accent)]" />
              <span className="text-sm text-[var(--foreground)]">
                {t.settings.interfaceLanguage}
              </span>
            </div>
            <LanguageToggle size="sm" onLocaleChange={handleLocaleChange} />
          </div>
        </Card>
      </div>
    </div>
  );
}

const TIMEZONE_OPTIONS = [
  'UTC',
  'Europe/Istanbul',
  'Europe/London',
  'Europe/Berlin',
  'America/New_York',
  'America/Los_Angeles',
  'Asia/Dubai',
  'Asia/Tokyo',
];
