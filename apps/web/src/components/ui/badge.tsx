import { HTMLAttributes } from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type BadgeVariant = 'default' | 'accent' | 'success' | 'warning' | 'danger';

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant;
  dot?: boolean;
  icon?: LucideIcon;
};

const variantClasses: Record<BadgeVariant, string> = {
  default: 'border-[var(--border)] bg-[var(--surface-raised)] text-[var(--muted-foreground)]',
  accent: 'border-[var(--accent-border)] bg-[var(--accent-soft)] text-[var(--accent)]',
  success: 'border-[var(--success-border)] bg-[var(--success-muted)] text-[var(--success)]',
  warning: 'border-[var(--warning-border)] bg-[var(--warning-muted)] text-[var(--warning)]',
  danger: 'border-[var(--danger-border)] bg-[var(--danger-muted)] text-[var(--danger)]',
};

const dotClasses: Record<BadgeVariant, string> = {
  default: 'bg-[var(--muted-foreground)]',
  accent: 'bg-[var(--accent)]',
  success: 'bg-[var(--success)]',
  warning: 'bg-[var(--warning)]',
  danger: 'bg-[var(--danger)]',
};

export function Badge({
  variant = 'default',
  dot = false,
  icon: Icon,
  className,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium',
        variantClasses[variant],
        className,
      )}
      {...props}
    >
      {dot && <span aria-hidden="true" className={cn('h-1.5 w-1.5 rounded-full', dotClasses[variant])} />}
      {Icon && <Icon className="h-3 w-3" />}
      {children}
    </span>
  );
}
