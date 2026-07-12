import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Modal } from './modal';

describe('Modal', () => {
  it('closes with Escape and restores focus', () => {
    const onClose = vi.fn();
    const trigger = document.createElement('button');
    document.body.appendChild(trigger);
    trigger.focus();

    const { rerender } = render(
      <Modal open onClose={onClose} title="Accessible dialog">
        <button type="button">Action</button>
      </Modal>,
    );

    expect(screen.getByRole('dialog')).toHaveFocus();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledOnce();

    rerender(
      <Modal open={false} onClose={onClose} title="Accessible dialog">
        <button type="button">Action</button>
      </Modal>,
    );
    expect(trigger).toHaveFocus();
    trigger.remove();
  });

  it('cycles keyboard focus inside the dialog', () => {
    render(
      <Modal open onClose={vi.fn()} title="Accessible dialog">
        <button type="button">First</button>
        <button type="button">Last</button>
      </Modal>,
    );

    const close = screen.getByRole('button', { name: 'Close' });
    const last = screen.getByRole('button', { name: 'Last' });
    last.focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(close).toHaveFocus();
  });
});
