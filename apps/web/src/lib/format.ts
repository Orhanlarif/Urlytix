import type { Locale } from '@/i18n/types';

function toIntlLocale(locale: Locale = 'tr') {
  return locale === 'en' ? 'en-US' : 'tr-TR';
}

export function formatDate(value: string, locale: Locale = 'tr') {
  return new Date(value).toLocaleDateString(toIntlLocale(locale), {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateTime(value: string, locale: Locale = 'tr') {
  return new Date(value).toLocaleString(toIntlLocale(locale), {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatNumber(value: number, locale: Locale = 'tr') {
  return new Intl.NumberFormat(toIntlLocale(locale)).format(value);
}

export function truncateText(value: string, maxLength = 64) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength)}...`;
}
