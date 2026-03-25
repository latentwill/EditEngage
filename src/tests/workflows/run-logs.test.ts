/**
 * @behavior Workflow run history rows are expandable to show step-level details
 * @business_rule Users can drill into individual run steps to see agent name, status, and log output
 */
import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$env/static/public', () => ({
  PUBLIC_SUPABASE_URL: 'http://localhost:54321',
  PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key'
}));

const mockOn = vi.fn().mockReturnThis();
const mockSubscribe = vi.fn().mockReturnThis();
const mockUnsubscribe = vi.fn();
const mockChannel = {
  on: mockOn,
  subscribe: mockSubscribe,
  unsubscribe: mockUnsubscribe
};

const mockClient = {
  channel: vi.fn().mockReturnValue(mockChannel)
};

vi.mock('$lib/supabase', () => ({
  createSupabaseClient: vi.fn(() => mockClient)
}));

import WorkflowDetailPage from '../../routes/dashboard/workflows/[id]/+page.svelte';

function makeRun(overrides: Record<string, unknown> = {}) {
  return {
    id: 'run-1',
    pipeline_id: 'wf-1',
    status: 'completed' as const,
    current_step: 2,
    total_steps: 2,
    started_at: '2025-01-15T10:00:00Z',
    completed_at: '2025-01-15T10:05:00Z',
    result: null,
    error: null,
    bullmq_job_id: null,
    created_at: '2025-01-15T10:00:00Z',
    current_agent: null,
    steps: [
      {
        agent_name: 'SEO Writer',
        status: 'completed',
        started_at: '2025-01-15T10:00:00Z',
        completed_at: '2025-01-15T10:03:00Z',
        log: 'Generated article draft with 1500 words'
      },
      {
        agent_name: 'Ghost Publisher',
        status: 'completed',
        started_at: '2025-01-15T10:03:00Z',
        completed_at: '2025-01-15T10:05:00Z',
        log: 'Published to Ghost CMS successfully'
      }
    ],
    ...overrides
  };
}

function makeWorkflow() {
  return {
    id: 'wf-1',
    project_id: 'proj-1',
    name: 'SEO Articles',
    description: 'Generates SEO articles',
    schedule: null,
    review_mode: 'auto_publish' as const,
    is_active: true,
    steps: [{ agentType: 'seo-writer', config: {} }],
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    last_run_at: null
  };
}

function renderPage(runs = [makeRun()]) {
  return render(WorkflowDetailPage, {
    props: {
      data: {
        workflow: makeWorkflow(),
        resolvedSteps: [],
        runs,
        events: []
      }
    }
  });
}

describe('Workflow Run Logs — Expandable Rows', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOn.mockReturnValue(mockChannel);
    mockSubscribe.mockReturnValue(mockChannel);
    mockClient.channel.mockReturnValue(mockChannel);
  });

  it('should show expandable run entries in run history', async () => {
    renderPage();

    const rows = screen.getAllByTestId('run-history-row');
    expect(rows).toHaveLength(1);

    // Row should be clickable (has cursor-pointer or button role)
    await fireEvent.click(rows[0]);

    // After clicking, step details should appear
    const stepDetails = screen.getAllByTestId('run-step-detail');
    expect(stepDetails.length).toBeGreaterThan(0);
  });

  it('should display step details when run is expanded', async () => {
    renderPage();

    const row = screen.getAllByTestId('run-history-row')[0];
    await fireEvent.click(row);

    const stepDetails = screen.getAllByTestId('run-step-detail');
    expect(stepDetails).toHaveLength(2);

    // First step: SEO Writer
    expect(stepDetails[0].textContent).toContain('SEO Writer');
    expect(stepDetails[0].textContent).toContain('completed');
    expect(stepDetails[0].textContent).toContain('Generated article draft with 1500 words');

    // Second step: Ghost Publisher
    expect(stepDetails[1].textContent).toContain('Ghost Publisher');
    expect(stepDetails[1].textContent).toContain('Published to Ghost CMS successfully');
  });

  it('should show step status indicators: pending, running, completed, failed', async () => {
    const run = makeRun({
      status: 'running',
      completed_at: null,
      steps: [
        { agent_name: 'Step A', status: 'completed', started_at: '2025-01-15T10:00:00Z', completed_at: '2025-01-15T10:01:00Z', log: 'Done' },
        { agent_name: 'Step B', status: 'running', started_at: '2025-01-15T10:01:00Z', completed_at: null, log: 'In progress...' },
        { agent_name: 'Step C', status: 'pending', started_at: null, completed_at: null, log: '' },
        { agent_name: 'Step D', status: 'failed', started_at: '2025-01-15T10:02:00Z', completed_at: '2025-01-15T10:02:30Z', log: 'Error occurred' }
      ]
    });

    renderPage([run]);

    const row = screen.getAllByTestId('run-history-row')[0];
    await fireEvent.click(row);

    const stepDetails = screen.getAllByTestId('run-step-detail');
    expect(stepDetails).toHaveLength(4);

    // Each step should display its status
    expect(stepDetails[0].textContent).toContain('completed');
    expect(stepDetails[1].textContent).toContain('running');
    expect(stepDetails[2].textContent).toContain('pending');
    expect(stepDetails[3].textContent).toContain('failed');
  });

  it('should collapse expanded run when clicked again', async () => {
    renderPage();

    const row = screen.getAllByTestId('run-history-row')[0];

    // Expand
    await fireEvent.click(row);
    expect(screen.getAllByTestId('run-step-detail')).toHaveLength(2);

    // Collapse
    await fireEvent.click(row);
    expect(screen.queryAllByTestId('run-step-detail')).toHaveLength(0);
  });

  it('should subscribe to real-time updates for pipeline_run_logs', () => {
    renderPage();

    expect(mockClient.channel).toHaveBeenCalled();
    expect(mockOn).toHaveBeenCalledWith(
      'postgres_changes',
      expect.objectContaining({
        event: '*',
        schema: 'public',
        table: 'pipeline_runs'
      }),
      expect.any(Function)
    );
  });
});
