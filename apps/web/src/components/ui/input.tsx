'use client';

import { Eye, EyeOff } from 'lucide-react';
import { InputHTMLAttributes, forwardRef, useId, useState } from 'react';
import { useLanguage } from '@/i18n/language-provider';
import { cn } from '@/lib/utils';

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  hint?: string;
  error?: string;
  /** Renders an eye toggle when the field is a password input. */
  showPasswordToggle?: boolean;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, className, id, showPasswordToggle, type, ...props },
  ref,
) {
  const { t } = useLanguage();
  const generatedId = useId();
  const inputId = id ?? props.name;
  const resolvedInputId = inputId ?? generatedId;
  const hintId = `${resolvedInputId}-hint`;
  const errorId = `${resolvedInputId}-error`;
  const [visible, setVisible] = useState(false);

  const isPasswordField = type === 'password' || showPasswordToggle;
  const useToggle = Boolean(showPasswordToggle && isPasswordField);
  const resolvedType = useToggle ? (visible ? 'text' : 'password') : type;

  return (
    <div>
      {label && (
        <label
          htmlFor={resolvedInputId}
          className="mb-2 block text-sm font-medium text-[var(--muted)]"
        >
          {label}
        </label>
      )}

      <div className={cn(useToggle && 'relative')}>
        <input
          ref={ref}
          id={resolvedInputId}
          type={resolvedType}
          aria-describedby={error ? errorId : hint ? hintId : undefined}
          aria-invalid={Boolean(error)}
          className={cn(
            'min-h-[var(--control-height)] w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm text-[var(--foreground)] outline-none transition placeholder:text-[var(--muted-foreground)]/70 focus:border-[var(--accent)] focus:ring-2 focus:ring-inset focus:ring-[var(--accent)]/30 disabled:cursor-not-allowed disabled:bg-[var(--surface-raised)] disabled:text-[var(--muted-foreground)]',
            useToggle && 'pr-11',
            error &&
              'border-[var(--danger)]/50 focus:border-[var(--danger)] focus:ring-[var(--danger)]/25',
            className,
          )}
          {...props}
        />

        {useToggle && (
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setVisible((current) => !current)}
            aria-label={visible ? t.common.hidePassword : t.common.showPassword}
            aria-pressed={visible}
            className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-[var(--muted-foreground)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/30"
          >
            {visible ? (
              <EyeOff className="h-4 w-4" aria-hidden />
            ) : (
              <Eye className="h-4 w-4" aria-hidden />
            )}
          </button>
        )}
      </div>

      {hint && !error && (
        <p id={hintId} className="mt-2 text-xs text-[var(--muted-foreground)]">
          {hint}
        </p>
      )}

      {error && (
        <p id={errorId} className="mt-2 text-xs text-[var(--danger)]">
          {error}
        </p>
      )}
    </div>
  );
});
