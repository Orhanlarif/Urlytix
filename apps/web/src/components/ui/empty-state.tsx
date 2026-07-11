import { LucideIcon } from 'lucide-react';
import { ReactNode } from 'react';

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/50 px-6 py-10 text-center">
      {Icon && <Icon className="mx-auto h-8 w-8 text-slate-500" />}
      <h3 className="mt-3 font-medium text-slate-200">{title}</h3>
      <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
