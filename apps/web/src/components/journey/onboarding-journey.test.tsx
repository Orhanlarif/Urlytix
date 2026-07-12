import { render, screen } from '@testing-library/react';
import { BarChart3, Link2 } from 'lucide-react';
import { describe, expect, it } from 'vitest';
import { OnboardingJourney } from './onboarding-journey';

describe('OnboardingJourney', () => {
  it('points the primary action to the first incomplete step', () => {
    render(
      <OnboardingJourney
        title="Get started"
        description="Complete the journey"
        progressLabel="{completed}/{total} completed"
        steps={[
          {
            label: 'Create link',
            description: 'Done',
            href: '/links',
            actionLabel: 'Create',
            complete: true,
            icon: Link2,
          },
          {
            label: 'View analytics',
            description: 'Next',
            href: '/analytics',
            actionLabel: 'Open analytics',
            complete: false,
            icon: BarChart3,
          },
        ]}
      />,
    );

    expect(
      screen.getByRole('link', { name: 'Open analytics' }),
    ).toHaveAttribute('href', '/analytics');
    expect(screen.getByText('Create link')).toBeInTheDocument();
    expect(screen.getByText('View analytics')).toBeInTheDocument();
    expect(screen.getByText('1/2 completed')).toBeInTheDocument();
  });

  it('renders each incomplete step as a link to its own action href', () => {
    render(
      <OnboardingJourney
        title="Get started"
        description="Complete the journey"
        progressLabel="{completed}/{total} completed"
        steps={[
          {
            label: 'Create link',
            description: 'Create your first link',
            href: '/links',
            actionLabel: 'Create',
            complete: false,
            icon: Link2,
          },
          {
            label: 'View analytics',
            description: 'Check your traffic',
            href: '/analytics',
            actionLabel: 'Open analytics',
            complete: false,
            icon: BarChart3,
          },
        ]}
      />,
    );

    const createStepLink = screen.getByText('Create link').closest('a');
    expect(createStepLink).toHaveAttribute('href', '/links');

    const analyticsStepLink = screen.getByText('View analytics').closest('a');
    expect(analyticsStepLink).toHaveAttribute('href', '/analytics');

    expect(screen.getByText('0/2 completed')).toBeInTheDocument();
  });
});
