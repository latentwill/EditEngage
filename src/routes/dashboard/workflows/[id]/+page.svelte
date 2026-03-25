<script lang="ts">
  import { goto } from '$app/navigation';
  import { createSupabaseClient } from '$lib/supabase.js';
  import type { WorkflowReviewMode, WorkflowRunStatus } from '$lib/types/database.js';
  import OrchestrationFeed from '$lib/components/OrchestrationFeed.svelte';
  import type { EventRow } from '$lib/stores/events.js';

  type Workflow = {
    id: string;
    project_id: string;
    name: string;
    description: string | null;
    schedule: string | null;
    review_mode: WorkflowReviewMode;
    is_active: boolean;
    steps: Array<Record<string, unknown>>;
    created_at: string;
    updated_at: string;
    last_run_at: string | null;
  };

  type ResolvedStep = {
    index: number;
    agent_id: string | null;
    agent_type: string;
    agent_name: string;
    topic_id: string | null;
    topic_name: string | null;
    destination_id: string | null;
    destination_name: string | null;
    prompt: string;
  };

  type RunStep = {
    agent_name: string;
    status: string;
    started_at: string | null;
    completed_at: string | null;
    log: string;
    log_output?: string;
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
    steps?: RunStep[];
  };

  type TopicOption = { id: string; title: string };
  type DestinationOption = { id: string; name: string };

  let { data }: {
    data: {
      workflow: Workflow;
      resolvedSteps: ResolvedStep[];
      allTopics: TopicOption[];
      allDestinations: DestinationOption[];
      runs: WorkflowRun[];
      events: EventRow[];
    };
  } = $props();

  let workflow = $derived(data.workflow);
  let resolvedSteps = $state(data.resolvedSteps);
  let runs = $state(data.runs);
  let runLoading = $state(false);
  let runError = $state<string | null>(null);
  let expandedRunId = $state<string | null>(null);
  let expandedStepIndex = $state<number | null>(null);
  let stepSaving = $state(false);
  let stepSaveError = $state<string | null>(null);
  let stepSaveSuccess = $state(false);
  let deleteConfirmOpen = $state(false);
  let deleting = $state(false);
  let deleteError = $state<string | null>(null);

  function toggleRunExpanded(runId: string) {
    expandedRunId = expandedRunId === runId ? null : runId;
  }

  function toggleStepExpanded(index: number) {
    expandedStepIndex = expandedStepIndex === index ? null : index;
  }

  function updateStepField(index: number, field: string, value: string) {
    resolvedSteps = resolvedSteps.map((s, i) => {
      if (i !== index) return s;
      const updated = { ...s, [field]: value };
      // Update display names when IDs change
      if (field === 'topic_id') {
        updated.topic_name = data.allTopics.find(t => t.id === value)?.title ?? null;
      }
      if (field === 'destination_id') {
        updated.destination_name = data.allDestinations.find(d => d.id === value)?.name ?? null;
      }
      return updated;
    });
  }

  async function saveSteps() {
    stepSaving = true;
    stepSaveError = null;
    stepSaveSuccess = false;
    try {
      const updatedSteps = workflow.steps.map((step, i) => ({
        ...step,
        topic_id: resolvedSteps[i]?.topic_id ?? step.topic_id,
        destination_id: resolvedSteps[i]?.destination_id ?? step.destination_id,
        prompt: resolvedSteps[i]?.prompt ?? ''
      }));
      const res = await fetch(`/api/v1/workflows/${workflow.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ steps: updatedSteps })
      });
      if (!res.ok) {
        const body = await res.json();
        stepSaveError = body.error || 'Failed to save steps';
      } else {
        stepSaveSuccess = true;
        setTimeout(() => { stepSaveSuccess = false; }, 2000);
      }
    } catch {
      stepSaveError = 'Failed to save steps';
    } finally {
      stepSaving = false;
    }
  }

  async function handleDelete() {
    deleting = true;
    deleteError = null;
    try {
      const res = await fetch(`/api/v1/workflows/${workflow.id}`, { method: 'DELETE' });
      if (res.ok) {
        goto('/dashboard/workflows');
        return;
      }
      const body = await res.json();
      deleteError = body.error || 'Failed to delete workflow';
    } catch {
      deleteError = 'Failed to delete workflow';
    } finally {
      deleting = false;
      deleteConfirmOpen = false;
    }
  }

  async function handleRunNow() {
    runLoading = true;
    runError = null;
    try {
      const res = await fetch(`/api/v1/workflows/${workflow.id}/run`, { method: 'POST' });
      if (!res.ok) {
        const body = await res.json();
        runError = body.error || 'Failed to start run';
      }
    } catch {
      runError = 'Failed to start run';
    } finally {
      runLoading = false;
    }
  }

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
  const channel = supabase.channel(`workflow-runs-${workflow.id}`);
  channel
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'pipeline_runs', filter: `pipeline_id=eq.${workflow.id}` },
      (payload) => {
        const updated = payload.new as WorkflowRun;
        runs = runs.map(r => r.id === updated.id ? updated : r);
      }
    )
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

      <div class="flex items-center gap-2">
        <button
          data-testid="workflow-delete-button"
          class="btn btn-error btn-sm btn-outline"
          onclick={() => deleteConfirmOpen = true}
        >
          Delete
        </button>
        <button
          data-testid="workflow-detail-run-button"
          class="btn btn-primary btn-sm"
          disabled={runLoading}
          onclick={handleRunNow}
        >
          {runLoading ? 'Running...' : 'Run Now'}
        </button>
      </div>
    </div>

    {#if runError}
      <p data-testid="run-error" class="text-sm text-error mt-2">{runError}</p>
    {/if}

    {#if deleteError}
      <p data-testid="delete-error" class="text-sm text-error mt-2">{deleteError}</p>
    {/if}

    {#if workflow.description}
      <p class="text-sm text-base-content/60 mt-2">{workflow.description}</p>
    {/if}
  </div>

  <!-- Workflow Steps -->
  <div class="card bg-base-200 rounded-xl p-4">
    <div class="flex items-center justify-between mb-3">
      <h2 class="text-sm font-semibold text-base-content/70 uppercase tracking-wide">Steps</h2>
      {#if resolvedSteps.some(s => {
        const orig = data.resolvedSteps[s.index];
        return s.prompt !== (orig?.prompt ?? '') || s.topic_id !== orig?.topic_id || s.destination_id !== orig?.destination_id;
      })}
        <button
          class="btn btn-primary btn-sm"
          disabled={stepSaving}
          onclick={saveSteps}
        >
          {stepSaving ? 'Saving...' : 'Save Changes'}
        </button>
      {/if}
    </div>

    {#if stepSaveError}
      <p class="text-sm text-error mb-2">{stepSaveError}</p>
    {/if}
    {#if stepSaveSuccess}
      <p class="text-sm text-success mb-2">Steps saved.</p>
    {/if}

    {#if resolvedSteps.length === 0}
      <div class="py-6 text-center text-sm text-base-content/40">
        No steps configured for this workflow.
      </div>
    {:else}
      <div class="space-y-2">
        {#each resolvedSteps as step (step.index)}
          <!-- svelte-ignore a11y_click_events_have_key_events -->
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <div class="rounded-lg border border-base-300 overflow-hidden">
            <div
              class="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-base-300/30 transition-colors"
              onclick={() => toggleStepExpanded(step.index)}
            >
              <span class="text-base-content/40 text-xs font-mono w-6">{step.index + 1}</span>
              <span class="font-medium text-sm text-base-content flex-1">{step.agent_name}</span>
              <span class="badge badge-sm badge-ghost">{step.agent_type}</span>
              {#if step.topic_name}
                <span class="text-xs text-base-content/50">{step.topic_name}</span>
              {/if}
              <svg
                class="w-4 h-4 text-base-content/40 transition-transform {expandedStepIndex === step.index ? 'rotate-180' : ''}"
                fill="none" viewBox="0 0 24 24" stroke="currentColor"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </div>

            {#if expandedStepIndex === step.index}
              <div class="px-4 pb-4 pt-1 border-t border-base-300 space-y-3">
                <div class="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <label class="text-base-content/50 text-xs block mb-1" for="step-topic-{step.index}">Topic</label>
                    <select
                      id="step-topic-{step.index}"
                      class="select select-bordered select-sm w-full text-sm"
                      value={step.topic_id ?? ''}
                      onchange={(e) => updateStepField(step.index, 'topic_id', (e.target as HTMLSelectElement).value)}
                    >
                      <option value="" disabled>Select a topic</option>
                      {#each data.allTopics as topic (topic.id)}
                        <option value={topic.id}>{topic.title}</option>
                      {/each}
                    </select>
                  </div>
                  <div>
                    <label class="text-base-content/50 text-xs block mb-1" for="step-dest-{step.index}">Destination</label>
                    <select
                      id="step-dest-{step.index}"
                      class="select select-bordered select-sm w-full text-sm"
                      value={step.destination_id ?? ''}
                      onchange={(e) => updateStepField(step.index, 'destination_id', (e.target as HTMLSelectElement).value)}
                    >
                      <option value="" disabled>Select a destination</option>
                      {#each data.allDestinations as dest (dest.id)}
                        <option value={dest.id}>{dest.name}</option>
                      {/each}
                    </select>
                  </div>
                </div>

                <div>
                  <label
                    class="text-base-content/50 text-xs block mb-1"
                    for="step-prompt-{step.index}"
                  >
                    Prompt / Instructions
                  </label>
                  <textarea
                    id="step-prompt-{step.index}"
                    class="textarea textarea-bordered w-full text-sm font-mono"
                    rows="4"
                    placeholder="Custom instructions for this step (e.g. tone, length, focus areas)..."
                    value={step.prompt}
                    oninput={(e) => updateStepField(step.index, 'prompt', (e.target as HTMLTextAreaElement).value)}
                  ></textarea>
                </div>
              </div>
            {/if}
          </div>
        {/each}
      </div>
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
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div
          data-testid="run-history-row"
          class="grid grid-cols-4 gap-4 py-3 border-b border-base-300 last:border-0 cursor-pointer hover:bg-base-300/30"
          onclick={() => toggleRunExpanded(run.id)}
        >
          <span class="text-sm text-base-content/80">
            {new Date(run.created_at).toLocaleString()}
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

        {#if run.error}
          <div data-testid="run-error-message" class="px-2 py-1 text-sm text-error">
            {run.error}
          </div>
        {/if}

        {#if expandedRunId === run.id}
          <div class="pl-4 py-2 space-y-2 border-b border-base-300">
            {#if run.steps}
              {#each run.steps as step}
                <div data-testid="run-step-detail" class="card bg-base-300/50 p-3 rounded-lg">
                  <div class="flex items-center gap-2 mb-1">
                    <span class="font-semibold text-sm text-base-content">{step.agent_name}</span>
                    <span class="badge badge-sm {statusColors[step.status] ?? 'badge-ghost'}">{step.status}</span>
                  </div>
                  {#if step.log_output || step.log}
                    <p class="text-xs text-base-content/60 font-mono">{step.log_output ?? step.log}</p>
                  {/if}
                </div>
              {/each}
            {/if}

            {#if run.result}
              {@const pipelineResult = run.result as { status?: string; steps?: Array<{ title?: string; body?: string; metaDescription?: string; tags?: string[]; seoScore?: number }> }}
              {#if pipelineResult.steps?.length}
                {#each pipelineResult.steps as stepResult, i}
                  {#if stepResult.title}
                    <div class="card bg-base-300/50 p-4 rounded-lg">
                      <div class="flex items-center gap-2 mb-2">
                        <span class="text-xs text-base-content/40 uppercase">Step {i + 1} Output</span>
                        {#if stepResult.seoScore}
                          <span class="badge badge-sm badge-info">SEO: {stepResult.seoScore}/100</span>
                        {/if}
                      </div>
                      <h3 class="font-semibold text-base-content mb-1">{stepResult.title}</h3>
                      {#if stepResult.metaDescription}
                        <p class="text-sm text-base-content/60 mb-2">{stepResult.metaDescription}</p>
                      {/if}
                      {#if stepResult.tags?.length}
                        <div class="flex flex-wrap gap-1">
                          {#each stepResult.tags as tag}
                            <span class="badge badge-sm badge-outline">{tag}</span>
                          {/each}
                        </div>
                      {/if}
                    </div>
                  {/if}
                {/each}
              {/if}
              {#if pipelineResult.status === 'failed'}
                <div class="text-sm text-error">Pipeline failed: {(run.result as { error?: string }).error ?? 'Unknown error'}</div>
              {/if}
            {:else if !run.steps?.length}
              <div class="text-sm text-base-content/40 py-2">No details available for this run.</div>
            {/if}
          </div>
        {/if}
      {/each}

      {#if runs.length === 0}
        <div class="py-8 text-center text-sm text-base-content/40">
          No runs yet. Click "Run Now" to start.
        </div>
      {/if}
    </div>
  </div>

  <div class="card bg-base-200 rounded-xl p-4">
    <h2 class="text-sm font-semibold text-base-content/70 uppercase tracking-wide mb-3">Activity Feed</h2>
    <OrchestrationFeed events={(data.events ?? []) as EventRow[]} />
  </div>

  {#if deleteConfirmOpen}
    <div data-testid="delete-confirm-dialog" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div class="card bg-base-200 p-6 max-w-sm mx-4">
        <h3 class="text-lg font-bold text-base-content mb-2">Delete Workflow</h3>
        <p class="text-sm text-base-content/60 mb-4">
          Are you sure you want to delete "{workflow.name}"? This action cannot be undone.
        </p>
        <div class="flex gap-2 justify-end">
          <button
            class="btn btn-sm"
            onclick={() => deleteConfirmOpen = false}
          >
            Cancel
          </button>
          <button
            data-testid="delete-confirm-button"
            class="btn btn-error btn-sm"
            disabled={deleting}
            onclick={handleDelete}
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  {/if}
</div>
