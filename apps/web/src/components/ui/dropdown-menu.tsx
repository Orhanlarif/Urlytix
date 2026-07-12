'use client';

import { ReactNode, useEffect, useRef, useState } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';

export function DropdownMenu({
  label,
  children,
  align = 'right',
}: {
  label: string;
  children: ReactNode;
  align?: 'left' | 'right';
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="grid h-9 w-9 place-items-center rounded-lg border border-[var(--border)] text-[var(--muted-foreground)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open && (
        <div
          role="menu"
          data-state="open"
          onClick={() => setOpen(false)}
          className={cn(
            'absolute z-30 mt-2 min-w-44 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-raised)] p-1.5 shadow-[var(--shadow-lg)]',
            align === 'right' ? 'right-0' : 'left-0',
          )}
        >
          {children}
        </div>
      )}
    </div>
  );
}

export function DropdownItem({
  children,
  danger,
  onClick,
}: {
  children: ReactNode;
  danger?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      role="menuitem"
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-3 py-2 text-left text-sm transition-colors hover:bg-[var(--surface-hover)]',
        danger ? 'text-[var(--danger)]' : 'text-[var(--foreground)]',
      )}
    >
      {children}
    </button>
  );
}
