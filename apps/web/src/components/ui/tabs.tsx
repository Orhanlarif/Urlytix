'use client';

import { KeyboardEvent, ReactNode, useId, useState } from 'react';
import { cn } from '@/lib/utils';

type Tab = { id: string; label: string; content: ReactNode };
type TabsVariant = 'underline' | 'pill';

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
          'flex max-w-full gap-1 overflow-x-auto',
          variant === 'underline'
            ? 'border-b border-[var(--border)]'
            : 'w-full rounded-[var(--radius-full)] border border-[var(--border)] bg-[var(--surface)] p-1',
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
              'whitespace-nowrap text-sm font-medium transition-colors',
              variant === 'underline'
                ? cn(
                    'border-b-2 px-4 py-3',
                    active === tab.id
                      ? 'border-[var(--accent)] text-[var(--accent)]'
                      : 'border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]',
                  )
                : cn(
                    'rounded-[var(--radius-full)] px-4 py-2',
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
