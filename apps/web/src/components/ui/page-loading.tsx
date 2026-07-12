'use client';

import { AppShell } from '@/components/layout/app-shell';
import { Skeleton } from '@/components/ui/skeleton';

export function PageLoading({
  metrics = 3,
  showChart = true,
  showPanels = false,
}: {
  metrics?: number;
  showChart?: boolean;
  showPanels?: boolean;
}) {
  const panelClass =
    'rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-raised)]/80 p-6';

  return (
    <AppShell>
      <div className="space-y-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>

      {metrics > 0 && (
        <div
          aria-hidden="true"
          className={
            metrics >= 3
              ? 'mt-8 grid gap-4 md:grid-cols-3'
              : metrics === 2
                ? 'mt-8 grid gap-4 md:grid-cols-2'
                : 'mt-8 grid gap-4'
          }
        >
          {Array.from({ length: metrics }).map((_, index) => (
            <div key={index} className={panelClass}>
              <Skeleton className="h-4 w-24" />
              <Skeleton className="mt-4 h-10 w-20" />
              <Skeleton className="mt-3 h-3 w-40" />
            </div>
          ))}
        </div>
      )}

      {showChart && (
        <div className={`mt-8 ${panelClass}`}>
          <Skeleton className="h-5 w-40" />
          <Skeleton className="mt-2 h-4 w-64 max-w-full" />
          <Skeleton className="mt-8 h-56 w-full" />
        </div>
      )}

      {showPanels && (
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className={panelClass}>
            <Skeleton className="h-5 w-32" />
            <div className="mt-6 space-y-4">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          </div>
          <div className={panelClass}>
            <Skeleton className="h-5 w-36" />
            <div className="mt-6 space-y-4">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
