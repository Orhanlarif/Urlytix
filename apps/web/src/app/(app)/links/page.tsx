'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  ChevronDown,
  Copy,
  Filter,
  Link2,
  MousePointerClick,
  RefreshCw,
  Search,
  SlidersHorizontal,
  TrendingUp,
  Zap,
} from 'lucide-react';
import type { PaginationMeta } from '@urlytix/shared';
import { useQueryClient } from '@tanstack/react-query';
import { AppShell } from '@/components/layout/app-shell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader } from '@/components/ui/card';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { DataTable } from '@/components/ui/data-table';
import { DropdownItem, DropdownMenu } from '@/components/ui/dropdown-menu';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorBanner } from '@/components/ui/error-banner';
import { Input } from '@/components/ui/input';
import { DateTimePicker } from '@/components/ui/datetime-picker';
import { MetricCard } from '@/components/ui/metric-card';
import { PageHeader } from '@/components/ui/page-header';
import { PageLoading } from '@/components/ui/page-loading';
import { QrCustomizeModal } from '@/components/qr/qr-customize-modal';
import { MenuSelect } from '@/components/ui/menu-select';
import { useToast } from '@/components/ui/toast';
import { useWorkspace } from '@/contexts/workspace-context';
import {
  useWorkspaceLinks,
  useWorkspaceOverview,
  workspaceQueryKeys,
} from '@/hooks/use-workspace-data';
import { interpolate } from '@/i18n';
import { useLanguage } from '@/i18n/language-provider';
import { formatDate, formatDateTime, truncateText } from '@/lib/format';
import {
  canToggleLinkStatus,
  getLinkStatusBadgeVariant,
  getLinkStatusLabel,
  isLinkOperational,
} from '@/lib/link-status';
import { cn } from '@/lib/utils';
import { linksService } from '@/services/links';
import type { LinkItem, LinkStatus } from '@/types/links';

const PAGE_SIZE = 10;
const SEARCH_DEBOUNCE_MS = 300;

const emptyMeta: PaginationMeta = {
  page: 1,
  pageSize: PAGE_SIZE,
  total: 0,
  totalPages: 0,
};

