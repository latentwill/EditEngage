/**
 * @behavior Dialog provides an accessible modal overlay with focus management
 * @business_rule Modal dialogs must trap focus and be dismissible via keyboard
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import { describe, it, expect } from 'vitest';
import Dialog from './Dialog.svelte';

describe('Dialog', () => {
  it('renders trigger button', () => {
    render(Dialog);
    expect(screen.getByTestId('dialog-trigger')).toBeDefined();
  });

  it('opens dialog content when trigger is clicked', async () => {
    render(Dialog);
    const trigger = screen.getByTestId('dialog-trigger');
    await fireEvent.click(trigger);
    expect(screen.getByTestId('dialog-content')).toBeDefined();
  });

  it('closes dialog when close button is clicked', async () => {
    render(Dialog);
    await fireEvent.click(screen.getByTestId('dialog-trigger'));
    expect(screen.getByTestId('dialog-content')).toBeDefined();
    await fireEvent.click(screen.getByTestId('dialog-close'));
    // After close, content should be removed (wait for Svelte reactivity)
    await waitFor(() => {
      expect(screen.queryByTestId('dialog-content')).toBeNull();
    });
  });

  it('has circuit trace corner decoration', async () => {
    render(Dialog);
    await fireEvent.click(screen.getByTestId('dialog-trigger'));
    const trace = screen.getByTestId('dialog-trace');
    expect(trace).toBeDefined();
    expect(trace.className).toContain('border-l');
    expect(trace.className).toContain('border-b');
  });

  it('has overlay backdrop', async () => {
    render(Dialog);
    await fireEvent.click(screen.getByTestId('dialog-trigger'));
    const overlay = screen.getByTestId('dialog-overlay');
    expect(overlay.className).toContain('fixed');
    expect(overlay.className).toContain('inset-0');
  });

  it('dialog content has correct surface styling', async () => {
    render(Dialog);
    await fireEvent.click(screen.getByTestId('dialog-trigger'));
    const content = screen.getByTestId('dialog-content');
    expect(content.className).toContain('bg-base-200');
    expect(content.className).toContain('rounded-xl');
  });
});
