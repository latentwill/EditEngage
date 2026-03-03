<script lang="ts">
  import type { ProviderChainEntry } from '$lib/types/research.js';
  import { LIFECYCLE_STEPS, STATUS_TO_LIFECYCLE_STEP } from '$lib/types/research.js';
  import type { ResearchQueryStatus } from '$lib/types/database.js';

  interface ResearchQuery {
    id: string;
    name: string;
    status: ResearchQueryStatus;
    provider_chain: ProviderChainEntry[];
    schedule: string | null;
    last_run_at: string | null;
    brief_count: number;
    pipeline_name: string | null;
  }

  interface Props {
    query: ResearchQuery;
    onviewbriefs: (queryId: string) => void;
    onrunnow: (queryId: string) => void;
  }

  let { query, onviewbriefs, onrunnow }: Props = $props();

  let relativeTime = $derived(
    query.last_run_at
      ? `${Math.round((Date.now() - new Date(query.last_run_at).getTime()) / 3600000)}h ago`
      : 'Never'
  );

  const statusClass: Record<ResearchQueryStatus, string> = {
    active: 'badge-success',
    running: 'badge-info',
    idle: 'badge-ghost',
    error: 'badge-error',
    queued: 'badge-warning',
    complete: 'badge-success',
    consumed: 'badge-neutral'
  };

  let currentStep = $derived(STATUS_TO_LIFECYCLE_STEP[query.status] ?? -1);
</script>

<div class="card bg-base-100 shadow-sm" data-testid="research-query-card">
  <div class="card-body gap-3">
    <div class="flex items-center justify-between">
      <h3 class="card-title text-base" data-testid="query-name">{query.name}</h3>
      <span class="badge {statusClass[query.status]}" data-testid="query-status">{query.status}</span>
    </div>

    <div class="flex flex-wrap gap-1" data-testid="query-providers">
      {#each query.provider_chain as entry}
        <span class="badge badge-outline badge-sm">{entry.provider}</span>
      {/each}
    </div>

    <div class="text-sm text-base-content/70">
      <span data-testid="query-schedule">{query.schedule ?? 'Manual only'}</span>
      <span class="mx-1">&middot;</span>
      <span data-testid="query-last-run">Last run: {relativeTime}</span>
    </div>

    <div class="text-sm text-base-content/70">
      <span data-testid="query-brief-count">{query.brief_count} briefs</span>
      <span class="mx-1">&middot;</span>
      <span data-testid="query-pipeline">{query.pipeline_name ? `Feeds into: ${query.pipeline_name}` : 'Standalone'}</span>
    </div>

    <div class="flex items-center gap-1 text-xs text-base-content/50" data-testid="query-lifecycle">
      {#each LIFECYCLE_STEPS as step, i}
        <span class={i <= currentStep ? 'text-primary font-semibold' : ''}>{step}</span>
        {#if i < LIFECYCLE_STEPS.length - 1}
          <span>&rarr;</span>
        {/if}
      {/each}
    </div>

    <div class="card-actions justify-end">
      <button class="btn btn-sm btn-outline" data-testid="query-view-briefs-btn" onclick={() => onviewbriefs(query.id)}>View Briefs</button>
      <button class="btn btn-sm btn-primary" data-testid="query-run-now-btn" onclick={() => onrunnow(query.id)}>Run Now</button>
    </div>
  </div>
</div>
