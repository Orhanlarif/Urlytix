import { cn } from '@/lib/utils';

type SkeletonSize = 'sm' | 'md' | 'lg';

const sizeClasses: Record<SkeletonSize, string> = {
  sm: 'h-3',
  md: 'h-4',
  lg: 'h-8',
};

export function Skeleton({
  className,
  size,
  width,
  height,
}: {
  className?: string;
  size?: SkeletonSize;
  width?: number | string;
  height?: number | string;
}) {
  return (
    <div
      aria-hidden="true"
      style={{ width, height }}
      className={cn(
        'skeleton-shimmer rounded-[var(--radius-md)] bg-[var(--surface-raised)]',
        !height && (size ? sizeClasses[size] : undefined),
        className,
      )}
    />
  );
}
