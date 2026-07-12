import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
type ButtonSize = 'sm' | 'md' | 'lg';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
};

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-[var(--accent)] text-[var(--accent-foreground)] shadow-[var(--shadow-glow)] hover:bg-[var(--accent-hover)] active:bg-[var(--accent-active)]',
  secondary:
    'border border-[var(--border)] bg-[var(--surface-raised)] text-[var(--foreground)] hover:bg-[var(--surface-hover)] active:bg-[var(--surface-hover)]',
  ghost:
    'border border-transparent text-[var(--muted-foreground)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)] active:bg-[var(--surface-hover)]',
  danger:
    'border border-[var(--danger-border)] bg-[var(--danger-muted)] text-[var(--danger)] hover:bg-[var(--danger-border)] active:bg-[var(--danger-border)]',
  outline:
    'border border-[var(--border)] text-[var(--foreground)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)] active:bg-[var(--surface-hover)]',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-3 py-2 text-sm',
  md: 'px-4 py-2.5 text-sm',
  lg: 'px-6 py-3 text-base',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      variant = 'primary',
      size = 'md',
      fullWidth = false,
      className,
      disabled,
      ...props
    },
    ref,
  ) {
    return (
      <button
        ref={ref}
        disabled={disabled}
        className={cn(
          'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-150 ease-[var(--ease-out)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/50 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100',
          variantClasses[variant],
          sizeClasses[size],
          fullWidth && 'w-full',
          className,
        )}
        {...props}
      />
    );
  },
);
