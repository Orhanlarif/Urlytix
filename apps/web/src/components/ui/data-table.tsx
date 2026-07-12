import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function DataTable({
  headings,
  children,
  stickyHeader = false,
  zebra = false,
}: {
  headings: string[];
  children: ReactNode;
  stickyHeader?: boolean;
  zebra?: boolean;
}) {
  return (
    <div
      className={cn(
        'overflow-x-auto rounded-[var(--radius-lg)] border border-[var(--border)]',
        stickyHeader && 'max-h-[70vh]',
      )}
    >
      <table className="w-full min-w-[680px] border-collapse text-left text-sm">
        <thead
          className={cn(
            'bg-[var(--surface)] text-xs uppercase tracking-wide text-[var(--muted-foreground)]',
            stickyHeader && 'sticky top-0 z-10',
          )}
        >
          <tr>
            {headings.map((heading) => (
              <th key={heading} scope="col" className="px-4 py-3 font-medium">
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody
          className={cn(
            'divide-y divide-[var(--border)] bg-[var(--surface)]/50 [&>tr]:transition-colors [&>tr]:hover:bg-[var(--surface-hover)]',
            zebra && '[&>tr:nth-child(even)]:bg-[var(--surface-raised)]/40',
          )}
        >
          {children}
        </tbody>
      </table>
    </div>
  );
}
