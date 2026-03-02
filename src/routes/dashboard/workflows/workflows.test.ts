/**
 * @behavior Workflow list shows all project workflows with management actions;
 * Workflow detail shows run history with status, duration, and output
 * @business_rule Users can view, run, pause, and resume their project's workflows.
 * Real-time status updates keep the UI in sync during active runs.
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

const mockWorkflows = [
  {
    id: 'wf-1',
    project_id: 'proj-1',
    name: 'SEO Writer',
    description: 'Generates SEO articles',
    schedule: '0 6 * * *',
    review_mode: 'draft_for_review' as const,
    is_active: true,
    steps: [{ agentType: 'researcher', config: {} }, { agentType: 'writer', config: {} }],
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-10T00:00:00Z',
    last_run_at: '2025-01-10T10:00:00Z'
  },
  {
    id: 'wf-2',
    project_id: 'proj-1',
    name: 'Social Posts',
    description: 'Creates social media content',
    schedule: null,
    review_mode: 'auto_publish' as const,
    is_active: false,
    steps: [{ agentType: 'social-writer', config: {} }],
    created_at: '2025-01-02T00:00:00Z',
    updated_at: '2025-01-09T00:00:00Z',
    last_run_at: '2025-01-09T14:00:00Z'
  },
  {
    id: 'wf-3',
    project_id: 'proj-1',
    name: 'Landing Pages',
    description: 'Generates landing page copy',
    schedule: '0 9 * * 1',
    review_mode: 'draft_for_review' as const,
    is_active: true,
    steps: [
      { agentType: 'researcher', config: {} },
      { agentType: 'copywriter', config: {} },
      { agentType: 'designer', config: {} }
    ],
    created_at: '2025-01-03T00:00:00Z',
    updated_at: '2025-01-08T00:00:00Z',
    last_run_at: null
  }
];

const mockWorkflowRuns = [
  {
    id: 'run-1',
    pipeline_id: 'wf-1',
    status: 'completed' as const,
    current_step: 3,
    total_steps: 3,
    started_at: '2025-01-10T10:00:00Z',
    completed_at: '2025-01-10T10:05:00Z',
    result: { output: 'Article generated' },
    error: null,
    bullmq_job_id: 'job-1',
    created_at: '2025-01-10T10:00:00Z'
  },
  {
    id: 'run-2',
    pipeline_id: 'wf-1',
    status: 'failed' as const,
    current_step: 2,
    total_steps: 3,
    started_at: '2025-01-09T08:00:00Z',
    completed_at: '2025-01-09T08:02:00Z',
    result: null,
    error: 'Timeout connecting to LLM',
    bullmq_job_id: 'job-2',
    created_at: '2025-01-09T08:00:00Z'
  },
  {
    id: 'run-3',
    pipeline_id: 'wf-1',
    status: 'completed' as const,
    current_step: 3,
    total_steps: 3,
    started_at: '2025-01-08T14:00:00Z',
    completed_at: '2025-01-08T14:10:00Z',
    result: { output: 'Blog post written' },
    error: null,
    bullmq_job_id: 'job-3',
    created_at: '2025-01-08T14:00:00Z'
  }
];

describe('Workflow List Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: [] })
    });
  });

  it('renders all project workflows with name and status badge', async () => {
    const WorkflowsPage = (await import('./+page.svelte')).default;

    render(WorkflowsPage, {
      props: { data: { pipelines: mockWorkflows } }
    });

    // All workflow names should be visible
    expect(screen.getByText('SEO Writer')).toBeInTheDocument();
    expect(screen.getByText('Social Posts')).toBeInTheDocument();
    expect(screen.getByText('Landing Pages')).toBeInTheDocument();

    // All workflow cards should be rendered
    const workflowCards = screen.getAllByTestId('workflow-card');
    expect(workflowCards).toHaveLength(3);

    // Status badges should be present
    const statusBadges = screen.getAllByTestId('workflow-status-badge');
    expect(statusBadges).toHaveLength(3);
  });

  it('shows active/paused toggle per workflow', async () => {
    const WorkflowsPage = (await import('./+page.svelte')).default;

    render(WorkflowsPage, {
      props: { data: { pipelines: mockWorkflows } }
    });

    const toggles = screen.getAllByTestId('workflow-toggle');
    expect(toggles).toHaveLength(3);

    // First workflow is active, second is paused
    expect(toggles[0].getAttribute('aria-checked')).toBe('true');
    expect(toggles[1].getAttribute('aria-checked')).toBe('false');
    expect(toggles[2].getAttribute('aria-checked')).toBe('true');
  });

  it('"Run Now" button calls POST /api/v1/workflows/:id/run', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ jobId: 'run-uuid-1' })
    });

    const WorkflowsPage = (await import('./+page.svelte')).default;

    render(WorkflowsPage, {
      props: { data: { pipelines: mockWorkflows } }
    });

    const runButtons = screen.getAllByTestId('workflow-run-button');
    await fireEvent.click(runButtons[0]);

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/v1/workflows/wf-1/run',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('pause toggle calls PATCH /api/v1/workflows/:id with is_active: false', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: { ...mockWorkflows[0], is_active: false } })
    });

    const WorkflowsPage = (await import('./+page.svelte')).default;

    render(WorkflowsPage, {
      props: { data: { pipelines: mockWorkflows } }
    });

    // Click toggle on first workflow (currently active -> should pause)
    const toggles = screen.getAllByTestId('workflow-toggle');
    await fireEvent.click(toggles[0]);

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/v1/workflows/wf-1',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ is_active: false })
      })
    );
  });
});

describe('Workflow Detail Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: [] })
    });
  });

  it('shows run history with status, duration, and output', async () => {
    const WorkflowDetailPage = (await import('./[id]/+page.svelte')).default;

    render(WorkflowDetailPage, {
      props: {
        data: {
          workflow: mockWorkflows[0],
          runs: mockWorkflowRuns
        }
      }
    });

    // Workflow name and status badge
    expect(screen.getByTestId('workflow-detail-name')).toHaveTextContent('SEO Writer');
    expect(screen.getByTestId('workflow-detail-status')).toBeInTheDocument();

    // Run history items
    const runRows = screen.getAllByTestId('run-history-row');
    expect(runRows).toHaveLength(3);

    // Each row should have status, duration info
    const runStatuses = screen.getAllByTestId('run-status');
    expect(runStatuses).toHaveLength(3);
    expect(runStatuses[0].textContent).toContain('completed');
    expect(runStatuses[1].textContent).toContain('failed');
    expect(runStatuses[2].textContent).toContain('completed');

    // Duration should be rendered
    const runDurations = screen.getAllByTestId('run-duration');
    expect(runDurations).toHaveLength(3);
  });

  it('subscribes to Supabase real-time for inline status updates during active run', async () => {
    const WorkflowDetailPage = (await import('./[id]/+page.svelte')).default;

    render(WorkflowDetailPage, {
      props: {
        data: {
          workflow: mockWorkflows[0],
          runs: mockWorkflowRuns
        }
      }
    });

    // Verify that a real-time channel was subscribed
    expect(mockChannel.on).toHaveBeenCalled();
    expect(mockChannel.subscribe).toHaveBeenCalled();
  });
});
