<script lang="ts">
  let {
    events
  }: {
    events: Array<{
      id: string;
      description: string;
      timestamp: string;
    }>;
  } = $props();

  function formatTimestamp(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleString();
  }
</script>

<div class="card bg-base-200 rounded-xl p-4">
  <h2 data-testid="recent-activity-heading" class="text-sm font-semibold text-base-content/70 uppercase tracking-wide mb-3">
    Recent Activity
  </h2>
  <div class="space-y-2">
    {#each events as event (event.id)}
      <div data-testid="activity-event" class="flex items-center justify-between py-2 border-b border-base-300 last:border-0">
        <span class="text-sm text-base-content/80">{event.description}</span>
        <span data-testid="activity-timestamp" class="text-xs text-base-content/50">
          {formatTimestamp(event.timestamp)}
        </span>
      </div>
    {/each}
  </div>
</div>
