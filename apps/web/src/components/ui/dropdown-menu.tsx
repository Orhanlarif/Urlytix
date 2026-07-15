'use client';

import { ReactNode, useEffect, useLayoutEffect, useRef, useState } from 'react';
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
  const [dropUp, setDropUp] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const menu = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  useLayoutEffect(() => {
    if (!open || !root.current || !menu.current) return;
    const triggerRect = root.current.getBoundingClientRect();
    const menuHeight = menu.current.offsetHeight;
    const spaceBelow = window.innerHeight - triggerRect.bottom;
    setDropUp(spaceBelow < menuHeight + 12 && triggerRect.top > spaceBelow);
  }, [open]);

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className={cn(
          'grid h-10 w-10 place-items-center rounded-xl border border-[var(--border)] text-[var(--muted-foreground)] transition-colors',
          'hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--accent)]/45',
          open && 'border-[var(--accent)] bg-[var(--surface-hover)] text-[var(--foreground)]',
        )}
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open && (
        <div
          ref={menu}
          role="menu"
          data-state="open"
          onClick={() => setOpen(false)}
          className={cn(
            'absolute z-30 min-w-44 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-raised)] p-1.5 shadow-[var(--shadow-lg)]',
            align === 'right' ? 'right-0' : 'left-0',
            dropUp ? 'bottom-full mb-2' : 'top-full mt-2',
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
        'flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-3 py-2.5 text-left text-sm transition-colors outline-none',
        'focus-visible:bg-[var(--surface-hover)] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--accent)]/35',
        'hover:bg-[var(--surface-hover)]',
        danger ? 'text-[var(--danger)]' : 'text-[var(--foreground)]',
      )}
    >
      {children}
    </button>
  );
}
