'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link2, MousePointerClick, RefreshCw } from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { Button } from '@/components/ui/button';
import { Card, CardHeader } from '@/components/ui/card';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { ErrorBanner } from '@/components/ui/error-banner';
import { Input } from '@/components/ui/input';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { MetricCard } from '@/components/ui/metric-card';
import { PageHeader } from '@/components/ui/page-header';
import { useToast } from '@/components/ui/toast';
import { interpolate } from '@/i18n';
import { useLanguage } from '@/i18n/language-provider';
import { apiRequest } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { formatDate, formatDateTime, truncateText } from '@/lib/format';
import {
  canToggleLinkStatus,
  getLinkStatusBadgeClass,
  getLinkStatusLabel,
  isLinkOperational,
} from '@/lib/link-status';
import { createQrCodeDataUrl } from '@/lib/qr';
import type {
  CreateLinkResponse,
  DeleteLinkResponse,
  LinkItem,
  LinkStatus,
  UpdateLinkStatusResponse,
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

  const totalClicks = useMemo(
    () => links.reduce((total, link) => total + link.totalClicks, 0),
    [links],
  );

  const activeLinks = useMemo(
    () => links.filter((link) => link.status === 'ACTIVE').length,
    [links],
  );

  useEffect(() => {
    loadLinks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadLinks() {
    const token = getToken();

    if (!token) {
      router.push('/login');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      const data = await apiRequest<LinkItem[]>('/links', { token });
      setLinks(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.links.loadFailed);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCreateLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const token = getToken();
    if (!token) {
      router.push('/login');
      return;
    }

    setError('');
    setIsCreating(true);

    try {
      const response = await apiRequest<CreateLinkResponse>('/links', {
        method: 'POST',
        token,
        body: {
          originalUrl,
          title: title.trim() ? title.trim() : undefined,
          customAlias: customAlias.trim() ? customAlias.trim() : undefined,
          expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
        },
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

    const token = getToken();
    if (!token) {
      router.push('/login');
      return;
    }

    const nextStatus: LinkStatus =
      link.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE';

    setError('');
    setMutatingLinkId(link.id);

    try {
      const response = await apiRequest<UpdateLinkStatusResponse>(
        `/links/${link.id}/status`,
        {
          method: 'PATCH',
          token,
          body: { status: nextStatus },
        },
      );

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
    const token = getToken();
    if (!token) {
      router.push('/login');
      return;
    }

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
      const response = await apiRequest<DeleteLinkResponse>(`/links/${link.id}`, {
        method: 'DELETE',
        token,
      });

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

          <div className="mt-6 space-y-4">
            {links.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/60 p-8 text-center">
                <p className="font-medium text-slate-200">{t.links.noLinks}</p>
                <p className="mt-2 text-sm text-slate-500">{t.links.noLinksDesc}</p>
              </div>
            ) : (
              links.map((link) => {
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

                      <div className="flex shrink-0 flex-wrap gap-2">
                        <div className="rounded-xl border border-slate-800 px-3 py-2 text-sm text-slate-300">
                          {link.totalClicks} {t.common.click}
                        </div>

                        <Link href={`/links/${link.id}`}>
                          <Button size="sm">{t.common.manage}</Button>
                        </Link>

                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleCopy(link)}
                        >
                          {copiedShortCode === link.shortCode
                            ? t.common.copied
                            : t.common.copy}
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenQr(link)}
                        >
                          QR
                        </Button>

                        {isActive ? (
                          <a
                            href={link.shortUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-xl border border-slate-700 px-3 py-2 text-sm text-slate-200 transition hover:bg-slate-900"
                          >
                            {t.common.testLink}
                          </a>
                        ) : isExpired ? (
                          <Link
                            href={`/links/${link.id}`}
                            className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200 transition hover:bg-red-500/20"
                          >
                            {t.common.extendExpiry}
                          </Link>
                        ) : (
                          <span className="rounded-xl border border-slate-800 px-3 py-2 text-sm text-slate-600">
                            {t.common.inactive}
                          </span>
                        )}

                        {canToggle && (
                          <Button
                            variant={isActive ? 'outline' : 'secondary'}
                            size="sm"
                            onClick={() => handleToggleStatus(link)}
                            disabled={isMutating}
                          >
                            {isMutating
                              ? t.common.processing
                              : isActive
                                ? t.links.deactivate
                                : t.links.activate}
                          </Button>
                        )}

                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleDeleteLink(link)}
                          disabled={isMutating}
                        >
                          {t.common.delete}
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
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
