import { formatNumber } from '@/lib/format';

type MetricCardProps = {
  title: string;
  value: number;
  description?: string;
};

export function MetricCard({ title, value, description }: MetricCardProps) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-black/10">
      <p className="text-sm text-slate-400">{title}</p>
      <p className="mt-3 text-4xl font-bold">{formatNumber(value)}</p>

      {description && (
        <p className="mt-2 text-xs text-slate-500">{description}</p>
      )}
    </div>
  );
}