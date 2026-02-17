/**
 * @behavior Landing page has navigation, footer, and decorative elements for professional presentation
 * @business_rule Complete landing page with nav and footer increases credibility and conversion
 */
import { render, screen } from '@testing-library/svelte';
import { describe, it, expect } from 'vitest';
import Page from './+page.svelte';

describe('Landing Page - Navigation', () => {
  it('renders a navigation bar with logo and CTA links', () => {
    render(Page);
    const nav = screen.getByTestId('landing-nav');
    expect(nav).toBeInTheDocument();
    expect(nav.className).toMatch(/fixed|sticky/);
    // Should have logo text
    expect(nav.textContent).toMatch(/editengage/i);
    // Should have sign in link
    const signInLink = nav.querySelector('a[href="/auth/login"]');
    expect(signInLink).not.toBeNull();
  });
});

describe('Landing Page - Footer', () => {
  it('renders footer with brand and tagline', () => {
    render(Page);
    const footer = screen.getByTestId('landing-footer');
    expect(footer).toBeInTheDocument();
    expect(footer.textContent).toMatch(/editengage/i);
    expect(footer.textContent).toMatch(/built with ai/i);
  });
});

describe('Landing Page - Decorative Elements', () => {
  it('renders floating decorative shapes in hero', () => {
    render(Page);
    const shapes = screen.getAllByTestId('floating-shape');
    expect(shapes.length).toBeGreaterThanOrEqual(2);
    shapes.forEach(shape => {
      expect(shape.className).toMatch(/absolute/);
      expect(shape.className).toMatch(/blur/);
    });
  });
});
