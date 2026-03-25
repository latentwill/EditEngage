/**
 * Acceptance tests for Workflow UX Fixes.
 *
 * These tests are written RED-first: they describe the CORRECT behavior
 * that should exist after each fix is implemented. They will FAIL
 * against the current codebase because the fixes have not been built yet.
 *
 * Three issues being fixed:
 *  Issue 1: Run logs not showing error detail (steps always undefined,
 *           no error message display, dates missing time)
 *  Issue 2: No delete workflow capability
 *  Issue 3: Agents don't show in workflow creation wizard
 *           (missing type field, research agents never fetched)
 */
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/svelte';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Global mocks shared across all test groups
// ---------------------------------------------------------------------------

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

// --- Supabase chain mock builder ---

function createChainMock(terminalValue: { data: unknown; error: unknown }) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  chain.select = vi.fn().mockReturnValue(chain);
  chain.insert = vi.fn().mockReturnValue(chain);
  chain.update = vi.fn().mockReturnValue(chain);
  chain.delete = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.in = vi.fn().mockReturnValue(chain);
  chain.single = vi.fn().mockResolvedValue(terminalValue);
  chain.order = vi.fn().mockReturnValue(chain);
  chain.limit = vi.fn().mockReturnValue(chain);
  chain.then = vi.fn((resolve: (v: unknown) => void) => resolve(terminalValue));
  return chain;
}

const mockChannel = {
  on: vi.fn().mockReturnThis(),
  subscribe: vi.fn().mockReturnThis(),
  unsubscribe: vi.fn()
};

const mockSupabaseClient = {
  channel: vi.fn().mockReturnValue(mockChannel),
  removeChannel: vi.fn(),
  from: vi.fn().mockReturnValue(createChainMock({ data: [], error: null })),
  auth: {
    getUser: vi.fn(() =>
      Promise.resolve({
        data: { user: { id: 'user-1' } },
        error: null
      })
    )
  }
};

vi.mock('$lib/supabase', () => ({
  createSupabaseClient: vi.fn(() => mockSupabaseClient)
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockSupabaseClient)
}));

vi.mock('$lib/server/supabase', () => ({
  createServerSupabaseClient: vi.fn(() => mockSupabaseClient),
  createServiceRoleClient: vi.fn(() => mockSupabaseClient)
}));

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// --- Shared test data ---

const baseWorkflow = {
  id: 'pipe-1',
  project_id: 'proj-1',
  name: 'SEO Pipeline',
  description: null,
  schedule: '0 9 * * *',
  review_mode: 'draft_for_review' as const,
  is_active: true,
  steps: [
    { agentType: 'seo_writer', config: {} },
    { agentType: 'ghost_publisher', config: {} }
  ],
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
  last_run_at: '2025-06-01T09:00:00Z'
};

const completedRunWithSteps = {
  id: 'run-completed-1',
  pipeline_id: 'pipe-1',
  status: 'completed' as const,
  current_step: 2,
  total_steps: 2,
  started_at: '2025-06-01T09:00:00Z',
  completed_at: '2025-06-01T09:05:30Z',
  result: null,
  error: null,
  bullmq_job_id: 'job-1',
  created_at: '2025-06-01T09:00:00Z',
  steps: [
    {
      agent_name: 'SEO Writer',
      status: 'completed',
      started_at: '2025-06-01T09:00:00Z',
      completed_at: '2025-06-01T09:03:00Z',
      log: 'Generated article: "10 Tips for SaaS Growth"'
    },
    {
      agent_name: 'Ghost Publisher',
      status: 'completed',
      started_at: '2025-06-01T09:03:00Z',
      completed_at: '2025-06-01T09:05:30Z',
      log: 'Published to Ghost CMS successfully'
    }
  ]
};

