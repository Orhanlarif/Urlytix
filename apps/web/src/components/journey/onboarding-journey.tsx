import Link from 'next/link';
import { CheckCircle2, Circle, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader } from '@/components/ui/card';
import { interpolate } from '@/i18n';
import { cn } from '@/lib/utils';

export type JourneyStep = {
  label: string;
  description: string;
  href: string;
  actionLabel: string;
  complete: boolean;
  icon: LucideIcon;
  openInNewTab?: boolean;
};

export function OnboardingJourney({
  title,
  description,
  steps,
  progressLabel,
}: {
  title: string;
  description: string;
  steps: JourneyStep[];
  progressLabel: string;
}) {
  const nextStep = steps.find((step) => !step.complete);
  const completedCount = steps.filter((step) => step.complete).length;
  const progressPercent =
    steps.length > 0 ? Math.round((completedCount / steps.length) * 100) : 0;

  return (
    <Card className="mt-8 border-[var(--accent-border)] bg-[var(--accent-soft)]">
      <CardHeader
        title={title}
        description={description}
        action={
          nextStep && (
            <Link
              href={nextStep.href}
              {...(nextStep.openInNewTab
                ? { target: '_blank', rel: 'noreferrer' }
                : {})}
            >
              <Button size="sm">{nextStep.actionLabel}</Button>
            </Link>
          )
        }
      />

      <div className="mt-5">
        <div className="flex items-center justify-between text-xs text-[var(--muted-foreground)]">
          <span>
            {interpolate(progressLabel, {
              completed: String(completedCount),
              total: String(steps.length),
            })}
          </span>
          <span>{progressPercent}%</span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--surface-raised)]">
          <div
            className="h-full rounded-full bg-[var(--accent)] transition-all duration-300 ease-[var(--ease-out)]"
            style={{
              width: `${completedCount > 0 ? Math.max(progressPercent, 6) : 0}%`,
            }}
          />
        </div>
      </div>

      <ol className="mt-6 grid gap-3 md:grid-cols-3">
        {steps.map((step) => {
          const Icon = step.icon;
          const cardClassName = cn(
            'block rounded-2xl border p-4 transition',
            step.complete
              ? 'border-[var(--success-border)] bg-[var(--success-muted)]'
              : 'border-[var(--border)] bg-[var(--surface)]/80 hover:border-[var(--accent-border)] hover:bg-[var(--surface-hover)]',
          );

          const content = (
            <>
              <div className="flex items-start justify-between gap-3">
                <Icon className="h-5 w-5 text-[var(--accent)]" aria-hidden="true" />
                {step.complete ? (
                  <CheckCircle2
                    className="h-5 w-5 text-[var(--success)]"
                    aria-hidden="true"
                  />
                ) : (
                  <Circle
                    className="h-5 w-5 text-[var(--muted-foreground)]"
                    aria-hidden="true"
                  />
                )}
              </div>
              <p className="mt-4 font-medium text-[var(--foreground)]">{step.label}</p>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                {step.description}
              </p>
            </>
          );

          return (
            <li key={step.label}>
              {step.complete ? (
                <div className={cardClassName}>{content}</div>
              ) : (
                <Link
                  href={step.href}
                  className={cardClassName}
                  {...(step.openInNewTab
                    ? { target: '_blank', rel: 'noreferrer' }
                    : {})}
                >
                  {content}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </Card>
  );
}
