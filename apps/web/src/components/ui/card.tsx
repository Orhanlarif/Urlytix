import { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

type CardProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  padding?: 'sm' | 'md' | 'lg';
  hover?: boolean;
};

const paddingClasses = {
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

export function Card({
  children,
  padding = 'md',
  hover = false,
  className,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        'rounded-[var(--radius-lg)] border border-[var(--card-border)] bg-[var(--card)] shadow-[var(--shadow-sm)]',
        paddingClasses[padding],
        hover &&
          'transition-all duration-200 ease-[var(--ease-out)] hover:-translate-y-0.5 hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-md)]',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

type CardHeaderProps = {
  title: string;
  description?: string;
  action?: ReactNode;
};

export function CardHeader({ title, description, action }: CardHeaderProps) {
  return (
    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
      <div>
        <h2 className="text-heading">{title}</h2>
        {description && (
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}
