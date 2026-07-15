/**
 * Public site identity used for SEO, sitemap, and Open Graph URLs.
 * Set NEXT_PUBLIC_SITE_URL in production (e.g. https://urlytix.com).
 */
export const SITE_NAME = 'Urlytix';

export const SITE_TAGLINE = 'Privacy-first Link Analytics';

export const SITE_DESCRIPTION =
  'Kısa link oluştur, paylaş ve tıklama analytics verilerini ücretsiz takip et.';

export const SITE_DESCRIPTION_EN =
  'Create short links, share them, and track click analytics — free and privacy-first.';

export function getSiteUrl(): URL {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();

  if (raw) {
    const withProtocol = raw.startsWith('http') ? raw : `https://${raw}`;
    return new URL(withProtocol.replace(/\/$/, ''));
  }

  if (process.env.NODE_ENV === 'development') {
    return new URL('http://localhost:3000');
  }

  return new URL('https://urlytix.com');
}

export const siteConfig = {
  name: SITE_NAME,
  tagline: SITE_TAGLINE,
  description: SITE_DESCRIPTION,
  descriptionEn: SITE_DESCRIPTION_EN,
  get url() {
    return getSiteUrl();
  },
} as const;
