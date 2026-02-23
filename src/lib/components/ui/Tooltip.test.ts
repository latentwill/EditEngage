/**
 * @behavior Tooltip shows contextual information on hover with delayed appearance
 * @business_rule Tooltips must be accessible via aria-describedby and have 600ms delay
 */
import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Tooltip from './Tooltip.svelte';

describe('Tooltip', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders trigger element', () => {
    render(Tooltip, { props: { text: 'Help text' } });
    expect(screen.getByTestId('tooltip-trigger')).toBeDefined();
  });

  it('tooltip content is not visible initially', () => {
    render(Tooltip, { props: { text: 'Help text' } });
    expect(screen.queryByTestId('tooltip-content')).toBeNull();
  });

  it('shows tooltip content after hover delay', async () => {
    render(Tooltip, { props: { text: 'Help text' } });
    const trigger = screen.getByTestId('tooltip-trigger');
    await fireEvent.pointerEnter(trigger);
    vi.advanceTimersByTime(600);
    await vi.waitFor(() => {
      expect(screen.getByTestId('tooltip-content')).toBeDefined();
      expect(screen.getByTestId('tooltip-content').textContent).toContain('Help text');
    });
  });

  it('tooltip content has correct styling', async () => {
    render(Tooltip, { props: { text: 'Help text' } });
    const trigger = screen.getByTestId('tooltip-trigger');
    await fireEvent.pointerEnter(trigger);
    vi.advanceTimersByTime(600);
    await vi.waitFor(() => {
      const content = screen.getByTestId('tooltip-content');
      expect(content.className).toContain('bg-base-300');
      expect(content.className).toContain('text-xs');
      expect(content.className).toContain('rounded-md');
    });
  });

  it('trigger has aria-describedby linking to content', async () => {
    render(Tooltip, { props: { text: 'Help text' } });
    const trigger = screen.getByTestId('tooltip-trigger');
    // Melt UI sets aria-describedby on the trigger
    await fireEvent.pointerEnter(trigger);
    vi.advanceTimersByTime(600);
    await vi.waitFor(() => {
      expect(trigger.getAttribute('aria-describedby')).toBeTruthy();
    });
  });
});
