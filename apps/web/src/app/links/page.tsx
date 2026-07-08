'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { ErrorBanner } from '@/components/ui/error-banner';
import { createQrCodeDataUrl } from '@/lib/qr';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { MetricCard } from '@/components/ui/metric-card';
import { SuccessBanner } from '@/components/ui/success-banner';
import { apiRequest } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { formatDate, formatDateTime, truncateText } from '@/lib/format';
import {
  canToggleLinkStatus,
  getLinkStatusBadgeClass,
  getLinkStatusLabel,
  isLinkOperational,
} from '@/lib/link-status';
import type {
  CreateLinkResponse,
  DeleteLinkResponse,
  LinkItem,
  LinkStatus,
  UpdateLinkStatusResponse,
} from '@/types/links';

export default function LinksPage() {
  const router = useRouter();

  const [links, setLinks] = useState<LinkItem[]>([]);
  const [originalUrl, setOriginalUrl] = useState('');
  const [title, setTitle] = useState('');
  const [customAlias, setCustomAlias] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
const [qrModalLink, setQrModalLink] = useState<LinkItem | null>(null);
const [qrDataUrl, setQrDataUrl] = useState('');
const [isQrLoading, setIsQrLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [copiedShortCode, setCopiedShortCode] = useState<string | null>(null);
  const [mutatingLinkId, setMutatingLinkId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  const totalClicks = useMemo(() => {
    return links.reduce((total, link) => total + link.totalClicks, 0);
  }, [links]);

  const activeLinks = useMemo(() => {
    return links.filter((link) => link.status === 'ACTIVE').length;
  }, [links]);

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
      const data = await apiRequest<LinkItem[]>('/links', {
        token,
      });

      setLinks(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Linkler yüklenemedi.');
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
    setSuccessMessage('');
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
      setSuccessMessage('Link başarıyla oluşturuldu.');
      setOriginalUrl('');
      setTitle('');
      setCustomAlias('');
      setExpiresAt('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Link oluşturulamadı.');
    } finally {
      setIsCreating(false);
    }
  }

  async function handleToggleStatus(link: LinkItem) {
    if (!canToggleLinkStatus(link.status)) {
      setError(
        'Süresi dolmuş linkleri aktif etmek için önce bitiş tarihini güncelle.',
      );
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
    setSuccessMessage('');
    setMutatingLinkId(link.id);

    try {
      const response = await apiRequest<UpdateLinkStatusResponse>(
        `/links/${link.id}/status`,
        {
          method: 'PATCH',
          token,
          body: {
            status: nextStatus,
          },
        },
      );

      setLinks((currentLinks) =>
        currentLinks.map((currentLink) =>
          currentLink.id === link.id ? response.link : currentLink,
        ),
      );

      setSuccessMessage(
        nextStatus === 'ACTIVE'
          ? 'Link tekrar aktif edildi.'
          : 'Link pasifleştirildi.',
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Link durumu güncellenemedi.',
      );
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

    const confirmed = window.confirm(
      `"${link.title ?? link.shortCode}" linkini silmek istediğine emin misin? Bu işlem geri alınamaz.`,
    );

    if (!confirmed) {
      return;
    }

    setError('');
    setSuccessMessage('');
    setMutatingLinkId(link.id);

    try {
      const response = await apiRequest<DeleteLinkResponse>(`/links/${link.id}`, {
        method: 'DELETE',
        token,
      });

      setLinks((currentLinks) =>
        currentLinks.filter((currentLink) => currentLink.id !== response.deletedLinkId),
      );

      setSuccessMessage('Link silindi.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Link silinemedi.');
    } finally {
      setMutatingLinkId(null);
    }
  }

  async function handleCopy(link: LinkItem) {
    try {
      await navigator.clipboard.writeText(link.shortUrl);
      setCopiedShortCode(link.shortCode);

      window.setTimeout(() => {
        setCopiedShortCode(null);
      }, 1500);
    } catch {
      setError('Kopyalama işlemi başarısız oldu.');
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
    setError('QR kod oluşturulamadı.');
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
  if (!qrDataUrl || !qrModalLink) {
    return;
  }

  const link = document.createElement('a');
  link.href = qrDataUrl;
  link.download = `${qrModalLink.shortCode}-qr.png`;
  link.click();
}


  function getStatusBadgeClass(status: LinkStatus) {
    return getLinkStatusBadgeClass(status);
  }

  if (isLoading) {
    return <LoadingScreen text="Linkler yükleniyor..." />;
  }

  return (
    <AppShell>
      <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
        <div>
          <div className="mb-4 inline-flex rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-200">
            Link Management
          </div>

          <h1 className="text-4xl font-bold tracking-tight">Links</h1>

          <p className="mt-3 max-w-2xl text-slate-400">
            Kısa linklerini oluştur, paylaş ve performanslarını gerçek zamanlı
            analytics verileriyle takip et.
          </p>
        </div>

        <button
          onClick={loadLinks}
          className="rounded-xl border border-slate-700 px-5 py-3 text-sm font-medium text-slate-200 transition hover:bg-slate-900"
        >
          Listeyi Yenile
        </button>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <MetricCard
          title="Toplam Link"
          value={links.length}
          description="Hesabında oluşturulan link sayısı"
        />

        <MetricCard
          title="Aktif Link"
          value={activeLinks}
          description="Şu anda yönlendirme yapan linkler"
        />

        <MetricCard
          title="Toplam Tıklama"
          value={totalClicks}
          description="Tüm linklerden gelen toplam trafik"
        />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[420px_1fr]">
        <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-black/20">
          <h2 className="text-xl font-semibold">Yeni link oluştur</h2>

          <p className="mt-2 text-sm leading-6 text-slate-400">
            URL mutlaka protokol ile başlamalı. Örnek:{' '}
            <span className="text-slate-200">https://example.com</span>
          </p>

          <form onSubmit={handleCreateLink} className="mt-6 space-y-4">
            <div>
              <label className="text-sm text-slate-300">Hedef URL</label>
              <input
                value={originalUrl}
                onChange={(event) => setOriginalUrl(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm outline-none transition focus:border-cyan-400"
                placeholder="https://example.com"
                type="url"
                required
              />
            </div>

            <div>
              <label className="text-sm text-slate-300">Başlık</label>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm outline-none transition focus:border-cyan-400"
                placeholder="Portfolyo linkim"
              />
            </div>

            <div>
              <label className="text-sm text-slate-300">
                Custom alias
                <span className="ml-2 text-slate-500">opsiyonel</span>
              </label>

              <div className="mt-2 flex overflow-hidden rounded-xl border border-slate-700 bg-slate-950 focus-within:border-cyan-400">
                <span className="border-r border-slate-800 px-4 py-3 text-sm text-slate-500">
                  /r/
                </span>

                <input
                  value={customAlias}
                  onChange={(event) => setCustomAlias(event.target.value)}
                  className="w-full bg-transparent px-4 py-3 text-sm outline-none"
                  placeholder="arif-portfolio"
                />
              </div>

              <p className="mt-2 text-xs text-slate-500">
                Sadece harf, sayı, tire ve alt çizgi kullan.
              </p>
            </div>

            <div>
              <label className="text-sm text-slate-300">
                Bitiş tarihi
                <span className="ml-2 text-slate-500">opsiyonel</span>
              </label>
              <input
                value={expiresAt}
                onChange={(event) => setExpiresAt(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm outline-none transition focus:border-cyan-400"
                type="datetime-local"
              />
              <p className="mt-2 text-xs text-slate-500">
                Boş bırakırsan link süresiz aktif kalır.
              </p>
            </div>

            <ErrorBanner message={error} />
            <SuccessBanner message={successMessage} />

            <button
              disabled={isCreating}
              className="w-full rounded-xl bg-cyan-400 px-4 py-3 font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isCreating ? 'Oluşturuluyor...' : 'Kısa Link Oluştur'}
            </button>
          </form>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-black/20">
          <div>
            <h2 className="text-xl font-semibold">Linklerin</h2>
            <p className="mt-1 text-sm text-slate-400">
              Oluşturduğun kısa linkler ve tıklama sayıları.
            </p>
          </div>

          <div className="mt-6 space-y-4">
            {links.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/60 p-8 text-center">
                <p className="font-medium text-slate-200">
                  Henüz link oluşturmadın.
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  İlk linkini oluşturarak analytics toplamaya başla.
                </p>
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

                          <span className={getStatusBadgeClass(link.status)}>
                            {getLinkStatusLabel(link.status)}
                          </span>
                        </div>

                        <p className="mt-2 break-all text-sm text-cyan-300">
                          {link.shortUrl}
                        </p>

                        <p className="mt-2 break-all text-sm text-slate-500">
                          {truncateText(link.originalUrl, 90)}
                        </p>

                        <p className="mt-3 text-xs text-slate-600">
                          Oluşturulma: {formatDate(link.createdAt)}
                          {link.expiresAt && (
                            <>
                              {' '}
                              · Bitiş: {formatDateTime(link.expiresAt)}
                            </>
                          )}
                        </p>
                      </div>

                      <div className="flex shrink-0 flex-wrap gap-2">
  <div className="rounded-xl border border-slate-800 px-3 py-2 text-sm text-slate-300">
    {link.totalClicks} click
  </div>

  <Link
    href={`/links/${link.id}`}
    className="rounded-xl bg-cyan-400 px-3 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
  >
    Yönet
  </Link>

  <button
    onClick={() => handleCopy(link)}
    className="rounded-xl bg-slate-800 px-3 py-2 text-sm text-slate-200 transition hover:bg-slate-700"
  >
    {copiedShortCode === link.shortCode ? 'Kopyalandı' : 'Kopyala'}
  </button>

  <button
    onClick={() => handleOpenQr(link)}
    className="rounded-xl border border-blue-400/30 bg-blue-400/10 px-3 py-2 text-sm text-blue-200 transition hover:bg-blue-400/20"
  >
    QR
  </button>



                        {isActive ? (
                          <a
                            href={link.shortUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-xl border border-slate-700 px-3 py-2 text-sm text-slate-200 transition hover:bg-slate-900"
                          >
                            Test Et
                          </a>
                        ) : isExpired ? (
                          <Link
                            href={`/links/${link.id}`}
                            className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200 transition hover:bg-red-500/20"
                          >
                            Süreyi Uzat
                          </Link>
                        ) : (
                          <span className="rounded-xl border border-slate-800 px-3 py-2 text-sm text-slate-600">
                            Pasif
                          </span>
                        )}

                        {canToggle ? (
                          <button
                            onClick={() => handleToggleStatus(link)}
                            disabled={isMutating}
                            className={
                              isActive
                                ? 'rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200 transition hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-60'
                                : 'rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60'
                            }
                          >
                            {isMutating
                              ? 'İşleniyor...'
                              : isActive
                                ? 'Pasifleştir'
                                : 'Aktif Et'}
                          </button>
                        ) : null}

                        <button
                          onClick={() => handleDeleteLink(link)}
                          disabled={isMutating}
                          className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Sil
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

{qrModalLink && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-6 backdrop-blur-sm">
    <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-950 p-6 shadow-2xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">QR Code</h2>
          <p className="mt-1 text-sm text-slate-400">
            {qrModalLink.title ?? qrModalLink.shortCode}
          </p>
        </div>

        <button
          onClick={handleCloseQr}
          className="rounded-xl border border-slate-800 px-3 py-2 text-sm text-slate-400 transition hover:bg-slate-900 hover:text-white"
        >
          Kapat
        </button>
      </div>

      <div className="mt-6 rounded-2xl border border-slate-800 bg-white p-4">
        {isQrLoading ? (
          <div className="flex h-72 items-center justify-center text-sm text-slate-500">
            QR oluşturuluyor...
          </div>
        ) : (
          qrDataUrl && (
            <img
              src={qrDataUrl}
              alt={`${qrModalLink.shortCode} QR code`}
              className="h-full w-full rounded-xl"
            />
          )
        )}
      </div>

      <p className="mt-4 break-all rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-cyan-300">
        {qrModalLink.shortUrl}
      </p>

      <div className="mt-5 flex gap-3">
        <button
          onClick={handleDownloadQr}
          disabled={!qrDataUrl || isQrLoading}
          className="flex-1 rounded-xl bg-cyan-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
        >
          PNG İndir
        </button>

        <button
          onClick={() => handleCopy(qrModalLink)}
          className="flex-1 rounded-xl border border-slate-700 px-4 py-3 text-sm font-medium text-slate-200 transition hover:bg-slate-900"
        >
          Linki Kopyala
        </button>
      </div>
    </div>
  </div>
)}

    </AppShell>
  );
}