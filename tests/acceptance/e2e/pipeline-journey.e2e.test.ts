/**
 * @behavior Users can create a workflow and trigger a run from the UI
 * @user-story US-005: Workflow Creation, US-006: Workflow Execution
 * @boundary UI (Playwright)
 */
import { test, expect } from '@playwright/test';

test.describe('Workflow Creation & Execution Journey (E2E Acceptance)', () => {
  // Assumes authenticated user with existing project and destination

  test('should create a workflow through the wizard', async ({ page }) => {
    // GIVEN I am on the workflows page
    await page.goto('/dashboard/workflows');

    // WHEN I click "Create Workflow"
    await page.click('[data-testid="create-workflow"]');

    // ── Step 1: Name & Description ──
    await page.fill('[data-testid="workflow-name"]', 'E2E Test Workflow');
    await page.fill('[data-testid="workflow-description"]', 'Created by E2E test');
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

    // THEN I should see the workflow in the list
    await expect(page).toHaveURL(/\/dashboard\/workflows/);
    await expect(page.locator('text=E2E Test Workflow')).toBeVisible();
  });

  test('should run a workflow and show live progress', async ({ page }) => {
    // GIVEN I am on a workflow detail page
    await page.goto('/dashboard/workflows');
    await page.click('text=E2E Test Workflow');

    // WHEN I click "Run Now"
    await page.click('[data-testid="run-now"]');

    // THEN I should see the status change to "running"
    await expect(page.locator('[data-testid="workflow-status"]')).toContainText(/queued|running/);

    // AND the command ticker should show a workflow event
    await expect(page.locator('[data-testid="command-ticker"]')).toContainText(/Workflow/);
  });
});
