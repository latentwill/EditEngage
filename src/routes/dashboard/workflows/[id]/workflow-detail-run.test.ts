/**
 * @behavior Clicking "Run Now" on workflow detail page triggers POST /api/v1/workflows/:id/run,
 * shows loading state during the request, and shows error feedback on failure.
 * @business_rule Users can manually trigger workflow runs from the detail view;
 * the realtime subscription will automatically show the new run in the history.
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock environment variables
vi.mock('$env/static/public', () => ({
  PUBLIC_SUPABASE_URL: 'http://localhost:54321',
  PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key'
}));

vi.mock('$env/static/private', () => ({
  SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key'
}));

// Mock supabase real-time channel
const mockChannel = {
  on: vi.fn().mockReturnThis(),
  subscribe: vi.fn().mockReturnThis(),
  unsubscribe: vi.fn()
};

const mockSupabaseClient = {
  channel: vi.fn().mockReturnValue(mockChannel),
  removeChannel: vi.fn(),
  from: vi.fn().mockReturnValue({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({ data: [], error: null })
      })
    })
  })
};

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockSupabaseClient)
}));

vi.mock('$lib/supabase', () => ({
  createSupabaseClient: vi.fn(() => mockSupabaseClient)
}));

// Mock fetch for API calls
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

const mockWorkflow = {
  id: 'wf-run-test',
  project_id: 'proj-1',
  name: 'Run Test Workflow',
  description: 'A workflow to test run behavior',
  schedule: null,
  review_mode: 'draft_for_review' as const,
  is_active: true,
  steps: [{ agentType: 'researcher', config: {} }],
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
  last_run_at: null
};

describe('Workflow Detail Run Now button', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls POST /api/v1/workflows/:id/run when clicked', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ jobId: 'run-uuid-1' })
    });

    const WorkflowDetailPage = (await import('./+page.svelte')).default;

    render(WorkflowDetailPage, {
      props: {
        data: {
          workflow: mockWorkflow,
          resolvedSteps: [],
          runs: [],
          events: []
        }
      }
    });

    const runButton = screen.getByTestId('workflow-detail-run-button');
    await fireEvent.click(runButton);

    expect(mockFetch).toHaveBeenCalledWith(
      `/api/v1/workflows/${mockWorkflow.id}/run`,
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('shows loading state while request is in flight', async () => {
    // Create a fetch that we can control timing of
    let resolveFetch: (value: unknown) => void;
    const fetchPromise = new Promise((resolve) => {
      resolveFetch = resolve;
    });
    mockFetch.mockReturnValueOnce(fetchPromise);

    const WorkflowDetailPage = (await import('./+page.svelte')).default;

    render(WorkflowDetailPage, {
      props: {
        data: {
          workflow: mockWorkflow,
          resolvedSteps: [],
          runs: [],
          events: []
        }
      }
    });

    const runButton = screen.getByTestId('workflow-detail-run-button');
    await fireEvent.click(runButton);

    // Button should indicate loading state
    await waitFor(() => {
      const button = screen.getByTestId('workflow-detail-run-button');
      // Either disabled or has loading text
      expect(
        button.hasAttribute('disabled') || button.textContent?.includes('Running')
      ).toBe(true);
    });

    // Resolve the fetch to clean up
    resolveFetch!({
      ok: true,
      json: () => Promise.resolve({ jobId: 'run-uuid-1' })
    });
  });

  it('should display error message for failed runs', async () => {
    const WorkflowDetailPage = (await import('./+page.svelte')).default;

    render(WorkflowDetailPage, {
      props: {
        data: {
          workflow: mockWorkflow,
          resolvedSteps: [],
          runs: [{
            id: 'run-fail-1',
            pipeline_id: mockWorkflow.id,
            status: 'failed' as const,
            current_step: 1,
            total_steps: 2,
            started_at: '2025-01-01T10:00:00Z',
            completed_at: '2025-01-01T10:01:00Z',
            result: null,
            error: 'LLM connection timeout after 30s',
            bullmq_job_id: null,
            created_at: '2025-01-01T10:00:00Z'
          }],
          events: []
        }
      }
    });

    // Error should be visible without expanding
    const errorMessage = screen.getByTestId('run-error-message');
    expect(errorMessage.textContent).toContain('LLM connection timeout after 30s');
  });

  it('should display log_output in expanded step detail', async () => {
    const WorkflowDetailPage = (await import('./+page.svelte')).default;

    const runWithSteps = {
      id: 'run-steps-1',
      pipeline_id: mockWorkflow.id,
      status: 'completed' as const,
      current_step: 2,
      total_steps: 2,
      started_at: '2025-01-01T10:00:00Z',
      completed_at: '2025-01-01T10:05:00Z',
      result: null,
      error: null,
      bullmq_job_id: null,
      created_at: '2025-01-01T10:00:00Z',
      steps: [{
        agent_name: 'SEO Writer',
        status: 'completed',
        started_at: '2025-01-01T10:00:00Z',
        completed_at: '2025-01-01T10:02:00Z',
        log: 'Generated 1500 word article on topic: AI trends',
        log_output: 'Generated 1500 word article on topic: AI trends'
      }]
    };

    render(WorkflowDetailPage, {
      props: { data: { workflow: mockWorkflow, resolvedSteps: [], runs: [runWithSteps], events: [] } }
    });

    // Click to expand
    const runRow = screen.getByTestId('run-history-row');
    await fireEvent.click(runRow);

    await waitFor(() => {
      const stepDetail = screen.getByTestId('run-step-detail');
      expect(stepDetail.textContent).toContain('Generated 1500 word article');
    });
  });

  it('should show date AND time for run timestamps', async () => {
    const WorkflowDetailPage = (await import('./+page.svelte')).default;

    render(WorkflowDetailPage, {
      props: {
        data: {
          workflow: mockWorkflow,
          resolvedSteps: [],
          runs: [{
            id: 'run-datetime-1',
            pipeline_id: mockWorkflow.id,
            status: 'completed' as const,
            current_step: 1,
            total_steps: 1,
            started_at: '2025-06-15T14:30:00Z',
            completed_at: '2025-06-15T14:35:00Z',
            result: null,
            error: null,
            bullmq_job_id: null,
            created_at: '2025-06-15T14:30:00Z'
          }],
          events: []
        }
      }
    });

    const rows = screen.getAllByTestId('run-history-row');
    // Should contain time info (not just date)
    const dateCell = rows[0].querySelector('span');
    expect(dateCell?.textContent).toMatch(/\d{1,2}:\d{2}/); // contains time
  });

  it('shows error message when request fails', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: 'Internal server error' })
    });

    const WorkflowDetailPage = (await import('./+page.svelte')).default;

    render(WorkflowDetailPage, {
      props: {
        data: {
          workflow: mockWorkflow,
          resolvedSteps: [],
          runs: [],
          events: []
        }
      }
    });

    const runButton = screen.getByTestId('workflow-detail-run-button');
    await fireEvent.click(runButton);

    await waitFor(() => {
      const errorEl = screen.getByTestId('run-error');
      expect(errorEl).toBeInTheDocument();
    });
  });
});
