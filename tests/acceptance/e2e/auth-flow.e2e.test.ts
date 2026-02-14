/**
 * @behavior End-to-end auth flow: signup → dashboard → logout → login
 * @user-story US-001: User Registration & Authentication
 * @boundary UI (Playwright)
 */
import { test, expect } from '@playwright/test';

test.describe('Auth Flow (E2E Acceptance)', () => {
  const testEmail = `e2e-${Date.now()}@example.com`;
  const testPassword = 'SecurePass123!';

  test('should complete full auth lifecycle: signup → dashboard → logout → login', async ({ page }) => {
    // ── SIGNUP ──

    // GIVEN I am on the signup page
    await page.goto('/auth/signup');

    // WHEN I fill in valid credentials
    await page.fill('[data-testid="full-name"]', 'E2E Test User');
    await page.fill('[data-testid="email"]', testEmail);
    await page.fill('[data-testid="password"]', testPassword);
    await page.click('[data-testid="submit-signup"]');

    // THEN I should be redirected to the dashboard
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.locator('[data-testid="glass-nav"]')).toBeVisible();

    // ── LOGOUT ──

    // WHEN I click logout
    await page.click('[data-testid="user-avatar"]');
    await page.click('[data-testid="logout"]');

    // THEN I should be redirected to the landing page
    await expect(page).toHaveURL('/');

    // ── LOGIN ──

    // GIVEN I navigate to login
    await page.goto('/auth/login');

    // WHEN I fill in my credentials
    await page.fill('[data-testid="email"]', testEmail);
    await page.fill('[data-testid="password"]', testPassword);
    await page.click('[data-testid="submit-login"]');

    // THEN I should see the dashboard again
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.locator('[data-testid="glass-nav"]')).toBeVisible();
  });

  test('should redirect unauthenticated users to login', async ({ page }) => {
    // GIVEN I am not logged in
    // WHEN I navigate to a protected route
    await page.goto('/dashboard');

    // THEN I should be redirected to login
    await expect(page).toHaveURL(/\/auth\/login/);
  });
});
