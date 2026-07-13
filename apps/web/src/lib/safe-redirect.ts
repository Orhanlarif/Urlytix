/**
 * Only allow same-origin relative paths to avoid open redirects.
 */
export function getSafeRedirectPath(
  value: string | null | undefined,
  fallback = '/dashboard',
): string {
  if (!value) return fallback;
  if (!value.startsWith('/') || value.startsWith('//') || value.includes('\\')) {
    return fallback;
  }

  try {
    const url = new URL(value, 'http://urlytics.local');
    if (url.origin !== 'http://urlytics.local') {
      return fallback;
    }
    return `${url.pathname}${url.search}${url.hash}` || fallback;
  } catch {
    return fallback;
  }
}
