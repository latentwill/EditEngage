/**
 * @behavior After saving a workflow, user sees feedback (redirect on success, error on failure)
 * and cannot double-submit while save is in progress.
 * @business_rule Post-save feedback ensures users know their workflow was created
 * and prevents duplicate workflows from double-clicks.
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
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

// Mock agent data that StepAgents will fetch
const mockAgents = [
  { id: 'agent-w1', name: 'SEO Blog Writer', type: 'writing', project_id: 'proj-abc', config: {} }
];

// Mock topics and destinations that StepConfig will fetch
const mockTopics = [
  { id: 'topic-1', title: 'SaaS Marketing', project_id: 'proj-abc', status: 'active' }
];

const mockDestinations = [
  { id: 'dest-1', name: 'Ghost CMS', type: 'ghost', project_id: 'proj-abc' }
];

/**
 * Sets up mockFetch to handle the various API calls the wizard makes,
 * then returns agent/topic/destination data appropriately.
 */
function setupFetchMocks(overrides?: { saveResponse?: Response | Promise<Response> }) {
  mockFetch.mockImplementation((url: string, options?: RequestInit) => {
    // StepAgents fetches writing agents
    if (typeof url === 'string' && url.includes('/api/v1/writing-agents')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: mockAgents })
      });
    }
    // StepConfig fetches topics
    if (typeof url === 'string' && url.includes('/api/v1/topics')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: mockTopics })
      });
    }
    // StepConfig fetches destinations
    if (typeof url === 'string' && url.includes('/api/v1/destinations')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: mockDestinations })
      });
    }
    // Save workflow POST
    if (typeof url === 'string' && url.includes('/api/v1/workflows') && options?.method === 'POST') {
      if (overrides?.saveResponse) return overrides.saveResponse;
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: [] }) });
  });
}

/**
 * Helper: renders the wizard and navigates to the final step (step 5)
 * so the Save button is visible. Fills required fields to pass validation.
 */
async function renderAtSaveStep(overrides?: { saveResponse?: Response | Promise<Response> }) {
  setupFetchMocks(overrides);

  const WorkflowWizard = (await import('./WorkflowWizard.svelte')).default;

  render(WorkflowWizard, {
    props: { projectId: 'proj-abc' }
  });

  // Step 1: fill name
  const nameInput = screen.getByLabelText(/workflow name/i);
  await fireEvent.input(nameInput, { target: { value: 'Test Workflow' } });
  await fireEvent.click(screen.getByTestId('wizard-next-btn'));

  // Step 2: wait for agents to load, then select one
  await waitFor(() => {
    expect(screen.getByText('SEO Blog Writer')).toBeInTheDocument();
  });
  const agentCard = screen.getByText('SEO Blog Writer').closest('[data-testid="agent-card"]')!;
  await fireEvent.click(agentCard);
  await fireEvent.click(screen.getByTestId('wizard-next-btn'));

  // Step 3: wait for config to load, select topic and destination
  await waitFor(() => {
    expect(screen.getByTestId('agent-topic-select-agent-w1')).toBeInTheDocument();
  });
  const topicSelect = screen.getByTestId('agent-topic-select-agent-w1') as HTMLSelectElement;
  await fireEvent.change(topicSelect, { target: { value: 'topic-1' } });
  const destSelect = screen.getByTestId('agent-destination-select-agent-w1') as HTMLSelectElement;
  await fireEvent.change(destSelect, { target: { value: 'dest-1' } });
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
    await renderAtSaveStep();

    const saveButton = screen.getByTestId('wizard-save-btn');
    await fireEvent.click(saveButton);

    await vi.waitFor(() => {
      expect(mockGoto).toHaveBeenCalledWith('/dashboard/workflows');
    });
  });

  it('shows error message when save fails', async () => {
    await renderAtSaveStep({
      saveResponse: Promise.resolve({ ok: false, status: 500 } as Response)
    });

    const saveButton = screen.getByTestId('wizard-save-btn');
    await fireEvent.click(saveButton);

    await vi.waitFor(() => {
      expect(screen.getByTestId('wizard-save-error')).toBeInTheDocument();
    });
  });

  it('disables save button while saving is in progress', async () => {
    let resolveRequest!: (value: Response) => void;
    const pendingSave = new Promise<Response>((resolve) => {
      resolveRequest = resolve;
    });

    await renderAtSaveStep({ saveResponse: pendingSave });

    const saveButton = screen.getByTestId('wizard-save-btn');
    await fireEvent.click(saveButton);

    // Button should be disabled while request is pending
    await vi.waitFor(() => {
      expect(screen.getByTestId('wizard-save-btn')).toBeDisabled();
    });

    // Resolve the request
    resolveRequest({ ok: true, json: () => Promise.resolve({}) } as unknown as Response);
    await tick();
  });
});
