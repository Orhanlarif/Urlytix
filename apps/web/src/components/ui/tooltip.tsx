import { ReactNode } from 'react';

export function Tooltip({ label, children }: { label: string; children: ReactNode }) {
  return (
    <span className="group/tooltip relative inline-flex">
      {children}
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-40 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-[var(--radius-sm)] border border-[var(--border-strong)] bg-[var(--surface-raised)] px-2.5 py-1.5 text-xs text-[var(--foreground)] shadow-[var(--shadow-md)] group-hover/tooltip:block group-focus-within/tooltip:block"
      >
        {label}
        <span
          aria-hidden="true"
          className="absolute left-1/2 top-full -mt-px h-2 w-2 -translate-x-1/2 rotate-45 border-b border-r border-[var(--border-strong)] bg-[var(--surface-raised)]"
        />
      </span>
    </span>
  );
}
