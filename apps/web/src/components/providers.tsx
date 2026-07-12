'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode, useState } from 'react';
import { ConfirmProvider } from '@/components/ui/confirm-dialog';
import { ToastProvider } from '@/components/ui/toast';
import { WorkspaceProvider } from '@/contexts/workspace-context';
import { LanguageProvider } from '@/i18n/language-provider';

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
          mutations: {
            retry: 0,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <WorkspaceProvider>
          <ToastProvider>
            <ConfirmProvider>{children}</ConfirmProvider>
          </ToastProvider>
        </WorkspaceProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
}
