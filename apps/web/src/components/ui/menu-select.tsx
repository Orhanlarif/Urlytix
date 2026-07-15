'use client';

import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export type MenuSelectOption<T extends string> = {
  value: T;
  label: string;
  description?: string;
  tone?: 'default' | 'success' | 'warning' | 'danger' | 'accent';
};

const toneDot: Record<NonNullable<MenuSelectOption<string>['tone']>, string> = {
  default: 'bg-[var(--muted-foreground)]',
  success: 'bg-[var(--success)]',
  warning: 'bg-[var(--warning)]',
  danger: 'bg-[var(--danger)]',
  accent: 'bg-[var(--accent)]',
};

type MenuSelectProps<T extends string> = {
  value: T;
  options: MenuSelectOption<T>[];
  onChange: (value: T) => void;
  label?: string;
  hint?: string;
  'aria-label'?: string;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
  panelClassName?: string;
  align?: 'left' | 'right';
};

export function MenuSelect<T extends string>({
  value,
  options,
  onChange,
  label,
  hint,
  'aria-label': ariaLabel,
  disabled = false,
  className,
  triggerClassName,
  panelClassName,
  align = 'left',
}: MenuSelectProps<T>) {
  const [open, setOpen] = useState(false);
  const [dropUp, setDropUp] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const listboxId = useId();
  const labelId = useId();
  const hintId = useId();
  const selected = options.find((option) => option.value === value) ?? options[0];
  const resolvedAriaLabel = ariaLabel ?? label;

  useEffect(() => {
    if (!open) return;

    const close = (event: MouseEvent) => {
      if (!root.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  useEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled]);

  useLayoutEffect(() => {
    if (!open || !root.current || !menu.current) return;
    const triggerRect = root.current.getBoundingClientRect();
    const menuHeight = menu.current.offsetHeight;
    const spaceBelow = window.innerHeight - triggerRect.bottom;
    setDropUp(spaceBelow < menuHeight + 12 && triggerRect.top > spaceBelow);
  }, [open, options.length]);

  return (
    <div className={cn('min-w-0', className)}>
      {label && (
        <span
          id={labelId}
          className="mb-2 block text-sm font-medium text-[var(--muted)]"
        >
          {label}
        </span>
      )}

      <div ref={root} className="relative">
        <button
          type="button"
          aria-label={resolvedAriaLabel}
          aria-labelledby={label ? labelId : undefined}
          aria-describedby={hint ? hintId : undefined}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listboxId}
          disabled={disabled}
          onClick={() => setOpen((current) => !current)}
          className={cn(
            'flex min-h-[var(--control-height)] w-full items-center gap-2.5 rounded-xl border bg-[var(--surface)] px-3.5 text-left text-sm outline-none transition',
            'focus-visible:ring-2 focus-visible:ring-[var(--accent)]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]',
            open
              ? 'border-[var(--accent)] ring-2 ring-[var(--accent)]/25'
              : 'border-[var(--border)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)]',
            disabled &&
              'cursor-not-allowed bg-[var(--surface-raised)] text-[var(--muted-foreground)] hover:border-[var(--border)] hover:bg-[var(--surface-raised)] focus-visible:ring-0 focus-visible:ring-offset-0',
            triggerClassName,
          )}
        >
          {selected?.tone && (
            <span
              aria-hidden="true"
              className={cn(
                'h-2 w-2 shrink-0 rounded-full',
                toneDot[selected.tone],
              )}
            />
          )}
          <span className="min-w-0 flex-1 truncate font-medium text-[var(--foreground)]">
            {selected?.label}
          </span>
          <ChevronDown
            aria-hidden="true"
            className={cn(
              'h-4 w-4 shrink-0 text-[var(--muted-foreground)] transition-transform duration-150',
              open && 'rotate-180',
            )}
          />
        </button>

        {open && !disabled && (
          <div
            ref={menu}
            id={listboxId}
            role="listbox"
            aria-label={resolvedAriaLabel}
            className={cn(
              'absolute z-40 min-w-full overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-1.5 shadow-[var(--shadow-lg)]',
              'w-[max(100%,16rem)]',
              align === 'right' ? 'right-0' : 'left-0',
              dropUp ? 'bottom-full mb-2' : 'top-full mt-2',
              panelClassName,
            )}
          >
            <div className="max-h-64 space-y-0.5 overflow-y-auto overscroll-contain p-0.5">
              {options.map((option) => {
                const isSelected = option.value === value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => {
                      onChange(option.value);
                      setOpen(false);
                    }}
                    className={cn(
                      'flex w-full items-start gap-2.5 rounded-lg px-3 py-2.5 text-left transition-colors',
                      isSelected
                        ? 'bg-[var(--accent-soft)] text-[var(--foreground)]'
                        : 'text-[var(--foreground)] hover:bg-[var(--surface-hover)]',
                    )}
                  >
                    {option.tone ? (
                      <span
                        aria-hidden="true"
                        className={cn(
                          'mt-1.5 h-2 w-2 shrink-0 rounded-full',
                          toneDot[option.tone],
                        )}
                      />
                    ) : null}
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium leading-5">
                        {option.label}
                      </span>
                      {option.description && (
                        <span className="mt-0.5 block text-xs leading-4 text-[var(--muted-foreground)]">
                          {option.description}
                        </span>
                      )}
                    </span>
                    <Check
                      aria-hidden="true"
                      className={cn(
                        'mt-0.5 h-4 w-4 shrink-0 text-[var(--accent)] transition-opacity',
                        isSelected ? 'opacity-100' : 'opacity-0',
                      )}
                    />
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {hint && (
        <p id={hintId} className="mt-2 text-xs text-[var(--muted-foreground)]">
          {hint}
        </p>
      )}
    </div>
  );
}