export default function LinksPage() {
  const router = useRouter();
  const { t, locale } = useLanguage();
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const { currentWorkspace, isLoading: workspaceLoading } = useWorkspace();
  const queryClient = useQueryClient();

  const [originalUrl, setOriginalUrl] = useState('');
  const [title, setTitle] = useState('');
  const [customAlias, setCustomAlias] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [password, setPassword] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [createdLink, setCreatedLink] = useState<LinkItem | null>(null);
  const [qrModalLink, setQrModalLink] = useState<LinkItem | null>(null);
  const [error, setError] = useState('');
  const [copiedShortCode, setCopiedShortCode] = useState<string | null>(null);
  const [mutatingLinkId, setMutatingLinkId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | LinkStatus>('ALL');
  const [page, setPage] = useState(1);
  const listParams = useMemo(
    () => ({
      page,
      limit: PAGE_SIZE,
      search: debouncedSearch || undefined,
      status: statusFilter === 'ALL' ? undefined : statusFilter,
    }),
    [debouncedSearch, page, statusFilter],
  );
  const linksQuery = useWorkspaceLinks(currentWorkspace?.id, listParams);
  const overviewQuery = useWorkspaceOverview(currentWorkspace?.id, { days: 14 });
  const links = linksQuery.data?.data ?? [];
  const meta = linksQuery.data?.meta ?? emptyMeta;
  const overview = overviewQuery.data;
  const isListLoading = linksQuery.isFetching;
  const queryError = linksQuery.error?.message ?? '';

  async function refreshWorkspaceData() {
    if (!currentWorkspace) return;
    await queryClient.invalidateQueries({
      queryKey: workspaceQueryKeys.workspace(currentWorkspace.id),
    });
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    if (window.location.hash !== '#create-link') return;
    window.requestAnimationFrame(() => {
      document
        .getElementById('create-link')
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      document.getElementById('create-link-url')?.focus();
    });
  }, []);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter, currentWorkspace?.id]);

  async function handleCreateLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!currentWorkspace) return;

    setError('');
    setIsCreating(true);

    try {
      const response = await linksService.create(currentWorkspace.id, {
        originalUrl,
        title: title.trim() ? title.trim() : undefined,
        customAlias: customAlias.trim() ? customAlias.trim() : undefined,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
        password: password.trim() ? password.trim() : undefined,
      });

      setCreatedLink(response.link);
      setOriginalUrl('');
      setTitle('');
      setCustomAlias('');
      setExpiresAt('');
      setPassword('');
      setShowAdvanced(false);
      setSearchInput('');
      setDebouncedSearch('');
      setStatusFilter('ALL');
      setPage(1);
      try {
        await navigator.clipboard.writeText(response.link.shortUrl);
        setCopiedShortCode(response.link.shortCode);
        window.setTimeout(() => setCopiedShortCode(null), 2000);
        showToast(t.links.linkCopied);
      } catch {
        showToast(t.links.created);
      }
      await refreshWorkspaceData();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.links.createFailed);
    } finally {
      setIsCreating(false);
    }
  }

  async function handleToggleStatus(link: LinkItem) {
    if (!canToggleLinkStatus(link.status)) {
      setError(t.links.expiredToggleError);
      return;
    }

    const nextStatus: LinkStatus =
      link.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE';

    if (nextStatus === 'DISABLED') {
      const confirmed = await confirm({
        title: t.links.deactivate,
        description: interpolate(t.links.deactivateConfirm, {
          name: link.title ?? link.shortCode,
        }),
        confirmLabel: t.links.deactivate,
        variant: 'danger',
      });
      if (!confirmed) return;
    }

    setError('');
    setMutatingLinkId(link.id);

    try {
      await linksService.updateStatus(link.id, nextStatus);
      await refreshWorkspaceData();
      showToast(
        nextStatus === 'ACTIVE' ? t.links.activated : t.links.deactivated,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : t.links.toggleFailed);
    } finally {
      setMutatingLinkId(null);
    }
  }

  async function handleDeleteLink(link: LinkItem) {
    const confirmed = await confirm({
      title: t.common.delete,
      description: interpolate(t.links.deleteConfirm, {
        name: link.title ?? link.shortCode,
      }),
      confirmLabel: t.common.delete,
      variant: 'danger',
    });

    if (!confirmed) return;

    setError('');
    setMutatingLinkId(link.id);

    try {
      await linksService.remove(link.id);
      showToast(t.links.deleted);

      if (links.length === 1 && page > 1) {
        setPage((current) => current - 1);
      }
      await refreshWorkspaceData();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.links.deleteFailed);
    } finally {
      setMutatingLinkId(null);
    }
  }

  async function handleCopy(link: LinkItem) {
    try {
      await navigator.clipboard.writeText(link.shortUrl);
      setCopiedShortCode(link.shortCode);
      window.setTimeout(() => setCopiedShortCode(null), 1500);
      showToast(t.common.copied);
    } catch {
      setError(t.links.copyFailed);
    }
  }

  function handleOpenQr(link: LinkItem) {
    setError('');
    setQrModalLink(link);
  }

  function handleCloseQr() {
    setQrModalLink(null);
  }

  function renderLinkActions(link: LinkItem, isMutating: boolean) {
    const isActive = isLinkOperational(link.status);
    const isExpired = link.status === 'EXPIRED';
    const canToggle = canToggleLinkStatus(link.status);
    const copied = copiedShortCode === link.shortCode;

    return (
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => void handleCopy(link)}
        >
          {copied ? t.common.copied : t.common.copy}
        </Button>
        <Link href={`/links/${link.id}`}>
          <Button size="sm">{t.common.manage}</Button>
        </Link>
        <DropdownMenu label={t.common.actions}>
          <DropdownItem onClick={() => handleOpenQr(link)}>QR</DropdownItem>
          {isActive && (
            <DropdownItem
              onClick={() =>
                window.open(link.shortUrl, '_blank', 'noopener,noreferrer')
              }
            >
              {t.common.testLink}
            </DropdownItem>
          )}
          {isExpired && (
            <DropdownItem
              onClick={() => router.push(`/links/${link.id}?tab=settings`)}
            >
              {t.common.extendExpiry}
            </DropdownItem>
          )}
          {canToggle && (
            <DropdownItem onClick={() => handleToggleStatus(link)}>
              {isMutating
                ? t.common.processing
                : isActive
                  ? t.links.deactivate
                  : t.links.activate}
            </DropdownItem>
          )}
          <DropdownItem danger onClick={() => handleDeleteLink(link)}>
            {t.common.delete}
          </DropdownItem>
        </DropdownMenu>
      </div>
    );
  }

  function renderLinkIdentity(link: LinkItem) {
    return (
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/links/${link.id}`}
            className="min-w-0 truncate font-medium text-[var(--foreground)] hover:text-[var(--accent)]"
          >
            {link.title ?? link.shortCode}
          </Link>
          {link.hasPassword && (
            <Badge variant="warning">{t.links.passwordProtected}</Badge>
          )}
        </div>
        <div className="mt-1.5 flex min-w-0 items-center gap-1.5">
          <span className="min-w-0 truncate text-sm text-[var(--accent)]">
            {link.shortUrl}
          </span>
          <button
            type="button"
            onClick={() => handleCopy(link)}
            aria-label={t.common.copy}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-[var(--muted-foreground)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]"
          >
            <Copy className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-1 truncate text-xs text-[var(--muted-foreground)]">
          {truncateText(link.originalUrl, 80)}
        </p>
        <p className="mt-1.5 text-xs text-[var(--muted-foreground)]/80">
          {t.links.createdAt}: {formatDate(link.createdAt, locale)}
          {link.expiresAt && (
            <>
              {' '}
              · {t.links.expires}: {formatDateTime(link.expiresAt, locale)}
            </>
          )}
        </p>
      </div>
    );
  }

  if (workspaceLoading) {
    return <PageLoading showChart={false} showPanels />;
  }

  if (!currentWorkspace) {
    return (
      <AppShell>
        <PageHeader
          badge={t.links.badge}
          title={t.links.title}
          description={t.links.description}
        />
        <div className="mt-8">
          <EmptyState
            icon={Link2}
            title={t.workspace.createTitle}
            description={t.workspace.createDescription}
          />
        </div>
      </AppShell>
    );
  }

  if (linksQuery.isLoading && !linksQuery.data) {
    return <PageLoading showChart={false} showPanels />;
  }

  const hasFilters = Boolean(debouncedSearch) || statusFilter !== 'ALL';
  const pageCount = Math.max(1, meta.totalPages || 1);

  return (
    <AppShell>
      <PageHeader
        badge={t.links.badge}
        title={t.links.title}
        description={t.links.description}
        action={
          <Button
            variant="secondary"
            size="sm"
            className="min-h-10 gap-2 px-3 sm:min-h-0"
            onClick={() => {
              void refreshWorkspaceData();
            }}
            disabled={!currentWorkspace || isListLoading}
            aria-label={t.links.refresh}
          >
            <RefreshCw
              className={`h-4 w-4 shrink-0 ${isListLoading ? 'animate-spin' : ''}`}
            />
            <span className="hidden sm:inline">{t.links.refresh}</span>
            <span className="sm:hidden">{t.common.refresh}</span>
          </Button>
        }
      />

      <div className="mt-6">
        <ErrorBanner
          message={error || queryError}
          onRetry={queryError ? () => void refreshWorkspaceData() : undefined}
          retryLabel={t.common.tryAgain}
          isRetrying={isListLoading}
        />
      </div>

      {createdLink && (
        <Card className="mt-6 border-[var(--success-border)] bg-[var(--success-muted)]">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div className="min-w-0">
              <p className="font-semibold text-[var(--success)]">
                {t.links.created}
              </p>
              <p className="mt-2 break-all text-sm text-[var(--accent)]">
                {createdLink.shortUrl}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                onClick={() => void handleCopy(createdLink)}
              >
                {copiedShortCode === createdLink.shortCode
                  ? t.common.copied
                  : t.common.copyLink}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleOpenQr(createdLink)}
              >
                QR
              </Button>
              <a href={createdLink.shortUrl} target="_blank" rel="noreferrer">
                <Button size="sm" variant="outline">
                  {t.common.testLink}
                </Button>
              </a>
              <Link href={`/links/${createdLink.id}`}>
                <Button size="sm" variant="outline">
                  {t.common.manage}
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      )}

      {/* Quick create hero */}
      <Card id="create-link" className="mt-6 scroll-mt-24">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[var(--accent-border)] bg-[var(--accent-soft)]">
            <Zap className="h-5 w-5 text-[var(--accent)]" />
          </div>
          <div>
            <p className="text-eyebrow">{t.links.createTitle}</p>
            <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
              {t.links.createDesc}
            </p>
          </div>
        </div>

        <form onSubmit={handleCreateLink} className="mt-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <Input
                id="create-link-url"
                label={t.links.targetUrl}
                value={originalUrl}
                onChange={(event) => setOriginalUrl(event.target.value)}
                placeholder="https://example.com"
                type="url"
                required
              />
            </div>
            <Button
              type="submit"
              size="lg"
              disabled={isCreating}
              className="sm:w-auto"
            >
              {isCreating ? t.links.creating : t.links.createButton}
            </Button>
          </div>

          <button
            type="button"
            onClick={() => setShowAdvanced((value) => !value)}
            aria-expanded={showAdvanced}
            className="mt-4 flex items-center gap-2 rounded-lg px-1 py-1 text-sm font-medium text-[var(--muted-foreground)] transition hover:text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--accent)]/40"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            {t.links.advancedOptions}
            <ChevronDown
              className={cn(
                'h-3.5 w-3.5 transition-transform duration-200',
                showAdvanced && 'rotate-180',
              )}
            />
          </button>

          <div
            className={cn(
              'grid gap-4 overflow-hidden transition-all duration-200 sm:grid-cols-2',
              showAdvanced
                ? 'mt-4 max-h-[999px] opacity-100'
                : 'max-h-0 opacity-0',
            )}
          >
            <Input
              label={t.links.linkTitle}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={t.links.titlePlaceholder}
            />

            <div>
              <label className="text-sm text-[var(--muted)]">
                {t.links.customAlias}
                <span className="ml-2 text-[var(--muted-foreground)]">
                  {t.common.optional}
                </span>
              </label>
              <div className="mt-2 flex overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] transition focus-within:border-[var(--accent)] focus-within:ring-2 focus-within:ring-inset focus-within:ring-[var(--accent)]/30">
                <span className="border-r border-[var(--border)] px-4 py-3 text-sm text-[var(--muted-foreground)]">
                  /
                </span>
                <input
                  value={customAlias}
                  onChange={(event) => setCustomAlias(event.target.value)}
                  className="w-full bg-transparent px-4 py-3 text-sm outline-none focus-visible:outline-none"
                  placeholder={t.links.aliasPlaceholder}
                />
              </div>
              <p className="mt-2 text-xs text-[var(--muted-foreground)]">
                {t.links.aliasHint}
              </p>
            </div>

            <DateTimePicker
              label={`${t.links.expiresAt} (${t.common.optional})`}
              value={expiresAt}
              onChange={setExpiresAt}
              hint={t.links.expiresHint}
            />

            <Input
              label={t.links.passwordOptional}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              autoComplete="new-password"
              minLength={4}
              maxLength={72}
              placeholder={t.links.passwordPlaceholder}
              hint={t.links.passwordHint}
            />
          </div>
        </form>
      </Card>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <MetricCard
          title={t.links.totalLinks}
          value={overview?.totalLinks ?? 0}
          description={t.links.totalLinksDesc}
          icon={Link2}
        />
        <MetricCard
          title={t.dashboard.clicksToday}
          value={overview?.clicksToday ?? 0}
          description={t.dashboard.clicksTodayDesc}
          icon={TrendingUp}
        />
        <MetricCard
          title={t.links.totalClicks}
          value={overview?.totalClicks ?? 0}
          description={t.links.totalClicksDesc}
          icon={MousePointerClick}
        />
      </div>

      {/* Filter bar */}
      <div className="mt-8 flex flex-col gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:flex-row sm:items-center">
        <div className="flex shrink-0 items-center gap-2 text-sm font-medium text-[var(--muted-foreground)]">
          <Filter className="h-4 w-4" />
          {t.links.filtersLabel}
        </div>
        <div className="grid flex-1 grid-cols-1 items-center gap-3 sm:grid-cols-[minmax(0,1fr)_13.5rem]">
          <div className="relative min-w-0">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]"
            />
            <Input
              aria-label={t.common.search}
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder={t.common.search}
              className="pl-10"
            />
          </div>
          <MenuSelect
            aria-label={t.common.status}
            value={statusFilter}
            onChange={setStatusFilter}
            align="right"
            className="w-full"
            options={[
              {
                value: 'ALL',
                label: t.common.allStatuses,
                description: t.status.allDescription,
                tone: 'accent',
              },
              {
                value: 'ACTIVE',
                label: t.status.active,
                description: t.status.activeDescription,
                tone: 'success',
              },
              {
                value: 'DISABLED',
                label: t.status.disabled,
                description: t.status.disabledDescription,
                tone: 'warning',
              },
              {
                value: 'EXPIRED',
                label: t.status.expired,
                description: t.status.expiredDescription,
                tone: 'danger',
              },
            ]}
          />
        </div>
      </div>

      <Card className="mt-4">
        <CardHeader title={t.links.listTitle} description={t.links.listDesc} />

        <div
          className={`mt-6 transition-opacity ${isListLoading ? 'opacity-60' : 'opacity-100'}`}
        >
          {links.length === 0 ? (
            <EmptyState
              icon={Link2}
              title={hasFilters ? t.common.noResults : t.links.noLinks}
              description={
                hasFilters ? t.common.adjustFilters : t.links.noLinksDesc
              }
              action={
                !hasFilters ? (
                  <Button
                    onClick={() => {
                      document
                        .getElementById('create-link-url')
                        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      document.getElementById('create-link-url')?.focus();
                    }}
                  >
                    {t.links.createFirstCta}
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <>
              <div className="hidden md:block">
                <DataTable
                  headings={[
                    t.links.linkColumn,
                    t.common.status,
                    t.links.clicksColumn,
                    t.common.actions,
                  ]}
                  zebra
                >
                  {links.map((link) => {
                    const isMutating = mutatingLinkId === link.id;

                    return (
                      <tr key={link.id}>
                        <td className="max-w-md px-4 py-4 align-top">
                          {renderLinkIdentity(link)}
                        </td>
                        <td className="px-4 py-4 align-top">
                          <Badge
                            variant={getLinkStatusBadgeVariant(link.status)}
                            dot
                          >
                            {getLinkStatusLabel(link.status, t)}
                          </Badge>
                        </td>
                        <td className="px-4 py-4 align-top text-[var(--foreground)]">
                          {link.totalClicks}
                        </td>
                        <td className="px-4 py-4 align-top">
                          {renderLinkActions(link, isMutating)}
                        </td>
                      </tr>
                    );
                  })}
                </DataTable>
              </div>

              <div className="space-y-3 md:hidden">
                {links.map((link) => {
                  const isMutating = mutatingLinkId === link.id;

                  return (
                    <div
                      key={link.id}
                      className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4"
                    >
                      {renderLinkIdentity(link)}

                      <div className="mt-4 flex items-center justify-between gap-3 border-t border-[var(--border)] pt-4">
                        <div className="flex items-center gap-3">
                          <Badge
                            variant={getLinkStatusBadgeVariant(link.status)}
                            dot
                          >
                            {getLinkStatusLabel(link.status, t)}
                          </Badge>
                          <span className="text-sm text-[var(--muted-foreground)]">
                            {link.totalClicks} {t.common.click}
                          </span>
                        </div>
                      </div>

                      <div className="mt-3">
                        {renderLinkActions(link, isMutating)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {meta.total > 0 && (
          <div className="mt-5 flex items-center justify-between border-t border-[var(--border)] pt-5 text-sm text-[var(--muted-foreground)]">
            <span>
              {meta.page} / {pageCount}
              <span className="ml-2 text-[var(--muted-foreground)]/70">
                · {meta.total}
              </span>
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1 || isListLoading}
                onClick={() => setPage((value) => value - 1)}
              >
                {t.common.previous}
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= pageCount || isListLoading}
                onClick={() => setPage((value) => value + 1)}
              >
                {t.common.next}
              </Button>
            </div>
          </div>
        )}
      </Card>

      {qrModalLink && (
        <QrCustomizeModal
          open={Boolean(qrModalLink)}
          onClose={handleCloseQr}
          shortUrl={qrModalLink.shortUrl}
          shortCode={qrModalLink.shortCode}
          title={t.links.qrTitle}
          description={qrModalLink.title ?? qrModalLink.shortCode}
          onCopyLink={() => void handleCopy(qrModalLink)}
          onError={setError}
        />
      )}
    </AppShell>
  );
}
