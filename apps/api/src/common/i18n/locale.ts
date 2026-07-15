export type AppLocale = 'en' | 'tr';

export function resolveLocale(acceptLanguage: string | undefined): AppLocale {
  if (!acceptLanguage) return 'en';

  const preferred = acceptLanguage
    .split(',')
    .map((part) => part.trim().split(';')[0]?.toLowerCase())
    .find(Boolean);

  if (!preferred) return 'en';
  if (preferred === 'tr' || preferred.startsWith('tr-')) return 'tr';
  return 'en';
}
