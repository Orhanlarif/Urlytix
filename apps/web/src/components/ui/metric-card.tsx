import { formatNumber } from '@/lib/format';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

type MetricCardProps = {
  title: string;
  value: number;
  description?: string;
  icon?: LucideIcon;
  trend?: string;
};

export function MetricCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
}: MetricCardProps) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl shadow-black/10 transition hover:border-slate-700">
      <div className="flex items-start justify-between gap-4">
        <p className="text-sm text-slate-400">{title}</p>
        {Icon && (
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/10">
            <Icon className="h-4 w-4 text-cyan-300" />
          </div>
        )}
      </div>

      <p className="mt-3 text-4xl font-bold tracking-tight">
        {formatNumber(value)}
      </p>

      {(description || trend) && (
        <div className="mt-2 flex items-center gap-2">
          {trend && (
            <span className="text-xs font-medium text-emerald-400">{trend}</span>
          )}
          {description && (
            <p className={cn('text-xs text-slate-500', trend && 'text-slate-600')}>
              {description}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
