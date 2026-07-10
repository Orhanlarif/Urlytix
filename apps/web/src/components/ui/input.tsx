import { InputHTMLAttributes, forwardRef } from 'react';
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
  const inputId = id ?? props.name;

  return (
    <div>
      {label && (
        <label htmlFor={inputId} className="text-sm text-slate-300">
          {label}
        </label>
      )}

      <input
        ref={ref}
        id={inputId}
        className={cn(
          'mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20',
          error && 'border-red-500/50 focus:border-red-400 focus:ring-red-400/20',
          className,
        )}
        {...props}
      />

      {hint && !error && (
        <p className="mt-2 text-xs text-slate-500">{hint}</p>
      )}

      {error && <p className="mt-2 text-xs text-red-300">{error}</p>}
    </div>
  );
});
