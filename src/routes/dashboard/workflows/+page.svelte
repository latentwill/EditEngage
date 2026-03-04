<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import type { WorkflowReviewMode, WorkflowRunStatus } from '$lib/types/database.js';
  import { getNextRun } from '$lib/utils/cron-converter.js';
  import { createSupabaseClient } from '$lib/supabase.js';

  type CurrentRun = {
    id: string;
    status: WorkflowRunStatus;
    current_step: number;
    total_steps: number;
  };

  type Workflow = {
    id: string;
    project_id: string;
    name: string;
    description: string | null;
    schedule: string | null;
    review_mode: WorkflowReviewMode;
    is_active: boolean;
    steps: Array<{ agentType: string; config: Record<string, unknown> }> | null | undefined;
    created_at: string;
    updated_at: string;
    last_run_at: string | null;
    current_run?: CurrentRun;
  };

  let { data }: {
    data: {
      pipelines: Workflow[];
    };
  } = $props();

  let overrides = $state<Record<string, boolean>>({});
  let runOverrides = $state<Record<string, CurrentRun | undefined>>({});

  let workflows = $derived(
    data.pipelines.map(w => ({
      ...w,
      is_active: overrides[w.id] !== undefined ? overrides[w.id] : w.is_active,
      current_run: runOverrides[w.id] !== undefined ? runOverrides[w.id] : w.current_run
    }))
  );

  const statusColors: Record<string, string> = {
    active: 'badge-success',
    paused: 'badge-warning'
  };

  let channel: ReturnType<ReturnType<typeof createSupabaseClient>['channel']> | null = null;

  onMount(() => {
    const supabase = createSupabaseClient();
    channel = supabase
      .channel('pipeline-runs')
      .on(
        'postgres_changes' as 'system',
        { event: 'UPDATE', schema: 'public', table: 'pipeline_runs' },
        (payload: { new: { pipeline_id: string; status: WorkflowRunStatus; current_step: number; total_steps: number; id: string } }) => {
          const run = payload.new;
          if (run.status === 'completed' || run.status === 'failed') {
            runOverrides = { ...runOverrides, [run.pipeline_id]: undefined };
          } else {
            runOverrides = {
              ...runOverrides,
              [run.pipeline_id]: {
                id: run.id,
                status: run.status,
                current_step: run.current_step,
                total_steps: run.total_steps
              }
            };
          }
        }
      )
      .subscribe();
  });

  onDestroy(() => {
    if (channel) {
      const supabase = createSupabaseClient();
      supabase.removeChannel(channel);
    }
  });

  async function runWorkflow(workflowId: string) {
    await fetch(`/api/v1/workflows/${workflowId}/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
  }

  async function toggleWorkflow(workflow: Workflow) {
    const newActive = !workflow.is_active;
    await fetch(`/api/v1/workflows/${workflow.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: newActive })
    });
    overrides = { ...overrides, [workflow.id]: newActive };
  }
</script>

<div data-testid="workflows-page" class="space-y-8 py-6">
  <div class="flex items-center justify-between">
    <h1 class="text-2xl font-bold text-base-content">Workflows</h1>
    <a
      href="/dashboard/workflows/create"
      data-testid="create-workflow-button"
      class="btn btn-primary btn-sm"
    >
      Create Workflow
    </a>
  </div>

  <div class="space-y-3">
    {#each workflows as workflow}
      <a
        href="/dashboard/workflows/{workflow.id}"
        data-testid="workflow-card"
        class="block card bg-base-200 rounded-xl p-4 hover:bg-base-300 transition-all duration-300"
      >
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <span class="text-sm font-medium text-base-content">{workflow.name}</span>
            <span
              data-testid="workflow-status-badge"
              class="badge {statusColors[workflow.is_active ? 'active' : 'paused']}"
            >
              {workflow.is_active ? 'active' : 'paused'}
            </span>
            {#if workflow.current_run?.status === 'running'}
              <span
                data-testid="workflow-running-badge"
                class="badge badge-info gap-1"
              >
                Running
                <span class="text-xs">Step {workflow.current_run.current_step}/{workflow.current_run.total_steps}</span>
              </span>
            {/if}
          </div>

          <div class="flex items-center gap-3">
            <span class="text-xs text-base-content/40">
              {(workflow.steps ?? []).length} step{(workflow.steps ?? []).length !== 1 ? 's' : ''}
            </span>

            {#if workflow.last_run_at}
              <span class="text-xs text-base-content/40">
                Last run: {new Date(workflow.last_run_at).toLocaleDateString()}
              </span>
            {/if}

            <span data-testid="workflow-next-run" class="text-xs text-base-content/40">
              {#if workflow.schedule}
                Next run: {getNextRun(workflow.schedule).toLocaleString()}
              {:else}
                Manual only
              {/if}
            </span>

            <button
              data-testid="workflow-run-button"
              class="btn btn-primary btn-xs"
              onclick={(e) => { e.preventDefault(); e.stopPropagation(); runWorkflow(workflow.id); }}
            >
              Run Now
            </button>

            <input
              data-testid="workflow-toggle"
              type="checkbox"
              role="switch"
              aria-checked={workflow.is_active}
              aria-label="Toggle {workflow.name} active"
              class="toggle toggle-primary toggle-sm"
              checked={workflow.is_active}
              onclick={(e) => { e.preventDefault(); e.stopPropagation(); toggleWorkflow(workflow); }}
            />
          </div>
        </div>
      </a>
    {/each}
  </div>
</div>
