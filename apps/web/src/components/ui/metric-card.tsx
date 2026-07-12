'use client';

import { formatNumber } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/i18n/language-provider';
import { LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';

type MetricCardProps = {
  title: string;
  value: number;
  description?: string;
  icon?: LucideIcon;
  trend?: string;
};

function trendTone(trend: string): 'success' | 'danger' | 'muted' {
  const trimmed = trend.trim();
  if (trimmed.startsWith('-')) return 'danger';
  if (trimmed.startsWith('+')) return 'success';
  return 'muted';
}

const trendToneClasses: Record<'success' | 'danger' | 'muted', string> = {
  success: 'text-[var(--success)]',
  danger: 'text-[var(--danger)]',
  muted: 'text-[var(--muted-foreground)]',
};

export function MetricCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
}: MetricCardProps) {
  const { locale } = useLanguage();

  return (
    <Card hover className="p-6">
      <div className="flex items-start justify-between gap-4">
        <p className="text-sm text-[var(--muted-foreground)]">{title}</p>
        {Icon && (
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--accent-border)] bg-[var(--accent-soft)]">
            <Icon className="h-4 w-4 text-[var(--accent)]" />
          </div>
        )}
      </div>

      <p className="mt-3 text-4xl font-bold tracking-tight">
        {formatNumber(value, locale)}
      </p>

      {(description || trend) && (
        <div className="mt-2 flex items-center gap-2">
          {trend && (
            <span className={cn('text-xs font-medium', trendToneClasses[trendTone(trend)])}>
              {trend}
            </span>
          )}
          {description && (
            <p className={cn('text-xs text-[var(--muted-foreground)]', trend && 'opacity-80')}>
              {description}
            </p>
          )}
        </div>
      )}
    </Card>
  );
}