const failedRunWithError = {
  id: 'run-failed-1',
  pipeline_id: 'pipe-1',
  status: 'failed' as const,
  current_step: 1,
  total_steps: 2,
  started_at: '2025-06-01T10:00:00Z',
  completed_at: '2025-06-01T10:01:15Z',
  result: null,
  error: 'invalid date',
  bullmq_job_id: 'job-2',
  created_at: '2025-06-01T10:00:00Z',
  steps: [
    {
      agent_name: 'SEO Writer',
      status: 'failed',
      started_at: '2025-06-01T10:00:00Z',
      completed_at: '2025-06-01T10:01:15Z',
      log: 'Error: invalid date format in topic configuration'
    }
  ]
};

// ===========================================================================
// Issue 1: Run logs not showing error detail
// ===========================================================================

describe('Issue 1 -- Run logs not showing error detail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: [] })
    });
  });

  /**
   * @behavior When a workflow has a failed run with an error message,
   *   clicking on the failed run row should display the error prominently
   * @business_rule Users need to quickly diagnose why a workflow failed
   *   without digging through logs
   */
  it('AC-1: Run detail shows error messages for failed runs', async () => {
    // GIVEN a workflow with a failed run that has error "invalid date"
    const WorkflowDetailPage = (
      await import('../../routes/dashboard/workflows/[id]/+page.svelte')
    ).default;

    render(WorkflowDetailPage, {
      props: {
        data: {
          workflow: baseWorkflow,
          resolvedSteps: [],
          runs: [failedRunWithError],
          events: []
        }
      }
    });

    // WHEN I click on the failed run row
    const runRow = screen.getByTestId('run-history-row');
    await fireEvent.click(runRow);

    // THEN I should see the error message "invalid date" displayed prominently
    await waitFor(() => {
      const errorDisplay = screen.getByTestId('run-error-message');
      expect(errorDisplay).toBeInTheDocument();
      expect(errorDisplay.textContent).toContain('invalid date');
    });
  });

  /**
   * @behavior Clicking a completed run row expands it to show each step
   *   with agent_name, status, and log_output
   * @business_rule Users need step-level visibility for debugging and auditing
   */
  it('AC-2: Run detail shows step-level logs', async () => {
    // GIVEN a workflow with a completed run that has step logs
    const WorkflowDetailPage = (
      await import('../../routes/dashboard/workflows/[id]/+page.svelte')
    ).default;

    render(WorkflowDetailPage, {
      props: {
        data: {
          workflow: baseWorkflow,
          resolvedSteps: [],
          runs: [completedRunWithSteps],
          events: []
        }
      }
    });

    // WHEN I click on a run row to expand it
    const runRow = screen.getByTestId('run-history-row');
    await fireEvent.click(runRow);

    // THEN I should see each step with agent_name, status, and log_output
    await waitFor(() => {
      const stepDetails = screen.getAllByTestId('run-step-detail');
      expect(stepDetails).toHaveLength(2);
    });

    const stepDetails = screen.getAllByTestId('run-step-detail');

    // First step: SEO Writer
    expect(stepDetails[0].textContent).toContain('SEO Writer');
    expect(stepDetails[0].textContent).toContain('completed');
    expect(stepDetails[0].textContent).toContain('Generated article');

    // Second step: Ghost Publisher
    expect(stepDetails[1].textContent).toContain('Ghost Publisher');
    expect(stepDetails[1].textContent).toContain('Published to Ghost CMS');
  });

  /**
   * @behavior The date column in run history shows both date AND time,
   *   not just the date portion
   * @business_rule Users running workflows multiple times per day need
   *   the time to distinguish between runs
   */
  it('AC-3: Run timestamps show date AND time', async () => {
    // GIVEN a workflow with runs
    const WorkflowDetailPage = (
      await import('../../routes/dashboard/workflows/[id]/+page.svelte')
    ).default;

    render(WorkflowDetailPage, {
      props: {
        data: {
          workflow: baseWorkflow,
          resolvedSteps: [],
          runs: [completedRunWithSteps],
          events: []
        }
      }
    });

    // WHEN I view the run history
    const runRow = screen.getByTestId('run-history-row');

    // THEN the date column should include both date and time (not just date)
    // The run was created at '2025-06-01T09:00:00Z', so the display
    // should contain a time component (e.g., "9:00" or "09:00"), not just "6/1/2025"
    const dateText = runRow.textContent ?? '';

    // Should contain a time indicator (hours:minutes pattern)
    expect(dateText).toMatch(/\d{1,2}:\d{2}/);
  });
});

