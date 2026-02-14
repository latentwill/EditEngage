/**
 * @behavior Landing page renders all sections with glassmorphism design
 * @user-story US-019: Landing Page
 * @boundary UI (Playwright)
 */
import { test, expect } from '@playwright/test';

test.describe('Landing Page (E2E Acceptance)', () => {
  test('should render hero section with glassmorphism design', async ({ page }) => {
    // GIVEN I am a visitor
    await page.goto('/');

    // THEN I should see the hero section
    const hero = page.locator('[data-testid="hero-section"]');
    await expect(hero).toBeVisible();

    // AND it should contain headline, subheadline, and CTA
    await expect(hero.locator('h1')).toBeVisible();
    await expect(hero.locator('[data-testid="hero-cta"]')).toBeVisible();

    // AND it should have glass stat cards
    const statCards = hero.locator('[data-testid="hero-stat-card"]');
    await expect(statCards).toHaveCount(3); // or however many designed
  });

  test('should render feature grid section', async ({ page }) => {
    await page.goto('/');

    // WHEN I scroll to the feature section
    const featureSection = page.locator('[data-testid="feature-grid"]');
    await featureSection.scrollIntoViewIfNeeded();

    // THEN I should see feature items
    await expect(featureSection).toBeVisible();
    const featureItems = featureSection.locator('[data-testid="feature-item"]');
    expect(await featureItems.count()).toBeGreaterThan(0);
  });

  test('should render pricing section with 3 plans', async ({ page }) => {
    await page.goto('/');

    // WHEN I scroll to pricing
    const pricing = page.locator('[data-testid="pricing-grid"]');
    await pricing.scrollIntoViewIfNeeded();

    // THEN I should see 3 pricing cards
    await expect(pricing).toBeVisible();
    const plans = pricing.locator('[data-testid="pricing-card"]');
    await expect(plans).toHaveCount(3);
  });

  test('should toggle dark/light theme', async ({ page }) => {
    await page.goto('/');

    // GIVEN I see the theme toggle
    const toggle = page.locator('[data-testid="theme-toggle"]');
    await expect(toggle).toBeVisible();

    // WHEN I click the theme toggle
    await toggle.click();

    // THEN the html element should not have the 'dark' class (toggled to light)
    const htmlClass = await page.locator('html').getAttribute('class');
    expect(htmlClass).not.toContain('dark');

    // WHEN I click again
    await toggle.click();

    // THEN dark mode is restored
    const restoredClass = await page.locator('html').getAttribute('class');
    expect(restoredClass).toContain('dark');
  });

  test('should be mobile responsive', async ({ page }) => {
    // GIVEN I am on a mobile viewport
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');

    // THEN the hamburger menu should be visible
    await expect(page.locator('[data-testid="hamburger-menu"]')).toBeVisible();

    // AND the desktop nav links should be hidden
    await expect(page.locator('[data-testid="desktop-nav-links"]')).not.toBeVisible();
  });
});
