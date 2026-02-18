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
    draft: 'badge-ghost',
    in_review: 'badge-warning',
    approved: 'badge-info',
    published: 'badge-success',
    rejected: 'badge-error'
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
    <h1 class="text-2xl font-bold text-base-content">Content Library</h1>
  </div>

  <div class="flex items-center gap-4">
    <select
      data-testid="status-filter"
      class="select select-bordered select-sm"
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
      class="select select-bordered select-sm"
      bind:value={typeFilter}
    >
      <option value="all">All Types</option>
      <option value="article">Article</option>
      <option value="landing_page">Landing Page</option>
      <option value="social_post">Social Post</option>
    </select>

    <select
      data-testid="pipeline-filter"
      class="select select-bordered select-sm"
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
        class="card bg-base-200 shadow-xl block p-4 hover:bg-base-300 transition-all duration-300"
      >
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <span class="text-sm font-medium text-base-content">{item.title}</span>
            <span
              data-testid="content-status-badge"
              class="badge {statusColors[item.status] ?? 'badge-ghost'}"
            >
              {item.status}
            </span>
          </div>

          <div class="flex items-center gap-4">
            <span class="text-xs text-base-content/40">{item.pipeline_name}</span>
            <span data-testid="content-date" class="text-xs text-base-content/40">
              {new Date(item.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>
      </a>
    {/each}

    {#if filteredItems.length === 0}
      <div class="py-8 text-center text-sm text-base-content/40">
        No content items match the current filters.
      </div>
    {/if}
  </div>
</div>
