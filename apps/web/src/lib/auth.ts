const TOKEN_KEY = 'urlytics_token';
export const TOKEN_COOKIE = 'urlytics_token';
const TOKEN_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

export function saveToken(token: string) {
  if (typeof window === 'undefined') return;

  localStorage.setItem(TOKEN_KEY, token);
  document.cookie = `${TOKEN_COOKIE}=${encodeURIComponent(token)}; path=/; max-age=${TOKEN_MAX_AGE_SECONDS}; SameSite=Lax`;
}

export function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function removeToken() {
  if (typeof window === 'undefined') return;

  localStorage.removeItem(TOKEN_KEY);
  document.cookie = `${TOKEN_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
}

export function syncTokenCookie() {
  if (typeof window === 'undefined') return;

  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return;

  const hasCookie = document.cookie
    .split(';')
    .some((part) => part.trim().startsWith(`${TOKEN_COOKIE}=`));

  if (!hasCookie) {
    document.cookie = `${TOKEN_COOKIE}=${encodeURIComponent(token)}; path=/; max-age=${TOKEN_MAX_AGE_SECONDS}; SameSite=Lax`;
  }
}

export function logout(redirectTo = '/login') {
  removeToken();

  if (typeof window !== 'undefined') {
    window.location.href = redirectTo;
  }
}
