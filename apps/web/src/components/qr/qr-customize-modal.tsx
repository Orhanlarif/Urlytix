'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { MenuSelect } from '@/components/ui/menu-select';
import { interpolate } from '@/i18n';
import { useLanguage } from '@/i18n/language-provider';
import {
  QR_DEFAULT_DARK,
  QR_DEFAULT_LIGHT,
  QR_DEFAULT_WIDTH,
  QR_SIZE_PRESETS,
  createQrCodeDataUrl,
  type QrSizePreset,
} from '@/lib/qr';
import { cn } from '@/lib/utils';

const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;
const REGENERATE_DEBOUNCE_MS = 200;

type QrCustomizeModalProps = {
  open: boolean;
  onClose: () => void;
  shortUrl: string;
  shortCode: string;
  title?: string;
  description?: string;
  onCopyLink?: () => void;
  onError?: (message: string) => void;
};

function normalizeHex(value: string) {
  const trimmed = value.trim();
  if (HEX_COLOR_PATTERN.test(trimmed)) {
    return trimmed.toLowerCase();
  }
  return null;
}

export function QrCustomizeModal({
  open,
  onClose,
  shortUrl,
  shortCode,
  title,
  description,
  onCopyLink,
  onError,
}: QrCustomizeModalProps) {
  const { t } = useLanguage();
  const [dark, setDark] = useState(QR_DEFAULT_DARK);
  const [light, setLight] = useState(QR_DEFAULT_LIGHT);
  const [width, setWidth] = useState<QrSizePreset>(QR_DEFAULT_WIDTH);
  const [darkInput, setDarkInput] = useState(QR_DEFAULT_DARK);
  const [lightInput, setLightInput] = useState(QR_DEFAULT_LIGHT);
  const [dataUrl, setDataUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (!open) return;

    setDark(QR_DEFAULT_DARK);
    setLight(QR_DEFAULT_LIGHT);
    setWidth(QR_DEFAULT_WIDTH);
    setDarkInput(QR_DEFAULT_DARK);
    setLightInput(QR_DEFAULT_LIGHT);
    setDataUrl('');
  }, [open, shortUrl]);

  useEffect(() => {
    if (!open || !shortUrl) return;

    const requestId = ++requestIdRef.current;
    const timer = window.setTimeout(() => {
      void (async () => {
        setIsLoading(true);
        try {
          const nextDataUrl = await createQrCodeDataUrl(shortUrl, {
            dark,
            light,
            width,
          });
          if (requestId !== requestIdRef.current) return;
          setDataUrl(nextDataUrl);
        } catch {
          if (requestId !== requestIdRef.current) return;
          setDataUrl('');
          onError?.(t.links.qrFailed);
        } finally {
          if (requestId === requestIdRef.current) {
            setIsLoading(false);
          }
        }
      })();
    }, REGENERATE_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [open, shortUrl, dark, light, width, onError, t.links.qrFailed]);

  function handleDarkPickerChange(value: string) {
    setDarkInput(value);
    setDark(value);
  }

  function handleLightPickerChange(value: string) {
    setLightInput(value);
    setLight(value);
  }

  function handleDarkHexBlur() {
    const normalized = normalizeHex(darkInput);
    if (normalized) {
      setDark(normalized);
      setDarkInput(normalized);
      return;
    }
    setDarkInput(dark);
  }

  function handleLightHexBlur() {
    const normalized = normalizeHex(lightInput);
    if (normalized) {
      setLight(normalized);
      setLightInput(normalized);
      return;
    }
    setLightInput(light);
  }

  function handleResetDefaults() {
    setDark(QR_DEFAULT_DARK);
    setLight(QR_DEFAULT_LIGHT);
    setWidth(QR_DEFAULT_WIDTH);
    setDarkInput(QR_DEFAULT_DARK);
    setLightInput(QR_DEFAULT_LIGHT);
  }

  function handleDownload() {
    if (!dataUrl) return;

    const anchor = document.createElement('a');
    anchor.href = dataUrl;
    anchor.download = `${shortCode}-qr.png`;
    anchor.click();
  }

  const sizeLabels: Record<QrSizePreset, string> = {
    256: t.qr.sizeSmall,
    512: t.qr.sizeMedium,
    1024: t.qr.sizeLarge,
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title ?? t.links.qrTitle}
      description={description}
      closeLabel={t.common.close}
    >
      <div className="space-y-5">
        <div className="flex items-center justify-center rounded-2xl border border-[var(--border)] bg-white p-4 sm:p-5">
          {isLoading && !dataUrl ? (
            <div
              role="status"
              className="flex h-52 w-full items-center justify-center text-sm text-[var(--muted-foreground)] sm:h-56"
            >
              {t.links.qrGenerating}
            </div>
          ) : dataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={dataUrl}
              alt={interpolate(t.links.qrImageAlt, { code: shortCode })}
              className={cn(
                'h-auto max-h-52 w-full max-w-[13rem] rounded-xl object-contain sm:max-h-56 sm:max-w-56',
                isLoading && 'opacity-60',
              )}
            />
          ) : (
            <div className="flex h-52 w-full items-center justify-center text-sm text-[var(--muted-foreground)] sm:h-56">
              {t.links.qrFailed}
            </div>
          )}
        </div>

        <div className="grid gap-4">
          <ColorField
            label={t.qr.foreground}
            pickerValue={dark}
            hexValue={darkInput}
            onPickerChange={handleDarkPickerChange}
            onHexChange={setDarkInput}
            onHexBlur={handleDarkHexBlur}
          />
          <ColorField
            label={t.qr.background}
            pickerValue={light}
            hexValue={lightInput}
            onPickerChange={handleLightPickerChange}
            onHexChange={setLightInput}
            onHexBlur={handleLightHexBlur}
          />
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1">
            <MenuSelect
              label={t.qr.size}
              value={String(width) as `${QrSizePreset}`}
              onChange={(value) => setWidth(Number(value) as QrSizePreset)}
              options={QR_SIZE_PRESETS.map((size) => ({
                value: String(size) as `${QrSizePreset}`,
                label: sizeLabels[size],
              }))}
            />
          </div>
          <Button
            type="button"
            variant="secondary"
            className="shrink-0"
            onClick={handleResetDefaults}
          >
            {t.qr.resetDefaults}
          </Button>
        </div>

        <p className="break-all rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm leading-6 text-[var(--accent)]">
          {shortUrl}
        </p>

        <div className="flex flex-col-reverse gap-3 sm:flex-row">
          <Button
            onClick={handleDownload}
            disabled={!dataUrl || isLoading}
            fullWidth
          >
            {t.common.downloadPng}
          </Button>
          {onCopyLink && (
            <Button variant="secondary" onClick={onCopyLink} fullWidth>
              {t.common.copyLink}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}

function ColorField({
  label,
  pickerValue,
  hexValue,
  onPickerChange,
  onHexChange,
  onHexBlur,
}: {
  label: string;
  pickerValue: string;
  hexValue: string;
  onPickerChange: (value: string) => void;
  onHexChange: (value: string) => void;
  onHexBlur: () => void;
}) {
  return (
    <div className="min-w-0">
      <label className="block text-sm font-medium text-[var(--muted)]">
        {label}
      </label>
      <div className="mt-2 flex min-w-0 items-center gap-3">
        <input
          type="color"
          value={pickerValue}
          onChange={(event) => onPickerChange(event.target.value)}
          aria-label={label}
          className="h-11 w-11 shrink-0 cursor-pointer rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1"
        />
        <input
          value={hexValue}
          onChange={(event) => onHexChange(event.target.value)}
          onBlur={onHexBlur}
          spellCheck={false}
          autoComplete="off"
          aria-label={`${label} hex`}
          className="min-h-[var(--control-height)] min-w-0 flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 font-mono text-sm tracking-wide text-[var(--foreground)] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20 sm:px-4"
        />
      </div>
    </div>
  );
}
