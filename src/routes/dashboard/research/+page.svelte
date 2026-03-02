<script lang="ts">
  import { onMount } from 'svelte';
  import ResearchQueryCard from '$lib/components/ResearchQueryCard.svelte';
  import { createResearchStore } from '$lib/stores/researchStore';
  import { createProjectStore } from '$lib/stores/projectStore';
  import { createSupabaseClient } from '$lib/supabase';

  const client = createSupabaseClient();
  const researchStore = createResearchStore(client);
  const projectStore = createProjectStore();

  onMount(() => {
    researchStore.loadQueries();
  });

  const providers = ['perplexity', 'tavily', 'openai', 'serper', 'exa', 'brave', 'openrouter'] as const;

  function handleSearch(event: Event) {
    const target = event.target as HTMLInputElement;
    researchStore.searchQueries(target.value);
  }

  function handleProviderFilter(event: Event) {
    const target = event.target as HTMLSelectElement;
    const value = target.value || null;
    researchStore.filterByProvider(value);
  }

  function handleViewBriefs(queryId: string) {
    window.location.href = `/dashboard/research/${queryId}`;
  }

  function handleRunNow(queryId: string) {
    researchStore.runQuery(queryId);
  }
</script>

<div data-testid="research-page" class="space-y-6 py-6">
  <div class="flex items-center justify-between">
    <h1 data-testid="research-heading" class="text-2xl font-bold text-base-content">Research</h1>
    <button data-testid="new-query-btn" class="btn btn-primary btn-sm">+ New Query</button>
  </div>

  <div class="flex gap-3">
    <input
      data-testid="research-search-input"
      type="text"
      placeholder="Search queries..."
      class="input input-bordered input-sm flex-1"
      oninput={handleSearch}
    />
    <select
      data-testid="research-provider-filter"
      class="select select-bordered select-sm"
      onchange={handleProviderFilter}
    >
      <option value="">All Providers</option>
      {#each providers as provider}
        <option value={provider}>{provider}</option>
      {/each}
    </select>
  </div>

  {#if researchStore.loading}
    <div data-testid="research-loading" class="flex flex-col gap-4">
      {#each [1, 2, 3] as _}
        <div class="skeleton h-32 w-full rounded-xl"></div>
      {/each}
    </div>
  {:else if researchStore.queries.length === 0}
    <div data-testid="research-empty-state" class="text-center py-12 text-base-content/60">
      <p>No research queries found. Create your first query to get started.</p>
    </div>
  {:else}
    <div data-testid="research-query-list" class="flex flex-col gap-4">
      {#each researchStore.queries as query (query.id)}
        <ResearchQueryCard
          query={{
            id: query.id,
            name: query.name,
            status: query.status,
            provider_chain: query.provider_chain as { provider: string; role: string }[],
            schedule: query.schedule,
            last_run_at: query.last_run_at,
            brief_count: query.brief_count,
            pipeline_name: null
          }}
          onviewbriefs={handleViewBriefs}
          onrunnow={handleRunNow}
        />
      {/each}
    </div>
  {/if}
</div>
