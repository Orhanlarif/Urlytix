'use client';

import { useId, useState } from 'react';
import { formatNumber } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Locale } from '@/i18n/types';

type DailyClickPoint = {
  date: string;
  clicks: number;
};

const LABEL_ROW_HEIGHT = '1.75rem';
const TOOLTIP_SPACE = '2.75rem';

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
  const chartId = useId();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const maxValue = Math.max(...data.map((item) => item.clicks), 1);
  const peakValue = Math.max(...data.map((item) => item.clicks), 0);
  const average =
    data.length > 0
      ? data.reduce((sum, item) => sum + item.clicks, 0) / data.length
      : 0;
  const averageFraction = peakValue > 0 ? Math.min(average / maxValue, 1) : 0;

  return (
    <div className="mt-8 overflow-x-auto overflow-y-visible pb-1">
      <div
        className={cn(
          'relative flex min-w-0 gap-1.5 border-b border-[var(--border)] pb-4 sm:gap-2',
          heightClass,
        )}
        style={{
          minWidth: data.length > 14 ? `${data.length * 1.75}rem` : undefined,
          paddingTop: TOOLTIP_SPACE,
        }}
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
              bottom: `calc(${LABEL_ROW_HEIGHT} + (100% - ${LABEL_ROW_HEIGHT} - ${TOOLTIP_SPACE}) * ${averageFraction.toFixed(4)})`,
            }}
          />
        )}

        {data.map((item, index) => {
          const height = Math.max(
            (item.clicks / maxValue) * 100,
            item.clicks > 0 ? 8 : 2,
          );
          const label = `${item.date}: ${formatNumber(item.clicks, locale)} ${clickLabel}`;
          const isPeak = peakValue > 0 && item.clicks === peakValue;
          const isSelected = selectedDate === item.date;
          const isEdgeStart = index < 2;
          const isEdgeEnd = index >= data.length - 2;

          return (
            <button
              key={item.date}
              type="button"
              id={`${chartId}-${item.date}`}
              aria-pressed={isSelected}
              aria-label={label}
              onClick={() =>
                setSelectedDate((current) =>
                  current === item.date ? null : item.date,
                )
              }
              className="group relative z-10 flex min-w-[1.75rem] flex-1 flex-col outline-none sm:min-w-0"
            >
              <div
                role="tooltip"
                className={cn(
                  'pointer-events-none absolute top-0 z-30 -translate-y-[calc(100%-0.25rem)] whitespace-nowrap rounded-[var(--radius-sm)] border border-[var(--border-strong)] bg-[var(--surface-raised)] px-2.5 py-1.5 text-xs font-medium text-[var(--foreground)] shadow-[var(--shadow-md)] transition-opacity duration-150',
                  isEdgeStart
                    ? 'left-0 translate-x-0'
                    : isEdgeEnd
                      ? 'right-0 translate-x-0'
                      : 'left-1/2 -translate-x-1/2',
                  isSelected
                    ? 'opacity-100'
                    : 'opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100',
                )}
              >
                {label}
                <span
                  aria-hidden="true"
                  className={cn(
                    'absolute top-full -mt-px h-2 w-2 rotate-45 border-b border-r border-[var(--border-strong)] bg-[var(--surface-raised)]',
                    isEdgeStart
                      ? 'left-3'
                      : isEdgeEnd
                        ? 'right-3'
                        : 'left-1/2 -translate-x-1/2',
                  )}
                />
              </div>

              <div className="flex min-h-0 flex-1 items-end">
                <div
                  className={cn(
                    'relative w-full rounded-t-xl transition',
                    isPeak || isSelected
                      ? 'bg-[var(--accent)] shadow-[var(--shadow-glow)]'
                      : 'bg-[var(--accent)]/70 group-hover:bg-[var(--accent-hover)]',
                  )}
                  style={{ height: `${height}%` }}
                  aria-hidden="true"
                />
              </div>
              <div className="mt-2 h-5 text-center text-[10px] text-[var(--muted-foreground)]">
                {item.date.slice(5)}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
