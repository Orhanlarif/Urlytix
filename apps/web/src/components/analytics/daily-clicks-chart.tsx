'use client';

import { formatNumber } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Locale } from '@/i18n/types';

type DailyClickPoint = {
  date: string;
  clicks: number;
};

const LABEL_ROW_HEIGHT = '1.75rem';

export function DailyClicksChart({
  data,
  clickLabel,
  locale,
  heightClass = 'h-56',
}: {
  data: DailyClickPoint[];
  clickLabel: string;
  locale: Locale;
  heightClass?: string;
}) {
  const maxValue = Math.max(...data.map((item) => item.clicks), 1);
  const peakValue = Math.max(...data.map((item) => item.clicks), 0);
  const average =
    data.length > 0
      ? data.reduce((sum, item) => sum + item.clicks, 0) / data.length
      : 0;
  const averageFraction = peakValue > 0 ? Math.min(average / maxValue, 1) : 0;

  return (
    <div
      className={`relative mt-8 flex ${heightClass} gap-1.5 border-b border-[var(--border)] pb-4 sm:gap-2`}
      role="img"
      aria-label={data
        .map(
          (item) =>
            `${item.date}: ${formatNumber(item.clicks, locale)} ${clickLabel}`,
        )
        .join('. ')}
    >
      {averageFraction > 0 && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 z-0 border-t border-dashed border-[var(--border-strong)]"
          style={{
            bottom: `calc(${LABEL_ROW_HEIGHT} + (100% - ${LABEL_ROW_HEIGHT}) * ${averageFraction.toFixed(4)})`,
          }}
        />
      )}

      {data.map((item) => {
        const height = Math.max(
          (item.clicks / maxValue) * 100,
          item.clicks > 0 ? 8 : 2,
        );
        const label = `${item.date}: ${formatNumber(item.clicks, locale)} ${clickLabel}`;
        const isPeak = peakValue > 0 && item.clicks === peakValue;

        return (
          <div
            key={item.date}
            className="group relative z-10 flex min-w-[1.75rem] flex-1 flex-col sm:min-w-0"
          >
            <div className="flex flex-1 items-end">
              <div
                className={cn(
                  'relative w-full rounded-t-xl transition',
                  isPeak
                    ? 'bg-[var(--accent)] shadow-[var(--shadow-glow)]'
                    : 'bg-[var(--accent)]/70 group-hover:bg-[var(--accent-hover)]',
                )}
                style={{ height: `${height}%` }}
                aria-hidden="true"
              >
                <div
                  role="tooltip"
                  className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 -translate-x-1/2 whitespace-nowrap rounded-[var(--radius-sm)] border border-[var(--border-strong)] bg-[var(--surface-raised)] px-2.5 py-1.5 text-xs font-medium text-[var(--foreground)] opacity-0 shadow-[var(--shadow-md)] transition-opacity duration-150 group-hover:opacity-100"
                >
                  {label}
                  <span
                    aria-hidden="true"
                    className="absolute left-1/2 top-full -mt-px h-2 w-2 -translate-x-1/2 rotate-45 border-b border-r border-[var(--border-strong)] bg-[var(--surface-raised)]"
                  />
                </div>
              </div>
            </div>
            <div className="mt-2 h-5 text-center text-[10px] text-[var(--muted-foreground)]">
              {item.date.slice(5)}
            </div>
            <span className="sr-only">{label}</span>
          </div>
        );
      })}
    </div>
  );
}
