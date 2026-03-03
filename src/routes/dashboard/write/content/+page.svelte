<script lang="ts">
  import type { ContentType, ContentStatus, DestinationType } from '$lib/types/database.js';
  import BulkActionBar from '$lib/components/BulkActionBar.svelte';

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

  type WorkflowRef = {
    id: string;
    name: string;
  };

  let { data }: {
    data: {
      contentItems: ContentItem[];
      pipelines: WorkflowRef[];
    };
  } = $props();

  let statusFilter = $state('all');
  let typeFilter = $state('all');
  let workflowFilter = $state('all');
  let selectedIds = $state<string[]>([]);

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
      if (workflowFilter !== 'all' && item.pipeline_name !== workflowFilter) return false;
      return true;
    })
  );

  function toggleSelection(id: string) {
    if (selectedIds.includes(id)) {
      selectedIds = selectedIds.filter((sid) => sid !== id);
    } else {
      selectedIds = [...selectedIds, id];
    }
  }

  function toggleSelectAll() {
    const allFilteredIds = filteredItems.map((item) => item.id);
    const allSelected = allFilteredIds.every((id) => selectedIds.includes(id));
    if (allSelected) {
      selectedIds = [];
    } else {
      selectedIds = allFilteredIds;
    }
  }

  async function handleBulkApprove() {
    const res = await fetch('/api/v1/content/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'approve', ids: selectedIds })
    });
    if (res.ok) {
      selectedIds = [];
    }
  }

  async function handleBulkReject() {
    const res = await fetch('/api/v1/content/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reject', ids: selectedIds })
    });
    if (res.ok) {
      selectedIds = [];
    }
  }
</script>

<div data-testid="content-library-page" class="space-y-8 py-6">
  <div class="flex items-center justify-between">
    <h1 class="text-2xl font-bold text-base-content">Content Library</h1>
  </div>

  <div class="flex items-center gap-4">
    <input
      type="checkbox"
      data-testid="select-all-checkbox"
      class="checkbox checkbox-sm"
      checked={filteredItems.length > 0 && filteredItems.every((item) => selectedIds.includes(item.id))}
      onchange={toggleSelectAll}
    />

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
      data-testid="workflow-filter"
      class="select select-bordered select-sm"
      bind:value={workflowFilter}
    >
      <option value="all">All Workflows</option>
      {#each data.pipelines as pipeline}
        <option value={pipeline.name}>{pipeline.name}</option>
      {/each}
    </select>
  </div>

  <div class="space-y-2">
    {#each filteredItems as item}
      <div
        data-testid="content-item"
        class="card bg-base-200 shadow-xl block p-4 hover:bg-base-300 transition-all duration-300"
      >
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <input
              type="checkbox"
              data-testid="content-checkbox"
              class="checkbox checkbox-sm"
              checked={selectedIds.includes(item.id)}
              onchange={() => toggleSelection(item.id)}
            />
            <a href="/dashboard/write/content/{item.id}" class="text-sm font-medium text-base-content">{item.title}</a>
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
      </div>
    {/each}

    {#if filteredItems.length === 0}
      <div class="py-8 text-center text-sm text-base-content/40">
        No content items match the current filters.
      </div>
    {/if}
  </div>

  <BulkActionBar
    {selectedIds}
    onapprove={handleBulkApprove}
    onreject={handleBulkReject}
  />
</div>
