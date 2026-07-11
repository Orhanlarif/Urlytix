'use client';

import { ReactNode, useId, useState } from 'react';
import { cn } from '@/lib/utils';

type Tab = { id: string; label: string; content: ReactNode };

export function Tabs({
  tabs,
  defaultTab,
}: {
  tabs: Tab[];
  defaultTab?: string;
}) {
  const baseId = useId();
  const [active, setActive] = useState(defaultTab ?? tabs[0]?.id);

  return (
    <div>
      <div role="tablist" className="flex gap-1 overflow-x-auto border-b border-slate-800">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            id={`${baseId}-${tab.id}-tab`}
            role="tab"
            aria-selected={active === tab.id}
            aria-controls={`${baseId}-${tab.id}-panel`}
            onClick={() => setActive(tab.id)}
            className={cn(
              'whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition',
              active === tab.id
                ? 'border-cyan-400 text-cyan-200'
                : 'border-transparent text-slate-400 hover:text-white',
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
