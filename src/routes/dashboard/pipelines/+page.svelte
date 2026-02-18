<script lang="ts">
  import type { PipelineReviewMode } from '$lib/types/database.js';

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

  let { data }: {
    data: {
      pipelines: Pipeline[];
    };
  } = $props();

  let overrides = $state<Record<string, boolean>>({});

  let pipelines = $derived(
    data.pipelines.map(p => ({
      ...p,
      is_active: overrides[p.id] !== undefined ? overrides[p.id] : p.is_active
    }))
  );

  const statusColors: Record<string, string> = {
    active: 'bg-emerald-500/20 text-emerald-400',
    paused: 'bg-yellow-500/20 text-yellow-400'
  };

  async function runPipeline(pipelineId: string) {
    await fetch(`/api/v1/circuits/${pipelineId}/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
  }

  async function togglePipeline(pipeline: Pipeline) {
    const newActive = !pipeline.is_active;
    await fetch(`/api/v1/circuits/${pipeline.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: newActive })
    });
    overrides = { ...overrides, [pipeline.id]: newActive };
  }
</script>

<div data-testid="pipelines-page" class="space-y-8 py-6">
  <div class="flex items-center justify-between">
    <h1 class="text-2xl font-bold text-white">Circuits</h1>
    <a
      href="/dashboard/pipelines/create"
      data-testid="create-pipeline-button"
      class="px-4 py-2 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
    >
      Create Circuit
    </a>
  </div>

  <div class="space-y-3">
    {#each pipelines as pipeline}
      <a
        href="/dashboard/pipelines/{pipeline.id}"
        data-testid="pipeline-card"
        class="block backdrop-blur-[20px] bg-[var(--glass-bg,rgba(255,255,255,0.08))] border border-[var(--glass-border,rgba(255,255,255,0.08))] rounded-xl p-4 hover:bg-white/[0.12] transition-all duration-300"
      >
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <span class="text-sm font-medium text-white">{pipeline.name}</span>
            <span
              data-testid="pipeline-status-badge"
              class="text-xs px-2 py-0.5 rounded-full {statusColors[pipeline.is_active ? 'active' : 'paused']}"
            >
              {pipeline.is_active ? 'active' : 'paused'}
            </span>
          </div>

          <div class="flex items-center gap-3">
            <span class="text-xs text-white/40">
              {pipeline.steps.length} step{pipeline.steps.length !== 1 ? 's' : ''}
            </span>

            {#if pipeline.last_run_at}
              <span class="text-xs text-white/40">
                Last run: {new Date(pipeline.last_run_at).toLocaleDateString()}
              </span>
            {/if}

            <button
              data-testid="pipeline-run-button"
              class="px-3 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 text-xs"
              onclick={(e) => { e.preventDefault(); e.stopPropagation(); runPipeline(pipeline.id); }}
            >
              Run Now
            </button>

            <button
              data-testid="pipeline-toggle"
              role="switch"
              aria-checked={pipeline.is_active}
              aria-label="Toggle {pipeline.name} active"
              class="w-10 h-5 rounded-full relative transition-colors duration-200 {pipeline.is_active ? 'bg-emerald-500/30' : 'bg-white/10'}"
              onclick={(e) => { e.preventDefault(); e.stopPropagation(); togglePipeline(pipeline); }}
            >
              <span
                class="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform duration-200 {pipeline.is_active ? 'translate-x-5' : 'translate-x-0'}"
              ></span>
            </button>
          </div>
        </div>
      </a>
    {/each}
  </div>
</div>
