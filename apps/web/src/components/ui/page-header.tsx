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
    <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
      <div>
        <Badge variant="accent" className="mb-4">
          {badge}
        </Badge>

        <h1 className="text-heading-lg">{title}</h1>

        <p className="text-body mt-3 max-w-2xl">{description}</p>
      </div>

      {action}
    </div>
  );
}
