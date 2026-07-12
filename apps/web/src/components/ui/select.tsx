import { SelectHTMLAttributes } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Select({
  label,
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { label?: string }) {
  return (
    <label className="block">
      {label && <span className="text-sm font-medium text-[var(--muted)]">{label}</span>}
      <span className={cn('relative block', label && 'mt-2')}>
        <select
          {...props}
          className={cn(
            'min-h-[var(--control-height)] w-full appearance-none rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 pr-9 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20 disabled:cursor-not-allowed disabled:bg-[var(--surface-raised)] disabled:text-[var(--muted-foreground)]',
            className,
          )}
        >
          {children}
        </select>
        <ChevronDown
          aria-hidden="true"
          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]"
        />
      </span>
    </label>
  );
}
