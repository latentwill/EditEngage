<script lang="ts">
  import { createSupabaseClient } from '$lib/supabase.js';
  import type { WorkflowReviewMode, WorkflowRunStatus } from '$lib/types/database.js';

  type Workflow = {
    id: string;
    project_id: string;
    name: string;
    description: string | null;
    schedule: string | null;
    review_mode: WorkflowReviewMode;
    is_active: boolean;
    steps: Array<{ agentType: string; config: Record<string, unknown> }>;
    created_at: string;
    updated_at: string;
    last_run_at: string | null;
  };

  type WorkflowRun = {
    id: string;
    pipeline_id: string;
    status: WorkflowRunStatus;
    current_step: number;
    total_steps: number;
    started_at: string | null;
    completed_at: string | null;
    result: Record<string, unknown> | null;
    error: string | null;
    bullmq_job_id: string | null;
    created_at: string;
  };

  let { data }: {
    data: {
      workflow: Workflow;
      runs: WorkflowRun[];
    };
  } = $props();

  let workflow = $derived(data.workflow);
  let runs = $state(data.runs);

  const statusColors: Record<string, string> = {
    active: 'badge-success',
    paused: 'badge-warning',
    completed: 'badge-success',
    running: 'badge-info',
    pending: 'badge-warning',
    queued: 'badge-warning',
    failed: 'badge-error'
  };

  function formatDuration(startedAt: string | null, completedAt: string | null): string {
    if (!startedAt) return '-';
    const start = new Date(startedAt).getTime();
    const end = completedAt ? new Date(completedAt).getTime() : Date.now();
    const seconds = Math.floor((end - start) / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  }

  // Subscribe to real-time updates for workflow runs
  const supabase = createSupabaseClient();
  const channel = supabase
    .channel(`workflow-runs-${workflow.id}`)
    .on('postgres_changes' as any, {
      event: '*',
      schema: 'public',
      table: 'pipeline_runs',
      filter: `pipeline_id=eq.${workflow.id}`
    }, (payload: { new: WorkflowRun }) => {
      const updated = payload.new;
      runs = runs.map(r => r.id === updated.id ? updated : r);
    })
    .subscribe();
</script>

<div data-testid="workflow-detail-page" class="space-y-8 py-6">
  <div class="flex items-center justify-between">
    <div class="flex items-center gap-3">
      <a href="/dashboard/workflows" class="text-base-content/40 hover:text-base-content/60 text-sm">&larr; Workflows</a>
    </div>
  </div>

  <div class="card bg-base-200 rounded-xl p-6">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <h1 data-testid="workflow-detail-name" class="text-2xl font-bold text-base-content">{workflow.name}</h1>
        <span
          data-testid="workflow-detail-status"
          class="badge {statusColors[workflow.is_active ? 'active' : 'paused']}"
        >
          {workflow.is_active ? 'active' : 'paused'}
        </span>
      </div>

      <button
        data-testid="workflow-detail-run-button"
        class="btn btn-primary btn-sm"
      >
        Run Now
      </button>
    </div>

    {#if workflow.description}
      <p class="text-sm text-base-content/60 mt-2">{workflow.description}</p>
    {/if}
  </div>

  <div class="card bg-base-200 rounded-xl p-4">
    <h2 class="text-sm font-semibold text-base-content/70 uppercase tracking-wide mb-3">Run History</h2>

    <div class="space-y-0">
      <div class="grid grid-cols-4 gap-4 py-2 text-xs text-base-content/40 uppercase tracking-wide border-b border-base-300">
        <span>Date</span>
        <span>Status</span>
        <span>Duration</span>
        <span>Steps</span>
      </div>

      {#each runs as run}
        <div
          data-testid="run-history-row"
          class="grid grid-cols-4 gap-4 py-3 border-b border-base-300 last:border-0"
        >
          <span class="text-sm text-base-content/80">
            {new Date(run.created_at).toLocaleDateString()}
          </span>
          <span data-testid="run-status">
            <span class="badge {statusColors[run.status] ?? 'badge-ghost'}">
              {run.status}
            </span>
          </span>
          <span data-testid="run-duration" class="text-sm text-base-content/60">
            {formatDuration(run.started_at, run.completed_at)}
          </span>
          <span class="text-sm text-base-content/60">
            {run.current_step}/{run.total_steps}
          </span>
        </div>
      {/each}

      {#if runs.length === 0}
        <div class="py-8 text-center text-sm text-base-content/40">
          No runs yet. Click "Run Now" to start.
        </div>
      {/if}
    </div>
  </div>
</div>
