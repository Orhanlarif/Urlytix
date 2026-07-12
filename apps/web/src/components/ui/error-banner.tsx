'use client';

import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

type ErrorBannerProps = {
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
  isRetrying?: boolean;
};

export function ErrorBanner({
  message,
  onRetry,
  retryLabel = 'Try again',
  isRetrying = false,
}: ErrorBannerProps) {
  if (!message) {
    return null;
  }

  return (
    <div role="alert" className="flex flex-col gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200 sm:flex-row sm:items-center sm:justify-between">
      <p>{message}</p>
      {onRetry && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onRetry}
          disabled={isRetrying}
          className="shrink-0 border-red-500/30 text-red-100 hover:border-red-400/40 hover:bg-red-500/10"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isRetrying ? 'animate-spin' : ''}`} />
          {retryLabel}
        </Button>
      )}
    </div>
  );
}