// ===========================================================================
// Issue 2: No delete workflow capability
// ===========================================================================

describe('Issue 2 -- Delete workflow capability', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: [] })
    });
  });

  /**
   * @behavior The workflow detail page should have a delete button visible
   * @business_rule Users must be able to remove workflows they no longer need
   */
  it('AC-5: Delete button exists on workflow detail page', async () => {
    // GIVEN I am on a workflow detail page
    const WorkflowDetailPage = (
      await import('../../routes/dashboard/workflows/[id]/+page.svelte')
    ).default;

    render(WorkflowDetailPage, {
      props: {
        data: {
          workflow: baseWorkflow,
          resolvedSteps: [],
          runs: [],
          events: []
        }
      }
    });

    // THEN I should see a delete button
    const deleteBtn = screen.getByTestId('workflow-delete-button');
    expect(deleteBtn).toBeInTheDocument();
  });

  /**
   * @behavior Clicking the delete button shows a confirmation dialog.
   *   Confirming the deletion calls DELETE /api/v1/workflows/:id and
   *   redirects to /dashboard/workflows
   * @business_rule Destructive actions require explicit confirmation
   *   to prevent accidental data loss
   */
  it('AC-4: Delete workflow with confirmation and redirect', async () => {
    // GIVEN I am on a workflow detail page
    const WorkflowDetailPage = (
      await import('../../routes/dashboard/workflows/[id]/+page.svelte')
    ).default;

    mockFetch.mockImplementation((url: string, options?: RequestInit) => {
      if (typeof url === 'string' && url.includes('/api/v1/workflows/') && options?.method === 'DELETE') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: null })
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: [] })
      });
    });

    render(WorkflowDetailPage, {
      props: {
        data: {
          workflow: baseWorkflow,
          resolvedSteps: [],
          runs: [],
          events: []
        }
      }
    });

    // WHEN I click the delete button
    const deleteBtn = screen.getByTestId('workflow-delete-button');
    await fireEvent.click(deleteBtn);

    // THEN I should see a confirmation dialog
    await waitFor(() => {
      const confirmDialog = screen.getByTestId('delete-confirm-dialog');
      expect(confirmDialog).toBeInTheDocument();
    });

    // AND when I confirm the deletion
    const confirmBtn = screen.getByTestId('delete-confirm-button');
    await fireEvent.click(confirmBtn);

    // THEN the workflow is deleted via DELETE /api/v1/workflows/:id
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        `/api/v1/workflows/${baseWorkflow.id}`,
        expect.objectContaining({
          method: 'DELETE'
        })
      );
    });

    // AND I'm redirected to /dashboard/workflows
    await waitFor(() => {
      expect(mockGoto).toHaveBeenCalledWith('/dashboard/workflows');
    });
  });
});

// ===========================================================================
// Issue 3: Agents don't show in workflow creation wizard
// ===========================================================================

