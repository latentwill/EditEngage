/**
 * @behavior Workflow cards display "Next run: {date}" when a schedule exists,
 * or "Manual only" when no schedule is set, using client-side cron parsing
 * @business_rule Users need visibility into when their next automated run will
 * execute without making additional API calls
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

vi.mock('$lib/supabase', () => ({
  createSupabaseClient: vi.fn(() => ({
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
      unsubscribe: vi.fn()
    })),
    removeChannel: vi.fn()
  }))
}));

import WorkflowsPage from '$lib/../routes/dashboard/workflows/+page.svelte';

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

describe('Workflow Cards — Next Run Display', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-04T08:00:00Z'));
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) }));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('should display "Next run" with formatted date when workflow has a schedule', () => {
    const workflow = makeWorkflow({ schedule: '0 9 * * *' });
    render(WorkflowsPage, {
      props: { data: { pipelines: [workflow] } }
    });

    const nextRun = screen.getByTestId('workflow-next-run');
    expect(nextRun).toBeInTheDocument();
    expect(nextRun.textContent).toContain('Next run');
  });

  it('should display "Manual only" when workflow has no schedule', () => {
    const workflow = makeWorkflow({ schedule: null });
    render(WorkflowsPage, {
      props: { data: { pipelines: [workflow] } }
    });

    const nextRun = screen.getByTestId('workflow-next-run');
    expect(nextRun).toBeInTheDocument();
    expect(nextRun.textContent).toContain('Manual only');
  });

  it('should use client-side cron parsing (no API call)', () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    const workflow = makeWorkflow({ schedule: '0 9 * * *' });
    render(WorkflowsPage, {
      props: { data: { pipelines: [workflow] } }
    });

    // getNextRun is pure — no fetch calls should be made for rendering next run
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
