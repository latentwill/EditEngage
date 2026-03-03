<script lang="ts">
  import { onMount } from 'svelte';
  import ResearchQueryCard from '$lib/components/ResearchQueryCard.svelte';
  import { createResearchStore } from '$lib/stores/researchStore';
  import { createProjectStore } from '$lib/stores/projectStore';
  import { createSupabaseClient } from '$lib/supabase';
  import type { ProviderChainEntry } from '$lib/types/research.js';

  const client = createSupabaseClient();
  const researchStore = createResearchStore(client);
  const projectStore = createProjectStore();

  onMount(() => {
    researchStore.loadQueries();
  });

  const providers = ['perplexity', 'tavily', 'openai', 'serper', 'exa', 'brave', 'openrouter'] as const;
  const statuses = ['active', 'queued', 'running', 'complete', 'consumed', 'idle', 'error'] as const;

  function handleSearch(event: Event) {
    const target = event.target as HTMLInputElement;
    researchStore.searchQueries(target.value);
  }

  function handleProviderFilter(event: Event) {
    const target = event.target as HTMLSelectElement;
    const value = target.value || null;
    researchStore.filterByProvider(value);
  }

  function handleStatusFilter(event: Event) {
    const target = event.target as HTMLSelectElement;
    const value = target.value || null;
    researchStore.filterByStatus(value);
  }

  function handleViewBriefs(queryId: string) {
    window.location.href = `/dashboard/research/${queryId}`;
  }

  function handleRunNow(queryId: string) {
    researchStore.runQuery(queryId);
  }

  let showNewQueryForm = false;
  let newQueryName = '';

  function handleNewQueryClick() {
    showNewQueryForm = true;
  }

  function handleNewQueryCancel() {
    showNewQueryForm = false;
    newQueryName = '';
  }

  async function handleNewQuerySave() {
    const response = await fetch('/api/v1/research', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newQueryName })
    });

    if (response.ok) {
      showNewQueryForm = false;
      newQueryName = '';
      researchStore.loadQueries();
    }
  }
</script>

<div data-testid="research-page" class="space-y-6 py-6">
  <div class="flex items-center justify-between">
    <h1 data-testid="research-heading" class="text-2xl font-bold text-base-content">Research</h1>
    <button data-testid="new-query-btn" class="btn btn-primary btn-sm" onclick={handleNewQueryClick}>+ New Query</button>
  </div>

  {#if showNewQueryForm}
    <div data-testid="new-query-form" class="card bg-base-200 p-4 space-y-3">
      <input
        data-testid="new-query-name-input"
        type="text"
        placeholder="Query name..."
        class="input input-bordered input-sm w-full"
        bind:value={newQueryName}
      />
      <div class="flex gap-2 justify-end">
        <button data-testid="new-query-cancel-btn" class="btn btn-ghost btn-sm" onclick={handleNewQueryCancel}>Cancel</button>
        <button data-testid="new-query-save-btn" class="btn btn-primary btn-sm" onclick={handleNewQuerySave}>Save</button>
      </div>
    </div>
  {/if}

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
    <select
      data-testid="research-status-filter"
      class="select select-bordered select-sm"
      onchange={handleStatusFilter}
    >
      <option value="">All Statuses</option>
      {#each statuses as status}
        <option value={status}>{status}</option>
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
            provider_chain: query.provider_chain as unknown as ProviderChainEntry[],
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
