/**
 * @behavior GlassCard renders a styled card container with variant-based layouts and grid tick decoration
 * @business_rule Consistent card aesthetic using Slate & Copper design tokens with hover interactions
 */
import { render, screen } from '@testing-library/svelte';
import { describe, it, expect } from 'vitest';
import GlassCard from './GlassCard.svelte';

describe('GlassCard', () => {
  it('renders children in a daisyUI card container', () => {
    const { container } = render(GlassCard);
    const card = container.querySelector('[data-testid="card"]');
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
    const card = container.querySelector('[data-testid="card"]');
    expect(card).not.toBeNull();
    const className = card!.className;
    expect(className).toContain('card');
    expect(className).toContain('bg-base-200');
    expect(className).toContain('shadow-xl');
  });

  it('has data-testid="card" on the main container', () => {
    const { container } = render(GlassCard);
    const card = container.querySelector('[data-testid="card"]');
    expect(card).not.toBeNull();
  });

  it('uses bg-base-200 surface and does not have backdrop-blur or glass classes', () => {
    const { container } = render(GlassCard);
    const card = container.querySelector('[data-testid="card"]');
    expect(card).not.toBeNull();
    const className = card!.className;
    expect(className).toContain('bg-base-200');
    expect(className).not.toContain('backdrop-blur');
    expect(className).not.toContain('glass');
  });

  it('hover state applies border-strong class', () => {
    const { container } = render(GlassCard, { props: { hover: true } });
    const card = container.querySelector('[data-testid="card"]');
    expect(card).not.toBeNull();
    const className = card!.className;
    expect(className).toContain('hover:border-[--border-strong]');
  });

  it('has a grid tick element with + character', () => {
    const { container } = render(GlassCard);
    const tick = container.querySelector('[data-testid="card-grid-tick"]');
    expect(tick).not.toBeNull();
    expect(tick!.textContent).toBe('+');
  });

  it('has rounded-xl and border using --border token', () => {
    const { container } = render(GlassCard);
    const card = container.querySelector('[data-testid="card"]');
    expect(card).not.toBeNull();
    const className = card!.className;
    expect(className).toContain('rounded-xl');
    expect(className).toContain('border');
    expect(className).toContain('border-[--border]');
  });

  it('hover applies spring scale class', () => {
    const { container } = render(GlassCard, { props: { hover: true } });
    const card = container.querySelector('[data-testid="card"]');
    expect(card).not.toBeNull();
    const className = card!.className;
    expect(className).toContain('hover:scale-[1.002]');
  });
});
