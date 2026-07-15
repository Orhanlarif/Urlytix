import { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';

type PageHeaderProps = {
  badge: string;
  title: string;
  description: string;
  action?: ReactNode;
};

export function PageHeader({
  badge,
  title,
  description,
  action,
}: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-3 sm:items-start sm:gap-4 lg:items-end">
      <div className="min-w-0 flex-1">
        <Badge variant="accent" className="mb-3 hidden sm:inline-flex sm:mb-4">
          {badge}
        </Badge>

        <h1 className="truncate">
          <span className="text-heading sm:hidden">{title}</span>
          <span className="hidden text-heading-lg sm:inline">{title}</span>
        </h1>

        <p className="text-body mt-3 hidden max-w-2xl sm:block">{description}</p>
      </div>

      {action ? (
        <div className="shrink-0 sm:pt-1 lg:pb-0.5">{action}</div>
      ) : null}
    </div>
  );
}
