'use client';

import { KeyboardEvent, ReactNode, useId, useState } from 'react';
import { cn } from '@/lib/utils';

type Tab = { id: string; label: string; content: ReactNode };
type TabsVariant = 'underline' | 'pill';

const scrollHide =
  '[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden';

export function Tabs({
  tabs,
  defaultTab,
  variant = 'underline',
}: {
  tabs: Tab[];
  defaultTab?: string;
  variant?: TabsVariant;
}) {
  const baseId = useId();
  const [active, setActive] = useState(defaultTab ?? tabs[0]?.id);
  /** Long pill labels crush in one row on phones — use a compact grid instead. */
  const usePillGrid = variant === 'pill' && tabs.length >= 3 && tabs.length <= 4;
  const pillGridClass = tabs.length === 4 ? 'grid-cols-2' : 'grid-cols-3';
  /** Underline rows with 4+ labels: shrink evenly instead of horizontal scroll. */
  const useUnderlineFit = variant === 'underline' && tabs.length >= 4;

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let nextIndex: number | null = null;
    if (event.key === 'ArrowRight') nextIndex = (index + 1) % tabs.length;
    if (event.key === 'ArrowLeft') nextIndex = (index - 1 + tabs.length) % tabs.length;
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = tabs.length - 1;
    if (nextIndex === null) return;

    event.preventDefault();
    setActive(tabs[nextIndex].id);
    const tabList = event.currentTarget.parentElement;
    tabList?.querySelectorAll<HTMLElement>('[role="tab"]')[nextIndex]?.focus();
  }

  return (
    <div>
      <div
        role="tablist"
        className={cn(
          'max-w-full',
          variant === 'underline'
            ? cn(
                'border-b border-[var(--border)]',
                useUnderlineFit
                  ? 'flex w-full gap-0'
                  : cn(
                      'flex gap-1 overflow-x-auto overscroll-x-contain',
                      scrollHide,
                    ),
              )
            : cn(
                'rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-1',
                usePillGrid
                  ? cn('grid gap-1 sm:flex', pillGridClass)
                  : cn('flex gap-1 overflow-x-auto overscroll-x-contain', scrollHide),
              ),
        )}
      >
        {tabs.map((tab, index) => (
          <button
            key={tab.id}
            id={`${baseId}-${tab.id}-tab`}
            role="tab"
            aria-selected={active === tab.id}
            aria-controls={`${baseId}-${tab.id}-panel`}
            tabIndex={active === tab.id ? 0 : -1}
            onClick={() => setActive(tab.id)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            className={cn(
              'font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--accent)]/40',
              variant === 'underline'
                ? cn(
                    'border-b-2',
                    useUnderlineFit
                      ? 'min-w-0 flex-1 px-1 py-2.5 text-center text-[11px] leading-tight tracking-tight whitespace-normal sm:flex-none sm:px-4 sm:py-3 sm:text-left sm:text-sm sm:leading-normal sm:tracking-normal sm:whitespace-nowrap'
                      : 'shrink-0 whitespace-nowrap px-3 py-3 text-sm sm:px-4',
                    active === tab.id
                      ? 'border-[var(--accent)] text-[var(--accent)]'
                      : 'border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]',
                  )
                : cn(
                    'rounded-xl px-2 py-2.5 text-center text-sm leading-snug sm:px-3',
                    usePillGrid
                      ? cn(
                          'min-w-0 whitespace-normal text-xs sm:min-w-0 sm:flex-1 sm:whitespace-nowrap sm:text-sm',
                          tabs.length === 3 && 'px-1.5 sm:px-3',
                        )
                      : 'shrink-0 whitespace-nowrap px-3.5 sm:min-w-0 sm:flex-1',
                    active === tab.id
                      ? 'bg-[var(--accent)] text-[var(--accent-foreground)] shadow-[var(--shadow-xs)]'
                      : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]',
                  ),
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {tabs.map((tab) => (
        <div
          key={tab.id}
          id={`${baseId}-${tab.id}-panel`}
          role="tabpanel"
          aria-labelledby={`${baseId}-${tab.id}-tab`}
          hidden={active !== tab.id}
          className="pt-6"
        >
          {tab.content}
        </div>
      ))}
    </div>
  );
}
