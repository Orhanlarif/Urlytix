import { logout } from '@/lib/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL;
const LOCALE_KEY = 'urlytics-locale';

type ApiOptions = {
  method?: string;
  body?: unknown;
  token?: string | null;
  retryAfterRefresh?: boolean;
};

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message = 'Your session expired. Please sign in again.') {
    super(message, 401);
    this.name = 'UnauthorizedError';
  }
}

const refreshExcludedPaths = new Set([
  '/auth/login',
  '/auth/register',
  '/auth/refresh',
  '/auth/logout',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/2fa/verify',
]);

function resolveAcceptLanguage(): string {
  if (typeof window === 'undefined') return 'en';
  return localStorage.getItem(LOCALE_KEY) === 'tr' ? 'tr' : 'en';
}

export async function apiRequest<T>(
  path: string,
  options: ApiOptions = {},
): Promise<T> {
  if (!API_URL) {
    throw new Error('NEXT_PUBLIC_API_URL is not configured.');
  }

  const response = await fetch(`${API_URL}${path}`, {
    method: options.method ?? 'GET',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'Accept-Language': resolveAcceptLanguage(),
      ...(options.token
        ? {
            Authorization: `Bearer ${options.token}`,
          }
        : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const data = await response.json().catch(() => null);

  if (
    response.status === 401 &&
    options.retryAfterRefresh !== false &&
    !refreshExcludedPaths.has(path)
  ) {
    const refreshResponse = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Accept-Language': resolveAcceptLanguage(),
      },
    });

    if (refreshResponse.ok) {
      return apiRequest<T>(path, {
        ...options,
        retryAfterRefresh: false,
      });
    }
  }

  if (response.status === 401) {
    // Auth endpoints return 401 for bad credentials / codes — do not treat as
    // an expired session or force-navigate away from the form.
    if (!refreshExcludedPaths.has(path)) {
      logout('/login?expired=1');
    }
    throw new UnauthorizedError(data?.message);
  }

  if (!response.ok) {
    throw new ApiError(
      data?.message ?? 'Something went wrong.',
      response.status,
    );
  }

  return data as T;
}
