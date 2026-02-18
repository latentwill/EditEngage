<script lang="ts">
  import { createSupabaseClient } from '$lib/supabase.js';
  import type { PipelineReviewMode, PipelineRunStatus } from '$lib/types/database.js';

  type Pipeline = {
    id: string;
    project_id: string;
    name: string;
    description: string | null;
    schedule: string | null;
    review_mode: PipelineReviewMode;
    is_active: boolean;
    steps: Array<{ agentType: string; config: Record<string, unknown> }>;
    created_at: string;
    updated_at: string;
    last_run_at: string | null;
  };

  type PipelineRun = {
    id: string;
    pipeline_id: string;
    status: PipelineRunStatus;
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
      pipeline: Pipeline;
      runs: PipelineRun[];
    };
  } = $props();

  let pipeline = $derived(data.pipeline);
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

  // Subscribe to real-time updates for pipeline runs
  const supabase = createSupabaseClient();
  const channel = supabase
    .channel(`pipeline-runs-${pipeline.id}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'pipeline_runs',
      filter: `pipeline_id=eq.${pipeline.id}`
    }, (payload: { new: PipelineRun }) => {
      const updated = payload.new;
      runs = runs.map(r => r.id === updated.id ? updated : r);
    })
    .subscribe();
</script>

<div data-testid="pipeline-detail-page" class="space-y-8 py-6">
  <div class="flex items-center justify-between">
    <div class="flex items-center gap-3">
      <a href="/dashboard/pipelines" class="text-base-content/40 hover:text-base-content/60 text-sm">&larr; Circuits</a>
    </div>
  </div>

  <div class="card bg-base-200 rounded-xl p-6">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <h1 data-testid="pipeline-detail-name" class="text-2xl font-bold text-base-content">{pipeline.name}</h1>
        <span
          data-testid="pipeline-detail-status"
          class="badge {statusColors[pipeline.is_active ? 'active' : 'paused']}"
        >
          {pipeline.is_active ? 'active' : 'paused'}
        </span>
      </div>

      <button
        data-testid="pipeline-detail-run-button"
        class="btn btn-primary btn-sm"
      >
        Run Now
      </button>
    </div>

    {#if pipeline.description}
      <p class="text-sm text-base-content/60 mt-2">{pipeline.description}</p>
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
