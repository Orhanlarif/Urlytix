const LEGACY_TOKEN_KEY = 'urlytix_token';
export const TOKEN_COOKIE = 'access_token';

export function saveToken(token?: string | null) {
  void token;
  // Authentication is stored only in API-managed httpOnly cookies.
  removeLegacyToken();
}

export function getToken() {
  return null;
}

export function removeToken() {
  removeLegacyToken();
}

export function syncTokenCookie() {
  removeLegacyToken();
}

export function hasClientSession() {
  return false;
}

export function logout(redirectTo = '/login') {
  removeToken();

  if (typeof window !== 'undefined') {
    window.location.href = redirectTo;
  }
}

function removeLegacyToken() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(LEGACY_TOKEN_KEY);
  document.cookie = `${LEGACY_TOKEN_KEY}=; path=/; max-age=0; SameSite=Lax`;
}
