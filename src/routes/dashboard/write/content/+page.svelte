<script lang="ts">
  import type { ContentType, ContentStatus, DestinationType } from '$lib/types/database.js';
  import ContentEditor from '$lib/components/ContentEditor.svelte';
  import { createSupabaseClient } from '$lib/supabase';
  import { page } from '$app/stores';

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
  let expandedId = $state<string | null>(null);
  const client = createSupabaseClient();

  $effect(() => {
    const highlight = $page.url?.searchParams.get('highlight');
    if (highlight) {
      expandedId = highlight;
    }
  });

  async function handleSave(id: string, updates: { title: string; body: { html: string }; meta_description: string; tags: string[] }) {
    await client.from('content').update(updates).eq('id', id);
  }

  async function handleApprove(id: string) {
    await client.from('content').update({ status: 'approved' }).eq('id', id);
  }

  async function handleReject(id: string, reason: string) {
    await client.from('content').update({ status: 'rejected', destination_config: { rejection_reason: reason } }).eq('id', id);
  }

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
      {#if expandedId === item.id}
        <ContentEditor
          content={{
            id: item.id,
            title: item.title,
            body: item.body as { html: string } | null,
            meta_description: item.meta_description,
            tags: item.tags,
            content_type: item.content_type,
            status: item.status,
            created_at: item.created_at,
            updated_at: item.updated_at,
          }}
          onSave={async (updates) => handleSave(item.id, updates)}
          onApprove={handleApprove}
          onReject={handleReject}
          onClose={() => { expandedId = null; }}
        />
      {:else}
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div
          data-testid="content-item"
          class="card bg-base-200 shadow-xl block p-4 hover:bg-base-300 transition-all duration-300 cursor-pointer"
          onclick={() => { expandedId = item.id; }}
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
        </div>
      {/if}
    {/each}

    {#if filteredItems.length === 0}
      <div class="py-8 text-center text-sm text-base-content/40">
        No content items match the current filters.
      </div>
    {/if}
  </div>
</div>
