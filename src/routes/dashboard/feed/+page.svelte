<script lang="ts">
  import FeedCard from '$lib/components/FeedCard.svelte';
  import FeedFilterBar from '$lib/components/FeedFilterBar.svelte';
  import { createFeedStore } from '$lib/stores/feedStore';
  import { createProjectStore } from '$lib/stores/projectStore';
  import { createSupabaseClient } from '$lib/supabase';

  const client = createSupabaseClient();
  const feedStore = createFeedStore(client);
  const projectStore = createProjectStore();

  const showProjectBadge = $derived(projectStore.selectedProjectId === 'all');

  let sentinelEl: HTMLDivElement | undefined = $state();

  $effect(() => {
    if (!sentinelEl) return;

    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting && feedStore.hasMore && !feedStore.loading) {
        feedStore.loadMore();
      }
    });

    observer.observe(sentinelEl);

    return () => observer.disconnect();
  });
</script>

<div data-testid="feed-page" class="space-y-6 py-6">
  <FeedFilterBar pipelines={[]} onFilterChange={(filters) => feedStore.setFilters(filters)} />

  {#if feedStore.loading}
    <div data-testid="feed-loading" class="flex flex-col gap-4 p-4">
      {#each [1, 2, 3] as _}
        <div class="skeleton h-32 w-full rounded-xl"></div>
      {/each}
    </div>
  {/if}

  {#if !feedStore.loading && feedStore.items.length === 0}
    <div data-testid="feed-empty-state" class="text-center py-12 text-base-content/60">
      <p>No content matches your current filters.</p>
    </div>
  {/if}

  <div data-testid="feed-list">
    {#each feedStore.items as item (item.id)}
      <FeedCard
        content={{
          id: item.id,
          title: item.title,
          body: item.body,
          tags: item.tags,
          status: item.status,
          content_type: item.content_type,
          created_at: item.created_at,
          project: item.projects ? { name: item.projects.name, color: item.projects.color ?? '#888' } : undefined
        }}
        {showProjectBadge}
        onApprove={(id) => feedStore.approveContent(id)}
        onReject={(id) => feedStore.rejectContent(id, '')}
      />
    {/each}
  </div>

  {#if feedStore.hasMore}
    <div data-testid="feed-load-more" bind:this={sentinelEl} class="h-4"></div>
  {/if}
</div>