describe('Issue 3 -- Agents don\'t show in workflow creation wizard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  /**
   * URL-aware fetch mock that returns agents with the correct type field
   * AND includes both writing_agents and research_agents data.
   */
  function setupAgentFetchRouter(overrides?: {
    writingAgents?: Array<{ id: string; name: string; type: string; project_id: string; config: Record<string, unknown> }>;
    researchAgents?: Array<{ id: string; name: string; type: string; project_id: string; config: Record<string, unknown> }>;
  }) {
    const writing = overrides?.writingAgents ?? [
      { id: 'agent-w1', name: 'SEO Blog Writer', type: 'writing', project_id: 'proj-1', config: {} },
      { id: 'agent-w2', name: 'Newsletter Writer', type: 'writing', project_id: 'proj-1', config: {} }
    ];
    const research = overrides?.researchAgents ?? [
      { id: 'agent-r1', name: 'Market Researcher', type: 'research', project_id: 'proj-1', config: {} },
      { id: 'agent-r2', name: 'Competitor Tracker', type: 'research', project_id: 'proj-1', config: {} }
    ];
    const allAgents = [...writing, ...research];

    mockFetch.mockImplementation((url: string) => {
      if (typeof url === 'string' && url.includes('/api/v1/writing-agents')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: allAgents })
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: [] })
      });
    });
  }

  /**
   * @behavior When the agent selection step loads, writing agents appear
   *   under a "Writing" group and research agents appear under a "Research" group
   * @business_rule Both agent types must be visible and properly categorized
   *   for users to build multi-step workflows
   */
  it('AC-6: Writing and research agents appear in grouped sections', async () => {
    // GIVEN I am creating a new workflow
    setupAgentFetchRouter();

    const StepAgents = (
      await import('../../lib/components/wizard/StepAgents.svelte')
    ).default;

    // WHEN the agent selection step loads
    render(StepAgents, {
      props: {
        projectId: 'proj-1',
        selectedAgents: [],
        onToggleAgent: vi.fn(),
        validationError: null
      }
    });

    // THEN I should see writing agents under a "Writing" group
    await waitFor(() => {
      expect(screen.getByTestId('agent-group-writing')).toBeInTheDocument();
    });

    const writingGroup = screen.getByTestId('agent-group-writing');
    expect(writingGroup.textContent).toContain('SEO Blog Writer');
    expect(writingGroup.textContent).toContain('Newsletter Writer');

    // AND I should see research agents under a "Research" group
    expect(screen.getByTestId('agent-group-research')).toBeInTheDocument();
    const researchGroup = screen.getByTestId('agent-group-research');
    expect(researchGroup.textContent).toContain('Market Researcher');
    expect(researchGroup.textContent).toContain('Competitor Tracker');
  });

  /**
   * @behavior The API response includes a `type` field for each agent
   *   so that StepAgents can correctly filter into writing vs research groups.
   *   Writing agents have type='writing', research agents have type='research'.
   * @business_rule The type field is required for the UI to categorize agents.
   *   Without it, agents.filter(a => a.type === 'writing') returns nothing.
   */
  it('AC-7: Both agent types have correct type field and render in correct sections', async () => {
    // GIVEN the writing-agents API returns both types with explicit type fields
    setupAgentFetchRouter();

    const StepAgents = (
      await import('../../lib/components/wizard/StepAgents.svelte')
    ).default;

    const toggledAgents: string[] = [];
    const onToggle = (id: string) => toggledAgents.push(id);

    // WHEN StepAgents renders
    render(StepAgents, {
      props: {
        projectId: 'proj-1',
        selectedAgents: [],
        onToggleAgent: onToggle,
        validationError: null
      }
    });

    // THEN writing agents should be in the "Writing" section
    await waitFor(() => {
      expect(screen.getByTestId('agent-group-writing')).toBeInTheDocument();
    });

    // Verify writing group contains ONLY writing agents
    const writingGroup = screen.getByTestId('agent-group-writing');
    expect(writingGroup.textContent).toContain('SEO Blog Writer');
    expect(writingGroup.textContent).toContain('Newsletter Writer');
    expect(writingGroup.textContent).not.toContain('Market Researcher');
    expect(writingGroup.textContent).not.toContain('Competitor Tracker');

    // AND research agents should be in the "Research" section
    const researchGroup = screen.getByTestId('agent-group-research');
    expect(researchGroup.textContent).toContain('Market Researcher');
    expect(researchGroup.textContent).toContain('Competitor Tracker');
    expect(researchGroup.textContent).not.toContain('SEO Blog Writer');
    expect(researchGroup.textContent).not.toContain('Newsletter Writer');
  });
});
