/**
 * @behavior GlassCard renders a daisyUI card container with variant-based layouts
 * @business_rule Consistent card aesthetic using daisyUI theme tokens
 */
import { render, screen } from '@testing-library/svelte';
import { describe, it, expect } from 'vitest';
import GlassCard from './GlassCard.svelte';

describe('GlassCard', () => {
  it('renders children in a daisyUI card container', () => {
    const { container } = render(GlassCard);
    const card = container.querySelector('[class*="card"]');
    expect(card).not.toBeNull();
    expect(card!.className).toContain('bg-base-200');
  });

  it('stat variant renders with specific sizing', () => {
    const { container } = render(GlassCard, { props: { variant: 'stat' } });
    const card = container.querySelector('[data-variant="stat"]');
    expect(card).not.toBeNull();
  });

  it('feature variant renders with feature layout', () => {
    const { container } = render(GlassCard, { props: { variant: 'feature' } });
    const card = container.querySelector('[data-variant="feature"]');
    expect(card).not.toBeNull();
  });

  it('applies daisyUI card and shadow classes', () => {
    const { container } = render(GlassCard);
    const card = container.querySelector('[class*="card"]');
    expect(card).not.toBeNull();
    const className = card!.className;
    expect(className).toContain('card');
    expect(className).toContain('bg-base-200');
    expect(className).toContain('shadow-xl');
  });
});
