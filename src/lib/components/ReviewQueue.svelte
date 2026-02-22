<script lang="ts">
  import ProjectBadge from './ProjectBadge.svelte';

  let {
    items,
    showProjectBadge
  }: {
    items: Array<{
      id: string;
      title: string;
      status: 'draft' | 'in_review';
      project: { name: string; color: string };
    }>;
    showProjectBadge: boolean;
  } = $props();

  const displayItems = $derived(items.slice(0, 5));
</script>

<div class="card bg-base-200 rounded-xl p-4">
  <h2 class="text-sm font-semibold text-base-content/70 uppercase tracking-wide mb-3">
    Pending Review
  </h2>
  <div class="space-y-2">
    {#each displayItems as item (item.id)}
      <div data-testid="review-queue-item" class="flex items-center justify-between py-2 border-b border-base-300 last:border-0">
        <div class="flex items-center gap-2">
          <span class="text-sm text-base-content/80">{item.title}</span>
          {#if showProjectBadge}
            <ProjectBadge project={item.project} />
          {/if}
        </div>
        <div class="flex items-center gap-2">
          <button data-testid="approve-button" class="btn btn-xs btn-success">Approve</button>
          <a data-testid="view-button" href="/dashboard/write/content/{item.id}" class="btn btn-xs btn-ghost">View</a>
        </div>
      </div>
    {/each}
  </div>
  <a
    data-testid="view-all-feed-link"
    href="/dashboard/write/content?status=pending"
    class="text-sm text-primary mt-3 inline-block"
  >
    View All in Feed
  </a>
</div>
