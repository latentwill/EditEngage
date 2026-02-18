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
    active: 'bg-emerald-500/20 text-emerald-400',
    paused: 'bg-yellow-500/20 text-yellow-400',
    completed: 'bg-emerald-500/20 text-emerald-400',
    running: 'bg-blue-500/20 text-blue-400',
    pending: 'bg-yellow-500/20 text-yellow-400',
    queued: 'bg-yellow-500/20 text-yellow-400',
    failed: 'bg-red-500/20 text-red-400'
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
      <a href="/dashboard/pipelines" class="text-white/40 hover:text-white/60 text-sm">&larr; Circuits</a>
    </div>
  </div>

  <div class="backdrop-blur-[20px] bg-[var(--glass-bg,rgba(255,255,255,0.08))] border border-[var(--glass-border,rgba(255,255,255,0.08))] rounded-xl p-6">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <h1 data-testid="pipeline-detail-name" class="text-2xl font-bold text-white">{pipeline.name}</h1>
        <span
          data-testid="pipeline-detail-status"
          class="text-xs px-2 py-0.5 rounded-full {statusColors[pipeline.is_active ? 'active' : 'paused']}"
        >
          {pipeline.is_active ? 'active' : 'paused'}
        </span>
      </div>

      <button
        data-testid="pipeline-detail-run-button"
        class="px-4 py-2 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
      >
        Run Now
      </button>
    </div>

    {#if pipeline.description}
      <p class="text-sm text-white/60 mt-2">{pipeline.description}</p>
    {/if}
  </div>

  <div class="backdrop-blur-[20px] bg-[var(--glass-bg,rgba(255,255,255,0.08))] border border-[var(--glass-border,rgba(255,255,255,0.08))] rounded-xl p-4">
    <h2 class="text-sm font-semibold text-white/70 uppercase tracking-wide mb-3">Run History</h2>

    <div class="space-y-0">
      <div class="grid grid-cols-4 gap-4 py-2 text-xs text-white/40 uppercase tracking-wide border-b border-white/[0.06]">
        <span>Date</span>
        <span>Status</span>
        <span>Duration</span>
        <span>Steps</span>
      </div>

      {#each runs as run}
        <div
          data-testid="run-history-row"
          class="grid grid-cols-4 gap-4 py-3 border-b border-white/[0.06] last:border-0"
        >
          <span class="text-sm text-white/80">
            {new Date(run.created_at).toLocaleDateString()}
          </span>
          <span data-testid="run-status">
            <span class="text-xs px-2 py-0.5 rounded-full {statusColors[run.status] ?? 'bg-white/10 text-white/60'}">
              {run.status}
            </span>
          </span>
          <span data-testid="run-duration" class="text-sm text-white/60">
            {formatDuration(run.started_at, run.completed_at)}
          </span>
          <span class="text-sm text-white/60">
            {run.current_step}/{run.total_steps}
          </span>
        </div>
      {/each}

      {#if runs.length === 0}
        <div class="py-8 text-center text-sm text-white/40">
          No runs yet. Click "Run Now" to start.
        </div>
      {/if}
    </div>
  </div>
</div>
