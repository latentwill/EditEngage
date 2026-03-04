/**
 * @behavior The WorkflowWizard navigates through 5 steps: Name, Agents,
 * Configure, Schedule, Review. It validates each step and submits a payload
 * with per-agent config (agent_id, topic_id, destination_id).
 * @business_rule Workflow requires a name, at least one agent, and config
 * for each agent. The payload uses agent IDs (not hardcoded types).
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import WorkflowWizard from '$lib/components/WorkflowWizard.svelte';

const MOCK_AGENTS = [
  { id: 'agent-w1', name: 'SEO Blog Writer', type: 'writing', project_id: 'proj-1', config: {} },
  { id: 'agent-r1', name: 'Market Researcher', type: 'research', project_id: 'proj-1', config: {} }
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
        json: () => Promise.resolve({ id: 'new-workflow-id' })
      });
    }
    return Promise.resolve({ ok: false, json: () => Promise.resolve({ error: 'Not found' }) });
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('WorkflowWizard — Step Flow Update (Task 15)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should navigate through 5 steps in correct order: Name, Agents, Configure, Schedule, Review', async () => {
    setupMockFetch();

    render(WorkflowWizard, { props: { projectId: 'proj-1' } });

    // Step 1: Name
    const stepIndicator = screen.getByTestId('wizard-step-indicator');
    expect(stepIndicator.textContent).toContain('1');
    expect(screen.getByTestId('step-name')).toBeInTheDocument();

    // Fill name and go to step 2
    const nameInput = screen.getByTestId('workflow-name-input');
    await fireEvent.input(nameInput, { target: { value: 'My Workflow' } });
    await fireEvent.click(screen.getByTestId('wizard-next-btn'));

    // Step 2: Agents
    expect(stepIndicator.textContent).toContain('2');
    expect(screen.getByTestId('step-agents')).toBeInTheDocument();

    // Wait for agents to load, select one
    await waitFor(() => {
      expect(screen.getAllByTestId('agent-card').length).toBeGreaterThan(0);
    });
    await fireEvent.click(screen.getAllByTestId('agent-card')[0]);
    await fireEvent.click(screen.getByTestId('wizard-next-btn'));

    // Step 3: Configure
    expect(stepIndicator.textContent).toContain('3');
    expect(screen.getByTestId('step-config')).toBeInTheDocument();

    // Wait for topics/destinations to load, fill config
    await waitFor(() => {
      expect(screen.getByTestId('agent-topic-select-agent-w1')).toBeInTheDocument();
    });
    await waitFor(() => {
      const topicSelect = screen.getByTestId('agent-topic-select-agent-w1') as HTMLSelectElement;
      expect(topicSelect.querySelectorAll('option').length).toBeGreaterThan(1);
    });

    const topicSelect = screen.getByTestId('agent-topic-select-agent-w1') as HTMLSelectElement;
    topicSelect.value = 'topic-1';
    await fireEvent.change(topicSelect);

    const destSelect = screen.getByTestId('agent-destination-select-agent-w1') as HTMLSelectElement;
    destSelect.value = 'dest-1';
    await fireEvent.change(destSelect);

    await fireEvent.click(screen.getByTestId('wizard-next-btn'));

    // Step 4: Schedule
    expect(stepIndicator.textContent).toContain('4');
    expect(screen.getByTestId('step-schedule')).toBeInTheDocument();
    await fireEvent.click(screen.getByTestId('wizard-next-btn'));

    // Step 5: Review (save button visible)
    expect(stepIndicator.textContent).toContain('5');
    expect(screen.getByTestId('wizard-save-btn')).toBeInTheDocument();
  });

  it('should validate each step before allowing next', async () => {
    setupMockFetch();

    render(WorkflowWizard, { props: { projectId: 'proj-1' } });

    // Step 1: try next without name
    await fireEvent.click(screen.getByTestId('wizard-next-btn'));
    expect(screen.getByTestId('wizard-step-indicator').textContent).toContain('1');

    // Fill name
    await fireEvent.input(screen.getByTestId('workflow-name-input'), { target: { value: 'Test' } });
    await fireEvent.click(screen.getByTestId('wizard-next-btn'));

    // Step 2: try next without selecting agent
    expect(screen.getByTestId('wizard-step-indicator').textContent).toContain('2');
    await waitFor(() => {
      expect(screen.getAllByTestId('agent-card').length).toBeGreaterThan(0);
    });
    await fireEvent.click(screen.getByTestId('wizard-next-btn'));
    // Should stay on step 2
    expect(screen.getByTestId('wizard-step-indicator').textContent).toContain('2');
  });

  it('should submit workflow with new payload shape including per-agent config', async () => {
    const fetchMock = setupMockFetch();

    render(WorkflowWizard, { props: { projectId: 'proj-1' } });

    // Step 1: Name
    await fireEvent.input(screen.getByTestId('workflow-name-input'), { target: { value: 'My Workflow' } });
    const descInput = screen.getByTestId('workflow-description-input');
    await fireEvent.input(descInput, { target: { value: 'A test workflow' } });
    await fireEvent.click(screen.getByTestId('wizard-next-btn'));

    // Step 2: Select agent
    await waitFor(() => {
      expect(screen.getAllByTestId('agent-card').length).toBeGreaterThan(0);
    });
    await fireEvent.click(screen.getAllByTestId('agent-card')[0]);
    await fireEvent.click(screen.getByTestId('wizard-next-btn'));

    // Step 3: Configure
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

    // Step 4: Schedule - just proceed
    await fireEvent.click(screen.getByTestId('wizard-next-btn'));

    // Step 5: Save
    await fireEvent.click(screen.getByTestId('wizard-save-btn'));

    await waitFor(() => {
      const postCalls = (fetchMock.mock.calls as [string, RequestInit?][]).filter(
        (c) => typeof c[0] === 'string' && c[0].includes('/api/v1/workflows')
      );
      expect(postCalls.length).toBe(1);
    });

    const postCall = (fetchMock.mock.calls as [string, RequestInit?][]).find(
      (c) => typeof c[0] === 'string' && c[0].includes('/api/v1/workflows')
    );
    const body = JSON.parse(postCall![1]!.body as string);

    expect(body.name).toBe('My Workflow');
    expect(body.description).toBe('A test workflow');
    expect(body.steps).toHaveLength(1);
    expect(body.steps[0].agent_id).toBe('agent-w1');
    expect(body.steps[0].agent_type).toBe('writing');
    expect(body.steps[0].topic_id).toBe('topic-1');
    expect(body.steps[0].destination_id).toBe('dest-1');
    expect(body.review_mode).toBe('draft_for_review');
  });

  it('should not contain any hardcoded AVAILABLE_AGENTS', async () => {
    setupMockFetch();

    render(WorkflowWizard, { props: { projectId: 'proj-1' } });

    // Navigate to step 2
    await fireEvent.input(screen.getByTestId('workflow-name-input'), { target: { value: 'Test' } });
    await fireEvent.click(screen.getByTestId('wizard-next-btn'));

    // Wait for agents to load
    await waitFor(() => {
      expect(screen.getAllByTestId('agent-card').length).toBeGreaterThan(0);
    });

    const container = screen.getByTestId('step-agents');
    const oldLabels = [
      'Topic Queue', 'Variety Engine', 'SEO Writer', 'Ghost Publisher',
      'Postbridge Publisher', 'Email Publisher', 'Content Reviewer',
      'Research Agent', 'Programmatic Page'
    ];
    for (const label of oldLabels) {
      expect(container.textContent).not.toContain(label);
    }
  });
});
