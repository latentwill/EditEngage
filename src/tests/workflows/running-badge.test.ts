/**
 * @behavior Workflow cards show a "Running" badge with step progress (e.g.,
 * "Step 2/3") when the workflow has an active pipeline_run, and remove
 * the badge when the run completes
 * @business_rule Users need real-time visibility into which workflows are
 * actively executing and how far along they are
 */
import { render, screen } from '@testing-library/svelte';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('$env/static/public', () => ({
  PUBLIC_SUPABASE_URL: 'http://localhost:54321',
  PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key'
}));

vi.mock('$app/navigation', () => ({
  goto: vi.fn()
}));

// Mock Supabase client for realtime subscription
const mockChannel = {
  on: vi.fn().mockReturnThis(),
  subscribe: vi.fn().mockReturnThis(),
  unsubscribe: vi.fn()
};

const mockSupabaseClient = {
  channel: vi.fn(() => mockChannel),
  removeChannel: vi.fn()
};

vi.mock('$lib/supabase', () => ({
  createSupabaseClient: vi.fn(() => mockSupabaseClient)
}));

import WorkflowsPage from '$lib/../routes/dashboard/workflows/+page.svelte';

type CurrentRun = {
  id: string;
  status: 'running' | 'completed' | 'failed' | 'queued';
  current_step: number;
  total_steps: number;
};

function makeWorkflow(overrides: Record<string, unknown> = {}) {
  return {
    id: `wf-${Date.now()}-${Math.random()}`,
    project_id: 'proj-1',
    name: 'Test Workflow',
    description: null,
    schedule: null,
    review_mode: 'draft_for_review' as const,
    is_active: true,
    steps: [{ agentType: 'seo_writer', config: {} }],
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    last_run_at: null,
    ...overrides
  };
}

describe('Workflow Cards — Running Badge', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should show "Running" badge when workflow has a running pipeline_run', () => {
    const currentRun: CurrentRun = {
      id: 'run-1',
      status: 'running',
      current_step: 2,
      total_steps: 3
    };
    const workflow = makeWorkflow({ current_run: currentRun });

    render(WorkflowsPage, {
      props: { data: { pipelines: [workflow] } }
    });

    const badge = screen.getByTestId('workflow-running-badge');
    expect(badge).toBeInTheDocument();
    expect(badge.textContent).toContain('Running');
    expect(badge.textContent).toContain('Step 2/3');
  });

  it('should update badge in real-time via Supabase subscription', () => {
    const currentRun: CurrentRun = {
      id: 'run-1',
      status: 'running',
      current_step: 1,
      total_steps: 3
    };
    const workflow = makeWorkflow({ current_run: currentRun });

    render(WorkflowsPage, {
      props: { data: { pipelines: [workflow] } }
    });

    // Verify that a Supabase channel subscription was set up
    expect(mockSupabaseClient.channel).toHaveBeenCalled();
    expect(mockChannel.on).toHaveBeenCalled();
    expect(mockChannel.subscribe).toHaveBeenCalled();
  });

  it('should remove badge when run completes', () => {
    const currentRun: CurrentRun = {
      id: 'run-1',
      status: 'completed',
      current_step: 3,
      total_steps: 3
    };
    const workflow = makeWorkflow({ current_run: currentRun });

    render(WorkflowsPage, {
      props: { data: { pipelines: [workflow] } }
    });

    // Completed runs should not show a running badge
    expect(screen.queryByTestId('workflow-running-badge')).not.toBeInTheDocument();
  });
});
