'use client';

import { useQuery } from '@tanstack/react-query';
import { usePathname } from 'next/navigation';
import { authService } from '@/services/auth';

const protectedPrefixes = [
  '/dashboard',
  '/links',
  '/analytics',
  '/workspace',
  '/settings',
  '/admin',
];

export const CURRENT_USER_QUERY_KEY = ['me'] as const;

export function useCurrentUser() {
  const pathname = usePathname();
  const enabled = protectedPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  const query = useQuery({
    queryKey: CURRENT_USER_QUERY_KEY,
    queryFn: authService.me,
    enabled,
  });

  return {
    user: query.data ?? null,
    isLoading: enabled && query.isLoading,
    error: query.error,
    refetch: query.refetch,
    query,
  };
}
