/**
 * @behavior Steps 3-5 of the WorkflowWizard handle agent configuration,
 * scheduling, and review/save. The final step saves the complete
 * workflow via POST /api/v1/workflows.
 * @business_rule Each agent must have topic and destination configured before
 * proceeding. Schedule defaults to draft_for_review review mode. The save action
 * assembles all wizard state into a single API call with per-agent config.
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import { describe, it, expect, vi, afterEach } from 'vitest';
import WorkflowWizard from '../WorkflowWizard.svelte';

const MOCK_AGENTS = [
  { id: 'agent-w1', name: 'SEO Blog Writer', type: 'writing', project_id: 'proj-1', config: {} }
];

const MOCK_TOPICS = [
  { id: 'topic-1', title: 'AI in Healthcare', project_id: 'proj-1', status: 'pending' }
];

const MOCK_DESTINATIONS = [
  { id: 'dest-1', name: 'My Ghost Blog', type: 'ghost', project_id: 'proj-1' }
];

function setupMockFetch() {
  const fetchMock = vi.fn().mockImplementation((url: string, options?: RequestInit) => {
    if (typeof url === 'string' && url.includes('/api/v1/writing-agents')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: MOCK_AGENTS })
      });
    }
    if (typeof url === 'string' && url.includes('/api/v1/topics')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: MOCK_TOPICS })
      });
    }
    if (typeof url === 'string' && url.includes('/api/v1/destinations')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: MOCK_DESTINATIONS })
      });
    }
    if (typeof url === 'string' && url.includes('/api/v1/workflows') && options?.method === 'POST') {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ id: 'new-pipeline-id' })
      });
    }
    return Promise.resolve({ ok: false, json: () => Promise.resolve({ error: 'Not found' }) });
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

// Helper to navigate through steps
async function navigateToStep(targetStep: number) {
  setupMockFetch();
  render(WorkflowWizard, { props: { projectId: 'proj-1' } });

  // Step 1: fill name
  const nameInput = screen.getByTestId('workflow-name-input');
  await fireEvent.input(nameInput, { target: { value: 'Test Workflow' } });

  const descInput = screen.getByTestId('workflow-description-input');
  await fireEvent.input(descInput, { target: { value: 'A test workflow' } });

  let nextBtn = screen.getByTestId('wizard-next-btn');
  await fireEvent.click(nextBtn);

  if (targetStep <= 2) return;

  // Step 2: select an agent
  await waitFor(() => {
    expect(screen.getAllByTestId('agent-card').length).toBeGreaterThan(0);
  });
  await fireEvent.click(screen.getAllByTestId('agent-card')[0]);

  nextBtn = screen.getByTestId('wizard-next-btn');
  await fireEvent.click(nextBtn);

  if (targetStep <= 3) return;

  // Step 3: fill config for agent
  await waitFor(() => {
    const sel = screen.getByTestId('agent-topic-select-agent-w1') as HTMLSelectElement;
    expect(sel.querySelectorAll('option').length).toBeGreaterThan(1);
  });

  const topicSelect = screen.getByTestId('agent-topic-select-agent-w1') as HTMLSelectElement;
  topicSelect.value = 'topic-1';
  await fireEvent.change(topicSelect);

  const destSelect = screen.getByTestId('agent-destination-select-agent-w1') as HTMLSelectElement;
  destSelect.value = 'dest-1';
  await fireEvent.change(destSelect);

  nextBtn = screen.getByTestId('wizard-next-btn');
  await fireEvent.click(nextBtn);

  if (targetStep <= 4) return;

  // Step 4: schedule is optional, just proceed
  nextBtn = screen.getByTestId('wizard-next-btn');
  await fireEvent.click(nextBtn);
}

describe('WorkflowWizard — Step 3: Agent Configuration', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders per-agent config forms with topic and destination selectors', async () => {
    await navigateToStep(3);

    const stepIndicator = screen.getByTestId('wizard-step-indicator');
    expect(stepIndicator.textContent).toContain('3');

    const configSection = screen.getByTestId('agent-config-section-agent-w1');
    expect(configSection).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTestId('agent-topic-select-agent-w1')).toBeInTheDocument();
      expect(screen.getByTestId('agent-destination-select-agent-w1')).toBeInTheDocument();
    });
  });

  it('validates each agent config before allowing progression', async () => {
    await navigateToStep(3);

    // Try to proceed without filling config
    const nextBtn = screen.getByTestId('wizard-next-btn');
    await fireEvent.click(nextBtn);

    const stepIndicator = screen.getByTestId('wizard-step-indicator');
    expect(stepIndicator.textContent).toContain('3');

    const error = screen.getByTestId('config-validation-error');
    expect(error).toBeInTheDocument();
  });
});

describe('WorkflowWizard — Step 4: Schedule', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders cron schedule input and review mode toggle', async () => {
    await navigateToStep(4);

    const stepIndicator = screen.getByTestId('wizard-step-indicator');
    expect(stepIndicator.textContent).toContain('4');

    const dailyPreset = screen.getByTestId('schedule-preset-daily');
    expect(dailyPreset).toBeInTheDocument();

    const reviewModeSelect = screen.getByTestId('review-mode-select');
    expect(reviewModeSelect).toBeInTheDocument();
  });

  it('defaults review_mode to "draft_for_review"', async () => {
    await navigateToStep(4);

    const reviewModeSelect = screen.getByTestId('review-mode-select') as HTMLSelectElement;
    expect(reviewModeSelect.value).toBe('draft_for_review');
  });
});

describe('WorkflowWizard — Step 5: Review & Save', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders review step and save button', async () => {
    await navigateToStep(5);

    const stepIndicator = screen.getByTestId('wizard-step-indicator');
    expect(stepIndicator.textContent).toContain('5');

    const saveBtn = screen.getByTestId('wizard-save-btn');
    expect(saveBtn).toBeInTheDocument();
  });

  it('save calls POST /api/v1/workflows with per-agent config payload', async () => {
    const fetchSpy = setupMockFetch();
    render(WorkflowWizard, { props: { projectId: 'proj-1' } });

    // Step 1
    await fireEvent.input(screen.getByTestId('workflow-name-input'), { target: { value: 'Test Workflow' } });
    await fireEvent.input(screen.getByTestId('workflow-description-input'), { target: { value: 'A test workflow' } });
    await fireEvent.click(screen.getByTestId('wizard-next-btn'));

    // Step 2
    await waitFor(() => {
      expect(screen.getAllByTestId('agent-card').length).toBeGreaterThan(0);
    });
    await fireEvent.click(screen.getAllByTestId('agent-card')[0]);
    await fireEvent.click(screen.getByTestId('wizard-next-btn'));

    // Step 3
    await waitFor(() => {
      const sel = screen.getByTestId('agent-topic-select-agent-w1') as HTMLSelectElement;
      expect(sel.querySelectorAll('option').length).toBeGreaterThan(1);
    });
    const topicSelect = screen.getByTestId('agent-topic-select-agent-w1') as HTMLSelectElement;
    topicSelect.value = 'topic-1';
    await fireEvent.change(topicSelect);
    const destSelect = screen.getByTestId('agent-destination-select-agent-w1') as HTMLSelectElement;
    destSelect.value = 'dest-1';
    await fireEvent.change(destSelect);
    await fireEvent.click(screen.getByTestId('wizard-next-btn'));

    // Step 4 - proceed
    await fireEvent.click(screen.getByTestId('wizard-next-btn'));

    // Step 5 - save
    await fireEvent.click(screen.getByTestId('wizard-save-btn'));

    await waitFor(() => {
      const postCalls = (fetchSpy.mock.calls as [string, RequestInit?][]).filter(
        (c) => typeof c[0] === 'string' && c[0].includes('/api/v1/workflows')
      );
      expect(postCalls.length).toBe(1);
    });

    const postCall = (fetchSpy.mock.calls as [string, RequestInit?][]).find(
      (c) => typeof c[0] === 'string' && c[0].includes('/api/v1/workflows')
    );
    const body = JSON.parse(postCall![1]!.body as string);
    expect(body.name).toBe('Test Workflow');
    expect(body.description).toBe('A test workflow');
    expect(body.steps).toHaveLength(1);
    expect(body.steps[0].agent_id).toBe('agent-w1');
    expect(body.steps[0].agent_type).toBe('writing');
    expect(body.steps[0].topic_id).toBe('topic-1');
    expect(body.steps[0].destination_id).toBe('dest-1');
    expect(body.review_mode).toBe('draft_for_review');
  });
});
