/**
 * @behavior Landing page hero section renders with headline, subheadline,
 * CTA button, and glass stat cards for marketing conversion
 * @business_rule Hero section is the primary acquisition surface and must
 * communicate value proposition clearly
 */
import { render, screen } from '@testing-library/svelte';
import { describe, it, expect } from 'vitest';
import Page from './+page.svelte';

describe('Landing Page - Hero Section', () => {
  it('renders hero section with min-height container', () => {
    render(Page);

    const hero = screen.getByTestId('hero-section');
    expect(hero).toBeInTheDocument();
    // Verify min-height is set via style or class
    const style = hero.getAttribute('style') || '';
    const className = hero.className || '';
    expect(style.includes('min-height') || className.includes('min-h')).toBe(true);
  });

  it('contains h1 headline and subheadline paragraph', () => {
    render(Page);

    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toBeInTheDocument();
    expect(heading.textContent).toBeTruthy();

    // Subheadline paragraph
    const subheadline = screen.getByTestId('hero-subheadline');
    expect(subheadline).toBeInTheDocument();
    expect(subheadline.tagName.toLowerCase()).toBe('p');
  });

  it('contains CTA button/link', () => {
    render(Page);

    const cta = screen.getByTestId('hero-cta');
    expect(cta).toBeInTheDocument();
  });

  it('renders glass stat cards, at least 3', () => {
    render(Page);

    const statCards = screen.getAllByTestId('hero-stat-card');
    expect(statCards.length).toBeGreaterThanOrEqual(3);
  });

  it('hero CTA links to /auth/signup', () => {
    render(Page);

    const cta = screen.getByTestId('hero-cta');
    expect(cta.getAttribute('href')).toBe('/auth/signup');
  });
});
