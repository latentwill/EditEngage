<script lang="ts">
  import type { Database } from '$lib/types/database.js';
  type ContentRow = Database['public']['Tables']['content']['Row'];
  type DestinationRow = Database['public']['Tables']['destinations']['Row'];

  let { data }: { data: { recentPublications: ContentRow[]; destinations: DestinationRow[]; projectId: string } } = $props();
</script>

<div data-testid="publish-page" class="space-y-8 py-6">
  <div class="flex items-center justify-between">
    <h1 class="text-2xl font-bold text-base-content">Publish</h1>
    <a href="/dashboard/publish/destinations" class="btn btn-primary btn-sm">Manage Destinations</a>
  </div>

  <!-- Stats Cards -->
  <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
    <div data-testid="stat-published" class="card bg-base-200 shadow-xl p-4">
      <p class="text-sm text-base-content/60">Published</p>
      <p class="text-2xl font-bold text-base-content">{data.recentPublications.length}</p>
    </div>
    <div data-testid="stat-destinations" class="card bg-base-200 shadow-xl p-4">
      <p class="text-sm text-base-content/60">Destinations</p>
      <p class="text-2xl font-bold text-base-content">{data.destinations.length}</p>
    </div>
    <div data-testid="stat-active-destinations" class="card bg-base-200 shadow-xl p-4">
      <p class="text-sm text-base-content/60">Active Destinations</p>
      <p class="text-2xl font-bold text-base-content">{data.destinations.filter(d => d.is_active).length}</p>
    </div>
  </div>

  <!-- Recent Publications -->
  <section>
    <h2 class="text-lg font-semibold text-base-content/80 mb-4">Recent Publications</h2>
    {#if data.recentPublications.length === 0}
      <div class="card bg-base-200 p-6">
        <p class="text-sm text-base-content/40">No published content yet.</p>
      </div>
    {:else}
      <div class="space-y-3">
        {#each data.recentPublications as item}
          <div class="card bg-base-200 shadow-xl p-4 flex flex-row items-center justify-between">
            <div>
              <p class="font-medium text-base-content">{item.title}</p>
              <p class="text-xs text-base-content/40">
                {item.published_at ? new Date(item.published_at).toLocaleDateString() : ''}
                {#if item.destination_type}
                  &middot; {item.destination_type}
                {/if}
              </p>
            </div>
            {#if item.published_url}
              <a href={item.published_url} target="_blank" rel="noopener" class="btn btn-ghost btn-xs">View</a>
            {/if}
          </div>
        {/each}
      </div>
    {/if}
  </section>

  <!-- Destination Quick Status -->
  <section>
    <h2 class="text-lg font-semibold text-base-content/80 mb-4">Destination Status</h2>
    {#if data.destinations.length === 0}
      <div class="card bg-base-200 p-6">
        <p class="text-sm text-base-content/40">No destinations configured.</p>
      </div>
    {:else}
      <div class="grid gap-3">
        {#each data.destinations as dest}
          <div class="card bg-base-200 shadow-xl p-4 flex flex-row items-center justify-between">
            <div class="flex items-center gap-3">
              <span class="font-medium text-base-content">{dest.name}</span>
              <span class="badge badge-ghost badge-sm">{dest.type}</span>
            </div>
            {#if dest.is_active}
              <span class="badge badge-success badge-sm">active</span>
            {:else}
              <span class="badge badge-ghost badge-sm">inactive</span>
            {/if}
          </div>
        {/each}
      </div>
    {/if}
  </section>
</div>
