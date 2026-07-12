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
    <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--border-strong)] bg-[var(--surface)]/50 px-6 py-10 text-center">
      {Icon && (
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[var(--accent-soft)]">
          <Icon className="h-6 w-6 text-[var(--accent)]" />
        </div>
      )}
      <h3 className="mt-4 text-heading">{title}</h3>
      <p className="mx-auto mt-2 max-w-sm text-sm text-[var(--muted-foreground)]">{description}</p>
      {action && <div className="mt-6 flex justify-center">{action}</div>}
    </div>
  );
}
