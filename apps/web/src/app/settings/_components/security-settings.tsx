'use client';

import type { AuthSession } from '@urlytics/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FormEvent, useState } from 'react';
import { KeyRound, MonitorSmartphone, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader } from '@/components/ui/card';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { ErrorBanner } from '@/components/ui/error-banner';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import {
  CURRENT_USER_QUERY_KEY,
  useCurrentUser,
} from '@/hooks/use-current-user';
import { useLanguage } from '@/i18n/language-provider';
import { formatDate } from '@/lib/format';
import { logout } from '@/lib/auth';
import { authService } from '@/services/auth';

const SESSIONS_QUERY_KEY = ['auth-sessions'];

export function SecuritySettings() {
  const { t, locale } = useLanguage();
  const { user, query: userQuery } = useCurrentUser();
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const queryClient = useQueryClient();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  const [setupSecret, setSetupSecret] = useState<string | null>(null);
  const [setupQr, setSetupQr] = useState<string | null>(null);
  const [enableCode, setEnableCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const [settingUp2fa, setSettingUp2fa] = useState(false);
  const [enabling2fa, setEnabling2fa] = useState(false);
  const [disablePassword, setDisablePassword] = useState('');
  const [disableCode, setDisableCode] = useState('');
  const [disabling2fa, setDisabling2fa] = useState(false);

  const sessionsQuery = useQuery({
    queryKey: SESSIONS_QUERY_KEY,
    queryFn: authService.listSessions,
  });

  async function handleChangePassword(event: FormEvent) {
    event.preventDefault();
    if (newPassword !== confirmPassword) {
      showToast(t.settings.passwordMismatch, 'error');
      return;
    }
    setChangingPassword(true);
    try {
      await authService.changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      showToast(t.settings.passwordChanged);
      void sessionsQuery.refetch();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : t.settings.passwordChangeFailed,
        'error',
      );
    } finally {
      setChangingPassword(false);
    }
  }

  async function handleSetupTwoFactor() {
    setSettingUp2fa(true);
    setBackupCodes(null);
    try {
      const setup = await authService.setupTwoFactor();
      setSetupSecret(setup.secret);
      setSetupQr(setup.qrCodeDataUrl);
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : t.settings.twoFactorSetupFailed,
        'error',
      );
    } finally {
      setSettingUp2fa(false);
    }
  }

  async function handleEnableTwoFactor(event: FormEvent) {
    event.preventDefault();
    setEnabling2fa(true);
    try {
      const result = await authService.enableTwoFactor(enableCode.trim());
      setBackupCodes(result.backupCodes);
      setSetupSecret(null);
      setSetupQr(null);
      setEnableCode('');
      queryClient.setQueryData(CURRENT_USER_QUERY_KEY, (current) =>
        current ? { ...current, totpEnabled: true } : current,
      );
      showToast(t.settings.twoFactorEnabled);
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : t.settings.twoFactorEnableFailed,
        'error',
      );
    } finally {
      setEnabling2fa(false);
    }
  }

  async function handleDisableTwoFactor(event: FormEvent) {
    event.preventDefault();
    const ok = await confirm({
      title: t.settings.twoFactorDisableTitle,
      description: t.settings.twoFactorDisableDescription,
      confirmLabel: t.settings.twoFactorDisable,
    });
    if (!ok) return;

    setDisabling2fa(true);
    try {
      await authService.disableTwoFactor(disablePassword, disableCode.trim());
      setDisablePassword('');
      setDisableCode('');
      setBackupCodes(null);
      queryClient.setQueryData(CURRENT_USER_QUERY_KEY, (current) =>
        current ? { ...current, totpEnabled: false } : current,
      );
      showToast(t.settings.twoFactorDisabled);
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : t.settings.twoFactorDisableFailed,
        'error',
      );
    } finally {
      setDisabling2fa(false);
    }
  }

  async function handleRevokeSession(session: AuthSession) {
    try {
      const result = await authService.revokeSession(session.id);
      if (result.revokedCurrent) {
        logout('/login?expired=1');
        return;
      }
      showToast(t.settings.sessionRevoked);
      void sessionsQuery.refetch();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : t.settings.sessionRevokeFailed,
        'error',
      );
    }
  }

  async function handleRevokeOthers() {
    const ok = await confirm({
      title: t.settings.revokeOtherSessionsTitle,
      description: t.settings.revokeOtherSessionsDescription,
      confirmLabel: t.settings.revokeOtherSessions,
    });
    if (!ok) return;
    try {
      await authService.revokeOtherSessions();
      showToast(t.settings.otherSessionsRevoked);
      void sessionsQuery.refetch();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : t.settings.sessionRevokeFailed,
        'error',
      );
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader
          title={t.settings.changePasswordTitle}
          description={t.settings.changePasswordDescription}
        />
        <form className="mt-6 space-y-4" onSubmit={handleChangePassword}>
          <Input
            type="password"
            label={t.settings.currentPassword}
            autoComplete="current-password"
            required
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
          />
          <Input
            type="password"
            label={t.settings.newPassword}
            autoComplete="new-password"
            required
            hint={t.auth.passwordHint}
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
          />
          <Input
            type="password"
            label={t.settings.confirmPassword}
            autoComplete="new-password"
            required
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
          />
          <Button type="submit" disabled={changingPassword}>
            {changingPassword ? t.common.saving : t.settings.changePassword}
          </Button>
        </form>
      </Card>

      <Card>
        <CardHeader
          title={t.settings.twoFactorTitle}
          description={t.settings.twoFactorDescription}
        />
        <div className="mt-6 space-y-4">
          <div className="flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-raised)] p-4">
            <ShieldCheck className="h-5 w-5 text-[var(--accent)]" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{t.settings.twoFactorStatus}</p>
              <Badge variant={user?.totpEnabled ? 'success' : 'default'} className="mt-1">
                {user?.totpEnabled
                  ? t.settings.twoFactorOn
                  : t.settings.twoFactorOff}
              </Badge>
            </div>
          </div>

          {!user?.totpEnabled && !setupQr && (
            <Button onClick={() => void handleSetupTwoFactor()} disabled={settingUp2fa}>
              {settingUp2fa ? t.common.processing : t.settings.twoFactorSetup}
            </Button>
          )}

          {setupQr && setupSecret && (
            <form className="space-y-4" onSubmit={handleEnableTwoFactor}>
              <img
                src={setupQr}
                alt={t.settings.twoFactorQrAlt}
                className="h-44 w-44 rounded-lg border border-[var(--border)] bg-white p-2"
              />
              <p className="break-all text-xs text-[var(--muted-foreground)]">
                {t.settings.twoFactorManualSecret}: {setupSecret}
              </p>
              <Input
                label={t.settings.twoFactorCode}
                value={enableCode}
                onChange={(event) => setEnableCode(event.target.value)}
                required
                autoComplete="one-time-code"
              />
              <Button type="submit" disabled={enabling2fa}>
                {enabling2fa ? t.common.processing : t.settings.twoFactorEnable}
              </Button>
            </form>
          )}

          {backupCodes && (
            <div className="rounded-[var(--radius-md)] border border-[var(--warning-border)] bg-[var(--warning-muted)] p-4">
              <p className="text-sm font-medium text-[var(--warning)]">
                {t.settings.twoFactorBackupTitle}
              </p>
              <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                {t.settings.twoFactorBackupDescription}
              </p>
              <ul className="mt-3 grid grid-cols-2 gap-2 font-mono text-sm">
                {backupCodes.map((code) => (
                  <li key={code}>{code}</li>
                ))}
              </ul>
            </div>
          )}

          {user?.totpEnabled && (
            <form className="space-y-4" onSubmit={handleDisableTwoFactor}>
              <Input
                type="password"
                label={t.settings.currentPassword}
                value={disablePassword}
                onChange={(event) => setDisablePassword(event.target.value)}
                required
              />
              <Input
                label={t.settings.twoFactorCode}
                value={disableCode}
                onChange={(event) => setDisableCode(event.target.value)}
                required
                hint={t.settings.twoFactorDisableHint}
              />
              <Button type="submit" variant="danger" disabled={disabling2fa}>
                {disabling2fa ? t.common.processing : t.settings.twoFactorDisable}
              </Button>
            </form>
          )}
        </div>
      </Card>

      <Card className="lg:col-span-2">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <CardHeader
            title={t.settings.sessionsTitle}
            description={t.settings.sessionsDescription}
          />
          <Button
            type="button"
            variant="secondary"
            onClick={() => void handleRevokeOthers()}
            disabled={!sessionsQuery.data?.some((session) => !session.current)}
          >
            {t.settings.revokeOtherSessions}
          </Button>
        </div>

        {sessionsQuery.isLoading && (
          <div className="mt-6 space-y-3">
            <Skeleton height={64} />
            <Skeleton height={64} />
          </div>
        )}

        {sessionsQuery.error && (
          <div className="mt-6">
            <ErrorBanner
              message={t.settings.sessionsLoadFailed}
              onRetry={() => void sessionsQuery.refetch()}
              retryLabel={t.common.tryAgain}
              isRetrying={sessionsQuery.isFetching}
            />
          </div>
        )}

        {sessionsQuery.data && (
          <ul className="mt-6 space-y-3">
            {sessionsQuery.data.map((session) => (
              <li
                key={session.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-raised)] p-4"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <MonitorSmartphone className="mt-0.5 h-5 w-5 text-[var(--accent)]" />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-medium">
                        {session.userAgent || t.settings.sessionUnknownDevice}
                      </p>
                      {session.current && (
                        <Badge variant="accent">{t.settings.sessionCurrent}</Badge>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                      {t.settings.sessionCreated}:{' '}
                      {formatDate(session.createdAt, locale)}
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => void handleRevokeSession(session)}
                >
                  {t.settings.sessionRevoke}
                </Button>
              </li>
            ))}
            {sessionsQuery.data.length === 0 && (
              <li className="text-sm text-[var(--muted-foreground)]">
                {t.settings.noSessions}
              </li>
            )}
          </ul>
        )}

        {!user && userQuery.isError && (
          <div className="mt-6 flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
            <KeyRound className="h-4 w-4" />
            {t.settings.profileLoadFailed}
          </div>
        )}
      </Card>
    </div>
  );
}
