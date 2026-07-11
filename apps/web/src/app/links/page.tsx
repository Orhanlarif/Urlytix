'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link2, MousePointerClick, RefreshCw } from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { Button } from '@/components/ui/button';
import { Card, CardHeader } from '@/components/ui/card';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { DropdownItem, DropdownMenu } from '@/components/ui/dropdown-menu';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorBanner } from '@/components/ui/error-banner';
import { Input } from '@/components/ui/input';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { MetricCard } from '@/components/ui/metric-card';
import { PageHeader } from '@/components/ui/page-header';
import { Select } from '@/components/ui/select';
import { useToast } from '@/components/ui/toast';
import { interpolate } from '@/i18n';
import { useLanguage } from '@/i18n/language-provider';
import { formatDate, formatDateTime, truncateText } from '@/lib/format';
import {
  canToggleLinkStatus,
  getLinkStatusBadgeClass,
  getLinkStatusLabel,
  isLinkOperational,
} from '@/lib/link-status';
import { createQrCodeDataUrl } from '@/lib/qr';
import { linksService } from '@/services/links';
import type {
  LinkItem,
  LinkStatus,
} from '@/types/links';

export default function LinksPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const { showToast } = useToast();
  const { confirm } = useConfirm();

  const [links, setLinks] = useState<LinkItem[]>([]);
  const [originalUrl, setOriginalUrl] = useState('');
  const [title, setTitle] = useState('');
  const [customAlias, setCustomAlias] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [qrModalLink, setQrModalLink] = useState<LinkItem | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [isQrLoading, setIsQrLoading] = useState(false);
  const [error, setError] = useState('');
  const [copiedShortCode, setCopiedShortCode] = useState<string | null>(null);
  const [mutatingLinkId, setMutatingLinkId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | LinkStatus>('ALL');
  const [sortBy, setSortBy] = useState<'NEWEST' | 'CLICKS' | 'TITLE'>('NEWEST');
  const [page, setPage] = useState(1);
  const pageSize = 6;

  const totalClicks = useMemo(
    () => links.reduce((total, link) => total + link.totalClicks, 0),
    [links],
  );

  const activeLinks = useMemo(
    () => links.filter((link) => link.status === 'ACTIVE').length,
    [links],
  );

  const filteredLinks = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return links
      .filter((link) => statusFilter === 'ALL' || link.status === statusFilter)
      .filter((link) =>
        !query ||
        [link.title, link.shortCode, link.shortUrl, link.originalUrl]
          .some((value) => value?.toLocaleLowerCase().includes(query)),
      )
      .sort((a, b) => {
        if (sortBy === 'CLICKS') return b.totalClicks - a.totalClicks;
        if (sortBy === 'TITLE') return (a.title ?? a.shortCode).localeCompare(b.title ?? b.shortCode);
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [links, search, sortBy, statusFilter]);
  const pageCount = Math.max(1, Math.ceil(filteredLinks.length / pageSize));
  const visibleLinks = filteredLinks.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    loadLinks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadLinks() {
    setError('');
    setIsLoading(true);

    try {
      const response = await linksService.list();
      setLinks(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.links.loadFailed);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCreateLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError('');
    setIsCreating(true);

    try {
      const response = await linksService.create({
          originalUrl,
          title: title.trim() ? title.trim() : undefined,
          customAlias: customAlias.trim() ? customAlias.trim() : undefined,
          expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
      });

      setLinks((currentLinks) => [response.link, ...currentLinks]);
      showToast(t.links.created);
      setOriginalUrl('');
      setTitle('');
      setCustomAlias('');
      setExpiresAt('');
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

    setError('');
    setMutatingLinkId(link.id);

    try {
      const response = await linksService.updateStatus(link.id, nextStatus);

      setLinks((currentLinks) =>
        currentLinks.map((currentLink) =>
          currentLink.id === link.id ? response.link : currentLink,
        ),
      );

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
      const response = await linksService.remove(link.id);

      setLinks((currentLinks) =>
        currentLinks.filter(
          (currentLink) => currentLink.id !== response.deletedLinkId,
        ),
      );

      showToast(t.links.deleted);
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
    } catch {
      setError(t.links.copyFailed);
    }
  }

  async function handleOpenQr(link: LinkItem) {
    setError('');
    setQrModalLink(link);
    setQrDataUrl('');
    setIsQrLoading(true);

    try {
      const dataUrl = await createQrCodeDataUrl(link.shortUrl);
      setQrDataUrl(dataUrl);
    } catch {
      setError(t.links.qrFailed);
      setQrModalLink(null);
    } finally {
      setIsQrLoading(false);
    }
  }

  function handleCloseQr() {
    setQrModalLink(null);
    setQrDataUrl('');
    setIsQrLoading(false);
  }

  function handleDownloadQr() {
    if (!qrDataUrl || !qrModalLink) return;

    const anchor = document.createElement('a');
    anchor.href = qrDataUrl;
    anchor.download = `${qrModalLink.shortCode}-qr.png`;
    anchor.click();
  }

  if (isLoading) {
    return <LoadingScreen text={t.links.loading} />;
  }

  return (
    <AppShell>
      <PageHeader
        badge={t.links.badge}
        title={t.links.title}
        description={t.links.description}
        action={
          <Button variant="secondary" onClick={loadLinks}>
            <RefreshCw className="h-4 w-4" />
            {t.links.refresh}
          </Button>
        }
      />

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <MetricCard
          title={t.links.totalLinks}
          value={links.length}
          description={t.links.totalLinksDesc}
          icon={Link2}
        />
        <MetricCard
          title={t.links.activeLinks}
          value={activeLinks}
          description={t.links.activeLinksDesc}
          icon={Link2}
        />
        <MetricCard
          title={t.links.totalClicks}
          value={totalClicks}
          description={t.links.totalClicksDesc}
          icon={MousePointerClick}
        />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[420px_1fr]">
        <Card>
          <CardHeader
            title={t.links.createTitle}
            description={t.links.createDesc}
          />

          <form onSubmit={handleCreateLink} className="mt-6 space-y-4">
            <Input
              label={t.links.targetUrl}
              value={originalUrl}
              onChange={(event) => setOriginalUrl(event.target.value)}
              placeholder="https://example.com"
              type="url"
              required
            />

            <Input
              label={t.links.linkTitle}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={t.links.titlePlaceholder}
            />

            <div>
              <label className="text-sm text-slate-300">
                {t.links.customAlias}
                <span className="ml-2 text-slate-500">{t.common.optional}</span>
              </label>
              <div className="mt-2 flex overflow-hidden rounded-xl border border-slate-700 bg-slate-950 focus-within:border-cyan-400">
                <span className="border-r border-slate-800 px-4 py-3 text-sm text-slate-500">
                  /r/
                </span>
                <input
                  value={customAlias}
                  onChange={(event) => setCustomAlias(event.target.value)}
                  className="w-full bg-transparent px-4 py-3 text-sm outline-none"
                  placeholder={t.links.aliasPlaceholder}
                />
              </div>
              <p className="mt-2 text-xs text-slate-500">{t.links.aliasHint}</p>
            </div>

            <Input
              label={`${t.links.expiresAt} (${t.common.optional})`}
              value={expiresAt}
              onChange={(event) => setExpiresAt(event.target.value)}
              type="datetime-local"
              hint={t.links.expiresHint}
            />

            <ErrorBanner message={error} />

            <Button type="submit" disabled={isCreating} fullWidth>
              {isCreating ? t.links.creating : t.links.createButton}
            </Button>
          </form>
        </Card>

        <Card>
          <CardHeader title={t.links.listTitle} description={t.links.listDesc} />

          <div className="mt-6 grid gap-3 md:grid-cols-[1fr_150px_150px]">
            <Input
              aria-label={t.links.listTitle}
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder={t.common.search}
            />
            <Select
              aria-label={t.common.status}
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value as 'ALL' | LinkStatus);
                setPage(1);
              }}
            >
              <option value="ALL">{t.common.allStatuses}</option>
              <option value="ACTIVE">{t.status.active}</option>
              <option value="DISABLED">{t.status.disabled}</option>
              <option value="EXPIRED">{t.status.expired}</option>
            </Select>
            <Select
              aria-label={t.common.sort}
              value={sortBy}
              onChange={(event) => {
                setSortBy(event.target.value as typeof sortBy);
                setPage(1);
              }}
            >
              <option value="NEWEST">{t.common.newest}</option>
              <option value="CLICKS">{t.common.mostClicked}</option>
              <option value="TITLE">{t.common.title}</option>
            </Select>
          </div>

          <div className="mt-6 space-y-4">
            {links.length === 0 ? (
              <EmptyState icon={Link2} title={t.links.noLinks} description={t.links.noLinksDesc} />
            ) : filteredLinks.length === 0 ? (
              <EmptyState title={t.common.noResults} description={t.common.adjustFilters} />
            ) : (
              visibleLinks.map((link) => {
                const isMutating = mutatingLinkId === link.id;
                const isActive = isLinkOperational(link.status);
                const isExpired = link.status === 'EXPIRED';
                const canToggle = canToggleLinkStatus(link.status);

                return (
                  <div
                    key={link.id}
                    className="group rounded-2xl border border-slate-800 bg-slate-950 p-5 transition hover:border-slate-700"
                  >
                    <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-start">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold">
                            {link.title ?? link.shortCode}
                          </h3>
                          <span className={getLinkStatusBadgeClass(link.status)}>
                            {getLinkStatusLabel(link.status, t)}
                          </span>
                        </div>

                        <p className="mt-2 break-all text-sm text-cyan-300">
                          {link.shortUrl}
                        </p>
                        <p className="mt-2 break-all text-sm text-slate-500">
                          {truncateText(link.originalUrl, 90)}
                        </p>
                        <p className="mt-3 text-xs text-slate-600">
                          {t.links.createdAt}: {formatDate(link.createdAt)}
                          {link.expiresAt && (
                            <> · {t.links.expires}: {formatDateTime(link.expiresAt)}</>
                          )}
                        </p>
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        <div className="rounded-xl border border-slate-800 px-3 py-2 text-sm text-slate-300">
                          {link.totalClicks} {t.common.click}
                        </div>

                        <Link href={`/links/${link.id}`}><Button size="sm">{t.common.manage}</Button></Link>
                        <DropdownMenu label={t.common.actions}>
                          <DropdownItem onClick={() => handleCopy(link)}>{copiedShortCode === link.shortCode ? t.common.copied : t.common.copy}</DropdownItem>
                          <DropdownItem onClick={() => handleOpenQr(link)}>QR</DropdownItem>
                          {isActive && <DropdownItem onClick={() => window.open(link.shortUrl, '_blank', 'noopener,noreferrer')}>{t.common.testLink}</DropdownItem>}
                          {isExpired && <DropdownItem onClick={() => router.push(`/links/${link.id}`)}>{t.common.extendExpiry}</DropdownItem>}
                          {canToggle && <DropdownItem onClick={() => handleToggleStatus(link)}>{isMutating ? t.common.processing : isActive ? t.links.deactivate : t.links.activate}</DropdownItem>}
                          <DropdownItem danger onClick={() => handleDeleteLink(link)}>{t.common.delete}</DropdownItem>
                        </DropdownMenu>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          {filteredLinks.length > pageSize && (
            <div className="mt-5 flex items-center justify-between border-t border-slate-800 pt-5 text-sm text-slate-400">
              <span>{page} / {pageCount}</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((value) => value - 1)}>{t.common.previous}</Button>
                <Button variant="outline" size="sm" disabled={page === pageCount} onClick={() => setPage((value) => value + 1)}>{t.common.next}</Button>
              </div>
            </div>
          )}
        </Card>
      </div>

      {qrModalLink && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-6 backdrop-blur-sm">
          <Card className="w-full max-w-md">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">{t.links.qrTitle}</h2>
                <p className="mt-1 text-sm text-slate-400">
                  {qrModalLink.title ?? qrModalLink.shortCode}
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={handleCloseQr}>
                {t.common.close}
              </Button>
            </div>

            <div className="mt-6 rounded-2xl border border-slate-800 bg-white p-4">
              {isQrLoading ? (
                <div className="flex h-72 items-center justify-center text-sm text-slate-500">
                  {t.links.qrGenerating}
                </div>
              ) : (
                qrDataUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={qrDataUrl}
                    alt={`${qrModalLink.shortCode} QR`}
                    className="h-full w-full rounded-xl"
                  />
                )
              )}
            </div>

            <p className="mt-4 break-all rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-cyan-300">
              {qrModalLink.shortUrl}
            </p>

            <div className="mt-5 flex gap-3">
              <Button
                onClick={handleDownloadQr}
                disabled={!qrDataUrl || isQrLoading}
                fullWidth
              >
                {t.common.downloadPng}
              </Button>
              <Button
                variant="secondary"
                onClick={() => handleCopy(qrModalLink)}
                fullWidth
              >
                {t.common.copyLink}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </AppShell>
  );
}
