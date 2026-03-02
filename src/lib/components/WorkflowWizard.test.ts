/**
 * @behavior After saving a workflow, user sees feedback (redirect on success, error on failure)
 * and cannot double-submit while save is in progress.
 * @business_rule Post-save feedback ensures users know their workflow was created
 * and prevents duplicate workflows from double-clicks.
 */
import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { tick } from 'svelte';

vi.mock('$env/static/public', () => ({
  PUBLIC_SUPABASE_URL: 'http://localhost:54321',
  PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key'
}));

vi.mock('$env/static/private', () => ({
  SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key'
}));

const mockGoto = vi.fn();
vi.mock('$app/navigation', () => ({
  goto: mockGoto
}));

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

/**
 * Helper: renders the wizard and navigates to the final step (step 5)
 * so the Save button is visible. Fills required fields to pass validation.
 */
async function renderAtSaveStep() {
  const WorkflowWizard = (await import('./WorkflowWizard.svelte')).default;

  render(WorkflowWizard, {
    props: { projectId: 'proj-abc' }
  });

  // Step 1: fill name
  const nameInput = screen.getByLabelText(/workflow name/i);
  await fireEvent.input(nameInput, { target: { value: 'Test Workflow' } });
  await fireEvent.click(screen.getByTestId('wizard-next-btn'));

  // Step 2: select an agent (click the agent card button)
  const agentCard = screen.getByTestId('agent-card-topic_queue');
  await fireEvent.click(agentCard.closest('[data-testid="agent-card"]')!);
  await fireEvent.click(screen.getByTestId('wizard-next-btn'));

  // Step 3: fill required config for topic_queue (Max Topics label)
  const configInput = screen.getByTestId('agent-config-topic_queue-max_topics');
  await fireEvent.input(configInput, { target: { value: '10' } });
  await fireEvent.click(screen.getByTestId('wizard-next-btn'));

  // Step 4: schedule (optional), just go next
  await fireEvent.click(screen.getByTestId('wizard-next-btn'));

  // Now on step 5 with Save button visible
}

describe('WorkflowWizard post-save feedback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('includes project_id in POST body when saving', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) });

    await renderAtSaveStep();

    const saveButton = screen.getByTestId('wizard-save-btn');
    await fireEvent.click(saveButton);

    await vi.waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/v1/workflows',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"project_id":"proj-abc"')
        })
      );
    });
  });

  it('redirects to /dashboard/workflows after successful save', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) });

    await renderAtSaveStep();

    const saveButton = screen.getByTestId('wizard-save-btn');
    await fireEvent.click(saveButton);

    await vi.waitFor(() => {
      expect(mockGoto).toHaveBeenCalledWith('/dashboard/workflows');
    });
  });

  it('shows error message when save fails', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });

    await renderAtSaveStep();

    const saveButton = screen.getByTestId('wizard-save-btn');
    await fireEvent.click(saveButton);

    await vi.waitFor(() => {
      expect(screen.getByTestId('wizard-save-error')).toBeInTheDocument();
    });
  });

  it('disables save button while saving is in progress', async () => {
    let resolveRequest!: (value: { ok: boolean }) => void;
    mockFetch.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveRequest = resolve;
      })
    );

    await renderAtSaveStep();

    const saveButton = screen.getByTestId('wizard-save-btn');
    await fireEvent.click(saveButton);

    // Button should be disabled while request is pending
    await vi.waitFor(() => {
      expect(screen.getByTestId('wizard-save-btn')).toBeDisabled();
    });

    // Resolve the request
    resolveRequest({ ok: true, json: () => Promise.resolve({}) } as unknown as { ok: boolean });
    await tick();
  });
});
