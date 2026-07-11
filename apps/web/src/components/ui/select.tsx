import { SelectHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export function Select({
  label,
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { label?: string }) {
  return (
    <label className="block">
      {label && <span className="mb-2 block text-sm text-slate-300">{label}</span>}
      <select
        {...props}
        className={cn(
          'h-11 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-slate-200 outline-none transition focus:border-cyan-400',
          className,
        )}
      >
        {children}
      </select>
    </label>
  );
}
