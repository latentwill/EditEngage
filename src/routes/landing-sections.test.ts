/**
 * @behavior Landing page secondary sections render feature grid, productivity
 * block, and pricing cards to communicate product value and drive conversion
 * @business_rule Feature, productivity, and pricing sections must clearly
 * articulate capabilities and pricing tiers
 */
import { render, screen } from '@testing-library/svelte';
import { describe, it, expect } from 'vitest';
import Page from './+page.svelte';

describe('Landing Page - Feature Grid', () => {
  it('renders feature grid section with feature items', () => {
    render(Page);

    const featureGrid = screen.getByTestId('feature-grid');
    expect(featureGrid).toBeInTheDocument();

    const featureItems = screen.getAllByTestId('feature-item');
    expect(featureItems.length).toBeGreaterThanOrEqual(4);
  });

  it('feature items have icons and descriptions', () => {
    render(Page);

    const featureItems = screen.getAllByTestId('feature-item');
    featureItems.forEach((item) => {
      // Each feature item should have an icon container and text description
      const icon = item.querySelector('[data-testid="feature-icon"]');
      expect(icon).not.toBeNull();

      const description = item.querySelector('[data-testid="feature-description"]');
      expect(description).not.toBeNull();
      expect(description!.textContent!.trim().length).toBeGreaterThan(0);
    });
  });
});

describe('Landing Page - Productivity Block', () => {
  it('renders dark section with numbered steps', () => {
    render(Page);

    const productivityBlock = screen.getByTestId('productivity-block');
    expect(productivityBlock).toBeInTheDocument();

    // Should have numbered steps (at least 3)
    const steps = productivityBlock.querySelectorAll('[data-testid="productivity-step"]');
    expect(steps.length).toBeGreaterThanOrEqual(3);
  });
});

describe('Landing Page - Pricing Grid', () => {
  it('renders 3 plan cards', () => {
    render(Page);

    const pricingGrid = screen.getByTestId('pricing-grid');
    expect(pricingGrid).toBeInTheDocument();

    const pricingCards = screen.getAllByTestId('pricing-card');
    expect(pricingCards.length).toBe(3);
  });

  it('each pricing card has a features list and CTA', () => {
    render(Page);

    const pricingCards = screen.getAllByTestId('pricing-card');
    pricingCards.forEach((card) => {
      // Should have a features list
      const featuresList = card.querySelector('[data-testid="pricing-features"]');
      expect(featuresList).not.toBeNull();

      const features = featuresList!.querySelectorAll('li');
      expect(features.length).toBeGreaterThan(0);

      // Should have a CTA button or link
      const cta = card.querySelector('[data-testid="pricing-cta"]');
      expect(cta).not.toBeNull();
    });
  });
});
