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
    active: 'badge-success',
    paused: 'badge-warning'
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
    <h1 class="text-2xl font-bold text-base-content">Circuits</h1>
    <a
      href="/dashboard/pipelines/create"
      data-testid="create-pipeline-button"
      class="btn btn-primary btn-sm"
    >
      Create Circuit
    </a>
  </div>

  <div class="space-y-3">
    {#each pipelines as pipeline}
      <a
        href="/dashboard/pipelines/{pipeline.id}"
        data-testid="pipeline-card"
        class="block card bg-base-200 rounded-xl p-4 hover:bg-base-300 transition-all duration-300"
      >
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <span class="text-sm font-medium text-base-content">{pipeline.name}</span>
            <span
              data-testid="pipeline-status-badge"
              class="badge {statusColors[pipeline.is_active ? 'active' : 'paused']}"
            >
              {pipeline.is_active ? 'active' : 'paused'}
            </span>
          </div>

          <div class="flex items-center gap-3">
            <span class="text-xs text-base-content/40">
              {pipeline.steps.length} step{pipeline.steps.length !== 1 ? 's' : ''}
            </span>

            {#if pipeline.last_run_at}
              <span class="text-xs text-base-content/40">
                Last run: {new Date(pipeline.last_run_at).toLocaleDateString()}
              </span>
            {/if}

            <button
              data-testid="pipeline-run-button"
              class="btn btn-primary btn-xs"
              onclick={(e) => { e.preventDefault(); e.stopPropagation(); runPipeline(pipeline.id); }}
            >
              Run Now
            </button>

            <input
              data-testid="pipeline-toggle"
              type="checkbox"
              role="switch"
              aria-checked={pipeline.is_active}
              aria-label="Toggle {pipeline.name} active"
              class="toggle toggle-primary toggle-sm"
              checked={pipeline.is_active}
              onclick={(e) => { e.preventDefault(); e.stopPropagation(); togglePipeline(pipeline); }}
            />
          </div>
        </div>
      </a>
    {/each}
  </div>
</div>
