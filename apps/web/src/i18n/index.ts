import { en } from './en';
import { tr } from './tr';
import type { Locale, Translation } from './types';

export const translations: Record<Locale, Translation> = { tr, en };

export type { Locale, Translation };

export function getTranslations(locale: Locale): Translation {
  return translations[locale];
}

export function interpolate(
  template: string,
  values: Record<string, string>,
): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => values[key] ?? '');
}
