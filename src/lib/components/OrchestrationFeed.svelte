<script lang="ts">
  import type { EventRow } from '$lib/stores/events.js';

  let { events }: { events: EventRow[] } = $props();

  const moduleBadgeClass: Record<string, string> = {
    research: 'badge-info',
    writing: 'badge-secondary',
    publish: 'badge-success',
    system: 'badge-ghost'
  };

  function relativeTime(isoDate: string): string {
    const now = Date.now();
    const then = new Date(isoDate).getTime();
    const diffSeconds = Math.floor((now - then) / 1000);

    if (diffSeconds < 60) return `${diffSeconds}s ago`;
    const diffMinutes = Math.floor(diffSeconds / 60);
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  }
</script>

{#if events.length === 0}
  <div data-testid="orchestration-feed-empty" class="text-base-content/50 text-sm py-8 text-center">
    No activity yet. Run a workflow to see the orchestration feed.
  </div>
{:else}
  <div data-testid="orchestration-feed" class="relative pl-6">
    <!-- Timeline line -->
    <div class="absolute left-2 top-0 bottom-0 w-px bg-base-300"></div>

    {#each events as event (event.id)}
      <div data-testid="orchestration-event-item" class="relative pb-4 last:pb-0">
        <!-- Timeline dot -->
        <div class="absolute -left-4 top-1 w-2 h-2 rounded-full bg-base-content/30"></div>

        <div class="flex flex-col gap-1">
          <div class="flex items-center gap-2 flex-wrap">
            {#if event.module}
              <span
                data-testid="module-badge"
                class="badge badge-sm {moduleBadgeClass[event.module] ?? 'badge-ghost'}"
              >
                {event.module}
              </span>
            {/if}

            <span data-testid="event-type-label" class="text-xs font-medium text-base-content/70">
              {event.event_type}
            </span>

            {#if event.agent_id}
              <span data-testid="agent-indicator" class="badge badge-sm badge-outline text-xs">
                Agent
              </span>
            {/if}

            <span data-testid="event-timestamp" class="text-xs text-base-content/40 ml-auto">
              {relativeTime(event.created_at)}
            </span>
          </div>

          {#if event.payload_summary}
            <p data-testid="event-description" class="text-sm text-base-content/80">
              {event.payload_summary}
            </p>
          {/if}

          {#if event.artifact_link}
            <a
              data-testid="artifact-link"
              href={event.artifact_link}
              class="text-xs text-primary hover:underline inline-flex items-center gap-1 w-fit"
            >
              View &rarr;
            </a>
          {/if}
        </div>
      </div>
    {/each}
  </div>
{/if}
