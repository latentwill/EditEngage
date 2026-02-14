/**
 * @behavior Users can create a pipeline and trigger a run from the UI
 * @user-story US-005: Pipeline Creation, US-006: Pipeline Execution
 * @boundary UI (Playwright)
 */
import { test, expect } from '@playwright/test';

test.describe('Pipeline Creation & Execution Journey (E2E Acceptance)', () => {
  // Assumes authenticated user with existing project and destination

  test('should create a pipeline through the wizard', async ({ page }) => {
    // GIVEN I am on the pipelines page
    await page.goto('/dashboard/pipelines');

    // WHEN I click "Create Pipeline"
    await page.click('[data-testid="create-pipeline"]');

    // ── Step 1: Name & Description ──
    await page.fill('[data-testid="pipeline-name"]', 'E2E Test Pipeline');
    await page.fill('[data-testid="pipeline-description"]', 'Created by E2E test');
    await page.click('[data-testid="wizard-next"]');

    // ── Step 2: Select Agents ──
    await page.click('[data-testid="agent-card-topic_queue"]');
    await page.click('[data-testid="agent-card-variety_engine"]');
    await page.click('[data-testid="agent-card-seo_writer"]');
    await page.click('[data-testid="agent-card-ghost_publisher"]');
    await page.click('[data-testid="wizard-next"]');

    // ── Step 3: Configure Agents ──
    // Each agent should show its config form
    await expect(page.locator('[data-testid="agent-config-topic_queue"]')).toBeVisible();
    await page.click('[data-testid="wizard-next"]');

    // ── Step 4: Schedule & Review Mode ──
    await page.click('[data-testid="review-mode-draft_for_review"]');
    await page.click('[data-testid="wizard-next"]');

    // ── Step 5: Destination & Save ──
    await page.click('[data-testid="destination-option"]:first-child');
    await page.click('[data-testid="wizard-save"]');

    // THEN I should see the pipeline in the list
    await expect(page).toHaveURL(/\/dashboard\/pipelines/);
    await expect(page.locator('text=E2E Test Pipeline')).toBeVisible();
  });

  test('should run a pipeline and show live progress', async ({ page }) => {
    // GIVEN I am on a pipeline detail page
    await page.goto('/dashboard/pipelines');
    await page.click('text=E2E Test Pipeline');

    // WHEN I click "Run Now"
    await page.click('[data-testid="run-now"]');

    // THEN I should see the status change to "running"
    await expect(page.locator('[data-testid="pipeline-status"]')).toContainText(/queued|running/);

    // AND the command ticker should show a pipeline event
    await expect(page.locator('[data-testid="command-ticker"]')).toContainText(/Pipeline/);
  });
});
