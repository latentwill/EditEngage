/**
 * @behavior Steps 3-5 of the PipelineWizard handle agent configuration,
 * scheduling, and destination selection. The final step saves the complete
 * pipeline via POST /api/v1/pipelines.
 * @business_rule Each agent must have valid config before proceeding. Schedule
 * defaults to draft_for_review review mode. The save action assembles all
 * wizard state into a single API call.
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import PipelineWizard from '../PipelineWizard.svelte';

// Helper to navigate through steps 1 and 2
async function navigateToStep(targetStep: number) {
  render(PipelineWizard);

  // Step 1: fill name
  const nameInput = screen.getByTestId('pipeline-name-input');
  await fireEvent.input(nameInput, { target: { value: 'Test Pipeline' } });

  const descInput = screen.getByTestId('pipeline-description-input');
  await fireEvent.input(descInput, { target: { value: 'A test pipeline' } });

  let nextBtn = screen.getByTestId('wizard-next-btn');
  await fireEvent.click(nextBtn);

  if (targetStep <= 2) return;

  // Step 2: select an agent
  const seoWriter = screen.getByTestId('agent-card-seo_writer');
  await fireEvent.click(seoWriter);

  nextBtn = screen.getByTestId('wizard-next-btn');
  await fireEvent.click(nextBtn);

  if (targetStep <= 3) return;

  // Step 3: fill config for seo_writer agent
  const configInput = screen.getByTestId('agent-config-seo_writer-target_keywords');
  await fireEvent.input(configInput, { target: { value: 'svelte, tdd' } });

  nextBtn = screen.getByTestId('wizard-next-btn');
  await fireEvent.click(nextBtn);

  if (targetStep <= 4) return;

  // Step 4: schedule is optional, just proceed
  nextBtn = screen.getByTestId('wizard-next-btn');
  await fireEvent.click(nextBtn);
}

describe('PipelineWizard — Step 3: Agent Configuration', () => {
  it('renders agent-specific config forms based on agent type', async () => {
    await navigateToStep(3);

    // Should be on step 3
    const stepIndicator = screen.getByTestId('wizard-step-indicator');
    expect(stepIndicator.textContent).toContain('3');

    // Config form for seo_writer should be visible
    const configSection = screen.getByTestId('agent-config-section-seo_writer');
    expect(configSection).toBeInTheDocument();

    // Should have a target_keywords input specific to seo_writer
    const keywordsInput = screen.getByTestId('agent-config-seo_writer-target_keywords');
    expect(keywordsInput).toBeInTheDocument();
  });

  it('validates each agent config before allowing progression', async () => {
    await navigateToStep(3);

    // Try to proceed without filling required config
    const nextBtn = screen.getByTestId('wizard-next-btn');
    await fireEvent.click(nextBtn);

    // Should still be on step 3
    const stepIndicator = screen.getByTestId('wizard-step-indicator');
    expect(stepIndicator.textContent).toContain('3');

    // Validation error should appear
    const error = screen.getByTestId('config-validation-error');
    expect(error).toBeInTheDocument();
  });
});

describe('PipelineWizard — Step 4: Schedule', () => {
  it('renders cron schedule input and review mode toggle', async () => {
    await navigateToStep(4);

    // Should be on step 4
    const stepIndicator = screen.getByTestId('wizard-step-indicator');
    expect(stepIndicator.textContent).toContain('4');

    const cronInput = screen.getByTestId('cron-schedule-input');
    expect(cronInput).toBeInTheDocument();

    const reviewModeSelect = screen.getByTestId('review-mode-select');
    expect(reviewModeSelect).toBeInTheDocument();
  });

  it('defaults review_mode to "draft_for_review"', async () => {
    await navigateToStep(4);

    const reviewModeSelect = screen.getByTestId('review-mode-select') as HTMLSelectElement;
    expect(reviewModeSelect.value).toBe('draft_for_review');
  });
});

describe('PipelineWizard — Step 5: Destination & Save', () => {
  it('renders available destinations and save button', async () => {
    await navigateToStep(5);

    // Should be on step 5
    const stepIndicator = screen.getByTestId('wizard-step-indicator');
    expect(stepIndicator.textContent).toContain('5');

    // Destination options should be visible
    const destinations = screen.getAllByTestId('destination-option');
    expect(destinations.length).toBeGreaterThanOrEqual(2);

    // Save button should be visible
    const saveBtn = screen.getByTestId('wizard-save-btn');
    expect(saveBtn).toBeInTheDocument();
  });

  it('save calls POST /api/v1/pipelines with complete pipeline config', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: 'new-pipeline-id' })
    });
    vi.stubGlobal('fetch', fetchSpy);

    await navigateToStep(5);

    // Select a destination
    const ghostDest = screen.getByTestId('destination-option-ghost');
    await fireEvent.click(ghostDest);

    // Click save
    const saveBtn = screen.getByTestId('wizard-save-btn');
    await fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        '/api/v1/pipelines',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          }),
          body: expect.stringContaining('Test Pipeline')
        })
      );
    });

    // Verify the body contains expected fields
    const callArgs = fetchSpy.mock.calls[0];
    const body = JSON.parse(callArgs[1].body);
    expect(body.name).toBe('Test Pipeline');
    expect(body.description).toBe('A test pipeline');
    expect(body.steps).toHaveLength(1);
    expect(body.steps[0].agentType).toBe('seo_writer');
    expect(body.review_mode).toBe('draft_for_review');
    expect(body.destination).toBe('ghost');

    vi.unstubAllGlobals();
  });
});
