<script lang="ts">
  import type { ContentType, ContentStatus, DestinationType } from '$lib/types/database.js';

  type ContentItem = {
    id: string;
    project_id: string;
    pipeline_run_id: string | null;
    title: string;
    body: Record<string, unknown> | null;
    meta_description: string | null;
    tags: string[];
    content_type: ContentType;
    status: ContentStatus;
    published_at: string | null;
    published_url: string | null;
    destination_type: DestinationType | null;
    destination_config: Record<string, unknown> | null;
    created_at: string;
    updated_at: string;
    pipeline_name: string;
  };

  type PipelineRef = {
    id: string;
    name: string;
  };

  let { data }: {
    data: {
      contentItems: ContentItem[];
      pipelines: PipelineRef[];
    };
  } = $props();

  let statusFilter = $state('all');
  let typeFilter = $state('all');
  let pipelineFilter = $state('all');

  const statusColors: Record<string, string> = {
    draft: 'bg-white/10 text-white/60',
    in_review: 'bg-yellow-500/20 text-yellow-400',
    approved: 'bg-blue-500/20 text-blue-400',
    published: 'bg-emerald-500/20 text-emerald-400',
    rejected: 'bg-red-500/20 text-red-400'
  };

  let filteredItems = $derived(
    data.contentItems.filter((item) => {
      if (statusFilter !== 'all' && item.status !== statusFilter) return false;
      if (typeFilter !== 'all' && item.content_type !== typeFilter) return false;
      if (pipelineFilter !== 'all' && item.pipeline_name !== pipelineFilter) return false;
      return true;
    })
  );
</script>

<div data-testid="content-library-page" class="space-y-8 py-6">
  <div class="flex items-center justify-between">
    <h1 class="text-2xl font-bold text-white">Content Library</h1>
  </div>

  <div class="flex items-center gap-4">
    <select
      data-testid="status-filter"
      class="px-3 py-2 rounded-lg bg-white/[0.06] border border-white/[0.08] text-sm text-white/80"
      bind:value={statusFilter}
    >
      <option value="all">All Statuses</option>
      <option value="draft">Draft</option>
      <option value="in_review">In Review</option>
      <option value="approved">Approved</option>
      <option value="published">Published</option>
      <option value="rejected">Rejected</option>
    </select>

    <select
      data-testid="type-filter"
      class="px-3 py-2 rounded-lg bg-white/[0.06] border border-white/[0.08] text-sm text-white/80"
      bind:value={typeFilter}
    >
      <option value="all">All Types</option>
      <option value="article">Article</option>
      <option value="landing_page">Landing Page</option>
      <option value="social_post">Social Post</option>
    </select>

    <select
      data-testid="pipeline-filter"
      class="px-3 py-2 rounded-lg bg-white/[0.06] border border-white/[0.08] text-sm text-white/80"
      bind:value={pipelineFilter}
    >
      <option value="all">All Circuits</option>
      {#each data.pipelines as pipeline}
        <option value={pipeline.name}>{pipeline.name}</option>
      {/each}
    </select>
  </div>

  <div class="space-y-2">
    {#each filteredItems as item}
      <a
        href="/dashboard/content/{item.id}"
        data-testid="content-item"
        class="block backdrop-blur-[20px] bg-[var(--glass-bg,rgba(255,255,255,0.08))] border border-[var(--glass-border,rgba(255,255,255,0.08))] rounded-xl p-4 hover:bg-white/[0.12] transition-all duration-300"
      >
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <span class="text-sm font-medium text-white">{item.title}</span>
            <span
              data-testid="content-status-badge"
              class="text-xs px-2 py-0.5 rounded-full {statusColors[item.status] ?? 'bg-white/10 text-white/60'}"
            >
              {item.status}
            </span>
          </div>

          <div class="flex items-center gap-4">
            <span class="text-xs text-white/40">{item.pipeline_name}</span>
            <span data-testid="content-date" class="text-xs text-white/40">
              {new Date(item.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>
      </a>
    {/each}

    {#if filteredItems.length === 0}
      <div class="py-8 text-center text-sm text-white/40">
        No content items match the current filters.
      </div>
    {/if}
  </div>
</div>
