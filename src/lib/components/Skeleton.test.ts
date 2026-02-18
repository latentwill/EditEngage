/**
 * @behavior Skeleton component renders a daisyUI skeleton placeholder for loading states
 * @business_rule Consistent loading UX across the application
 */
import { render } from '@testing-library/svelte';
import { describe, it, expect } from 'vitest';
import Skeleton from './Skeleton.svelte';

describe('Skeleton', () => {
  it('renders with daisyUI skeleton class', () => {
    const { container } = render(Skeleton);
    const el = container.querySelector('div');
    expect(el).not.toBeNull();
    expect(el?.classList.contains('skeleton')).toBe(true);
  });

  it('accepts width and height props', () => {
    const { container } = render(Skeleton, {
      props: { width: '200px', height: '24px' }
    });
    const el = container.querySelector('[class*="skeleton"]');
    expect(el).not.toBeNull();
    expect((el as HTMLElement).style.width).toBe('200px');
    expect((el as HTMLElement).style.height).toBe('24px');
  });
});
