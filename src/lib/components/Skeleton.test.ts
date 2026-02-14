/**
 * @behavior Skeleton component renders a pulsing placeholder for loading states
 * @business_rule Consistent loading UX across the application
 */
import { render } from '@testing-library/svelte';
import { describe, it, expect } from 'vitest';
import Skeleton from './Skeleton.svelte';

describe('Skeleton', () => {
  it('renders with animate-pulse class', () => {
    const { container } = render(Skeleton);
    const el = container.querySelector('[class*="animate-pulse"]');
    expect(el).not.toBeNull();
  });

  it('accepts width and height props', () => {
    const { container } = render(Skeleton, {
      props: { width: '200px', height: '24px' }
    });
    const el = container.querySelector('[class*="animate-pulse"]');
    expect(el).not.toBeNull();
    expect((el as HTMLElement).style.width).toBe('200px');
    expect((el as HTMLElement).style.height).toBe('24px');
  });
});
