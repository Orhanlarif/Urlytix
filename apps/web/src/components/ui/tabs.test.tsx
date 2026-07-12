import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Tabs } from './tabs';

describe('Tabs', () => {
  it('supports arrow, Home, and End keyboard navigation', () => {
    render(
      <Tabs
        tabs={[
          { id: 'general', label: 'General', content: 'General content' },
          { id: 'members', label: 'Members', content: 'Member content' },
          { id: 'domains', label: 'Domains', content: 'Domain content' },
        ]}
      />,
    );

    const general = screen.getByRole('tab', { name: 'General' });
    general.focus();
    fireEvent.keyDown(general, { key: 'ArrowRight' });
    expect(screen.getByRole('tab', { name: 'Members' })).toHaveAttribute(
      'aria-selected',
      'true',
    );

    fireEvent.keyDown(screen.getByRole('tab', { name: 'Members' }), {
      key: 'End',
    });
    expect(screen.getByRole('tab', { name: 'Domains' })).toHaveFocus();

    fireEvent.keyDown(screen.getByRole('tab', { name: 'Domains' }), {
      key: 'Home',
    });
    expect(general).toHaveFocus();
  });
});
