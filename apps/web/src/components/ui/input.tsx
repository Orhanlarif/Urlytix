import { InputHTMLAttributes, forwardRef, useId } from 'react';
import { cn } from '@/lib/utils';

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  hint?: string;
  error?: string;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, className, id, ...props },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? props.name;
  const resolvedInputId = inputId ?? generatedId;
  const hintId = `${resolvedInputId}-hint`;
  const errorId = `${resolvedInputId}-error`;

  return (
    <div>
      {label && (
        <label htmlFor={resolvedInputId} className="text-sm font-medium text-[var(--muted)]">
          {label}
        </label>
      )}

      <input
        ref={ref}
        id={resolvedInputId}
        aria-describedby={error ? errorId : hint ? hintId : undefined}
        aria-invalid={Boolean(error)}
        className={cn(
          'mt-2 min-h-[var(--control-height)] w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm text-[var(--foreground)] outline-none transition placeholder:text-[var(--muted-foreground)]/70 focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20 disabled:cursor-not-allowed disabled:bg-[var(--surface-raised)] disabled:text-[var(--muted-foreground)]',
          error && 'border-[var(--danger)]/50 focus:border-[var(--danger)] focus:ring-[var(--danger)]/20',
          className,
        )}
        {...props}
      />

      {hint && !error && (
        <p id={hintId} className="mt-2 text-xs text-[var(--muted-foreground)]">{hint}</p>
      )}

      {error && <p id={errorId} className="mt-2 text-xs text-[var(--danger)]">{error}</p>}
    </div>
  );
});
