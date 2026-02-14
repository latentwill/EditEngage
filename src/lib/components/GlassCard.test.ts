/**
 * @behavior GlassCard renders a glassmorphism container with variant-based layouts
 * @business_rule Consistent glass aesthetic with blur, transparency, and border tokens
 */
import { render, screen } from '@testing-library/svelte';
import { describe, it, expect } from 'vitest';
import GlassCard from './GlassCard.svelte';

describe('GlassCard', () => {
  it('renders children in a container with backdrop-blur and glass classes', () => {
    const { container } = render(GlassCard);
    const card = container.querySelector('[class*="backdrop-blur"]');
    expect(card).not.toBeNull();
    expect(card!.className).toContain('border');
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

  it('applies CSS variable-based styling', () => {
    const { container } = render(GlassCard);
    const card = container.querySelector('[class*="backdrop-blur"]');
    expect(card).not.toBeNull();
    const className = card!.className;
    expect(className).toMatch(/bg-\[var\(--glass-bg\)\]/);
    expect(className).toMatch(/border-\[var\(--glass-border\)\]/);
  });
});
